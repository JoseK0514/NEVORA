import { getWorkspace } from "@/lib/data/workspaces";
import { shiftBoundaryInstants } from "@/lib/business-time";
import { redirect } from "next/navigation";
import {ReviewedCalloutForm} from "@/components/reviewed-callout-form";
import {requireSessionMutationProof} from "@/lib/auth/session";
import {readShiftChangeTerms} from "@/lib/data/shift-change-snapshot";
import {matchesDisplayedShift} from "@/lib/shift-changes/displayed-terms";
import {ShiftSlot} from "@/components/shift-slot";
import { requireSelfService } from "@/lib/auth/permissions";
import {
  formatDayLabel,
  formatTime,
} from "@/lib/date-utils";
import { getPublishedShift } from "@/lib/data/exchanges";


export default async function CalloutPage({
  searchParams,
}: {
  searchParams: Promise<{ shiftId?: string; error?: string }>;
}) {
  const session = await requireSelfService("/app/exchange?tab=requests");
  const workspace = await getWorkspace();
  const params = await searchParams;

  if (!params.shiftId) {
    redirect("/app/exchange?tab=my&error=INVALID_SHIFT");
  }

  const shift = await getPublishedShift(params.shiftId);

  if (!shift || shift.employeeId !== session.id) {
    redirect("/app/exchange?tab=my&error=INVALID_SHIFT");
  }
  const proof=await requireSessionMutationProof();
  const reviewed=await readShiftChangeTerms(proof,shift.id);
  let ended=false;
  // The coherent authenticated read supplies the server observation; rendering
  // does not sample a second clock or reinterpret the workspace time zone.
  try {ended=!!reviewed&&Date.parse(shiftBoundaryInstants(shift,shift.timeZone??workspace.timeZone).endAt)<=Date.parse(reviewed.observedAt);}
  catch { /* Keep inability reporting available; never guess an invalid instant. */ }
  if(ended)redirect("/app/exchange?tab=my&error=INVALID_SHIFT");

  const fields=reviewed&&matchesDisplayedShift(shift,reviewed.source)?{kind:"SUBMIT_CALLOUT",sourceShiftId:shift.id,sourceEpisodeId:reviewed.source.assignmentEpisodeId,sourceTermsFingerprint:reviewed.sourceTermsFingerprint}:null;
  const date = formatDayLabel(shift.date);

  return (
    <div className="employee-view employee-exchange-detail-view">
      <header className="employee-view-heading"><div><p className="employee-view-eyebrow">Shift request</p><h1>Unable to Work</h1><p className="employee-view-description">Your shift stays assigned until management approves the request.</p></div></header>

      {params.error ? (
        <p className="form-error">
          {params.error === "details"
            ? "Please explain the reason when selecting Other."
            : "Choose a reason before submitting the call-out."}
        </p>
      ) : null}

      <section className="content-grid two callout-layout">
        <article className="panel callout-shift-summary">
          <p className="eyebrow">Shift</p>
          <h2>{date.weekday} · {date.day}</h2>
          <p className="large-detail">
            {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
          </p>
          <ShiftSlot shift={shift} contextOnly/>

          <div className="callout-warning">
            <strong>You are still responsible for this shift right now.</strong>
            <span>
              If management approves the call-out, the shift will move to the
              coverage board for an eligible replacement.
            </span>
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Required</p>
              <h2>Why can&apos;t you work?</h2>
            </div>
          </div>

          <ReviewedCalloutForm fields={fields}/>
        </article>
      </section>
    </div>
  );
}
