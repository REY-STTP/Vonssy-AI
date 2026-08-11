"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAllChats } from "@/hooks/useAllChats";
import { useLocale } from "@/hooks/useLocale";

interface AllChatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (id: string, title: string | null, isPinned: boolean | null) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
}

export default function AllChatsModal({
  isOpen,
  onClose,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onTogglePin,
}: AllChatsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
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
    removeSession,
    updateSessionTitle,
    togglePinSession,
  } = useAllChats();

  // Focus trap & restore focus
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      reset();
      setTimeout(() => modalRef.current?.focus(), 50);
    } else {
      previousFocusRef.current?.focus();
      setRenamingId(null);
    }
  }, [isOpen, reset]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (renamingId) {
          setRenamingId(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, renamingId]);

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
      // If the target is no longer in the document (e.g. unmounted because we clicked delete/rename),
      // do not treat it as an outside click.
      if (!document.body.contains(e.target as Node)) {
        return;
      }
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  // ── Row actions ──────────────────────────────────────────

  const handleStartRename = useCallback((session: { id: string; title: string | null }) => {
    setRenamingId(session.id);
    setRenameValue(session.title || "");
  }, []);

  const handleSubmitRename = useCallback(
    (id: string) => {
      const trimmed = renameValue.trim();
      if (trimmed && trimmed !== sessions.find((s) => s.id === id)?.title) {
        updateSessionTitle(id, trimmed);
        onRenameSession(id, trimmed);
      }
      setRenamingId(null);
    },
    [renameValue, sessions, updateSessionTitle, onRenameSession]
  );

  const handleTogglePin = useCallback(
    (id: string, currentlyPinned: boolean | null) => {
      const newPinState = !currentlyPinned;
      togglePinSession(id, newPinState);
      onTogglePin(id, newPinState);
    },
    [togglePinSession, onTogglePin]
  );

  const handleDelete = useCallback(
    (id: string) => {
      // Optimistic removal from All Chats local state
      removeSession(id);
      // Delegate to parent (ChatClient) for API call + sidebar refetch
      onDeleteSession(id);
    },
    [removeSession, onDeleteSession]
  );

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: sessions.length + (hasMore ? 1 : 0),
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
                  const isRenaming = renamingId === session.id;

                  return (
                    <div
                      key={virtualRow.key}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: virtualRow.size,
                        transform: `translateY(${virtualRow.start}px)`,
                        zIndex: menuOpenId === session.id ? 10 : 1,
                      }}
                      className="group flex items-center px-6 py-3 border-b border-border hover:bg-surface-raised transition-colors"
                    >
                      {isRenaming ? (
                        /* ── Inline rename input ── */
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSubmitRename(session.id);
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          onBlur={() => handleSubmitRename(session.id)}
                          className="flex-1 bg-surface-raised border border-border rounded-md px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        /* ── Normal row: click-to-open ── */
                        <button
                          type="button"
                          onClick={() => {
                            onSelectSession(session.id, session.title, session.isPinned);
                            onClose();
                          }}
                          className="flex items-center gap-2 min-w-0 flex-1 text-left"
                        >
                          {session.isPinned && (
                            <span className="text-accent text-xs shrink-0" title="Pinned">★</span>
                          )}
                          <span className="text-sm font-medium text-text-primary truncate">
                            {session.title || "New Chat"}
                          </span>
                        </button>
                      )}

                      {/* Right side: timestamp + kebab menu */}
                      {!isRenaming && (
                        <div className="flex items-center gap-1 shrink-0 ml-4">
                          <span className="text-[13px] text-text-secondary mr-1">
                            {formatRelativeTime(session.updatedAt)}
                          </span>

                          {/* Kebab menu (⋯) */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(menuOpenId === session.id ? null : session.id);
                              }}
                              className="text-text-secondary hover:text-text-primary px-1 py-0.5 text-sm transition-colors"
                              aria-label={t("sidebar.options")}
                            >
                              ⋯
                            </button>

                            {menuOpenId === session.id && (
                              <div className="absolute right-0 top-6 z-50 bg-surface border border-border rounded-lg shadow-soft min-w-[160px] overflow-hidden">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleStartRename(session); setMenuOpenId(null); }}
                                  className="w-full text-left px-3 py-2.5 text-xs font-medium text-text-primary hover:bg-surface-raised transition-colors flex items-center gap-2"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                  {t("sidebar.rename")}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleTogglePin(session.id, session.isPinned); setMenuOpenId(null); }}
                                  className="w-full text-left px-3 py-2.5 text-xs font-medium text-text-primary hover:bg-surface-raised transition-colors flex items-center gap-2"
                                >
                                  {session.isPinned ? (
                                    <>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                      </svg>
                                      {t("sidebar.unpin")}
                                    </>
                                  ) : (
                                    <>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                      </svg>
                                      {t("sidebar.pin")}
                                    </>
                                  )}
                                </button>
                                <div className="border-t border-border" />
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(session.id); setMenuOpenId(null); }}
                                  className="w-full text-left px-3 py-2.5 text-xs font-medium text-danger hover:bg-surface-raised transition-colors flex items-center gap-2"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                  {t("sidebar.delete")}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
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
