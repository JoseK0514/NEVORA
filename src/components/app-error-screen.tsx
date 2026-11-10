'use client';
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowsClockwise";
import '@/components/kit/kit.css';
import './app-error-screen.css';
import { CardBody, KitStack, Masthead } from '@/components/kit/kit';
import { focusAfterRetry } from '@/components/kit/focus-after-retry';

/** WR-57/58: the screen for failures above the portal's own boundary (app/app/error.tsx).
 * Same words as that boundary, drawn with the kit itself: the teal band with the wordmark, a white card, kit buttons. */
export function AppErrorScreen({reset}: {reset: () => void}) {
  return <main className="nv-page app-error-screen">
    <Masthead title="This page didn’t load" summary="Nothing was changed." />
    <KitStack>
      {/* IS-49: one live region with the whole message; the buttons sit outside it. */}
      <p className="nv-sr" role="alert">This page didn’t load. Nothing was changed. Check your connection, then try again.</p>
      <section className="nv-card">
        <CardBody>
          <p className="app-error-screen__text">Check your connection, then try again.</p>
          <div className="app-error-screen__actions">
            <button type="button" className="nv-btn" data-kind="primary" onClick={() => { reset(); focusAfterRetry('[data-nv-page] [data-nv-band] h1', '.app-error-screen .nv-btn[data-kind="primary"]'); }}><ArrowsClockwiseIcon size={18} aria-hidden="true" />Try again</button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the app shell itself may be what failed, so leave it with a full document load */}
            <a className="nv-btn" data-kind="secondary" href="/app">Go to Home</a>
          </div>
        </CardBody>
      </section>
    </KitStack>
  </main>;
}
