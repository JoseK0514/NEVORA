import {readOperationalAuthority,withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {readOperationalShiftEditor} from '@/lib/company-access/operational-read.server';
import {ScopedManualShiftForm} from '@/components/company-access/scoped-manual-shift-form';
import {ScopedShiftReadOnly} from '@/components/company-access/scoped-operational-views';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {listPositions} from "@/lib/data/positions";
import { EditShiftForm, EDIT_SHIFT_FORM_ID } from "@/components/create-shift-form";
import { QuietNav } from "@/components/quiet/quiet";
import {ScheduleRouteFeedback} from '@/components/company-access/schedule-route-feedback';
import {schedulingIssueMessage} from '@/lib/scheduling/validate-shift';
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteShiftButton, DeleteShiftRow } from "./delete-shift-button";
import { ActionForm } from "@/components/wave-a/action-form";
import { addDays, formatDayLabel, formatTime } from "@/lib/date-utils";
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
  INVALID_SHIFT_LEAD: "Only an Owner, Manager or Lead can lead a shift.",
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
  // W2: Cancel returns to this shift's location, day and person.
  const returnUrl = `/app/schedule?week=${shift.weekStart}&location=${encodeURIComponent(shift.locationId)}&day=${shift.date}#schedule-employee-${encodeURIComponent(shift.employeeId)}`;
  const day = formatDayLabel(shift.date);

  // Quiet (Oct 25, 2026): Edit shift is the same sheet as Add shift. Cancel, Edit shift and Save in the bar; whose shift
  // and when under it; the same rows, prefilled; Delete is a red row with its own confirmation.
  const error = params.error ? (Object.hasOwn(ERROR_MESSAGES, params.error) ? ERROR_MESSAGES[params.error] : schedulingIssueMessage(params.error)) ?? "The shift could not be updated." : null;
  return (<ScopedReadFrame observation={source}>
    <div className="q-page" data-nv-page="" data-q-sheet="">
      <QuietNav left={<Link className="q-nav__l q-nav__l--teal" href={returnUrl}>Cancel</Link>} title="Edit shift"
        right={<button type="submit" form={EDIT_SHIFT_FORM_ID} className="q-nav__r q-nav__r--b">Save</button>} />
      <div className="q-hd"><h1>{shift.employeeName}</h1><p>{keepWhole(`${day.weekday}, ${day.day} · ${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`)}</p></div>
      {error ? <p className="q-error q-first" role="alert">The shift wasn’t saved. {error}</p> : null}
      <EditShiftForm action={updateShiftAction} shiftId={shift.id} employees={employees} positions={positions}
        weekStart={shift.weekStart} weekEnd={addDays(shift.weekStart, 6)} date={shift.date} employeeId={shift.employeeId}
        positionId={shift.positionId ?? ""} locationName={location?.shortName ?? shift.locationId}
        startTime={shift.startTime} endTime={shift.endTime} isDesignatedLead={shift.isDesignatedLead} notes={shift.notes ?? ""} />
      <DeleteShiftRow>
        <ActionForm action={deleteShiftAction} className="q-shift-delete" failure={{ title: "The shift wasn’t deleted", body: "Check your connection and try again." }}>
          <input type="hidden" name="shiftId" value={shift.id} />
          <p className="q-help">{keepWhole(`${shift.employeeName} won’t be scheduled on ${day.weekday}, ${day.day}. This can’t be undone.`)}</p>
          <DeleteShiftButton />
        </ActionForm>
      </DeleteShiftRow>
    </div>
  </ScopedReadFrame>);
}
