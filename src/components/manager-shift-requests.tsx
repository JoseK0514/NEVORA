import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {randomUUID} from 'node:crypto';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {readShiftChangeAvailability} from '@/lib/data/shift-changes';
import Link from 'next/link';
import {publishFirstHref} from '@/lib/shift-changes/publish-first';
import {ShiftChangeForm,type ShiftChangeOutcome} from './shift-change-form';
import {ArrowsLeftRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import {UserMinusIcon} from '@phosphor-icons/react/dist/ssr/UserMinus';
import {ShiftChangeHistory} from './shift-change-history';
import {readShiftChangeHistoryView} from '@/lib/data/shift-change-views';
import { businessDate } from "@/lib/business-time";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listManagerPendingExchanges, listManagementCoverage, listTeamExchangeActivity, type ExchangeRecord } from "@/lib/data/exchanges";
import { listPendingCallouts, listTeamCalloutHistory, type CalloutRecord } from "@/lib/data/callouts";
import { PendingButton } from "./wave-a/pending-button";
import { agoLabel, initialsOf, QuietHeader, QuietNav, QuietPage } from "./quiet/quiet";
import { RequestFace } from "./request-face";
import { CorpSegments } from "./corp/corp";
import { addDays, formatTimeRange } from "@/lib/date-utils";
import type { ReactNode } from "react";
import { WholeParts } from "./time-off-waiting-list";
import { calloutCoverText, coverOutcomeText } from "@/lib/action-center/request-details";
import { reviewCopy } from "./review-details/copy";
import { BState } from "./owner-b/b-kit";

const t = reviewCopy();

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
  CALLOUT_EXISTS: "This shift already has a can’t-work request.",
};
function statusWord(status: string) {
  if (status === "DENIED") return "Declined";
  if (status === "APPROVED") return "Approved";
  if (status === "CANCELLED") return "Withdrawn";
  return status.toLowerCase().replaceAll("_", " ").replace(/^./, first => first.toUpperCase());
}
const possessive = (name: string) => `${name}’${name.endsWith("s") ? "" : "s"}`;

type FactShift = { date: string; startTime: string; endTime: string; locationName: string; positionName?: string; positionId?: string; isDesignatedLead?: boolean };

/** "Tue, Nov 17"; the year only when it is not this one (OW-003). */
function shiftDay(date: string, year: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", ...(date.slice(0, 4) === year ? {} : { year: "numeric" as const }), timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

/** "8:00 AM – 4:00 PM", through the shared formatter for a shift's hours (OW-003); an end at 24:00 reads "midnight". */
function shiftHours(shift: { startTime: string; endTime: string }) {
  return formatTimeRange(shift.startTime.slice(0, 5), shift.endTime.slice(0, 5));
}

/** Phase 3 (OW-029): "Tue, Nov 17 · 8:00 AM – 4:00 PM", the when of a request's collapsed line. */
function when(shift: { date: string; startTime: string; endTime: string }, year: string) {
  return `${shiftDay(shift.date, year)} · ${shiftHours(shift)}`;
}

/** One line for what the request asks: "Swap with Marco Silva · Sat, Nov 21 · 12:00 PM – 8:00 PM". */
function exchangeLine(exchange: ExchangeRecord, year: string) {
  // Phase 8 (a.md #14): a cover request says what Things to do says ("Cover request · Tue, Nov 24 · 12:00 PM – 8:00 PM ·
  // Picked up by Valeria Díaz"), not a second wording ("Give to Valeria Díaz").
  if (exchange.kind !== "SWAP") return `${t.coverRequest} · ${when(exchange.sourceShift, year)} · ${coverResult(exchange)}`;
  return `${exchange.targetEmployeeName ? `Swap with ${exchange.targetEmployeeName}` : "Swap"} · ${when(exchange.sourceShift, year)}`;
}

/** Phase 3 (OW-029): one shift on one line: the day, start to end (an overnight end names its day), then where. */
function shiftLine(shift: FactShift, year: string) {
  const start = shift.startTime.slice(0, 5), end = shift.endTime.slice(0, 5);
  const overnight = end !== "24:00" && end < start;
  const position = shift.positionName ?? (shift.positionId ? `Position ${shift.positionId}` : null);
  return [shiftDay(shift.date, year), `${shiftHours(shift)}${overnight ? `, ends ${shiftDay(addDays(shift.date, 1), year)}` : ""}`, shift.locationName, position, shift.isDesignatedLead ? "Shift lead" : null].filter(Boolean).join(" · ");
}

/** Phase 4 (U09): a cover request's result, one phrase per state. This page reads the request's full record, so a
 * request still in progress with nobody on it is "Nobody has picked it up yet"; a finished one says how it ended. */
function coverResult(exchange: ExchangeRecord) {
  const inProgress = exchange.status === "OPEN" || exchange.status === "EMPLOYEE_PENDING" || exchange.status === "MANAGER_PENDING";
  return inProgress && !exchange.targetEmployeeName ? t.nobodyYet : coverOutcomeText({ status: exchange.status, counterpartName: exchange.targetEmployeeName ?? undefined }, t);
}

/** Phase 3 (OW-029): what opens under a request is a two-column list (label, value) in one quiet block. */
function Facts({ rows }: { rows: { label: string; value: string; parts?: boolean }[] }) {
  return <dl className="b-req-facts">{rows.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{row.parts ? <WholeParts text={row.value} /> : row.value}</dd></div>)}</dl>;
}

