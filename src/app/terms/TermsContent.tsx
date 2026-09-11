"use client";

import { useLocale } from "@/hooks/useLocale";
import type { LocaleKeys } from "@/locales/en";
import PublicDoc from "@/components/PublicDoc";

const SECTION_KEYS = [
  ["terms.s1.title", "terms.s1.body"],
  ["terms.s2.title", "terms.s2.body"],
  ["terms.s3.title", "terms.s3.body"],
  ["terms.s4.title", "terms.s4.body"],
  ["terms.s5.title", "terms.s5.body"],
  ["terms.s6.title", "terms.s6.body"],
  ["terms.s7.title", "terms.s7.body"],
  ["terms.s8.title", "terms.s8.body"],
  ["terms.s9.title", "terms.s9.body"],
] as const satisfies readonly (readonly [LocaleKeys, LocaleKeys])[];

export default function TermsContent() {
  const { t } = useLocale();
  return (
    <PublicDoc
      title={t("terms.title")}
      backLabel={t("about.back")}
      updated={t("terms.updated")}
    >
      <p className="text-[15px] leading-relaxed text-text-primary mb-8">
        {t("terms.intro")}
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
