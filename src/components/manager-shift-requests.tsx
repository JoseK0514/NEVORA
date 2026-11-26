import {shiftAvailabilityNotice} from './shift-availability-copy';
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
import { addDays } from "@/lib/date-utils";
import type { ReactNode } from "react";
import { WholeParts } from "./time-off-waiting-list";
import { calloutCoverText, coverOutcomeText } from "@/lib/action-center/request-details";
import { shiftRequestsCopy, type ShiftRequestsCopy, type ShiftRequestsLang } from "./manager-shift-requests-copy";
import { BAvatar, BChip, BSegs, BState } from "./owner-b/b-kit";

/* Signed-in Spanish (Nov 23, 2026): every word on this page comes from manager-shift-requests-copy.ts in the person's
 * language (`c`); `c.review` is the review-details copy the shared request helpers read. */
const tabIds = ["pending", "coverage", "activity"] as const;

type FactShift = { date: string; startTime: string; endTime: string; locationName: string; positionName?: string; positionId?: string; isDesignatedLead?: boolean };

/** "Tue, Nov 17"; the year only when it is not this one (OW-003). */
function shiftDay(date: string, year: string, c: ShiftRequestsCopy) {
  return c.day(date, year);
}

/** "8:00 AM – 4:00 PM", through the shared formatter for a shift's hours (OW-003); an end at 24:00 reads "midnight". */
function shiftHours(shift: { startTime: string; endTime: string }, c: ShiftRequestsCopy) {
  return c.hours(shift.startTime.slice(0, 5), shift.endTime.slice(0, 5));
}

/** Jose (Nov 23, 2026): a request's summary reads in three fixed lines, not one run-on string: the name with the kind of
 * request as a small label beside it (Cover request and Swap in teal, Can't work in amber), then the day and the hours
 * together, each part kept whole, then who else is involved or how it ended. Ported from schedule-tools-2 (42202cd0,
 * e67dc07e) onto this package's C12 rows. */
type Head = { kind: string; tone: "teal" | "amber"; when: string[]; who?: string };
function exchangeHead(exchange: ExchangeRecord, year: string, c: ShiftRequestsCopy): Head {
  const when = [shiftDay(exchange.sourceShift.date, year, c), shiftHours(exchange.sourceShift, c)];
  if (exchange.kind === "SWAP") return { kind: c.swap, tone: "teal", when, who: exchange.targetEmployeeName ? c.withName(exchange.targetEmployeeName) : undefined };
  // Phase 8 (a.md #14): a cover request says what Things to do says ("Picked up by Valeria Díaz").
  return { kind: c.review.coverRequest, tone: "teal", when, who: coverResult(exchange, c) };
}
function calloutHead(callout: { date: string; startTime: string; endTime: string }, year: string, c: ShiftRequestsCopy): Head {
  return { kind: c.cantWork, tone: "amber", when: [shiftDay(callout.date, year, c), shiftHours(callout, c)] };
}

/** Phase 3 (OW-029): one shift on one line: the day, start to end (an overnight end names its day), then where. */
function shiftLine(shift: FactShift, year: string, c: ShiftRequestsCopy) {
  const start = shift.startTime.slice(0, 5), end = shift.endTime.slice(0, 5);
  const overnight = end !== "24:00" && end < start;
  const position = shift.positionName ?? (shift.positionId ? c.position(shift.positionId) : null);
  return [shiftDay(shift.date, year, c), `${shiftHours(shift, c)}${overnight ? `, ${c.endsOn(shiftDay(addDays(shift.date, 1), year, c))}` : ""}`, shift.locationName, position, shift.isDesignatedLead ? c.shiftLead : null].filter(Boolean).join(" · ");
}
/** Gaps G87 (Nov 23, 2026), each fact once: the row above already says the request's day and hours, so the shift it opens
 * to adds only what the row doesn't (an overnight end, where, the position, the lead). */
function shiftRest(shift: FactShift, year: string, c: ShiftRequestsCopy) {
  const start = shift.startTime.slice(0, 5), end = shift.endTime.slice(0, 5);
  const overnight = end !== "24:00" && end < start;
  const position = shift.positionName ?? (shift.positionId ? c.position(shift.positionId) : null);
  return [overnight ? c.endsDay(shiftDay(addDays(shift.date, 1), year, c)) : null, shift.locationName, position, shift.isDesignatedLead ? c.shiftLead : null].filter(Boolean).join(" · ");
}

/** Phase 4 (U09): a cover request's result, one phrase per state. This page reads the request's full record, so a
 * request still in progress with nobody on it is "Nobody has picked it up yet"; a finished one says how it ended. */
