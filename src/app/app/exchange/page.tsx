import type { Metadata } from "next";
import { keepWhole } from "@/lib/keep-whole";
import {ResponsiveEmployeeRequests} from "@/components/employee-mobile/requests";
import {ResponsiveEmployeeExchange} from "@/components/employee-mobile/exchange";
import {employeeViewAuthority} from "@/lib/employee-view-authority.server";
import {randomUUID} from 'node:crypto';
import { moduleGate } from "@/lib/workspace-presentation/current.server";
import {ShiftChangeForm} from '@/components/shift-change-form';
import {ShiftChangeHistory} from '@/components/shift-change-history';
import {readShiftChangeHistoryView} from '@/lib/data/shift-change-views';
import {readShiftChangeAvailability,type ShiftChangeAvailability} from '@/lib/data/shift-changes';
import {refusalLines} from '@/lib/shift-changes/eligibility-reasons';
import {shiftChangeFeedback} from '@/components/shift-change-form-state';
import type {ShiftChangeCommand} from '@/lib/shift-changes/types';
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate, shiftBoundaryInstants } from "@/lib/business-time";
import { schedulingIssueMessage } from "@/lib/scheduling/validate-shift";
import { ManagerShiftRequests } from "@/components/manager-shift-requests";
import { shiftPlace } from "@/components/shift-requests-signature";
import { QuietHeader, QuietList, QuietNav, QuietPage, QuietRow, QuietSegments } from "@/components/quiet/quiet";
import { SheetRow } from "@/components/quiet/quiet-sheet";
import { isManagerRole } from "@/lib/auth/permissions";
import { requireSession,requireSessionMutationProof } from "@/lib/auth/session";
import { addDays } from "@/lib/date-utils";
import {
  marketplaceDisplayName,
  marketplaceRoleLabel,
  marketplaceView,
} from "@/lib/exchange-marketplace";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { sqlNotificationStateRepository } from "@/lib/data/notification-state";
import { getCallout, listEmployeeCallouts, shownCalloutTerms } from "@/lib/data/callouts";
import {
  getExchange,
  listEmployeeExchangeActivity,
  listEmployeePublishedShifts,
  listIncomingSwaps,
  listOpenCoverage,
} from "@/lib/data/exchanges";
import {readShiftChangeOperationView} from '@/lib/data/shift-change-views';
import "../requests/owner-lists.css";
import { workCopy } from "@/components/employee-b/work-copy";
import { readPortalLanguage } from "@/lib/activation/language.server";
import { exchangeCopy, exchangeDay, exchangeTime } from "./exchange-copy";

/** Review Nov 14 (AR-15): the browser tab names the page as its heading does: "Shift requests" for an Owner or Manager,
 * "Pick up and swap" for an Employee or Lead. */
export async function generateMetadata(): Promise<Metadata> {
  // Before any session proof (title only): English, as before.
  const t = exchangeCopy();
  return { title: isManagerRole((await requireSession()).role) ? t.titleShiftRequests : t.titlePickUpAndSwap };
}

