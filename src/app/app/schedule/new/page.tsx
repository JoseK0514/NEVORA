import {scopedObservation} from '@/lib/company-access/observation';
import accessStyles from '@/components/company-access/company-access.module.css';
import {readOperationalShiftEditor} from '@/lib/company-access/operational-read.server';
import {ScopedManualShiftForm} from '@/components/company-access/scoped-manual-shift-form';
import {ScopedShiftReadOnly} from '@/components/company-access/scoped-operational-views';
import {SelectField} from '@/components/select-field';
import {RootChrome} from '@/components/root-chrome';
import {assertOperationalAccess,isOperationalAuthorizationError,readOperationalAuthority,withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {assertWorkforcePermission} from '@/lib/workforce/authority.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {listPositions} from "@/lib/data/positions";
import { ScheduleShiftForm } from "@/components/schedule-shift-form";
import {shiftFormEmployees} from '@/lib/scheduling/shift-form-employee';
import { CorpBody, CorpButtonLink, CorpCard, CorpNav, CorpPage, CorpTitle } from "@/components/corp/corp";
import { CoverageReview, type CoverageReviewMode } from "@/components/coverage-review";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import { keepWhole } from "@/lib/keep-whole";

import { createShiftAction } from "@/app/app/schedule/actions";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { decodeCoverageRepairReview, readCoverageRepairSelection, readScopedCoverageRepairSelection } from "@/lib/data/coverage-repair.server";
import { coverDraftShiftUrl, coverageRepairUrl, CoverageRepairConflictError } from "@/lib/scheduling/coverage-repair";
import { listEmployees, listLocations } from "@/lib/data/employees";
import {
  formatWeekRange,
  isDateInWeek,
  isValidWeekStart, weekStartFor,
} from "@/lib/date-utils";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Add shift" };


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
    const access=await readOperationalAuthority(proof);
    const scoped=access.state==='ready' && access.scope?.mode==='LOCATIONS';
    const reviewToken=params.review;
    const conflict = () => {
      let href='/app/schedule';
      try{href=coverageRepairUrl(decodeCoverageRepairReview(reviewToken,proof).locator,true);}catch{/* No trusted locator. */}
      return {kind:'conflict' as const,href};
    };
    const scopedRead = scoped ? await readScopedCoverageRepairSelection(reviewToken,proof) : null;
    const source = scopedRead
      ? scopedRead.state==='unavailable' ? scopedRead : {...scopedRead,data:scopedRead.data ? {kind:'selected' as const,selected:scopedRead.data} : conflict()}
      : await withOperationalCompany(proof,async()=>{
        try{return {kind:'selected' as const,selected:await readCoverageRepairSelection(reviewToken,proof)};}
        catch(error){
          if(!(error instanceof CoverageRepairConflictError))throw error;
          return conflict();
        }
      });
    if(source.state==='unavailable')return <OperationalUnavailable title="Replacement review unavailable" reason={source.reason} scoped={scoped}/>;
    if(source.data.kind==='conflict')return <ScopedReadFrame observation={scopedObservation(source)}>
      <CorpPage className="c-cover c-page--narrow" labelledBy="review-title">
        <CorpNav back={{ href: source.data.href, label: "Coverage" }} title="Coverage changed" titleId="review-title" phoneOnly />
        <CorpTitle title="Coverage changed" wide />
        <CorpCard label="Nothing was saved">
          <CorpBody>
            <p className="c-cover__text">Someone changed this shift after you opened the review.</p>
            <CorpButtonLink href={source.data.href} full>Open current review</CorpButtonLink>
          </CorpBody>
        </CorpCard>
      </CorpPage></ScopedReadFrame>;
    const selected=source.data.selected;
    // QA S-06 (Nov 21, 2026): on a published week this replacement is a published change, which the writer allows only with
    // company-wide access and Publish schedules here (commitPublishedWeekChange). Ask first, instead of offering the
    // acknowledgement and then refusing the save.
    const canSave=!scoped && (selected.publication!=='PUBLISHED'||await mayChangePublished(proof,selected.locator.locationId));
    const scopedDraft = scoped && 'draft' in selected && selected.draft === true;
    const { locator } = selected;
    const mode: CoverageReviewMode = scoped ? (scopedDraft ? 'scoped-draft' : 'scoped-ask')
      : !canSave ? 'needs-publish-permission' : selected.publication === 'PUBLISHED' ? 'publish' : 'draft';
    return <ScopedReadFrame observation={scopedObservation(source)}><CoverageReview
      mode={mode} employeeName={selected.employeeName} replacedName={selected.replaced?.employeeName ?? null}
      shift={selected.shift} locationName={selected.locationName}
      positionName={selected.positionName} isDesignatedLead={selected.isDesignatedLead}
      needLabel={locator.target === "POSITION" ? `the ${selected.positionName ?? "position"} need` : locator.target === "LEAD" ? "the shift lead need" : "the staffing need"}
      weekHours={selected.weekHours} warnings={selected.warnings}
      backHref={coverageRepairUrl(locator, true)}
      draftHref={scopedDraft ? coverDraftShiftUrl(locator,selected.isDesignatedLead,selected.employeeId) : undefined}
      action={createShiftAction}
      hidden={{ coverageRepairReview: reviewToken, weekStart: locator.weekStart, employeeId: selected.employeeId, locationId: locator.locationId,
        date: locator.date, startTime: locator.startTime, endTime: locator.endTime, positionId: locator.positionId ?? '',
        ...(selected.isDesignatedLead ? { isDesignatedLead: 'on' } : {}) }} /></ScopedReadFrame>;
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
    if(params.locationId===undefined)return <ScopedReadFrame observation={scopedObservation(access)}><section className={'panel '+accessStyles.stack}><RootChrome/><h1>Choose a location</h1><p>Select a managed location before assigning a shift.</p><form className={accessStyles.stack} method="get" action="/app/schedule/new"><input type="hidden" name="week" value={weekStart}/><SelectField className={accessStyles.search} name="locationId" label="Location" defaultValue="" required options={[{value:'',label:'Select a managed location',disabled:true},...access.locations.map(l=>({value:l.id,label:l.name}))]}/><button className="button primary" type="submit">Continue</button></form></section></ScopedReadFrame>;
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

/** The writer's rule for changing a published week: company-wide access and Publish schedules at the location. */
async function mayChangePublished(proof:Awaited<ReturnType<typeof requireSessionMutationProof>>,locationId:string):Promise<boolean>{
  try{
    const company=await assertOperationalAccess(proof,{kind:'COMPANY'});
    await assertWorkforcePermission(proof,'PUBLISH_SCHEDULE',[locationId],undefined,company);
    return true;
  }catch(error){
    if(isOperationalAuthorizationError(error))return false;
    throw error;
  }
}
