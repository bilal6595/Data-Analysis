import React, { useState, useMemo } from 'react';
import { Grid3x3, Download, Layers } from 'lucide-react';
import { AggregatedDataset } from '../types/data';
import { formatMetricNumber } from '../utils/analyticsEngine';

interface PivotViewProps {
  dataset: AggregatedDataset;
}

export const PivotView: React.FC<PivotViewProps> = ({ dataset }) => {
  const { columns, columnProfiles, mergedRows } = dataset;

  const categoricalCols = columns.filter(
    c => columnProfiles[c]?.type === 'string' || columnProfiles[c]?.type === 'date'
  );
  const numericCols = columns.filter(c => columnProfiles[c]?.type === 'number');

  const [rowDimension, setRowDimension] = useState<string>(
    categoricalCols.find(c => /region|category|department/i.test(c)) || categoricalCols[0] || columns[0]
  );
  const [colDimension, setColDimension] = useState<string>(
    categoricalCols.find(c => c !== rowDimension && /channel|quarter|type|segment/i.test(c)) || 'None'
  );
  const [metricCol, setMetricCol] = useState<string>(
    numericCols.find(c => /revenue|sales|total|amount|profit/i.test(c)) || numericCols[0] || columns[0]
  );
  const [aggMethod, setAggMethod] = useState<'sum' | 'mean' | 'count'>('sum');

  // Compute Pivot Table Matrix
  const { rowHeaders, colHeaders, matrix, grandTotal, rowTotals, colTotals } = useMemo(() => {
    const rowsSet = new Set<string>();
    const colsSet = new Set<string>();
    const cellValues = new Map<string, number[]>();

    mergedRows.forEach(r => {
      const rowVal = String(r[rowDimension] ?? 'Unspecified');
      const colVal = colDimension !== 'None' ? String(r[colDimension] ?? 'Unspecified') : 'Total';
      const mVal = r[metricCol];

      rowsSet.add(rowVal);
      colsSet.add(colVal);

      if (typeof mVal === 'number' && !isNaN(mVal)) {
        const key = `${rowVal}|||${colVal}`;
        const list = cellValues.get(key) || [];
        list.push(mVal);
        cellValues.set(key, list);
      }
    });

    const rowHeaders = Array.from(rowsSet).sort();
    const colHeaders = Array.from(colsSet).sort();

    const computeAgg = (vals: number[] | undefined) => {
      if (!vals || vals.length === 0) return 0;
      if (aggMethod === 'sum') return vals.reduce((a, b) => a + b, 0);
      if (aggMethod === 'mean') return vals.reduce((a, b) => a + b, 0) / vals.length;
      if (aggMethod === 'count') return vals.length;
      return 0;
    };

    const matrix: Record<string, Record<string, number>> = {};
    const rowTotals: Record<string, number> = {};
    const colTotals: Record<string, number> = {};
    let allValues: number[] = [];

    rowHeaders.forEach(r => {
      matrix[r] = {};
      let rValues: number[] = [];

      colHeaders.forEach(c => {
        const key = `${r}|||${c}`;
        const vals = cellValues.get(key) || [];
        const res = computeAgg(vals);
        matrix[r][c] = res;
        rValues.push(...vals);
      });

      rowTotals[r] = computeAgg(rValues);
      allValues.push(...rValues);
    });

    colHeaders.forEach(c => {
      let cValues: number[] = [];
      rowHeaders.forEach(r => {
        const key = `${r}|||${c}`;
        const vals = cellValues.get(key) || [];
        cValues.push(...vals);
      });
      colTotals[c] = computeAgg(cValues);
    });

    const grandTotal = computeAgg(allValues);

    return {
      rowHeaders,
      colHeaders,
      matrix,
      grandTotal,
      rowTotals,
      colTotals,
    };
  }, [mergedRows, rowDimension, colDimension, metricCol, aggMethod]);

  const maxCellVal = useMemo(() => {
    let m = 0;
    rowHeaders.forEach(r => {
      colHeaders.forEach(c => {
        if (matrix[r]?.[c] > m) m = matrix[r][c];
      });
    });
    return m || 1;
  }, [rowHeaders, colHeaders, matrix]);

  const handleExportCSV = () => {
    let csv = `${rowDimension},${colHeaders.join(',')},Total\n`;
    rowHeaders.forEach(r => {
      const rowVals = colHeaders.map(c => matrix[r]?.[c] || 0);
      csv += `"${r}",${rowVals.join(',')},${rowTotals[r] || 0}\n`;
    });
    csv += `Total,${colHeaders.map(c => colTotals[c] || 0).join(',')},${grandTotal}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pivot_${rowDimension}_by_${colDimension}_${metricCol}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Configuration Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Grid3x3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Multi-Dimensional Pivot & Cross-Tabulation
              </h2>
              <p className="text-xs text-slate-500">
                Slice data across row & column categories with real-time grouping
              </p>
            </div>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors self-start lg:self-auto"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Pivot CSV</span>
          </button>
        </div>

        {/* Pivot Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-slate-500 font-medium mb-1">Row Dimension:</label>
            <select
              value={rowDimension}
              onChange={e => setRowDimension(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-slate-900"
            >
              {categoricalCols.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Column Dimension:</label>
            <select
              value={colDimension}
              onChange={e => setColDimension(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-slate-900"
            >
              <option value="None">None (1D Group By)</option>
              {categoricalCols
                .filter(c => c !== rowDimension)
                .map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Value Metric:</label>
            <select
              value={metricCol}
              onChange={e => setMetricCol(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-slate-900"
            >
              {numericCols.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Aggregation Function:</label>
            <select
              value={aggMethod}
              onChange={e => setAggMethod(e.target.value as 'sum' | 'mean' | 'count')}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 uppercase font-mono focus:ring-1 focus:ring-slate-900"
            >
              <option value="sum">SUM</option>
              <option value="mean">AVERAGE (MEAN)</option>
              <option value="count">ROW COUNT</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pivot Table Render */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-900">
            {rowDimension} × {colDimension !== 'None' ? colDimension : 'Aggregate'} ({aggMethod.toUpperCase()} of {metricCol})
          </span>
          <span className="text-slate-500 font-mono">
            Grand Total: <strong className="text-slate-900">{formatMetricNumber(grandTotal)}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-2.5 px-4 font-semibold text-slate-900 sticky left-0 bg-slate-50 z-10">
                  {rowDimension}
                </th>
                {colHeaders.map(col => (
                  <th key={col} className="py-2.5 px-3 font-semibold text-slate-700 text-right font-mono">
                    {col}
                  </th>
                ))}
                <th className="py-2.5 px-4 font-bold text-slate-900 text-right bg-slate-100/60 font-mono">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rowHeaders.map(r => (
                <tr key={r} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-medium text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100">
                    {r}
                  </td>
                  {colHeaders.map(c => {
                    const val = matrix[r]?.[c] ?? 0;
                    const intensity = maxCellVal > 0 ? (val / maxCellVal) : 0;
                    const bgTint = intensity > 0.05 ? `rgba(15, 23, 42, ${Math.min(0.18, intensity * 0.2)})` : 'transparent';

                    return (
                      <td
                        key={c}
                        style={{ backgroundColor: bgTint }}
                        className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800"
                      >
                        {formatMetricNumber(val)}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-4 text-right font-bold font-mono tabular-nums text-slate-900 bg-slate-50/50 border-l border-slate-100">
                    {formatMetricNumber(rowTotals[r])}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-300">
                <td className="py-3 px-4 text-slate-900 sticky left-0 bg-slate-100 z-10">
                  Total
                </td>
                {colHeaders.map(c => (
                  <td key={c} className="py-3 px-3 text-right font-mono tabular-nums text-slate-900">
                    {formatMetricNumber(colTotals[c])}
                  </td>
                ))}
                <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 bg-slate-200/60">
                  {formatMetricNumber(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
