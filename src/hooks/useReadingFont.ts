"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type ReadingFont = "default" | "serif" | "mono";

const STORAGE_KEY = "vonssy-reading-font";

// --- Global Store ---
let globalFont: ReadingFont = "default";

function subscribe(callback: () => void) {
  window.addEventListener("vonssy-font-change", callback);
  return () => window.removeEventListener("vonssy-font-change", callback);
}

function getSnapshot() {
  return globalFont;
}

function getServerSnapshot() {
  return "default" as ReadingFont;
}

/**
 * Client-side hook for reading font preference.
 * Persists to localStorage and applies via data-reading-font attribute on <html>.
 * Uses useSyncExternalStore to ensure all components stay perfectly in sync.
 */
export function useReadingFont() {
  const readingFont = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [mounted, setMounted] = useState(false);

  // Read initial value from the DOM attribute (set by the inline script in layout.tsx)
  useEffect(() => {
    setMounted(true);
    const stored = document.documentElement.getAttribute("data-reading-font");
    if ((stored === "serif" || stored === "mono") && globalFont !== stored) {
      globalFont = stored as ReadingFont;
      window.dispatchEvent(new Event("vonssy-font-change"));
    }
  }, []);

  const setReadingFont = useCallback((font: ReadingFont) => {
    if (globalFont === font) return;
    
    globalFont = font;
    if (font === "default") {
      document.documentElement.removeAttribute("data-reading-font");
      localStorage.removeItem(STORAGE_KEY);
    } else {
      document.documentElement.setAttribute("data-reading-font", font);
      localStorage.setItem(STORAGE_KEY, font);
    }
    
    window.dispatchEvent(new Event("vonssy-font-change"));
  }, []);

  return { readingFont: mounted ? readingFont : "default", setReadingFont, mounted };
}
