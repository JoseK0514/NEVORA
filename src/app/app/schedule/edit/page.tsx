import {readOperationalAuthority,withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {readOperationalShiftEditor} from '@/lib/company-access/operational-read.server';
import {ScopedManualShiftForm} from '@/components/company-access/scoped-manual-shift-form';
import {ScopedShiftReadOnly} from '@/components/company-access/scoped-operational-views';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {listPositions} from "@/lib/data/positions";
import { ShiftEditAssignment } from "./shift-edit-assignment";
import { ConfigurationForm } from "@/components/configuration-form";
import {ScheduleRouteFeedback} from '@/components/company-access/schedule-route-feedback';
import Link from "next/link";
import { redirect } from "next/navigation";
import { NavIcon } from "@/components/nav-icon";
import { ShiftEditTiming } from "./shift-edit-timing";
import { addDays, formatDayLabel, formatTime, formatWeekRange } from "@/lib/date-utils";
import "./edit-shift.css";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import { getShiftForManagement } from "@/lib/data/schedules";
import {
  deleteShiftAction,
  updateShiftAction,
} from "@/app/app/schedule/actions";

export default async function EditShiftPage({
  searchParams,
}: {
  searchParams: Promise<{ shiftId?: string; error?: string }>;
}) {
  await requireRoles(MANAGER_ROLES);
  const params = await searchParams;

  if (!params.shiftId) {
    redirect("/app/schedule?error=INVALID_SHIFT");
  }
  const shiftId=params.shiftId;
  const feedback=<ScheduleRouteFeedback destination="editor" error={params.error}/>;
  const proof=await requireSessionMutationProof(),access=await readOperationalAuthority(proof);
  if(access.state==='unavailable')return <OperationalUnavailable title="Shift editor unavailable" reason={access.reason}/>;
  if(access.scope?.mode!=='COMPANY'){
    const source=await readOperationalShiftEditor(proof,{shiftId});
    if(source.state==='unavailable')return <OperationalUnavailable title="Shift editor unavailable" reason={source.reason} scoped/>;
    if(source.authority!==access.authority)return <OperationalUnavailable title="Shift editor unavailable" reason="source_changed" scoped/>;
    const observation={authority:source.authority,observedAt:access.observedAt,validForMs:Math.min(access.validForMs,source.validForMs)};
    if(source.data.saveAvailability!=='available')return <ScopedShiftReadOnly data={source.data} observation={observation} feedback={feedback}/>;
    return <ScopedReadFrame observation={observation}><ScopedManualShiftForm data={source.data} action={updateShiftAction} deleteAction={deleteShiftAction} feedback={feedback} locationName={access.locations.find(l=>l.id===source.data.locationId)?.name}/></ScopedReadFrame>;
  }

  const source=await withOperationalCompany(proof,()=>Promise.all([
    getShiftForManagement(shiftId),
    listEmployees(),
    listLocations({includeInactive:true}),
    listPositions({includeInactive:true}),
  ]));
  if(source.state==='unavailable')return <OperationalUnavailable title="Shift editor unavailable" reason={source.reason}/>;
  const [shift,employees,locations,positions]=source.data;

  if (!shift) {
    redirect("/app/schedule?error=INVALID_SHIFT");
  }

  const location = locations.find((item) => item.id === shift.locationId);
  const returnUrl = `/app/schedule?week=${shift.weekStart}`;
  const day = formatDayLabel(shift.date);

  return (<ScopedReadFrame observation={source}>
    <div className="edit-shift-page">
      <header className="edit-shift-heading">
        <Link className="edit-shift-back" href={returnUrl}>
          <NavIcon name="arrowRight" /> Back to schedule
        </Link>
        <h1>Edit shift</h1>
        <p>Update who is working and when.</p>
      </header>

      {feedback}

      <div className="edit-shift-layout">
        <aside className="edit-shift-context" aria-labelledby="current-shift-title">
          <h2 id="current-shift-title">Current shift</h2>
          <div className="edit-shift-current">
            <div className="edit-shift-date-tile" aria-hidden="true">
              <span>{day.weekday}</span><strong>{Number(shift.date.slice(8, 10))}</strong>
            </div>
            <div>
              <p className="edit-shift-person">{shift.employeeName}</p>
              <p><time dateTime={shift.date}>{day.weekday}, {day.day}</time></p>
              <p className="edit-shift-current-time">{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</p>
            </div>
          </div>
          <details className="edit-shift-context-details">
            <summary className="edit-shift-location">
              <NavIcon name="location" size={20} />
              <div><span>Location</span><strong>{location?.name ?? shift.locationId}</strong></div>
              <NavIcon name="chevronRight" size={16} />
            </summary>
            <p className="edit-shift-location-hint">The location stays the same for this shift.</p>
            <div className="edit-shift-save-note">
              <NavIcon name="coverage" size={20} />
              <p>When you save, NEVORA checks availability, time off, overlapping shifts, and weekly hours.</p>
            </div>
          </details>
        </aside>

      <section className="edit-shift-card" aria-label="Shift editor">
        <form id="delete-shift-form" action={deleteShiftAction}>
          <input type="hidden" name="shiftId" value={shift.id} />
        </form>
        <ConfigurationForm action={updateShiftAction} className="edit-shift-form">
          <input type="hidden" name="shiftId" value={shift.id} />

          <section className="edit-shift-group" aria-labelledby="edit-assignment-title">
            <div className="edit-shift-group-heading"><NavIcon name="employees" size={20} /><h2 id="edit-assignment-title">Assignment</h2></div>
            <ShiftEditAssignment employees={employees} positions={positions} employeeId={shift.employeeId} positionId={shift.positionId} />
          <label className="edit-shift-lead">
            <input
              type="checkbox"
              name="isDesignatedLead"
              defaultChecked={shift.isDesignatedLead}
            />
            <span>
              <strong>Designated shift lead</strong>
              <small>Only Owner, Manager, or Lead roles can be assigned.</small>
            </span>
            <NavIcon name="lead" size={20} />
          </label>
          </section>

          <section className="edit-shift-group" aria-labelledby="edit-timing-title">
            <div className="edit-shift-group-heading"><NavIcon name="clock" size={20} /><h2 id="edit-timing-title">Date &amp; time</h2></div>
            <div className="edit-shift-date-time">
            <div>
            <label className="edit-shift-field">
              <span>Date</span>
              <input type="date" name="date" defaultValue={shift.date} min={shift.weekStart} max={addDays(shift.weekStart, 6)} aria-describedby="edit-shift-date-hint" required />
            </label>
            <p className="edit-shift-hint" id="edit-shift-date-hint">Schedule week: {formatWeekRange(shift.weekStart)}.</p>
            </div>
            <ShiftEditTiming date={shift.date} startTime={shift.startTime} endTime={shift.endTime} />
            </div>
          </section>

          <section className="edit-shift-group" aria-labelledby="edit-details-title">
            <div className="edit-shift-group-heading"><NavIcon name="templates" size={20} /><h2 id="edit-details-title">Shift notes</h2><span>Optional</span></div>
            <label className="edit-shift-field" htmlFor="edit-shift-notes">
              <span className="sr-only">Notes</span>
              <textarea id="edit-shift-notes" name="notes" defaultValue={shift.notes ?? ""} rows={3} placeholder="Add anything the team should know." />
            </label>
          </section>

          <div className="edit-shift-actions">
              <Link className="button secondary" href={returnUrl}>
                Cancel
              </Link>
              <button className="button primary" type="submit">Save changes <NavIcon name="arrowRight" /></button>
          </div>
          <details className="edit-shift-delete">
            <summary>Delete shift</summary>
            <div>
              <p>Remove this shift from the schedule for {shift.employeeName} on {day.day}.</p>
              <button className="button danger-button" type="submit" form="delete-shift-form">Delete this shift</button>
            </div>
          </details>
        </ConfigurationForm>
      </section>
      </div>
    </div>
  </ScopedReadFrame>);
}
