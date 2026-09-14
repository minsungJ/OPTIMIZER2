import React from 'react';
import { RotateCcw } from 'lucide-react';

interface HeaderProps {
  onReset: () => void;
  isResetting?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onReset, isResetting }) => {
  return (
    <header
      id="app-header"
      className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 py-3.5 backdrop-blur-sm transition-colors"
    >
      <div className="flex items-center space-x-2.5">
        <div className="flex h-2.5 w-2.5 items-center justify-center">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
        </div>
        <h1 className="text-sm font-semibold tracking-wider text-slate-800 uppercase">
          AION 2 OPTIMIZER
        </h1>
      </div>

      <div className="flex items-center space-x-2">
        <button
          id="btn-reset-state"
          onClick={onReset}
          disabled={isResetting}
          title="대화 및 상태 초기화"
          className="flex items-center space-x-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
          <span>초기화</span>
        </button>
      </div>
    </header>
  );
};


