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
import {readShiftChangeHistoryView,type ShiftHistoryView} from '@/lib/data/shift-change-views';
import { businessDate } from "@/lib/business-time";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listManagerPendingExchanges, listManagementCoverage, listTeamExchangeActivity, type ExchangeRecord } from "@/lib/data/exchanges";
import { listPendingCallouts, listTeamCalloutHistory, type CalloutRecord } from "@/lib/data/callouts";
import { ShiftRequestDecide, type ShiftAsk } from "./shift-request-decide";
import { agoLabel } from "./quiet/quiet";
import { CorpCard, CorpNav, CorpPage, CorpSegments, CorpTitle } from "./corp/corp";
import "@/app/app/schedule/schedule-tools.css";
import { addDays, formatTimeRange } from "@/lib/date-utils";
import type { ReactNode } from "react";
import { WholeParts } from "./time-off-waiting-list";
import { calloutCoverText, coverOutcomeText } from "@/lib/action-center/request-details";
import { reviewCopy } from "./review-details/copy";
import { BAvatar, BChip, BSegs, BState } from "./owner-b/b-kit";

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

/** Jose (Nov 23, 2026): a request's summary reads in three fixed lines, not one run-on string: the name with the kind of
 * request as a small label beside it (Cover request and Swap in teal, Can't work in amber), then the day and the hours
 * together, each part kept whole, then who else is involved or how it ended. Ported from schedule-tools-2 (42202cd0,
 * e67dc07e) onto this package's C12 rows. */
type Head = { kind: string; tone: "teal" | "amber"; when: string[]; who?: string };
function exchangeHead(exchange: ExchangeRecord, year: string): Head {
  const when = [shiftDay(exchange.sourceShift.date, year), shiftHours(exchange.sourceShift)];
  if (exchange.kind === "SWAP") return { kind: "Swap", tone: "teal", when, who: exchange.targetEmployeeName ? `With ${exchange.targetEmployeeName}` : undefined };
  // Phase 8 (a.md #14): a cover request says what Things to do says ("Picked up by Valeria Díaz").
  return { kind: t.coverRequest, tone: "teal", when, who: coverResult(exchange) };
}
function calloutHead(callout: { date: string; startTime: string; endTime: string }, year: string): Head {
  return { kind: "Can’t work", tone: "amber", when: [shiftDay(callout.date, year), shiftHours(callout)] };
}

/** Phase 3 (OW-029): one shift on one line: the day, start to end (an overnight end names its day), then where. */
function shiftLine(shift: FactShift, year: string) {
  const start = shift.startTime.slice(0, 5), end = shift.endTime.slice(0, 5);
  const overnight = end !== "24:00" && end < start;
  const position = shift.positionName ?? (shift.positionId ? `Position ${shift.positionId}` : null);
  return [shiftDay(shift.date, year), `${shiftHours(shift)}${overnight ? `, ends ${shiftDay(addDays(shift.date, 1), year)}` : ""}`, shift.locationName, position, shift.isDesignatedLead ? "Shift lead" : null].filter(Boolean).join(" · ");
}
/** Gaps G87 (Nov 23, 2026), each fact once: the row above already says the request's day and hours, so the shift it opens
 * to adds only what the row doesn't (an overnight end, where, the position, the lead). */
function shiftRest(shift: FactShift, year: string) {
  const start = shift.startTime.slice(0, 5), end = shift.endTime.slice(0, 5);
  const overnight = end !== "24:00" && end < start;
  const position = shift.positionName ?? (shift.positionId ? `Position ${shift.positionId}` : null);
  return [overnight ? `Ends ${shiftDay(addDays(shift.date, 1), year)}` : null, shift.locationName, position, shift.isDesignatedLead ? "Shift lead" : null].filter(Boolean).join(" · ");
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
  const rest = shiftRest(exchange.sourceShift, year);
  const source = rest ? [{ label: owner(exchange.sourceShift.employeeName), value: rest, parts: true }] : [];
  if (exchange.kind === "SWAP") return <>
    <Facts rows={[...source, ...(other ? [{ label: owner(other.employeeName), value: shiftLine(other, year), parts: true }] : [])]} />
    <p className="c-shreq__help">{other ? "Approving trades these two shifts." : "The other shift isn’t available right now. Reload to see the latest."}</p>
  </>;
  // Phase 4 (U09): the result of a cover request, one phrase per state from its status: picked up by whom, nobody yet,
  // waiting for an answer, withdrawn, expired. A status this page doesn't know reads "Result not known", never "nobody".
  return <>
    {/* G87: the row's own line already says the result ("Picked up by …", "Nobody has picked it up yet"). */}
    {source.length ? <Facts rows={source} /> : null}
    <p className="c-shreq__help">{exchange.targetEmployeeName ? "Approving gives this shift to the person who picked it up." : `Closing stops anyone else from picking it up. The shift stays with ${exchange.requestedByName}.`}</p>
  </>;
}

