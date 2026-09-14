import React from 'react';

export const EmptyState: React.FC = () => {
  return (
    <div
      id="empty-state-container"
      className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center"
    >
      <h2 className="text-2xl font-medium tracking-tight text-[#ececec] mb-4">
        Optimizer.
      </h2>
      <p className="text-sm text-[#8e8e8e] max-w-[480px] leading-relaxed">
        캐릭터의 현재 스펙, 보유 키나, 강화 및 파밍 내역을 입력하여 실시간 의사결정 분석을 시작하세요.
      </p>
    </div>
  );
};


