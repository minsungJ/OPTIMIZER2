import React from 'react';
import { RotateCcw } from 'lucide-react';

interface SidebarProps {
  onReset: () => void;
  isResetting?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onReset, isResetting }) => {
  return (
    <aside
      id="app-sidebar"
      className="hidden w-[260px] shrink-0 flex-col border-r border-[#262626] bg-[#000000] p-4 md:flex select-none"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 p-3 text-base font-semibold tracking-tight text-[#ececec]">
          <div className="h-3.5 w-3.5 rounded-[2px] bg-[#ececec]" />
          <span>AION 2 OPTIMIZER</span>
        </div>
        <div className="px-3 pb-1 font-mono text-[0.65rem] tracking-wider text-[#8e8e8e] uppercase">
          Core Engine
        </div>
        <p className="px-3 text-xs leading-relaxed text-[#8e8e8e]">
          Optimization Protocol for high-level economic management.
        </p>
      </div>

      <button
        id="btn-reset-state"
        onClick={onReset}
        disabled={isResetting}
        title="대화 및 상태 초기화"
        type="button"
        className="flex items-center gap-3 rounded-md border border-[#262626] bg-transparent p-3 font-mono text-xs text-[#ececec] transition-colors hover:bg-[#262626] active:bg-[#333333] disabled:opacity-40"
      >
        <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin' : ''}`} />
        <span>초기화</span>
      </button>
    </aside>
  );
};
