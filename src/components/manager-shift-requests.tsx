import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {randomUUID} from 'node:crypto';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {readShiftChangeAvailability} from '@/lib/data/shift-changes';
import {ShiftChangeForm} from './shift-change-form';
import {ShiftChangeHistory} from './shift-change-history';
import {readShiftChangeHistoryView} from '@/lib/data/shift-change-views';
import { businessDate } from "@/lib/business-time";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listManagerPendingExchanges, listManagementCoverage, listTeamExchangeActivity, type ExchangeRecord } from "@/lib/data/exchanges";
import { listPendingCallouts, listTeamCalloutHistory, type CalloutRecord } from "@/lib/data/callouts";
import { PendingButton } from "./wave-a/pending-button";
import { agoLabel, initialsOf, QuietHeader, QuietNav, QuietPage, QuietRow, QuietSegments } from "./quiet/quiet";
import { formatTime } from "@/lib/date-utils";

const tabs = [{ id: "pending", label: "Waiting" }, { id: "coverage", label: "Open cover" }, { id: "activity", label: "Done" }] as const;
// TC-WA-13: the same words the employee chose from (reviewed-callout-form.tsx).
const reasons: Record<string, string> = { ILLNESS: "Illness / sick", FAMILY_EMERGENCY: "Family emergency", TRANSPORTATION: "Transportation issue", SCHOOL: "School conflict", PERSONAL_EMERGENCY: "Personal emergency", OTHER: "Other" };
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

/** Quiet (v4): "Sat, 8:00 AM" for a shift. */
function at(shift: { date: string; startTime: string }) {
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(`${shift.date}T12:00:00Z`));
  return `${day}, ${formatTime(shift.startTime)}`;
}

/** One line for what the request asks: "Swap Sat, 8:00 AM with Marco Silva". */
function exchangeLine(exchange: ExchangeRecord) {
  if (exchange.kind === "SWAP") return exchange.targetEmployeeName ? `Swap ${at(exchange.sourceShift)} with ${exchange.targetEmployeeName}` : `Swap ${at(exchange.sourceShift)}`;
  return exchange.targetEmployeeName ? `Give ${at(exchange.sourceShift)} to ${exchange.targetEmployeeName}` : `Offered ${at(exchange.sourceShift)}`;
}

function Decision({ id, revision, decline, approve, allowed, notice, what }: { id: string; revision?: number; decline: string; approve: string; allowed: boolean; notice?: string; what: string }) {
  if (!revision) return <p className="q-help q-acts-note">This request changed. Reload to see the latest.</p>;
  return <ShiftChangeForm fields={{ requestId: id, expectedRevision: revision }} className="q-acts-form">
    {notice ? <p className="q-help q-acts-note">{notice}</p> : null}
    <div className="q-acts">
      <PendingButton className="q-bs" name="kind" value={decline} pending="Declining…" label={`Decline ${what}`}>Decline</PendingButton>
      {allowed ? <PendingButton className="q-bs q-bs--go" name="kind" value={approve} pending="Approving…" label={`Approve ${what}`}>Approve</PendingButton> : null}
    </div>
  </ShiftChangeForm>;
}

/** Quiet (v4, approved Oct 23): Waiting, Open cover and Done. A waiting request is one row (who, what, when it was sent)
 * with Decline and Approve under it; open cover can be closed; Done rows open their history. */
