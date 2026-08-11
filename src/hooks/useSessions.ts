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

export function useSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch recent sessions for the sidebar (capped + pinned always included).
   */
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions?limit=${SIDEBAR_RECENT_SESSIONS_LIMIT}`);
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
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
      setSessions((prev) => [data.session, ...prev]);
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
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, title: newTitle } : s
        )
      );

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
   * Optimistic removal + authoritative refetch to backfill the sidebar.
   */
  const deleteSession = useCallback(
    async (id: string) => {
      // Optimistic removal
      setSessions((prev) => prev.filter((s) => s.id !== id));

      try {
        const res = await fetch(`/api/sessions/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          // Revert on failure
          await fetchSessions();
          return;
        }
        // Authoritative refetch — backfills the slot left by the deleted session
        await fetchSessions();
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
        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return (
            new Date(b.updatedAt || 0).getTime() -
            new Date(a.updatedAt || 0).getTime()
          );
        });
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
        return [session, ...prev];
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
