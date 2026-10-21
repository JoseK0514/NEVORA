import Link from "next/link";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { ReviewedCalloutForm } from "./reviewed-callout-form";
import { Notice } from "./wave-a/parts";
import { swapBandDay, swapBandLine } from "./swap-shift-summary";
import { CalloutSentBoundary } from "./wave-a/callout-sent";
import { SigBand, SigPage } from "./signature/signature";
import sr from "./shift-requests-signature.module.css";
import type { ExchangeShift } from "../lib/data/exchanges";

/* "Unable to work" in the Signature style (phase 3, approved Oct 20, 2026; target:
 * docs/product/specs/employee-style/signature/phase-3/p3c-board-b.png). The band is the shift; the sheet asks what
 * happened, takes an optional note, says it's still your shift, then Send report. Same reviewed fields as before. */
export function CalloutBand({ shift, title = "Unable to work" }: { shift: ExchangeShift; title?: string }) {
  return <SigBand eyebrow="Unable to work">
    <h1 className="nv-sr">{title}</h1>
    <p className="sg-word"><time dateTime={shift.date}>{swapBandDay(shift.date)}</time></p>
    <p className="sg-sub"><span>{swapBandLine(shift)}</span></p>
    <Link className="sg-band-link" href="/app/exchange?tab=requests"><CaretLeftIcon size={14} aria-hidden="true" />Shift requests</Link>
  </SigBand>;
}

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
      <SigPage className={sr.srRoot} band={<CalloutBand shift={shift} />}>
        {error ? (
          <div className={sr.srNoticeTop}><Notice tone="urgent" title="Your report wasn’t sent">
            {error === "details" ? "Add a few words about the reason when you choose Other." : "Choose a reason first."}
          </Notice></div>
        ) : null}
        <ReviewedCalloutForm fields={fields} />
      </SigPage>
    </CalloutSentBoundary>
  );
}
