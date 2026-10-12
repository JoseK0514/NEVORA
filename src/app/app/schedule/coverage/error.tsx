"use client";

import Link from "next/link";
import { ArrowClockwiseIcon, ArrowLeftIcon, WarningCircleIcon } from "@phosphor-icons/react";
import "@/components/coverage-assistant.css";

export default function CoverageError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <div className="coverage-assistant">
    <Link className="coverage-back" href="/app/schedule"><ArrowLeftIcon size={18} aria-hidden="true" />Back to Schedule</Link>
    <section className="coverage-results coverage-empty coverage-state-stale" role="alert">
      <span className="coverage-state-icon"><WarningCircleIcon size={34} weight="duotone" aria-hidden="true" /></span>
      <h1>Coverage review unavailable</h1>
      <p>We could not load the current coverage details. Try again to review this shift.</p>
      <button className="button primary" type="button" onClick={retry}><ArrowClockwiseIcon size={19} aria-hidden="true" />Try again</button>
    </section>
  </div>;
}
