'use client';
import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { RetryLabel } from '@/components/kit/retry-label';
import { useRetry } from '@/components/kit/use-retry';
import { BrandWordmark } from '@/components/brand-mark';
import { AppErrorScreen, errorReference, useOnline } from '@/components/app-error-screen';
import { SupportReference } from '@/components/access-recovery/support-reference';
import { supportReferenceOfState } from '@/components/access-recovery/support-reference-seam';
import { LangSwitch } from '@/components/auth-premium/lang-switch';
import { SignedOutFooter } from '@/components/auth-premium/signed-out-footer';
import { focusAfterRetry } from '@/components/kit/focus-after-retry';
import { AUTH_COPY, AUTH_LANG_COOKIE, isAuthLang, preferredAuthLang, type AuthLang } from '@/lib/auth-copy';
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
 * short reference shows when there is one, offline the connection wording stays (RA-15).
 * Phase 5 (Nov 17, 2026): the "Support reference" block U11 built is mounted here. It shows only a reference the seam
 * accepts (`supportReferenceOfState`: a UUID the failure itself carries); a boundary error carries none today, so the
 * block renders nothing and the short "Reference:" line stays. When one arrives it replaces that line, so a person is
 * never given two references to quote. */
export function PublicErrorScreen({reset, digest, error}: {reset: () => void; digest?: string; error?: unknown}) {
  const lang = useSyncExternalStore(subscribeLang, browserLang, serverLang), online = useOnline();
  const t = AUTH_COPY[lang], words = t.errorScreen, advice = online ? words.server : words.offline;
  const support = supportReferenceOfState(error);
  const found = support ? null : errorReference(digest), reference = found ? words.reference.replace('{reference}', found) : null;
  // Nov 26, 2026 (Jose): Try again shows it is working and keeps focus while the page is read again.
  const { busy, retry } = useRetry(() => { reset(); focusAfterRetry('main:not(.pe-page) h1, .q-auth h1', '.pe-page .pe-retry', undefined, { waitForGone: '.pe-page' }); });
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
        <SupportReference reference={support} lang={lang} id="public-error-reference" />
        <div className="pe-actions">
          <button type="button" className="nf-cta pe-retry" aria-busy={busy || undefined} aria-disabled={busy || undefined} onClick={busy ? undefined : retry}><RetryLabel busy={busy} idle={words.retry} working={words.retrying} /></button>
          {/* A plain link: what failed may be the page's own layout, so sign in starts with a full document load. */}
          <a className="nf-cta pe-signin" href="/login">{words.signIn}</a>
        </div>
      </div>
      {/* Phase 8 (Nov 17, 2026): the footer every signed-out page shares, as on the 404. */}
      <footer className="nf-foot"><SignedOutFooter lang={lang}/></footer>
    </section>
  </main>;
}

/** The root and global boundaries: the portal (/app) keeps its in-app screen; every other address gets the public one. */
export function RootErrorScreen({reset, digest, error}: {reset: () => void; digest?: string; error?: unknown}) {
  const path = usePathname() ?? '';
  return path === '/app' || path.startsWith('/app/') ? <AppErrorScreen reset={reset} digest={digest}/> : <PublicErrorScreen reset={reset} digest={digest} error={error}/>;
}
