"use client";

import { useLocale, Locale } from "@/hooks/useLocale";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function LoginLanguageSelector() {
  const { locale, setLocale, t } = useLocale();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <>
      {/* Theme Toggle (Bottom Right) */}
      {mounted && (
        <div className="absolute bottom-6 right-6 z-50">
          <button
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light")}
            className="p-1.5 w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface/80 rounded-md transition-colors bg-surface/50 backdrop-blur-sm border border-border shadow-sm"
            aria-label={t("appearance.theme")}
          >
            {theme === "light" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Language Toggle (Top Right) */}
      <div className="absolute top-6 right-6 z-50">
        <button
          type="button"
          onClick={() => setLocale(locale === "en" ? "id" : "en")}
          className="p-1.5 w-8 h-8 flex items-center justify-center text-xs font-bold uppercase text-text-secondary hover:text-text-primary hover:bg-surface/80 rounded-md transition-colors bg-surface/50 backdrop-blur-sm border border-border shadow-sm"
          aria-label={t("appearance.language")}
        >
          {locale}
        </button>
      </div>
    </>
  );
}
