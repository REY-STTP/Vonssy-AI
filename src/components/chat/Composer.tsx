"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import ModelDropdown from "./ModelDropdown";
import { ModelCatalogEntry } from "@/lib/ai-providers";

interface ComposerProps {
  selectedModel: ModelCatalogEntry;
  onModelSelect: (entry: ModelCatalogEntry) => void;
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  quota?: { remaining: number; limit: number };
}

export default function Composer({
  selectedModel,
  onModelSelect,
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  quota,
}: ComposerProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full px-4 pb-6 pt-2 bg-bg animate-fade-slide-in">
      <div className="flex flex-col max-w-3xl mx-auto gap-2">
        {/* Main composer box */}
        <div className="flex items-center gap-2 bg-surface border border-border rounded-[16px] shadow-soft p-2 transition-all">
          
          <div className="shrink-0 z-20">
            <ModelDropdown
              selected={selectedModel}
              onSelect={onModelSelect}
              isStreaming={isStreaming}
            />
          </div>

          <div className="flex-1 mt-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              disabled={disabled || isStreaming}
              rows={1}
              className="w-full bg-transparent text-text-primary placeholder:text-text-secondary text-[15px] resize-none focus:outline-none min-h-[32px] max-h-[200px] leading-relaxed py-[4px] overflow-y-auto"
              style={{ scrollbarWidth: 'none' }}
              aria-label="Message input"
            />
          </div>

          <div className="shrink-0 ml-1">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-danger text-accent-contrast transition-opacity hover:opacity-90"
                aria-label="Stop generating"
              >
                <StopIcon />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!content.trim() || disabled}
                className={`flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-contrast transition-opacity ${
                  !content.trim() || disabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 cursor-pointer"
                }`}
                aria-label="Send message"
              >
                <SendIcon />
              </button>
            )}
          </div>
        </div>

        {/* Quota display */}
        {quota && (
          <div className="px-1 text-center">
            <p className="text-[12px] font-body text-text-secondary">
              {quota.limit - quota.remaining} / {quota.limit} messages today
            </p>
            <div className="mt-1.5 mx-auto w-32 h-1 bg-surface-raised rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${quota.remaining <= 5 ? "bg-danger" : "bg-accent"}`}
                style={{ width: `${Math.max(0, 100 - (quota.remaining / quota.limit) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"></line>
      <polyline points="5 12 12 5 19 12"></polyline>
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    </svg>
  );
}
