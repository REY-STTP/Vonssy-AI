"use client";

import { useState, useCallback, useEffect } from "react";
import { SIDEBAR_RECENT_SESSIONS_LIMIT } from "@/lib/constants";

interface ChatSession {
  id: string;
  title: string | null;
  isPinned: boolean | null;
  updatedAt: string | null;
  modelProvider: string | null;
}

// Module-level cache: /chat/[id] navigation remounts ChatClient on every
// session switch, and without this each mount refetches the list. Mutations
// below keep the cache in sync; explicit refreshSessions() still hits the
// network. (Cleared on full page load, e.g. sign-out redirect.)
let sessionsCache: ChatSession[] | null = null;
// Dedupes concurrent mounts (StrictMode dev double-mount included): the
// second mount awaits the same promise instead of firing a duplicate fetch.
let sessionsInflight: Promise<ChatSession[]> | null = null;

async function loadSessionsFromNetwork(): Promise<ChatSession[]> {
  const res = await fetch(`/api/sessions?limit=${SIDEBAR_RECENT_SESSIONS_LIMIT}`);
  if (!res.ok) throw new Error("Failed to load sessions.");
  const data = await res.json();
  sessionsCache = data.sessions ?? [];
  return sessionsCache ?? [];
}

export function useSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch recent sessions for the sidebar (capped + pinned always included).
   * Explicit refreshes always hit the network and renew the cache.
   */
  const fetchSessions = useCallback(async () => {
    try {
      if (!sessionsInflight) {
        sessionsInflight = loadSessionsFromNetwork().finally(() => {
          sessionsInflight = null;
        });
      }
      setSessions(await sessionsInflight);
    } catch {
      // Silently fail (keep stale cache if any)
      if (sessionsCache) setSessions(sessionsCache);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load: serve the module cache instantly when a previous mount
  // already fetched (session-switch remounts), skipping the network.
  useEffect(() => {
    if (sessionsCache) {
      setSessions(sessionsCache);
      setIsLoading(false);
      return;
    }
    fetchSessions();
  }, [fetchSessions]);

  /**
   * Create a new chat session.
   */
  const createSession = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) return null;
      const data = await res.json();
      // Optimistic update: prepend new session
      setSessions((prev) => {
        const next = [data.session, ...prev];
        sessionsCache = next;
        return next;
      });
      return data.session.id;
    } catch {
      return null;
    }
  }, []);

  /**
   * Rename a session.
   */
  const renameSession = useCallback(
    async (id: string, newTitle: string) => {
      // Optimistic update
      setSessions((prev) => {
        const next = prev.map((s) =>
          s.id === id ? { ...s, title: newTitle } : s
        );
        sessionsCache = next;
        return next;
      });

      try {
        const res = await fetch(`/api/sessions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });
        if (!res.ok) {
          // Rollback
          await fetchSessions();
        }
      } catch {
        await fetchSessions();
      }
    },
    [fetchSessions]
  );

  /**
   * Delete a session.
   * Optimistic removal; refetch only on failure (D6 — no double fetch).
   */
  const deleteSession = useCallback(
    async (id: string) => {
      // Optimistic removal
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        sessionsCache = next;
        return next;
      });

      try {
        const res = await fetch(`/api/sessions/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          // Revert on failure
          await fetchSessions();
        }
      } catch {
        await fetchSessions();
      }
    },
    [fetchSessions]
  );

  /**
   * Toggle pin on a session.
   */
  const togglePin = useCallback(
    async (id: string, isPinned: boolean) => {
      // Optimistic update
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === id ? { ...s, isPinned } : s
        );
        // Re-sort: pinned first, then by updatedAt
        const next = updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return (
            new Date(b.updatedAt || 0).getTime() -
            new Date(a.updatedAt || 0).getTime()
          );
        });
        sessionsCache = next;
        return next;
      });

      try {
        const res = await fetch(`/api/sessions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPinned }),
        });
        if (!res.ok) {
          await fetchSessions();
        }
      } catch {
        await fetchSessions();
      }
    },
    [fetchSessions]
  );

  /**
   * Add a session to the list (when auto-created during chat).
   */
  const addSession = useCallback(
    (session: ChatSession) => {
      setSessions((prev) => {
        // Avoid duplicates
        if (prev.some((s) => s.id === session.id)) return prev;
        const next = [session, ...prev];
        sessionsCache = next;
        return next;
      });
    },
    []
  );

  return {
    sessions,
    isLoading,
    createSession,
    renameSession,
    deleteSession,
    togglePin,
    addSession,
    refreshSessions: fetchSessions,
  };
}
