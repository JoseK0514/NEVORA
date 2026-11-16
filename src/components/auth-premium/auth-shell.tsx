import {mobileAccessEnabled} from "@/components/mobile-access/config.server";
import {MobileAccessHeader} from "@/components/mobile-access/chrome";
import "@/components/mobile-access/mobile-access.css";
import "./auth-b.css";
// Quiet's base styles come after Access and auth-b, as they did when the shell imported QuietNav.
import "@/components/quiet/quiet.css";
import { NUVORA_BRAND } from "@/lib/brand";
import type { ReactNode } from "react";
import Link from "next/link";
import { QuietLegal } from "@/components/brand-legal";
import { BrandWordmark } from "@/components/brand-mark";
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

/** Quiet (v4, approved Oct 23): the sign-in pages on one white page. Sign in has the wordmark and the other language
 * at the top; the other pages have a Sign in back link. The short legal line sits at the bottom.
 * Review B4 (Nov 10, 2026): every page keeps the language switch; `brandArt` takes the brand panel's place of the
 * product line (Welcome's illustration), `hero` sits in the phone band above the card, and `footerHelp` is off where
 * "Need help?" would point at the page itself. */
export function QuietAuthShell({ lang, t, back, backLabel, helpFrom="login", brandArt, hero, footerHelp=true, children }: { lang: AuthLang; t: AuthCopy; back?: string; backLabel?:string;helpFrom?:"login"|"recover"|"reset"|"activate"; brandArt?: ReactNode; hero?: ReactNode; footerHelp?: boolean; children: ReactNode }) {
  const mobile=mobileAccessEnabled();
  return (
    <main id={mobile ? "mobile-access-page" : undefined} className="q-page q-auth" data-nv-page="" data-mobile-access={mobile ? "true" : undefined} lang={lang}>
      {/* Direction B (Jose, Nov 8, 2026): on a desktop the teal brand panel with the app's own product line sits beside the
        * form card (auth-b.css shows it from 1024px); phones and tablets carry the brand in the band above the card. */}
      <aside className="q-auth__brand" aria-label="NEVORA">
        <span className="q-auth__brandmark"><BrandWordmark /></span>
        {brandArt ? <div className="q-auth__brandart">{brandArt}</div>
          : <div className="q-auth__brandcopy"><p className="q-auth__eyebrow">{t.panelEyebrow}</p><p className="q-auth__line"><TwoLines text={t.bandLine} /></p><p className="q-auth__support">{t.panelSupport}</p></div>}
        <small className="q-auth__powered">{NUVORA_BRAND.poweredBy}</small>
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
