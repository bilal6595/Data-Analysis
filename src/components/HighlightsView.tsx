import React, { useState } from 'react';
import {
  AlertTriangle,
  Sparkles,
  Search,
  Activity,
  ArrowRight,
  Info,
  CheckCircle2,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  X,
  Sliders,
} from 'lucide-react';
import { AggregatedDataset, AnomalyItem, CorrelationItem } from '../types/data';
import { formatMetricNumber } from '../utils/analyticsEngine';

interface HighlightsViewProps {
  dataset: AggregatedDataset;
}

export const HighlightsView: React.FC<HighlightsViewProps> = ({ dataset }) => {
  const { summary, columnProfiles, columns, mergedRows } = dataset;
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyItem | null>(null);
  const [selectedColumnProfile, setSelectedColumnProfile] = useState<string>(
    columns.find(c => columnProfiles[c]?.type === 'number') || columns[0]
  );
  const [activeCorrelation, setActiveCorrelation] = useState<CorrelationItem | null>(
    summary.correlations[0] || null
  );

  const numericCols = columns.filter(c => columnProfiles[c]?.type === 'number');
  const activeProfile = columnProfiles[selectedColumnProfile];

  return (
    <div className="space-y-6">
      {/* Top Banner: Data Health & Summary of Highlights */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Automated Highlights & Anomaly Scanner
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated {mergedRows.length.toLocaleString()} rows for statistical deviations, correlations & health flags
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Dataset Health Score</span>
              <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                {summary.qualityReport.overallScore} / 100
              </span>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-indigo-600 flex items-center justify-center font-mono text-xs font-bold text-indigo-600">
              {summary.qualityReport.overallScore}%
            </div>
          </div>
        </div>

        {/* Quality Flags List */}
        {summary.qualityReport.flags.length > 0 && (
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.qualityReport.flags.map((flag, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                  flag.type === 'critical'
                    ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                    : flag.type === 'warning'
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">{flag.title}</span>
                  <span className="text-slate-600">{flag.description}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bento Grid: Outlier Scanner + Correlation Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outlier & Anomaly List */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Statistical Outliers & Spikes ({summary.anomalies.length})
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">IQR Bounds &gt; 2.5×</span>
            </div>

            {summary.anomalies.length > 0 ? (
              <div className="divide-y divide-slate-100 mt-2 max-h-[380px] overflow-y-auto pr-1">
                {summary.anomalies.map(anomaly => (
                  <div
                    key={anomaly.id}
                    onClick={() => setSelectedAnomaly(anomaly)}
                    className="py-3 px-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-900">
                          {anomaly.column}
                        </span>
                        <span className="text-slate-400">Row #{anomaly.rowIndex}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                            anomaly.severity === 'high'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {anomaly.severity === 'high' ? 'High Spike' : 'Outlier'}
                        </span>
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        Observed: <span className="font-mono font-semibold text-slate-800">{formatMetricNumber(anomaly.value)}</span> · Expected: <span className="font-mono text-slate-600">{anomaly.expectedRange}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                        {anomaly.deviation}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                <p className="font-medium text-slate-700">No anomalous spikes identified</p>
                <p className="mt-0.5">Continuous numerical distributions adhere cleanly to normal bounds.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Click any flagged row to inspect the full cell transaction record.
          </div>
        </div>

        {/* Correlation Discovery & Associations */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Cross-Metric Correlations
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Pearson r</span>
            </div>

            {summary.correlations.length > 0 ? (
              <div className="space-y-3 mt-4">
                {summary.correlations.map((corr, idx) => {
                  const isSelected = activeCorrelation?.var1 === corr.var1 && activeCorrelation?.var2 === corr.var2;
                  const isPositive = corr.coefficient > 0;

                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveCorrelation(corr)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-slate-900 bg-slate-50/80 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 font-mono">
                          {isPositive ? (
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                          <span>{corr.var1}</span>
                          <span className="text-slate-400 font-normal">↔</span>
                          <span>{corr.var2}</span>
                        </div>

                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          r = {isPositive ? '+' : ''}{corr.coefficient}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {corr.interpretation}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                At least two continuous numerical columns are required to run correlation matrices.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            r &gt; 0.7 denotes strong coupling; r &lt; -0.7 denotes inverse trade-off.
          </div>
        </div>
      </div>

      {/* Column Distribution & Profile Deep Dive */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200 gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Descriptive Column Profiler & Distribution
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Deep dive into statistics, quartiles, and frequency counts
            </p>
          </div>

          {/* Column selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Select Column:</span>
            <select
              value={selectedColumnProfile}
              onChange={e => setSelectedColumnProfile(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              {columns.map(c => (
                <option key={c} value={c}>
                  {c} ({columnProfiles[c]?.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeProfile && (
          <div className="pt-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mb-6 pb-4 border-b border-slate-100">
              <span className="font-semibold text-slate-900 font-mono text-sm">
                {activeProfile.name}
              </span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">Type: {activeProfile.type}</span>
              <span aria-hidden="true">·</span>
              <span>Unique Values: {activeProfile.uniqueCount.toLocaleString()}</span>
              <span aria-hidden="true">·</span>
              <span>Missing Values: {activeProfile.nullCount.toLocaleString()}</span>
            </div>

            {activeProfile.type === 'number' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                  <span className="text-slate-400 block">Sum</span>
                  <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                    {formatMetricNumber(activeProfile.sum)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                  <span className="text-slate-400 block">Mean (Avg)</span>
                  <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                    {formatMetricNumber(activeProfile.mean)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                  <span className="text-slate-400 block">Median</span>
                  <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                    {formatMetricNumber(activeProfile.median)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                  <span className="text-slate-400 block">Std Dev (σ)</span>
                  <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                    {formatMetricNumber(activeProfile.stdDev)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                  <span className="text-slate-400 block">Min</span>
                  <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                    {formatMetricNumber(activeProfile.min)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                  <span className="text-slate-400 block">Max</span>
                  <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                    {formatMetricNumber(activeProfile.max)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                  <span className="text-slate-400 block">IQR Spread</span>
                  <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                    {formatMetricNumber(activeProfile.iqr)}
                  </span>
                </div>
              </div>
            )}

            {/* Categorical top frequencies */}
            {activeProfile.topFrequencies && activeProfile.topFrequencies.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-800 mb-3 uppercase tracking-wider">
                  Top Occurrences Breakdown
                </h4>
                <div className="space-y-2">
                  {activeProfile.topFrequencies.map((freq, i) => (
                    <div key={i} className="text-xs">
                      <div className="flex justify-between text-slate-700 mb-1">
                        <span className="font-medium truncate max-w-xs">{freq.value || '(Empty)'}</span>
                        <span className="font-mono text-slate-500 tabular-nums">
                          {freq.count.toLocaleString()} ({freq.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-slate-900 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(2, freq.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Row Inspection Modal for Anomaly */}
      {selectedAnomaly && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Outlier Record Inspection
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Row #{selectedAnomaly.rowIndex} in column &quot;{selectedAnomaly.column}&quot;
                </p>
              </div>
              <button
                onClick={() => setSelectedAnomaly(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 my-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
              <span className="font-semibold">Anomaly Details:</span> Observed value was{' '}
              <span className="font-mono font-bold">{formatMetricNumber(selectedAnomaly.value)}</span>,{' '}
              exceeding expected spread {selectedAnomaly.expectedRange} ({selectedAnomaly.deviation}).
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 text-xs">
              {Object.entries(selectedAnomaly.rowSnippet).map(([key, val]) => (
                <div key={key} className="py-2.5 flex items-start justify-between gap-4">
                  <span className="font-mono text-slate-500 shrink-0">{key}</span>
                  <span
                    className={`font-mono text-right truncate ${
                      key === selectedAnomaly.column
                        ? 'font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded'
                        : 'text-slate-900'
                    }`}
                  >
                    {String(val ?? '—')}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedAnomaly(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
