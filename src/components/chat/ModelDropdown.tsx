"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import type { UserModelConfig } from "@/hooks/useUserModels";
import { useLocale } from "@/hooks/useLocale";

interface ModelDropdownProps {
  models: UserModelConfig[];
  selected: UserModelConfig | null;
  onSelect: (id: string) => void;
  isStreaming?: boolean;
  isLoading?: boolean;
  onManageClick?: () => void;
}

function hostOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

function InitialDot({ label, size = 18 }: { label: string; size?: number }) {
  const ch = (label.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      className="flex items-center justify-center rounded-full bg-surface-raised border border-border font-semibold text-text-secondary shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden="true"
    >
      {ch}
    </span>
  );
}

export default function ModelDropdown({
  models,
  selected,
  onSelect,
  isStreaming = false,
  isLoading = false,
  onManageClick,
}: ModelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { t } = useLocale();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // G2: APG listbox keyboard — arrows/Home/End move between options.
  const focusOption = useCallback((index: number) => {
    const options = dropdownRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
    if (!options || options.length === 0) return;
    const clamped = Math.max(0, Math.min(index, options.length - 1));
    options[clamped].focus();
  }, []);

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    const options = dropdownRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
    if (!options || options.length === 0) return;
    const current = Array.from(options).indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusOption(current < 0 ? 0 : current + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusOption(current < 0 ? options.length - 1 : current - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusOption(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusOption(options.length - 1);
    }
  };

  const grouped = useMemo(() => {
    const acc: Record<string, UserModelConfig[]> = {};
    for (const m of models) {
      const h = hostOf(m.baseUrl);
      if (!acc[h]) acc[h] = [];
      acc[h].push(m);
    }
    return acc;
  }, [models]);

  const disabled = isStreaming || isLoading || models.length === 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isStreaming || isLoading}
        className={`flex items-center gap-1 p-1.5 rounded-md text-text-secondary hover:bg-surface-raised hover:text-text-primary transition-colors ${
          isStreaming || isLoading ? "opacity-50 cursor-not-allowed" : ""
        } ${isOpen ? "bg-surface-raised text-text-primary" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t("model.select")}
        title={selected ? `${selected.label} — ${selected.model}` : t("model.select")}
      >
        {selected ? (
          <InitialDot label={selected.label} size={20} />
        ) : (
          <span className="w-5 h-5 rounded-full bg-surface-raised border border-dashed border-border" />
        )}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={t("model.select")}
          onKeyDown={handleListKeyDown}
          className="absolute bottom-full left-0 mb-5 w-72 max-h-64 overflow-y-auto bg-surface border border-border rounded-xl shadow-dropdown p-2 animate-dropdown-enter z-50"
        >
          {isLoading ? (
            <div className="px-3 py-4 text-[13px] text-text-secondary">{t("models.loading")}</div>
          ) : models.length === 0 ? (
            <div className="px-3 py-4 space-y-2">
              <p className="text-[13px] text-text-secondary">{t("models.empty")}</p>
              {onManageClick && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onManageClick();
                  }}
                  className="btn-primary text-[13px] px-3 py-1.5 w-full justify-center"
                >
                  {t("models.addFirst")}
                </button>
              )}
            </div>
          ) : (
            Object.entries(grouped).map(([host, entries]) => (
              <div key={host} className="mb-2 last:mb-0">
                <div className="px-2 py-1 mb-1 text-[11px] font-bold tracking-wider text-text-secondary uppercase truncate" title={host}>
                  {host}
                </div>
                <div className="space-y-1">
                  {entries.map((entry) => {
                    const isActive = selected?.id === entry.id;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => {
                          onSelect(entry.id);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors text-left ${
                          isActive ? "bg-surface-raised" : "hover:bg-surface-raised"
                        }`}
                        title={`${entry.label} — ${entry.model}`}
                      >
                        <div className="shrink-0">
                          <InitialDot label={entry.label} size={18} />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col">
                          <span className="text-[13px] font-medium text-text-primary truncate leading-tight">
                            {entry.label}
                          </span>
                          <span className="text-[11px] text-text-secondary truncate font-mono">
                            {entry.model}
                          </span>
                        </div>
                        {isActive && (
                          <div className="shrink-0 text-accent">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          {models.length > 0 && onManageClick && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onManageClick();
              }}
              className="w-full mt-2 px-2 py-2 text-[13px] font-medium text-text-secondary hover:text-accent hover:bg-surface-raised rounded-lg transition-colors text-left flex items-center gap-2"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              {t("models.manage")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
