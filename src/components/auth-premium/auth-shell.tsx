import {mobileAccessEnabled} from "@/components/mobile-access/config.server";
import {MobileAccessHeader} from "@/components/mobile-access/chrome";
import "@/components/mobile-access/mobile-access.css";
import type { ReactNode } from "react";
import Link from "next/link";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { BrandLegal, QuietLegal } from "@/components/brand-legal";
import { QuietNav } from "@/components/quiet/quiet";
import { BrandWordmark } from "@/components/brand-mark";
import type { AuthCopy, AuthLang } from "@/lib/auth-copy";
import { LangSwitch } from "./lang-switch";

/* E4 sign-in shell (docs/product/specs/auth-premium/SPEC.md). One DOM for every width: on desktop a cream form
 * column and the deep teal brand panel; under 768px the panel becomes a band at the top and the form a cream sheet
 * rising over it. Styles: src/app/login/auth-premium.css (prefix ap-). */

const Mark = ({ className }: { className: string }) => (
  <svg className={className} viewBox="0 0 360 340" aria-hidden="true" focusable="false">
    <path d="M20 330 L180 30 L340 330 L276 330 L180 150 L84 330 Z" fill="#164B48" />
    <path d="M146 330 L180 266 L214 330 Z" fill="#35B6EC" />
  </svg>
);

/** "Your week, / in one place.": the brand line breaks after its first comma, as in the approved design. */
function TwoLines({ text }: { text: string }) {
  const at = text.indexOf(", ");
  return at < 0 ? <>{text}</> : <>{text.slice(0, at + 1)}<br />{text.slice(at + 2)}</>;
}

/** A static, fictional employee Today screen in an iPhone frame. Decorative only. */
function Device({ d }: { d: AuthCopy["device"] }) {
  return (
    <div className="ap-device" aria-hidden="true">
      <span className="ap-device__side" />
      <div className="ap-device__island" />
      <div className="ap-device__screen">
        <div className="ap-scr-status">
          <span>9:41</span>
          <span className="ap-scr-icons">
            <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
            <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 2.6c2.3 0 4.4.9 6 2.4l1.1-1.1A10.1 10.1 0 0 0 8 1C5.3 1 2.8 2 .9 3.9L2 5c1.6-1.5 3.7-2.4 6-2.4Zm0 3.2c1.4 0 2.7.5 3.7 1.4l1.1-1.1A7 7 0 0 0 8 4.2a7 7 0 0 0-4.8 1.9l1.1 1.1A5.4 5.4 0 0 1 8 5.8Zm0 3.2c.6 0 1.1.2 1.5.6L8 11.1 6.5 9.6c.4-.4.9-.6 1.5-.6Z" /></svg>
            <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".35" /><rect x="2" y="2" width="20" height="9" rx="2" /><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" opacity=".4" /></svg>
          </span>
        </div>
        <div className="ap-scr-greet"><small>{d.date}</small><b>{d.greeting}</b></div>
        <div className="ap-scr-card">
          <div className="ap-scr-row"><span className="ap-scr-k">{d.nextShift}</span><span className="ap-scr-pill">{d.inMinutes}</span></div>
          <div className="ap-scr-time">{d.time}</div>
          <div className="ap-scr-place">{d.place}</div>
          <div className="ap-scr-cta">{d.clockIn}</div>
        </div>
        <div className="ap-scr-lab">{d.thisWeek}</div>
        <div className="ap-scr-rows">
          <div>{d.scheduled}<span>32h</span></div>
          <div>{d.worked}<span>16h 05m</span></div>
          <div>{d.nextPayday}<span>{d.payday}</span></div>
        </div>
        <div className="ap-scr-req">
          <span className="ap-scr-dot"><svg width="16" height="16" viewBox="0 0 256 256"><path fill="currentColor" d="M173.7 98.3a8 8 0 0 1 0 11.4l-56 56a8 8 0 0 1-11.4 0l-24-24a8 8 0 0 1 11.4-11.4l18.3 18.4 50.3-50.4a8 8 0 0 1 11.4 0Z" /></svg></span>
          <span className="ap-scr-req__text"><b>{d.timeOff}</b><span className="ap-scr-req__row"><span className="ap-scr-s">{d.approvedBy}</span><span className="ap-scr-st">{d.approved}</span></span></span>
        </div>
        <div className="ap-scr-tabs">{d.tabs.map((tab, index) => <span key={tab} className={index === 0 ? "on" : undefined}><i />{tab}</span>)}</div>
      </div>
    </div>
  );
}

