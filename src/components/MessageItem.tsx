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
      className={`group flex w-full flex-col py-3.5 ${
        isUser ? 'items-end' : 'items-start'
      }`}
    >
      <div
        className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed transition-colors ${
          isUser
            ? 'bg-slate-900 text-white font-normal shadow-xs dark:bg-slate-100 dark:text-slate-950'
            : 'w-full bg-white text-slate-800 border border-slate-200/80 shadow-xs dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800'
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="space-y-3">
            <div className="markdown-body">
              <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
            </div>

            {/* State mutation pills if recorded */}
            {message.metadata?.stateChanges && message.metadata.stateChanges.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                {message.metadata.stateChanges.map((change, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-100/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60"
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
