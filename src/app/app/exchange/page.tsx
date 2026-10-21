import { keepWhole } from "@/lib/keep-whole";
import {randomUUID} from 'node:crypto';
import { moduleGate } from "@/lib/workspace-presentation/current.server";
import {ShiftChangeForm} from '@/components/shift-change-form';
import {ShiftChangeHistory} from '@/components/shift-change-history';
import {readShiftChangeHistoryView} from '@/lib/data/shift-change-views';
import {readShiftChangeTerms} from '@/lib/data/shift-change-snapshot';
import {readShiftChangeAvailability,type ShiftChangeAvailability} from '@/lib/data/shift-changes';
import {refusalLines} from '@/lib/shift-changes/eligibility-reasons';
import {shiftChangeFeedback} from '@/components/shift-change-form-state';
import type {ShiftChangeCommand} from '@/lib/shift-changes/types';
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate, shiftBoundaryInstants } from "@/lib/business-time";
import { schedulingIssueMessage } from "@/lib/scheduling/validate-shift";
import Link from "next/link";
import { ManagerShiftRequests } from "@/components/manager-shift-requests";
import { SigBand, SigDay, SigHead, SigPage } from "@/components/signature/signature";
import { ShiftCopy, ShiftDay, ShiftTicket, shiftPlace } from "@/components/shift-requests-signature";
import sr from "@/components/shift-requests-signature.module.css";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { HandPalmIcon } from "@phosphor-icons/react/dist/ssr/HandPalm";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr/LockSimple";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";import { StatusPill } from "@/components/status-pill";
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
import { getCallout, listEmployeeCallouts } from "@/lib/data/callouts";
import {
  getExchange,
  listEmployeeExchangeActivity,
  listEmployeePublishedShifts,
  listIncomingSwaps,
  listOpenCoverage,
} from "@/lib/data/exchanges";
import {readShiftChangeOperationView} from '@/lib/data/shift-change-views';
import {matchesDisplayedShift} from '../../../lib/shift-changes/displayed-terms';

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
  CALLOUT_EXISTS: "This shift already has an Unable to work request.",
};

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function statusTone(status: string) {
  if (status === "APPROVED") return "success" as const;
  return "neutral" as const;
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

/** "JL" from "Jordan Lee"; one letter for one word. */
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]!.toUpperCase()).join("") || "?";
}

