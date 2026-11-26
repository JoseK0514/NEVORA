'use client';
import { useSyncExternalStore } from 'react';
import { RetryLabel } from '@/components/kit/retry-label';
import { useRetry } from '@/components/kit/use-retry';
import '@/components/kit/kit.css';
import './app-error-screen.css';
import { CardBody, KitStack, Masthead } from '@/components/kit/kit';
import { focusAfterRetry } from '@/components/kit/focus-after-retry';

/* Inspection Nov 14, 2026 (RA-15): the error screens no longer always blame the connection. The browser's own online
 * flag decides: online, the fault is ours and the screen shows the short reference Next.js gives a server failure
 * (error.digest), for support to quote; offline, the connection wording stays. The server render assumes online. */
const subscribeOnline = (changed: () => void) => {
  window.addEventListener('online', changed); window.addEventListener('offline', changed);
  return () => { window.removeEventListener('online', changed); window.removeEventListener('offline', changed); };
};
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

/** The reference to show, or null: only a short plain token is ever printed. */
export function errorReference(digest: string | undefined): string | null {
  const value = digest?.trim() ?? '';
  return /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null;
}

/** The portal screens' next step (the portal is in English). */
export const portalErrorAdvice = (online: boolean) => online ? 'Something went wrong on our side. Try again.' : 'Check your connection, then try again.';

/** IS-49: one live region with the whole message; the buttons sit outside it. */
export function ErrorSpoken({digest}: {digest?: string}) {
  const online = useOnline(), reference = errorReference(digest);
  return <p className="nv-sr" role="alert">{`This page didn’t load. Nothing was changed. ${portalErrorAdvice(online)}${reference ? ` Reference: ${reference}` : ''}`}</p>;
}

/** The visible next step and, when there is one, the reference under it. */
export function ErrorAdvice({digest, className}: {digest?: string; className: string}) {
  const online = useOnline(), reference = errorReference(digest);
  return <>
    <p className={className}>{portalErrorAdvice(online)}</p>
    {reference ? <p className="app-error-screen__ref">{`Reference: ${reference}`}</p> : null}
  </>;
}

/** WR-57/58: the screen for failures above the portal's own boundary (app/app/error.tsx).
 * Same words as that boundary, drawn with the kit itself: the teal band with the wordmark, a white card, kit buttons. */
export function AppErrorScreen({reset, digest}: {reset: () => void; digest?: string}) {
  // Nov 26, 2026 (Jose): Try again shows it is working ("Trying again…", the arrow turning) and keeps focus.
  const { busy, retry } = useRetry(() => { reset(); focusAfterRetry('[data-nv-page] [data-nv-band] h1', '.app-error-screen .nv-btn[data-kind="primary"]'); });
  return <main className="nv-page app-error-screen">
    <Masthead title="This page didn’t load" summary="Nothing was changed." />
    <KitStack>
      <ErrorSpoken digest={digest} />
      <section className="nv-card">
        <CardBody>
          <ErrorAdvice digest={digest} className="app-error-screen__text" />
          <div className="app-error-screen__actions">
            <button type="button" className="nv-btn" data-kind="primary" aria-busy={busy || undefined} aria-disabled={busy || undefined} onClick={busy ? undefined : retry}><RetryLabel busy={busy} idle="Try again" working="Trying again…" /></button>
            {/* eslint-disable-next-line next-preserved/no-html-link-for-pages -- the app shell itself may be what failed, so leave it with a full document load */}
            <a className="nv-btn" data-kind="secondary" href="/app">Go to Home</a>
          </div>
        </CardBody>
      </section>
    </KitStack>
  </main>;
}
