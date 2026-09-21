"use client";

import { useState, useRef, useEffect, memo, KeyboardEvent } from "react";
import ProviderDropdown from "./ProviderDropdown";
import type { UserProviderConfig } from "@/hooks/useProviders";
import type { ReasoningEffort } from "@/lib/ai-providers/types";
import { useLocale } from "@/hooks/useLocale";

interface ComposerProps {
  providers: UserProviderConfig[];
  selectedProvider: UserProviderConfig | null;
  selectedModel: string | null;
  onProviderSelect: (providerId: string, model: string) => void;
  onSend: (content: string, options?: { reasoningEffort?: ReasoningEffort }) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  isProvidersLoading?: boolean;
  onManageProviders?: () => void;
  reasoningEffort?: ReasoningEffort;
  onReasoningChange?: (effort: ReasoningEffort) => void;
}

function Composer({
  providers,
  selectedProvider,
  selectedModel,
  onProviderSelect,
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  isProvidersLoading = false,
  onManageProviders,
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
    // Re-run when provider readiness flips (loading → ready):
    // the initial height is measured while disabled with the
    // "loading" placeholder, and on narrow mobile widths
    // that measurement must not stick after the short placeholder arrives.
  }, [content, isProvidersLoading, selectedProvider, selectedModel]);

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

  // Without a provider the composer stays open for typing (always the
  // normal placeholder), but sending is disabled until one is selected.
  const noProvider = !isProvidersLoading && (!selectedProvider || !selectedModel);
  const sendDisabled = !content.trim() || disabled || isStreaming || noProvider || isProvidersLoading;
  const placeholder = t("composer.placeholder");

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || disabled || isStreaming || noProvider || isProvidersLoading) return;
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
        <div className="flex flex-col bg-surface border border-border rounded-[16px] shadow-soft p-2 transition-all focus-within:ring-2 focus-within:ring-accent focus-within:border-accent">

          {/* Row 1: textarea */}
          <div className="flex-1 mt-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isStreaming || isProvidersLoading}
              rows={1}
              aria-keyshortcuts="Enter"
              className="w-full bg-transparent text-text-primary placeholder:text-text-secondary text-[15px] resize-none focus:outline-none min-h-[32px] max-h-[200px] leading-relaxed py-[4px] px-1 overflow-y-auto"
              style={{ scrollbarWidth: 'none' }}
              aria-label={t("composer.inputLabel")}
            />
          </div>

          {/* Row 2: provider picker + reasoning + send */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="shrink-0 z-20 min-w-0">
            <ProviderDropdown
              providers={providers}
              selectedProvider={selectedProvider}
              selectedModel={selectedModel}
              onSelect={onProviderSelect}
                isStreaming={isStreaming}
                isLoading={isProvidersLoading}
                onManageClick={onManageProviders}
              />
            </div>

            <div className="flex items-center gap-1 shrink-0">
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
                  className="absolute bottom-full right-0 mb-2 w-32 bg-surface border border-border rounded-lg shadow-dropdown overflow-hidden animate-fade-in z-50"
                >
                  {(Object.entries({
                    low: "Low",
                    medium: "Medium",
                    high: "High",
                    xhigh: "XHigh",
                    none: "None",
                  }) as [ReasoningEffort, string][]).map(([level, label]) => (
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
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center justify-center p-1.5 rounded-md bg-danger text-accent-contrast transition-opacity hover:opacity-90"
                aria-label={t("composer.stopLabel")}
              >
                <StopIcon />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={sendDisabled}
                className={`flex items-center justify-center p-1.5 rounded-md bg-accent text-accent-contrast transition-opacity ${
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
    </div>
  );
}

export default memo(Composer);

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"></line>
      <polyline points="5 12 12 5 19 12"></polyline>
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    </svg>
  );
}
