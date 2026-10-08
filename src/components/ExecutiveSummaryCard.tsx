import React from 'react';
import {
  FileText,
  TrendingUp,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  PieChart,
  Calendar,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { AggregatedDataset } from '../types/data';
import { ExecutiveTrendAnalysis } from './ExecutiveTrendAnalysis';

interface ExecutiveSummaryCardProps {
  dataset: AggregatedDataset;
  onNavigateToTab: (tab: 'uniformity' | 'highlights' | 'visualizer' | 'pivot' | 'data') => void;
}

export const ExecutiveSummaryCard: React.FC<ExecutiveSummaryCardProps> = ({
  dataset,
  onNavigateToTab,
}) => {
  const { summary, uniformityReport, files, mergedRows, columns, columnProfiles } = dataset;
  const isMultiFile = files.length > 1;

  // Detect date columns in dataset
  const dateColumns = columns.filter(col => {
    if (columnProfiles[col]?.type === 'date') return true;
    const sample = columnProfiles[col]?.sampleValues || [];
    const hasDateSample = sample.some(v => typeof v === 'string' && /^\d{4}[-/.]\d{1,2}/.test(v));
    const hasDateName = /date|day|month|year|period|quarter|timestamp/i.test(col);
    return hasDateSample || (hasDateName && columnProfiles[col]?.type !== 'number');
  });

  return (
    <div className="space-y-6">
      {/* KPI Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.headlineKpis.map(kpi => (
          <div
            key={kpi.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                <span>{kpi.label}</span>
                {kpi.badge && (
                  <span className="text-[10px] text-emerald-700 font-mono">{kpi.badge}</span>
                )}
              </div>
              <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
                {kpi.value}
              </div>
            </div>

            {kpi.secondary && (
              <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span className="truncate">{kpi.secondary}</span>
                {kpi.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main Narrative & Strategic Briefing */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Automated Executive Synthesis & Dossier
              </h2>
              <p className="text-xs text-slate-500">
                Synthesized locally across {files.length} {files.length === 1 ? 'file' : 'folder files'} ({mergedRows.length.toLocaleString()} records)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
            <span>Air-Gap Verified</span>
            <span aria-hidden="true">·</span>
            <span>Deterministic Math</span>
          </div>
        </div>

        {/* Narrative Paragraphs */}
        <div className="py-6 space-y-4">
          {summary.executiveNarrative.map((paragraph, idx) => (
            <p
              key={idx}
              className="text-sm leading-relaxed text-slate-700 text-pretty"
            >
              {paragraph}
            </p>
          ))}
        </div>

        {/* Key Takeaways & Core Drivers Strip */}
        <div className="pt-6 border-t border-slate-200">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
            Critical Operational Takeaways
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Takeaway 1: Uniformity & Ingestion */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Folder Structure & Uniformity</span>
                </div>
                <p className="text-xs text-slate-600 leading-normal mt-1">
                  {uniformityReport.isUniform
                    ? `100% column parity verified across all ${files.length} folder workbooks.`
                    : `${uniformityReport.mismatchedFiles} file(s) exhibited schema drift requiring auto-harmonization.`}
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('uniformity')}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-900 hover:underline"
              >
                <span>Inspect Schema Matrix</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Takeaway 2: Outliers & Risk */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Variance & Anomaly Watch</span>
                </div>
                <p className="text-xs text-slate-600 leading-normal mt-1">
                  {summary.anomalies.length > 0
                    ? `Detected ${summary.anomalies.length} statistical outliers deviating past 2.5 IQR thresholds.`
                    : 'Values are well-contained within predicted interquartile normal spreads.'}
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('highlights')}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-900 hover:underline"
              >
                <span>Review Outlier Rows</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Takeaway 3: Concentration & Drivers */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 mb-1">
                  <PieChart className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Volume Concentration (Pareto)</span>
                </div>
                <p className="text-xs text-slate-600 leading-normal mt-1">
                  {summary.drivers.length > 0
                    ? summary.drivers[0].impactNarrative
                    : 'Evenly balanced contribution across categorical dimensions.'}
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('visualizer')}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-900 hover:underline"
              >
                <span>Open Visual Analytics</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Time-Series Trend Analysis Section (Recharts) */}
      {dateColumns.length > 0 && (
        <ExecutiveTrendAnalysis dataset={dataset} dateColumns={dateColumns} />
      )}

      {/* Driver & Correlation Highlights Bento Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Segment Drivers */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Segment Contribution Drivers
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Top categorical performers driving total dataset volume
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">Pareto 80/20</span>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {summary.drivers.slice(0, 4).map((driver, i) => (
              <div key={i} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-900">
                    <span className="truncate">{driver.topContributor}</span>
                    <span className="text-slate-400 font-normal">({driver.dimension})</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    Metric: {driver.metric}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-slate-900 font-mono tabular-nums">
                    {driver.sharePct}%
                  </div>
                  <span className="text-[11px] text-slate-400">Share of Total</span>
                </div>
              </div>
            ))}

            {summary.drivers.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                No categorical driver groupings identified in current columns.
              </div>
            )}
          </div>
        </div>

        {/* Structural Correlations Preview */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Discovered Metric Associations
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pearson correlation coefficients across continuous dimensions
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('highlights')}
              className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {summary.correlations.slice(0, 4).map((corr, i) => (
              <div key={i} className="py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-900 truncate">
                    {corr.var1} <span className="text-slate-400 font-normal">vs.</span> {corr.var2}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {corr.interpretation}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                      corr.coefficient > 0
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-indigo-50 text-indigo-800'
                    }`}
                  >
                    r = {corr.coefficient > 0 ? '+' : ''}{corr.coefficient}
                  </span>
                </div>
              </div>
            ))}

            {summary.correlations.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                Requires at least two numerical metrics to compute correlation associations.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
