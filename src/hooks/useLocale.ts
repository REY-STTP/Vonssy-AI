"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import en, { type LocaleKeys } from "@/locales/en";
import id from "@/locales/id";

export type Locale = "en" | "id";

const STORAGE_KEY = "vonssy-locale";

const locales: Record<Locale, Record<LocaleKeys, string>> = { en, id };

// --- Global Store ---
let globalLocale: Locale = "en";

function subscribe(callback: () => void) {
  window.addEventListener("vonssy-locale-change", callback);
  return () => window.removeEventListener("vonssy-locale-change", callback);
}

function getSnapshot() {
  return globalLocale;
}

function getServerSnapshot() {
  return "en" as Locale;
}

/**
 * Client-side hook for UI language preference.
 * Persists to localStorage and applies via data-locale attribute on <html>.
 * Uses useSyncExternalStore to ensure all components stay perfectly in sync.
 */
export function useLocale() {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Initialize from DOM if it was set by the no-flash script
    const stored = document.documentElement.getAttribute("data-locale");
    if (stored === "id" && globalLocale !== "id") {
      globalLocale = "id";
      window.dispatchEvent(new Event("vonssy-locale-change"));
    }
  }, []);

  const setLocale = useCallback((loc: Locale) => {
    if (globalLocale === loc) return;
    
    globalLocale = loc;
    if (loc === "en") {
      document.documentElement.removeAttribute("data-locale");
      document.documentElement.lang = "en";
      localStorage.removeItem(STORAGE_KEY);
    } else {
      document.documentElement.setAttribute("data-locale", loc);
      document.documentElement.lang = loc;
      localStorage.setItem(STORAGE_KEY, loc);
    }
    
    window.dispatchEvent(new Event("vonssy-locale-change"));
  }, []);

  const t = useCallback(
    (key: LocaleKeys, vars?: Record<string, string | number>) => {
      const currentLocale = mounted ? locale : "en";
      let str = locales[currentLocale]?.[key] ?? locales.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(`{${k}}`, String(v));
        }
      }
      return str;
    },
    [locale, mounted]
  );

  return { locale: mounted ? locale : "en", setLocale, t, mounted };
}
