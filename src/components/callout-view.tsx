import { ReviewedCalloutForm } from "./reviewed-callout-form";
import { Card, KitLink, PageBand } from "./kit/kit";
import { Notice } from "./wave-a/parts";
import { SwapShiftSummary } from "./swap-shift-summary";
import { CalloutSentBoundary } from "./wave-a/callout-sent";
import type { ExchangeShift } from "../lib/data/exchanges";

/** Phase 3.5 Wave A: "Unable to work" on the kit (Employee and Lead). The shift, what happens next, then the reason. */
export function CalloutView({
  shift,
  fields,
  error,
}: {
  shift: ExchangeShift;
  fields: Readonly<Record<string, string>> | null;
  error?: string;
}) {
  return (
    <CalloutSentBoundary shift={shift}>
    <div className="nv-page wa-page wa-callout" data-nv-page="">
      <PageBand back={{ href: "/app/exchange?tab=my", label: "Shift requests" }} title="Unable to work" summary="Tell your manager you can’t work this shift." />
      <div className="nv-content wa-narrow">
        {error ? (
          <Notice tone="urgent" title="Your report wasn’t sent">
            {error === "details" ? "Add a few words about the reason when you choose Other." : "Choose a reason first."}
          </Notice>
        ) : null}

        <Card title="Your shift" id="callout-shift">
          <div className="wa-shifts"><SwapShiftSummary shift={shift} label="Can’t work" /></div>
          <div className="wa-card-body wa-card-body--tight">
            <Notice tone="review" quiet title="It’s still your shift">You’re responsible for it until a manager approves your report.</Notice>
          </div>
          <ol className="wa-steps">
            <li>A manager reviews your report. You can follow it in Shift requests.</li>
            <li>If they approve it, the shift opens for someone else to pick up.</li>
          </ol>
          <div className="wa-card-body wa-card-body--tight"><KitLink href="/app/exchange?tab=requests">See my requests</KitLink></div>
        </Card>

        <Card title="Why can’t you work it?" id="callout-reason">
          <ReviewedCalloutForm fields={fields} />
        </Card>
      </div>
    </div>
    </CalloutSentBoundary>
  );
}
