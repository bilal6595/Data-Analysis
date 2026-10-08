import React, { useRef, useState } from 'react';
import {
  Folder,
  Files,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Loader2,
  HardDrive,
} from 'lucide-react';
import { parseMultipleFiles } from '../utils/excelParser';
import { loadSampleDataset, downloadSampleFilesIndividually } from '../utils/sampleData';
import { AggregatedDataset } from '../types/data';

interface FileUploadZoneProps {
  onDatasetLoaded: (dataset: AggregatedDataset) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onDatasetLoaded,
  onCancel,
  isModal = false,
}) => {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const processFiles = async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    const validFiles = filesArray.filter(f => /\.(xlsx|xls|csv|tsv)$/i.test(f.name));

    if (validFiles.length === 0) {
      setErrorMessage('No valid Excel (.xlsx, .xls) or CSV files found in the selection.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      setStatusMessage(`Reading ${validFiles.length} local file(s) on your Mac...`);

      // Read files client-side
      const dataset = await parseMultipleFiles(validFiles);
      setStatusMessage(`Computing statistical highlights & uniformity metrics...`);
      // Brief settling
      setTimeout(() => {
        onDatasetLoaded(dataset);
        setLoading(false);
      }, 150);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to parse Excel files. Please check file format.');
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    // Support items/entries traversal if dropped a folder
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const files: File[] = [];
      const queue: any[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry) queue.push(entry);
        } else {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (queue.length > 0) {
        setLoading(true);
        setStatusMessage('Scanning dropped folder hierarchy...');

        const traverseEntry = async (entry: any): Promise<void> => {
          if (entry.isFile) {
            return new Promise(resolve => {
              entry.file((file: File) => {
                files.push(file);
                resolve();
              });
            });
          } else if (entry.isDirectory) {
            const reader = entry.createReader();
            return new Promise(resolve => {
              reader.readEntries(async (entries: any[]) => {
                for (const sub of entries) {
                  await traverseEntry(sub);
                }
                resolve();
              });
            });
          }
        };

        for (const entry of queue) {
          await traverseEntry(entry);
        }

        if (files.length > 0) {
          await processFiles(files);
          return;
        }
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleLoadSample = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setStatusMessage('Synthesizing uniform quarterly Mac branch dataset (4 Excel files)...');
      const sample = await loadSampleDataset();
      setTimeout(() => {
        onDatasetLoaded(sample);
        setLoading(false);
      }, 200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load sample dataset');
      setLoading(false);
    }
  };

  const handleDownloadSampleFiles = async () => {
    try {
      setStatusMessage('Preparing sample Excel files for local Mac download...');
      await downloadSampleFilesIndividually();
      setStatusMessage('Downloaded 4 sample .xlsx files to your Mac Downloads folder!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      setErrorMessage('Could not generate sample files for download.');
    }
  };

  return (
    <div className={`w-full ${isModal ? 'p-6' : 'max-w-4xl mx-auto py-12 px-4'}`}>
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderSelect}
        // Native folder selection attribute in webkit/Mac Chrome & Safari
        {...({ webkitdirectory: '', directory: '', multiple: true } as any)}
        className="hidden"
      />
      <input
        type="file"
        ref={filesInputRef}
        onChange={handleFilesSelect}
        multiple
        accept=".xlsx,.xls,.csv,.tsv"
        className="hidden"
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Mac Folder & Excel Dataset Ingestion
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a folder with uniform Excel workbooks (.xlsx, .xls) or drag & drop files.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-[11px]">Local Mac Memory Only</span>
          </div>
        </div>

        {/* Drop Zone Area */}
        <div className="p-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all ${
              isDragging
                ? 'border-slate-900 bg-slate-50/80 scale-[0.99]'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/30'
            }`}
          >
            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-slate-900 animate-spin mb-3" />
                <p className="text-sm font-semibold text-slate-900">{statusMessage || 'Analyzing Excel data...'}</p>
                <p className="text-xs text-slate-500 mt-1">Executing in-memory client statistical transforms</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-700">
                  <UploadCloud className="w-7 h-7" />
                </div>

                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Drag and drop your Mac folder or Excel files here
                </h3>
                <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
                  Supports folders containing multiple files with uniform schema, or individual sheets (.xlsx, .xls, .csv).
                </p>

                {/* Ingestion Choice Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
                  >
                    <Folder className="w-4 h-4 text-slate-300" />
                    <span>Select Mac Folder...</span>
                  </button>

                  <button
                    onClick={() => filesInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
                  >
                    <Files className="w-4 h-4 text-slate-500" />
                    <span>Select Individual Files...</span>
                  </button>
                </div>

                <div className="mt-6 flex items-center gap-4 text-xs text-slate-400">
                  <span>Uniform schema validation</span>
                  <span aria-hidden="true">·</span>
                  <span>Outlier & anomaly flagging</span>
                  <span aria-hidden="true">·</span>
                  <span>Zero network telemetry</span>
                </div>
              </div>
            )}
          </div>

          {/* Feedback & Error states */}
          {errorMessage && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to analyze selected files</p>
                <p className="mt-0.5 text-rose-700">{errorMessage}</p>
              </div>
            </div>
          )}

          {statusMessage && !loading && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Preset Demo Data Options */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-slate-900 block">
                  Quick Testing with Uniform Data
                </span>
                <span className="text-[11px] text-slate-500">
                  Explore with a realistic 4-quarter uniform branch retail dataset.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Load 4-Quarter Demo Folder</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSampleFiles}
                  title="Download 4 realistic .xlsx files to test Mac folder ingestion"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Get .xlsx Files</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal actions if opened inside modal */}
        {isModal && onCancel && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
