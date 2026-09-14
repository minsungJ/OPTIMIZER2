import React, { useRef, useEffect } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';

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

  const isSendDisabled = isLoading || !input.trim();

  return (
    <div className="w-full pb-6 pt-2 select-none">
      <div className="rounded-[12px] border border-[#262626] bg-[#1a1a1a] p-3 shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition-colors focus-within:border-[#404040]">
        <textarea
          id="message-composer-input"
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="AION 2 최적화 질문이나 기록할 내용을 입력하세요..."
          disabled={isLoading}
          className="min-h-[44px] w-full resize-none border-none bg-transparent p-2 text-[0.95rem] text-[#ececec] placeholder-[#8e8e8e] outline-none focus:outline-none focus:ring-0 leading-relaxed max-h-[180px]"
        />

        <div className="flex items-center justify-end pt-1">
          <button
            id="btn-send-message"
            type="button"
            onClick={onSend}
            disabled={isSendDisabled}
            aria-label="메시지 전송"
            className={`flex h-8 w-8 items-center justify-center rounded-[6px] border-none bg-[#ffffff] text-[#0d0d0d] transition-opacity ${
              isSendDisabled
                ? 'cursor-not-allowed opacity-20'
                : 'cursor-pointer opacity-100 hover:opacity-90 active:scale-95'
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#0d0d0d]" />
            ) : (
              <ArrowUp className="h-4 w-4 stroke-[3]" />
            )}
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-6">
        <span className="font-mono text-[0.65rem] tracking-[0.05em] text-[#8e8e8e]">
          Enter to send
        </span>
        <span className="font-mono text-[0.65rem] tracking-[0.05em] text-[#8e8e8e]">
          AION 2 V2.0.4
        </span>
      </div>
    </div>
  );
};

