import React, { useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Filter,
  Check,
  X,
  Layers,
  ArrowRight,
  HardDrive,
} from 'lucide-react';
import { AggregatedDataset, ParsedFile } from '../types/data';
import { exportToExcel, exportToCSV } from '../utils/excelParser';

interface UniformityAuditViewProps {
  dataset: AggregatedDataset;
  onFilterByFile?: (fileName: string | null) => void;
  selectedFileFilter?: string | null;
}

export const UniformityAuditView: React.FC<UniformityAuditViewProps> = ({
  dataset,
  onFilterByFile,
  selectedFileFilter,
}) => {
  const { uniformityReport, files, columns, columnProfiles } = dataset;
  const [searchCol, setSearchCol] = useState('');

  const filteredColumns = columns.filter(col =>
    col.toLowerCase().includes(searchCol.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                uniformityReport.isUniform
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {uniformityReport.isUniform ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  Folder Uniformity & Schema Parity Audit
                </h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${
                    uniformityReport.isUniform
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {uniformityReport.isUniform ? '100% Uniform Structure' : 'Schema Divergence Detected'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated {files.length} workbook(s) against {columns.length} canonical column specifications.
              </p>
            </div>
          </div>

          {/* Export merged dataset actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToExcel(dataset.mergedRows, columns, 'Consolidated_Uniform_Data.xlsx')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Consolidated .xlsx</span>
            </button>
            <button
              onClick={() => exportToCSV(dataset.mergedRows, columns, 'Consolidated_Uniform_Data.csv')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Audit Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 text-xs">
          <div>
            <span className="text-slate-400 block">Total Files in Folder</span>
            <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
              {files.length}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block">Fully Uniform Files</span>
            <span className="text-lg font-bold text-emerald-700 font-mono tabular-nums">
              {uniformityReport.matchedFiles} / {files.length}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block">Canonical Dimensions</span>
            <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
              {columns.length} columns
            </span>
          </div>

          <div>
            <span className="text-slate-400 block">Total Merged Volume</span>
            <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
              {dataset.mergedRows.length.toLocaleString()} rows
            </span>
          </div>
        </div>

        {/* Recommendations if any drift */}
        {uniformityReport.schemaRecommendations.length > 0 && (
          <div className="mt-5 p-4 rounded-lg bg-amber-50/70 border border-amber-200">
            <h4 className="text-xs font-semibold text-amber-900 mb-1">
              Schema Harmonization Actions Taken
            </h4>
            <ul className="text-xs text-amber-800 space-y-1 list-disc pl-4">
              {uniformityReport.schemaRecommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* File-by-File Breakdown Cards */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Folder Inventory & File Integrity
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Individual file verification, row contributions, and sheet selection
            </p>
          </div>

          {onFilterByFile && selectedFileFilter && (
            <button
              onClick={() => onFilterByFile(null)}
              className="text-xs text-slate-600 hover:text-slate-900 underline"
            >
              Reset to view all files
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100 mt-2">
          {files.map((file, i) => {
            const isUniform = file.isValidUniform;
            const isSelected = selectedFileFilter === file.name;

            return (
              <div
                key={file.id || i}
                className={`py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  isSelected ? 'bg-slate-50/80 -mx-4 px-4 rounded-lg' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                      isUniform
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 font-mono">
                        {file.name}
                      </span>
                      {isUniform ? (
                        <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                          <Check className="w-3 h-3" /> Uniform
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-700 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3 h-3" /> Divergent
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 mt-1">
                      <span>{file.rowCount.toLocaleString()} rows</span>
                      <span aria-hidden="true">·</span>
                      <span>{file.columns.length} columns</span>
                      <span aria-hidden="true">·</span>
                      <span>{(file.size / 1024).toFixed(1)} KB</span>
                      {file.sheetNames.length > 1 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Sheet: {file.selectedSheet} ({file.sheetNames.length} tabs)</span>
                        </>
                      )}
                    </div>

                    {file.missingColumns.length > 0 && (
                      <p className="text-xs text-rose-600 mt-1">
                        Missing {file.missingColumns.length} canonical column(s): {file.missingColumns.join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto">
                  {onFilterByFile && (
                    <button
                      onClick={() => onFilterByFile(isSelected ? null : file.name)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {isSelected ? 'Viewing File Only' : 'Filter to File'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cross-File Column Parity Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Cross-File Column Parity Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify column availability and data types across every file in the folder
            </p>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Filter columns..."
              value={searchCol}
              onChange={e => setSearchCol(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg w-48 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="py-2.5 px-3 font-semibold text-slate-900 sticky left-0 bg-slate-50/90 z-10">
                  Canonical Column
                </th>
                <th className="py-2.5 px-3 font-semibold text-slate-600">
                  Detected Type
                </th>
                <th className="py-2.5 px-3 font-semibold text-slate-600">
                  Null %
                </th>
                {files.map(f => (
                  <th
                    key={f.name}
                    className="py-2.5 px-3 font-semibold text-slate-700 truncate max-w-[130px]"
                    title={f.name}
                  >
                    {f.name.replace(/\.(xlsx|xls|csv)$/i, '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredColumns.map(col => {
                const profile = columnProfiles[col];
                const nullRate = profile
                  ? ((profile.nullCount / dataset.mergedRows.length) * 100).toFixed(0)
                  : '0';

                return (
                  <tr key={col} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-slate-900 font-mono sticky left-0 bg-white z-10 border-r border-slate-100">
                      {col}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 capitalize">
                      {profile?.type || 'string'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono tabular-nums">
                      {nullRate}%
                    </td>
                    {files.map(f => {
                      const hasCol = f.columns.some(
                        c => c.toLowerCase() === col.toLowerCase()
                      );
                      return (
                        <td key={f.name} className="py-2.5 px-3 text-center">
                          {hasCol ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 text-emerald-600">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-50 text-rose-600">
                              <X className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
