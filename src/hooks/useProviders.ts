"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface UserProviderConfig {
  id: string;
  label: string;
  baseUrl: string;
  apiKeyHint: string;
  models: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

const STORAGE_KEY = "vonssy-selected-provider-id";
const MODEL_STORAGE_KEY = "vonssy-selected-provider-model";
// Legacy key from before the models → providers rename; read once as a
// fallback so existing users keep their selection, then migrate forward.
const LEGACY_STORAGE_KEY = "vonssy-selected-model-id";

function readStoredId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
}

function readStoredModel(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(MODEL_STORAGE_KEY);
}

function writeStoredId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(STORAGE_KEY, id);
  else localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

function writeStoredModel(model: string | null) {
  if (typeof window === "undefined") return;
  if (model) localStorage.setItem(MODEL_STORAGE_KEY, model);
  else localStorage.removeItem(MODEL_STORAGE_KEY);
}

// Module-level cache: /chat/[id] navigation remounts ChatClient on every
// session switch, and without this each mount refetches the list. Mutations
// below keep the cache in sync. (Cleared on full page load.)
let providersCache: UserProviderConfig[] | null = null;
// Dedupes concurrent mounts (StrictMode dev double-mount included).
let providersInflight: Promise<UserProviderConfig[]> | null = null;

async function loadProvidersFromNetwork(): Promise<UserProviderConfig[]> {
  const res = await fetch("/api/user/providers");
  if (!res.ok) throw new Error("Failed to load providers.");
  const data = await res.json();
  providersCache = data.providers ?? [];
  return providersCache ?? [];
}

export function useProviders() {
  const [providers, setProviders] = useState<UserProviderConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<{
    providerId: string | null;
    model: string | null;
  }>(() => ({ providerId: readStoredId(), model: readStoredModel() }));

  // Refs so async flows (refresh/update/select) resolve against the latest
  // list without side effects inside state updaters.
  const providersRef = useRef<UserProviderConfig[]>([]);
  providersRef.current = providers;
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  // Resolve a (providerId, model) pair against the list: unknown ids fall
  // back to the first provider and its first model.
  const resolveSelection = useCallback(
    (list: UserProviderConfig[], providerId: string | null, model: string | null) => {
      const provider = (providerId && list.find((p) => p.id === providerId)) ?? list[0] ?? null;
      if (!provider) return { providerId: null as string | null, model: null as string | null };
      const models = Array.isArray(provider.models) ? provider.models : [];
      const nextModel = (model && models.includes(model) ? model : models[0]) ?? null;
      return { providerId: provider.id as string | null, model: nextModel };
    },
    []
  );

  const applySelection = useCallback(
    (list: UserProviderConfig[], providerId: string | null, model: string | null) => {
      const resolved = resolveSelection(list, providerId, model);
      writeStoredId(resolved.providerId);
      writeStoredModel(resolved.model);
      setSelection(resolved);
      return resolved;
    },
    [resolveSelection]
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!providersInflight) {
        providersInflight = loadProvidersFromNetwork().finally(() => {
          providersInflight = null;
        });
      }
      const list = await providersInflight;
      setProviders(list);
      applySelection(list, selectionRef.current.providerId, selectionRef.current.model);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load providers.");
      if (providersCache) setProviders(providersCache);
    } finally {
      setIsLoading(false);
    }
  }, [applySelection]);

  // Initial load: serve the module cache instantly when a previous mount
  // already fetched (session-switch remounts), skipping the network.
  useEffect(() => {
    if (providersCache) {
      const list = providersCache;
      setProviders(list);
      setIsLoading(false);
      applySelection(list, selectionRef.current.providerId, selectionRef.current.model);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // D6: keep selection valid after optimistic create/update/remove
  // (refresh() only runs on load).
  useEffect(() => {
    const prev = selectionRef.current;
    const resolved = resolveSelection(providersRef.current, prev.providerId, prev.model);
    if (
      resolved.providerId !== prev.providerId ||
      resolved.model !== prev.model
    ) {
      applySelection(providersRef.current, prev.providerId, prev.model);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers]);

  const select = useCallback(
    (id: string, model?: string) => {
      applySelection(providersRef.current, id, model ?? readStoredModel());
    },
    [applySelection]
  );

  const create = useCallback(
    async (payload: { label: string; baseUrl: string; apiKey: string; models: string[] }) => {
      const res = await fetch("/api/user/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create provider.");
      // D6: optimistic patch instead of full refetch (no loading flicker).
      const created = data.provider as UserProviderConfig;
      const createdModels = Array.isArray(created.models) ? created.models : [];
      const next = [created, ...providersRef.current];
      providersCache = next;
      setProviders(next);
      setError(null);
      applySelection([created], created.id, createdModels[0] ?? null);
      return created;
    },
    [applySelection]
  );

  const update = useCallback(
    async (id: string, payload: { label?: string; baseUrl?: string; apiKey?: string; models?: string[] }) => {
      const res = await fetch(`/api/user/providers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update provider.");
      const saved = data.provider as UserProviderConfig;
      const next = providersRef.current.map((p) => (p.id === id ? saved : p));
      providersCache = next;
      setProviders(next);
      // Keep the selected model valid when its provider's list changes.
      const prevSel = selectionRef.current;
      if (prevSel.providerId === id) {
        applySelection(next, prevSel.providerId, prevSel.model);
      }
      setError(null);
      return saved;
    },
    [applySelection]
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/user/providers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete provider.");
      }
      // D6: optimistic removal; fall back selection locally.
      const next = providersRef.current.filter((p) => p.id !== id);
      providersCache = next;
      setProviders(next);
      setSelection((prev) => {
        if (prev.providerId !== id) return prev;
        return { providerId: null, model: null }; // resolved to first item by the effect above
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

  const selectedProvider: UserProviderConfig | null =
    providers.find((p) => p.id === selection.providerId) ?? null;
  const selectedModel: string | null =
    selectedProvider &&
    Array.isArray(selectedProvider.models) &&
    selection.model &&
    selectedProvider.models.includes(selection.model)
      ? selection.model
      : selectedProvider?.models?.[0] ?? null;

  return {
    providers,
    isLoading,
    error,
    selectedProvider,
    selectedModel,
    select,
    refresh,
    create,
    update,
    remove,
    test,
  };
}