export default async function ExchangePage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    offered?: string;
    claimed?: string;
    swapRequested?: string;
    swapAccepted?: string;
    swapDeclined?: string;
    reviewed?: string;
    approved?: string;
    cancelled?: string;
    calloutSubmitted?: string;
    calloutApproved?: string;
    calloutDenied?: string;
    calloutCancelled?: string;
    tab?: string;
    requestId?: string;
    operationId?:string;
  }>;
}) {
  const moduleOff = await moduleGate("marketplace");
  if (moduleOff) return moduleOff;

  const session = await requireSession();
  const workspace = await getWorkspace();
  const manager = isManagerRole(session.role);
  const proof = manager?null:await requireSessionMutationProof();
  const today = businessDate(new Date(), workspace.timeZone);
  const params = await searchParams;

  if (manager) return ManagerShiftRequests({ ...params, timeZone: workspace.timeZone });
  // G98 (Phase 2): an Employee's or Lead's page follows their language (saved choice, else the nv-lang cookie or the
  // browser's), read with the session proof this page already holds. English if that read fails.
  let lang:'en'|'es'='en';try{lang=(await readPortalLanguage(proof!)).language;}catch{/* English */}
  const t=exchangeCopy(lang);
  const marketplaceDate=(date:string)=>exchangeDay(date,lang),formatTime=(time:string)=>exchangeTime(time,lang);

  const [
    openCoverage,
    incomingSwaps,
    activity,
    myCallouts,
    assigned,
  ] = await Promise.all([
    listOpenCoverage(session.id, today),
    listIncomingSwaps(session.id),
    listEmployeeExchangeActivity(session.id),
    listEmployeeCallouts(session.id),
    listEmployeePublishedShifts(session.id,addDays(today,-1),undefined,true),
  ]);

  const activeView = marketplaceView(params.tab);
  const myExchangeActivity = activity.filter(
    (exchange) => exchange.requestedByEmployeeId === session.id || exchange.targetEmployeeId === session.id,
  );
  const visibleActivity = myExchangeActivity.slice(0, 8);
  const visibleCallouts = myCallouts.slice(0, 6);
  // A selected deep link may retain one permitted row beyond the ordinary window.
  // Default projections and all existing action authorization remain unchanged.
  if (params.requestId && safeReturnTo(`/app/exchange?tab=requests&requestId=${encodeURIComponent(params.requestId)}`)) {
    const access = await sqlNotificationStateRepository().recipientAccess(session.id);
    if (access?.active && access.employeeId === session.id && access.role === session.role) {
      const selectedExchange = activity.find(row => row.id === params.requestId) ?? await getExchange(params.requestId).catch(() => null);
      if (selectedExchange && selectedExchange.id === params.requestId && access.allowedLocationIds.includes(selectedExchange.sourceShift.locationId)
        && (selectedExchange.requestedByEmployeeId === session.id || (selectedExchange.targetEmployeeId === session.id && ['APPROVED', 'DENIED', 'CANCELLED', 'EXPIRED'].includes(selectedExchange.status)))
        && !visibleActivity.some(row => row.id === selectedExchange.id)) visibleActivity.push(selectedExchange);
      const selectedCallout = myCallouts.find(row => row.id === params.requestId) ?? await getCallout(params.requestId, undefined, { employeeView: true }).catch(() => null);
      if (selectedCallout && selectedCallout.id === params.requestId && selectedCallout.employeeId === session.id && access.allowedLocationIds.includes(selectedCallout.locationId)
        && !visibleCallouts.some(row => row.id === selectedCallout.id)) visibleCallouts.push(selectedCallout);
    }
  }
  const operation=params.operationId?await readShiftChangeOperationView(proof!,params.operationId):null;
  const available=openCoverage.filter(e=>e.actionable===true&&e.status==='OPEN');
  const incoming=incomingSwaps.filter(e=>e.status==='EMPLOYEE_PENDING'&&e.targetEmployeeId===session.id);
  const requestFields=(id:string,revision:number|undefined)=>revision&&Number.isSafeInteger(revision)?{requestId:id,expectedRevision:revision}:null;
  const availability=async (kind:ShiftChangeCommand['kind'],id:string,revision:number|undefined):Promise<ShiftChangeAvailability>=>{const fields=requestFields(id,revision);return fields?readShiftChangeAvailability(proof!,{kind,...fields,operationId:randomUUID()} as ShiftChangeCommand).catch(()=>({allowed:false,notice:t.checkFailed})):{allowed:false,notice:t.requestChanged};};
  const acceptViews=new Map(await Promise.all([...available,...incoming].map(async e=>[e.id,await availability('ACCEPT',e.id,e.requestRevision)] as const)));
  // B3: shifts the claim rules refuse are listed apart, with the rules named.
  const refused=(id:string)=>{const view=acceptViews.get(id);return view&&!view.allowed&&view.refusal!==undefined?view:null;};
  const claimable=available.filter(e=>!refused(e.id));
  const blocked=available.flatMap(e=>{const view=refused(e.id);return view?[{id:e.id,date:e.sourceShift.date,startTime:e.sourceShift.startTime,endTime:e.sourceShift.endTime,location:e.sourceShift.locationName,position:e.sourceShift.positionName??null,reasons:refusalLines(view, lang)}]:[];});
  const assignedShifts=assigned.filter(s=>{try{return Date.parse(shiftBoundaryInstants(s,workspace.timeZone).endAt)>new Date().getTime();}catch{return true;}});
  const selectedHistory=params.requestId?await readShiftChangeHistoryView(proof!,params.requestId).catch(()=>null):[];
  // An own report on a shift with held edits shows its published version in history too.
  const histories=new Map(await Promise.all([...visibleActivity.map(row=>[row,undefined] as const),...incoming.map(row=>[row,undefined] as const),...visibleCallouts.map(row=>[row,(terms:unknown)=>shownCalloutTerms(row,terms)] as const)].map(async ([row,shown])=>[row.id,await readShiftChangeHistoryView(proof!,row.id,undefined,shown).catch(()=>null)] as const)));

  if (!manager) {
    // v5 "One look" (approved Oct 24, 2026; mockup E09). Same reads, forms and authority as before: Open shifts, the swaps
    // waiting for your answer, and your own requests and shifts. Each row opens its details and actions as a sheet.
    const zone = workspace.timeZone;
    const view = params.tab === "foryou" || (!!params.requestId && incoming.some(row => row.id === params.requestId)) ? "foryou" : activeView;
    const otherName = (row: (typeof visibleActivity)[number]) => marketplaceDisplayName(row.requestedByEmployeeId === session.id ? (row.targetEmployeeName ?? row.targetShift?.employeeName ?? "") : row.requestedByName);
    const when = (shift: { date: string; startTime: string; endTime: string }) => keepWhole(`${marketplaceDate(shift.date)} · ${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`);
    const place = (shift: Parameters<typeof shiftPlace>[0]) => shiftPlace(shift, zone, lang);
    const exchangeWord = (status: string) => status === "OPEN" ? t.offered : status === "EMPLOYEE_PENDING" ? t.awaitingEmployee : status === "MANAGER_PENDING" ? t.manualReview : status === "APPROVED" ? t.completed : t.status(status);
    const calloutWord = (callout: (typeof visibleCallouts)[number]) => callout.status === "PENDING" ? t.waiting : callout.status === "APPROVED" ? (callout.releaseApplies ? t.approvedReleased : t.approvedStillYours) : t.status(callout.status);
    const yours = visibleActivity.length + visibleCallouts.length;
    const existing = (
      <QuietPage className="q-shiftreq employee-shift-requests-view">
        <QuietNav back={{ href: "/app/requests/hub", label: t.backRequests }} />
        <QuietHeader title={t.titleShiftRequests} />
        <QuietSegments label={t.views} items={[
          { href: "/app/exchange?tab=available", label: t.openShiftsTab(claimable.length), current: view === "available" },
          { href: "/app/exchange?tab=foryou", label: t.forYouTab(incoming.length), current: view === "foryou" },
          { href: "/app/exchange?tab=requests", label: t.yoursTab, current: view === "requests" },
        ]} />
        {params.error ? <p className="q-help q-help--alert" role="alert">{t.errors[params.error] ?? schedulingIssueMessage(params.error) ?? t.sendFailed}</p> : null}
        {operation ? <p className="q-help" role="status">{shiftChangeFeedback(operation, lang)}</p> : null}

        {view === "available" ? <>
          <QuietList><QuietRow href="/app/exchange/open-shifts" title={t.postedOpenShifts} /></QuietList>
          {claimable.length ? <ul className="q-list" style={{ marginTop: 16 }} aria-label={t.claimableList}>{claimable.map(exchange => (
            <SheetRow key={exchange.id} anchor={`request-${exchange.id}`} sheetTitle={t.openShift} title={when(exchange.sourceShift)}
              detail={keepWhole(t.fromPerson(place(exchange.sourceShift), marketplaceDisplayName(exchange.requestedByName)))}>
              <div className="q-hd employee-shift-entry"><h1>{keepWhole(marketplaceDate(exchange.sourceShift.date))}</h1><p>{keepWhole(`${formatTime(exchange.sourceShift.startTime)} – ${formatTime(exchange.sourceShift.endTime)}`)}</p></div>
              <ul className="q-list" style={{ marginTop: 16 }}>
                <QuietRow one title={t.location} value={place(exchange.sourceShift)} tone="l" />
                <QuietRow one title={t.offeredBy} value={`${marketplaceDisplayName(exchange.requestedByName)} · ${marketplaceRoleLabel(exchange.requestedByRole)}`} tone="l" />
                {exchange.targetShift ? <QuietRow title={t.inExchange} detail={when(exchange.targetShift)} /> : null}
              </ul>
              {!acceptViews.get(exchange.id)?.allowed ? <p className="q-help shift-change-unavailable">{acceptViews.get(exchange.id)?.notice}</p> : null}
              {acceptViews.get(exchange.id)?.allowed ? <div className="q-sheet-acts"><ShiftChangeForm fields={{ kind: "ACCEPT", ...requestFields(exchange.id, exchange.requestRevision)! }} className="shift-change-form q-scform"><button className="q-btn" type="submit">{t.claim}<span className="nv-sr">{t.claimSr}</span></button></ShiftChangeForm></div> : null}
              <p className="q-help">{acceptViews.get(exchange.id)?.outcome==='completed'?t.claimNow:t.claimRules}</p>
            </SheetRow>))}</ul>
            : <div className="q-emptyblock"><p className="q-emptyblock__title">{blocked.length ? t.noneFit : t.noneNow}</p><p className="q-help">{blocked.length ? t.belowBlocked : t.whenOffered}</p></div>}
          {blocked.length ? <section aria-labelledby="sr-blocked">
            <div className="q-grp"><h2 id="sr-blocked">{t.notOpenYet}</h2></div>
            <ul className="q-list">{blocked.map(shift => <QuietRow key={shift.id} title={<><span className="nv-sr">{marketplaceDate(shift.date)}, </span>{keepWhole(`${marketplaceDate(shift.date)} · ${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`)}</>}
              detail={<span aria-label={t.whyNot}>{(shift.reasons ?? []).join(" · ")}</span>} />)}</ul>
            {session.role === "EMPLOYEE" || session.role === "LEAD" ? <ul className="q-list" style={{ marginTop: 16 }}><QuietRow href="/app/availability" title={workCopy(lang).yourAvailability} detail={workCopy(lang).availabilitySub} /></ul> : null}
          </section> : null}
        </> : view === "foryou" ? (incoming.length ? <ul className="q-list" style={{ marginTop: 16 }} aria-label={t.swapsWaiting}>{incoming.map(exchange => (
          <SheetRow key={exchange.id} anchor={`request-${exchange.id}`} sheetTitle={t.swapRequest} title={t.wantsToSwap(marketplaceDisplayName(exchange.requestedByName))}
            detail={exchange.targetShift ? keepWhole(t.yourForTheir(marketplaceDate(exchange.targetShift.date), marketplaceDate(exchange.sourceShift.date))) : when(exchange.sourceShift)}>
            <div className="q-hd employee-shift-entry"><h1>{t.swapWith(marketplaceDisplayName(exchange.requestedByName).split(" ")[0])}</h1><p>{marketplaceRoleLabel(exchange.requestedByRole)}</p></div>
            <ul className="q-list" style={{ marginTop: 16 }}>
              {exchange.targetShift ? <QuietRow title={t.youGive} detail={`${when(exchange.targetShift)} · ${place(exchange.targetShift)}`} /> : null}
              <QuietRow title={exchange.targetShift ? t.youGet : t.theirShift} detail={`${when(exchange.sourceShift)} · ${place(exchange.sourceShift)}`} />
            </ul>
            {!requestFields(exchange.id, exchange.requestRevision) ? <p className="q-help shift-change-unavailable">{t.requestChanged}</p> : !acceptViews.get(exchange.id)?.allowed ? <p className="q-help shift-change-unavailable">{acceptViews.get(exchange.id)?.notice}</p> : null}
            <div className="q-history"><ShiftChangeHistory events={histories.get(exchange.id) ?? null} /></div>
            {requestFields(exchange.id, exchange.requestRevision) ? <div className="q-sheet-acts"><ShiftChangeForm fields={requestFields(exchange.id, exchange.requestRevision)!} className="shift-change-form q-scform">
              {acceptViews.get(exchange.id)?.allowed ? <button className="q-btn" name="kind" value="ACCEPT" type="submit">{t.accept}</button> : null}
              <button className="q-btn q-btn--sec" name="kind" value="DECLINE" type="submit">{t.decline}</button>
            </ShiftChangeForm></div> : null}
            <p className="q-help">{t.acceptHelp}</p>
          </SheetRow>))}</ul>
          : <div className="q-emptyblock"><p className="q-emptyblock__title">{t.nothingWaiting}</p><p className="q-help">{t.whenAsked}</p></div>)
        : <>
          {yours ? <ul className="q-list" style={{ marginTop: 16 }} aria-label={t.yourRequests}>
            {visibleActivity.map(exchange => (
              <SheetRow key={exchange.id} anchor={`request-${exchange.id}`} sheetTitle={exchange.kind === "COVERAGE" ? t.coverOffer : t.swap}
                title={exchange.kind === "COVERAGE" ? t.coverOn(keepWhole(marketplaceDate(exchange.sourceShift.date))) : otherName(exchange) ? t.swapNamed(otherName(exchange)) : t.swap}
                detail={`${when(exchange.sourceShift)} · ${exchangeWord(exchange.status)}`}>
                <div className="q-hd employee-shift-entry"><h1>{exchange.kind === "COVERAGE" ? t.offeredForCover : otherName(exchange) ? t.swapWith(otherName(exchange).split(" ")[0]) : t.swap}</h1><p>{exchangeWord(exchange.status)}</p></div>
                <ul className="q-list" style={{ marginTop: 16 }}>
                  <QuietRow title={t.yourShift} detail={`${when(exchange.sourceShift)} · ${place(exchange.sourceShift)}`} />
                  {exchange.targetShift ? <QuietRow title={t.forShift} detail={`${when(exchange.targetShift)} · ${place(exchange.targetShift)}`} /> : null}
                </ul>
                {exchange.actionable === false && ["OPEN", "EMPLOYEE_PENDING", "MANAGER_PENDING"].includes(exchange.status) ? <p className="q-help shift-change-unavailable">{t.needsReview}</p> : null}
                <div className="q-history"><ShiftChangeHistory events={histories.get(exchange.id) ?? null} /></div>
                <div className="q-sheet-acts employee-shift-entry-actions" data-status={exchange.status}>
                  {exchange.requestedByEmployeeId === session.id && requestFields(exchange.id, exchange.requestRevision) && ["OPEN", "EMPLOYEE_PENDING", "MANAGER_PENDING"].includes(exchange.status) ? <ShiftChangeForm fields={{ kind: "CANCEL", ...requestFields(exchange.id, exchange.requestRevision)! }} className="shift-change-form q-scform"><button className="q-btn q-btn--sec q-btn--danger" type="submit">{t.withdrawRequest}</button></ShiftChangeForm> : null}
                  {exchange.status === "MANAGER_PENDING" && exchange.targetEmployeeId === session.id && requestFields(exchange.id, exchange.requestRevision) ? <ShiftChangeForm fields={{ kind: "WITHDRAW", ...requestFields(exchange.id, exchange.requestRevision)! }} className="shift-change-form q-scform"><button className="q-btn q-btn--sec q-btn--danger" type="submit">{t.withdrawResponse}</button></ShiftChangeForm> : null}
                </div>
              </SheetRow>))}
            {visibleCallouts.map(callout => (
              <SheetRow key={callout.id} anchor={`request-${callout.id}`} sheetTitle={t.cantWork} title={t.cantWorkOn(keepWhole(marketplaceDate(callout.date)))}
                detail={`${keepWhole(`${formatTime(callout.startTime)} – ${formatTime(callout.endTime)}`)} · ${calloutWord(callout)}`}>
                <div className="q-hd employee-shift-entry"><h1>{keepWhole(marketplaceDate(callout.date))}</h1><p>{calloutWord(callout)}</p></div>
                <ul className="q-list" style={{ marginTop: 16 }}>
                  <QuietRow one title={t.shift} value={keepWhole(`${formatTime(callout.startTime)} – ${formatTime(callout.endTime)}`)} tone="l" />
                  <QuietRow one title={t.location} value={callout.locationName} tone="l" />
                  <QuietRow one title={t.reason} value={t.calloutReasons[callout.reasonCode] ?? callout.reasonCode} tone="l" />
                </ul>
                {callout.status === "APPROVED" && !callout.releaseApplies ? <p className="q-help shift-change-unavailable">{t.approvedEarlier}</p> : null}
                <div className="q-history"><ShiftChangeHistory events={histories.get(callout.id) ?? null} /></div>
                <div className="q-sheet-acts employee-shift-entry-actions" data-status={callout.status}>
                  {callout.status === "PENDING" && requestFields(callout.id, callout.requestRevision) ? <ShiftChangeForm fields={{ kind: "CANCEL_CALLOUT", ...requestFields(callout.id, callout.requestRevision)! }} className="shift-change-form q-scform"><button className="q-btn q-btn--sec q-btn--danger" type="submit">{t.withdrawRequest}</button></ShiftChangeForm> : null}
                </div>
              </SheetRow>))}
          </ul> : <div className="q-emptyblock"><p className="q-emptyblock__title">{t.noRequests}</p><p className="q-help">{t.requestsShowHere}</p></div>}
          {assignedShifts.length ? <section aria-labelledby="sr-shifts">
            <div className="q-grp"><h2 id="sr-shifts">{t.yourShifts}</h2></div>
            <ul className="q-list">{assignedShifts.map(shift => <QuietRow key={shift.id} href={`/app/schedule?week=${encodeURIComponent(shift.weekStart)}&day=${encodeURIComponent(shift.date)}&shift=${encodeURIComponent(shift.id)}`}
              title={when(shift)} detail={place(shift)} label={t.shiftOptions(when(shift))} />)}</ul>
            <p className="q-help">{t.openAShift}</p>
          </section> : null}
          {(selectedHistory === null || selectedHistory.length > 0) && !visibleActivity.some(e => e.id === params.requestId) && !visibleCallouts.some(e => e.id === params.requestId) ? <section aria-labelledby="sr-history"><div className="q-grp"><h2 id="sr-history">{t.originalHistory}</h2></div><div className="q-history"><ShiftChangeHistory events={selectedHistory} /></div></section> : null}
        </>}
      </QuietPage>
    );
    return view==='available'?<ResponsiveEmployeeRequests mode="open" selected={params.requestId} authority={employeeViewAuthority(proof!,'requests')}>{existing}</ResponsiveEmployeeRequests>:<ResponsiveEmployeeExchange mode={view==='foryou'?'incoming':'mine'} selection={params.requestId??null} authority={employeeViewAuthority(proof!,'exchange')}>{existing}</ResponsiveEmployeeExchange>;
  }

  return null;
}
