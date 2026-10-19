import {randomUUID} from 'node:crypto';
import { FilterPills, PageBand } from "@/components/kit/kit";
import { moduleGate } from "@/lib/workspace-presentation/current.server";
import {ShiftChangeForm} from '@/components/shift-change-form';
import {ExchangeAssignment as ShiftSlot} from '@/components/exchange-assignment';
import {ExchangeReviewShell} from '@/components/exchange-review-shell';
import {ShiftChangeHistory} from '@/components/shift-change-history';
import {readShiftChangeHistoryView} from '@/lib/data/shift-change-views';
import {readShiftChangeTerms} from '@/lib/data/shift-change-snapshot';
import {readShiftChangeAvailability,type ShiftChangeAvailability} from '@/lib/data/shift-changes';
import {BlockedOpenShifts} from '@/components/blocked-open-shifts';
import {refusalLines} from '@/lib/shift-changes/eligibility-reasons';
import {shiftChangeFeedback} from '@/components/shift-change-form-state';
import type {ShiftChangeCommand} from '@/lib/shift-changes/types';
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate, shiftBoundaryInstants } from "@/lib/business-time";
import { schedulingIssueMessage } from "@/lib/scheduling/validate-shift";
import Link from "next/link";
import { ManagerShiftRequests } from "@/components/manager-shift-requests";
import { NavIcon } from "@/components/nav-icon";
import { StatusPill } from "@/components/status-pill";
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
  LOCATION_NOT_ELIGIBLE: "The employee is not eligible to work at that location.",
  SHIFT_OVERLAP: "The exchange would create an overlapping shift.",
  APPROVED_TIME_OFF: "The exchange conflicts with approved time off.",
  OUTSIDE_AVAILABILITY: "The exchange is outside the employee's submitted availability.",
  EMPLOYEE_INACTIVE: "An inactive employee cannot participate in the exchange.",
  INVALID_TIME_RANGE: "The shift time is invalid.",
  EXCHANGE_UNAVAILABLE: "That exchange is no longer available.",
  EXCHANGE_TAKEN: "Another employee already claimed that shift.",
  SAME_SHIFT: "Choose a different shift to swap.",
  NOT_SHIFT_OWNER: "You can only swap one of your own shifts.",
  SAME_EMPLOYEE: "A direct swap must be with another employee.",
  DIFFERENT_WEEK: "Direct swaps must stay within the same schedule week.",
  EMPLOYEE_NOT_FOUND: "An employee on this request could not be found.",
  INVALID_DECISION: "That response could not be processed.",
  NOT_TARGET_EMPLOYEE: "Only the employee receiving the swap request can accept it.",
  EXCHANGE_CHANGED: "The schedule changed before approval. Review the request again.",
  CALLOUT_EXISTS: "This shift already has an active call-out request.",
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
    return (
      <ExchangeReviewShell view={activeView} className="employee-view employee-shift-requests-view">
        {/* Phase 3: the kit band carries the title, one line, and the two views as pills. */}
        <div className="nv-page premium-employee-exchange" data-nv-page="">
        <PageBand eyebrow="Schedule flexibility" title="Shift requests" overlap={false}
          summary={activeView === "available" ? (claimable.length ? `${claimable.length}\u00a0open ${claimable.length === 1 ? "shift" : "shifts"} you can pick up.` : "Pick up a shift, review a swap, or manage your requests.") : "Pick up a shift, review a swap, or manage your requests."}
          extra={<FilterPills label="Shift marketplace views" items={[
            { href: "/app/exchange?tab=available", label: "Available shifts", current: activeView === "available" },
            { href: "/app/exchange?tab=requests", label: "Your requests", current: activeView === "requests" },
          ]} />} />
        <div className="premium-employee-content">
        {params.error ? <p className="employee-notice error" role="alert">{ERROR_MESSAGES[params.error] ?? schedulingIssueMessage(params.error) ?? "The exchange could not be processed."}</p> : null}
        {operation ? <p className="employee-notice" role="status">{shiftChangeFeedback(operation)}</p> : null}

        <div className="employee-view-surface employee-exchange-feed">
          {activeView === "available" ? (
            claimable.length || blocked.length ? <>{claimable.length ? claimable.map((exchange) => (
              <div className="employee-shift-entry" id={`request-${exchange.id}`} tabIndex={-1} key={exchange.id}>
                <div className="employee-shift-entry-copy">
                  <div className={`exchange-assignments${exchange.targetShift ? " paired" : ""}`}><ShiftSlot shift={exchange.sourceShift} label="Offered shift"/>{exchange.targetShift?<ShiftSlot shift={exchange.targetShift} label="Other assignment"/>:null}</div>
                  <small>{marketplaceDisplayName(exchange.requestedByName)} · {marketplaceRoleLabel(exchange.requestedByRole)}</small>
                  {!acceptViews.get(exchange.id)?.allowed?<span className="shift-change-unavailable">{acceptViews.get(exchange.id)?.notice}</span>:null}
                </div>
                <div className="employee-shift-entry-actions">{acceptViews.get(exchange.id)?.allowed?<ShiftChangeForm fields={{kind:'ACCEPT',...requestFields(exchange.id,exchange.requestRevision)!}}><button className="employee-action primary" type="submit"><span>Claim shift</span></button></ShiftChangeForm>:null}</div>
              </div>
            )) : <div className="employee-view-empty"><span className="employee-empty-icon"><NavIcon name="exchange" employee size={16} /></span><strong>No open shifts fit your schedule</strong><p>The shifts below can’t be picked up yet.</p></div>}
              <BlockedOpenShifts shifts={blocked} availabilityHref={session.role === 'EMPLOYEE' || session.role === 'LEAD' ? '/app/availability' : null} /></>
            : <div className="employee-view-empty"><span className="employee-empty-icon"><NavIcon name="exchange" employee size={16} /></span><strong>The shift board is clear</strong><p>Check back later for available open shifts.</p></div>
          ) : hasTradeRequests ? (
            <>
              {assignedShifts.length ? <section className="employee-exchange-section">
                <h2>Your assigned shifts</h2>
                {assignedShifts.map((shift) => (
                  <div className="employee-shift-entry" key={shift.id}>
                    <div className="employee-shift-entry-copy">
                      <ShiftSlot shift={shift}/>
                      {!offerViews.get(shift.id)?.allowed||!offerViews.get(shift.id)?.fields?<span className="shift-change-unavailable">{offerViews.get(shift.id)?.notice??'Swap unavailable. You can still report that you can’t work.'}</span>:null}
                    </div>
                    {/* Phase 3: the three shift actions sit behind one "Shift options" disclosure, as on My schedule. */}
                    <details className="premium-shift-options"><summary><span>Shift options</span><NavIcon name="chevronRight" size={16} /></summary>
                    <div className="employee-shift-entry-actions">
                      <Link className="employee-action danger" href={`/app/exchange/callout?shiftId=${encodeURIComponent(shift.id)}`}><span>Unable to Work</span></Link>
                      {offerViews.get(shift.id)?.allowed&&offerViews.get(shift.id)?.fields?<ShiftChangeForm fields={{kind:'OFFER_COVERAGE',...offerViews.get(shift.id)!.fields!}}><button className="employee-action" type="submit"><span>Offer for coverage</span></button></ShiftChangeForm>:null}
                      {offerViews.get(shift.id)?.fields?<Link className="employee-action primary" href={`/app/exchange/swap?sourceShiftId=${encodeURIComponent(shift.id)}`}><span>Swap shift</span></Link>:null}
                    </div>
                    </details>
                  </div>
                ))}
              </section> : null}

              {incoming.length ? <section className="employee-exchange-section">
                <h2>Waiting for You</h2>
                {incoming.map((exchange) => (
                  <div className="employee-shift-entry" id={`request-${exchange.id}`} tabIndex={-1} key={exchange.id}>
                    <div className="employee-shift-entry-copy">
                      <strong>{marketplaceDisplayName(exchange.requestedByName)} wants to swap</strong>
                      {!requestFields(exchange.id,exchange.requestRevision)?<span className="shift-change-unavailable">This request changed. Reload to see the latest.</span>:!acceptViews.get(exchange.id)?.allowed?<span className="shift-change-unavailable">{acceptViews.get(exchange.id)?.notice}</span>:null}
                      <div className={`exchange-assignments${exchange.targetShift ? " paired" : ""}`}><ShiftSlot shift={exchange.sourceShift} label="Their shift"/>{exchange.targetShift?<ShiftSlot shift={exchange.targetShift} label="Your shift"/>:null}</div><ShiftChangeHistory events={histories.get(exchange.id)??null}/>
                      <span>Accepting sends this swap for schedule checks. Review the result before changing your plans.</span>
                    </div>
                    <div className="employee-shift-entry-actions">{requestFields(exchange.id,exchange.requestRevision)?<ShiftChangeForm fields={requestFields(exchange.id,exchange.requestRevision)!}><button className="employee-action" name="kind" value="DECLINE" type="submit">Decline</button>{acceptViews.get(exchange.id)?.allowed?<button className="employee-action primary" name="kind" value="ACCEPT" type="submit">Accept</button>:null}</ShiftChangeForm>:null}</div>
                  </div>
                ))}
              </section> : null}

              {visibleActivity.length ? <section className="employee-exchange-section">
                <h2>Your requests</h2>
                {visibleActivity.map((exchange) => (
                  <div className="employee-shift-entry" id={`request-${exchange.id}`} tabIndex={-1} key={exchange.id}>
                    <div className="employee-shift-entry-copy">
                      <strong>{exchange.kind === "COVERAGE" ? "Coverage" : "Swap"}</strong>
                      <div className={`exchange-assignments${exchange.targetShift ? " paired" : ""}`}><ShiftSlot shift={exchange.sourceShift} label="Requested assignment"/>{exchange.targetShift?<ShiftSlot shift={exchange.targetShift} label="Other assignment"/>:null}</div><ShiftChangeHistory events={histories.get(exchange.id)??null}/>
                      {exchange.actionable===false&&['OPEN','EMPLOYEE_PENDING','MANAGER_PENDING'].includes(exchange.status)?<span className="shift-change-unavailable">This request changed or needs a manager’s review. Reload, or ask your manager.</span>:null}
                    </div>
                    <div className="employee-shift-entry-actions" data-status={exchange.status}>
                      <StatusPill tone={statusTone(exchange.status)}>{exchange.status==='OPEN'?'Offered':exchange.status==='EMPLOYEE_PENDING'?'Awaiting employee':exchange.status==='MANAGER_PENDING'?'Manual review':exchange.status==='APPROVED'?'Completed':statusLabel(exchange.status)}</StatusPill>
                      {exchange.requestedByEmployeeId === session.id && requestFields(exchange.id,exchange.requestRevision) && ["OPEN", "EMPLOYEE_PENDING", "MANAGER_PENDING"].includes(exchange.status) ? <ShiftChangeForm fields={{kind:"CANCEL",...requestFields(exchange.id,exchange.requestRevision)!}}><button className="employee-action danger" type="submit"><span>Cancel</span></button></ShiftChangeForm> : null}
                      {exchange.status==='MANAGER_PENDING'&&exchange.targetEmployeeId===session.id&&requestFields(exchange.id,exchange.requestRevision)?<ShiftChangeForm fields={{kind:"WITHDRAW",...requestFields(exchange.id,exchange.requestRevision)!}}><button className="employee-action danger" type="submit">Withdraw</button></ShiftChangeForm>:null}
                    </div>
                  </div>
                ))}
              </section> : null}

              {visibleCallouts.length ? <section className="employee-exchange-section">
                <h2>Unable-to-Work Requests</h2>
                {visibleCallouts.map((callout) => (
                  <div className="employee-shift-entry" id={`request-${callout.id}`} tabIndex={-1} key={callout.id}>
                    <div className="employee-shift-entry-copy">
                      <strong>{marketplaceDate(callout.date)} · {formatTime(callout.startTime)} – {formatTime(callout.endTime)}</strong>
                      <span>{calloutReason(callout.reasonCode)}</span><span>{callout.locationName}</span><ShiftChangeHistory events={histories.get(callout.id)??null}/>
                      {callout.status==='APPROVED'&&!callout.releaseApplies?<StatusPill tone="neutral">Previously approved — review current assignment</StatusPill>:null}
                      {callout.status==='APPROVED'&&!callout.releaseApplies?<span className="shift-change-unavailable">Historical approval does not release the current assignment. Ask management to review.</span>:null}
                    </div>
                    <div className="employee-shift-entry-actions" data-status={callout.status}>
                      {callout.status!=='APPROVED'||callout.releaseApplies?<StatusPill tone={statusTone(callout.status)}>{callout.status==='PENDING'?'Reported inability':callout.status==='APPROVED'?'Released — check coverage':statusLabel(callout.status)}</StatusPill>:null}
                      {callout.status === "PENDING" && requestFields(callout.id,callout.requestRevision) ? <ShiftChangeForm fields={{kind:"CANCEL_CALLOUT",...requestFields(callout.id,callout.requestRevision)!}}><button className="employee-action danger" type="submit"><span>Cancel</span></button></ShiftChangeForm> : null}
                    </div>
                  </div>
                ))}
              </section> : null}
              {(selectedHistory===null||selectedHistory.length>0)&&!visibleActivity.some(e=>e.id===params.requestId)&&!visibleCallouts.some(e=>e.id===params.requestId)?<section className="employee-exchange-section"><h2>Original request history</h2><ShiftChangeHistory events={selectedHistory}/></section>:null}
            </>
          ) : <div className="employee-view-empty"><span className="employee-empty-icon"><NavIcon name="exchange" employee size={16} /></span><strong>No swap requests yet</strong><p>Your offers, swaps, and coverage requests will appear here.</p></div>}
        </div>
        </div>
        </div>
      </ExchangeReviewShell>
    );
  }

  return null;
}
