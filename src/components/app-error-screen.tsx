'use client';
import '@/components/quiet/quiet.css';
import '@/components/quiet/u1.css';
import { BrandWordmark } from '@/components/brand-mark';
import { focusAfterRetry } from '@/components/kit/focus-after-retry';
import { SYSTEM_STATE_COPY } from '@/components/quiet-system-state';

/** WR-57/58: the screen for failures above the portal's own boundary (app/app/error.tsx). T-21: the same Quiet error
 * state, with the wordmark on top because the shell itself may be what failed. */
export function AppErrorScreen({reset}: {reset: () => void}) {
  const copy = SYSTEM_STATE_COPY.error;
  return <main className="q-page q-unavailable u1-state app-error-screen" data-nv-page="" data-system-state="error">
    <header className="q-auth__top"><span className="q-auth__wordmark"><BrandWordmark /></span></header>
    <div className="q-hd"><h1>{copy.title}</h1></div>
    {/* IS-49: one live region with the whole message; the buttons sit outside it. */}
    <div role="alert"><p className="q-body">{copy.sentence}</p></div>
    <button type="button" className="q-btn q-btn--sec" onClick={() => { reset(); focusAfterRetry('[data-nv-page]:not([data-system-state]) h1', '.app-error-screen .q-btn--sec'); }}>Try again</button>
    {/* A plain link: the app shell itself may be what failed, so leave it with a full load. */}
    <a className="q-btn q-btn--quiet" href="/app">Back to Home</a>
  </main>;
}
