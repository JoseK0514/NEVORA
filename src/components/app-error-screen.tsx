'use client';
import { useSyncExternalStore } from 'react';
import { RetryLabel } from '@/components/kit/retry-label';
import { useRetry } from '@/components/kit/use-retry';
import '@/components/kit/kit.css';
import './app-error-screen.css';
import { CardBody, KitStack, Masthead } from '@/components/kit/kit';
import { focusAfterRetry } from '@/components/kit/focus-after-retry';
import { ERROR_SCREENS_COPY } from '@/components/error-screens-copy';
import { AUTH_LANG_COOKIE, isAuthLang, preferredAuthLang } from '@/lib/auth-copy';
import { rememberedPortalLang } from '@/lib/i18n/portal-lang';

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

/* Nov 26, 2026 (QA on the Spanish integration): this screen draws when the portal's own layout failed, so the portal's
 * language provider isn't there. It reads the person's language from what is left: the language the portal last rendered
 * in this tab (rememberedPortalLang), then the sign-in cookie, then the browser. Not <html lang>: after the layout fails it
 * is the root layout's signed-in default, "en" (QA R2). The server render is English until it is read. */
const subscribeLang = () => () => {};
function browserLang(): 'en' | 'es' {
  const portal = rememberedPortalLang();
  if (portal) return portal;
  const saved = document.cookie.split('; ').find(part => part.startsWith(`${AUTH_LANG_COOKIE}=`))?.slice(AUTH_LANG_COOKIE.length + 1);
  return isAuthLang(saved) ? saved : preferredAuthLang((navigator.languages?.length ? navigator.languages : [navigator.language]).join(','));
}
export function useErrorLang(): 'en' | 'es' {
  return useSyncExternalStore(subscribeLang, browserLang, () => 'en');
}

/** The reference to show, or null: only a short plain token is ever printed. */
export function errorReference(digest: string | undefined): string | null {
  const value = digest?.trim() ?? '';
  return /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null;
}

/** The portal screens' next step, in the person's language (English by default). */
export const portalErrorAdvice = (online: boolean, lang: 'en' | 'es' = 'en') => online ? ERROR_SCREENS_COPY[lang].adviceOnline : ERROR_SCREENS_COPY[lang].adviceOffline;

/** IS-49: one live region with the whole message; the buttons sit outside it. */
export function ErrorSpoken({digest, lang = 'en'}: {digest?: string; lang?: 'en' | 'es'}) {
  const online = useOnline(), reference = errorReference(digest);
  return <p className="nv-sr" role="alert">{ERROR_SCREENS_COPY[lang].spoken(portalErrorAdvice(online, lang), reference)}</p>;
}

/** The visible next step and, when there is one, the reference under it. */
export function ErrorAdvice({digest, className, lang = 'en'}: {digest?: string; className: string; lang?: 'en' | 'es'}) {
  const online = useOnline(), reference = errorReference(digest);
  return <>
    <p className={className}>{portalErrorAdvice(online, lang)}</p>
    {reference ? <p className="app-error-screen__ref">{ERROR_SCREENS_COPY[lang].reference(reference)}</p> : null}
  </>;
}

/** WR-57/58: the screen for failures above the portal's own boundary (app/app/error.tsx).
 * Same words as that boundary, drawn with the kit itself: the teal band with the wordmark, a white card, kit buttons. */
export function AppErrorScreen({reset, digest}: {reset: () => void; digest?: string}) {
  // Nov 26, 2026 (Jose): Try again shows it is working ("Trying again…", the arrow turning) and keeps focus.
  const { busy, retry } = useRetry(() => { reset(); focusAfterRetry('main:not(.app-error-screen) h1, #main-content h1', '.app-error-screen .nv-btn[data-kind="primary"]'); });
  const lang = useErrorLang(), t = ERROR_SCREENS_COPY[lang];
  return <main className="nv-page app-error-screen" lang={lang}>
    <Masthead title={t.didntLoad} summary={t.nothingChanged} />
    <KitStack>
      <ErrorSpoken digest={digest} lang={lang} />
      <section className="nv-card">
        <CardBody>
          <ErrorAdvice digest={digest} className="app-error-screen__text" lang={lang} />
          <div className="app-error-screen__actions">
            <button type="button" className="nv-btn" data-kind="primary" aria-busy={busy || undefined} aria-disabled={busy || undefined} onClick={busy ? undefined : retry}><RetryLabel busy={busy} idle={t.tryAgain} working={t.tryingAgain} /></button>
            {/* eslint-disable-next-line next-preserved/no-html-link-for-pages -- the app shell itself may be what failed, so leave it with a full document load */}
            <a className="nv-btn" data-kind="secondary" href="/app">{t.goHome}</a>
          </div>
        </CardBody>
      </section>
    </KitStack>
  </main>;
}
