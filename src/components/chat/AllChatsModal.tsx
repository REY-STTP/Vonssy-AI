"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAllChats } from "@/hooks/useAllChats";
import { useLocale } from "@/hooks/useLocale";

interface AllChatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (id: string) => void;
}

export default function AllChatsModal({
  isOpen,
  onClose,
  onSelectSession,
}: AllChatsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const { t } = useLocale();

  const {
    sessions,
    isLoading,
    hasMore,
    search,
    filter,
    setSearch,
    setFilter,
    loadMore,
    reset,
  } = useAllChats();

  // Focus trap & restore focus
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      reset();
      setTimeout(() => modalRef.current?.focus(), 50);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen, reset]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!isOpen || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isOpen, loadMore, sessions.length]);

  // Click outside to close
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: sessions.length + (hasMore ? 1 : 0), // +1 for sentinel/loading row
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 56,
    overscan: 5,
  });

  // Format relative timestamp
  const formatRelativeTime = (ts: string | null) => {
    if (!ts) return "";
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-[100] bg-black/40 dark:bg-black/60 backdrop-blur-[6px] animate-modal-overlay-enter"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div
        className="fixed inset-0 z-[101] flex items-end md:items-center justify-center md:p-4"
        onClick={handleOverlayClick}
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("allChats.title")}
          tabIndex={-1}
          className="bg-surface border-t md:border border-border rounded-t-2xl md:rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.16)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full md:max-w-[760px] h-[85vh] md:h-[min(720px,85vh)] flex flex-col overflow-hidden animate-modal-enter focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <h2 className="text-xl font-semibold text-text-primary">{t("allChats.title")}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -mr-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-raised rounded-md transition-colors"
              aria-label={t("allChats.close")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Search + Filter bar */}
          <div className="flex items-center gap-2 px-6 py-3 border-b border-border shrink-0">
            {/* Search input */}
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("allChats.search")}
                className="w-full bg-surface-raised border border-border rounded-[10px] pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>

            {/* Filter dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary bg-surface-raised border border-border rounded-[10px] transition-colors whitespace-nowrap"
              >
                {filter === "all" ? t("allChats.filterAll") : t("allChats.filterPinned")}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-10 z-50 bg-surface border border-border rounded-lg shadow-soft min-w-[120px] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setFilter("all"); setFilterOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors ${filter === "all" ? "text-accent bg-accent/5" : "text-text-primary hover:bg-surface-raised"}`}
                  >
                    {t("allChats.filterAll")}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFilter("pinned"); setFilterOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors border-t border-border ${filter === "pinned" ? "text-accent bg-accent/5" : "text-text-primary hover:bg-surface-raised"}`}
                  >
                    {t("allChats.filterPinned")}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Session list (virtualized) */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {sessions.length === 0 && !isLoading ? (
              <div className="flex items-center justify-center h-full text-text-secondary text-sm">
                {t("allChats.noResults")}
                {search.trim() && (
                  <span className="ml-1 text-text-primary font-medium">&ldquo;{search.trim()}&rdquo;</span>
                )}
              </div>
            ) : (
              <div
                style={{ height: virtualizer.getTotalSize(), width: "100%", position: "relative" }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const isLast = virtualRow.index === sessions.length; // sentinel row

                  if (isLast) {
                    return (
                      <div
                        key="sentinel"
                        ref={sentinelRef}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: virtualRow.size,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        className="flex items-center justify-center"
                      >
                        {isLoading && (
                          <svg className="animate-spin text-text-secondary" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                        )}
                      </div>
                    );
                  }

                  const session = sessions[virtualRow.index];
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => {
                        onSelectSession(session.id);
                        onClose();
                      }}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: virtualRow.size,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="flex items-center justify-between px-6 py-3 text-left hover:bg-surface-raised transition-colors border-b border-border/50"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {session.isPinned && (
                          <span className="text-accent text-xs shrink-0" title="Pinned">★</span>
                        )}
                        <span className="text-sm font-medium text-text-primary truncate">
                          {session.title || "New Chat"}
                        </span>
                      </div>
                      <span className="text-[13px] text-text-secondary shrink-0 ml-4">
                        {formatRelativeTime(session.updatedAt)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
