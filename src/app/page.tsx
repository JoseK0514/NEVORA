import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/ssr/CalendarCheck";
import { TimerIcon } from "@phosphor-icons/react/dist/ssr/Timer";
import { ReceiptIcon } from "@phosphor-icons/react/dist/ssr/Receipt";
import { getSession } from "@/lib/auth/session";
import { readAuthLang } from "@/lib/auth-lang.server";
import { LANDING_COPY, landingVisible } from "@/lib/landing-copy";
import { SUPPORT_EMAIL } from "@/lib/legal/policies";
import { LangSwitch } from "@/components/auth-premium/lang-switch";
import { BrandLegal } from "@/components/brand-legal";
import { BrandWordmark } from "@/components/brand-mark";
import "./landing.css";

export const metadata: Metadata = {
  title: "NEVORA Workforce",
  description: "Scheduling, time and pay preparation for small teams in Puerto Rico, in English and Spanish.",
};

/* The public landing page. A signed-in person still lands in the app, and production keeps the old redirect
 * until NEVORA_LANDING=on (landingVisible). The language follows the same nv-lang cookie as the sign-in pages. */

const FEATURE_ICONS = [CalendarCheckIcon, TimerIcon, ReceiptIcon] as const;

/** The sign-in panel's mark (auth-shell.tsx), as the landing's one brand moment. */
const Mark = ({ className }: { className: string }) => (
  <svg className={className} viewBox="0 0 360 340" aria-hidden="true" focusable="false">
    <path d="M20 330 L180 30 L340 330 L276 330 L180 150 L84 330 Z" fill="#164B48" />
    <path d="M146 330 L180 266 L214 330 Z" fill="#35B6EC" />
  </svg>
);

export default async function Home() {
  if (!landingVisible()) redirect("/app");
  if (await getSession()) redirect("/app");
  const lang = await readAuthLang();
  const t = LANDING_COPY[lang];

  return (
    <main className="lp" lang={lang}>
      <header className="lp-top">
        <span className="lp-wordmark"><BrandWordmark /></span>
        <div className="lp-top__actions">
          <LangSwitch lang={lang} label={t.eyebrow} />
          <Link className="lp-btn" data-kind="quiet" href="/login">{t.signIn}</Link>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero__text">
          <p className="lp-eyebrow">{t.eyebrow}</p>
          <h1 className="lp-title">{t.title}</h1>
          <p className="lp-subtitle">{t.subtitle}</p>
          <div className="lp-cta">
            <a className="lp-btn" data-kind="primary" href={`mailto:${SUPPORT_EMAIL}`}>{t.contact}</a>
            <Link className="lp-btn" data-kind="ghost" href="/login">{t.signIn}</Link>
          </div>
          <p className="lp-hint">{t.contactHint}</p>
        </div>
        <div className="lp-hero__panel"><Mark className="lp-hero__mark" /></div>
      </section>

      <section className="lp-features">
        {t.features.map((f, i) => {
          const Icon = FEATURE_ICONS[i];
          return (
            <article key={f.title} className="lp-card">
              <Icon size={28} weight="duotone" aria-hidden="true" className="lp-card__icon" />
              <h2>{f.title}</h2>
              <p>{f.body}</p>
            </article>
          );
        })}
      </section>

      <section className="lp-trust">
        <h2>{t.trustTitle}</h2>
        <ul>{t.trust.map((line) => <li key={line}>{line}</li>)}</ul>
      </section>

      <p className="lp-existing">{t.existing}</p>

      <footer className="lp-footer"><BrandLegal lang={lang} /></footer>
    </main>
  );
}