function CalloutFacts({ callout, reason, year }: { callout: CalloutRecord; reason: string; year: string }) {
  return <>
    <Facts rows={[...(shiftRest(callout, year) ? [{ label: `${possessive(callout.employeeName)} shift`, value: shiftRest(callout, year), parts: true }] : []), { label: "Reason", value: reason }, ...(callout.reasonNote ? [{ label: "Note", value: callout.reasonNote }] : []),
      // Phase 4 (U09): what the linked cover requests recorded. History only: it names nobody and is not today's staffing.
      { label: t.coverHistory, value: calloutCoverText(callout.coverage, t) }]} />
    {/* Jose (Nov 21, 2026): the explaining sentences are one grey paragraph under the facts. */}
    <p className="c-shreq__help"><span>Approving takes the shift off their schedule. It will still need someone to cover it.</span><span>{t.coverHistoryHelp}</span></p>
  </>;
}

/** A request row that opens in place to show its shift in full; the decision stays under it. Phase 2 (C12): the kit's
 * row (face, name over one line of facts, when it was sent) inside the card; the name the row is read by starts with what
 * it draws. Phase 8 (a.md #12, #25), OW-012: a request that carries its own Decline and Approve has no chevron. */
function RequestDetails({ name, head, sent, aged, hint, open, end, children }: { name: string; head: Head; sent: string; aged: boolean; hint: string; open: boolean; end?: ReactNode; children: ReactNode }) {
  return <details className="c-shreq__details" open={open}>
    <summary className="c-shreq__sum">
      <BAvatar name={name} size={40} />
      <span className="c-shreq__tx"><span className="c-shreq__head"><span className="c-shreq__name">{name}</span>{head.kind ? <BChip tone={head.tone}>{head.kind}</BChip> : null}</span>
        <span className="c-shreq__line c-shreq__when"><BSegs parts={head.when} /></span>{head.who ? <span className="c-shreq__line c-shreq__who">{head.who}</span> : null}
        {aged ? <span className="c-shreq__age">{sent}</span> : null}<span className="b-sr">{`. ${hint}`}</span></span>
      <span className={end ? "c-shreq__end c-shreq__end--status" : "c-shreq__end"}>{end ?? sent}</span>
    </summary>
    <div className="c-shreq__body">{children}</div>
  </details>;
}

/** Phase 2 (C12, Nov 23, 2026): a decided request's history in plain words. The server's view (shared with the
 * Employee side) writes ISO times, 24-hour shift times and internal ids; here each step reads "Completed · Nov 23,
 * 8:28 AM" and the shift it held "Wed, Dec 9 · 8:00 AM – 4:00 PM". A line this can't read is shown as it came. */
