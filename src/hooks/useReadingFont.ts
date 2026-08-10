"use client";

import { useState, useCallback, useEffect } from "react";

export type ReadingFont = "default" | "serif" | "mono";

const STORAGE_KEY = "vonssy-reading-font";

/**
 * Client-side hook for reading font preference.
 * Persists to localStorage and applies via data-reading-font attribute on <html>.
 * Same no-flash pattern as next-themes uses for theme.
 */
export function useReadingFont() {
  const [readingFont, setReadingFontState] = useState<ReadingFont>("default");
  const [mounted, setMounted] = useState(false);

  // Read initial value from the DOM attribute (set by the inline script in layout.tsx)
  useEffect(() => {
    setMounted(true);
    const stored = document.documentElement.getAttribute("data-reading-font");
    if (stored === "serif" || stored === "mono") {
      setReadingFontState(stored);
    }
  }, []);

  const setReadingFont = useCallback((font: ReadingFont) => {
    setReadingFontState(font);

    if (font === "default") {
      document.documentElement.removeAttribute("data-reading-font");
      localStorage.removeItem(STORAGE_KEY);
    } else {
      document.documentElement.setAttribute("data-reading-font", font);
      localStorage.setItem(STORAGE_KEY, font);
    }
  }, []);

  return { readingFont: mounted ? readingFont : "default", setReadingFont, mounted };
}
