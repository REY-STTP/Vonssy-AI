"use client";

import { useState, useEffect, useCallback } from "react";

export interface UserProviderConfig {
  id: string;
  label: string;
  baseUrl: string;
  apiKeyHint: string;
  model: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const STORAGE_KEY = "vonssy-selected-provider-id";
// Legacy key from before the models → providers rename; read once as a
// fallback so existing users keep their selection, then migrate forward.
const LEGACY_STORAGE_KEY = "vonssy-selected-model-id";

function readStoredId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
}

function writeStoredId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(STORAGE_KEY, id);
  else localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function useProviders() {
  const [providers, setProviders] = useState<UserProviderConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => readStoredId());

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/providers");
      if (!res.ok) throw new Error("Failed to load providers.");
      const data = await res.json();
      const list: UserProviderConfig[] = data.providers ?? [];
      setProviders(list);
      setSelectedId((prev) => {
        if (prev && list.some((p) => p.id === prev)) return prev;
        const next = list[0]?.id ?? null;
        writeStoredId(next);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load providers.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // D6: keep selection valid after optimistic remove (refresh() only runs on load).
  useEffect(() => {
    setSelectedId((prev) => {
      if (prev && providers.some((p) => p.id === prev)) return prev;
      const next = providers[0]?.id ?? null;
      writeStoredId(next);
      return next;
    });
  }, [providers]);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    writeStoredId(id);
  }, []);

  const create = useCallback(
    async (payload: { label: string; baseUrl: string; apiKey: string; model: string }) => {
      const res = await fetch("/api/user/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create provider.");
      // D6: optimistic patch instead of full refetch (no loading flicker).
      const created = data.provider as UserProviderConfig;
      setProviders((prev) => [created, ...prev]);
      setError(null);
      select(created.id);
      return created;
    },
    [select]
  );

  const update = useCallback(
    async (id: string, payload: { label?: string; baseUrl?: string; apiKey?: string; model?: string }) => {
      const res = await fetch(`/api/user/providers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update provider.");
      const saved = data.provider as UserProviderConfig;
      setProviders((prev) => prev.map((p) => (p.id === id ? saved : p)));
      setError(null);
      return saved;
    },
    []
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/user/providers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete provider.");
      }
      // D6: optimistic removal; fall back selection locally.
      setProviders((prev) => prev.filter((p) => p.id !== id));
      setSelectedId((prev) => {
        if (prev !== id) return prev;
        return null; // resolved to first item by the effect below
      });
      setError(null);
    },
    []
  );

  const test = useCallback(async (id: string) => {
    const res = await fetch(`/api/user/providers/${id}/test`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Test failed.");
    if (!data.ok) throw new Error(data.error || "Connection failed.");
    return data.sample as string;
  }, []);

  const selected: UserProviderConfig | null =
    providers.find((p) => p.id === selectedId) ?? null;

  return { providers, isLoading, error, selected, selectedId, select, refresh, create, update, remove, test };
}
