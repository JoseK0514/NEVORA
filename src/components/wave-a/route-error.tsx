"use client";

import Link from "next/link";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowsClockwise";
import { Card, PageBand } from "@/components/kit/kit";
import { focusAfterRetry } from "@/components/kit/focus-after-retry";

/** A failed read on a Wave A page: the page's band, one card, Try again (reads the server again) and a way back.
 * One live region carries the message; the buttons sit outside it (IS-49). */
export function WaveARouteError({ retry, title, back }: { retry: () => void; title: string; back: { href: string; label: string } }) {
  return <div className="nv-page wa-page wa-error" data-nv-page="">
    <PageBand back={back} title={title} summary="This page didn’t load." />
    <p className="nv-sr" role="alert">{title} didn’t load. Nothing was changed. Check your connection, then try again.</p>
    <div className="nv-content wa-narrow">
      <Card title={`${title} didn’t load`}>
        <div className="wa-card-body">
          <p className="wa-text">Nothing was changed. Check your connection, then try again.</p>
          <button type="button" className="nv-btn" data-kind="primary" data-block="true" onClick={() => { retry(); focusAfterRetry(".wa-page:not(.wa-error) [data-nv-band] h1", ".wa-error .nv-btn[data-kind=\"primary\"]"); }}>
            <ArrowsClockwiseIcon size={18} weight="bold" aria-hidden="true" />Try again
          </button>
          <Link className="nv-btn" data-kind="secondary" data-block="true" href={back.href}>Back to {back.label}</Link>
        </div>
      </Card>
    </div>
  </div>;
}
