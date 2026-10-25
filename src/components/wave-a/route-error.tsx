"use client";

import Link from "next/link";
import { focusAfterRetry } from "@/components/kit/focus-after-retry";
import { QuietSystemState } from "@/components/quiet-system-state";

/** A failed read on a Wave A page (T-21): the Quiet error state under the page's ‹ Parent bar. Try again reads the
 * server again; the second action goes back. One live region carries the message (IS-49). */
export function WaveARouteError({ retry, title, back }: { retry: () => void; title: string; back: { href: string; label: string } }) {
  return <QuietSystemState kind="error" alert back={back} sentence={`${title} didn’t load. Nothing was changed. Check your connection and try again.`}
    primary={<button type="button" className="q-btn q-btn--sec" onClick={() => { retry(); focusAfterRetry("[data-nv-page]:not([data-system-state]) h1", "[data-system-state=\"error\"] .q-btn--sec"); }}>Try again</button>}
    secondary={<Link className="q-btn q-btn--quiet" href={back.href}>Back to {back.label}</Link>} />;
}
