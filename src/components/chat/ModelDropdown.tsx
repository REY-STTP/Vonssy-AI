"use client";

import { useState, useRef, useEffect } from "react";
import { MODEL_CATALOG, ModelCatalogEntry } from "@/lib/ai-providers";
import { SIGIL_COMPONENTS } from "./SigilIcons";

interface ModelDropdownProps {
  selected: ModelCatalogEntry;
  onSelect: (entry: ModelCatalogEntry) => void;
  isStreaming?: boolean;
}

export default function ModelDropdown({
  selected,
  onSelect,
  isStreaming = false,
}: ModelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const SelectedSigil = SIGIL_COMPONENTS[selected.sigil];

  // Group models by gateway
  const groupedModels = MODEL_CATALOG.reduce((acc, entry) => {
    if (!acc[entry.gateway]) {
      acc[entry.gateway] = [];
    }
    acc[entry.gateway].push(entry);
    return acc;
  }, {} as Record<string, ModelCatalogEntry[]>);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isStreaming}
        className={`flex items-center gap-1 p-1.5 rounded-md text-text-secondary hover:bg-surface-raised hover:text-text-primary transition-colors ${
          isStreaming ? "opacity-50 cursor-not-allowed" : ""
        } ${isOpen ? "bg-surface-raised text-text-primary" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select model"
        title={selected.label}
      >
        <SelectedSigil size={20} className={isOpen ? "text-accent" : ""} />
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-5 w-64 max-h-80 overflow-y-auto bg-surface border border-border rounded-xl shadow-dropdown p-2 animate-dropdown-enter z-50">
          {Object.entries(groupedModels).map(([gateway, entries]) => (
            <div key={gateway} className="mb-2 last:mb-0">
              <div className="px-2 py-1 mb-1 text-[11px] font-bold tracking-wider text-text-secondary uppercase">
                {gateway}
              </div>
              <div className="space-y-1">
                {entries.map((entry) => {
                  const EntrySigil = SIGIL_COMPONENTS[entry.sigil];
                  const isActive = entry.model === selected.model && entry.gateway === selected.gateway;

                  return (
                    <button
                      key={entry.model}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        onSelect(entry);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors text-left ${
                        isActive
                          ? "bg-surface-raised"
                          : "hover:bg-surface-raised"
                      }`}
                    >
                      <div className="shrink-0 text-text-secondary">
                        <EntrySigil size={18} className={isActive ? "text-accent" : ""} />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <span className="text-[13px] font-medium text-text-primary truncate leading-tight">
                          {entry.label}
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
          ))}
        </div>
      )}
    </div>
  );
}