function coverResult(exchange: ExchangeRecord, c: ShiftRequestsCopy) {
  const inProgress = exchange.status === "OPEN" || exchange.status === "EMPLOYEE_PENDING" || exchange.status === "MANAGER_PENDING";
  return inProgress && !exchange.targetEmployeeName ? c.review.nobodyYet : coverOutcomeText({ status: exchange.status, counterpartName: exchange.targetEmployeeName ?? undefined }, c.review);
}

/** Phase 3 (OW-029): what opens under a request is a two-column list (label, value) in one quiet block. */
function Facts({ rows }: { rows: { label: string; value: string; parts?: boolean }[] }) {
  return <dl className="b-req-facts">{rows.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{row.parts ? <WholeParts text={row.value} /> : row.value}</dd></div>)}</dl>;
}

/** What opens under a request: both shifts of a swap, the shift and who picked it up for coverage. Each shift names its
 * person in full, so a decider never has to match a first name to the row above (Codex review, Oct 23). */
function ExchangeFacts({ exchange, year, c }: { exchange: ExchangeRecord; year: string; c: ShiftRequestsCopy }) {
  const other = exchange.targetShift;
  const owner = c.shiftOf;
  const rest = shiftRest(exchange.sourceShift, year, c);
  const source = rest ? [{ label: owner(exchange.sourceShift.employeeName), value: rest, parts: true }] : [];
  if (exchange.kind === "SWAP") return <>
    <Facts rows={[...source, ...(other ? [{ label: owner(other.employeeName), value: shiftLine(other, year, c), parts: true }] : [])]} />
    <p className="c-shreq__help">{other ? c.tradesBoth : c.otherShiftGone}</p>
  </>;
  // Phase 4 (U09): the result of a cover request, one phrase per state from its status: picked up by whom, nobody yet,
  // waiting for an answer, withdrawn, expired. A status this page doesn't know reads "Result not known", never "nobody".
  return <>
    {/* G87: the row's own line already says the result ("Picked up by …", "Nobody has picked it up yet"). */}
    {source.length ? <Facts rows={source} /> : null}
    <p className="c-shreq__help">{exchange.targetEmployeeName ? c.givesShift : c.closingStops(exchange.requestedByName)}</p>
  </>;
}

