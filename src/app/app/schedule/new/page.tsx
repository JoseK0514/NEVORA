import accessStyles from '@/components/company-access/company-access.module.css';
import {readOperationalShiftEditor} from '@/lib/company-access/operational-read.server';
import {ScopedManualShiftForm} from '@/components/company-access/scoped-manual-shift-form';
import {ScopedShiftReadOnly} from '@/components/company-access/scoped-operational-views';
import {SelectField} from '@/components/select-field';
import {readOperationalAuthority,withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {listPositions} from "@/lib/data/positions";
import { CreateShiftForm } from "@/components/create-shift-form";
import { QuietHeader, QuietNav } from "@/components/quiet/quiet";
import { ConfigurationForm } from "@/components/configuration-form";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import { keepWhole } from "@/lib/keep-whole";
import { durationText } from "@/lib/duration-text";
import Link from "next/link";
import { createShiftAction } from "@/app/app/schedule/actions";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { decodeCoverageRepairReview, readCoverageRepairSelection } from "@/lib/data/coverage-repair.server";
import { coverageRepairUrl, CoverageRepairConflictError } from "@/lib/scheduling/coverage-repair";
import { listEmployees, listLocations } from "@/lib/data/employees";
import {
  addDays, durationMinutes, formatHours,
  formatDayLabel, formatTime, formatWeekRange,
  isDateInWeek,
  isValidWeekStart, weekStartFor,
} from "@/lib/date-utils";


export const metadata = { title: "New shift" };

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
    // T-7 (Team U2, Oct 25, 2026): the replacement review is the shift sheet, read-only: Cancel · Replacement · Save.
    if(source.data.kind==='conflict')return <ScopedReadFrame observation={source}><div className="q-page" data-nv-page="" data-q-sheet="">
        <QuietNav back={{ href: source.data.href, label: "Find cover" }} />
        <QuietHeader title="This shift changed" sub="Someone edited it after you opened it. Nothing was saved." />
        <Link className="q-btn" href={source.data.href}>Open current review</Link>
      </div></ScopedReadFrame>;
    const selected=source.data.selected;
    const { locator } = selected;
    const day = formatDayLabel(locator.date);
    const midnight = locator.endTime === "24:00" || locator.endTime === "00:00";
    const nextDay = !midnight && locator.endTime < locator.startTime ? formatDayLabel(addDays(locator.date, 1)) : null;
    const refreshHref = coverageRepairUrl(locator, true);
    const need = locator.target === "POSITION" ? "the position requirement" : locator.target === "LEAD" ? "the lead requirement" : "the staffing requirement";
    const firstName = selected.employeeName.split(/\s+/)[0] ?? selected.employeeName;
    const row = (title: string, value: string) => <li><div className="q-row q-row--one"><span className="q-rt"><b>{title}</b></span><span className="q-rv q-rv--l">{value}</span></div></li>;
    return <ScopedReadFrame observation={source}><div className="q-page u2-shift" data-nv-page="" data-q-sheet="">
      <QuietNav left={<Link className="q-nav__l q-nav__l--teal" href={refreshHref}>Cancel</Link>} title="Replacement"
        right={<button type="submit" form="replacement-form" className="q-nav__r q-nav__r--b u2-save" aria-label="Save replacement"><span className="u2-save__label">Save</span><span className="u2-spin u2-save__spin" aria-hidden="true" /></button>} />
      <h1 className="q-sr">{`Review replacement: ${selected.employeeName}, ${keepWhole(`${day.weekday},\u00a0${day.day}`)}`}</h1>
      <ConfigurationForm action={createShiftAction} className="q-shift-form" id="replacement-form">
      <input type="hidden" name="coverageRepairReview" value={params.review} />
      {Object.entries({ weekStart: locator.weekStart, employeeId: selected.employeeId, locationId: locator.locationId,
        date: locator.date, startTime: locator.startTime, endTime: locator.endTime, positionId: locator.positionId ?? '',
        ...(selected.isDesignatedLead ? { isDesignatedLead: 'on' } : {}) }).map(([name, value]) => <input type="hidden" name={name} value={value} key={name} />)}
      <div className="q-grp q-grp--m"><h2>Who and where</h2></div>
      <ul className="q-list" id="replacement-shift" aria-label="Replacement shift">
        {row("Person", selected.employeeName)}
        {row("Location", selected.locationName)}
        {row("Position", selected.positionName ?? "None")}
      </ul>
      <div className="q-grp"><h2>When</h2></div>
      <ul className="q-list">
        {row("Date", keepWhole(`${day.weekday},\u00a0${day.day}`))}
        {row("Starts", formatTime(locator.startTime))}
        {row("Ends", midnight ? "midnight" : `${formatTime(locator.endTime)}${nextDay ? ` ${nextDay.weekday}` : ""}`)}
        {row("Shift lead", selected.isDesignatedLead ? "Yes, needed" : "Not needed")}
      </ul>
      <p className="q-help">{`${formatHours(durationMinutes(locator.startTime, locator.endTime))}${nextDay ? ` · Ends ${nextDay.weekday},\u00a0${nextDay.day}` : ""}. This fills ${need}. Anything else this shift still needs stays open on the schedule.`}</p>
      {selected.publication === 'PUBLISHED' ? <ul className="q-list q-shift-form__more">
        <li><label className="q-row" htmlFor="coverage-publication-consent">
          <span className="q-rt"><b>Publish this change</b><i>{`${firstName} may get a notification.`}</i></span>
          <input id="coverage-publication-consent" type="checkbox" role="switch" className="q-tog" name="publicationConsent" required aria-describedby="coverage-publication-help" />
        </label></li>
      </ul> : null}
      <p className="q-help" id="coverage-publication-help">{selected.publication === 'PUBLISHED' ? "Saving updates the published schedule. Turn on Publish this change to save." : "Saving adds a draft. Publish when you’re ready."}</p>
    </ConfigurationForm>
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
  const weekEnd = addDays(weekStart, 6);

  const access=await readOperationalAuthority(proof);
  if(access.state==='unavailable')return <OperationalUnavailable title="Shift creation unavailable" reason={access.reason}/>;
  if(access.scope?.mode!=='COMPANY'){
    if(access.scope?.mode!=='LOCATIONS'||!access.locations.length)return <OperationalUnavailable title="Shift creation unavailable" reason="access_denied"/>;
    if(params.locationId===undefined)return <ScopedReadFrame observation={access}><section className={'panel '+accessStyles.stack}><h1>Choose a location</h1><p>Select a managed location before assigning a shift.</p><form className={accessStyles.stack} method="get" action="/app/schedule/new"><input type="hidden" name="week" value={weekStart}/><SelectField className={accessStyles.search} name="locationId" label="Location" defaultValue="" required options={[{value:'',label:'Select a managed location',disabled:true},...access.locations.map(l=>({value:l.id,label:l.name}))]}/><button className="button primary" type="submit">Continue</button></form></section></ScopedReadFrame>;
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
  // Quiet (v4, approved Oct 23; Team U2 Oct 25): Add shift is a sheet; the form draws its own bar (Cancel · New shift · Add).
  return (<ScopedReadFrame observation={source}>
    <div className="q-page" data-nv-page="" data-q-sheet="">
      <h1 className="q-sr">{`Add shift, ${keepWhole(formatWeekRange(weekStart))}`}</h1>
      <CreateShiftForm action={createShiftAction} employees={employees} locations={locations} positions={positions} weekStart={weekStart} weekEnd={weekEnd} date={date} employeeId={params.employeeId} positionId={params.positionId} locationId={locationId} startTime={params.start} endTime={params.end} isDesignatedLead={params.lead === "1"} cancelHref={cancelHref} />
    </div>
  </ScopedReadFrame>);
}