const MODES: Record<string, string> = { MANAGER: "by a manager", MANAGER_REVIEW: "by a manager", AUTOMATIC: "automatically", AUTOMATIC_WHEN_VALID: "automatically" };
function historyShift(text: string | null, year: string) {
  if (!text) return null;
  const match = /^(\d{4}-\d{2}-\d{2}) · (\d{2}:\d{2}) – (\d{2}:\d{2})(?: · .*?)?( · Shift lead)?$/.exec(text);
  return match ? `${shiftDay(match[1], year)} · ${formatTimeRange(match[2], match[3])}${match[4] ? " · Shift lead" : ""}` : text;
}
function ManagerHistory({ events, timeZone, year, line }: { events: ShiftHistoryView[] | null; timeZone: string; year: string; /** The row's own line: a step's shift that it already says isn't repeated. */ line: string }) {
  if (events === null) return <p className="c-shreq__help" role="status">Request history is unavailable. Reconnect and reload.</p>;
  if (!events.length) return null;
  const at = (iso: string) => { const date = new Date(iso); return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date) : iso; };
  return <details className="c-shreq__history"><summary>Request history</summary><ol>{events.map((event, index) => {
    const step = event.event ? event.event[0].toUpperCase() + event.event.slice(1) : "Changed";
    const mode = event.mode ? MODES[event.mode] : undefined;
    const shift = historyShift(event.source, year), other = historyShift(event.target, year);
    const before = index ? historyShift(events[index - 1].source, year) : null;
    const said = shift && (index ? shift === before : line.includes(shift));
    const shown = said && !other ? null : shift;
    return <li key={`${event.revision}-${index}`}><strong>{[mode ? `${step} ${mode}` : step, at(event.at)].join(" · ")}</strong>
      {shown ? <span>{other ? `Shift: ${shown}` : shown}</span> : null}{other ? <span>{`Other shift: ${other}`}</span> : null}</li>;
  })}</ol></details>;
}

/** Final polish (confirmations A #1, #2): what approving or declining a swap or a cover request leaves, in words. */
function exchangeOutcome(exchange: ExchangeRecord): ShiftChangeOutcome {
  const icon = <ArrowsLeftRightIcon weight="bold" />, other = exchange.targetEmployeeName;
  if (exchange.kind === "SWAP") return { completed: { tone: "done", title: t.swapApproved, line: t.swapApprovedLine },
    closed: { tone: "closed", icon, title: t.swapDeclined, line: other ? t.bothKeep(exchange.requestedByName, other) : t.keepsShift(exchange.requestedByName) } };
  return { completed: { tone: "done", title: t.coverApproved, line: other ? t.hasShiftNow(other) : t.scheduleShowsIt },
    closed: { tone: "closed", icon, title: t.coverDeclined, line: t.keepsShift(exchange.requestedByName) } };
}

/** Jose (Nov 21, 2026): the question before a Decline (or Close request). Its consequence is the line the declined
 * result already says, with first names; nothing here says more than the screen holds. */
const first = (name: string) => name.split(/\s+/)[0] || name;
function exchangeAsk(exchange: ExchangeRecord, what: string): ShiftAsk {
  const swap = exchange.kind === "SWAP", other = exchange.targetEmployeeName;
  return { question: swap ? t.askDeclineSwap : t.askDeclineCover, consequence: swap && other ? t.bothKeep(first(exchange.requestedByName), first(other)) : t.keepsShift(first(exchange.requestedByName)),
    keep: t.keepRequest, go: t.decline, groupLabel: `Decline the ${what}?`, keepLabel: `Keep the ${what}`, goLabel: `Decline the ${what}` };
}

