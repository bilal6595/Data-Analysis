import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Filter,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AggregatedDataset } from '../types/data';
import { exportToExcel, exportToCSV } from '../utils/excelParser';
import { formatMetricNumber } from '../utils/analyticsEngine';

interface DataTableViewProps {
  dataset: AggregatedDataset;
  activeFileFilter?: string | null;
  onSetFileFilter?: (fileName: string | null) => void;
}

export const DataTableView: React.FC<DataTableViewProps> = ({
  dataset,
  activeFileFilter,
  onSetFileFilter,
}) => {
  const { columns, columnProfiles, mergedRows, files } = dataset;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<string>(activeFileFilter || 'all');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Filter rows by file and search query
  const filteredRows = useMemo(() => {
    let result = mergedRows;

    if (selectedFile !== 'all') {
      result = result.filter(r => r._source_file === selectedFile);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(row => {
        return Object.values(row).some(val => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    if (sortColumn) {
      const isNum = columnProfiles[sortColumn]?.type === 'number';
      result = [...result].sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (isNum) {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return sortDirection === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [mergedRows, selectedFile, searchQuery, sortColumn, sortDirection, columnProfiles]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Search, Filter & Export Controls Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search across all cells..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* File Source Filter if multi-file */}
            {files.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>File:</span>
                <select
                  value={selectedFile}
                  onChange={e => {
                    setSelectedFile(e.target.value);
                    if (onSetFileFilter) {
                      onSetFileFilter(e.target.value === 'all' ? null : e.target.value);
                    }
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs font-mono"
                >
                  <option value="all">All Folder Files ({files.length})</option>
                  {files.map(f => (
                    <option key={f.name} value={f.name}>
                      {f.name} ({f.rowCount} rows)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Export and Stats */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Showing {filteredRows.length.toLocaleString()} of {mergedRows.length.toLocaleString()} rows
            </span>

            <button
              onClick={() => exportToExcel(filteredRows, columns, 'LocalSheet_Filtered_Export.xlsx')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export .xlsx</span>
            </button>

            <button
              onClick={() => exportToCSV(filteredRows, columns, 'LocalSheet_Filtered_Export.csv')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* High-Density Data Grid Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-20 shadow-xs border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold text-slate-500 text-center w-12 border-r border-slate-200">
                  #
                </th>
                {files.length > 1 && (
                  <th className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200">
                    Source File
                  </th>
                )}
                {columns.map(col => {
                  const prof = columnProfiles[col];
                  const isSorted = sortColumn === col;
                  const isNum = prof?.type === 'number';

                  return (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className="py-2.5 px-3 font-semibold text-slate-800 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap select-none"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-mono">{col}</span>
                        <div className="flex items-center text-slate-400">
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-slate-900" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-slate-900" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                          )}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {pageRows.map((row, idx) => {
                const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                return (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3 text-slate-400 text-center border-r border-slate-100 tabular-nums">
                      {globalIndex}
                    </td>
                    {files.length > 1 && (
                      <td className="py-2 px-3 text-slate-500 border-r border-slate-100 truncate max-w-[140px]" title={row._source_file}>
                        {row._source_file}
                      </td>
                    )}
                    {columns.map(col => {
                      const val = row[col];
                      const isNum = typeof val === 'number';

                      return (
                        <td
                          key={col}
                          className={`py-2 px-3 whitespace-nowrap ${
                            isNum ? 'text-right tabular-nums text-slate-900 font-medium' : 'text-slate-700'
                          }`}
                        >
                          {val === null || val === undefined ? (
                            <span className="text-slate-300 font-sans italic">null</span>
                          ) : isNum ? (
                            formatMetricNumber(val)
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {pageRows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + (files.length > 1 ? 2 : 1)}
                    className="py-16 text-center text-slate-400 font-sans text-xs"
                  >
                    No matching rows found for query &quot;{searchQuery}&quot;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded px-2 py-0.5"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono">
              Page {currentPage} of {totalPages}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
