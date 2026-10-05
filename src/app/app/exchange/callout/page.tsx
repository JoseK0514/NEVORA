import { getWorkspace } from "@/lib/data/workspaces";
import { shiftBoundaryInstants } from "@/lib/business-time";
import Link from "next/link";
import { redirect } from "next/navigation";
import {ShiftChangeForm} from "@/components/shift-change-form";
import {ShiftSlot} from "@/components/shift-slot";
import { requireSelfService } from "@/lib/auth/permissions";
import {
  formatDayLabel,
  formatTime,
} from "@/lib/date-utils";
import { getPublishedShift } from "@/lib/data/exchanges";


const REASONS = [
  ["ILLNESS", "Illness / sick"],
  ["FAMILY_EMERGENCY", "Family emergency"],
  ["TRANSPORTATION", "Transportation issue"],
  ["SCHOOL", "School conflict"],
  ["PERSONAL_EMERGENCY", "Personal emergency"],
  ["OTHER", "Other"],
] as const;

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

  if (
    !shift ||
    shift.employeeId !== session.id ||
    Date.parse(shiftBoundaryInstants(shift,workspace.timeZone).endAt) <= new Date().getTime()
  ) {
    redirect("/app/exchange?tab=my&error=INVALID_SHIFT");
  }

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

          <ShiftChangeForm fields={{kind:"SUBMIT_CALLOUT",sourceShiftId:shift.id}} className="employee-form shift-change-form">


            <label>
              Reason
              <select name="reasonCode" defaultValue="" required>
                <option value="" disabled>Select a reason</option>
                {REASONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Additional details <span>Required when selecting Other</span>
              <textarea
                name="reasonNote"
                maxLength={300}
                rows={4}
                placeholder="Add any details management should know..."
              />
            </label>

            <div className="form-footer">
              <Link className="button secondary" href="/app/exchange?tab=my">
                Cancel
              </Link>
              <button className="employee-action primary" type="submit">Submit Call-out</button>
            </div>
          </ShiftChangeForm>
        </article>
      </section>
    </div>
  );
}
