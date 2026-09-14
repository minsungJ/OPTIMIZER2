import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.js';
import { EmptyState } from './components/EmptyState.js';
import { MessageItem } from './components/MessageItem.js';
import { MessageComposer } from './components/MessageComposer.js';
import { ChatMessage } from './types.js';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Ensure clean light mode as requested
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('aion2_theme');
  }, []);

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
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased font-sans">
      <Header onReset={handleReset} isResetting={isResetting} />

      {/* Main Conversation Container */}
      <main className="flex flex-1 flex-col mx-auto w-full max-w-3xl px-4 pt-4 pb-2">
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
            {errorMessage}
          </div>
        )}

        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-1 flex-col space-y-1">
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 py-4 text-xs text-slate-400 dark:text-slate-500">
                <div className="flex space-x-1">
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500 [animation-delay:-0.3s]" />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500 [animation-delay:-0.15s]" />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500" />
                </div>
                <span>AION 2 최적화 엔진 분석 중...</span>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </main>

      {/* Message Composer */}
      <MessageComposer
        input={input}
        setInput={setInput}
        onSend={() => handleSend()}
        isLoading={isLoading}
      />
    </div>
  );
}
