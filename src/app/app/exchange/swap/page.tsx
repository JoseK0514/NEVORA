import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requireSession } from "@/lib/auth/session";
import { currentDateInPuertoRico, formatDayLabel, formatTime } from "@/lib/date-utils";
import {
  getPublishedShift,
  listSwapTargets,
} from "@/lib/data/exchanges";
import { proposeSwapAction } from "@/app/app/exchange/actions";

function shiftLabel(shift: {
  date: string;
  startTime: string;
  endTime: string;
  employeeName: string;
  locationName: string;
}) {
  const date = formatDayLabel(shift.date);
  return `${date.weekday} ${date.day} · ${formatTime(shift.startTime)} – ${formatTime(shift.endTime)} · ${shift.employeeName} · ${shift.locationName}`;
}

export default async function SwapPage({
  searchParams,
}: {
  searchParams: Promise<{ sourceShiftId?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  if (!params.sourceShiftId) {
    redirect("/app/exchange?error=INVALID_SHIFT");
  }

  const source = await getPublishedShift(params.sourceShiftId);

  if (
    !source ||
    source.employeeId !== session.id ||
    source.date < currentDateInPuertoRico()
  ) {
    redirect("/app/exchange?error=INVALID_SHIFT");
  }

  const targets = await listSwapTargets(source, session.id);
  const date = formatDayLabel(source.date);

  return (
    <>
      <PageHeader
        eyebrow="Direct swap"
        title="Choose a Shift"
        description="The other employee must accept first. Management must approve before either schedule changes."
        actions={<Link className="button secondary" href="/app/exchange">Cancel</Link>}
      />

      <section className="content-grid two swap-builder">
        <article className="panel">
          <p className="eyebrow">Your shift</p>
          <h2>{date.weekday} · {date.day}</h2>
          <p className="large-detail">
            {formatTime(source.startTime)} – {formatTime(source.endTime)}
          </p>
          <p className="muted">{source.locationName}</p>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Trade for</p>
              <h2>Available shifts this week</h2>
            </div>
          </div>

          {targets.length ? (
            <form action={proposeSwapAction} className="employee-form">
              <input type="hidden" name="sourceShiftId" value={source.id} />
              <label>
                Requested shift
                <select name="targetShiftId" defaultValue="" required>
                  <option value="" disabled>Select a shift</option>
                  {targets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {shiftLabel(target)}
                    </option>
                  ))}
                </select>
              </label>

              <p className="form-help">
                Both employees are rechecked for location eligibility, availability,
                approved time off, overlaps, and weekly hours before the request moves forward.
              </p>

              <div className="form-footer">
                <Link className="button secondary" href="/app/exchange">Cancel</Link>
                <button className="button primary" type="submit">Send Swap Request</button>
              </div>
            </form>
          ) : (
            <div className="empty-state">
              <strong>No other published shifts are available for a swap this week.</strong>
              <span>You can still offer your shift for coverage.</span>
            </div>
          )}
        </article>
      </section>
    </>
  );
}
