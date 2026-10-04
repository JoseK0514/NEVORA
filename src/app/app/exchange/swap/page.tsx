import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import Link from "next/link";
import { NavIcon } from "@/components/nav-icon";
import { redirect } from "next/navigation";
import { EmployeeSubmitButton } from "@/components/employee-submit-button";
import { EmployeeShiftPicker } from "@/components/employee-shift-picker";
import { requireSelfService } from "@/lib/auth/permissions";
import {  formatDayLabel, formatTime } from "@/lib/date-utils";
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
  const session = await requireSelfService("/app/exchange?tab=requests");
  const workspace = await getWorkspace();
  const params = await searchParams;

  if (!params.sourceShiftId) {
    redirect("/app/exchange?error=INVALID_SHIFT");
  }

  const source = await getPublishedShift(params.sourceShiftId);

  if (
    !source ||
    source.employeeId !== session.id ||
    source.date < businessDate(new Date(), workspace.timeZone)
  ) {
    redirect("/app/exchange?error=INVALID_SHIFT");
  }

  const targets = await listSwapTargets(source, session.id);
  const date = formatDayLabel(source.date);

  return (
    <div className="employee-view employee-exchange-detail-view">
      <header className="employee-view-heading"><div><p className="employee-view-eyebrow">Shift trade</p><h1>Choose a shift</h1><p className="employee-view-description">Your teammate accepts first, then management reviews the trade.</p></div></header>

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
              <EmployeeShiftPicker options={targets.map((target) => {
                const targetDate = formatDayLabel(target.date);
                return {
                  id: target.id,
                  label: shiftLabel(target),
                  dateLabel: `${targetDate.weekday} ${targetDate.day}`,
                  timeLabel: `${formatTime(target.startTime)} – ${formatTime(target.endTime)}`,
                  employeeName: target.employeeName,
                  locationName: target.locationName,
                };
              })} />
              <div className="form-footer">
                <Link className="button secondary" href="/app/exchange">Cancel</Link>
                <EmployeeSubmitButton className="employee-action primary" pendingText="Sending…">Send swap request</EmployeeSubmitButton>
              </div>
            </form>
          ) : (
            <div className="empty-state">
              <span className="employee-empty-icon"><NavIcon name="exchange" employee size={16} /></span>
              <strong>No shifts to trade</strong>
              <span>No other published shifts are available this week; you can still offer your shift for coverage.</span>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
