import { ReviewedCalloutForm } from "./reviewed-callout-form";
import { CalloutSentBoundary } from "./wave-a/callout-sent";
import { QuietPage } from "./quiet/quiet";
import type { ExchangeShift } from "../lib/data/exchanges";

/* "Unable to work" in the v5 "One look" (approved Oct 24, 2026; mockup E05). Opened from a shift it is a sheet over
 * Schedule; by its URL, the same content as a page. The shift, the six reasons, an optional note, Send in the bar.
 * Same reviewed fields, validation and result as before. */
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
      <QuietPage className="q-shiftchange">
        <ReviewedCalloutForm fields={fields} shift={shift} error={error ? (error === "details" ? "Add a few words about the reason when you choose Other." : "Choose a reason first.") : undefined} />
      </QuietPage>
    </CalloutSentBoundary>
  );
}
