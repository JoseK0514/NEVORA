import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requireSelfService } from "@/lib/auth/permissions";
import {
  currentDateInPuertoRico,
  formatDayLabel,
  formatTime,
} from "@/lib/date-utils";
import { getPublishedShift } from "@/lib/data/exchanges";
import { submitCalloutAction } from "@/app/app/exchange/callout/actions";

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
  const params = await searchParams;

  if (!params.shiftId) {
    redirect("/app/exchange?tab=my&error=INVALID_SHIFT");
  }

  const shift = await getPublishedShift(params.shiftId);

  if (
    !shift ||
    shift.employeeId !== session.id ||
    shift.date < currentDateInPuertoRico()
  ) {
    redirect("/app/exchange?tab=my&error=INVALID_SHIFT");
  }

  const date = formatDayLabel(shift.date);

  return (
    <>
      <PageHeader
        eyebrow="Shift call-out"
        title="Unable to work this shift"
        description="Submit the reason management needs to review. Your shift does not change until the request is approved."
        actions={
          <Link className="button secondary" href="/app/exchange?tab=my">
            Cancel
          </Link>
        }
      />

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
          <p className="muted">{shift.locationName}</p>

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

          <form action={submitCalloutAction} className="employee-form">
            <input type="hidden" name="shiftId" value={shift.id} />

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
              <button className="button primary" type="submit">
                Submit Call-out
              </button>
            </div>
          </form>
        </article>
      </section>
    </>
  );
}