function Decision({ id, revision, decline, approve, allowed, notice, noticeHref, what, outcome, ask }: { outcome?: ShiftChangeOutcome; id: string; revision?: number; decline: string; approve: string; allowed: boolean; notice?: string; noticeHref?: string | null; what: string; ask: ShiftAsk }) {
  if (!revision) return <p className="c-shreq__note">This request changed. Reload to see the latest.</p>;
  return <ShiftChangeForm fields={{ requestId: id, expectedRevision: revision }} className="c-shreq__form" outcome={outcome}>
    {notice ? <p className="c-shreq__note">{notice}{noticeHref ? <> <Link href={noticeHref}>Publish changes</Link></> : null}</p> : null}
    <ShiftRequestDecide decline={decline} declineLabel={`Decline ${what}`} approve={allowed ? approve : undefined} approveLabel={`Approve ${what}`} ask={ask} />
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
    ...exchanges.map(exchange => ({ id: exchange.id, createdAt: exchange.createdAt, status: exchange.status, name: exchange.requestedByName, head: exchangeHead(exchange, year), note: null as string | null,
      // Phase 4 (U09): a finished cover request says its result; a swap has none to add.
      fact: exchange.kind === "SWAP" ? null : { label: t.outcome, value: coverResult(exchange), help: null as string | null } })),
    ...history.map(callout => ({ id: callout.id, createdAt: callout.createdAt, status: callout.status, name: callout.employeeName, head: calloutHead(callout, year),
      note: callout.status === "APPROVED" && !callout.releaseApplies ? "This approval was for an earlier version of the shift. Check who is assigned now." : null,
      fact: { label: t.coverHistory, value: calloutCoverText(callout.coverage, t), help: t.coverHistoryHelp as string | null } })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);
  // Review B5 (NV-268): one relative-time format with "ago", as on Time off.
  const sent = (createdAt: string) => agoLabel(createdAt, now);
  // OW-011: phones show a request's age only once it is over a day old.
  const aged = (createdAt: string) => Date.parse(now) - Date.parse(createdAt) >= 86_400_000;

  // Phase 2 (Schedule tools, C12, Nov 23, 2026): Direction B for real. The Corp page the B layer draws as the band (title
  // and the three views) and one white card of requests; each row is the kit's row with the same disclosure, decision
  // parts, forms and reads as before.
  return <ScopedReadFrame observation={source}><CorpPage className="c-shreq c-page--narrow" labelledBy="shreq-title">
    <CorpNav back={{ href: "/app/inbox", label: "Things to do" }} title="Shift requests" titleId="shreq-title" phoneOnly />
    <CorpTitle title="Shift requests" wide />
    {/* R12: the kit's segmented control; counts read "Waiting 2" (countLabel). */}
    <CorpSegments label="Shift request sections" items={tabs.map(item => ({ href: `/app/exchange?tab=${item.id}`, current: selected.id === item.id,
      label: item.id === "pending" && waiting ? `Waiting (${waiting})` : item.label }))} />
    {error ? <p className="c-st__msg c-st__msg--error form-error" role="alert">{errors[error] ?? "The request may have changed. Check it and decide again."}</p> : null}

    {selected.id === "pending" ? (waiting ? <CorpCard ariaLabel="Waiting shift requests"><ul className="c-shreq__list">
      {livePending.map(exchange => {
        const what = `${exchange.kind === "SWAP" ? "swap" : "coverage"} request from ${exchange.requestedByName}`;
        return <li className="c-shreq__item" id={`request-${exchange.id}`} tabIndex={-1} key={exchange.id} data-selected={requestId === exchange.id ? "true" : undefined}>
          <RequestDetails name={exchange.requestedByName} head={exchangeHead(exchange, year)} sent={sent(exchange.createdAt)} aged={aged(exchange.createdAt)} open={requestId === exchange.id}
            hint={`Show ${exchange.kind === "SWAP" ? "both shifts" : "the shift"}`}><ExchangeFacts exchange={exchange} year={year} /></RequestDetails>
          <Decision id={exchange.id} revision={exchange.requestRevision} decline="MANAGER_DECLINE" approve="MANAGER_APPROVE" allowed={!!approvals.get(exchange.id)?.allowed} notice={approvals.get(exchange.id)?.notice ?? undefined} what={what} outcome={exchangeOutcome(exchange)} ask={exchangeAsk(exchange, what)} />
        </li>;
      })}
      {callouts.map(callout => {
        return <li className="c-shreq__item" id={`request-${callout.id}`} tabIndex={-1} key={callout.id} data-selected={requestId === callout.id ? "true" : undefined}>
          <RequestDetails name={callout.employeeName} head={calloutHead(callout, year)} sent={sent(callout.createdAt)} aged={aged(callout.createdAt)} open={requestId === callout.id}
            hint="Show the shift"><CalloutFacts callout={callout} reason={reasons[callout.reasonCode] ?? callout.reasonCode} year={year} /></RequestDetails>
          <Decision id={callout.id} revision={callout.requestRevision} decline="DECLINE_CALLOUT" approve="APPROVE_CALLOUT" allowed={!!approvals.get(callout.id)?.allowed} notice={approvals.get(callout.id)?.notice ?? undefined} noticeHref={publishFirstHref(approvals.get(callout.id)?.notice, callout.weekStart)} what={`the report from ${callout.employeeName}`}
            ask={{ question: t.askDeclineCallout, consequence: t.staysOnShift(first(callout.employeeName)), keep: t.keepRequest, go: t.decline,
              groupLabel: `Decline the call-out from ${callout.employeeName}?`, keepLabel: `Keep the call-out from ${callout.employeeName}`, goLabel: `Decline the call-out from ${callout.employeeName}` }}
            outcome={{ completed: { tone: "done", title: t.calloutApproved, line: t.calloutApprovedLine }, closed: { tone: "closed", icon: <UserMinusIcon weight="bold" />, title: t.calloutDeclined, line: t.keepsShift(callout.employeeName) } }} />
        </li>;
      })}
    </ul></CorpCard> : <CorpCard ariaLabel="Waiting shift requests"><BState kind="empty" title="You’re all caught up" line="New shift requests show up here." /></CorpCard>) : null}

    {selected.id === "coverage" ? (liveCoverage.length ? <CorpCard ariaLabel="Open cover"><ul className="c-shreq__list">
      {liveCoverage.map(exchange => <li className="c-shreq__item" key={exchange.id}>
        {/* Each fact once (e67dc07e): every row on Open cover is a cover request nobody has picked up, so the tab says it and
            the rows carry only who asked and when (and a name, should someone have picked it up). */}
        <RequestDetails name={exchange.requestedByName} head={{ ...exchangeHead(exchange, year), kind: "", who: exchange.targetEmployeeName ? coverResult(exchange) : undefined }} sent={sent(exchange.createdAt)} aged={aged(exchange.createdAt)} open={false}
          hint="Show the shift"><ExchangeFacts exchange={exchange} year={year} /></RequestDetails>
        {exchange.requestRevision ? <ShiftChangeForm fields={{ kind: "MANAGER_CLOSE", requestId: exchange.id, expectedRevision: exchange.requestRevision }} className="c-shreq__form"
          outcome={{ closed: { tone: "closed", icon: <ArrowsLeftRightIcon weight="bold" />, title: t.requestClosed, line: t.keepsShift(exchange.requestedByName) } }}>
          <ShiftRequestDecide declineWords={t.closeRequest} pending="Closing…" declineLabel={`Close the coverage request from ${exchange.requestedByName}. The shift stays with them.`}
            ask={{ question: t.askCloseCover, consequence: t.keepsShift(first(exchange.requestedByName)), keep: t.keepRequest, go: t.closeRequest,
              groupLabel: `Close the coverage request from ${exchange.requestedByName}?`, keepLabel: `Keep the coverage request from ${exchange.requestedByName}`, goLabel: `Close the coverage request from ${exchange.requestedByName}` }} />
        </ShiftChangeForm> : null}
      </li>)}
    </ul></CorpCard> : <CorpCard ariaLabel="Open cover"><BState kind="empty" title="No open cover" line="Cover requests nobody has picked up show up here." /></CorpCard>) : null}

    {selected.id === "activity" ? (activity.length ? <CorpCard ariaLabel="Done"><ul className="c-shreq__list c-shreq__list--done">
      {activity.map(item => <li className="c-shreq__item" key={item.id}>
        <RequestDetails name={item.name} head={item.head} sent={sent(item.createdAt)} aged={false} open={false} hint="Show the history" end={statusWord(item.status)}>
          {item.note ? <p className="c-shreq__help">{item.note}</p> : null}
          {item.fact ? <><Facts rows={[{ label: item.fact.label, value: item.fact.value }]} />{item.fact.help ? <p className="c-shreq__help">{item.fact.help}</p> : null}</> : null}<ManagerHistory events={historyViews.get(item.id)??null} timeZone={timeZone} year={year} line={[...item.head.when, item.head.who].filter(Boolean).join(" · ")} />
        </RequestDetails>
      </li>)}
    </ul></CorpCard> : <CorpCard ariaLabel="Done"><BState kind="empty" title="Nothing decided yet" line="Requests you approve or decline show up here." /></CorpCard>) : null}
  </CorpPage></ScopedReadFrame>;
}