/** What opens under a request: both shifts of a swap, the shift and who picked it up for coverage. Each shift names its
 * person in full, so a decider never has to match a first name to the row above (Codex review, Oct 23). */
function ExchangeFacts({ exchange, year }: { exchange: ExchangeRecord; year: string }) {
  const other = exchange.targetShift;
  const owner = (name: string) => `${possessive(name)} shift`;
  const source = { label: owner(exchange.sourceShift.employeeName), value: shiftLine(exchange.sourceShift, year), parts: true };
  if (exchange.kind === "SWAP") return <>
    <Facts rows={[source, ...(other ? [{ label: owner(other.employeeName), value: shiftLine(other, year), parts: true }] : [])]} />
    <p className="q-help">{other ? "Approving trades these two shifts." : "The other shift isn’t available right now. Reload to see the latest."}</p>
  </>;
  // Phase 4 (U09): the result of a cover request, one phrase per state from its status: picked up by whom, nobody yet,
  // waiting for an answer, withdrawn, expired. A status this page doesn't know reads "Result not known", never "nobody".
  return <>
    <Facts rows={[source, { label: t.outcome, value: coverResult(exchange) }]} />
    <p className="q-help">{exchange.targetEmployeeName ? "Approving gives this shift to the person who picked it up." : `Closing stops anyone else from picking it up. The shift stays with ${exchange.requestedByName}.`}</p>
  </>;
}

function CalloutFacts({ callout, reason, year }: { callout: CalloutRecord; reason: string; year: string }) {
  return <>
    <Facts rows={[{ label: `${possessive(callout.employeeName)} shift`, value: shiftLine(callout, year), parts: true }, { label: "Reason", value: reason }, ...(callout.reasonNote ? [{ label: "Note", value: callout.reasonNote }] : []),
      // Phase 4 (U09): what the linked cover requests recorded. History only: it names nobody and is not today's staffing.
      { label: t.coverHistory, value: calloutCoverText(callout.coverage, t) }]} />
    {/* Jose (Nov 21, 2026): the explaining sentences are one grey paragraph under the facts. */}
    <p className="q-help"><span>Approving takes the shift off their schedule. It will still need someone to cover it.</span><span>{t.coverHistoryHelp}</span></p>
  </>;
}

/** A request row that opens in place (the Quiet disclosure) to show its shifts in full; the decision stays under it. */
function RequestDetails({ name, line, sent, aged, label, open, children }: { name: string; line: string; sent: string; aged: boolean; label: string; open: boolean; children: ReactNode }) {
  return <details className="q-details q-request__details" open={open}>
    {/* Phase 8 (a.md #12, #25): the person's own face tint; and, as on Time off and Things to do (OW-012), a request that
      * carries its own Decline and Approve has no chevron. The name and line still open the shift details. */}
    <summary className="q-row q-row--av" aria-label={label}>
      <RequestFace name={name} initials={initialsOf(name)} />
      <span className="q-rt"><b>{name}</b><i><WholeParts text={line} />{aged ? <span className="q-rt__line b-req-age">{sent}</span> : null}</i></span>
      <span className="q-rv"><span className="b-req-ago">{sent}</span></span>
    </summary>
    <div className="q-details__body q-done__body">{children}</div>
  </details>;
}

