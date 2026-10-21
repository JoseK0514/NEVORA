"use client";

import Link from "next/link";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowsClockwise";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { focusAfterRetry } from "@/components/kit/focus-after-retry";
import { EmptyState, SettingsFrame } from "../wave-c-kit";

/** Locations couldn't be read: say so, offer one retry, and a way back. Nothing was changed. */
export default function LocationsError({ reset, retry }: { error?: Error & { digest?: string }; reset: () => void; retry?: () => void }) {
  return (
    <SettingsFrame title="Your workplaces" summary="Where your team works, each place’s scheduling setup and its Clocker link." className="wc-error-page">
      <p className="nv-sr" role="alert">Couldn’t load your workplaces. Try again to see the latest setup and Clocker links.</p>
      <section className="nv-card" aria-labelledby="locations-error-title">
        <EmptyState tone="urgent" icon={<WarningCircleIcon size={22} weight="bold" />} titleId="locations-error-title" title="Couldn’t load your workplaces."
          action={<>
            <button type="button" className="nv-btn" data-kind="primary" onClick={() => { (retry ?? reset)(); focusAfterRetry(".wc-page:not(.wc-error-page) [data-nv-band] h1", ".wc-error-page .nv-btn[data-kind='primary']"); }}><ArrowsClockwiseIcon size={18} aria-hidden="true" />Try again</button>
            <Link className="nv-btn" data-kind="secondary" href="/app/settings">Back to Settings</Link>
          </>}>
          Try again to see the latest setup and Clocker links. Nothing was changed.
        </EmptyState>
      </section>
    </SettingsFrame>
  );
}
