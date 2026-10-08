import React, { useState } from 'react';
import { Lock, HardDrive, Cpu, X, CheckCircle2 } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <aside aria-label="Privacy & air-gap architecture" className="bg-slate-900 text-slate-100 border-b border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-300">
            <span className="font-semibold text-white">Air-Gapped Confidentiality Mode:</span>
            <span>Zero cloud transfer</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span>100% In-Memory Mac Browser Processing</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-emerald-400 flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3 h-3" /> 0 Outbound Requests
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span className="hidden sm:inline-flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-slate-400" />
            <span>Local Storage Only</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1">
            <Cpu className="w-3 h-3 text-slate-400" />
            <span>Client CPU Parsing</span>
          </span>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss security notice"
            className="text-slate-400 hover:text-white transition-colors p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
