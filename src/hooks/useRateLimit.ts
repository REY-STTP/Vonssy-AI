"use client";

import { useState, useCallback, useEffect } from "react";

interface RateLimitQuota {
  remaining: number;
  limit: number;
  resetAt: string;
}

export function useRateLimit() {
  const [quota, setQuota] = useState<RateLimitQuota | null>(null);

  const fetchQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/rate-limit");
      if (!res.ok) return;
      const data = await res.json();
      setQuota(data);
    } catch {
      // Silently fail
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  return { quota, refreshQuota: fetchQuota };
}