function CalloutFacts({ callout, reason, year, c }: { callout: CalloutRecord; reason: string; year: string; c: ShiftRequestsCopy }) {
  const t = c.review;
  return <>
    <Facts rows={[...(shiftRest(callout, year, c) ? [{ label: c.shiftOf(callout.employeeName), value: shiftRest(callout, year, c), parts: true }] : []), { label: c.reason, value: reason }, ...(callout.reasonNote ? [{ label: c.note, value: callout.reasonNote }] : []),
      // Phase 4 (U09): what the linked cover requests recorded. History only: it names nobody and is not today's staffing.
      { label: t.coverHistory, value: calloutCoverText(callout.coverage, t) }]} />
    {/* Jose (Nov 21, 2026): the explaining sentences are one grey paragraph under the facts. */}
    <p className="c-shreq__help"><span>{c.calloutHelp}</span><span>{t.coverHistoryHelp}</span></p>
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
function historyShift(text: string | null, year: string, c: ShiftRequestsCopy) {
  if (!text) return null;
  const match = /^(\d{4}-\d{2}-\d{2}) · (\d{2}:\d{2}) – (\d{2}:\d{2})(?: · .*?)?( · Shift lead)?$/.exec(text);
  return match ? `${shiftDay(match[1], year, c)} · ${c.hours(match[2], match[3])}${match[4] ? ` · ${c.shiftLead}` : ""}` : text;
}
function ManagerHistory({ events, timeZone, year, line, c }: { events: ShiftHistoryView[] | null; timeZone: string; year: string; /** The row's own line: a step's shift that it already says isn't repeated. */ line: string; c: ShiftRequestsCopy }) {
  if (events === null) return <p className="c-shreq__help" role="status">{c.history.unavailable}</p>;
  if (!events.length) return null;
  const at = (iso: string) => c.at(iso, timeZone);
  return <details className="c-shreq__history"><summary>{c.history.title}</summary><ol>{events.map((event, index) => {
    const step = c.step(event.event);
    const mode = event.mode ? c.modes[event.mode] : undefined;
    const shift = historyShift(event.source, year, c), other = historyShift(event.target, year, c);
    const before = index ? historyShift(events[index - 1].source, year, c) : null;
    const said = shift && (index ? shift === before : line.includes(shift));
    const shown = said && !other ? null : shift;
    return <li key={`${event.revision}-${index}`}><strong>{[mode ? `${step} ${mode}` : step, at(event.at)].join(" · ")}</strong>
      {shown ? <span>{other ? c.historyShift(shown) : shown}</span> : null}{other ? <span>{c.historyOther(other)}</span> : null}</li>;
  })}</ol></details>;
}

/** Final polish (confirmations A #1, #2): what approving or declining a swap or a cover request leaves, in words. */
function exchangeOutcome(exchange: ExchangeRecord, t: ShiftRequestsCopy["review"]): ShiftChangeOutcome {
  const icon = <ArrowsLeftRightIcon weight="bold" />, other = exchange.targetEmployeeName;
  if (exchange.kind === "SWAP") return { completed: { tone: "done", title: t.swapApproved, line: t.swapApprovedLine },
    closed: { tone: "closed", icon, title: t.swapDeclined, line: other ? t.bothKeep(exchange.requestedByName, other) : t.keepsShift(exchange.requestedByName) } };
  return { completed: { tone: "done", title: t.coverApproved, line: other ? t.hasShiftNow(other) : t.scheduleShowsIt },
    closed: { tone: "closed", icon, title: t.coverDeclined, line: t.keepsShift(exchange.requestedByName) } };
}

/** Jose (Nov 21, 2026): the question before a Decline (or Close request). Its consequence is the line the declined
 * result already says, with first names; nothing here says more than the screen holds. */
const first = (name: string) => name.split(/\s+/)[0] || name;
function exchangeAsk(exchange: ExchangeRecord, what: string, c: ShiftRequestsCopy): ShiftAsk {
  const t = c.review, swap = exchange.kind === "SWAP", other = exchange.targetEmployeeName;
  return { question: swap ? t.askDeclineSwap : t.askDeclineCover, consequence: swap && other ? t.bothKeep(first(exchange.requestedByName), first(other)) : t.keepsShift(first(exchange.requestedByName)),
    keep: t.keepRequest, go: t.decline, groupLabel: c.askWhat(what), keepLabel: c.keepWhat(what), goLabel: c.goWhat(what) };
}

function Decision({ id, revision, decline, approve, allowed, notice, noticeHref, what, outcome, ask, c }: { outcome?: ShiftChangeOutcome; id: string; revision?: number; decline: string; approve: string; allowed: boolean; notice?: string; noticeHref?: string | null; what: string; ask: ShiftAsk; c: ShiftRequestsCopy }) {
  if (!revision) return <p className="c-shreq__note">{c.requestChanged}</p>;
  return <ShiftChangeForm fields={{ requestId: id, expectedRevision: revision }} className="c-shreq__form" outcome={outcome}>
    {notice ? <p className="c-shreq__note">{notice}{noticeHref ? <> <Link href={noticeHref}>{c.publishChanges}</Link></> : null}</p> : null}
    <ShiftRequestDecide decline={decline} declineLabel={c.declineWhat(what)} approve={allowed ? approve : undefined} approveLabel={c.approveWhat(what)} ask={ask} />
  </ShiftChangeForm>;
}

/** Quiet (v4, approved Oct 23): Waiting, Open cover and Done. A waiting request is one row (who, what, when it was sent)
 * with Decline and Approve under it; open cover can be closed; Done rows open their history. */
export async function ManagerShiftRequests({ tab, error, requestId, timeZone, lang = "en" }: {
  timeZone: string; tab?: string; error?: string; approved?: string; reviewed?: string; calloutApproved?: string; calloutDenied?: string; requestId?: string;
  /** The person's language (signed-in Spanish); English when left out. */ lang?: ShiftRequestsLang;
}) {
  await requireRoles(MANAGER_ROLES);
  const c = shiftRequestsCopy(lang), t = c.review;
  const tabs = tabIds.map(id => ({ id, label: c.tabs[id] }));
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
  const approvals=new Map(decide?await Promise.all([...livePending.map(e=>({id:e.id,revision:e.requestRevision,kind:'MANAGER_APPROVE' as const})),...callouts.map(e=>({id:e.id,revision:e.requestRevision,kind:'APPROVE_CALLOUT' as const}))].map(async e=>[e.id,e.revision?await readShiftChangeAvailability(proof,{kind:e.kind,requestId:e.id,expectedRevision:e.revision,operationId:randomUUID()}).catch(()=>({allowed:false,notice:c.checkFailed})):{allowed:false,notice:c.requestChanged}] as const)):[]);
  const historyViews=new Map(await Promise.all([...exchanges,...history].map(async e=>[e.id,await readShiftChangeHistoryView(proof,e.id).catch(()=>null)] as const)));
    return {callouts,exchanges,history,livePending,liveCoverage,approvals,historyViews};
  });
  if(source.state==='unavailable')return <OperationalUnavailable title={c.unavailableTitle} reason={source.reason} lang={lang === "es" ? lang : undefined}/>;
  const {callouts,exchanges,history,livePending,liveCoverage,approvals,historyViews}=source.data;
  const now = source.observedAt;
  const waiting = livePending.length + callouts.length;
  // OW-003: a date carries its year only when it is not this one (the company's own calendar year).
  const year = businessDate(new Date(now), timeZone).slice(0, 4);
  const activity = [
    ...exchanges.map(exchange => ({ id: exchange.id, createdAt: exchange.createdAt, status: exchange.status, name: exchange.requestedByName, head: exchangeHead(exchange, year, c), note: null as string | null,
      // Phase 4 (U09): a finished cover request says its result; a swap has none to add.
      fact: exchange.kind === "SWAP" ? null : { label: t.outcome, value: coverResult(exchange, c), help: null as string | null } })),
    ...history.map(callout => ({ id: callout.id, createdAt: callout.createdAt, status: callout.status, name: callout.employeeName, head: calloutHead(callout, year, c),
      note: callout.status === "APPROVED" && !callout.releaseApplies ? c.earlierVersion : null,
      fact: { label: t.coverHistory, value: calloutCoverText(callout.coverage, t), help: t.coverHistoryHelp as string | null } })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);
  // Review B5 (NV-268): one relative-time format with "ago", as on Time off.
  const sent = (createdAt: string) => c.ago(agoLabel(createdAt, now));
  // OW-011: phones show a request's age only once it is over a day old.
  const aged = (createdAt: string) => Date.parse(now) - Date.parse(createdAt) >= 86_400_000;

  // Phase 2 (Schedule tools, C12, Nov 23, 2026): Direction B for real. The Corp page the B layer draws as the band (title
  // and the three views) and one white card of requests; each row is the kit's row with the same disclosure, decision
  // parts, forms and reads as before.
  return <ScopedReadFrame observation={source}><CorpPage className="c-shreq c-page--narrow" labelledBy="shreq-title" lang={lang === "es" ? lang : undefined}>
    <CorpNav back={{ href: "/app/inbox", label: c.back }} title={c.title} titleId="shreq-title" phoneOnly />
    <CorpTitle title={c.title} wide />
    {/* R12: the kit's segmented control; counts read "Waiting 2" (countLabel). */}
    <CorpSegments label={c.sections} items={tabs.map(item => ({ href: `/app/exchange?tab=${item.id}`, current: selected.id === item.id,
      label: item.id === "pending" && waiting ? c.waitingCount(waiting) : item.label }))} />
    {error ? <p className="c-st__msg c-st__msg--error form-error" role="alert">{c.errors[error] ?? c.errorFallback}</p> : null}

    {selected.id === "pending" ? (waiting ? <CorpCard ariaLabel={c.waitingCard}><ul className="c-shreq__list">
      {livePending.map(exchange => {
        const what = c.exchangeWhat(exchange.kind === "SWAP", exchange.requestedByName);
        return <li className="c-shreq__item" id={`request-${exchange.id}`} tabIndex={-1} key={exchange.id} data-selected={requestId === exchange.id ? "true" : undefined}>
          <RequestDetails name={exchange.requestedByName} head={exchangeHead(exchange, year, c)} sent={sent(exchange.createdAt)} aged={aged(exchange.createdAt)} open={requestId === exchange.id}
            hint={exchange.kind === "SWAP" ? c.showBoth : c.showShift}><ExchangeFacts exchange={exchange} year={year} c={c} /></RequestDetails>
          <Decision id={exchange.id} revision={exchange.requestRevision} decline="MANAGER_DECLINE" approve="MANAGER_APPROVE" allowed={!!approvals.get(exchange.id)?.allowed} notice={shiftAvailabilityNotice(approvals.get(exchange.id)?.notice, lang)} what={what} outcome={exchangeOutcome(exchange, t)} ask={exchangeAsk(exchange, what, c)} c={c} />
        </li>;
      })}
      {callouts.map(callout => {
        return <li className="c-shreq__item" id={`request-${callout.id}`} tabIndex={-1} key={callout.id} data-selected={requestId === callout.id ? "true" : undefined}>
          <RequestDetails name={callout.employeeName} head={calloutHead(callout, year, c)} sent={sent(callout.createdAt)} aged={aged(callout.createdAt)} open={requestId === callout.id}
            hint={c.showShift}><CalloutFacts callout={callout} reason={c.reasons[callout.reasonCode] ?? callout.reasonCode} year={year} c={c} /></RequestDetails>
          <Decision id={callout.id} revision={callout.requestRevision} decline="DECLINE_CALLOUT" approve="APPROVE_CALLOUT" allowed={!!approvals.get(callout.id)?.allowed} notice={shiftAvailabilityNotice(approvals.get(callout.id)?.notice, lang)} noticeHref={publishFirstHref(approvals.get(callout.id)?.notice, callout.weekStart)} what={c.calloutWhat(callout.employeeName)} c={c}
            ask={{ question: t.askDeclineCallout, consequence: t.staysOnShift(first(callout.employeeName)), keep: t.keepRequest, go: t.decline,
              groupLabel: c.calloutAsk(callout.employeeName), keepLabel: c.calloutKeep(callout.employeeName), goLabel: c.calloutGo(callout.employeeName) }}
            outcome={{ completed: { tone: "done", title: t.calloutApproved, line: t.calloutApprovedLine }, closed: { tone: "closed", icon: <UserMinusIcon weight="bold" />, title: t.calloutDeclined, line: t.keepsShift(callout.employeeName) } }} />
        </li>;
      })}
    </ul></CorpCard> : <CorpCard ariaLabel={c.waitingCard}><BState kind="empty" title={c.caughtUp} line={c.caughtUpLine} /></CorpCard>) : null}

    {selected.id === "coverage" ? (liveCoverage.length ? <CorpCard ariaLabel={c.coverageCard}><ul className="c-shreq__list">
      {liveCoverage.map(exchange => <li className="c-shreq__item" key={exchange.id}>
        {/* Each fact once (e67dc07e): every row on Open cover is a cover request nobody has picked up, so the tab says it and
            the rows carry only who asked and when (and a name, should someone have picked it up). */}
        <RequestDetails name={exchange.requestedByName} head={{ ...exchangeHead(exchange, year, c), kind: "", who: exchange.targetEmployeeName ? coverResult(exchange, c) : undefined }} sent={sent(exchange.createdAt)} aged={aged(exchange.createdAt)} open={false}
          hint={c.showShift}><ExchangeFacts exchange={exchange} year={year} c={c} /></RequestDetails>
        {exchange.requestRevision ? <ShiftChangeForm fields={{ kind: "MANAGER_CLOSE", requestId: exchange.id, expectedRevision: exchange.requestRevision }} className="c-shreq__form"
          outcome={{ closed: { tone: "closed", icon: <ArrowsLeftRightIcon weight="bold" />, title: t.requestClosed, line: t.keepsShift(exchange.requestedByName) } }}>
          <ShiftRequestDecide declineWords={t.closeRequest} pending={c.closing} declineLabel={c.closeLabel(exchange.requestedByName)}
            ask={{ question: t.askCloseCover, consequence: t.keepsShift(first(exchange.requestedByName)), keep: t.keepRequest, go: t.closeRequest,
              groupLabel: c.closeAsk(exchange.requestedByName), keepLabel: c.closeKeep(exchange.requestedByName), goLabel: c.closeGo(exchange.requestedByName) }} />
        </ShiftChangeForm> : null}
      </li>)}
    </ul></CorpCard> : <CorpCard ariaLabel={c.coverageCard}><BState kind="empty" title={c.noCover} line={c.noCoverLine} /></CorpCard>) : null}

    {selected.id === "activity" ? (activity.length ? <CorpCard ariaLabel={c.doneCard}><ul className="c-shreq__list c-shreq__list--done">
      {activity.map(item => <li className="c-shreq__item" key={item.id}>
        <RequestDetails name={item.name} head={item.head} sent={sent(item.createdAt)} aged={false} open={false} hint={c.showHistory} end={c.status(item.status)}>
          {item.note ? <p className="c-shreq__help">{item.note}</p> : null}
          {item.fact ? <><Facts rows={[{ label: item.fact.label, value: item.fact.value }]} />{item.fact.help ? <p className="c-shreq__help">{item.fact.help}</p> : null}</> : null}<ManagerHistory events={historyViews.get(item.id)??null} timeZone={timeZone} year={year} line={[...item.head.when, item.head.who].filter(Boolean).join(" · ")} c={c} />
        </RequestDetails>
      </li>)}
    </ul></CorpCard> : <CorpCard ariaLabel={c.doneCard}><BState kind="empty" title={c.nothingDecided} line={c.nothingDecidedLine} /></CorpCard>) : null}
  </CorpPage></ScopedReadFrame>;
}
