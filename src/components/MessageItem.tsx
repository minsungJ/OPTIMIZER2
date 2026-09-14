import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '../types.js';

interface MessageItemProps {
  message: ChatMessage;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div
      id={`message-${message.id}`}
      className={`group flex w-full flex-col py-2.5 ${
        isUser ? 'items-end' : 'items-start'
      }`}
    >
      <div
        className={`max-w-2xl text-sm leading-relaxed transition-colors ${
          isUser
            ? 'rounded-xl border border-[#262626] bg-[#1a1a1a] px-4 py-2.5 text-[#ececec] font-normal shadow-[0_2px_12px_rgba(0,0,0,0.3)]'
            : 'w-full rounded-xl border border-[#262626] bg-[#121212] px-5 py-4 text-[#ececec] shadow-[0_2px_16px_rgba(0,0,0,0.4)]'
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="space-y-3">
            <div className="markdown-body">
              <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
            </div>

            {/* Systematic state mutation pills */}
            {message.metadata?.stateChanges && message.metadata.stateChanges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#262626] pt-3">
                {message.metadata.stateChanges.map((change, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded border border-[#2e2e2e] bg-[#1c1c1c] px-2 py-0.5 font-mono text-[11px] text-[#a3a3a3]"
                  >
                    {change}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

