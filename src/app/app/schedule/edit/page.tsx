import {readOperationalAuthority,withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {readOperationalShiftEditor,readSchedulePendingChanges} from '@/lib/company-access/operational-read.server';
import {ScopedManualShiftForm} from '@/components/company-access/scoped-manual-shift-form';
import {ScopedShiftReadOnly} from '@/components/company-access/scoped-operational-views';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {listPositions} from "@/lib/data/positions";
import {ScheduleRouteFeedback} from '@/components/company-access/schedule-route-feedback';
import {schedulingIssueMessage} from '@/lib/scheduling/validate-shift';
import { redirect } from "next/navigation";
import { DeleteShiftConfirm } from "./delete-shift-button";
import { ActionForm } from "@/components/wave-a/action-form";
import { CorpPage, CorpPill } from "@/components/corp/corp";
import { ScheduleShiftForm } from "@/components/schedule-shift-form";
import { formatDayLabel, formatTime } from "@/lib/date-utils";
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
  // The shift's state for the pill: a Draft week, an edit held on a published week ("Not published · Was …"), or Published.
  // A failed read leaves the pill out.
  const held = shift.scheduleStatus === "PUBLISHED" ? await readSchedulePendingChanges(proof, { weekStart: shift.weekStart }).then(read => read.state === "ready" ? read.data : null).catch(() => null) : null;
  const heldChange = held?.changes.find(change => change.shiftId === shift.id && change.kind !== "REMOVED");
  const was = heldChange?.before && (heldChange.before.startTime !== heldChange.after?.startTime || heldChange.before.endTime !== heldChange.after?.endTime || heldChange.before.date !== heldChange.after?.date)
    ? `Was ${heldChange.before.date !== heldChange.after?.date ? `${formatDayLabel(heldChange.before.date).weekday} ` : ""}${formatTime(heldChange.before.startTime)} – ${formatTime(heldChange.before.endTime)}` : null;
  const status = shift.scheduleStatus === "DRAFT" ? <p className="c-shift__state"><CorpPill tone="amber">Draft</CorpPill></p>
    : held && held.changedShiftIds.includes(shift.id) ? <p className="c-shift__state"><CorpPill tone="amber">Not published</CorpPill>{was ? <span className="c-shift__was">{keepWhole(was)}</span> : null}</p>
    : held ? <p className="c-shift__state"><CorpPill tone="neutral">Published</CorpPill></p> : null;
  const errorBody = params.error ? (Object.hasOwn(ERROR_MESSAGES, params.error) ? ERROR_MESSAGES[params.error] : schedulingIssueMessage(params.error)) ?? "The shift could not be updated." : null;

  // Release 1 (board O-EditShift): Edit shift is the same sheet as Add shift, with the shift's state on top and Delete
  // shift (its own form, never nested) under the save.
  return (<ScopedReadFrame observation={source}>
    <CorpPage className="c-shift-page" label="Edit shift">
      <ScheduleShiftForm mode="edit" formId="edit-shift-form" action={updateShiftAction} employees={employees} positions={positions}
        fixedLocation={location?.shortName ?? shift.locationId} weekStart={shift.weekStart} date={shift.date}
        employeeId={shift.employeeId} positionId={shift.positionId ?? ""} startTime={shift.startTime} endTime={shift.endTime}
        isDesignatedLead={shift.isDesignatedLead} notes={shift.notes ?? ""} hidden={{ shiftId: shift.id }} cancelHref={returnUrl}
        status={status} error={errorBody ? { title: "The shift wasn’t saved", body: errorBody } : undefined}
        footer={<ActionForm action={deleteShiftAction} className="c-shift__delete" failure={{ title: "The shift wasn’t deleted", body: "Check your connection and try again." }}>
          <input type="hidden" name="shiftId" value={shift.id} />
          <DeleteShiftConfirm warning={keepWhole(`${shift.employeeName} won’t be scheduled on ${day.weekday},\u00a0${day.day}. This can’t be undone.`)} />
        </ActionForm>} />
    </CorpPage>
  </ScopedReadFrame>);
}
