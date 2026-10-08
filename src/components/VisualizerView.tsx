import React, { useState, useMemo } from 'react';
import {
  BarChart,
  LineChart,
  ScatterChart,
  PieChart,
  SlidersHorizontal,
  ChevronDown,
  TrendingUp,
} from 'lucide-react';
import { AggregatedDataset } from '../types/data';
import { formatMetricNumber } from '../utils/analyticsEngine';

interface VisualizerViewProps {
  dataset: AggregatedDataset;
}

type ChartType = 'bar' | 'line' | 'scatter' | 'donut';
type AggregationMethod = 'sum' | 'mean' | 'count' | 'max' | 'min';

export const VisualizerView: React.FC<VisualizerViewProps> = ({ dataset }) => {
  const { columns, columnProfiles, mergedRows } = dataset;

  const numericCols = columns.filter(c => columnProfiles[c]?.type === 'number');
  const categoricalCols = columns.filter(c => columnProfiles[c]?.type === 'string' || columnProfiles[c]?.type === 'date');

  const [chartType, setChartType] = useState<ChartType>('bar');
  const [metricCol, setMetricCol] = useState<string>(
    numericCols.find(c => /revenue|sales|total|amount|profit/i.test(c)) || numericCols[0] || columns[0]
  );
  const [dimensionCol, setDimensionCol] = useState<string>(
    categoricalCols.find(c => /category|region|channel|quarter|department|type/i.test(c)) || categoricalCols[0] || columns[0]
  );
  const [scatterSecondMetric, setScatterSecondMetric] = useState<string>(
    numericCols.filter(c => c !== metricCol)[0] || numericCols[0] || columns[0]
  );
  const [aggregation, setAggregation] = useState<AggregationMethod>('sum');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Compute aggregated data points
  const aggregatedData = useMemo(() => {
    if (!dimensionCol || !metricCol) return [];

    const groups = new Map<string, number[]>();

    mergedRows.forEach(row => {
      const dimVal = String(row[dimensionCol] ?? 'Unassigned');
      const metVal = row[metricCol];
      if (typeof metVal === 'number' && !isNaN(metVal)) {
        const list = groups.get(dimVal) || [];
        list.push(metVal);
        groups.set(dimVal, list);
      }
    });

    const results = Array.from(groups.entries()).map(([label, vals]) => {
      let finalVal = 0;
      if (aggregation === 'sum') {
        finalVal = vals.reduce((a, b) => a + b, 0);
      } else if (aggregation === 'mean') {
        finalVal = vals.reduce((a, b) => a + b, 0) / vals.length;
      } else if (aggregation === 'count') {
        finalVal = vals.length;
      } else if (aggregation === 'max') {
        finalVal = Math.max(...vals);
      } else if (aggregation === 'min') {
        finalVal = Math.min(...vals);
      }
      return { label, value: finalVal, count: vals.length };
    });

    // If string categories, sort descending by value; if dates, sort chronologically
    const isDate = columnProfiles[dimensionCol]?.type === 'date';
    if (isDate) {
      results.sort((a, b) => a.label.localeCompare(b.label));
    } else {
      results.sort((a, b) => b.value - a.value);
    }

    return results.slice(0, 15); // Top 15 categories for clean visual layout
  }, [mergedRows, dimensionCol, metricCol, aggregation, columnProfiles]);

  // Scatter data
  const scatterPoints = useMemo(() => {
    if (chartType !== 'scatter' || !metricCol || !scatterSecondMetric) return [];
    return mergedRows
      .map(r => {
        const x = r[metricCol];
        const y = r[scatterSecondMetric];
        if (typeof x === 'number' && !isNaN(x) && typeof y === 'number' && !isNaN(y)) {
          return { x, y, label: String(r[dimensionCol] ?? '') };
        }
        return null;
      })
      .filter(Boolean) as { x: number; y: number; label: string }[];
  }, [mergedRows, chartType, metricCol, scatterSecondMetric, dimensionCol]);

  // Max value calculation for bar chart scaling
  const maxValue = useMemo(() => {
    if (aggregatedData.length === 0) return 1;
    return Math.max(...aggregatedData.map(d => d.value), 0.0001);
  }, [aggregatedData]);

  const totalSum = useMemo(() => {
    return aggregatedData.reduce((acc, curr) => acc + curr.value, 0);
  }, [aggregatedData]);

  return (
    <div className="space-y-6">
      {/* Visualizer Configuration Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Chart Type Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setChartType('bar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                chartType === 'bar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart className="w-3.5 h-3.5" />
              <span>Bar Ranking</span>
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                chartType === 'line' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Line Trend</span>
            </button>
            <button
              onClick={() => setChartType('donut')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                chartType === 'donut' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Donut Share</span>
            </button>
            <button
              onClick={() => setChartType('scatter')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                chartType === 'scatter' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ScatterChart className="w-3.5 h-3.5" />
              <span>Scatter Plot</span>
            </button>
          </div>

          {/* Dimension, Metric & Aggregation Dropdowns */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Dimension */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Dimension (X):</span>
              <select
                value={dimensionCol}
                onChange={e => setDimensionCol(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-medium focus:ring-1 focus:ring-slate-900"
              >
                {columns.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Metric (Y) */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">
                {chartType === 'scatter' ? 'X Metric:' : 'Metric (Y):'}
              </span>
              <select
                value={metricCol}
                onChange={e => setMetricCol(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-medium focus:ring-1 focus:ring-slate-900"
              >
                {numericCols.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Second Metric for Scatter */}
            {chartType === 'scatter' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Y Metric:</span>
                <select
                  value={scatterSecondMetric}
                  onChange={e => setScatterSecondMetric(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-medium focus:ring-1 focus:ring-slate-900"
                >
                  {numericCols.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              /* Aggregation Method */
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Function:</span>
                <select
                  value={aggregation}
                  onChange={e => setAggregation(e.target.value as AggregationMethod)}
                  className="bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-medium uppercase font-mono focus:ring-1 focus:ring-slate-900"
                >
                  <option value="sum">SUM</option>
                  <option value="mean">AVERAGE (MEAN)</option>
                  <option value="count">COUNT</option>
                  <option value="max">MAX</option>
                  <option value="min">MIN</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chart Viewport Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {chartType === 'scatter'
                ? `Scatter Plot: ${metricCol} vs. ${scatterSecondMetric}`
                : `${aggregation.toUpperCase()} of ${metricCol} by ${dimensionCol}`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rendered via deterministic offline vector calculations
            </p>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            {chartType !== 'scatter' && (
              <span>Aggregate Total: <strong className="text-slate-900 font-semibold">{formatMetricNumber(totalSum)}</strong></span>
            )}
          </div>
        </div>

        {/* Chart Render Canvas */}
        <div className="pt-6 min-h-[380px] flex items-center justify-center">
          {chartType === 'bar' && (
            <div className="w-full space-y-3">
              {aggregatedData.map((item, idx) => {
                const pct = (item.value / maxValue) * 100;
                const shareOfTotal = totalSum > 0 ? ((item.value / totalSum) * 100).toFixed(1) : '0';
                const isHovered = hoveredIndex === idx;

                return (
                  <div
                    key={item.label}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="group text-xs"
                  >
                    <div className="flex items-center justify-between mb-1 text-slate-700">
                      <span className="font-medium truncate max-w-[280px] sm:max-w-md">
                        {item.label}
                      </span>
                      <div className="flex items-center gap-3 font-mono tabular-nums text-slate-900">
                        <span className="font-semibold">{formatMetricNumber(item.value)}</span>
                        <span className="text-slate-400 text-[11px]">({shareOfTotal}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-6 rounded-md overflow-hidden flex items-center p-0.5">
                      <div
                        className={`h-full rounded transition-all duration-300 ${
                          isHovered ? 'bg-slate-900' : 'bg-slate-800'
                        }`}
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {aggregatedData.length === 0 && (
                <div className="text-center py-16 text-slate-400 text-xs">
                  No valid numeric values found for the selected combination.
                </div>
              )}
            </div>
          )}

          {chartType === 'line' && (
            <div className="w-full">
              {aggregatedData.length >= 2 ? (
                <div className="relative w-full h-80">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 800 300" preserveAspectRatio="none">
                    {/* Horizontal Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                      <line
                        key={tick}
                        x1="40"
                        y1={260 - tick * 220}
                        x2="780"
                        y2={260 - tick * 220}
                        stroke="#e2e8f0"
                        strokeDasharray="4 4"
                      />
                    ))}

                    {/* Polyline */}
                    {(() => {
                      const points = aggregatedData.map((d, i) => {
                        const x = 40 + (i / Math.max(1, aggregatedData.length - 1)) * 740;
                        const y = 260 - (d.value / maxValue) * 220;
                        return `${x},${y}`;
                      });

                      const areaPoints = `40,260 ${points.join(' ')} ${40 + 740},260`;

                      return (
                        <>
                          <polygon points={areaPoints} fill="rgba(15, 23, 42, 0.06)" />
                          <polyline
                            points={points.join(' ')}
                            fill="none"
                            stroke="#0f172a"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {aggregatedData.map((d, i) => {
                            const x = 40 + (i / Math.max(1, aggregatedData.length - 1)) * 740;
                            const y = 260 - (d.value / maxValue) * 220;
                            return (
                              <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r={hoveredIndex === i ? '6' : '3.5'}
                                className="fill-slate-900 transition-all cursor-pointer"
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                              />
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>

                  {/* X Axis Labels */}
                  <div className="flex justify-between mt-3 text-[11px] text-slate-500 font-mono">
                    {aggregatedData.map((d, i) => (
                      <span
                        key={i}
                        className={`truncate max-w-[80px] text-center ${
                          hoveredIndex === i ? 'font-bold text-slate-900' : ''
                        }`}
                      >
                        {d.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-400 text-xs">
                  Line trend requires at least 2 categories or time intervals.
                </div>
              )}
            </div>
          )}

          {chartType === 'donut' && (
            <div className="w-full flex flex-col md:flex-row items-center justify-around gap-8 py-4">
              {/* Circular SVG Donut */}
              <div className="relative w-64 h-64 shrink-0">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  {(() => {
                    let cumulativePercent = 0;
                    const colors = [
                      '#0f172a', '#334155', '#475569', '#64748b', '#94a3b8',
                      '#2563eb', '#3b82f6', '#059669', '#10b981', '#d97706',
                    ];

                    return aggregatedData.slice(0, 8).map((slice, i) => {
                      const percent = totalSum > 0 ? slice.value / totalSum : 0;
                      const strokeDasharray = `${percent * 251.2} 251.2`;
                      const strokeDashoffset = -cumulativePercent * 251.2;
                      cumulativePercent += percent;

                      return (
                        <circle
                          key={i}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke={colors[i % colors.length]}
                          strokeWidth="16"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all hover:opacity-80 cursor-pointer"
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-slate-400 font-medium">Total Volume</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {formatMetricNumber(totalSum)}
                  </span>
                </div>
              </div>

              {/* Legend Strip */}
              <div className="space-y-2 max-w-sm w-full text-xs">
                {aggregatedData.slice(0, 8).map((slice, i) => {
                  const share = totalSum > 0 ? ((slice.value / totalSum) * 100).toFixed(1) : '0';
                  const colors = [
                    'bg-slate-900', 'bg-slate-700', 'bg-slate-600', 'bg-slate-500', 'bg-slate-400',
                    'bg-blue-600', 'bg-blue-500', 'bg-emerald-600', 'bg-emerald-500', 'bg-amber-600',
                  ];

                  return (
                    <div key={i} className="flex items-center justify-between text-slate-700">
                      <div className="flex items-center gap-2 truncate">
                        <span className={`w-2.5 h-2.5 rounded-full ${colors[i % colors.length]}`} />
                        <span className="truncate font-medium">{slice.label}</span>
                      </div>
                      <div className="font-mono text-slate-900 tabular-nums">
                        {share}% <span className="text-slate-400 font-normal">({formatMetricNumber(slice.value)})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {chartType === 'scatter' && (
            <div className="w-full">
              {scatterPoints.length >= 3 ? (
                <div className="relative w-full h-80">
                  {(() => {
                    const minX = Math.min(...scatterPoints.map(p => p.x));
                    const maxX = Math.max(...scatterPoints.map(p => p.x));
                    const minY = Math.min(...scatterPoints.map(p => p.y));
                    const maxY = Math.max(...scatterPoints.map(p => p.y));

                    const rangeX = maxX - minX || 1;
                    const rangeY = maxY - minY || 1;

                    return (
                      <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
                        {/* Box outline */}
                        <rect x="40" y="20" width="720" height="240" fill="none" stroke="#e2e8f0" />
                        {/* Grid */}
                        <line x1="40" y1="140" x2="760" y2="140" stroke="#f1f5f9" strokeDasharray="4 4" />
                        <line x1="400" y1="20" x2="400" y2="260" stroke="#f1f5f9" strokeDasharray="4 4" />

                        {scatterPoints.slice(0, 150).map((pt, i) => {
                          const px = 40 + ((pt.x - minX) / rangeX) * 720;
                          const py = 260 - ((pt.y - minY) / rangeY) * 240;

                          return (
                            <circle
                              key={i}
                              cx={px}
                              cy={py}
                              r="4"
                              fill="#0f172a"
                              opacity="0.65"
                              className="hover:opacity-100 hover:r-6 transition-all"
                            >
                              <title>{`${pt.label}: X=${pt.x}, Y=${pt.y}`}</title>
                            </circle>
                          );
                        })}
                      </svg>
                    );
                  })()}

                  <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-2">
                    <span>X: {metricCol}</span>
                    <span>Y: {scatterSecondMetric}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-400 text-xs">
                  Scatter plot requires at least 3 rows with both numerical metrics populated.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
