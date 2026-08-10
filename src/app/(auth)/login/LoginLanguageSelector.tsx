"use client";

import { useLocale, Locale } from "@/hooks/useLocale";

export default function LoginLanguageSelector() {
  const { locale, setLocale, t } = useLocale();

  return (
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
  );
}
