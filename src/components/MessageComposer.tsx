import React, { useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface MessageComposerProps {
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  isLoading: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  input,
  setInput,
  onSend,
  isLoading,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on input
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="sticky bottom-0 z-10 w-full bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent pb-5 pt-3 transition-colors dark:from-slate-950 dark:via-slate-950/90">
      <div className="mx-auto max-w-3xl px-4">
        <div className="relative flex items-end rounded-2xl border border-slate-300/80 bg-white shadow-sm focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500 transition-all dark:border-slate-800 dark:bg-slate-900 dark:focus-within:border-slate-600 dark:focus-within:ring-slate-600">
          <textarea
            id="message-composer-input"
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="AION 2 최적화 질문이나 기록할 내용을 입력하세요..."
            disabled={isLoading}
            className="w-full resize-none border-0 bg-transparent py-3.5 pl-4 pr-12 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 leading-relaxed max-h-[180px] dark:text-slate-100 dark:placeholder-slate-500"
          />

          <div className="absolute right-2.5 bottom-2.5">
            <button
              id="btn-send-message"
              type="button"
              onClick={onSend}
              disabled={isLoading || !input.trim()}
              aria-label="메시지 전송"
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                isLoading || !input.trim()
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                  : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200'
              }`}
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-white dark:border-slate-600 dark:border-t-slate-900" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="mt-1.5 flex items-center justify-between px-2 text-[11px] text-slate-400 dark:text-slate-500">
          <span>Enter로 전송, Shift+Enter로 줄바꿈</span>
          <span>AION 2 Optimization Engine</span>
        </div>
      </div>
    </div>
  );
};
