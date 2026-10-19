"use client";

import Link from "next/link";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowsClockwise";
import { Card, PageBand } from "@/components/kit/kit";
import { focusAfterRetry } from "@/components/kit/focus-after-retry";

/** A failed Coverage read keeps the page’s band and says what to do next. retry() reads the server again, then redraws. */
export default function CoverageError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <div className="nv-page wa-page wa-coverage" data-nv-page="">
    <PageBand back={{ href: "/app/schedule", label: "Schedule" }} eyebrow="Coverage" title="Cover this shift" summary="This shift’s coverage couldn’t load." />
    <div className="nv-content wa-narrow">
      <div role="alert">
        <Card title="Couldn’t load coverage">
          <div className="wa-card-body">
            <p className="wa-text">Nothing was changed. Try again, or go back to the schedule.</p>
            <button type="button" className="nv-btn" data-kind="primary" data-block="true" onClick={() => { retry(); focusAfterRetry(".wa-coverage [data-nv-band] h1", ".wa-coverage .nv-btn[data-kind=\"primary\"]"); }}>
              <ArrowsClockwiseIcon size={18} weight="bold" aria-hidden="true" />Try again
            </button>
            <Link className="nv-btn" data-kind="secondary" data-block="true" href="/app/schedule">Back to schedule</Link>
          </div>
        </Card>
      </div>
    </div>
  </div>;
}
