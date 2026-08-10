"use client";

import { useLocale } from "@/hooks/useLocale";

export function NotFoundTitle() {
  const { t } = useLocale();
  return <>{t("notFound.title")}</>;
}

export function NotFoundDescription() {
  const { t } = useLocale();
  return <>{t("notFound.description")}</>;
}

export function NotFoundGoHome() {
  const { t } = useLocale();
  return <>{t("notFound.goHome")}</>;
}
