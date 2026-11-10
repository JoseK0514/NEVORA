'use client';
import { usePathname } from 'next/navigation';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { BrandWordmark } from '@/components/brand-mark';
import { AppErrorScreen } from '@/components/app-error-screen';
import { focusAfterRetry } from '@/components/kit/focus-after-retry';
import { NUVORA_BRAND } from '@/lib/brand';
import '@/app/not-found.css';
import './public-error-screen.css';

/** Signed-out and public addresses (Direction B, Nov 8, 2026): the 404's teal band and reading card, with the portal
 * boundary's own words, Try again and the way to sign in. */
export function PublicErrorScreen({reset}: {reset: () => void}) {
  return <main className="nf-page pe-page">
    <header className="nf-band">
      <span className="nf-wordmark"><BrandWordmark/></span>
      <h1 id="public-error-title">This page could not be loaded</h1>
      <p className="nf-eyebrow">Something went wrong</p>
    </header>
    <section className="nf-sheet" aria-labelledby="public-error-title">
      <div className="nf-card">
        {/* One live region with the whole message; the buttons sit outside it (as on the portal's screen). */}
        <p className="nv-sr pe-sr" role="alert">This page could not be loaded. Your current information is unavailable. Try loading the page again before taking an action.</p>
        <p className="not-found-text">Your current information is unavailable. Try loading the page again before taking an action.</p>
        <div className="pe-actions">
          <button type="button" className="nf-cta pe-retry" onClick={() => { reset(); focusAfterRetry('main:not(.pe-page) h1, .q-auth h1', '.pe-page .pe-retry'); }}><ArrowsClockwiseIcon size={18} aria-hidden="true"/>Try again</button>
          {/* A plain link: what failed may be the page's own layout, so sign in starts with a full document load. */}
          <a className="nf-cta pe-signin" href="/login">Go to sign in</a>
        </div>
      </div>
      {/* Review B4 (Nov 10, 2026, NV-206): the 404's footer without the old lockup and its sub-12px lines. */}
      <footer className="nf-foot"><small>{NUVORA_BRAND.poweredBy}</small></footer>
    </section>
  </main>;
}

/** The root and global boundaries: the portal (/app) keeps its in-app screen; every other address gets the public one. */
export function RootErrorScreen({reset}: {reset: () => void}) {
  const path = usePathname() ?? '';
  return path === '/app' || path.startsWith('/app/') ? <AppErrorScreen reset={reset}/> : <PublicErrorScreen reset={reset}/>;
}
