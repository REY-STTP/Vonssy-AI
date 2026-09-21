"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import LoginLanguageSelector from "@/app/LoginLanguageSelector";
import { useLocale } from "@/hooks/useLocale";

/**
 * Shared shell for public legal/info pages (/about, /privacy, /terms):
 * language toggle, back link, title, revision line, footer nav.
 */
export default function PublicDoc({
  title,
  brand,
  backHref = "/",
  backLabel,
  updated,
  children,
}: {
  title: string;
  brand?: string;
  backHref?: string;
  backLabel: string;
  updated?: string;
  children: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <main className="min-h-dvh bg-bg relative">
      <LoginLanguageSelector />
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-16">
        <p className="text-sm font-mono text-text-secondary mb-4">
          <Link
            href={backHref}
            className="hover:text-accent transition-colors"
          >
            {backLabel}
          </Link>
        </p>
        <h1 className="font-body text-3xl font-bold text-text-primary tracking-tight mb-2">
          {title} {brand ? <span className="text-accent">{brand}</span> : null}
        </h1>
        {updated ? (
          <p className="text-xs font-mono text-text-secondary mb-6">{updated}</p>
        ) : null}
        {children}
        <nav
          aria-label={t("footer.nav")}
          className="mt-10 pt-6 border-t border-border flex items-center justify-center gap-2 text-xs text-text-secondary"
        >
          <Link href="/about" className="hover:text-accent underline underline-offset-2 transition-colors">
            {t("login.about")}
          </Link>
          <span aria-hidden="true">•</span>
          <Link href="/privacy" className="hover:text-accent underline underline-offset-2 transition-colors">
            {t("login.privacy")}
          </Link>
          <span aria-hidden="true">•</span>
          <Link href="/terms" className="hover:text-accent underline underline-offset-2 transition-colors">
            {t("login.terms")}
          </Link>
        </nav>
      </div>
    </main>
  );
}
