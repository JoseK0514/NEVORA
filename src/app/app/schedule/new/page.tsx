import {scopedObservation} from '@/lib/company-access/observation';
import accessStyles from '@/components/company-access/company-access.module.css';
import consentStyles from './coverage-consent.module.css';
import {readOperationalShiftEditor} from '@/lib/company-access/operational-read.server';
import {ScopedManualShiftForm} from '@/components/company-access/scoped-manual-shift-form';
import {ScopedShiftReadOnly} from '@/components/company-access/scoped-operational-views';
import {SelectField} from '@/components/select-field';
import {readOperationalAuthority,withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {listPositions} from "@/lib/data/positions";
import { keepDuration } from "@/components/wave-a/keep-duration";
import { ScheduleShiftForm } from "@/components/schedule-shift-form";
import {shiftFormEmployees} from '@/lib/scheduling/shift-form-employee';
import { CorpPage } from "@/components/corp/corp";
import { ConfigurationForm } from "@/components/configuration-form";
import { Card, PageBand } from "@/components/kit/kit";
import { Fact, Facts, FormActions, Notice } from "@/components/wave-a/parts";
import { PendingButton } from "@/components/wave-a/pending-button";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import { keepWhole } from "@/lib/keep-whole";

import Link from "next/link";
import { createShiftAction } from "@/app/app/schedule/actions";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { decodeCoverageRepairReview, readCoverageRepairSelection } from "@/lib/data/coverage-repair.server";
import { coverageRepairUrl, CoverageRepairConflictError } from "@/lib/scheduling/coverage-repair";
import { listEmployees, listLocations } from "@/lib/data/employees";
import {
  addDays, durationMinutes,
  formatDayLabel, formatTime, formatWeekRange,
  isDateInWeek,
  isValidWeekStart, weekStartFor,
} from "@/lib/date-utils";


const CREATE_SHIFT_FORM_ID = "create-shift-form";

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
  const proof=await requireSessionMutationProof();
  const params = await searchParams;
  if (params.review !== undefined) {
    const source=await withOperationalCompany(proof,async()=>{
      try{return {kind:'selected' as const,selected:await readCoverageRepairSelection(params.review!,proof)};}
      catch(error){
        if(!(error instanceof CoverageRepairConflictError))throw error;
        let href='/app/schedule';
        try{href=coverageRepairUrl(decodeCoverageRepairReview(params.review!,proof).locator,true);}catch{/* No trusted locator. */}
        return {kind:'conflict' as const,href};
      }
    });
    if(source.state==='unavailable')return <OperationalUnavailable title="Replacement review unavailable" reason={source.reason}/>;
    if(source.data.kind==='conflict')return <ScopedReadFrame observation={scopedObservation(source)}><div className="nv-page wa-page wa-shift" data-nv-page="">
        <PageBand back={{ href:source.data.href, label: "Coverage" }} eyebrow="Replacement" title="Coverage changed" summary="Someone changed this shift since you opened the review." />
        <div className="nv-content wa-narrow">
          <Card title="This review is out of date">
            <div className="wa-card-body">
              <p className="wa-text">Open the review again to see who can cover it now. Nothing was saved.</p>
              <Link className="nv-btn" data-kind="primary" data-block="true" href={source.data.href}>Open current review</Link>
            </div>
          </Card>
        </div>
      </div></ScopedReadFrame>;
    const selected=source.data.selected;
    const { locator } = selected;
    const day = formatDayLabel(locator.date);
    const overnight = locator.endTime === "24:00" || locator.endTime < locator.startTime;
    const nextDay = overnight ? formatDayLabel(addDays(locator.date, 1)) : null;
    const refreshHref = coverageRepairUrl(locator, true);
    const need = locator.target === "POSITION" ? "the position requirement" : locator.target === "LEAD" ? "the lead requirement" : "the staffing requirement";
    return <ScopedReadFrame observation={scopedObservation(source)}><div className="nv-page wa-page wa-shift" data-nv-page="">
      <PageBand back={{ href: refreshHref, label: "Coverage" }} eyebrow={keepWhole(formatWeekRange(locator.weekStart))} title="Review replacement"
        summary={`${selected.employeeName} for ${keepWhole(`${day.weekday},\u00a0${day.day}`)}.`} />
      <div className="nv-content wa-narrow">
      <ConfigurationForm action={createShiftAction} className="wa-form">
      <input type="hidden" name="coverageRepairReview" value={params.review} />
      {Object.entries({ weekStart: locator.weekStart, employeeId: selected.employeeId, locationId: locator.locationId,
        date: locator.date, startTime: locator.startTime, endTime: locator.endTime, positionId: locator.positionId ?? '',
        ...(selected.isDesignatedLead ? { isDesignatedLead: 'on' } : {}) }).map(([name, value]) => <input type="hidden" name={name} value={value} key={name} />)}
      <Card title="Replacement" id="replacement-shift">
        <Facts label="Replacement shift">
          <Fact label="Person">{selected.employeeName}</Fact>
          <Fact label="Day">{keepWhole(`${day.weekday},\u00a0${day.day}, ${locator.date.slice(0, 4)}`)}</Fact>
          <Fact label="Time">{keepWhole(`${formatTime(locator.startTime)} – ${formatTime(locator.endTime)}`)}<span className="wa-muted">{"\u00a0·"}</span>{" "}<span className="wa-muted nv-keep">{keepDuration(durationMinutes(locator.startTime, locator.endTime))}</span>{nextDay ? <span className="wa-fact__more">{keepWhole(`Ends ${nextDay.weekday},\u00a0${nextDay.day}`)}</span> : null}</Fact>
          <Fact label="Location">{selected.locationName}</Fact>
          <Fact label="Position">{selected.positionName ?? "None needed"}</Fact>
          <Fact label="Shift lead">{selected.isDesignatedLead ? "Yes, needed" : "Not needed"}</Fact>
        </Facts>
      </Card>
      <Notice tone="info" quiet title={`This fills ${need}.`}>Anything else this shift still needs stays open on the schedule. Coverage is checked again when you save.</Notice>
      {selected.publication === 'PUBLISHED' ? <>
        <Notice tone="info" title="Published schedule change">Saving adds this assignment to the published schedule and may notify the affected employee. Notification delivery is not guaranteed by saving.</Notice>
        <div className={consentStyles.consent}>
          <input id="coverage-publication-consent" type="checkbox" name="publicationConsent" required />
          <label htmlFor="coverage-publication-consent">I also approve publishing this replacement and queuing the applicable employee notifications.</label>
        </div>
      </> : <Notice tone="info" quiet title="Draft assignment">Saving adds a draft shift. Publish the schedule separately when you are ready to notify employees.</Notice>}
      <FormActions>
        <PendingButton pending="Saving…" block>Save replacement</PendingButton>
        <Link className="nv-btn" data-kind="secondary" data-block="true" href={refreshHref}>Back to coverage</Link>
      </FormActions>
    </ConfigurationForm>
      </div>
    </div></ScopedReadFrame>;
  }
  const workspace = await getWorkspace();
  const todayDate = businessDate(new Date(), workspace.timeZone);
  const currentWeek = weekStartFor(todayDate);
  const weekStart = params.week && isValidWeekStart(params.week) ? params.week : currentWeek;
  // UX3: the day you came from, else today when it falls in this week, else the week's Monday.
  const date =
    params.date && isDateInWeek(params.date, weekStart)
      ? params.date
      : isDateInWeek(todayDate, weekStart) ? todayDate : weekStart;

  const access=await readOperationalAuthority(proof);
  if(access.state==='unavailable')return <OperationalUnavailable title="Shift creation unavailable" reason={access.reason}/>;
  if(access.scope?.mode!=='COMPANY'){
    if(access.scope?.mode!=='LOCATIONS'||!access.locations.length)return <OperationalUnavailable title="Shift creation unavailable" reason="access_denied"/>;
    if(params.locationId===undefined)return <ScopedReadFrame observation={scopedObservation(access)}><section className={'panel '+accessStyles.stack}><h1>Choose a location</h1><p>Select a managed location before assigning a shift.</p><form className={accessStyles.stack} method="get" action="/app/schedule/new"><input type="hidden" name="week" value={weekStart}/><SelectField className={accessStyles.search} name="locationId" label="Location" defaultValue="" required options={[{value:'',label:'Select a managed location',disabled:true},...access.locations.map(l=>({value:l.id,label:l.name}))]}/><button className="button primary" type="submit">Continue</button></form></section></ScopedReadFrame>;
    const source=await readOperationalShiftEditor(proof,{weekStart,locationId:params.locationId});
    if(source.state==='unavailable')return <OperationalUnavailable title="Shift creation unavailable" reason={source.reason} scoped/>;
    if(source.authority!==access.authority)return <OperationalUnavailable title="Shift creation unavailable" reason="source_changed" scoped/>;
    const observation={authority:source.authority,observedAt:access.observedAt,validForMs:Math.min(access.validForMs,source.validForMs)};
    if(source.data.saveAvailability!=='available')return <ScopedShiftReadOnly data={source.data} observation={observation}/>;
    return <ScopedReadFrame observation={observation}><ScopedManualShiftForm data={source.data} action={createShiftAction} locationName={access.locations.find(l=>l.id===source.data.locationId)?.name} prefill={{date,employeeId:params.employeeId,positionId:params.positionId,startTime:params.start,endTime:params.end,lead:params.lead==='1'}}/></ScopedReadFrame>;
  }
  const source=await withOperationalCompany(proof,()=>Promise.all([
    listEmployees(),
    listLocations(),
    listPositions(),
  ]));
  if(source.state==='unavailable')return <OperationalUnavailable title="Shift creation unavailable" reason={source.reason}/>;
  const [employees,locations,positions]=source.data;
  const locationId = locations.some(location => location.id === params.locationId) ? params.locationId! : "";
  // W2: Back returns to the day and person the form was opened for, when it was opened for one.
  const cancelHref = `/app/schedule?week=${weekStart}${locationId ? `&location=${encodeURIComponent(locationId)}` : ""}${params.date === date ? `&day=${date}` : ""}${params.employeeId ? `#schedule-employee-${encodeURIComponent(params.employeeId)}` : ""}`;
  // Release 1 (board O-AddShift): Add shift is the same sheet as Edit shift. Cancel, Add shift and Save in the bar, then
  // Person, Location and Position, Date, Start and End, Shift lead and Note, and Save shift.
  const blocked = !locations.length ? "Add a location first. A shift needs one." : !employees.some(item => item.active) ? "Add an employee first. A shift needs someone to work it." : undefined;
  return (<ScopedReadFrame observation={scopedObservation(source)}>
    <CorpPage className="c-shift-page" label={`Add shift, ${keepWhole(formatWeekRange(weekStart))}`}>
      <ScheduleShiftForm mode="add" formId={CREATE_SHIFT_FORM_ID} action={createShiftAction} employees={shiftFormEmployees(employees)} positions={positions}
        locations={locations} weekStart={weekStart} date={date} employeeId={params.employeeId} positionId={params.positionId} locationId={locationId}
        startTime={params.start} endTime={params.end} isDesignatedLead={params.lead === "1"} hidden={{ weekStart }} cancelHref={cancelHref} blocked={blocked} />
    </CorpPage>
  </ScopedReadFrame>);
}