function marketplaceDate(date: string) {
  const label = formatDayLabel(date);
  return `${label.weekday}, ${label.day}`;
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

  const [
    myShifts,
    openCoverage,
    incomingSwaps,
    activity,
    myCallouts,
    assigned,
  ] = await Promise.all([
    listEmployeePublishedShifts(session.id, today),
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
      const selectedCallout = myCallouts.find(row => row.id === params.requestId) ?? await getCallout(params.requestId).catch(() => null);
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
  const offerViews=new Map(await Promise.all(myShifts.map(async shift=>{const reviewed=await readShiftChangeTerms(proof!,shift.id).catch(()=>null);const displayed=assigned.find(row=>row.id===shift.id);const fields=reviewed&&displayed&&matchesDisplayedShift(displayed,reviewed.source)&&matchesDisplayedShift(shift,reviewed.source)?{sourceShiftId:reviewed.source.shiftId,sourceEpisodeId:reviewed.source.assignmentEpisodeId,sourceTermsFingerprint:reviewed.sourceTermsFingerprint}:null;const allowed=fields?await readShiftChangeAvailability(proof!,{kind:'OFFER_COVERAGE',operationId:randomUUID(),...fields}).catch(()=>({allowed:false,notice:'Current policy is unavailable.'})):{allowed:false,notice:'Stale assignment. Reload before offering.'};return [shift.id,{fields,...allowed}] as const;})));
  const assignedShifts=assigned.filter(s=>{try{return Date.parse(shiftBoundaryInstants(s,workspace.timeZone).endAt)>new Date().getTime();}catch{return true;}});
  const selectedHistory=params.requestId?await readShiftChangeHistoryView(proof!,params.requestId).catch(()=>null):[];
  const histories=new Map(await Promise.all([...visibleActivity,...incoming,...visibleCallouts].map(async row=>[row.id,await readShiftChangeHistoryView(proof!,row.id).catch(()=>null)] as const)));
  const hasTradeRequests =
    assignedShifts.length > 0 ||
    incomingSwaps.length > 0 ||
    visibleActivity.length > 0 ||
    visibleCallouts.length > 0 || (selectedHistory===null||selectedHistory.length>0);

  if (!manager) {
    // Phase 3 (Signature, approved Oct 20, 2026; target docs/product/specs/employee-style/signature/phase-3/p3c-board-b.png).
    // Same reads, forms and authority as before; the band says what needs you and its pill switches the two views.
    const zone = workspace.timeZone;
    const n = (count: number) => ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"][count] ?? String(count);
    const inProgress = visibleActivity.filter(row => ["OPEN", "EMPLOYEE_PENDING", "MANAGER_PENDING"].includes(row.status)).length + visibleCallouts.filter(row => row.status === "PENDING").length;
    const otherName = (row: (typeof visibleActivity)[number]) => marketplaceDisplayName(row.requestedByEmployeeId === session.id ? (row.targetEmployeeName ?? row.targetShift?.employeeName ?? "") : row.requestedByName);
    const band = activeView === "available"
      ? <SigBand eyebrow="Shift requests"><h1 className="nv-sr">Shift requests</h1>
        <p className="sg-head2">{claimable.length ? <><em>{n(claimable.length)}</em> open {claimable.length === 1 ? "shift" : "shifts"}<br />you can pick up</> : <>No open shifts<br />right now</>}</p>
        <p className="sg-sub"><span>{blocked.length ? `${blocked.length} more you can’t pick up yet` : claimable.length ? "Claim one and it’s yours once it’s confirmed." : "Check back later for open shifts."}</span></p>
        <Link className="sg-band-link" href="/app/exchange?tab=requests">Your requests<CaretRightIcon size={14} aria-hidden="true" /></Link></SigBand>
      : <SigBand eyebrow="Shift requests"><h1 className="nv-sr">Shift requests</h1>
        <p className="sg-head2">{incoming.length ? <><em>{n(incoming.length)}</em> {incoming.length === 1 ? "swap" : "swaps"}<br />{incoming.length === 1 ? "needs" : "need"} your answer</> : inProgress ? <><em>{n(inProgress)}</em> {inProgress === 1 ? "request" : "requests"}<br />in progress</> : <>Your shifts<br />and requests</>}</p>
        <p className="sg-sub"><span>{assignedShifts.length ? `${assignedShifts.length} ${assignedShifts.length === 1 ? "shift" : "shifts"} coming up` : "Pick up a shift, review a swap, or manage your requests."}</span></p>
        <Link className="sg-band-link" href="/app/exchange?tab=available">Open shifts{claimable.length ? <em>{claimable.length}</em> : null}<CaretRightIcon size={14} aria-hidden="true" /></Link></SigBand>;
    return (
      <SigPage className={`employee-shift-requests-view ${sr.srRoot}`} band={band}>
        {params.error ? <p className="sg-alert" data-tone="error" role="alert">{ERROR_MESSAGES[params.error] ?? schedulingIssueMessage(params.error) ?? "We couldn’t send that request. Try again."}</p> : null}
        {operation ? <p className="sg-alert" role="status">{shiftChangeFeedback(operation)}</p> : null}
        {activeView === "available" ? (claimable.length || blocked.length ? <>
          {claimable.length ? <><SigHead id="sr-open" title="Open shifts" count={claimable.length} />
            <ul className="sg-card" aria-labelledby="sr-open">{claimable.map(exchange => (
              <li className="sg-r employee-shift-entry" id={`request-${exchange.id}`} tabIndex={-1} key={exchange.id}>
                <ShiftDay shift={exchange.sourceShift} />
                <ShiftCopy shift={exchange.sourceShift} zone={zone} label="Offered shift">
                  <span>{exchange.targetShift ? "Swap · " : ""}{keepWhole(`From ${marketplaceDisplayName(exchange.requestedByName)}`)} · {marketplaceRoleLabel(exchange.requestedByRole)}</span>
                  {exchange.targetShift ? <span>For your {keepWhole(`${marketplaceDate(exchange.targetShift.date)} · ${formatTime(exchange.targetShift.startTime)} – ${formatTime(exchange.targetShift.endTime)}`)}</span> : null}
                  {!acceptViews.get(exchange.id)?.allowed ? <span className="shift-change-unavailable">{acceptViews.get(exchange.id)?.notice}</span> : null}
                </ShiftCopy>
                <div className="employee-shift-entry-actions">{acceptViews.get(exchange.id)?.allowed ? <ShiftChangeForm fields={{ kind: "ACCEPT", ...requestFields(exchange.id, exchange.requestRevision)! }}><button className="employee-action primary" type="submit"><span>Claim</span><span className="nv-sr"> shift</span></button></ShiftChangeForm> : null}</div>
              </li>))}</ul></> : <div className="sg-card"><div className={sr.srEmpty}><span className="sg-tile" aria-hidden="true"><CalendarBlankIcon size={22} /></span><strong>No open shifts fit your schedule</strong><span>The shifts below can’t be picked up yet.</span></div></div>}
          {blocked.length ? <><SigHead id="sr-blocked" title="Not open to you yet" count={blocked.length} />
            <ul className="sg-card" aria-labelledby="sr-blocked">{blocked.map(shift => (
              <li className={sr.srBlocked} key={shift.id}>
                <div className="sg-r"><SigDay top={formatDayLabel(shift.date).weekday} day={Number(shift.date.slice(8))} />
                  <span className="sg-copy"><span className="sg-time"><span className="nv-sr">{marketplaceDate(shift.date)}, </span>{keepWhole(`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`)}</span><span>{shift.position ? `${shift.position} · ` : ""}{shift.location}</span></span></div>
                <ul className="sg-card-foot" data-tone="amber" aria-label="Why you can’t pick this up"><LockSimpleIcon size={18} aria-hidden="true" />{(shift.reasons ?? []).map(reason => <li key={reason}>{reason}</li>)}</ul>
              </li>))}</ul>
            {session.role === "EMPLOYEE" || session.role === "LEAD" ? <div className="sg-card" data-tone="tint"><Link className={sr.srNext} href="/app/availability">
              <span className="sg-tile" data-tone="white" aria-hidden="true"><CalendarBlankIcon size={22} /></span>
              <span><b>Want more shifts?</b><small>Update when you can work.</small></span><i aria-hidden="true"><ArrowRightIcon size={18} /></i></Link></div> : null}</> : null}
        </> : <div className="sg-card"><div className={sr.srEmpty}><span className="sg-tile" aria-hidden="true"><CalendarBlankIcon size={22} /></span><strong>The shift board is clear</strong><span>Check back later for available open shifts.</span></div></div>)
        : hasTradeRequests ? <>
          {incoming.length ? <><SigHead id="sr-incoming" title="Waiting for you" count={incoming.length} />
            <ul className={sr.srStack} aria-labelledby="sr-incoming">{incoming.map(exchange => (
              <li className="sg-card employee-shift-entry" id={`request-${exchange.id}`} tabIndex={-1} key={exchange.id}>
                <div className="sg-card-head"><span className={sr.srAvatar} aria-hidden="true">{initials(marketplaceDisplayName(exchange.requestedByName))}</span>
                  <span className={sr.srHeadCopy}><b>{marketplaceDisplayName(exchange.requestedByName)} wants to swap</b><small>{marketplaceRoleLabel(exchange.requestedByRole)}</small></span></div>
                {exchange.targetShift ? <ShiftTicket give={exchange.targetShift} get={exchange.sourceShift} giveLabel="You give" getLabel="You get" zone={zone} />
                  : <div className="sg-r"><ShiftDay shift={exchange.sourceShift} /><ShiftCopy shift={exchange.sourceShift} zone={zone} label="Their shift" /></div>}
                <div className="sg-card-body">
                  {!requestFields(exchange.id, exchange.requestRevision) ? <span className="shift-change-unavailable">This request changed. Reload to see the latest.</span> : !acceptViews.get(exchange.id)?.allowed ? <span className="shift-change-unavailable">{acceptViews.get(exchange.id)?.notice}</span> : null}
                  <ShiftChangeHistory events={histories.get(exchange.id) ?? null} />
                  <p className={sr.srMuted}>Accepting sends this swap for schedule checks. Review the result before changing your plans.</p>
                  <div className="employee-shift-entry-actions">{requestFields(exchange.id, exchange.requestRevision) ? <ShiftChangeForm fields={requestFields(exchange.id, exchange.requestRevision)!}><button className="employee-action" name="kind" value="DECLINE" type="submit">Decline</button>{acceptViews.get(exchange.id)?.allowed ? <button className="employee-action primary" name="kind" value="ACCEPT" type="submit">Accept</button> : null}</ShiftChangeForm> : null}</div>
                </div>
              </li>))}</ul></> : null}

          {visibleActivity.length ? <><SigHead id="sr-activity" title="Your requests" count={visibleActivity.length} />
            <ul className="sg-card" aria-labelledby="sr-activity">{visibleActivity.map(exchange => (
              <li className={`sg-r employee-shift-entry ${sr.srStacked}`} id={`request-${exchange.id}`} tabIndex={-1} key={exchange.id}>
                <span className="sg-tile" aria-hidden="true">{exchange.kind === "COVERAGE" ? <HandPalmIcon size={22} /> : <ArrowsLeftRightIcon size={22} />}</span>
                <span className="sg-copy">
                  <span className="sg-t1"><b>{exchange.kind === "COVERAGE" ? "Coverage" : otherName(exchange) ? `Swap · ${otherName(exchange)}` : "Swap"}</b><StatusPill tone={statusTone(exchange.status)}>{exchange.status === "OPEN" ? "Offered" : exchange.status === "EMPLOYEE_PENDING" ? "Awaiting employee" : exchange.status === "MANAGER_PENDING" ? "Manual review" : exchange.status === "APPROVED" ? "Completed" : statusLabel(exchange.status)}</StatusPill></span>
                  <span>{keepWhole(`${marketplaceDate(exchange.sourceShift.date)} · ${formatTime(exchange.sourceShift.startTime)} – ${formatTime(exchange.sourceShift.endTime)}`)}</span>
                  <span>{shiftPlace(exchange.sourceShift, zone)}</span>
                  {exchange.targetShift ? <span>For {keepWhole(`${marketplaceDate(exchange.targetShift.date)} · ${formatTime(exchange.targetShift.startTime)} – ${formatTime(exchange.targetShift.endTime)}`)} · {shiftPlace(exchange.targetShift, zone)}</span> : null}
                  {exchange.actionable === false && ["OPEN", "EMPLOYEE_PENDING", "MANAGER_PENDING"].includes(exchange.status) ? <span className="shift-change-unavailable">This request changed or needs a manager’s review. Reload, or ask your manager.</span> : null}
                  <ShiftChangeHistory events={histories.get(exchange.id) ?? null} />
                  <div className="employee-shift-entry-actions" data-status={exchange.status}>
                    {exchange.requestedByEmployeeId === session.id && requestFields(exchange.id, exchange.requestRevision) && ["OPEN", "EMPLOYEE_PENDING", "MANAGER_PENDING"].includes(exchange.status) ? <ShiftChangeForm fields={{ kind: "CANCEL", ...requestFields(exchange.id, exchange.requestRevision)! }}><button className="employee-action danger" type="submit"><span>Cancel</span></button></ShiftChangeForm> : null}
                    {exchange.status === "MANAGER_PENDING" && exchange.targetEmployeeId === session.id && requestFields(exchange.id, exchange.requestRevision) ? <ShiftChangeForm fields={{ kind: "WITHDRAW", ...requestFields(exchange.id, exchange.requestRevision)! }}><button className="employee-action danger" type="submit">Withdraw</button></ShiftChangeForm> : null}
                  </div>
                </span>
              </li>))}</ul></> : null}

          {visibleCallouts.length ? <><SigHead id="sr-callouts" title="Unable to work" count={visibleCallouts.length} />
            <ul className="sg-card" aria-labelledby="sr-callouts">{visibleCallouts.map(callout => (
              <li className={`sg-r employee-shift-entry ${sr.srStacked}`} id={`request-${callout.id}`} tabIndex={-1} key={callout.id}>
                <span className="sg-tile" data-tone="amber" aria-hidden="true"><WarningIcon size={22} /></span>
                <span className="sg-copy">
                  <span className="sg-t1"><b>{keepWhole(marketplaceDate(callout.date))}</b>{callout.status !== "APPROVED" || callout.releaseApplies ? <StatusPill tone={statusTone(callout.status)}>{callout.status === "PENDING" ? "Reported" : callout.status === "APPROVED" ? "Released — check coverage" : statusLabel(callout.status)}</StatusPill> : <StatusPill tone="neutral">Previously approved — review current assignment</StatusPill>}</span>
                  <span>{keepWhole(`${formatTime(callout.startTime)} – ${formatTime(callout.endTime)}`)} · {callout.locationName}</span>
                  <span>{calloutReason(callout.reasonCode)}</span>
                  {callout.status === "APPROVED" && !callout.releaseApplies ? <span className="shift-change-unavailable">Historical approval does not release the current assignment. Ask management to review.</span> : null}
                  <ShiftChangeHistory events={histories.get(callout.id) ?? null} />
                  <div className="employee-shift-entry-actions" data-status={callout.status}>
                    {callout.status === "PENDING" && requestFields(callout.id, callout.requestRevision) ? <ShiftChangeForm fields={{ kind: "CANCEL_CALLOUT", ...requestFields(callout.id, callout.requestRevision)! }}><button className="employee-action danger" type="submit"><span>Cancel</span></button></ShiftChangeForm> : null}
                  </div>
                </span>
              </li>))}</ul></> : null}

          {assignedShifts.length ? <><SigHead id="sr-shifts" title="Your shifts" count={assignedShifts.length} />
            <ul className="sg-card" aria-labelledby="sr-shifts">{assignedShifts.map(shift => (
              <li className={`employee-shift-entry ${sr.srShift}`} key={shift.id}>
                {/* Phase 3: the three shift actions sit behind one "Shift options" button, as on My schedule. */}
                <details className={sr.srOptions}>
                  <summary className="sg-r"><ShiftDay shift={shift} /><ShiftCopy shift={shift} zone={zone} />
                    <span className={sr.srMore}><DotsThreeIcon size={20} weight="bold" aria-hidden="true" /><span className="nv-sr">Shift options</span></span></summary>
                  {!offerViews.get(shift.id)?.allowed || !offerViews.get(shift.id)?.fields ? <span className={`shift-change-unavailable ${sr.srNotice}`}>{offerViews.get(shift.id)?.notice ?? "Swap unavailable. You can still report that you can’t work."}</span> : null}
                  <div className="employee-shift-entry-actions">
                    {offerViews.get(shift.id)?.fields ? <Link className="employee-action primary" href={`/app/exchange/swap?sourceShiftId=${encodeURIComponent(shift.id)}`}><ArrowsLeftRightIcon size={18} aria-hidden="true" /><span>Request a swap</span></Link> : null}
                    {offerViews.get(shift.id)?.allowed && offerViews.get(shift.id)?.fields ? <ShiftChangeForm fields={{ kind: "OFFER_COVERAGE", ...offerViews.get(shift.id)!.fields! }}><button className="employee-action" type="submit"><HandPalmIcon size={18} aria-hidden="true" /><span>Offer for coverage</span></button></ShiftChangeForm> : null}
                    <Link className="employee-action danger" href={`/app/exchange/callout?shiftId=${encodeURIComponent(shift.id)}`}><WarningIcon size={18} aria-hidden="true" /><span>Unable to work</span></Link>
                  </div>
                </details>
              </li>))}</ul></> : null}
          {(selectedHistory === null || selectedHistory.length > 0) && !visibleActivity.some(e => e.id === params.requestId) && !visibleCallouts.some(e => e.id === params.requestId) ? <><SigHead title="Original request history" /><div className="sg-card"><div className="sg-card-body">{/* keeps its own disclosure */}<ShiftChangeHistory events={selectedHistory} /></div></div></> : null}
        </> : <div className="sg-card"><div className={sr.srEmpty}><span className="sg-tile" aria-hidden="true"><ArrowsLeftRightIcon size={22} /></span><strong>No swap requests yet</strong><span>Your offers, swaps, and coverage requests will appear here.</span></div></div>}
      </SigPage>
    );
  }

  return null;
}
