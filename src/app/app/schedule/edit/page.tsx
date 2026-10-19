import { listPositions } from "@/lib/data/positions";
import { ShiftEditAssignment } from "./shift-edit-assignment";
import { ConfigurationForm } from "@/components/configuration-form";
import { schedulingIssueMessage } from "@/lib/scheduling/validate-shift";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShiftEditTiming } from "./shift-edit-timing";
import { DeleteShiftButton } from "./delete-shift-button";
import { ActionForm } from "@/components/wave-a/action-form";
import { Card, MetaParts, PageBand } from "@/components/kit/kit";
import { Field, FormActions, Notice } from "@/components/wave-a/parts";
import { PendingButton } from "@/components/wave-a/pending-button";
import { addDays, formatDayLabel, formatTime, formatWeekRange } from "@/lib/date-utils";
import { keepWhole } from "@/lib/keep-whole";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import { getShiftForManagement } from "@/lib/data/schedules";
import {
  deleteShiftAction,
  updateShiftAction,
} from "@/app/app/schedule/actions";

const ERROR_MESSAGES: Record<string, string> = {
  LOCATION_NOT_ELIGIBLE: "That person can’t work at this location.",
  SHIFT_OVERLAP: "That person already has a shift at this time.",
  APPROVED_TIME_OFF: "That person has approved time off during this shift.",
  EMPLOYEE_INACTIVE: "Inactive people can’t be scheduled.",
  INVALID_TIME_RANGE: "Enter a valid date, start and end time.",
  INVALID_SHIFT_LEAD:
    "Only an Owner, Manager or Lead can lead a shift.",
};

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

  const [shift, employees, locations, positions] = await Promise.all([
    getShiftForManagement(params.shiftId),
    listEmployees(),
    listLocations({includeInactive:true}),
    listPositions({includeInactive:true}),
  ]);

  if (!shift) {
    redirect("/app/schedule?error=INVALID_SHIFT");
  }

  const location = locations.find((item) => item.id === shift.locationId);
  // W2: Cancel returns to this shift's location, day and person.
  const returnUrl = `/app/schedule?week=${shift.weekStart}&location=${encodeURIComponent(shift.locationId)}&day=${shift.date}#schedule-employee-${encodeURIComponent(shift.employeeId)}`;
  const day = formatDayLabel(shift.date);

  // Phase 3.5 Wave A: Edit shift on the kit. The band says whose shift and when; the form is the same three groups as Add shift.
  return (
    <div className="nv-page wa-page wa-shift" data-nv-page="">
      <PageBand back={{ href: returnUrl, label: "Schedule" }} eyebrow="Edit shift" title={shift.employeeName}
        summary={<MetaParts text={keepWhole(`${day.weekday}, ${day.day} · ${formatTime(shift.startTime)} – ${formatTime(shift.endTime)} · ${location?.name ?? shift.locationId}`)} />} />
      <div className="nv-content wa-narrow">
        {params.error ? (
          <Notice tone="urgent" title="The shift wasn’t saved">
            {ERROR_MESSAGES[params.error] ?? schedulingIssueMessage(params.error) ?? "The shift could not be updated."}
          </Notice>
        ) : null}

        <ConfigurationForm action={updateShiftAction} className="wa-form">
          <input type="hidden" name="shiftId" value={shift.id} />
          <Card title="Who" id="edit-who">
            <div className="wa-fields">
              <ShiftEditAssignment employees={employees} positions={positions} employeeId={shift.employeeId} positionId={shift.positionId} />
              <label className="wa-check">
                <input type="checkbox" name="isDesignatedLead" defaultChecked={shift.isDesignatedLead} />
                <span className="wa-check__text"><span className="wa-check__title">Shift lead</span><span className="wa-check__help">Only an Owner, Manager or Lead can lead a shift.</span></span>
              </label>
              <div className="wa-readonly">
                <span className="wa-field__label">Location</span>
                <span className="wa-readonly__value">{location?.name ?? shift.locationId}</span>
                <span className="wa-field__help">A shift keeps its location. To move it, delete it and add a new one.</span>
              </div>
            </div>
          </Card>

          <Card title="When" id="edit-when">
            <div className="wa-fields">
              <Field label="Date" help={`Days in this schedule week: ${keepWhole(formatWeekRange(shift.weekStart))}.`} helpId="edit-shift-date-help">
                <input type="date" name="date" defaultValue={shift.date} min={shift.weekStart} max={addDays(shift.weekStart, 6)} aria-describedby="edit-shift-date-help" required />
              </Field>
              <ShiftEditTiming date={shift.date} startTime={shift.startTime} endTime={shift.endTime} />
            </div>
          </Card>

          <Card title="Notes" id="edit-notes" meta="Optional">
            <div className="wa-fields">
              <Field label="Notes for the team" help="Everyone on this shift can read them." helpId="edit-shift-notes-help">
                <textarea id="edit-shift-notes" aria-describedby="edit-shift-notes-help" name="notes" defaultValue={shift.notes ?? ""} rows={3} placeholder="Anything the team should know" />
              </Field>
            </div>
          </Card>

          <FormActions note="Availability, time off, other shifts and weekly hours are checked when you save.">
            <PendingButton pending="Saving…" block>Save changes</PendingButton>
            <Link className="nv-btn" data-kind="secondary" data-block="true" href={returnUrl}>Cancel</Link>
          </FormActions>
        </ConfigurationForm>

        <Card title="Delete this shift" id="edit-delete">
          <details className="wa-disclosure">
            <summary className="wa-disclosure__summary">Delete shift</summary>
            <ActionForm action={deleteShiftAction} className="wa-card-body" failure={{ title: "The shift wasn’t deleted", body: "Check your connection and try again." }}>
              <input type="hidden" name="shiftId" value={shift.id} />
              <p className="wa-text">{keepWhole(`${shift.employeeName} won’t be scheduled on ${day.weekday}, ${day.day}. This can’t be undone.`)}</p>
              <DeleteShiftButton />
            </ActionForm>
          </details>
        </Card>
      </div>
    </div>
  );
}
