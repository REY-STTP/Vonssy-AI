"use client";

import { useLocale } from "@/hooks/useLocale";

/**
 * Client component that renders translated text for the login page.
 * The login page is a Server Component (uses "use server" actions),
 * so we wrap only the translatable text portions in this client component.
 */
export function LoginTagline() {
  const { t } = useLocale();
  return <>{t("login.tagline")}</>;
}

export function LoginGoogleLabel() {
  const { t } = useLocale();
  return <>{t("login.google")}</>;
}

export function LoginGitHubLabel() {
  const { t } = useLocale();
  return <>{t("login.github")}</>;
}

export function LoginFooter() {
  const { t } = useLocale();
  return <>{t("login.footer")}</>;
}
