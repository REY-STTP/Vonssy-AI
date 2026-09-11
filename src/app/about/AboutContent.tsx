"use client";

import { useLocale } from "@/hooks/useLocale";
import type { LocaleKeys } from "@/locales/en";
import PublicDoc from "@/components/PublicDoc";

const FAQ_KEYS = [
  ["about.faq.1.q", "about.faq.1.a"],
  ["about.faq.2.q", "about.faq.2.a"],
  ["about.faq.3.q", "about.faq.3.a"],
  ["about.faq.4.q", "about.faq.4.a"],
  ["about.faq.5.q", "about.faq.5.a"],
  ["about.faq.6.q", "about.faq.6.a"],
] as const satisfies readonly (readonly [LocaleKeys, LocaleKeys])[];

export default function AboutContent() {
  const { t } = useLocale();
  return (
    <PublicDoc title={t("about.title")} brand="VonssyAI" backLabel={t("about.back")}>
      <div className="space-y-4 text-[15px] leading-relaxed text-text-primary">
        <p>{t("about.p1")}</p>
        <p>{t("about.p2")}</p>
      </div>

      <h2 className="font-body text-xl font-semibold text-text-primary mt-10 mb-4">
        {t("about.faqTitle")}
      </h2>
      <div className="space-y-3">
        {FAQ_KEYS.map(([qk, ak]) => (
          <div key={qk} className="card p-4">
            <h3 className="text-[15px] font-semibold text-text-primary mb-1.5">
              {t(qk)}
            </h3>
            <p className="text-sm leading-relaxed text-text-secondary">{t(ak)}</p>
          </div>
        ))}
      </div>
    </PublicDoc>
  );
}
