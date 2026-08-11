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
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface/80 rounded-md transition-colors bg-surface/50 backdrop-blur-sm border border-border shadow-sm"
            aria-label={t("appearance.theme")}
          >
            {resolvedTheme === "dark" ? (
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
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Language Selector (Top Right) */}
      <div className="absolute top-6 right-6 z-50">
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className="bg-surface/50 backdrop-blur-sm border border-border rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary py-1.5 px-2.5 pr-7 focus:border-accent focus:outline-none transition-colors appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20fill%3D%22none%22%20stroke%3D%22%239C978E%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%223%205%207%209%2011%205%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_6px_center] bg-no-repeat cursor-pointer shadow-sm"
          aria-label={t("appearance.language")}
        >
          <option value="en">{t("appearance.langEn")}</option>
          <option value="id">{t("appearance.langId")}</option>
        </select>
      </div>
    </>
  );
}
