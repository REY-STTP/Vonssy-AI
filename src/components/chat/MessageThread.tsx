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
  truncationIndex?: number | null;
  streamingContent?: string;
  isStreaming?: boolean;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onRegenerateFrom?: (messageId: string) => void;
  displayName?: string | null;
}

export default function MessageThread({
  messages,
  truncationIndex,
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
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus edit textarea at end of text
  useEffect(() => {
    const el = editTextareaRef.current;
    if (el && editingId) {
      if (document.activeElement !== el) {
        el.focus();
        const length = el.value.length;
        el.setSelectionRange(length, length);
      }
    }
  }, [editContent, editingId]);

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

  const formatMessageTime = (ts?: string | null) => {
    if (!ts) return "";
    const date = new Date(ts);
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto relative px-4"
    >
      <div className="max-w-3xl mx-auto w-full pt-4 pb-6 space-y-[1.5rem]">

        {/* Messages */}
        {messages.map((msg, index) => {
          if (truncationIndex !== null && truncationIndex !== undefined && index > truncationIndex) {
            return null;
          }
          return (
            <div key={msg.id} className="group flex flex-col">
              {editingId === msg.id ? (
              <div className="self-end max-w-[85%] flex flex-col items-end gap-1">
                <div className="flex min-w-0 flex-col items-end gap-1 ms-auto max-w-full">
                  {/* Edit bubble — same visual wrapper as the regular message bubble */}
                  <div className="bg-surface-raised text-text-primary rounded-[12px] px-4 py-3 leading-relaxed max-w-full min-w-[3ch] shadow-[inset_0_0_0_1.5px_var(--color-accent)] transition-shadow duration-150">
                    <textarea
                      ref={editTextareaRef}
                      rows={1}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full block resize-none border-0 bg-transparent p-0 shadow-none outline-none text-[15px] text-text-primary leading-relaxed [field-sizing:content] max-h-[320px] overflow-y-auto whitespace-pre-wrap break-words font-reading"
                      style={{ scrollbarWidth: 'none' }}
                    />
                  </div>
                  {/* Action buttons — outside the bubble */}
                  <div className="flex items-center gap-2">
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
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : msg.role === "user" ? (
              // User message styling
              <div className="self-end max-w-[85%] flex flex-col items-end">
                <div className="bg-surface-raised text-text-primary rounded-[12px] px-4 py-3 leading-relaxed">
                  <div className="whitespace-pre-wrap text-[15px] font-reading">{msg.content}</div>
                </div>
                <div className="mt-1.5 mr-1 flex items-center gap-1">
                  {onRegenerateFrom && (
                    <button
                      type="button"
                      onClick={() => onRegenerateFrom(msg.id)}
                      className="text-text-secondary hover:text-text-primary p-1.5 rounded-md hover:bg-surface-raised transition-colors flex items-center justify-center"
                      title="Regenerate response"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    </button>
                  )}
                  {onEditMessage && (
                    <button
                      type="button"
                      onClick={() => startEdit(msg)}
                      className="text-text-secondary hover:text-text-primary p-1.5 rounded-md hover:bg-surface-raised transition-colors flex items-center justify-center"
                      title="Edit prompt"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => copyMessage(msg.content, msg.id)}
                    className="text-text-secondary hover:text-text-primary p-1.5 rounded-md hover:bg-surface-raised transition-colors flex items-center justify-center"
                    title="Copy prompt"
                  >
                    {copiedId === msg.id ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              // Assistant message styling
              <div className="self-start w-full leading-relaxed relative font-reading">
                <MarkdownRenderer content={msg.content} />
                
                {/* Assistant Metadata Line & Actions */}
                <div className="flex flex-col gap-1 mt-2">
                  <div className="flex items-center gap-3 text-xs font-mono text-text-secondary">
                    {msg.provider && msg.model && (
                      <div className="flex items-center gap-1.5 select-none">
                        <span>◆</span>
                        <span>{msg.provider}/{msg.model}</span>
                      </div>
                    )}
                    {msg.createdAt && (
                      <span className="select-none text-[11px] opacity-80">
                        • {formatMessageTime(msg.createdAt)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => copyMessage(msg.content, msg.id)}
                      className="text-text-secondary hover:text-text-primary p-1.5 rounded-md hover:bg-surface-raised transition-colors flex items-center justify-center -ml-1.5"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          );
        })}

        {/* Streaming content */}
        {isStreaming && (
          <div className="self-start w-full leading-relaxed relative font-reading">
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
