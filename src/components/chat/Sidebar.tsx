"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useLocale } from "@/hooks/useLocale";
import UserAvatar from "@/components/UserAvatar";

interface ChatSession {
  id: string;
  title: string | null;
  isPinned: boolean | null;
  updatedAt: string | null;
  modelProvider: string | null;
}

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onDeleteSession: (id: string) => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
  user?: { name?: string | null; image?: string | null; avatarSource?: string | null; avatarStyle?: string | null; avatarSeed?: string | null };
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSettings?: () => void;
  onOpenAllChats?: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onRenameSession,
  onDeleteSession,
  onTogglePin,
  user,
  isCollapsed,
  onToggleCollapse,
  onOpenSettings,
  onOpenAllChats,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useLocale();

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const startRename = (session: ChatSession) => {
    setRenamingId(session.id);
    setRenameValue(session.title || "");
    setMenuOpenId(null);
  };

  const submitRename = (id: string) => {
    if (renameValue.trim()) {
      onRenameSession(id, renameValue.trim());
    }
    setRenamingId(null);
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return "";
    const date = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0)
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  /* ── Collapse Toggle Icon ───────────────────────────────── */
  const CollapseIcon = ({ collapsed }: { collapsed: boolean }) => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <polyline points="14 8 11 12 14 16" />
    </svg>
  );

  /* ── EXPANDED sidebar content ───────────────────────────── */
  const expandedContent = (
    <div className="flex flex-col h-full bg-surface border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-lg font-bold text-text-primary tracking-tight">
            Vonssy<span className="text-accent">AI</span>
          </h1>
          <div className="flex items-center gap-1">
            {/* Desktop collapse */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-raised rounded-md transition-colors"
              aria-label={t("sidebar.collapse")}
            >
              <CollapseIcon collapsed={false} />
            </button>
            {/* Mobile close */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="md:hidden p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-raised rounded-md transition-colors"
              aria-label={t("sidebar.close")}
            >
              ✕
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onNewChat}
          className="btn-primary w-full justify-center text-sm"
        >
          + {t("sidebar.newChat")}
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 && (
          <p className="text-center text-text-secondary text-sm p-4">
            {t("sidebar.noConversations")}
          </p>
        )}

        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group relative flex flex-col gap-1 px-3 py-2 rounded-[10px] cursor-pointer transition-colors duration-150 ${
              activeSessionId === session.id
                ? "bg-surface-raised border-l-2 border-accent rounded-l-sm"
                : "hover:bg-surface-raised border-l-2 border-transparent"
            }`}
          >
            {renamingId === session.id ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitRename(session.id);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                onBlur={() => submitRename(session.id)}
                className="input-base text-sm py-1 px-2"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => onSelectSession(session.id)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-1.5">
                  {session.isPinned && (
                    <span className="text-accent text-xs" title={t("sidebar.pinned")}>★</span>
                  )}
                  <span
                    className={`text-[13px] font-medium truncate flex-1 ${
                      activeSessionId === session.id ? "text-text-primary" : "text-text-primary/90"
                    }`}
                  >
                    {session.title || t("sidebar.newChat")}
                  </span>
                </div>
                <span className="text-xs text-text-secondary mt-0.5 block">
                  {formatTimestamp(session.updatedAt)}
                </span>
              </button>
            )}

            {/* Kebab menu */}
            {renamingId !== session.id && (
              <div className="absolute right-2 top-2" ref={menuOpenId === session.id ? menuRef : null}>
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
                    <button type="button" onClick={() => startRename(session)} className="w-full text-left px-3 py-2.5 text-xs font-medium text-text-primary hover:bg-surface-raised transition-colors flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      {t("sidebar.rename")}
                    </button>
                    <button
                      type="button"
                      onClick={() => { onTogglePin(session.id, !session.isPinned); setMenuOpenId(null); }}
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
                      onClick={() => { onDeleteSession(session.id); setMenuOpenId(null); }}
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
            )}
          </div>
        ))}
      </div>

      {/* "All chats" entry point */}
      <div className="px-2 pb-1">
        <button
          type="button"
          onClick={onOpenAllChats}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            <path d="M8 12h.01" />
            <path d="M12 12h.01" />
            <path d="M16 12h.01" />
          </svg>
          {t("sidebar.allChats")}
        </button>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-3">
        {user && (
          <div className="flex items-center gap-2">
            {user.image || user.avatarSource === "generated" ? (
              <UserAvatar user={user} size={32} />
            ) : (
              <div className="w-8 h-8 rounded-full border border-border bg-surface-raised flex items-center justify-center text-xs font-medium text-text-secondary">
                {user.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary truncate">{user.name || "User"}</div>
            </div>
            <button type="button" onClick={onOpenSettings} className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-raised rounded-md transition-colors" aria-label={t("settings.title")} title={t("settings.title")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <button type="button" onClick={() => signOut()} className="p-1.5 text-text-secondary hover:text-danger hover:bg-surface-raised rounded-md transition-colors" aria-label={t("profile.signOut")} title={t("profile.signOut")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  /* ── COLLAPSED rail content (desktop only) ──────────────── */
  const collapsedContent = (
    <div className="flex flex-col items-center h-full bg-surface border-r border-border py-3 gap-2">
      {/* Expand toggle */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-raised rounded-md transition-colors"
        aria-label={t("sidebar.expand")}
      >
        <CollapseIcon collapsed={true} />
      </button>

      {/* New Chat icon-only */}
      <button
        type="button"
        onClick={onNewChat}
        className="flex items-center justify-center w-10 h-10 mt-1 mb-1 rounded-lg bg-accent text-accent-contrast hover:opacity-90 transition-opacity"
        aria-label={t("sidebar.newChat")}
        title={t("sidebar.newChat")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* All Chats icon-only */}
      <button
        type="button"
        onClick={onOpenAllChats}
        className="flex items-center justify-center w-8 h-8 text-text-secondary hover:text-text-primary hover:bg-surface-raised rounded-lg transition-colors"
        aria-label={t("sidebar.allChats")}
        title={t("sidebar.allChats")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          <path d="M8 12h.01" />
          <path d="M12 12h.01" />
          <path d="M16 12h.01" />
        </svg>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer icons */}
      {user && (
        <div className="flex flex-col items-center gap-2 pb-1">
          <button type="button" onClick={onOpenSettings} className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-raised rounded-md transition-colors" aria-label="Settings" title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button type="button" onClick={() => signOut()} className="p-2 text-text-secondary hover:text-danger hover:bg-surface-raised rounded-md transition-colors" aria-label="Sign out" title="Sign Out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
          {user.image || user.avatarSource === "generated" ? (
            <UserAvatar user={user} size={32} />
          ) : (
            <div className="w-8 h-8 rounded-full border border-border bg-surface-raised flex items-center justify-center text-xs font-medium text-text-secondary">
              {user.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 btn-secondary px-2 py-1.5"
        aria-label={t("sidebar.open")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Desktop sidebar — expanded or collapsed */}
      <aside
        className="hidden md:block shrink-0 h-dvh transition-[width] duration-200 ease-out overflow-hidden"
        style={{ width: isCollapsed ? 64 : 280 }}
      >
        {isCollapsed ? collapsedContent : expandedContent}
      </aside>

      {/* Mobile overlay sidebar (always expanded mode) */}
      {isOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[6px] z-40 animate-modal-overlay-enter"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <aside className="md:hidden fixed inset-y-0 left-0 w-[280px] z-50 shadow-[0_8px_32px_rgba(0,0,0,0.16)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-modal-enter">
            {expandedContent}
          </aside>
        </>
      )}
    </>
  );
}
