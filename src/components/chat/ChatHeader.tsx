"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ChatHeaderProps {
  sessionTitle: string | null;
  isPinned: boolean | null;
  onRename: (newTitle: string) => void;
  onTogglePin: () => void;
  onDelete: () => void;
  hasSession?: boolean;
}

export default function ChatHeader({
  sessionTitle,
  isPinned,
  onRename,
  onTogglePin,
  onDelete,
  hasSession = true,
}: ChatHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        menuBtnRef.current &&
        !menuBtnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const startRename = useCallback(() => {
    setRenameValue(sessionTitle || "");
    setIsRenaming(true);
    setMenuOpen(false);
  }, [sessionTitle]);

  const submitRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== sessionTitle) {
      onRename(trimmed);
    }
    setIsRenaming(false);
  }, [renameValue, sessionTitle, onRename]);

  const handleDelete = useCallback(() => {
    setMenuOpen(false);
    onDelete();
  }, [onDelete]);

  const handleTogglePin = useCallback(() => {
    setMenuOpen(false);
    onTogglePin();
  }, [onTogglePin]);

  return (
    <header
      className="sticky top-0 flex w-full items-center h-12 pl-[50px] pr-4 mt-1 md:px-4 lg:px-6 shrink-0"
      style={{ zIndex: 20 }}
    >
      {/* Gradient fade beneath header */}
      <div className="pointer-events-none absolute inset-0 -bottom-5 z-[-1] bg-gradient-to-b from-bg from-[calc(100%-1.25rem)] to-bg/0" />

      {hasSession && (
        <div className="flex min-w-0 items-center gap-1">
          {/* Title — clickable to rename */}
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename();
                if (e.key === "Escape") setIsRenaming(false);
              }}
              onBlur={submitRename}
              className="min-w-0 bg-transparent border-0 border-b border-border outline-none text-sm font-semibold text-text-primary py-1 px-1 focus:border-accent transition-colors"
              aria-label="Rename chat"
            />
          ) : (
            <button
              type="button"
              onClick={startRename}
              className="min-w-0 truncate text-sm font-semibold text-text-primary hover:bg-surface-raised rounded-md px-2 py-1 transition-colors cursor-text"
              title={sessionTitle || "New Chat"}
              aria-label={`${sessionTitle || "New Chat"}, rename chat`}
            >
              {sessionTitle || "New Chat"}
            </button>
          )}

          {/* Options dropdown trigger */}
          <button
            ref={menuBtnRef}
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
            aria-label="Chat options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
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
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div
              ref={menuRef}
              className="absolute top-11 left-4 lg:left-6 z-50 bg-surface border border-border rounded-lg shadow-soft min-w-[160px] overflow-hidden animate-fade-in"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                onClick={startRename}
                className="w-full text-left px-3 py-2.5 text-xs font-medium text-text-primary hover:bg-surface-raised transition-colors flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Rename
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleTogglePin}
                className="w-full text-left px-3 py-2.5 text-xs font-medium text-text-primary hover:bg-surface-raised transition-colors flex items-center gap-2"
              >
                {isPinned ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Unpin
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                    </svg>
                    Pin
                  </>
                )}
              </button>
              <div className="border-t border-border" />
              <button
                type="button"
                role="menuitem"
                onClick={handleDelete}
                className="w-full text-left px-3 py-2.5 text-xs font-medium text-danger hover:bg-surface-raised transition-colors flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
