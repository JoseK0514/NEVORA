import {readOperationalAuthority,withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {readOperationalShiftEditor} from '@/lib/company-access/operational-read.server';
import {ScopedManualShiftForm} from '@/components/company-access/scoped-manual-shift-form';
import {ScopedShiftReadOnly} from '@/components/company-access/scoped-operational-views';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {listPositions} from "@/lib/data/positions";
import { EditShiftForm } from "@/components/create-shift-form";
import {ScheduleRouteFeedback} from '@/components/company-access/schedule-route-feedback';
import {schedulingIssueMessage} from '@/lib/scheduling/validate-shift';
import { redirect } from "next/navigation";
import { DeleteShiftButton, DeleteShiftRow } from "./delete-shift-button";
import { ActionForm } from "@/components/wave-a/action-form";
import { addDays, formatDayLabel, formatTimeRange } from "@/lib/date-utils";
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

export const metadata = { title: "Edit shift" };

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

  // Quiet (Team U2, Oct 25, 2026, T-4): Edit shift is the New shift sheet in edit mode. Cancel · Edit shift · Save in the
  // bar (Save waits for a change), the same rows prefilled, the error under the bar, and Delete as a red row with its
  // own confirmation sheet. The tab bar stays hidden (data-q-sheet).
  const error = params.error ? (Object.hasOwn(ERROR_MESSAGES, params.error) ? ERROR_MESSAGES[params.error] : schedulingIssueMessage(params.error)) ?? "The shift could not be updated." : null;
  const when = keepWhole(`${day.weekday}, ${day.day} · ${formatTimeRange(shift.startTime, shift.endTime)}`);
  return (<ScopedReadFrame observation={source}>
    <div className="q-page" data-nv-page="" data-q-sheet="">
      <h1 className="q-sr">{`Edit shift, ${shift.employeeName}, ${when}`}</h1>
      <EditShiftForm action={updateShiftAction} shiftId={shift.id} employees={employees} positions={positions} cancelHref={returnUrl}
        weekStart={shift.weekStart} weekEnd={addDays(shift.weekStart, 6)} date={shift.date} employeeId={shift.employeeId}
        positionId={shift.positionId ?? ""} locationId={shift.locationId} locationName={location?.shortName ?? shift.locationId}
        startTime={shift.startTime} endTime={shift.endTime} isDesignatedLead={shift.isDesignatedLead} notes={shift.notes ?? ""}
        notice={error ? <p className="q-help q-help--alert u2-form-alert" role="alert">The shift wasn’t saved. {error}</p> : null} />
      <DeleteShiftRow detail={`${shift.employeeName} · ${when}`}>
        <ActionForm action={deleteShiftAction} className="q-shift-delete" failure={{ title: "The shift wasn’t deleted", body: "Check your connection and try again." }}>
          <input type="hidden" name="shiftId" value={shift.id} />
          <DeleteShiftButton />
        </ActionForm>
      </DeleteShiftRow>
    </div>
  </ScopedReadFrame>);
}
