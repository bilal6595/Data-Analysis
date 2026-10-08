import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
} from 'lucide-react';
import { AggregatedDataset } from '../types/data';
import { formatMetricNumber } from '../utils/analyticsEngine';

interface ExecutiveTrendAnalysisProps {
  dataset: AggregatedDataset;
  dateColumns: string[];
}

type TimeGrain = 'monthly' | 'quarterly' | 'daily';

export const ExecutiveTrendAnalysis: React.FC<ExecutiveTrendAnalysisProps> = ({
  dataset,
  dateColumns,
}) => {
  const { columns, columnProfiles, mergedRows } = dataset;
  const numericCols = columns.filter(c => columnProfiles[c]?.type === 'number');

  // Selected date column & metric
  const [selectedDateCol, setSelectedDateCol] = useState<string>(dateColumns[0]);
  const [selectedMetric, setSelectedMetric] = useState<string>(
    numericCols.find(c => /revenue|sales|total|amount|profit|volume/i.test(c)) || numericCols[0] || columns[0]
  );
  const [secondaryMetric, setSecondaryMetric] = useState<string>('none');
  const [timeGrain, setTimeGrain] = useState<TimeGrain>('monthly');
  const [showAverageLine, setShowAverageLine] = useState<boolean>(true);
  const [showMovingAvg, setShowMovingAvg] = useState<boolean>(false);

  // Group and aggregate time-series points
  const { chartData, stats } = useMemo(() => {
    if (!selectedDateCol || !selectedMetric) {
      return { chartData: [], stats: null };
    }

    const grainMap = new Map<string, { primaryVals: number[]; secondaryVals: number[] }>();

    mergedRows.forEach(row => {
      const rawDate = row[selectedDateCol];
      if (!rawDate) return;

      const dateStr = String(rawDate).trim();
      let periodKey = dateStr;

      if (timeGrain === 'monthly') {
        // YYYY-MM
        const match = dateStr.match(/^(\d{4})[-/.](\d{1,2})/);
        if (match) {
          const year = match[1];
          const month = match[2].padStart(2, '0');
          periodKey = `${year}-${month}`;
        } else if (/^\d{4}-\d{2}/.test(dateStr)) {
          periodKey = dateStr.substring(0, 7);
        }
      } else if (timeGrain === 'quarterly') {
        // YYYY-Q#
        const match = dateStr.match(/^(\d{4})[-/.](\d{1,2})/);
        if (match) {
          const year = match[1];
          const month = parseInt(match[2], 10);
          const q = Math.ceil(month / 3);
          periodKey = `${year}-Q${q}`;
        } else if (/Q[1-4]/i.test(dateStr)) {
          periodKey = dateStr;
        }
      } else {
        // Daily: standard YYYY-MM-DD
        if (dateStr.length >= 10) {
          periodKey = dateStr.substring(0, 10);
        }
      }

      const pVal = row[selectedMetric];
      const sVal = secondaryMetric !== 'none' ? row[secondaryMetric] : null;

      if (typeof pVal === 'number' && !isNaN(pVal)) {
        const item = grainMap.get(periodKey) || { primaryVals: [], secondaryVals: [] };
        item.primaryVals.push(pVal);
        if (typeof sVal === 'number' && !isNaN(sVal)) {
          item.secondaryVals.push(sVal);
        }
        grainMap.set(periodKey, item);
      }
    });

    const sortedPeriods = Array.from(grainMap.keys()).sort((a, b) => a.localeCompare(b));

    const series = sortedPeriods.map(period => {
      const data = grainMap.get(period)!;
      const primarySum = data.primaryVals.reduce((a, b) => a + b, 0);
      const secondarySum = data.secondaryVals.length > 0
        ? data.secondaryVals.reduce((a, b) => a + b, 0)
        : null;

      return {
        period,
        [selectedMetric]: Math.round(primarySum * 100) / 100,
        ...(secondaryMetric !== 'none' && secondarySum !== null ? { [secondaryMetric]: Math.round(secondarySum * 100) / 100 } : {}),
        count: data.primaryVals.length,
      };
    });

    // Compute moving average if requested
    if (showMovingAvg && series.length >= 3) {
      const windowSize = 3;
      for (let i = 0; i < series.length; i++) {
        const start = Math.max(0, i - windowSize + 1);
        const windowVals = series.slice(start, i + 1).map(d => (d as any)[selectedMetric]);
        const avg = windowVals.reduce((a, b) => a + b, 0) / windowVals.length;
        (series[i] as any)['Moving_Avg'] = Math.round(avg * 100) / 100;
      }
    }

    if (series.length === 0) return { chartData: [], stats: null };

    // Compute summary stats
    const metricValues = series.map(d => (d as any)[selectedMetric]);
    const total = metricValues.reduce((a, b) => a + b, 0);
    const mean = total / metricValues.length;
    const maxVal = Math.max(...metricValues);
    const minVal = Math.min(...metricValues);
    const peakIndex = metricValues.indexOf(maxVal);
    const troughIndex = metricValues.indexOf(minVal);

    const firstVal = metricValues[0];
    const lastVal = metricValues[metricValues.length - 1];
    const netGrowthPct = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;

    let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (netGrowthPct > 5) direction = 'increasing';
    else if (netGrowthPct < -5) direction = 'decreasing';

    return {
      chartData: series,
      stats: {
        total,
        mean,
        maxVal,
        minVal,
        peakPeriod: series[peakIndex]?.period,
        troughPeriod: series[troughIndex]?.period,
        netGrowthPct,
        direction,
        periodCount: series.length,
      },
    };
  }, [
    mergedRows,
    selectedDateCol,
    selectedMetric,
    secondaryMetric,
    timeGrain,
    showMovingAvg,
  ]);

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs text-center">
        <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-slate-900">Time-Series Trend Analysis</h3>
        <p className="text-xs text-slate-500 mt-1">
          Date column detected (&quot;{selectedDateCol}&quot;), but insufficient chronological data points were found.
        </p>
      </div>
    );
  }

  const isCurrency = /revenue|sales|price|cost|amount|profit|budget/i.test(selectedMetric);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
      {/* Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">
                  Time-Series Trajectory & Trend Analysis
                </h3>
                {stats && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${
                      stats.direction === 'increasing'
                        ? 'bg-emerald-50 text-emerald-800'
                        : stats.direction === 'decreasing'
                        ? 'bg-rose-50 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {stats.direction === 'increasing' ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                    ) : stats.direction === 'decreasing' ? (
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <Activity className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span className="capitalize">{stats.direction} Trend</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated across {stats?.periodCount} chronological periods via client-side vector aggregation
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Selectors */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Date Column (if multiple) */}
          {dateColumns.length > 1 && (
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium">Date:</span>
              <select
                value={selectedDateCol}
                onChange={e => setSelectedDateCol(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-slate-900 font-mono"
              >
                {dateColumns.map(dc => (
                  <option key={dc} value={dc}>{dc}</option>
                ))}
              </select>
            </div>
          )}

          {/* Metric Selector */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Metric:</span>
            <select
              value={selectedMetric}
              onChange={e => setSelectedMetric(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-slate-900 font-medium"
            >
              {numericCols.map(nc => (
                <option key={nc} value={nc}>{nc}</option>
              ))}
            </select>
          </div>

          {/* Secondary Metric */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Compare:</span>
            <select
              value={secondaryMetric}
              onChange={e => setSecondaryMetric(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-slate-900 text-slate-700"
            >
              <option value="none">None</option>
              {numericCols
                .filter(nc => nc !== selectedMetric)
                .map(nc => (
                  <option key={nc} value={nc}>{nc}</option>
                ))}
            </select>
          </div>

          {/* Time Resolution Grain */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg">
            {(['monthly', 'quarterly', 'daily'] as TimeGrain[]).map(grain => (
              <button
                key={grain}
                onClick={() => setTimeGrain(grain)}
                className={`px-2.5 py-1 text-xs rounded-md capitalize transition-colors ${
                  timeGrain === grain
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {grain}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100 text-xs">
            <span className="text-slate-500 block">Period Net Growth</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                className={`text-lg font-bold font-mono tabular-nums ${
                  stats.netGrowthPct >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {stats.netGrowthPct >= 0 ? '+' : ''}{stats.netGrowthPct.toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-400">P1 → P{stats.periodCount}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100 text-xs">
            <span className="text-slate-500 block">Average Run-Rate</span>
            <div className="text-lg font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
              {formatMetricNumber(stats.mean, isCurrency)}
            </div>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100 text-xs">
            <span className="text-slate-500 block">Peak Volume Period</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                {formatMetricNumber(stats.maxVal, isCurrency)}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">({stats.peakPeriod})</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100 text-xs">
            <span className="text-slate-500 block">Lowest Run-Rate</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                {formatMetricNumber(stats.minVal, isCurrency)}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">({stats.troughPeriod})</span>
            </div>
          </div>
        </div>
      )}

      {/* Recharts Area / Line Chart Viewport */}
      <div className="pt-2">
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
            >
              <defs>
                <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f172a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="secondaryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />

              <XAxis
                dataKey="period"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />

              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={val => formatMetricNumber(val, isCurrency)}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs font-mono space-y-1.5 border border-slate-700">
                        <div className="font-sans font-semibold text-slate-200 border-b border-slate-700 pb-1">
                          Period: {label}
                        </div>
                        {payload.map((entry, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-4">
                            <span style={{ color: entry.color }}>{entry.name}:</span>
                            <span className="font-bold text-white tabular-nums">
                              {formatMetricNumber(Number(entry.value), isCurrency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Reference Mean line */}
              {showAverageLine && stats && (
                <ReferenceLine
                  y={stats.mean}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{
                    value: `Avg: ${formatMetricNumber(stats.mean, isCurrency)}`,
                    fill: '#64748b',
                    fontSize: 10,
                    position: 'insideTopLeft',
                  }}
                />
              )}

              {/* Primary Metric Area */}
              <Area
                type="monotone"
                dataKey={selectedMetric}
                stroke="#0f172a"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#primaryGradient)"
                activeDot={{ r: 6, fill: '#0f172a', stroke: '#ffffff', strokeWidth: 2 }}
              />

              {/* Optional Secondary Metric Area */}
              {secondaryMetric !== 'none' && (
                <Area
                  type="monotone"
                  dataKey={secondaryMetric}
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#secondaryGradient)"
                  activeDot={{ r: 5, fill: '#2563eb' }}
                />
              )}

              {/* Optional Moving Average Line */}
              {showMovingAvg && (
                <Line
                  type="monotone"
                  dataKey="Moving_Avg"
                  name="3-Period Moving Avg"
                  stroke="#d97706"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chart View Options Toggles */}
        <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showAverageLine}
                onChange={e => setShowAverageLine(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>Show Mean Baseline</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showMovingAvg}
                onChange={e => setShowMovingAvg(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>3-Period Rolling Trendline</span>
            </label>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            Source Column: <span className="text-slate-600">{selectedDateCol}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
