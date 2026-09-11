"use client";

import { useState, useRef, useEffect, memo, KeyboardEvent } from "react";
import ModelDropdown from "./ModelDropdown";
import type { UserModelConfig } from "@/hooks/useUserModels";
import { useLocale } from "@/hooks/useLocale";

interface ComposerProps {
  models: UserModelConfig[];
  selectedModel: UserModelConfig | null;
  onModelSelect: (id: string) => void;
  onSend: (content: string, options?: { reasoningEffort?: "low" | "medium" | "high" }) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  isModelsLoading?: boolean;
  onManageModels?: () => void;
  reasoningEffort?: "low" | "medium" | "high";
  onReasoningChange?: (effort: "low" | "medium" | "high") => void;
}

function Composer({
  models,
  selectedModel,
  onModelSelect,
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  isModelsLoading = false,
  onManageModels,
  reasoningEffort,
  onReasoningChange,
}: ComposerProps) {
  const [content, setContent] = useState("");
  const [showReasoningMenu, setShowReasoningMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reasoningMenuRef = useRef<HTMLDivElement>(null);
  const reasoningTriggerRef = useRef<HTMLButtonElement>(null);
  const { t } = useLocale();

  useEffect(() => {
    const adjustHeight = () => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = "0px";
        const scrollHeight = el.scrollHeight;
        el.style.height = `${Math.max(32, Math.min(scrollHeight, 200))}px`;
      }
    };

    adjustHeight();

    window.addEventListener("resize", adjustHeight);
    return () => window.removeEventListener("resize", adjustHeight);
  }, [content]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reasoningMenuRef.current && !reasoningMenuRef.current.contains(e.target as Node)) {
        setShowReasoningMenu(false);
      }
    };
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowReasoningMenu(false);
        reasoningTriggerRef.current?.focus();
      }
    };
    if (showReasoningMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showReasoningMenu]);

  const noModel = !selectedModel;
  const sendDisabled = !content.trim() || disabled || isStreaming || noModel;

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || disabled || noModel) return;
    onSend(trimmed, { reasoningEffort });
    setContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "32px";
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
        <div className="flex items-center gap-2 bg-surface border border-border rounded-[16px] shadow-soft p-2 transition-all focus-within:ring-2 focus-within:ring-accent focus-within:border-accent">

          <div className="shrink-0 z-20">
            <ModelDropdown
              models={models}
              selected={selectedModel}
              onSelect={onModelSelect}
              isStreaming={isStreaming}
              isLoading={isModelsLoading}
              onManageClick={onManageModels}
            />
          </div>

          <div className="flex-1 mt-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={noModel ? t("models.needModel") : t("composer.placeholder")}
              disabled={disabled || isStreaming || noModel}
              rows={1}
              aria-keyshortcuts="Enter"
              className="w-full bg-transparent text-text-primary placeholder:text-text-secondary text-[15px] resize-none focus:outline-none min-h-[32px] max-h-[200px] leading-relaxed py-[4px] overflow-y-auto"
              style={{ scrollbarWidth: 'none' }}
              aria-label={t("composer.inputLabel")}
            />
          </div>

          <div className="shrink-0 ml-2 flex items-center gap-2 mr-1.5">
            <div className="relative" ref={reasoningMenuRef}>
              <button
                type="button"
                ref={reasoningTriggerRef}
                disabled={isStreaming}
                onClick={() => setShowReasoningMenu((p) => !p)}
                className={`flex items-center justify-center p-1.5 rounded-md text-text-secondary hover:bg-surface-raised hover:text-text-primary transition-colors ${
                  isStreaming ? "opacity-50 cursor-not-allowed" : ""
                } ${showReasoningMenu ? "bg-surface-raised text-text-primary" : ""}`}
                title={t("composer.reasoningLabel")}
                aria-label={t("composer.reasoningLabel")}
                aria-haspopup="menu"
                aria-expanded={showReasoningMenu}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
                  <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
                </svg>
                {reasoningEffort && (
                  <span className="ml-1 text-[10px] uppercase font-bold tracking-wider hidden sm:block">
                    {reasoningEffort.charAt(0)}
                  </span>
                )}
              </button>
              {showReasoningMenu && (
                <div
                  role="menu"
                  aria-label={t("composer.reasoningLabel")}
                  className="absolute bottom-full right-0 mb-5 w-32 bg-surface border border-border rounded-lg shadow-dropdown overflow-hidden animate-fade-in z-50"
                >
                  {(["low", "medium", "high"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      role="menuitemradio"
                      aria-checked={reasoningEffort === level}
                      onClick={() => {
                        onReasoningChange?.(level);
                        setShowReasoningMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        reasoningEffort === level
                          ? "bg-surface-raised text-accent font-medium"
                          : "text-text-primary hover:bg-surface-raised"
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-danger text-accent-contrast transition-opacity hover:opacity-90"
                aria-label={t("composer.stopLabel")}
              >
                <StopIcon />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={sendDisabled}
                className={`flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-contrast transition-opacity ${
                  sendDisabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 cursor-pointer"
                }`}
                aria-label={t("composer.sendLabel")}
              >
                <SendIcon />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(Composer);

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
