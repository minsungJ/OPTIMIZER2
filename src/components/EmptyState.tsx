import React from 'react';

export const EmptyState: React.FC = () => {
  return (
    <div
      id="empty-state-container"
      className="flex flex-1 flex-col items-center justify-center px-4 py-28 text-center"
    >
      <div className="w-full max-w-sm space-y-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <span className="text-sm font-semibold tracking-wider">A2</span>
        </div>
        <h2 className="text-base font-semibold tracking-wide text-slate-800 uppercase">
          AION 2 OPTIMIZER
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          캐릭터의 현재 스펙, 보유 키나, 강화 및 파밍 내역을 입력하여 실시간 의사결정 분석을 시작하세요.
        </p>
      </div>
    </div>
  );
};

