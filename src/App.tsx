import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar.js';
import { EmptyState } from './components/EmptyState.js';
import { MessageItem } from './components/MessageItem.js';
import { MessageComposer } from './components/MessageComposer.js';
import { ChatMessage } from './types.js';
import { RotateCcw } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (messageText?: string) => {
    const text = (messageText || input).trim();
    if (!text || isLoading) return;

    setErrorMessage(null);
    const userMsgId = `usr_${Date.now()}`;
    const assistantMsgId = `ast_${Date.now()}`;

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      status: 'complete',
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversation: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('서버 응답 오류가 발생했습니다.');
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: data.answer || '답변을 생성하지 못했습니다.',
        timestamp: new Date().toISOString(),
        status: 'complete',
        metadata: {
          intents: data.intents,
          characterId: data.characterId,
          stateChanges: data.stateChanges,
          decisionId: data.metadata?.decisionId,
          confidence: data.metadata?.confidence,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMessage(
        err?.message || '요청 처리 중 오류가 발생했습니다. 다시 시도해주세요.'
      );

      const errorAssistantMessage: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content:
          '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주시거나 네트워크 상태를 확인해주세요.',
        timestamp: new Date().toISOString(),
        status: 'error',
      };
      setMessages((prev) => [...prev, errorAssistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('대화 기록과 변경된 상태를 초기값으로 리셋하시겠습니까?')) {
      return;
    }
    setIsResetting(true);
    try {
      await fetch('/api/reset', { method: 'POST' });
      setMessages([]);
      setErrorMessage(null);
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0d0d0d] text-[#ececec] font-sans antialiased">
      {/* Left Systematic Sidebar for Desktop */}
      <Sidebar onReset={handleReset} isResetting={isResetting} />

      {/* Main Column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header
          id="mobile-header"
          className="flex items-center justify-between border-b border-[#262626] bg-[#000000] px-4 py-3 md:hidden select-none"
        >
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[#ececec]">
            <div className="h-3 w-3 rounded-[2px] bg-[#ececec]" />
            <span>AION 2 OPTIMIZER</span>
          </div>

          <button
            onClick={handleReset}
            disabled={isResetting}
            title="대화 및 상태 초기화"
            type="button"
            className="flex items-center gap-1.5 rounded-md border border-[#262626] bg-transparent px-2.5 py-1.5 font-mono text-[11px] text-[#ececec] transition-colors hover:bg-[#262626] disabled:opacity-40"
          >
            <RotateCcw className={`h-3 w-3 ${isResetting ? 'animate-spin' : ''}`} />
            <span>초기화</span>
          </button>
        </header>

        {/* Main Conversation Area */}
        <main className="relative flex flex-1 flex-col overflow-hidden">
          <div className="content-shell mx-auto flex h-full w-full max-w-[768px] flex-1 flex-col px-4 pt-6 pb-2">
            {errorMessage && (
              <div className="mb-4 rounded-lg border border-[#3f1d1d] bg-[#1f1010] px-4 py-2.5 text-xs text-[#fca5a5]">
                {errorMessage}
              </div>
            )}

            {/* Content Body: Empty State vs Message Stream */}
            {messages.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-1 flex-col overflow-y-auto pr-1">
                {messages.map((message) => (
                  <MessageItem key={message.id} message={message} />
                ))}

                {isLoading && (
                  <div className="flex items-center space-x-2 py-4 text-xs text-[#8e8e8e]">
                    <div className="flex space-x-1">
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8e8e8e] [animation-delay:-0.3s]" />
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8e8e8e] [animation-delay:-0.15s]" />
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8e8e8e]" />
                    </div>
                    <span className="font-mono text-[11px]">AION 2 OPTIMIZING...</span>
                  </div>
                )}

                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}

            {/* Composer wrapper aligned with design */}
            <div className="composer-wrapper mt-auto">
              <MessageComposer
                input={input}
                setInput={setInput}
                onSend={() => handleSend()}
                isLoading={isLoading}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

