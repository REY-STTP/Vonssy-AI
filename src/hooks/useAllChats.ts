"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ALL_CHATS_PAGE_SIZE } from "@/lib/constants";

interface ChatSession {
  id: string;
  title: string | null;
  isPinned: boolean | null;
  updatedAt: string | null;
  modelProvider: string | null;
}

type Filter = "all" | "pinned";

export function useAllChats() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearchRaw] = useState("");
  const [filter, setFilterRaw] = useState<Filter>("all");
  const cursorRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Use refs for search/filter so fetchPage doesn't need them as deps
  const searchRef = useRef(search);
  const filterRef = useRef(filter);
  searchRef.current = search;
  filterRef.current = filter;

  /**
   * Fetch a page of sessions from the cursor-paginated endpoint.
   * Uses refs for search/filter to avoid recreating on every keystroke.
   */
  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      // Abort any in-flight request to prevent race conditions
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", String(ALL_CHATS_PAGE_SIZE));
        if (cursor) params.set("cursor", cursor);
        if (searchRef.current.trim()) params.set("search", searchRef.current.trim());
        if (filterRef.current !== "all") params.set("filter", filterRef.current);

        const res = await fetch(`/api/sessions/all?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();

        setSessions((prev) => {
          if (!append) return data.sessions;
          // Filter out any duplicates that might occur from race conditions or overlapping cursors
          const newSessions = data.sessions.filter(
            (s: ChatSession) => !prev.some((p) => p.id === s.id)
          );
          return [...prev, ...newSessions];
        });
        cursorRef.current = data.nextCursor;
        setHasMore(!!data.nextCursor);
      } catch (err) {
        // Ignore intentional aborts; surface real errors if needed
        if ((err as Error).name === "AbortError") return;
      } finally {
        setIsLoading(false);
      }
    },
    [] // stable — reads search/filter from refs, not state
  );

  /**
   * Load the next page (called by IntersectionObserver).
   */
  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    fetchPage(cursorRef.current, true);
  }, [isLoading, hasMore, fetchPage]);

  /**
   * Reset and refetch from the beginning (used when modal opens).
   */
  const reset = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    cursorRef.current = null;
    setSessions([]);
    setHasMore(true);
    fetchPage(null, false);
  }, [fetchPage]);

  /**
   * Set search — updates input value immediately, debounces the fetch.
   */
  const setSearch = useCallback(
    (query: string) => {
      setSearchRaw(query);

      // Clear any pending debounce timer
      if (debounceRef.current) clearTimeout(debounceRef.current);

      // Schedule a new fetch after 500ms of no typing
      // Don't clear results here — keep showing previous results until fetch resolves
      debounceRef.current = setTimeout(() => {
        cursorRef.current = null;
        setHasMore(true);
        fetchPage(null, false);
      }, 500);
    },
    [fetchPage]
  );

  /**
   * Set filter — refetches immediately (no debounce needed for a toggle).
   */
  const setFilter = useCallback(
    (f: Filter) => {
      setFilterRaw(f);

      // Clear any pending search debounce
      if (debounceRef.current) clearTimeout(debounceRef.current);

      // Fetch immediately for filter changes
      cursorRef.current = null;
      setHasMore(true);
      // Use a microtask to ensure filterRef is updated before fetch
      setTimeout(() => fetchPage(null, false), 0);
    },
    [fetchPage]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  /**
   * Optimistically remove a session from the All Chats list (e.g. after delete).
   */
  const removeSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  /**
   * Optimistically update a session's title in the All Chats list.
   */
  const updateSessionTitle = useCallback((id: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s))
    );
  }, []);

  /**
   * Optimistically toggle a session's pin state in the All Chats list.
   */
  const togglePinSession = useCallback((id: string, isPinned: boolean) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isPinned } : s))
    );
  }, []);

  return {
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
  };
}
