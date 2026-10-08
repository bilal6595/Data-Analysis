import React from 'react';
import { X, Printer, Shield, CheckCircle2 } from 'lucide-react';
import { AggregatedDataset } from '../types/data';
import { formatMetricNumber } from '../utils/analyticsEngine';

interface ReportModalProps {
  dataset: AggregatedDataset;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ dataset, onClose }) => {
  const { summary, uniformityReport, files, mergedRows, columns } = dataset;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="no-print p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-800">
              Confidential Offline Executive Dossier
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF (Mac)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 sm:p-12 overflow-y-auto print:p-0 print:overflow-visible space-y-8 font-sans">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold block">
                  LOCAL AUDIT & INTELLIGENCE REPORT
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                  Executive Data Dossier
                </h1>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  Synthesized across {files.length} uniform workbook(s) · {mergedRows.length.toLocaleString()} total observations
                </p>
              </div>

              <div className="text-right text-xs text-slate-500 font-mono">
                <div>Date: {new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                <div className="text-emerald-700 font-medium mt-0.5">Air-Gapped: Local Mac Runtime</div>
              </div>
            </div>
          </div>

          {/* Headline KPIs */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              I. Key Performance Indicators
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {summary.headlineKpis.map(kpi => (
                <div key={kpi.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                  <div className="text-xs text-slate-500">{kpi.label}</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-1 tabular-nums">
                    {kpi.value}
                  </div>
                  {kpi.secondary && (
                    <div className="text-[11px] text-slate-400 mt-1 truncate">{kpi.secondary}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Executive Narrative */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              II. Executive Summary & Findings
            </h2>
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed border-l-2 border-slate-900 pl-4">
              {summary.executiveNarrative.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>

          {/* Uniformity Audit Summary */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              III. Folder Uniformity & Ingestion Quality
            </h2>
            <div className="p-4 border border-slate-200 rounded-lg text-xs space-y-2 bg-slate-50/30">
              <div className="flex justify-between font-mono">
                <span>Schema Consistency:</span>
                <span className="font-semibold text-slate-900">
                  {uniformityReport.isUniform ? '100% Uniform Parity' : 'Minor Harmonization Required'}
                </span>
              </div>
              <div className="flex justify-between font-mono">
                <span>Evaluated Files:</span>
                <span>{files.length} file(s) ({uniformityReport.matchedFiles} exact schema matches)</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>Canonical Columns:</span>
                <span>{columns.join(', ')}</span>
              </div>
            </div>
          </div>

          {/* Top Drivers */}
          {summary.drivers.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                IV. Segment Drivers & Concentration
              </h2>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                    <tr>
                      <th className="p-2.5">Dimension</th>
                      <th className="p-2.5">Top Contributor</th>
                      <th className="p-2.5">Metric</th>
                      <th className="p-2.5 text-right">Volume Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {summary.drivers.map((d, i) => (
                      <tr key={i}>
                        <td className="p-2.5 text-slate-600">{d.dimension}</td>
                        <td className="p-2.5 font-bold text-slate-900">{d.topContributor}</td>
                        <td className="p-2.5 text-slate-600">{d.metric}</td>
                        <td className="p-2.5 text-right font-bold tabular-nums text-slate-900">
                          {d.sharePct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Anomalies and Outliers */}
          {summary.anomalies.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                V. Outlier & Anomaly Flags (IQR &gt; 2.5×)
              </h2>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left font-mono">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 font-sans">
                    <tr>
                      <th className="p-2.5">Row</th>
                      <th className="p-2.5">Field</th>
                      <th className="p-2.5">Observed Value</th>
                      <th className="p-2.5">Normal Spread</th>
                      <th className="p-2.5 text-right">Deviation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.anomalies.slice(0, 10).map((a, i) => (
                      <tr key={i}>
                        <td className="p-2.5 text-slate-400">#{a.rowIndex}</td>
                        <td className="p-2.5 font-semibold text-slate-900">{a.column}</td>
                        <td className="p-2.5 font-bold text-rose-700 tabular-nums">{formatMetricNumber(a.value)}</td>
                        <td className="p-2.5 text-slate-500">{a.expectedRange}</td>
                        <td className="p-2.5 text-right text-rose-700">{a.deviation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Confidentiality Footer */}
          <div className="pt-8 border-t border-slate-200 text-xs text-slate-400 flex justify-between font-mono">
            <span>Generated locally via LocalSheet Analytics</span>
            <span>No data synced or transferred</span>
          </div>
        </div>
      </div>
    </div>
  );
};
