import {randomUUID} from 'node:crypto';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {readShiftChangeAvailability} from '@/lib/data/shift-changes';
import {ShiftChangeForm} from './shift-change-form';
import {ShiftChangeHistory} from './shift-change-history';
import {readShiftChangeHistoryView} from '@/lib/data/shift-change-views';
import { businessDate } from "@/lib/business-time";
import { ArrowsDownUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowsDownUp";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listManagerPendingExchanges, listManagementCoverage, listTeamExchangeActivity, type ExchangeRecord } from "@/lib/data/exchanges";
import { listPendingCallouts, listTeamCalloutHistory, type CalloutRecord } from "@/lib/data/callouts";
import { Card, FilterPills, PageBand, Status } from "./kit/kit";
import { Fact, Facts, Notice } from "./wave-a/parts";
import { PendingButton } from "./wave-a/pending-button";
import { ShiftBlock } from "./wave-a/shift-block";
import {ManagerIssueFocus} from './manager-issue-focus';

const tabs = [{ id: "pending", label: "Pending" }, { id: "coverage", label: "Open coverage" }, { id: "activity", label: "Team activity" }] as const;
const reasons: Record<string, string> = { ILLNESS: "Illness", FAMILY_EMERGENCY: "Family emergency", TRANSPORTATION: "Transportation", SCHOOL: "School", PERSONAL_EMERGENCY: "Personal emergency", OTHER: "Other" };
const errors: Record<string, string> = {
  EXCHANGE_CHANGED: "The schedule changed before you decided. Check the request again.",
  SHIFT_OVERLAP: "It would give someone two shifts at the same time.",
  APPROVED_TIME_OFF: "It runs into approved time off.",
  OUTSIDE_AVAILABILITY: "It’s outside the person’s availability.",
  LOCATION_NOT_ELIGIBLE: "The person can’t work at that location.",
  EMPLOYEE_INACTIVE: "Someone on this request is inactive.",
  CALLOUT_EXISTS: "This shift already has an “Unable to work” report.",
};
function statusWord(status: string) {
  if (status === "DENIED") return "Declined";
  if (status === "APPROVED") return "Approved";
  if (status === "CANCELLED") return "Withdrawn";
  return status.toLowerCase().replaceAll("_", " ").replace(/^./, first => first.toUpperCase());
}
const possessive = (name: string) => `${name}’${name.endsWith("s") ? "" : "s"}`;

/** The shifts on a swap or coverage request; a swap shows both, with the trade between them. */
function ExchangeShifts({ exchange }: { exchange: ExchangeRecord }) {
  const historical = ["APPROVED", "DENIED", "CANCELLED", "EXPIRED"].includes(exchange.status);
  const label = (name: string) => `${possessive(name)} ${historical ? "shift then" : "shift"}`;
  return <div className="wa-shifts">
    <ShiftBlock shift={exchange.sourceShift} label={label(exchange.sourceShift.employeeName)} />
    {exchange.kind === "SWAP" && exchange.targetShift ? <>
      <span className="wa-shifts__trade" aria-hidden="true"><ArrowsDownUpIcon size={18} weight="bold" /></span>
      <ShiftBlock shift={exchange.targetShift} label={label(exchange.targetShift.employeeName)} />
    </> : null}
  </div>;
}

function exchangeLead(exchange: ExchangeRecord) {
  if (exchange.kind === "SWAP") return exchange.targetEmployeeName ? `Swap with ${exchange.targetEmployeeName}` : "Swap";
  return exchange.targetEmployeeName ? `${exchange.targetEmployeeName} picked up this shift` : "Offered for someone to pick up";
}

function CalloutFacts({ callout }: { callout: CalloutRecord }) {
  return <>
    <div className="wa-shifts"><ShiftBlock shift={callout} label={`${possessive(callout.employeeName)} shift`} /></div>
    <Facts label="Reason">
      <Fact label="Reason">{reasons[callout.reasonCode] ?? callout.reasonCode}</Fact>
      {callout.reasonNote ? <Fact label="Note">{callout.reasonNote}</Fact> : null}
    </Facts>
  </>;
}

/** Phase 3.5 Wave A: Shift requests for Owners and Managers on the kit. One card per request that needs a decision,
 * with its shifts, what approving does and the decision; open coverage and recent outcomes in their own views. */
export async function ManagerShiftRequests({ tab, error, requestId, timeZone }: {
  timeZone: string; tab?: string; error?: string; approved?: string; reviewed?: string; calloutApproved?: string; calloutDenied?: string; requestId?: string;
}) {
  await requireRoles(MANAGER_ROLES);
  const proof=await requireSessionMutationProof();
  const selected = tabs.find(item => item.id === tab) ?? tabs[0];
  const [pending, callouts, coverage, exchanges, history] = await Promise.all([
    selected.id === "pending" ? listManagerPendingExchanges() : Promise.resolve([]),
    selected.id === "pending" ? listPendingCallouts() : Promise.resolve([]),
    selected.id === "coverage" ? listManagementCoverage(businessDate(new Date(), timeZone)) : Promise.resolve([]),
    selected.id === "activity" ? listTeamExchangeActivity(true) : Promise.resolve([]),
    selected.id === "activity" ? listTeamCalloutHistory() : Promise.resolve([]),
  ]);
  const livePending=pending.filter(e=>e.status==='MANAGER_PENDING');
  const liveCoverage=coverage.filter(e=>e.status==='OPEN');
  const approvals=new Map(await Promise.all([...livePending.map(e=>({id:e.id,revision:e.requestRevision,kind:'MANAGER_APPROVE' as const})),...callouts.map(e=>({id:e.id,revision:e.requestRevision,kind:'APPROVE_CALLOUT' as const}))].map(async e=>[e.id,e.revision?await readShiftChangeAvailability(proof,{kind:e.kind,requestId:e.id,expectedRevision:e.revision,operationId:randomUUID()}).catch(()=>({allowed:false,notice:'We couldn’t check this right now. Reload to try again.'})):{allowed:false,notice:'This request changed. Reload to see the latest.'}] as const)));
  const historyViews=new Map(await Promise.all([...exchanges,...history].map(async e=>[e.id,await readShiftChangeHistoryView(proof,e.id).catch(()=>null)] as const)));
  const activity = [
    ...exchanges.map(exchange => ({ id: exchange.id, createdAt: exchange.createdAt, status: exchange.status, title: `${exchange.kind === "SWAP" ? "Swap" : "Coverage"} · ${exchange.requestedByName}`, lead: exchangeLead(exchange), body: <ExchangeShifts exchange={exchange} /> })),
    ...history.map(callout => ({ id: callout.id, createdAt: callout.createdAt, status: callout.status, title: `Unable to work · ${callout.employeeName}`, lead: null, body: <>
      <CalloutFacts callout={callout} />
      {callout.status === "APPROVED" && !callout.releaseApplies ? <p className="wa-card-note">This approval was for an earlier version of the shift. Check who is assigned now.</p> : null}
    </> })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);
  const count = selected.id === "pending" ? livePending.length + callouts.length : selected.id === "coverage" ? liveCoverage.length : activity.length;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  const decisionNotice = (id: string) => approvals.get(id)?.notice
    ? <div className="wa-card-body wa-card-body--tight"><Notice tone="review" quiet>{approvals.get(id)?.notice}</Notice></div> : null;

  return <div className="nv-page wa-page wa-shiftreq" data-nv-page="">
    <PageBand title="Shift requests" overlap={false}
      summary={selected.id === "pending" ? (count ? `${plural(count, "request needs", "requests need")} your decision.` : "Nothing needs your decision.")
        : selected.id === "coverage" ? (count ? `${plural(count, "shift", "shifts")} nobody has picked up yet.` : "Every offered shift has been picked up.")
        : "Recent outcomes, newest first."}
      extra={<FilterPills label="Shift request sections" items={tabs.map(item => ({ href: `/app/exchange?tab=${item.id}`, label: item.label, current: selected.id === item.id }))} />} />
    <div className="nv-content">
      <ManagerIssueFocus prefix="request-" />
      {error ? <Notice tone="urgent" title="That decision wasn’t saved">{errors[error] ?? "The request may have changed. Check it and decide again."}</Notice> : null}

      {livePending.length || callouts.length || liveCoverage.length ? <div className="wa-grid">
      {livePending.map(exchange => <div className="wa-target" id={`request-${exchange.id}`} tabIndex={-1} key={exchange.id} data-selected={requestId === exchange.id ? "true" : undefined}>
        <Card title={`${exchange.kind === "SWAP" ? "Swap" : "Coverage"} · ${exchange.requestedByName}`} meta={<Status tone="review">Needs review</Status>}>
          <p className="wa-card-lead">{exchangeLead(exchange)}</p>
          <ExchangeShifts exchange={exchange} />
          {decisionNotice(exchange.id)}
          <p className="wa-card-note">{exchange.kind === "SWAP" ? "Approving trades the two shifts above." : "Approving gives this shift to the person who picked it up."}</p>
          <div className="wa-card-body">
            {exchange.requestRevision?<ShiftChangeForm fields={{requestId:exchange.id,expectedRevision:exchange.requestRevision}} className="wa-form shift-change-form">
              <div className="wa-decision">
                <PendingButton kind="secondary" name="kind" value="MANAGER_DECLINE" pending="Declining…" label={`Decline ${exchange.kind === "SWAP" ? "swap" : "coverage"} request from ${exchange.requestedByName}`}>Decline</PendingButton>
                {approvals.get(exchange.id)?.allowed?<PendingButton name="kind" value="MANAGER_APPROVE" pending="Approving…" label={`Approve ${exchange.kind === "SWAP" ? "swap" : "coverage"} request from ${exchange.requestedByName}`}>Approve</PendingButton>:null}
              </div>
            </ShiftChangeForm>:<Notice tone="review" quiet>This request changed. Reload to see the latest.</Notice>}
          </div>
        </Card>
      </div>)}

      {callouts.map(callout => <div className="wa-target" id={`request-${callout.id}`} tabIndex={-1} key={callout.id} data-selected={requestId === callout.id ? "true" : undefined}>
        <Card title={`Unable to work · ${callout.employeeName}`} meta={<Status tone="review">Needs review</Status>}>
          <p className="wa-card-lead">Can’t work this shift</p>
          <CalloutFacts callout={callout} />
          {callout.status === "APPROVED" && !callout.releaseApplies ? <p className="wa-card-note">This approval was for an earlier version of the shift. Check who is assigned now.</p> : null}
          {decisionNotice(callout.id)}
          <p className="wa-card-note">Approving takes the shift off their schedule. It will still need someone to cover it.</p>
          <div className="wa-card-body">
            {callout.requestRevision?<ShiftChangeForm fields={{requestId:callout.id,expectedRevision:callout.requestRevision}} className="wa-form shift-change-form">
              <div className="wa-decision">
                <PendingButton kind="secondary" name="kind" value="DECLINE_CALLOUT" pending="Declining…" label={`Decline the report from ${callout.employeeName}`}>Decline</PendingButton>
                {approvals.get(callout.id)?.allowed?<PendingButton name="kind" value="APPROVE_CALLOUT" pending="Approving…" label={`Approve the report from ${callout.employeeName}`}>Approve</PendingButton>:null}
              </div>
            </ShiftChangeForm>:<Notice tone="review" quiet>This request changed. Reload to see the latest.</Notice>}
          </div>
        </Card>
      </div>)}

      {liveCoverage.map(exchange => <Card key={exchange.id} title={`Coverage · ${exchange.requestedByName}`} meta={<Status tone="neutral">Not picked up</Status>}>
        <p className="wa-card-lead">{exchangeLead(exchange)}</p>
        <ExchangeShifts exchange={exchange} />
        <p className="wa-card-note">Closing stops anyone else from picking it up. The shift stays with {exchange.requestedByName}.</p>
        {exchange.requestRevision?<div className="wa-card-body"><ShiftChangeForm fields={{kind:"MANAGER_CLOSE",requestId:exchange.id,expectedRevision:exchange.requestRevision}} className="wa-form shift-change-form">
          <PendingButton kind="secondary" pending="Closing…" block label={`Close the coverage request from ${exchange.requestedByName}`}>Close request</PendingButton>
        </ShiftChangeForm></div>:null}
      </Card>)}
      </div> : null}

      {selected.id === "activity" && activity.length ? <Card title="Recent outcomes" meta={plural(activity.length, "request", "requests")}>
        <ol className="wa-entries">
          {activity.map(item => <li className="wa-entry" key={item.id}>
            <div className="wa-entry__head"><span className="nv-row__title">{item.title}</span><Status tone={item.status === "APPROVED" ? "done" : "neutral"}>{statusWord(item.status)}</Status></div>
            {item.lead ? <p className="wa-entry__lead">{item.lead}</p> : null}
            {item.body}
            <div className="wa-history"><ShiftChangeHistory events={historyViews.get(item.id)??null}/></div>
          </li>)}
        </ol>
      </Card> : null}

      {!count ? <Card title={selected.id === "pending" ? "You’re all caught up" : selected.id === "coverage" ? "No open coverage" : "No recent outcomes"}>
        <div className="wa-card-body"><p className="wa-text wa-muted">{selected.id === "pending" ? "Swaps, pick-ups and “Unable to work” reports that need you show up here and in your Inbox." : selected.id === "coverage" ? "Shifts people offer up show here until someone picks them up." : "Approved, declined and withdrawn requests show up here."}</p></div>
      </Card> : null}
    </div>
  </div>;
}
