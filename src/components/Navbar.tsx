import React from 'react';
import {
  FolderUp,
  FileSpreadsheet,
  ShieldCheck,
  Printer,
  Trash2,
  BarChart3,
  Sparkles,
  GitCompare,
  Table2,
  FileText,
  Grid3x3,
} from 'lucide-react';

export type ActiveTab = 'executive' | 'uniformity' | 'highlights' | 'visualizer' | 'pivot' | 'data';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  hasData: boolean;
  onOpenUpload: () => void;
  onClearData: () => void;
  onPrintReport: () => void;
  totalFiles: number;
  totalRows: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  hasData,
  onOpenUpload,
  onClearData,
  onPrintReport,
  totalFiles,
  totalRows,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              LocalSheet Analytics
            </span>
          </div>

          {/* Zone 2: Navigation Links / Views */}
          {hasData ? (
            <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
              <button
                onClick={() => setActiveTab('executive')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'executive'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Executive Brief</span>
              </button>

              <button
                onClick={() => setActiveTab('uniformity')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'uniformity'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Uniformity Audit</span>
                {totalFiles > 1 && (
                  <span className="ml-1 text-[10px] text-slate-500 font-mono">({totalFiles})</span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('highlights')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'highlights'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Highlights & Outliers</span>
              </button>

              <button
                onClick={() => setActiveTab('visualizer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'visualizer'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Visual Analytics</span>
              </button>

              <button
                onClick={() => setActiveTab('pivot')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'pivot'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid3x3 className="w-3.5 h-3.5" />
                <span>Pivot & Group</span>
              </button>

              <button
                onClick={() => setActiveTab('data')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'data'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>Data Grid</span>
                <span className="ml-1 text-[10px] text-slate-500 font-mono">({totalRows.toLocaleString()})</span>
              </button>
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Air-Gapped Client Runtime</span>
              <span aria-hidden="true">·</span>
              <span>Zero Cloud Sync</span>
            </div>
          )}

          {/* Zone 3: Actions */}
          <div className="flex items-center gap-2.5">
            {hasData && (
              <>
                <button
                  onClick={onPrintReport}
                  title="Print or Save PDF Executive Report"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Report Dossier</span>
                </button>

                <button
                  onClick={onClearData}
                  title="Wipe current data and purge in-memory cache"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shadow-xs"
            >
              <FolderUp className="w-3.5 h-3.5" />
              <span>{hasData ? 'Change Folder / Files' : 'Import Folder'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Strip */}
        {hasData && (
          <div className="flex md:hidden overflow-x-auto py-2 border-t border-slate-100 gap-2 no-scrollbar">
            {(
              [
                ['executive', 'Brief'],
                ['uniformity', 'Uniformity'],
                ['highlights', 'Highlights'],
                ['visualizer', 'Charts'],
                ['pivot', 'Pivot'],
                ['data', 'Data'],
              ] as [ActiveTab, string][]
            ).map(([tabKey, label]) => (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${
                  activeTab === tabKey
                    ? 'bg-slate-900 text-white font-medium'
                    : 'text-slate-600 bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};
