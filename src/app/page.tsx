import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/ssr/CalendarCheck";
import { TimerIcon } from "@phosphor-icons/react/dist/ssr/Timer";
import { ReceiptIcon } from "@phosphor-icons/react/dist/ssr/Receipt";
import { SealCheckIcon } from "@phosphor-icons/react/dist/ssr/SealCheck";
import { getSession } from "@/lib/auth/session";
import { readAuthLang } from "@/lib/auth-lang.server";
import { AUTH_COPY } from "@/lib/auth-copy";
import { LANDING_COPY, landingVisible } from "@/lib/landing-copy";
import { SUPPORT_EMAIL } from "@/lib/legal/policies";
import { Device } from "@/components/auth-premium/auth-shell";
import { LangSwitch } from "@/components/auth-premium/lang-switch";
import { BrandLegal } from "@/components/brand-legal";
import { BrandWordmark } from "@/components/brand-mark";
import "./login/auth-premium.css";
import "./landing.css";

export const metadata: Metadata = {
  title: "NEVORA Workforce",
  description: "Scheduling, time and pay preparation for small teams in Puerto Rico, in English and Spanish.",
};

/* The public landing page, in the sign-in family's visual language (auth-premium.css): the deep signature
 * panel with the bleeding mark and grain, the fictional employee phone (Device, localized), and the app's own
 * move of white cards rising over the teal. A signed-in person still lands in the app, and production keeps
 * the old redirect until NEVORA_LANDING=on (landingVisible). Language follows the sign-in pages' nv-lang cookie. */

const FEATURE_ICONS = [CalendarCheckIcon, TimerIcon, ReceiptIcon] as const;

/** The sign-in panel's mark (auth-shell.tsx); the landing recolours it to the signature deep pair. */
const Mark = ({ className }: { className: string }) => (
  <svg className={className} viewBox="0 0 360 340" aria-hidden="true" focusable="false">
    <path d="M20 330 L180 30 L340 330 L276 330 L180 150 L84 330 Z" fill="#164B48" />
    <path d="M146 330 L180 266 L214 330 Z" fill="#35B6EC" />
  </svg>
);

/** The brand line breaks after its first comma, as on the sign-in panel. */
function TwoLines({ text }: { text: string }) {
  const at = text.indexOf(", ");
  return at < 0 ? <>{text}</> : <>{text.slice(0, at + 1)}<br />{text.slice(at + 2)}</>;
}

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
        <Mark className="lp-hero__mark" />
        <span className="ap-grain" aria-hidden="true" />
        <div className="lp-hero__copy">
          <p className="lp-eyebrow">{t.eyebrow}</p>
          <h1 className="lp-title"><TwoLines text={t.title} /></h1>
          <p className="lp-subtitle">{t.subtitle}</p>
          <div className="lp-cta">
            <a className="lp-btn" data-kind="light" href={`mailto:${SUPPORT_EMAIL}`}>{t.contact}</a>
            <Link className="lp-btn" data-kind="outline" href="/login">{t.signIn}</Link>
          </div>
          <p className="lp-hint">{t.contactHint}</p>
        </div>
        <div className="lp-hero__device"><Device d={AUTH_COPY[lang].device} /></div>
      </section>

      <section className="lp-features">
        {t.features.map((f, i) => {
          const Icon = FEATURE_ICONS[i];
          return (
            <article key={f.title} className="lp-card">
              <span className="lp-card__disc"><Icon size={24} weight="duotone" aria-hidden="true" /></span>
              <h2>{f.title}</h2>
              <p>{f.body}</p>
            </article>
          );
        })}
      </section>

      <section className="lp-trust" aria-labelledby="lp-trust-title">
        <h2 id="lp-trust-title">{t.trustTitle}</h2>
        <ul>
          {t.trust.map((line) => (
            <li key={line}><SealCheckIcon size={22} weight="duotone" aria-hidden="true" /><span>{line}</span></li>
          ))}
        </ul>
      </section>

      <p className="lp-existing">{t.existing}</p>

      <footer className="lp-footer">
        <span className="lp-wordmark lp-wordmark--footer"><BrandWordmark /></span>
        <BrandLegal lang={lang} />
      </footer>
    </main>
  );
}
