"use client";

import type { ReactNode } from "react";
import { focusAfterRetry } from "@/components/kit/focus-after-retry";
import { BButton, BButtonLink, BState, BStateScreen } from "./b-kit";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { useRetry } from "@/components/kit/use-retry";
import { ERROR_SCREENS_COPY } from "@/components/error-screens-copy";

/** Phase 2 (package D): a page that failed to load, drawn once for every route error (the app's own error.tsx and the
 * page-level ones). The band keeps the page's title and way back; one card under it has the red state, the sentence, one
 * Try again and one way out. One live region says the whole message (`spoken`, IS-49); the card is its visible copy and
 * the buttons sit outside the region. After Try again, focus goes to the recovered page's title, or back to the button if
 * it failed again (IS-58). Words come from the caller, unchanged. */
export function BRouteError({ title, sub, back, spoken, cardTitle, line, reference, onRetry, retryHref, away }: {
  title: ReactNode; sub?: ReactNode; back?: { href: string; label: string };
  /** The one announcement, in full. */
  spoken: ReactNode;
  cardTitle?: ReactNode; line: ReactNode;
  /** Next's short reference for support, when the fault is ours. */
  reference?: string | null;
  /** Try again reads the server again… */
  onRetry?: () => void;
  /** …or, on a page the server draws, opens the same view again. */
  retryHref?: string;
  /** The way out beside Try again. */
  away?: { href: string; label: ReactNode };
}) {
  const t = ERROR_SCREENS_COPY[usePortalLang() === "es" ? "es" : "en"];
  // Nov 26, 2026 (Jose): a real loading state. The button says "Trying again…" with the spinner, at the same width, while
  // the page is read again, and keeps focus (keepFocus) so focusAfterRetry can return to it if it fails again.
  const { busy, retry } = useRetry(() => { onRetry?.(); focusAfterRetry("#main-content h1:not(#b-route-error-title)", "[data-b-route-error] .b-btn--teal"); });
  return <div className="c-page c-page--narrow c-route-state c-route-state--checking" data-corp="" data-b-route-error="">
    <BStateScreen title={title} titleId="b-route-error-title" sub={sub} back={back}>
      <p className="b-sr" role="alert">{spoken}</p>
      <BState silent kind="failed" title={cardTitle} line={line}>
        {reference ? <p className="b-statecard__ref">{reference}</p> : null}
        <div className="b-state-actions">
          {retryHref ? <BButtonLink href={retryHref} kind="teal">{t.tryAgain}</BButtonLink> : <BButton kind="teal" onClick={retry} busy={busy} busyLabel={t.tryingAgain} keepFocus>{t.tryAgain}</BButton>}
          {away ? <BButtonLink href={away.href} kind="quiet">{away.label}</BButtonLink> : null}
        </div>
      </BState>
    </BStateScreen>
  </div>;
}