export function AuthShell({ lang, t, variant, back, bandTitle, children }: {
  lang: AuthLang; t: AuthCopy;
  /** "signin" has the tall phone band with the brand line; the other three pages have a short band and a Back pill. */
  variant: "signin" | "sub";
  /** Where Back goes on the recovery and activation pages (sign in, keeping a safe returnTo). */
  back?: string;
  /** Signature (phase 4): the phone band's greeting and workspace on sign in. Decorative; the sheet keeps the h1. */
  bandTitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className={`ap ap--${variant}`} data-sig-surface="light" lang={lang === "es" ? "es" : undefined}>
      <div className="ap-band" data-sig-surface="deep">
        <Mark className="ap-band__mark" />
        <span className="ap-grain" aria-hidden="true" />
        {variant === "signin" ? <>
          <span className="ap-band__wordmark"><BrandWordmark /></span>
          <p className="ap-band__line"><TwoLines text={t.bandLine} /></p>
          {bandTitle ? <div className="ap-band__hero" aria-hidden="true">{bandTitle}</div> : null}
        </> : null}
      </div>
      <div className="ap-main">
        <header className="ap-top">
          {/* The app's wordmark (the official PNG recoloured through a mask, cyan A kept): navy here, white in the phone band. */}
          <span className="ap-wordmark"><BrandWordmark /></span>
          {back ? <Link className="ap-pill" href={back}><CaretLeftIcon size={16} weight="bold" aria-hidden="true" />{t.signInPill}</Link> : null}
          <LangSwitch lang={lang} label={t.langLabel} />
        </header>
        <div className="ap-sheet">
          <div className="ap-col">
            {back ? <Link className="ap-back" href={back}><CaretLeftIcon size={14} weight="bold" aria-hidden="true" />{t.backToSignIn}</Link> : null}
            {children}
          </div>
          <footer className="ap-legal"><BrandLegal lang={lang} /></footer>
        </div>
      </div>
      <aside className="ap-panel" data-sig-surface="deep" aria-label="NEVORA">
        <Mark className="ap-panel__mark" />
        <span className="ap-grain" aria-hidden="true" />
        <div className="ap-panel__copy">
          <p className="ap-panel__eyebrow">{t.panelEyebrow}</p>
          <p className="ap-panel__line"><TwoLines text={t.bandLine} /></p>
          <p className="ap-panel__support">{t.panelSupport}</p>
        </div>
        <Device d={t.device} />
      </aside>
    </main>
  );
}

/** The workspace line above the sign-in greeting: a tile with the initial, then the name. */
export function WorkspaceEyebrow({ name }: { name: string }) {
  return <p className="ap-eyebrow"><i aria-hidden="true">{name.trim().charAt(0).toUpperCase() || "N"}</i>{name}</p>;
}

/** Quiet (v4, approved Oct 23): the sign-in pages on one white page. Sign in has the wordmark and the other language
 * at the top; the other pages have a Sign in back link. The short legal line sits at the bottom. */
export function QuietAuthShell({ lang, t, back, backLabel, helpFrom="login", children }: { lang: AuthLang; t: AuthCopy; back?: string; backLabel?:string;helpFrom?:"login"|"recover"|"reset"|"activate"; children: ReactNode }) {
  const mobile=mobileAccessEnabled();
  return (
    <main id={mobile ? "mobile-access-page" : undefined} className="q-page q-auth" data-nv-page="" data-mobile-access={mobile ? "true" : undefined} lang={lang}>
      <div className="q-auth__col">
        {mobile ? <MobileAccessHeader lang={lang} back={back} backLabel={backLabel}/> : null}
        <div className={mobile ? "ma-desktop" : undefined}>{back ? <QuietNav back={{ href: back, label: t.signInPill }} />
          : <header className="q-auth__top"><span className="q-auth__wordmark"><BrandWordmark /></span><LangSwitch lang={lang} label={t.langLabel} quiet /></header>}</div>
        {mobile ? <div id="access-content" tabIndex={-1}>{children}</div> : children}
      </div>
      <footer className="q-auth__foot">{mobile ? <Link className="ma-footer-help" href={`/access-help?from=${helpFrom}`}>{lang === "es" ? "¿Necesitas ayuda?" : "Need help?"}</Link> : null}<QuietLegal lang={lang} /></footer>
    </main>
  );
}
