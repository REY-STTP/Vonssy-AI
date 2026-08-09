"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  provider?: string | null;
  model?: string | null;
  createdAt?: string | null;
}

interface MessageThreadProps {
  messages: Message[];
  streamingContent?: string;
  isStreaming?: boolean;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onRegenerateFrom?: (messageId: string) => void;
  displayName?: string | null;
}

export default function MessageThread({
  messages,
  streamingContent,
  isStreaming,
  onEditMessage,
  onRegenerateFrom,
  displayName,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-scroll on new content
  useEffect(() => {
    if (!showScrollButton) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent, showScrollButton]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 100;
    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setShowScrollButton(!isNearBottom);
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollButton(false);
  };

  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const submitEdit = (messageId: string) => {
    if (onEditMessage && editContent.trim()) {
      onEditMessage(messageId, editContent.trim());
    }
    setEditingId(null);
    setEditContent("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const copyMessage = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto relative px-4"
    >
      <div className="max-w-3xl mx-auto w-full py-6 space-y-[1.5rem]">
        {/* Empty state */}
        {messages.length === 0 && !streamingContent && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-fade-in">
            <h2 className="font-body font-medium text-2xl text-text-primary mb-2">
              {displayName ? `Hi ${displayName}, how can I help you today?` : "How can I help you today?"}
            </h2>
            <p className="text-text-secondary text-base font-body max-w-md mt-2">
              Select a model using the sigils below, then type your message.
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <div key={msg.id} className="group flex flex-col">
            {editingId === msg.id ? (
              <div className="space-y-2 w-full ml-auto max-w-2xl bg-surface-raised p-4 rounded-xl">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="input-base resize-none min-h-[100px] p-3 text-[15px]"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="btn-ghost text-xs px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => submitEdit(msg.id)}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    Save & Regenerate
                  </button>
                </div>
              </div>
            ) : msg.role === "user" ? (
              // User message styling
              <div className="self-end max-w-[85%] bg-surface-raised text-text-primary rounded-[12px] px-4 py-3 leading-relaxed">
                <div className="whitespace-pre-wrap text-[15px]">{msg.content}</div>
                <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onEditMessage && (
                    <button
                      type="button"
                      onClick={() => startEdit(msg)}
                      className="text-text-secondary hover:text-text-primary p-1 rounded-md hover:bg-border transition-colors"
                      title="Edit message"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              // Assistant message styling
              <div className="self-start w-full leading-relaxed relative">
                <MarkdownRenderer content={msg.content} />
                
                {/* Assistant Metadata Line & Actions */}
                <div className="flex items-center gap-3 mt-2 text-xs font-mono text-text-secondary">
                  {msg.provider && msg.model && (
                    <div className="flex items-center gap-1.5 select-none">
                      <span>◆</span>
                      <span>{msg.provider}/{msg.model}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                    <button
                      type="button"
                      onClick={() => copyMessage(msg.content, msg.id)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-surface-raised hover:text-text-primary transition-colors"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          Copied
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                          Copy
                        </>
                      )}
                    </button>
                    {onRegenerateFrom && (
                      <button
                        type="button"
                        onClick={() => onRegenerateFrom(msg.id)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-surface-raised hover:text-text-primary transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                        Regenerate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Streaming content */}
        {isStreaming && (
          <div className="self-start w-full leading-relaxed relative">
            {streamingContent ? (
              <div>
                <MarkdownRenderer content={streamingContent} />
                <span className="inline-block w-2.5 h-2.5 ml-1 rounded-full bg-accent animate-pulse align-baseline" />
              </div>
            ) : (
              <div className="flex items-center h-6">
                <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="fixed bottom-24 right-8 flex items-center justify-center w-10 h-10 rounded-full bg-surface-raised border border-border shadow-md text-text-secondary hover:text-text-primary transition-colors z-50"
          aria-label="Scroll to bottom"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
