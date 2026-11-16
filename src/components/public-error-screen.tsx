'use client';
import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { BrandWordmark } from '@/components/brand-mark';
import { AppErrorScreen, errorReference, useOnline } from '@/components/app-error-screen';
import { LangSwitch } from '@/components/auth-premium/lang-switch';
import { focusAfterRetry } from '@/components/kit/focus-after-retry';
import { AUTH_COPY, AUTH_LANG_COOKIE, isAuthLang, preferredAuthLang, type AuthLang } from '@/lib/auth-copy';
import { NUVORA_BRAND } from '@/lib/brand';
import '@/app/not-found.css';
import './public-error-screen.css';

/* The sign-in language on a screen the server can't render for: the nv-lang cookie the switch sets, else the browser's
 * own preference, as the sign-in pages decide it (inspection Nov 14, 2026, PB-025 and PB-020). English until it is read. */
const subscribeLang = () => () => {};
const serverLang = (): AuthLang => 'en';
function browserLang(): AuthLang {
  const saved = document.cookie.split('; ').find(part => part.startsWith(`${AUTH_LANG_COOKIE}=`))?.slice(AUTH_LANG_COOKIE.length + 1);
  return isAuthLang(saved) ? saved : preferredAuthLang((navigator.languages?.length ? navigator.languages : [navigator.language]).join(','));
}

/** Signed-out and public addresses (Direction B, Nov 8, 2026): the 404's teal band and reading card, with the portal
 * boundary's own words, Try again and the way to sign in.
 * Inspection Nov 14, 2026: in English or Spanish with the language switch (PB-025); online, the fault is ours and the
 * short reference shows when there is one, offline the connection wording stays (RA-15). */
export function PublicErrorScreen({reset, digest}: {reset: () => void; digest?: string}) {
  const lang = useSyncExternalStore(subscribeLang, browserLang, serverLang), online = useOnline();
  const t = AUTH_COPY[lang], words = t.errorScreen, advice = online ? words.server : words.offline;
  const found = errorReference(digest), reference = found ? words.reference.replace('{reference}', found) : null;
  return <main className="nf-page pe-page" lang={lang}>
    <header className="nf-band">
      <div className="nf-top"><span className="nf-wordmark"><BrandWordmark/></span><LangSwitch lang={lang} label={t.langLabel} quiet/></div>
      <h1 id="public-error-title">{words.title}</h1>
      <p className="nf-eyebrow">{words.eyebrow}</p>
    </header>
    <section className="nf-sheet" aria-labelledby="public-error-title">
      <div className="nf-card">
        {/* One live region with the whole message; the buttons sit outside it (as on the portal's screen). */}
        <p className="nv-sr pe-sr" role="alert">{`${words.title}. ${advice}${reference ? ` ${reference}` : ''}`}</p>
        <p className="not-found-text">{advice}</p>
        {reference ? <p className="pe-ref">{reference}</p> : null}
        <div className="pe-actions">
          <button type="button" className="nf-cta pe-retry" onClick={() => { reset(); focusAfterRetry('main:not(.pe-page) h1, .q-auth h1', '.pe-page .pe-retry'); }}><ArrowsClockwiseIcon size={18} weight="bold" aria-hidden="true"/>{words.retry}</button>
          {/* A plain link: what failed may be the page's own layout, so sign in starts with a full document load. */}
          <a className="nf-cta pe-signin" href="/login">{words.signIn}</a>
        </div>
      </div>
      {/* Review B4 (Nov 10, 2026, NV-206): the 404's footer without the old lockup and its sub-12px lines. */}
      <footer className="nf-foot"><small>{NUVORA_BRAND.poweredBy}</small></footer>
    </section>
  </main>;
}

/** The root and global boundaries: the portal (/app) keeps its in-app screen; every other address gets the public one. */
export function RootErrorScreen({reset, digest}: {reset: () => void; digest?: string}) {
  const path = usePathname() ?? '';
  return path === '/app' || path.startsWith('/app/') ? <AppErrorScreen reset={reset} digest={digest}/> : <PublicErrorScreen reset={reset} digest={digest}/>;
}
