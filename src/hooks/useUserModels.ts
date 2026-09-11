"use client";

import { useState, useEffect, useCallback } from "react";

export interface UserModelConfig {
  id: string;
  label: string;
  baseUrl: string;
  apiKeyHint: string;
  model: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const STORAGE_KEY = "vonssy-selected-model-id";

export function useUserModels() {
  const [models, setModels] = useState<UserModelConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/models");
      if (!res.ok) throw new Error("Failed to load models.");
      const data = await res.json();
      const list: UserModelConfig[] = data.models ?? [];
      setModels(list);
      setSelectedId((prev) => {
        if (prev && list.some((m) => m.id === prev)) return prev;
        const next = list[0]?.id ?? null;
        if (typeof window !== "undefined") {
          if (next) localStorage.setItem(STORAGE_KEY, next);
          else localStorage.removeItem(STORAGE_KEY);
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load models.");
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
      if (prev && models.some((m) => m.id === prev)) return prev;
      const next = models[0]?.id ?? null;
      if (typeof window !== "undefined") {
        if (next) localStorage.setItem(STORAGE_KEY, next);
        else localStorage.removeItem(STORAGE_KEY);
      }
      return next;
    });
  }, [models]);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const create = useCallback(
    async (payload: { label: string; baseUrl: string; apiKey: string; model: string }) => {
      const res = await fetch("/api/user/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create model.");
      // D6: optimistic patch instead of full refetch (no loading flicker).
      const created = data.model as UserModelConfig;
      setModels((prev) => [created, ...prev]);
      setError(null);
      select(created.id);
      return created;
    },
    [select]
  );

  const update = useCallback(
    async (id: string, payload: { label?: string; baseUrl?: string; apiKey?: string; model?: string }) => {
      const res = await fetch(`/api/user/models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update model.");
      const saved = data.model as UserModelConfig;
      setModels((prev) => prev.map((m) => (m.id === id ? saved : m)));
      setError(null);
      return saved;
    },
    []
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/user/models/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete model.");
      }
      // D6: optimistic removal; fall back selection locally.
      setModels((prev) => prev.filter((m) => m.id !== id));
      setSelectedId((prev) => {
        if (prev !== id) return prev;
        return null; // resolved to first item by the effect below
      });
      setError(null);
    },
    []
  );

  const test = useCallback(async (id: string) => {
    const res = await fetch(`/api/user/models/${id}/test`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Test failed.");
    if (!data.ok) throw new Error(data.error || "Connection failed.");
    return data.sample as string;
  }, []);

  const selected: UserModelConfig | null =
    models.find((m) => m.id === selectedId) ?? null;

  return { models, isLoading, error, selected, selectedId, select, refresh, create, update, remove, test };
}
