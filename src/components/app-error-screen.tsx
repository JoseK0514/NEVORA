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
    <Masthead title="This page could not be loaded" summary="Your current information is unavailable." />
    <KitStack>
      {/* IS-49: one live region with the whole message; the buttons sit outside it. */}
      <p className="nv-sr" role="alert">This page could not be loaded. Your current information is unavailable. Try loading the page again before taking an action.</p>
      <section className="nv-card">
        <CardBody>
          <p className="app-error-screen__text">Try loading the page again before taking an action.</p>
          <div className="app-error-screen__actions">
            <button type="button" className="nv-btn" data-kind="primary" onClick={() => { reset(); focusAfterRetry('[data-nv-page] [data-nv-band] h1', '.app-error-screen .nv-btn[data-kind="primary"]'); }}><ArrowsClockwiseIcon size={18} aria-hidden="true" />Try again</button>
            {/* A plain link: the app shell itself may be what failed, so leave it with a full load. */}
            <a className="nv-btn" data-kind="secondary" href="/app">Back to Home</a>
          </div>
        </CardBody>
      </section>
    </KitStack>
  </main>;
}
