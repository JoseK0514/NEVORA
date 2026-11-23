import {scopedObservation} from '@/lib/company-access/observation';
import {readOperationalAuthority,withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {readOperationalShiftEditor,readSchedulePendingChanges} from '@/lib/company-access/operational-read.server';
import {ScopedShiftDetails,scopedShiftChoices,scopedShiftPositions,scopedShiftReason} from '@/components/company-access/scoped-shift-sheet';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {listPositions} from "@/lib/data/positions";
import {editorErrorText} from '@/components/company-access/schedule-route-feedback';
import {schedulingIssueMessage} from '@/lib/scheduling/validate-shift';
import { redirect } from "next/navigation";
import { DeleteShiftConfirm } from "./delete-shift-button";
import { ActionForm } from "@/components/wave-a/action-form";
import { CorpPage } from "@/components/corp/corp";
import { ScheduleShiftForm } from "@/components/schedule-shift-form";
import {shiftFormEmployees} from '@/lib/scheduling/shift-form-employee';
import { formatDayLabel, formatTime } from "@/lib/date-utils";
import { keepWhole } from "@/lib/keep-whole";
import { readPortalLanguage } from "@/lib/activation/language.server";
import { esDayLabel, scheduleWords, shortDay, times, type ScheduleLang } from "../schedule-copy";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import { getShiftForManagement } from "@/lib/data/schedules";
import {
  deleteShiftAction,
  updateShiftAction,
} from "@/app/app/schedule/actions";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Edit shift" };

/* The editor's own error lines are the table's `edit.errors` (LOCATION_NOT_ELIGIBLE, SHIFT_OVERLAP …). */

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
  const proof=await requireSessionMutationProof(),access=await readOperationalAuthority(proof);
  let lang:ScheduleLang='en';try{lang=(await readPortalLanguage(proof)).language;}catch{/* English */}
  const t=scheduleWords(lang).edit,pageLang=lang==='es'?'es':undefined,dayLabel=(date:string)=>lang==='es'?esDayLabel(date):formatDayLabel(date);
  if(access.state==='unavailable')return <OperationalUnavailable title={t.unavailable} reason={access.reason}/>;
  if(access.scope?.mode!=='COMPANY'){
    const source=await readOperationalShiftEditor(proof,{shiftId});
    if(source.state==='unavailable')return <OperationalUnavailable title={t.unavailable} reason={source.reason} scoped/>;
    if(source.authority!==access.authority)return <OperationalUnavailable title={t.unavailable} reason="source_changed" scoped/>;
    const observation={authority:source.authority,observedAt:access.observedAt,validForMs:Math.min(access.validForMs,source.validForMs)};
    const data=source.data,scopedShift=data.shift;
    if(!scopedShift)redirect("/app/schedule?error=INVALID_SHIFT");
    // Phase 2 (queue C4-Ml): a location Manager gets the Owner's Edit shift sheet for a draft they may change, and the same
    // sheet with the shift's facts and one line saying why when they may not. Scoped read, actions and fields unchanged.
    const place=access.locations.find(l=>l.id===data.locationId),placeName=place?(place.shortName||place.name):data.locationId;
    const back=`/app/schedule?week=${data.weekStart}&location=${encodeURIComponent(data.locationId)}&day=${scopedShift.date}#schedule-employee-${encodeURIComponent(scopedShift.employeeId)}`;
    const scopedDay=dayLabel(scopedShift.date);
    // Each fact once (Jose, Nov 23, 2026): the editable sheet's subtitle is its state only (the Date field holds the day);
    // Shift details' subtitle is the day only (the reason line says why it can't change: published, built, inactive).
    const scopedState=<span data-tone="amber">{t.draft}</span>;
    const scopedSubtitle=shortDay(scopedShift.date,lang);
    const scopedError=params.error?{title:t.notSaved,body:editorErrorText(params.error)}:undefined;
    if(data.saveAvailability!=='available')return <ScopedReadFrame observation={observation}><CorpPage className="c-shift-page" label={t.details} lang={pageLang}>
      <ScopedShiftDetails data={data} title={t.details} subtitle={scopedSubtitle} placeName={placeName} backHref={back} reason={scopedShiftReason(data,placeName)} error={scopedError}/>
    </CorpPage></ScopedReadFrame>;
    return <ScopedReadFrame observation={observation}><CorpPage className="c-shift-page" label={t.title} lang={pageLang}>
      <ScheduleShiftForm key={scopedShift.id} mode="edit" formId="edit-shift-form" action={updateShiftAction} reviewedShiftVersion={scopedShift.reviewVersion}
        employees={scopedShiftChoices([data],{id:scopedShift.employeeId,name:scopedShift.employeeName})} positions={scopedShiftPositions([data])}
        fixedLocation={placeName} fixedLocationHelp={access.locations.length>1?undefined:null} weekStart={data.weekStart} date={scopedShift.date}
        employeeId={scopedShift.employeeId} positionId={scopedShift.positionId??""} startTime={scopedShift.startTime} endTime={scopedShift.endTime} keepMidnightEnd
        isDesignatedLead={scopedShift.isDesignatedLead} notes={scopedShift.notes??""} hidden={{weekStart:data.weekStart,locationId:data.locationId,shiftId:scopedShift.id}} cancelHref={back}
        subtitle={scopedState} error={scopedError} holdAfterUnconfirmed
        footer={<ActionForm action={deleteShiftAction} reviewedShiftVersion={scopedShift.reviewVersion} shiftDraftFormId="edit-shift-form" className="c-shift__delete" failure={{ title: t.notDeleted, body: t.checkConnection }}>
          <input type="hidden" name="shiftId" value={scopedShift.id} />
          <DeleteShiftConfirm lang={lang} warning={keepWhole(t.wontBeScheduledNbsp(scopedShift.employeeName, scopedDay.weekday, scopedDay.day))} />
        </ActionForm>} />
    </CorpPage></ScopedReadFrame>;
  }

  const source=await withOperationalCompany(proof,()=>Promise.all([
    getShiftForManagement(shiftId),
    listEmployees(),
    listLocations({includeInactive:true}),
    listPositions({includeInactive:true}),
  ]));
  if(source.state==='unavailable')return <OperationalUnavailable title={t.unavailable} reason={source.reason}/>;
  const [shift,employees,locations,positions]=source.data;

  if (!shift) {
    redirect("/app/schedule?error=INVALID_SHIFT");
  }

  const location = locations.find((item) => item.id === shift.locationId);
  // W2: Cancel returns to this shift's location, day and person.
  const returnUrl = `/app/schedule?week=${shift.weekStart}&location=${encodeURIComponent(shift.locationId)}&day=${shift.date}#schedule-employee-${encodeURIComponent(shift.employeeId)}`;
  const day = dayLabel(shift.date);
  // The shift's state for the pill: a Draft week, an edit held on a published week ("Not published · Was …"), or Published.
  // A failed read leaves the pill out.
  const held = shift.scheduleStatus === "PUBLISHED" ? await readSchedulePendingChanges(proof, { weekStart: shift.weekStart }).then(read => read.state === "ready" ? read.data : null).catch(() => null) : null;
  const heldChange = held?.changes.find(change => change.shiftId === shift.id && change.kind !== "REMOVED");
  const was = heldChange?.before && (heldChange.before.startTime !== heldChange.after?.startTime || heldChange.before.endTime !== heldChange.after?.endTime || heldChange.before.date !== heldChange.after?.date)
    ? t.was(heldChange.before.date !== heldChange.after?.date ? `${dayLabel(heldChange.before.date).weekday} ` : "", times(`${formatTime(heldChange.before.startTime)} – ${formatTime(heldChange.before.endTime)}`, lang)) : null;
  // The title's subtitle is the shift's state only (Jose, Nov 23, 2026; gaps G28): the Date field holds the day. Draft and
  // Not published in amber text (R3, no pill); a failed read leaves it out. A held time change keeps its "Was …" line.
  const changedHeld = !!held && held.changedShiftIds.includes(shift.id);
  const stateKey = shift.scheduleStatus === "DRAFT" ? "draft" : changedHeld ? "notPublished" : held ? "published" : null;
  const subtitle = stateKey ? <span data-tone={stateKey === "published" ? undefined : "amber"}>{t[stateKey]}</span> : undefined;
  const status = changedHeld && was ? <p className="c-shift__state"><span className="c-shift__was">{keepWhole(was)}</span></p> : null;
  const errorBody = params.error ? (Object.hasOwn(t.errors, params.error) ? t.errors[params.error] : schedulingIssueMessage(params.error)) ?? t.notUpdated : null;

  // Release 1 (board O-EditShift): Edit shift is the same sheet as Add shift, with the shift's state on top and Delete
  // shift (its own form, never nested) under the save.
  return (<ScopedReadFrame observation={scopedObservation(source)}>
    <CorpPage className="c-shift-page" label={t.title} lang={pageLang}>
      <ScheduleShiftForm key={shift.id} mode="edit" formId="edit-shift-form" action={updateShiftAction} reviewedShiftVersion={shift.reviewVersion} employees={shiftFormEmployees(employees,shift.employeeId)} positions={positions}
        fixedLocation={location?.shortName ?? shift.locationId} weekStart={shift.weekStart} date={shift.date}
        employeeId={shift.employeeId} positionId={shift.positionId ?? ""} startTime={shift.startTime} endTime={shift.endTime}
        isDesignatedLead={shift.isDesignatedLead} notes={shift.notes ?? ""} hidden={{ shiftId: shift.id }} cancelHref={returnUrl}
        status={status} subtitle={subtitle} error={errorBody ? { title: t.notSaved, body: errorBody } : undefined}
        footer={<ActionForm action={deleteShiftAction} reviewedShiftVersion={shift.reviewVersion} shiftDraftFormId="edit-shift-form" className="c-shift__delete" failure={{ title: t.notDeleted, body: t.checkConnection }}>
          <input type="hidden" name="shiftId" value={shift.id} />
          <DeleteShiftConfirm lang={lang} warning={keepWhole(t.wontBeScheduledNbsp(shift.employeeName, day.weekday, day.day))} />
        </ActionForm>} />
    </CorpPage>
  </ScopedReadFrame>);
}
