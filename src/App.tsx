/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { OfflineBanner } from './components/OfflineBanner';
import { FileUploadZone } from './components/FileUploadZone';
import { ExecutiveSummaryCard } from './components/ExecutiveSummaryCard';
import { UniformityAuditView } from './components/UniformityAuditView';
import { HighlightsView } from './components/HighlightsView';
import { VisualizerView } from './components/VisualizerView';
import { PivotView } from './components/PivotView';
import { DataTableView } from './components/DataTableView';
import { ReportModal } from './components/ReportModal';
import { AggregatedDataset } from './types/data';
import { saveLocalSession, loadLocalSession, purgeLocalSession } from './utils/localDb';
import { loadSampleDataset } from './utils/sampleData';
import { FolderUp, ShieldCheck, FileSpreadsheet, Lock } from 'lucide-react';

export default function App() {
  const [dataset, setDataset] = useState<AggregatedDataset | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('executive');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedFileFilter, setSelectedFileFilter] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Load previous local session from IndexedDB on startup
  useEffect(() => {
    async function initSession() {
      try {
        const saved = await loadLocalSession();
        if (saved && saved.mergedRows && saved.mergedRows.length > 0) {
          setDataset(saved);
        }
      } catch (err) {
        console.warn('Could not restore local IndexedDB session:', err);
      } finally {
        setIsLoadingSession(false);
      }
    }
    initSession();
  }, []);

  const handleDatasetLoaded = (newDataset: AggregatedDataset) => {
    setDataset(newDataset);
    setIsUploadModalOpen(false);
    setSelectedFileFilter(null);
    setActiveTab('executive');
    saveLocalSession(newDataset);
  };

  const handleClearData = async () => {
    if (window.confirm('Wipe current in-memory dataset and clear local device cache? All data will be purged.')) {
      await purgeLocalSession();
      setDataset(null);
      setSelectedFileFilter(null);
      setActiveTab('executive');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Offline Confidentiality Guarantee Banner */}
      <OfflineBanner />

      {/* Top Bar Navigation Contract */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasData={!!dataset}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onClearData={handleClearData}
        onPrintReport={() => setIsReportModalOpen(true)}
        totalFiles={dataset ? dataset.files.length : 0}
        totalRows={dataset ? dataset.mergedRows.length : 0}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoadingSession ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400">
            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-xs font-mono">Initializing client memory...</span>
          </div>
        ) : !dataset ? (
          /* Empty State: File Upload & Mac Folder Ingestion */
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto pt-6">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-md mb-3">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Offline & Air-Gapped Analysis</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Analyze Uniform Excel Folders on your Mac
              </h1>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed text-pretty">
                Read folders containing workbooks with uniform data formats (.xlsx, .xls, .csv).
                Get instant automated executive summaries, format uniformity checks, outlier highlights, and cross-tab analysis—strictly in local memory.
              </p>
            </div>

            <FileUploadZone onDatasetLoaded={handleDatasetLoaded} />

            {/* Privacy Feature Highlights */}
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="p-5 bg-white rounded-xl border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800 mb-3">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Total Confidentiality</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Your spreadsheets never leave your device. All SheetJS parsing and statistical computations execute entirely inside your local browser sandbox.
                </p>
              </div>

              <div className="p-5 bg-white rounded-xl border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800 mb-3">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Uniform Schema Verification</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Automatically verifies column consistency across multiple batch files in a folder, detecting missing columns, schema drift, and data types.
                </p>
              </div>

              <div className="p-5 bg-white rounded-xl border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800 mb-3">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Automated Intelligence</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Computes IQR outlier spikes, Pearson metric correlations, Pareto drivers, and generates full executive briefing narratives automatically.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Populated State with Views */
          <div>
            {/* Contextual Filter Notice if viewing single file */}
            {selectedFileFilter && (
              <div className="mb-4 p-3 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-700">
                  Currently filtered to inspect single file: <strong className="font-mono text-slate-900">{selectedFileFilter}</strong>
                </span>
                <button
                  onClick={() => setSelectedFileFilter(null)}
                  className="font-medium text-slate-900 hover:underline"
                >
                  View All Merged Files
                </button>
              </div>
            )}

            {/* Active Tab View Rendering */}
            {activeTab === 'executive' && (
              <ExecutiveSummaryCard
                dataset={dataset}
                onNavigateToTab={tab => setActiveTab(tab)}
              />
            )}

            {activeTab === 'uniformity' && (
              <UniformityAuditView
                dataset={dataset}
                selectedFileFilter={selectedFileFilter}
                onFilterByFile={fileName => {
                  setSelectedFileFilter(fileName);
                  setActiveTab('data');
                }}
              />
            )}

            {activeTab === 'highlights' && <HighlightsView dataset={dataset} />}

            {activeTab === 'visualizer' && <VisualizerView dataset={dataset} />}

            {activeTab === 'pivot' && <PivotView dataset={dataset} />}

            {activeTab === 'data' && (
              <DataTableView
                dataset={dataset}
                activeFileFilter={selectedFileFilter}
                onSetFileFilter={setSelectedFileFilter}
              />
            )}
          </div>
        )}
      </main>

      {/* Upload / Change Folder Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto flex items-center justify-center p-4">
          <div className="max-w-3xl w-full">
            <FileUploadZone
              onDatasetLoaded={handleDatasetLoaded}
              onCancel={() => setIsUploadModalOpen(false)}
              isModal={true}
            />
          </div>
        </div>
      )}

      {/* Printable Report Dossier Modal */}
      {isReportModalOpen && dataset && (
        <ReportModal
          dataset={dataset}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      {/* Footer */}
      <footer className="no-print mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">LocalSheet Analytics</span>
            <span aria-hidden="true">·</span>
            <span>Mac Native Folder & Excel Intelligence</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span>Air-Gapped Client Runtime</span>
            <span>Zero Remote Telemetry</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
