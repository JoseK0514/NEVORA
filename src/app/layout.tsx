import {mobileAccessEnabled} from "@/components/mobile-access/config.server";
import {AccessJourneyProvider} from "@/components/mobile-access/journey";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import {DocumentAppearanceScripts} from "./document-appearance-scripts";
import { readAuthLang } from "../lib/auth-lang.server";
import { PORTAL_LANG_COOKIE, signedInDocumentLang } from "../lib/i18n/portal-lang-cookie";
import { SESSION_COOKIE } from "../lib/auth/session-cookie";
import { WebAnalytics } from "../components/web-analytics";
import { NUVORA_BRAND } from "../lib/brand";
import { readFeatureFlags } from "../lib/feature-flags";
import { THEME_SCRIPT } from "../lib/theme";
import "../components/signature/tokens.css";
import "./globals.css";
import "./b-tokens.css";
import "./typeface-theme.css";
import "./mobile-workforce.css";
import "./employee-mobile-corporate.css";
import "../components/signature/components.css";

export const metadata: Metadata = {
  title: NUVORA_BRAND.metadataTitle,
  description: NUVORA_BRAND.metadataDescription,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const TEXT_SCALE_SCRIPT = `(function(){var d=document.documentElement;function s(){var f=parseFloat(getComputedStyle(d).fontSize)||16;d.style.setProperty('--nv-text-scale',String(f/16));var p=f/16*100,n=[100,125,150,200].reduce(function(a,b){return Math.abs(b-p)<Math.abs(a-p)?b:a;});d.setAttribute('data-text-step',String(n));}s();function w(){try{var p=document.createElement('i');p.setAttribute('aria-hidden','true');p.style.cssText='position:absolute;left:0;top:0;width:1rem;height:0;visibility:hidden;pointer-events:none';document.body.appendChild(p);new ResizeObserver(s).observe(p);}catch(e){}}if(document.body)w();else document.addEventListener('DOMContentLoaded',w);})();`;

/**
 * Shared document for public and authenticated routes. Theme and text-scale
 * scripts run before paint to align server markup with device/user appearance.
 * Authentication belongs to app/app/layout.tsx, not this public document root.
 */
/** Review 30 (D37): the document's language. Signed out, the pages speak the sign-in language (the nv-lang choice, else the
 * browser's), so a Spanish page's title is read with Spanish rules; signed in, see the branch-audit note below. The Clocker
 * sets its own from the tablet's choice once it starts.
 * Outside a request (tests, static rendering) it is English. */
/* Branch audit (Nov 26, 2026): signed in, the document starts in the person's saved language as the portal last wrote it
 * (the nv-portal-lang hint, portal-lang-cookie.ts), else the sign-in language; PortalLangProvider still sets the saved
 * choice after load. Before this a signed-in Spanish page arrived as lang="en" until hydration. */
async function documentLang(): Promise<"en" | "es"> {
  try {
    const jar = await cookies();
    if (jar.has(SESSION_COOKIE)) return signedInDocumentLang(jar.get(PORTAL_LANG_COOKIE)?.value, await readAuthLang());
  } catch { return "en"; }
  return readAuthLang();
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  if(process.env.NODE_ENV!=='production')await (await import('../lib/dev/inspection.server')).forceInspectionError('global');
  const lang = await documentLang();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        {/* P3-ST-20: loading placeholders grow with the reader's text size like the pages they stand in for. This tells CSS the
            text scale (root font size ÷ 16) and its nearest measured step (100, 125, 150 or 200%) before first paint, and again whenever the text size changes. Nothing else. */}
        {/* Appearance: light or dark from the choice in Profile and the device setting, set before first paint. */}
        <DocumentAppearanceScripts textScale={TEXT_SCALE_SCRIPT} theme={THEME_SCRIPT} />
      </head>
      <body>
        {mobileAccessEnabled() ? <AccessJourneyProvider>{children}</AccessJourneyProvider> : children}
        {/* Off unless NEVORA_WEB_ANALYTICS_ENABLED is exactly "true"; counts public pages only. */}
        {readFeatureFlags(process.env).webAnalytics ? <WebAnalytics /> : null}
      </body>
    </html>
  );
}