export async function ManagerShiftRequests({ tab, error, requestId, timeZone }: {
  timeZone: string; tab?: string; error?: string; approved?: string; reviewed?: string; calloutApproved?: string; calloutDenied?: string; requestId?: string;
}) {
  await requireRoles(MANAGER_ROLES);
  const proof=await requireSessionMutationProof();
  const selected = tabs.find(item => item.id === tab) ?? tabs[0];
  const source=await withOperationalCompany(proof,async()=>{
  const [pending, callouts, coverage, exchanges, history] = await Promise.all([
    listManagerPendingExchanges(),
    listPendingCallouts(),
    selected.id === "coverage" ? listManagementCoverage(businessDate(new Date(), timeZone)) : Promise.resolve([]),
    selected.id === "activity" ? listTeamExchangeActivity(true) : Promise.resolve([]),
    selected.id === "activity" ? listTeamCalloutHistory() : Promise.resolve([]),
  ]);
  const livePending=pending.filter(e=>e.status==='MANAGER_PENDING');
  const liveCoverage=coverage.filter(e=>e.status==='OPEN');
  const decide=selected.id==='pending';
  const approvals=new Map(decide?await Promise.all([...livePending.map(e=>({id:e.id,revision:e.requestRevision,kind:'MANAGER_APPROVE' as const})),...callouts.map(e=>({id:e.id,revision:e.requestRevision,kind:'APPROVE_CALLOUT' as const}))].map(async e=>[e.id,e.revision?await readShiftChangeAvailability(proof,{kind:e.kind,requestId:e.id,expectedRevision:e.revision,operationId:randomUUID()}).catch(()=>({allowed:false,notice:'We couldn’t check this right now. Reload to try again.'})):{allowed:false,notice:'This request changed. Reload to see the latest.'}] as const)):[]);
  const historyViews=new Map(await Promise.all([...exchanges,...history].map(async e=>[e.id,await readShiftChangeHistoryView(proof,e.id).catch(()=>null)] as const)));
    return {callouts,exchanges,history,livePending,liveCoverage,approvals,historyViews};
  });
  if(source.state==='unavailable')return <OperationalUnavailable title="Team shift requests unavailable" reason={source.reason}/>;
  const {callouts,exchanges,history,livePending,liveCoverage,approvals,historyViews}=source.data;
  const now = source.observedAt;
  const waiting = livePending.length + callouts.length;
  const activity = [
    ...exchanges.map(exchange => ({ id: exchange.id, createdAt: exchange.createdAt, status: exchange.status, name: exchange.requestedByName, line: exchangeLine(exchange), note: null as string | null })),
    ...history.map(callout => ({ id: callout.id, createdAt: callout.createdAt, status: callout.status, name: callout.employeeName, line: `Can’t work ${at(callout)}`,
      note: callout.status === "APPROVED" && !callout.releaseApplies ? "This approval was for an earlier version of the shift. Check who is assigned now." : null })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);
  const sent = (createdAt: string) => agoLabel(createdAt, now, true);

  return <ScopedReadFrame observation={source}><QuietPage className="q-shiftreq">
    <QuietNav back={{ href: "/app/inbox", label: "Inbox" }} />
    <QuietHeader title="Shift requests" />
    <QuietSegments label="Shift request sections" items={tabs.map(item => ({ href: `/app/exchange?tab=${item.id}`, current: selected.id === item.id,
      label: item.id === "pending" && waiting ? `Waiting · ${waiting}` : item.label }))} />
    {error ? <p className="q-error q-first" role="alert">{errors[error] ?? "The request may have changed. Check it and decide again."}</p> : null}

    {selected.id === "pending" ? (waiting ? <ul className="q-list q-requests" aria-label="Waiting shift requests">
      {livePending.map(exchange => {
        const what = `${exchange.kind === "SWAP" ? "swap" : "coverage"} request from ${exchange.requestedByName}`;
        return <li className="q-request" id={`request-${exchange.id}`} tabIndex={-1} key={exchange.id} data-selected={requestId === exchange.id ? "true" : undefined}>
          <QuietRow bare avatar={initialsOf(exchange.requestedByName)} title={exchange.requestedByName} detail={exchangeLine(exchange)} value={sent(exchange.createdAt)}
            label={`${exchange.requestedByName}, ${exchangeLine(exchange)}, ${exchange.kind === "SWAP" ? "approving trades the two shifts" : "approving gives the shift to the person who picked it up"}`} />
          <Decision id={exchange.id} revision={exchange.requestRevision} decline="MANAGER_DECLINE" approve="MANAGER_APPROVE" allowed={!!approvals.get(exchange.id)?.allowed} notice={approvals.get(exchange.id)?.notice ?? undefined} what={what} />
        </li>;
      })}
      {callouts.map(callout => {
        const reason = [reasons[callout.reasonCode] ?? callout.reasonCode, callout.reasonNote].filter(Boolean).join(" · ");
        return <li className="q-request" id={`request-${callout.id}`} tabIndex={-1} key={callout.id} data-selected={requestId === callout.id ? "true" : undefined}>
          <QuietRow bare avatar={initialsOf(callout.employeeName)} title={callout.employeeName} detail={`Can’t work ${at(callout)} · ${reason}`} value={sent(callout.createdAt)}
            label={`${callout.employeeName} can’t work ${at(callout)}, ${reason}. Approving takes the shift off their schedule; it will still need cover.`} />
          <Decision id={callout.id} revision={callout.requestRevision} decline="DECLINE_CALLOUT" approve="APPROVE_CALLOUT" allowed={!!approvals.get(callout.id)?.allowed} notice={approvals.get(callout.id)?.notice ?? undefined} what={`the report from ${callout.employeeName}`} />
        </li>;
      })}
    </ul> : <p className="q-empty q-first">You’re all caught up.</p>) : null}

    {selected.id === "coverage" ? (liveCoverage.length ? <ul className="q-list q-requests" aria-label="Open cover">
      {liveCoverage.map(exchange => <li className="q-request" key={exchange.id}>
        <QuietRow bare avatar={initialsOf(exchange.requestedByName)} title={exchange.requestedByName} detail={exchangeLine(exchange)} value={sent(exchange.createdAt)} />
        {exchange.requestRevision ? <ShiftChangeForm fields={{ kind: "MANAGER_CLOSE", requestId: exchange.id, expectedRevision: exchange.requestRevision }} className="q-acts-form">
          <div className="q-acts"><PendingButton className="q-bs" pending="Closing…" label={`Close the coverage request from ${exchange.requestedByName}. The shift stays with them.`}>Close request</PendingButton></div>
        </ShiftChangeForm> : null}
      </li>)}
    </ul> : <p className="q-empty q-first">No open cover.</p>) : null}

    {selected.id === "activity" ? (activity.length ? <ul className="q-list q-requests q-done" aria-label="Done">
      {activity.map(item => <li key={item.id}>
        <details className="q-details">
          <summary className="q-row q-row--av">
            <span className="q-av" aria-hidden="true">{initialsOf(item.name)}</span>
            <span className="q-rt"><b>{item.name}</b><i>{item.line}</i></span>
            <span className="q-rv">{statusWord(item.status)}</span>
          </summary>
          <div className="q-details__body q-done__body">{item.note ? <p className="q-help">{item.note}</p> : null}<ShiftChangeHistory events={historyViews.get(item.id)??null}/></div>
        </details>
      </li>)}
    </ul> : <p className="q-empty q-first">Nothing decided yet.</p>) : null}
  </QuietPage></ScopedReadFrame>;
}
