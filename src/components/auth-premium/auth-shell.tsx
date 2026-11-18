import {mobileAccessEnabled} from "@/components/mobile-access/config.server";
import {MobileAccessHeader} from "@/components/mobile-access/chrome";
import "@/components/mobile-access/mobile-access.css";
import "./auth-b.css";
// Quiet's base styles come after Access and auth-b, as they did when the shell imported QuietNav.
import "@/components/quiet/quiet.css";
import type { ReactNode } from "react";
import Link from "next/link";
import { QuietLegal } from "@/components/brand-legal";
import { BrandWordmark } from "@/components/brand-mark";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { TranslateIcon } from "@phosphor-icons/react/dist/ssr/Translate";
import { LifebuoyIcon } from "@phosphor-icons/react/dist/ssr/Lifebuoy";
import type { AuthCopy, AuthLang } from "@/lib/auth-copy";
import { LangSwitch } from "./lang-switch";
import { AuthBackNav } from "./auth-back-nav";

/* The sign-in pages' shell. Review F2 (NV-233): the retired E4 shell (AuthShell, its decorative device and mark, and
 * WorkspaceEyebrow) had no callers and is gone; QuietAuthShell is the one shell. */

/** "Your week, / in one place.": the brand line breaks after its first comma, as in the approved design. Each half is
 * its own span so a narrow desktop never breaks inside one (review B4, NV-310). */
function TwoLines({ text }: { text: string }) {
  const at = text.indexOf(", ");
  return at < 0 ? <>{text}</> : <><span className="q-auth__half">{text.slice(0, at + 1)}</span><br /><span className="q-auth__half">{text.slice(at + 2)}</span></>;
}

const SUPPORT_EMAIL = "support@thevelani.com";

/** The front door's proof rows (Phase 5, Nov 17, 2026, PB-010 and PB-011): the bare domain opens on sign-in, so the
 * page says in three quiet lines that sign-in is protected, which parts read in Spanish, and where help is. On a desktop
 * they are the brand panel's foot (where "Powered by VELANI LLC" repeated the footer); with `page`, Sign in shows the
 * same rows under its links on phones and tablets, where there is no panel. Exactly one of the two is displayed.
 * In the panel the address is text, so the keyboard's first stop on every signed-out page stays the page's own
 * controls; under the links it is a mail link, after the page's actions. */
export function AuthProof({ t, page = false }: { t: AuthCopy; page?: boolean }) {
  return <ul className={`q-auth__proof${page ? " q-auth__proof--page" : ""}`} aria-label={t.proof.label}>
    <li><ShieldCheckIcon size={20} weight="bold" aria-hidden="true" /><span>{t.proof.security}</span></li>
    <li><TranslateIcon size={20} weight="bold" aria-hidden="true" /><span>{t.proof.languages}</span></li>
    <li><LifebuoyIcon size={20} weight="bold" aria-hidden="true" /><span>{t.proof.helpBefore}{page ? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> : <b>{SUPPORT_EMAIL}</b>}{t.proof.helpAfter}</span></li>
  </ul>;
}

/** Quiet (v4, approved Oct 23): the sign-in pages on one white page. Sign in has the wordmark and the other language
 * at the top; the other pages have a Sign in back link. The short legal line sits at the bottom.
 * Review B4 (Nov 10, 2026): every page keeps the language switch; `brandArt` takes the brand panel's place of the
 * product line (Welcome's illustration), `hero` sits in the phone band above the card, and `footerHelp` is off where
 * "Need help?" would point at the page itself.
 * Phase 5 (Nov 17, 2026): the panel has no eyebrow (it repeated the wordmark above it) and ends with the proof rows
 * (PB-011). What a page offers besides its form sits under the card as text links: a `nav.q-auth__links`, or a
 * `div.q-auth__under` holding one, as the column's last child (PB-015; auth-b.css places it at every width). */
export function QuietAuthShell({ lang, t, back, backLabel, helpFrom="login", brandArt, hero, footerHelp=true, children }: { lang: AuthLang; t: AuthCopy; back?: string; backLabel?:string;helpFrom?:"login"|"recover"|"reset"|"activate"; brandArt?: ReactNode; hero?: ReactNode; footerHelp?: boolean; children: ReactNode }) {
  const mobile=mobileAccessEnabled();
  return (
    <main id={mobile ? "mobile-access-page" : undefined} className="q-page q-auth" data-nv-page="" data-mobile-access={mobile ? "true" : undefined} lang={lang}>
      {/* Direction B (Jose, Nov 8, 2026): on a desktop the teal brand panel with the app's own product line sits beside the
        * form card (auth-b.css shows it from 1024px); phones and tablets carry the brand in the band above the card. */}
      <aside className="q-auth__brand" aria-label="NEVORA">
        <span className="q-auth__brandmark"><BrandWordmark /></span>
        {brandArt ? <div className="q-auth__brandart">{brandArt}</div>
          : <div className="q-auth__brandcopy"><p className="q-auth__line"><TwoLines text={t.bandLine} /></p><p className="q-auth__support">{t.panelSupport}</p></div>}
        <AuthProof t={t} />
      </aside>
      <div className="q-auth__col">
        {mobile ? <MobileAccessHeader lang={lang} back={back} backLabel={backLabel}/> : null}
        <div className={mobile ? "ma-desktop" : undefined}>{back ? <AuthBackNav href={back} label={backLabel ?? t.signInPill} lang={lang} t={t} />
          : <header className="q-auth__top"><span className="q-auth__wordmark"><BrandWordmark /></span><LangSwitch lang={lang} label={t.langLabel} quiet /></header>}</div>
        {mobile && hero ? <div className="ma-hero">{hero}</div> : null}
        {mobile ? <div id="access-content" tabIndex={-1}>{children}</div> : children}
      </div>
      <footer className="q-auth__foot">{mobile && footerHelp ? <Link className="ma-footer-help" href={`/access-help?from=${helpFrom}`}>{lang === "es" ? "¿Necesitas ayuda?" : "Need help?"}</Link> : null}<QuietLegal lang={lang} /></footer>
    </main>
  );
}
