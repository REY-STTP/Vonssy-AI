"use client";

import { useLocale } from "@/hooks/useLocale";
import type { LocaleKeys } from "@/locales/en";
import PublicDoc from "@/components/PublicDoc";

const SECTION_KEYS = [
  ["privacy.s1.title", "privacy.s1.body"],
  ["privacy.s2.title", "privacy.s2.body"],
  ["privacy.s3.title", "privacy.s3.body"],
  ["privacy.s4.title", "privacy.s4.body"],
  ["privacy.s5.title", "privacy.s5.body"],
  ["privacy.s6.title", "privacy.s6.body"],
  ["privacy.s7.title", "privacy.s7.body"],
  ["privacy.s8.title", "privacy.s8.body"],
  ["privacy.s9.title", "privacy.s9.body"],
] as const satisfies readonly (readonly [LocaleKeys, LocaleKeys])[];

export default function PrivacyContent() {
  const { t } = useLocale();
  return (
    <PublicDoc
      title={t("privacy.title")}
      backLabel={t("about.back")}
      updated={t("privacy.updated")}
    >
      <p className="text-[15px] leading-relaxed text-text-primary mb-8">
        {t("privacy.intro")}
      </p>
      <div className="space-y-7">
        {SECTION_KEYS.map(([tk, bk]) => (
          <section key={tk}>
            <h2 className="font-body text-lg font-semibold text-text-primary mb-2">
              {t(tk)}
            </h2>
            <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
              {t(bk)}
            </p>
          </section>
        ))}
      </div>
    </PublicDoc>
  );
}
