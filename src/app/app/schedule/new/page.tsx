import {scopedObservation} from '@/lib/company-access/observation';
import {readOperationalShiftEditor} from '@/lib/company-access/operational-read.server';
import type {OperationalShiftEditorData} from '@/lib/company-access/model';
import {ScopedShiftDetails,scopedShiftChoices,scopedShiftPositions,scopedShiftReason} from '@/components/company-access/scoped-shift-sheet';
import {assertOperationalAccess,isOperationalAuthorizationError,readOperationalAuthority,withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {assertWorkforcePermission} from '@/lib/workforce/authority.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {listPositions} from "@/lib/data/positions";
import { ScheduleShiftForm } from "@/components/schedule-shift-form";
import {shiftFormEmployees} from '@/lib/scheduling/shift-form-employee';
import { CorpBody, CorpButtonLink, CorpCard, CorpNav, CorpPage, CorpTitle } from "@/components/corp/corp";
import { CoverageReview, type CoverageReviewMode } from "@/components/coverage-review";
import { HeldReviewNote } from "@/components/coverage-review-hold";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import { keepWhole } from "@/lib/keep-whole";
import { readPortalLanguage } from "@/lib/activation/language.server";
import { scheduleWords, weekRange, type ScheduleLang } from "../schedule-copy";

import { createShiftAction } from "@/app/app/schedule/actions";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { decodeCoverageRepairReview, readCoverageRepairSelection, readScopedCoverageRepairSelection } from "@/lib/data/coverage-repair.server";
import { coverDraftShiftUrl, coverageRepairUrl, CoverageRepairConflictError } from "@/lib/scheduling/coverage-repair";
import { listEmployees, listLocations } from "@/lib/data/employees";
import {
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
  let lang:ScheduleLang='en';try{lang=(await readPortalLanguage(proof)).language;}catch{/* English */}
  const t=scheduleWords(lang).add,pageLang=lang==='es'?'es':undefined;
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
    if(source.state==='unavailable')return <OperationalUnavailable lang={lang} title={t.reviewUnavailable} reason={source.reason} scoped={scoped}/>;
    if(source.data.kind==='conflict')return <ScopedReadFrame observation={scopedObservation(source)}>
      <CorpPage className="c-cover c-page--narrow" labelledBy="review-title" lang={pageLang}>
        <CorpNav back={{ href: source.data.href, label: t.coverage }} title={t.coverageChanged} titleId="review-title" phoneOnly />
        <CorpTitle title={t.coverageChanged} wide />
        {/* G58 (Nov 23, 2026): this page can't know who changed the shift; after a slow Publish it was the person's own
          * save. So no "Nothing was saved" and no "Someone": only what is true either way. */}
        {/* G71: after a reply that never came, this tab keeps the review's unconfirmed note and Check coverage here. */}
        <HeldReviewNote token={reviewToken}><CorpCard>
          <CorpBody>
            <p className="c-cover__text">{t.updatedAfter}</p>
            <CorpButtonLink href={source.data.href} full>{t.openCurrent}</CorpButtonLink>
          </CorpBody>
        </CorpCard></HeldReviewNote>
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
  if(access.state==='unavailable')return <OperationalUnavailable lang={lang} title={t.unavailable} reason={access.reason}/>;
  if(access.scope?.mode!=='COMPANY'){
    if(access.scope?.mode!=='LOCATIONS'||!access.locations.length)return <OperationalUnavailable lang={lang} title={t.unavailable} reason="access_denied"/>;
    // Phase 2 (queue C2-Ml): a location Manager gets the Owner's Add shift sheet, fed by the scoped editor read of each of
    // their places. One place is fixed in the sheet; several are its Location field (no separate "Choose a location" step).
    // An explicit destination that isn't theirs still goes to the guarded read, which refuses it; it is never swapped.
    const explicit=params.locationId!==undefined;
    const placeIds=explicit&&!access.locations.some(l=>l.id===params.locationId)?[params.locationId!]:access.locations.map(l=>l.id);
    const sources=await Promise.all(placeIds.map(locationId=>readOperationalShiftEditor(proof,{weekStart,locationId})));
    const reads:OperationalShiftEditorData[]=[];let validForMs=access.validForMs;
    for(const source of sources){
      if(source.state==='unavailable')return <OperationalUnavailable lang={lang} title={t.unavailable} reason={source.reason} scoped/>;
      if(source.authority!==access.authority)return <OperationalUnavailable lang={lang} title={t.unavailable} reason="source_changed" scoped/>;
      reads.push(source.data);validForMs=Math.min(validForMs,source.validForMs);
    }
    const observation={authority:access.authority,observedAt:access.observedAt,validForMs};
    const placeName=(id:string)=>{const place=access.locations.find(l=>l.id===id);return place?(place.shortName||place.name):id;};
    const open=reads.filter(read=>read.saveAvailability==='available');
    if(!open.length){
      const shown=reads.find(read=>read.locationId===params.locationId)??reads[0];
      return <ScopedReadFrame observation={observation}><CorpPage className="c-shift-page" label={t.title} lang={pageLang}>
        <ScopedShiftDetails lang={lang} data={shown} title={t.title} placeName={placeName(shown.locationId)} backHref={`/app/schedule?week=${weekStart}&location=${encodeURIComponent(shown.locationId)}`} reason={scopedShiftReason(shown,placeName(shown.locationId),lang)}/>
      </CorpPage></ScopedReadFrame>;
    }
    const fixed=open.length===1?open[0].locationId:null;
    const chosen=fixed??(open.some(read=>read.locationId===params.locationId)?params.locationId!:'');
    const employees=scopedShiftChoices(open),positions=scopedShiftPositions(open);
    // Prefills only what the scoped read offers at the chosen place.
    const person=employees.find(item=>item.id===params.employeeId&&(!chosen||item.locationIds?.includes(chosen)));
    const positionId=person&&params.positionId&&person.positionIds?.includes(params.positionId)&&positions.some(item=>item.id===params.positionId)?params.positionId:undefined;
    const cancelHref=`/app/schedule?week=${weekStart}${chosen?`&location=${encodeURIComponent(chosen)}`:''}${params.date===date?`&day=${date}`:''}${person?`#schedule-employee-${encodeURIComponent(person.id)}`:''}`;
    const blocked=employees.length?undefined:t.nobodyAt(fixed?placeName(fixed):null);
    return <ScopedReadFrame observation={observation}><CorpPage className="c-shift-page" label={t.titleWithWeek(keepWhole(weekRange(weekStart, lang)))} lang={pageLang}>
      <ScheduleShiftForm mode="add" formId={CREATE_SHIFT_FORM_ID} action={createShiftAction} employees={employees} positions={positions}
        {...(fixed?{fixedLocation:placeName(fixed),fixedLocationHelp:null}:{locations:open.map(read=>({id:read.locationId,shortName:placeName(read.locationId)}))})}
        weekStart={weekStart} date={date} employeeId={person?.id} positionId={positionId} locationId={chosen}
        startTime={params.start} endTime={params.end} isDesignatedLead={params.lead==="1"} hidden={fixed?{weekStart,locationId:fixed}:{weekStart}} cancelHref={cancelHref} blocked={blocked} holdAfterUnconfirmed/>
    </CorpPage></ScopedReadFrame>;
  }
  const source=await withOperationalCompany(proof,()=>Promise.all([
    listEmployees(),
    listLocations(),
    listPositions(),
  ]));
  if(source.state==='unavailable')return <OperationalUnavailable lang={lang} title={t.unavailable} reason={source.reason}/>;
  const [employees,locations,positions]=source.data;
  const locationId = locations.some(location => location.id === params.locationId) ? params.locationId! : "";
  // W2: Back returns to the day and person the form was opened for, when it was opened for one.
  const cancelHref = `/app/schedule?week=${weekStart}${locationId ? `&location=${encodeURIComponent(locationId)}` : ""}${params.date === date ? `&day=${date}` : ""}${params.employeeId ? `#schedule-employee-${encodeURIComponent(params.employeeId)}` : ""}`;
  // Release 1 (board O-AddShift): Add shift is the same sheet as Edit shift. Cancel, Add shift and Save in the bar, then
  // Person, Location and Position, Date, Start and End, Shift lead and Note, and Save shift.
  const blocked = !locations.length ? t.locationFirst : !employees.some(item => item.active) ? t.employeeFirst : undefined;
  return (<ScopedReadFrame observation={scopedObservation(source)}>
    <CorpPage className="c-shift-page" label={t.titleWithWeek(keepWhole(weekRange(weekStart, lang)))} lang={pageLang}>
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
