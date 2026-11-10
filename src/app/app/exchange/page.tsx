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
import { QuietHeader, QuietNav, QuietPage, QuietRow, QuietSegments } from "@/components/quiet/quiet";
import { SheetRow } from "@/components/quiet/quiet-sheet";
import { isManagerRole } from "@/lib/auth/permissions";
import { requireSession,requireSessionMutationProof } from "@/lib/auth/session";
import {
  formatDayLabel,
  addDays,
  formatTime,
} from "@/lib/date-utils";
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

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_SHIFT: "That shift is no longer available for exchange.",
  SHIFT_ALREADY_OFFERED: "One of those shifts already has an active coverage or swap request.",
  LOCATION_NOT_ELIGIBLE: "One of you can’t work at that location.",
  SHIFT_OVERLAP: "That would give one of you two shifts at the same time.",
  APPROVED_TIME_OFF: "That conflicts with approved time off.",
  OUTSIDE_AVAILABILITY: "That’s outside the availability one of you sent.",
  EMPLOYEE_INACTIVE: "One of you is no longer active, so this can’t go ahead.",
  INVALID_TIME_RANGE: "The shift time is invalid.",
  EXCHANGE_UNAVAILABLE: "That exchange is no longer available.",
  EXCHANGE_TAKEN: "Another employee already claimed that shift.",
  SAME_SHIFT: "Choose a different shift to swap.",
  NOT_SHIFT_OWNER: "You can only swap one of your own shifts.",
  SAME_EMPLOYEE: "A direct swap must be with another employee.",
  DIFFERENT_WEEK: "Direct swaps must stay within the same schedule week.",
  EMPLOYEE_NOT_FOUND: "We couldn’t find one of the people on this request.",
  INVALID_DECISION: "We couldn’t save that answer. Try again.",
  NOT_TARGET_EMPLOYEE: "Only the person you asked can accept this swap.",
  EXCHANGE_CHANGED: "The schedule changed before approval. Review the request again.",
  CALLOUT_EXISTS: "This shift already has a can’t-work request.",
};

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function calloutReason(code: string) {
  const labels: Record<string, string> = {
    ILLNESS: "Illness / sick",
    FAMILY_EMERGENCY: "Family emergency",
    TRANSPORTATION: "Transportation issue",
    SCHOOL: "School conflict",
    PERSONAL_EMERGENCY: "Personal emergency",
    OTHER: "Other",
  };
  return labels[code] ?? code;
}

function marketplaceDate(date: string) {
  const label = formatDayLabel(date);
  return `${label.weekday}, ${label.day}`;
}

