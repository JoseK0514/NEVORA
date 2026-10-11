import {listPositions} from "@/lib/data/positions";
import {ShiftAssignmentFields} from "@/components/shift-assignment-fields";
import { ConfigurationForm } from "@/components/configuration-form";
import { SelectField } from "@/components/select-field";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import Link from "next/link";
import { createShiftAction } from "@/app/app/schedule/actions";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { decodeCoverageRepairReview, readCoverageRepairSelection } from "@/lib/data/coverage-repair.server";
import { coverageRepairUrl, CoverageRepairConflictError } from "@/lib/scheduling/coverage-repair";
import { listEmployees, listLocations } from "@/lib/data/employees";
import {
  addDays,
  isDateInWeek,
  isValidWeekStart, weekStartFor,
} from "@/lib/date-utils";

export default async function NewShiftPage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    date?: string;
    employeeId?: string;
    locationId?: string;
    start?: string;
    end?: string;
    lead?: string;
    positionId?: string;
    review?: string;
  }>;
}) {
  await requireRoles(MANAGER_ROLES);
  const params = await searchParams;
  if (params.review !== undefined) {
    const proof = await requireSessionMutationProof();
    let selected;
    try { selected = await readCoverageRepairSelection(params.review, proof); }
    catch (error) {
      if (!(error instanceof CoverageRepairConflictError)) throw error;
      let href = '/app/schedule';
      try { href = coverageRepairUrl(decodeCoverageRepairReview(params.review, proof).locator, true); } catch { /* No trusted locator. */ }
      return <main className="new-shift-page"><section className="new-shift-card empty-state"><h1>Coverage changed</h1><p>Refresh the review and select a current eligible replacement before saving.</p><Link className="button primary" href={href}>Refresh coverage review</Link></section></main>;
    }
    const { locator } = selected;
    return <main className="new-shift-page"><ConfigurationForm action={createShiftAction} className="new-shift-card">
      <input type="hidden" name="coverageRepairReview" value={params.review} />
      {Object.entries({ weekStart: locator.weekStart, employeeId: selected.employeeId, locationId: locator.locationId,
        date: locator.date, startTime: locator.startTime, endTime: locator.endTime, positionId: locator.positionId ?? '',
        ...(selected.isDesignatedLead ? { isDesignatedLead: 'on' } : {}) }).map(([name, value]) => <input type="hidden" name={name} value={value} key={name} />)}
      <header className="new-shift-card-header"><span>Coverage repair</span><h1>Review replacement</h1></header>
      <div className="new-shift-form"><p><strong>{selected.employeeName}</strong> · {selected.employeeId}</p><p>{selected.locationName} · {locator.date} · {locator.startTime}–{locator.endTime}</p>
        <p>Position: <strong>{selected.positionName ?? 'No position required for the selected staffing or Lead requirement'}</strong></p>
        <p>{selected.isDesignatedLead ? 'Designated Shift Lead required' : 'Designated Shift Lead not required for this repair'}</p>
        <p>This saves one replacement for the selected requirement. Remaining requirements stay visible in the gap.</p></div>
      <footer className="new-shift-actions"><Link className="new-shift-action secondary" href={coverageRepairUrl(locator, true)}>Refresh coverage review</Link><button className="new-shift-action primary" type="submit">Save replacement</button></footer>
    </ConfigurationForm></main>;
  }
  const workspace = await getWorkspace();
  const currentWeek = weekStartFor(businessDate(new Date(), workspace.timeZone));
  const weekStart = params.week && isValidWeekStart(params.week) ? params.week : currentWeek;
  const date =
    params.date && isDateInWeek(params.date, weekStart)
      ? params.date
      : weekStart;
  const weekEnd = addDays(weekStart, 6);

  const [employees, locations, positions] = await Promise.all([
    listEmployees(),
    listLocations(),
    listPositions(),
  ]);
  const locationId = locations.some(location => location.id === params.locationId) ? params.locationId! : "";

  return (
    <main className="new-shift-page">
      <ConfigurationForm action={createShiftAction} className="new-shift-card">
        <input type="hidden" name="weekStart" value={weekStart} />

        <header className="new-shift-card-header">
          <span>Schedule</span>
          <h1>Create New Shift</h1>
        </header>

        <div className="new-shift-form">
          <SelectField className="new-shift-field" name="locationId" label="Location" defaultValue={locationId} required
            options={[{value:"",label:"Select location",disabled:true},...locations.map(location=>({value:location.id,label:location.shortName}))]} />
          <section className="new-shift-group">
            <p className="new-shift-section-label">ASSIGN EMPLOYEE</p>
            <ShiftAssignmentFields employees={employees} positions={positions} employeeId={params.employeeId} positionId={params.positionId} newShift/>
          </section>

          <section className="new-shift-group">
            <p className="new-shift-section-label">SHIFT TIMING</p>
            <label className="new-shift-field">
              <span>Date</span>
              <input
                type="date"
                name="date"
                defaultValue={date}
                min={weekStart}
                max={weekEnd}
                required
              />
            </label>

            <div className="new-shift-time-fields">
              <label className="new-shift-field">
                <span>Start Time</span>
                <input
                  type="time"
                  name="startTime"
                  defaultValue={params.start ?? ""}
                  required
                />
              </label>
              <label className="new-shift-field">
                <span>End Time</span>
                <input
                  type="time"
                  name="endTime"
                  defaultValue={params.end === "24:00" ? "00:00" : params.end ?? ""}
                  required
                />
              </label>
            </div>
          </section>

          <label className="new-shift-lead-toggle">
            <input type="checkbox" name="isDesignatedLead" defaultChecked={params.lead === "1"} />
            <span>Designated Shift Lead</span>
          </label>
        </div>

        <footer className="new-shift-actions">
          <Link
            className="new-shift-action secondary"
            href={`/app/schedule?week=${weekStart}${locationId ? `&location=${encodeURIComponent(locationId)}` : ""}`}
          >
            Cancel
          </Link>
          <button className="new-shift-action primary" type="submit">
            Save Shift
          </button>
        </footer>
      </ConfigurationForm>
    </main>
  );
}