/** Final polish (confirmations A #1, #2): what approving or declining a swap or a cover request leaves, in words. */
function exchangeOutcome(exchange: ExchangeRecord): ShiftChangeOutcome {
  const icon = <ArrowsLeftRightIcon weight="bold" />, other = exchange.targetEmployeeName;
  if (exchange.kind === "SWAP") return { completed: { tone: "done", title: t.swapApproved, line: t.swapApprovedLine },
    closed: { tone: "closed", icon, title: t.swapDeclined, line: other ? t.bothKeep(exchange.requestedByName, other) : t.keepsShift(exchange.requestedByName) } };
  return { completed: { tone: "done", title: t.coverApproved, line: other ? t.hasShiftNow(other) : t.scheduleShowsIt },
    closed: { tone: "closed", icon, title: t.coverDeclined, line: t.keepsShift(exchange.requestedByName) } };
}

function Decision({ id, revision, decline, approve, allowed, notice, noticeHref, what, outcome }: { outcome?: ShiftChangeOutcome; id: string; revision?: number; decline: string; approve: string; allowed: boolean; notice?: string; noticeHref?: string | null; what: string }) {
  if (!revision) return <p className="q-help q-acts-note">This request changed. Reload to see the latest.</p>;
  return <ShiftChangeForm fields={{ requestId: id, expectedRevision: revision }} className="q-acts-form" outcome={outcome}>
    {notice ? <p className="q-help q-acts-note">{notice}{noticeHref ? <> <Link href={noticeHref}>Publish changes</Link></> : null}</p> : null}
    <div className="q-acts">
      <PendingButton className="q-bs b-rowact b-rowact--quiet" name="kind" value={decline} pending="Declining…" label={`Decline ${what}`}>Decline</PendingButton>
      {allowed ? <PendingButton className="q-bs q-bs--go b-rowact b-rowact--go" name="kind" value={approve} pending="Approving…" label={`Approve ${what}`}>Approve</PendingButton> : null}
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
  // OW-003: a date carries its year only when it is not this one (the company's own calendar year).
  const year = businessDate(new Date(now), timeZone).slice(0, 4);
  const activity = [
    ...exchanges.map(exchange => ({ id: exchange.id, createdAt: exchange.createdAt, status: exchange.status, name: exchange.requestedByName, line: exchangeLine(exchange, year), note: null as string | null,
      // Phase 4 (U09): a finished cover request says its result; a swap has none to add.
      fact: exchange.kind === "SWAP" ? null : { label: t.outcome, value: coverResult(exchange), help: null as string | null } })),
    ...history.map(callout => ({ id: callout.id, createdAt: callout.createdAt, status: callout.status, name: callout.employeeName, line: `Can’t work · ${when(callout, year)}`,
      note: callout.status === "APPROVED" && !callout.releaseApplies ? "This approval was for an earlier version of the shift. Check who is assigned now." : null,
      fact: { label: t.coverHistory, value: calloutCoverText(callout.coverage, t), help: t.coverHistoryHelp as string | null } })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);
  // Review B5 (NV-268): one relative-time format with "ago", as on Time off.
  const sent = (createdAt: string) => agoLabel(createdAt, now);
  // OW-011: phones show a request's age only once it is over a day old.
  const aged = (createdAt: string) => Date.parse(now) - Date.parse(createdAt) >= 86_400_000;

  return <ScopedReadFrame observation={source}><QuietPage className="q-shiftreq">
    <QuietNav back={{ href: "/app/inbox", label: "Things to do" }} />
    <QuietHeader title="Shift requests" />
    {/* R12: the kit's segmented control; counts read "Waiting (1)" (copy table 14). */}
    <CorpSegments label="Shift request sections" items={tabs.map(item => ({ href: `/app/exchange?tab=${item.id}`, current: selected.id === item.id,
      label: item.id === "pending" && waiting ? `Waiting (${waiting})` : item.label }))} />
    {error ? <p className="q-error q-first" role="alert">{errors[error] ?? "The request may have changed. Check it and decide again."}</p> : null}

    {selected.id === "pending" ? (waiting ? <ul className="q-list q-requests" aria-label="Waiting shift requests">
      {livePending.map(exchange => {
        const what = `${exchange.kind === "SWAP" ? "swap" : "coverage"} request from ${exchange.requestedByName}`;
        return <li className="q-request" id={`request-${exchange.id}`} tabIndex={-1} key={exchange.id} data-selected={requestId === exchange.id ? "true" : undefined}>
          <RequestDetails name={exchange.requestedByName} line={exchangeLine(exchange, year)} sent={sent(exchange.createdAt)} aged={aged(exchange.createdAt)} open={requestId === exchange.id}
            label={`${exchange.requestedByName}, ${exchangeLine(exchange, year)}. Show ${exchange.kind === "SWAP" ? "both shifts" : "the shift"}.`}><ExchangeFacts exchange={exchange} year={year} /></RequestDetails>
          <Decision id={exchange.id} revision={exchange.requestRevision} decline="MANAGER_DECLINE" approve="MANAGER_APPROVE" allowed={!!approvals.get(exchange.id)?.allowed} notice={approvals.get(exchange.id)?.notice ?? undefined} what={what} outcome={exchangeOutcome(exchange)} />
        </li>;
      })}
      {callouts.map(callout => {
        const reason = [reasons[callout.reasonCode] ?? callout.reasonCode, callout.reasonNote].filter(Boolean).join(" · ");
        return <li className="q-request" id={`request-${callout.id}`} tabIndex={-1} key={callout.id} data-selected={requestId === callout.id ? "true" : undefined}>
          <RequestDetails name={callout.employeeName} line={`Can’t work · ${when(callout, year)}`} sent={sent(callout.createdAt)} aged={aged(callout.createdAt)} open={requestId === callout.id}
            label={`${callout.employeeName} can’t work ${when(callout, year)}, ${reason}. Show the shift.`}><CalloutFacts callout={callout} reason={reasons[callout.reasonCode] ?? callout.reasonCode} year={year} /></RequestDetails>
          <Decision id={callout.id} revision={callout.requestRevision} decline="DECLINE_CALLOUT" approve="APPROVE_CALLOUT" allowed={!!approvals.get(callout.id)?.allowed} notice={approvals.get(callout.id)?.notice ?? undefined} noticeHref={publishFirstHref(approvals.get(callout.id)?.notice, callout.weekStart)} what={`the report from ${callout.employeeName}`}
            outcome={{ completed: { tone: "done", title: t.calloutApproved, line: t.calloutApprovedLine }, closed: { tone: "closed", icon: <UserMinusIcon weight="bold" />, title: t.calloutDeclined, line: t.keepsShift(callout.employeeName) } }} />
        </li>;
      })}
    </ul> : <div className="q-list q-emptycard"><BState kind="empty" title="You’re all caught up" line="New shift requests show up here." /></div>) : null}

    {selected.id === "coverage" ? (liveCoverage.length ? <ul className="q-list q-requests" aria-label="Open cover">
      {liveCoverage.map(exchange => <li className="q-request" key={exchange.id}>
        <RequestDetails name={exchange.requestedByName} line={exchangeLine(exchange, year)} sent={sent(exchange.createdAt)} aged={aged(exchange.createdAt)} open={false}
          label={`${exchange.requestedByName}, ${exchangeLine(exchange, year)}. Show the shift.`}><ExchangeFacts exchange={exchange} year={year} /></RequestDetails>
        {exchange.requestRevision ? <ShiftChangeForm fields={{ kind: "MANAGER_CLOSE", requestId: exchange.id, expectedRevision: exchange.requestRevision }} className="q-acts-form"
          outcome={{ closed: { tone: "closed", icon: <ArrowsLeftRightIcon weight="bold" />, title: t.requestClosed, line: t.keepsShift(exchange.requestedByName) } }}>
          <div className="q-acts"><PendingButton className="q-bs b-rowact b-rowact--quiet" pending="Closing…" label={`Close the coverage request from ${exchange.requestedByName}. The shift stays with them.`}>Close request</PendingButton></div>
        </ShiftChangeForm> : null}
      </li>)}
    </ul> : <div className="q-list q-emptycard"><BState kind="empty" title="No open cover" line="Cover requests nobody has picked up show up here." /></div>) : null}

    {selected.id === "activity" ? (activity.length ? <ul className="q-list q-requests q-done" aria-label="Done">
      {activity.map(item => <li key={item.id}>
        <details className="q-details">
          <summary className="q-row q-row--av">
            <span className="q-av" aria-hidden="true">{initialsOf(item.name)}</span>
            <span className="q-rt"><b>{item.name}</b><i><WholeParts text={item.line} /></i></span>
            <span className="q-rv">{statusWord(item.status)}</span>
          </summary>
          <div className="q-details__body q-done__body">{item.note ? <p className="q-help">{item.note}</p> : null}
            {item.fact ? <><Facts rows={[{ label: item.fact.label, value: item.fact.value }]} />{item.fact.help ? <p className="q-help">{item.fact.help}</p> : null}</> : null}<ShiftChangeHistory events={historyViews.get(item.id)??null}/></div>
        </details>
      </li>)}
    </ul> : <div className="q-list q-emptycard"><BState kind="empty" title="Nothing decided yet" line="Requests you approve or decline show up here." /></div>) : null}
  </QuietPage></ScopedReadFrame>;
}