export const metadata = { title: "Shift requests" };

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
  const availability=async (kind:ShiftChangeCommand['kind'],id:string,revision:number|undefined):Promise<ShiftChangeAvailability>=>{const fields=requestFields(id,revision);return fields?readShiftChangeAvailability(proof!,{kind,...fields,operationId:randomUUID()} as ShiftChangeCommand).catch(()=>({allowed:false,notice:'We couldn’t check this right now. Reload to try again.'})):{allowed:false,notice:'This request changed. Reload to see the latest.'};};
  const acceptViews=new Map(await Promise.all([...available,...incoming].map(async e=>[e.id,await availability('ACCEPT',e.id,e.requestRevision)] as const)));
  // B3: shifts the claim rules refuse are listed apart, with the rules named.
  const refused=(id:string)=>{const view=acceptViews.get(id);return view&&!view.allowed&&view.refusal!==undefined?view:null;};
  const claimable=available.filter(e=>!refused(e.id));
  const blocked=available.flatMap(e=>{const view=refused(e.id);return view?[{id:e.id,date:e.sourceShift.date,startTime:e.sourceShift.startTime,endTime:e.sourceShift.endTime,location:e.sourceShift.locationName,position:e.sourceShift.positionName??null,reasons:refusalLines(view)}]:[];});
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
    const place = (shift: Parameters<typeof shiftPlace>[0]) => shiftPlace(shift, zone);
    const exchangeWord = (status: string) => status === "OPEN" ? "Offered" : status === "EMPLOYEE_PENDING" ? "Awaiting employee" : status === "MANAGER_PENDING" ? "Manual review" : status === "APPROVED" ? "Completed" : statusLabel(status);
    const calloutWord = (callout: (typeof visibleCallouts)[number]) => callout.status === "PENDING" ? "Waiting" : callout.status === "APPROVED" ? (callout.releaseApplies ? "Approved · shift released" : "Approved earlier · still your shift") : statusLabel(callout.status);
    const yours = visibleActivity.length + visibleCallouts.length;
    const existing = (
      <QuietPage className="q-shiftreq employee-shift-requests-view">
        <QuietNav back={{ href: "/app/requests/hub", label: "Requests" }} />
        <QuietHeader title="Shift requests" />
        <QuietSegments label="Shift request views" items={[
          { href: "/app/exchange?tab=available", label: claimable.length ? `Open shifts · ${claimable.length}` : "Open shifts", current: view === "available" },
          { href: "/app/exchange?tab=foryou", label: incoming.length ? `For you · ${incoming.length}` : "For you", current: view === "foryou" },
          { href: "/app/exchange?tab=requests", label: "Yours", current: view === "requests" },
        ]} />
        {params.error ? <p className="q-help q-help--alert" role="alert">{ERROR_MESSAGES[params.error] ?? schedulingIssueMessage(params.error) ?? "We couldn’t send that request. Try again."}</p> : null}
        {operation ? <p className="q-help" role="status">{shiftChangeFeedback(operation)}</p> : null}

        {view === "available" ? <>
          {claimable.length ? <ul className="q-list" style={{ marginTop: 16 }} aria-label="Open shifts you can claim">{claimable.map(exchange => (
            <SheetRow key={exchange.id} anchor={`request-${exchange.id}`} sheetTitle="Open shift" title={when(exchange.sourceShift)}
              detail={keepWhole(`${place(exchange.sourceShift)} · from ${marketplaceDisplayName(exchange.requestedByName)}`)}>
              <div className="q-hd employee-shift-entry"><h1>{keepWhole(marketplaceDate(exchange.sourceShift.date))}</h1><p>{keepWhole(`${formatTime(exchange.sourceShift.startTime)} – ${formatTime(exchange.sourceShift.endTime)}`)}</p></div>
              <ul className="q-list" style={{ marginTop: 16 }}>
                <QuietRow one title="Location" value={place(exchange.sourceShift)} tone="l" />
                <QuietRow one title="Offered by" value={`${marketplaceDisplayName(exchange.requestedByName)} · ${marketplaceRoleLabel(exchange.requestedByRole)}`} tone="l" />
                {exchange.targetShift ? <QuietRow title="In exchange for your shift" detail={when(exchange.targetShift)} /> : null}
              </ul>
              {!acceptViews.get(exchange.id)?.allowed ? <p className="q-help shift-change-unavailable">{acceptViews.get(exchange.id)?.notice}</p> : null}
              {acceptViews.get(exchange.id)?.allowed ? <div className="q-sheet-acts"><ShiftChangeForm fields={{ kind: "ACCEPT", ...requestFields(exchange.id, exchange.requestRevision)! }} className="shift-change-form q-scform"><button className="q-btn" type="submit">Claim<span className="nv-sr"> shift</span></button></ShiftChangeForm></div> : null}
              <p className="q-help">{acceptViews.get(exchange.id)?.outcome==='completed'?'Claiming assigns this shift to you immediately if it is still available and you still meet the rules.':'A pickup follows your company’s current approval rules. Check the confirmed result and your schedule after submitting.'}</p>
            </SheetRow>))}</ul>
            : <div className="q-emptyblock"><p className="q-emptyblock__title">{blocked.length ? "No open shifts fit your schedule" : "No open shifts right now"}</p><p className="q-help">{blocked.length ? "The shifts below can’t be picked up yet." : "When a teammate offers a shift you can work, it shows up here."}</p></div>}
          {blocked.length ? <section aria-labelledby="sr-blocked">
            <div className="q-grp"><h2 id="sr-blocked">Not open to you yet</h2></div>
            <ul className="q-list">{blocked.map(shift => <QuietRow key={shift.id} title={<><span className="nv-sr">{marketplaceDate(shift.date)}, </span>{keepWhole(`${marketplaceDate(shift.date)} · ${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`)}</>}
              detail={<span aria-label="Why you can’t pick this up">{(shift.reasons ?? []).join(" · ")}</span>} />)}</ul>
            {session.role === "EMPLOYEE" || session.role === "LEAD" ? <ul className="q-list" style={{ marginTop: 16 }}><QuietRow href="/app/availability" title="Want more shifts?" detail="Update when you can work" /></ul> : null}
          </section> : null}
        </> : view === "foryou" ? (incoming.length ? <ul className="q-list" style={{ marginTop: 16 }} aria-label="Swaps waiting for your answer">{incoming.map(exchange => (
          <SheetRow key={exchange.id} anchor={`request-${exchange.id}`} sheetTitle="Swap request" title={`${marketplaceDisplayName(exchange.requestedByName)} wants to swap`}
            detail={exchange.targetShift ? keepWhole(`Your ${marketplaceDate(exchange.targetShift.date)} for their ${marketplaceDate(exchange.sourceShift.date)}`) : when(exchange.sourceShift)}>
            <div className="q-hd employee-shift-entry"><h1>Swap with {marketplaceDisplayName(exchange.requestedByName).split(" ")[0]}</h1><p>{marketplaceRoleLabel(exchange.requestedByRole)}</p></div>
            <ul className="q-list" style={{ marginTop: 16 }}>
              {exchange.targetShift ? <QuietRow title="You give" detail={`${when(exchange.targetShift)} · ${place(exchange.targetShift)}`} /> : null}
              <QuietRow title={exchange.targetShift ? "You get" : "Their shift"} detail={`${when(exchange.sourceShift)} · ${place(exchange.sourceShift)}`} />
            </ul>
            {!requestFields(exchange.id, exchange.requestRevision) ? <p className="q-help shift-change-unavailable">This request changed. Reload to see the latest.</p> : !acceptViews.get(exchange.id)?.allowed ? <p className="q-help shift-change-unavailable">{acceptViews.get(exchange.id)?.notice}</p> : null}
            <div className="q-history"><ShiftChangeHistory events={histories.get(exchange.id) ?? null} /></div>
            {requestFields(exchange.id, exchange.requestRevision) ? <div className="q-sheet-acts"><ShiftChangeForm fields={requestFields(exchange.id, exchange.requestRevision)!} className="shift-change-form q-scform">
              {acceptViews.get(exchange.id)?.allowed ? <button className="q-btn" name="kind" value="ACCEPT" type="submit">Accept</button> : null}
              <button className="q-btn q-btn--sec" name="kind" value="DECLINE" type="submit">Decline</button>
            </ShiftChangeForm></div> : null}
            <p className="q-help">Accepting sends this swap for schedule checks. Review the result before changing your plans.</p>
          </SheetRow>))}</ul>
          : <div className="q-emptyblock"><p className="q-emptyblock__title">Nothing waiting for you</p><p className="q-help">When a teammate asks to swap with you, it shows up here.</p></div>)
        : <>
          {yours ? <ul className="q-list" style={{ marginTop: 16 }} aria-label="Your requests">
            {visibleActivity.map(exchange => (
              <SheetRow key={exchange.id} anchor={`request-${exchange.id}`} sheetTitle={exchange.kind === "COVERAGE" ? "Cover offer" : "Swap"}
                title={exchange.kind === "COVERAGE" ? `Cover · ${keepWhole(marketplaceDate(exchange.sourceShift.date))}` : otherName(exchange) ? `Swap · ${otherName(exchange)}` : "Swap"}
                detail={`${when(exchange.sourceShift)} · ${exchangeWord(exchange.status)}`}>
                <div className="q-hd employee-shift-entry"><h1>{exchange.kind === "COVERAGE" ? "Offered for cover" : otherName(exchange) ? `Swap with ${otherName(exchange).split(" ")[0]}` : "Swap"}</h1><p>{exchangeWord(exchange.status)}</p></div>
                <ul className="q-list" style={{ marginTop: 16 }}>
                  <QuietRow title="Your shift" detail={`${when(exchange.sourceShift)} · ${place(exchange.sourceShift)}`} />
                  {exchange.targetShift ? <QuietRow title="For" detail={`${when(exchange.targetShift)} · ${place(exchange.targetShift)}`} /> : null}
                </ul>
                {exchange.actionable === false && ["OPEN", "EMPLOYEE_PENDING", "MANAGER_PENDING"].includes(exchange.status) ? <p className="q-help shift-change-unavailable">This request changed or needs a manager’s review. Reload, or ask your manager.</p> : null}
                <div className="q-history"><ShiftChangeHistory events={histories.get(exchange.id) ?? null} /></div>
                <div className="q-sheet-acts employee-shift-entry-actions" data-status={exchange.status}>
                  {exchange.requestedByEmployeeId === session.id && requestFields(exchange.id, exchange.requestRevision) && ["OPEN", "EMPLOYEE_PENDING", "MANAGER_PENDING"].includes(exchange.status) ? <ShiftChangeForm fields={{ kind: "CANCEL", ...requestFields(exchange.id, exchange.requestRevision)! }} className="shift-change-form q-scform"><button className="q-btn q-btn--sec q-btn--danger" type="submit">Withdraw request</button></ShiftChangeForm> : null}
                  {exchange.status === "MANAGER_PENDING" && exchange.targetEmployeeId === session.id && requestFields(exchange.id, exchange.requestRevision) ? <ShiftChangeForm fields={{ kind: "WITHDRAW", ...requestFields(exchange.id, exchange.requestRevision)! }} className="shift-change-form q-scform"><button className="q-btn q-btn--sec q-btn--danger" type="submit">Withdraw response</button></ShiftChangeForm> : null}
                </div>
              </SheetRow>))}
            {visibleCallouts.map(callout => (
              <SheetRow key={callout.id} anchor={`request-${callout.id}`} sheetTitle="Can’t work" title={`Can’t work · ${keepWhole(marketplaceDate(callout.date))}`}
                detail={`${keepWhole(`${formatTime(callout.startTime)} – ${formatTime(callout.endTime)}`)} · ${calloutWord(callout)}`}>
                <div className="q-hd employee-shift-entry"><h1>{keepWhole(marketplaceDate(callout.date))}</h1><p>{calloutWord(callout)}</p></div>
                <ul className="q-list" style={{ marginTop: 16 }}>
                  <QuietRow one title="Shift" value={keepWhole(`${formatTime(callout.startTime)} – ${formatTime(callout.endTime)}`)} tone="l" />
                  <QuietRow one title="Location" value={callout.locationName} tone="l" />
                  <QuietRow one title="Reason" value={calloutReason(callout.reasonCode)} tone="l" />
                </ul>
                {callout.status === "APPROVED" && !callout.releaseApplies ? <p className="q-help shift-change-unavailable">This was approved earlier, but you’re still on this shift. Ask your manager.</p> : null}
                <div className="q-history"><ShiftChangeHistory events={histories.get(callout.id) ?? null} /></div>
                <div className="q-sheet-acts employee-shift-entry-actions" data-status={callout.status}>
                  {callout.status === "PENDING" && requestFields(callout.id, callout.requestRevision) ? <ShiftChangeForm fields={{ kind: "CANCEL_CALLOUT", ...requestFields(callout.id, callout.requestRevision)! }} className="shift-change-form q-scform"><button className="q-btn q-btn--sec q-btn--danger" type="submit">Withdraw request</button></ShiftChangeForm> : null}
                </div>
              </SheetRow>))}
          </ul> : <div className="q-emptyblock"><p className="q-emptyblock__title">No requests yet</p><p className="q-help">Your swap, cover and can’t-work requests show up here.</p></div>}
          {assignedShifts.length ? <section aria-labelledby="sr-shifts">
            <div className="q-grp"><h2 id="sr-shifts">Your shifts</h2></div>
            <ul className="q-list">{assignedShifts.map(shift => <QuietRow key={shift.id} href={`/app/schedule?week=${encodeURIComponent(shift.weekStart)}&day=${encodeURIComponent(shift.date)}&shift=${encodeURIComponent(shift.id)}`}
              title={when(shift)} detail={place(shift)} label={`Shift options, ${when(shift)}`} />)}</ul>
            <p className="q-help">Open a shift to swap it, offer it for cover, or say you can’t work it.</p>
          </section> : null}
          {(selectedHistory === null || selectedHistory.length > 0) && !visibleActivity.some(e => e.id === params.requestId) && !visibleCallouts.some(e => e.id === params.requestId) ? <section aria-labelledby="sr-history"><div className="q-grp"><h2 id="sr-history">Original request history</h2></div><div className="q-history"><ShiftChangeHistory events={selectedHistory} /></div></section> : null}
        </>}
      </QuietPage>
    );
    return view==='available'?<ResponsiveEmployeeRequests mode="open" selected={params.requestId} authority={employeeViewAuthority(proof!,'requests')}>{existing}</ResponsiveEmployeeRequests>:<ResponsiveEmployeeExchange mode={view==='foryou'?'incoming':'mine'} selection={params.requestId??null} authority={employeeViewAuthority(proof!,'exchange')}>{existing}</ResponsiveEmployeeExchange>;
  }

  return null;
}
