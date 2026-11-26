import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import type { PortalLang } from "@/lib/i18n/portal-lang";
import { managerTimeOffCopy, timeOffText } from "@/components/manager-time-off-copy";
import { dateText, instantDateText, timeText } from "@/components/employee-mobile/mobile-format";
import { readPortalLanguage } from "@/lib/activation/language.server";
import { listEmployees } from "@/lib/data/employees";
import { ownerNames } from "@/components/owner-only-notice";
import { permissionCopy } from "@/components/workforce/permission-copy";
import { CancelApproval } from "@/components/time-off-admin/cancel-approval";
import { ptoCopy } from "@/components/time-off-admin/copy";
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSessionMutationProof} from '@/lib/auth/session';
import { TimeOffReviewActions } from "@/components/time-off-review-actions";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listWorkforceLeave, type TimeOffListItem } from "@/lib/data/requests";
import { TimeOffDecisionForm } from "@/components/time-off-decision-form";
import { formatTimeRange, weekStartFor } from "@/lib/date-utils";
import { CorpPill } from "@/components/corp/corp";
import { agoLabel, dayLabel, initialsOf, QuietHeader, QuietList, QuietNav, QuietPage, QuietRow } from "@/components/quiet/quiet";
import { CorpAvatar, CorpCard, CorpNav, CorpNote, CorpPage, CorpRow, CorpRows, CorpSegments, CorpTitle } from "@/components/corp/corp";
import "./manager-time-off.css";
import { inboxFilter } from "@/lib/action-center/inbox";
import { LeaveConflictCheck } from "@/components/leave-staffing/conflict-check";
import { getWorkspace } from "@/lib/data/workspaces";
import { TimeOffWaitingList } from "@/components/time-off-waiting-list";
import { RequestFace } from "@/components/request-face";
import { WholeParts } from "@/components/time-off-waiting-list";
import { BButtonLink, BChip, BState } from "@/components/owner-b/b-kit";
import { DecisionResult } from "@/components/owner-b/decision-parts";
import { KeptResultRow } from "@/components/owner-b/kept-result";
import { CalendarMinusIcon } from "@phosphor-icons/react/dist/ssr/CalendarMinus";

const tabs = [
  { id: "pending", status: "PENDING" },
  { id: "approved", status: "APPROVED" },
  { id: "declined", status: "DENIED" },
] as const;





type PendingRequest = TimeOffListItem;

/** F6: one request on its own page. Back names where the manager came from;
 * the decision returns there (D-5). Dates, length and the note come first (O1). */
type Origin = { from: "home" | "inbox"; filter: string; item?: string };
/** IS-P4-11: Back to Inbox keeps the Inbox's selected item (`?item=TIME_OFF:<id>`), as the browser's Back does. */
const inboxItem = (item?: string) => item && /^[A-Z_]{1,40}:[A-Za-z0-9_.-]{1,120}$/.test(item) ? item : undefined;
const backTo = ({ from, filter, item }: Origin, lang: PortalLang) => {
  const t = managerTimeOffCopy[lang];
  if (from === "home") return { href: "/app", label: t.home };
  const query = new URLSearchParams();
  if (filter !== "all") query.set("filter", filter);
  if (item) query.set("item", item);
  const search = query.toString();
  return { href: search ? `/app/inbox?${search}` : "/app/inbox", label: t.inbox };
};

function requestDay(date: string, lang: PortalLang) {
  return lang === "en" ? dayLabel(date) : dateText(date, lang, { weekday: "short", month: "short", day: "numeric" }).replace(",", "");
}

function whenLabel(request: PendingRequest, lang: PortalLang) {
  const { title, length } = requestDates(request, lang);
  return `${request.startTime && request.endTime ? requestDay(request.startDate, lang) : title} · ${length}`;
}

type DecidedRequest = TimeOffListItem;

/** The dates and the length stay separate facts in the focused review. */
function requestDates(request: PendingRequest, lang: PortalLang) {
  const t = managerTimeOffCopy[lang];
  const days = Math.round((Date.parse(`${request.endDate}T12:00:00Z`) - Date.parse(`${request.startDate}T12:00:00Z`)) / 86_400_000) + 1;
  const start = requestDay(request.startDate, lang);
  const title = request.startDate === request.endDate ? start : `${start} – ${requestDay(request.endDate, lang)}`;
  const length = request.startTime && request.endTime ? timeText(formatTimeRange(request.startTime, request.endTime), lang) : days === 1 ? t.allDay : timeOffText(t.daysOther, { count: days });
  return { title, length };
}

function requestAge(at: string, now: string, lang: PortalLang) {
  if (lang === "en") return agoLabel(at, now);
  const t = managerTimeOffCopy[lang];
  const duration = agoLabel(at, now, true);
  return duration === managerTimeOffCopy.en.justNow ? t.justNow : timeOffText(t.ago, { duration });
}

/** When a request was sent in the company’s time zone. */
function sentLabel(createdAt: string | undefined, timeZone: string, lang: PortalLang) {
  if (!createdAt) return null;
  try {
    const t = managerTimeOffCopy[lang];
    const day = instantDateText(createdAt, lang, { timeZone, weekday: "short", month: "short", day: "numeric" });
    const time = timeText(instantDateText(createdAt, lang, { timeZone, hour: "numeric", minute: "2-digit" }), lang);
    const template = lang === "es" && time.startsWith("1:") ? t.sent.replace("a las", "a la") : t.sent;
    return timeOffText(template, { day, time });
  } catch { return null; }
}

/** F6 / Release 1 (board O-RequestDetail): one request on its own page. Who asked (Waiting), the dates and their note, that
 * week's schedule, who else is off then, and Decline / Approve. Back names where the manager came from; the decision
 * returns there (D-5). */
/* SCRUM-215 (contract: Team Time Off): an approval larger than the person's balance leaves the request waiting. A refused
 * or stale decision names both causes: the request changed, or it reaches a location outside this Manager's grant. */
function FocusedReview({ request, origin, error, others, timeZone, lang }: { request: PendingRequest; origin: Origin; error?: string; others: DecidedRequest[] | null; timeZone: string; lang: PortalLang }) {
  const t = managerTimeOffCopy[lang];
  const week = weekStartFor(request.startDate);
  const dates = requestDates(request, lang);
  const first = request.employeeName.split(/\s+/)[0] || request.employeeName;
  const sent = sentLabel((request as { createdAt?: string }).createdAt, timeZone, lang);
  const offNames = others ? [...new Set(others.filter(other => other.employeeId !== request.employeeId && other.startDate <= request.endDate && other.endDate >= request.startDate).map(other => other.employeeName))] : null;
  // Copy table 15: "Also off that day · No one".
  const offLabel = request.startDate === request.endDate ? t.offDay : t.offDays;
  return <CorpPage className="c-request c-page--narrow" labelledBy="request-title">
    <CorpNav back={backTo(origin, lang)} title={t.request} titleId="request-nav-title" phoneOnly />
    {/* Closing F1 (NV-268): the card below names the person, so the band doesn't repeat it. */}
    <CorpTitle id="request-title" title={t.request} wide />
    {error ? <p className="c-error" role="alert">{error === "pto-balance" ? t.ptoBalance : t.changed}</p> : null}
    {/* Review B6 (NV-093): one request card: who and its amber Waiting status, the dates, their note and when it was sent,
      * then that week's schedule and who else is off as rows of the same card. */}
    <CorpCard ariaLabel={timeOffText(t.card, { name: request.employeeName })}>
      <div className="c-request__who">
        <CorpAvatar name={request.employeeName} initials={initialsOf(request.employeeName)} large />
        <span className="c-row__main"><span className="c-row__title c-row__title--b">{request.employeeName}</span></span>
        <span className="c-request__state"><CorpPill tone="amber">{t.waiting}</CorpPill></span>
      </div>
      <div className="c-request__body">
        <span className="c-big">{dates.title}</span>
        <span className="c-line2">{dates.length}</span>
        {request.reason ? <p className="c-request__note">{`“${request.reason}”`}</p> : <p className="c-line3">{t.noNote}</p>}
        {sent ? <span className="c-line3">{sent}</span> : null}
      </div>
      <CorpRows label={t.week}>
        <li><CorpRow href={`/app/schedule?week=${encodeURIComponent(week)}`} bold title={t.seeSchedule} chevron /></li>
        {offNames ? <li><CorpRow title={offLabel} value={offNames.length ? offNames.join(", ") : t.none} valueTone="soft" /></li> : null}
      </CorpRows>
    </CorpCard>
    {/* Nov 9, 2026: the published shifts this time off overlaps, and what approving does to them, before Approve. */}
    <LeaveConflictCheck request={{ id: request.id, startDate: request.startDate, endDate: request.endDate }} employeeName={request.employeeName} />
    {/* Review B6 (NV-093): the decision is one footer: who hears about it, then Decline and Approve, on the right. */}
    <div className="c-request__foot">
      <CorpNote>{timeOffText(t.notified, { name: first })}</CorpNote>
      {/* Audit NV-AUDIT-05 (Nov 19, 2026): a lost answer reads "not confirmed yet" here, with a check that reads this page again. */}
      <TimeOffDecisionForm className="c-request__decide" label={timeOffText(t.review, { name: request.employeeName })}>
        <input type="hidden" name="requestId" value={request.id} />
        <input type="hidden" name="returnTo" value={origin.from} />
        <input type="hidden" name="returnFilter" value={origin.filter} />
        <TimeOffReviewActions name={request.employeeName} corp />
      </TimeOffDecisionForm>
    </div>
  </CorpPage>;
}

/** Codex C1: who decided and when, once the read includes it: "Approved by Dana Kim · Oct 2". */
function decisionLine(status: "APPROVED" | "DENIED", request: object, timeZone: string, lang: PortalLang) {
  const { reviewerName, reviewedAt } = request as { reviewerName?: string; reviewedAt?: string };
  if (!reviewerName && !reviewedAt) return null;
  let on = "";
  try { on = reviewedAt ? instantDateText(reviewedAt, lang, { timeZone, month: "short", day: "numeric" }) : ""; } catch { on = ""; }
  const t = managerTimeOffCopy[lang];
  const state = status === "APPROVED" ? t.approvedOne : t.declinedOne;
  return `${state}${reviewerName ? timeOffText(t.by, { name: reviewerName }) : ""}${on ? ` · ${on}` : ""}`;
}

/** IS-10: a link to a request that is no longer waiting says so, instead of opening the list. Audit NV-AUDIT-05 (Nov 19,
 * 2026): when the Approved or Declined list holds it, the page says which, by whom and when, so a Manager checking a
 * decision whose answer was lost sees the result that was saved. */
function DecidedReview({ origin, decided, timeZone, lang }: { origin: Origin; decided: { status: "APPROVED" | "DENIED"; request: DecidedRequest } | null; timeZone: string; lang: PortalLang }) {
  const t = managerTimeOffCopy[lang];
  const approved = decided?.status === "APPROVED", line = decided ? decisionLine(decided.status, decided.request, timeZone, lang) : null;
  return <QuietPage>
    <QuietNav back={backTo(origin, lang)} />
    <QuietHeader title={decided ? approved ? t.alreadyApproved : t.alreadyDeclined : t.alreadyDecided} sub={t.noLongerWaiting} />
    {/* Final polish (confirmations A #16): facts lines that wrap whole (BSegs, BWhen), the state as a chip on the name's
      * line, and one tinted way back in the same card (two equal link rows stood under it). */}
    <QuietList label={t.thisRequest} style={{ marginTop: 16 }}>
      {decided ? <QuietRow avatar={<RequestFace name={decided.request.employeeName} initials={initialsOf(decided.request.employeeName)} />}
        title={<span className="q-decided__name">{decided.request.employeeName}<BChip tone={approved ? "green" : "grey"}>{approved ? t.approvedOne : t.declinedOne}</BChip></span>}
        detail={<><WholeParts text={whenLabel(decided.request, lang)} />{line ? <span className="q-rt__line"><WholeParts text={line} /></span> : null}</>} /> : null}
      <li className="q-decided__back"><BButtonLink href={backTo(origin, lang).href} kind="ghost">{timeOffText(t.backTo, { page: backTo(origin, lang).label })}</BButtonLink></li>
    </QuietList>
  </QuietPage>;
}

export async function ManagerTimeOff({ tab, error, reviewed, requestId, from, filter, item, cancelled, decided }: {
  tab?: string; error?: string; reviewed?: string; requestId?: string; from?: string; filter?: string; item?: string; cancelled?: string;
  /** The review action's own redirect flag ("timeoff-approved" or "timeoff-declined"): which decision `reviewed` was. */
  decided?: string;
}) {
  await requireRoles(MANAGER_ROLES);
  const selected = tabs.find(item => item.id === tab) ?? tabs[0];
  const proof = await requireSessionMutationProof();
  let lang: PortalLang = "en";
  try { lang = (await readPortalLanguage(proof)).language; } catch { /* English */ }
  const t = managerTimeOffCopy[lang];
  const source=await listWorkforceLeave(proof, selected.status);
  if(source.state==='unavailable'){
    // SCRUM-215: a Manager refused here lacks the Approve time off grant at every location they manage; say so and who decides.
    let closed:{title:string;line:string;lang:'en'|'es'}|undefined;
    if(source.reason==='access_denied'&&proof.employee.role==='MANAGER'){
      const owners=await listEmployees().then(list=>ownerNames(list.filter(e=>e.role==='OWNER'&&e.active!==false).map(e=>`${e.firstName} ${e.lastName}`.trim()))).catch(()=>null);
      const words=permissionCopy(lang);closed={title:words.leaveDeniedTitle,line:words.leaveDenied(owners??(lang==='es'?'Un dueño':'An Owner')),lang};
    }
    // Queue review (Nov 23, 2026): the closed card's way back is Home for every Manager (a company-wide Manager has no
    // "your schedule" of places); a read that failed keeps the location Manager's schedule step.
    return <OperationalUnavailable title={t.unavailable} lang={lang} reason={source.reason} scoped={!closed} closed={closed}/>;
  }
  const requests=source.data;

  const focused = selected.status === "PENDING" && requestId ? requests.find(request => request.id === requestId) : undefined;
  const origin: Origin = { from: from === "home" ? "home" : "inbox", filter: inboxFilter(filter ?? "requests"), item: inboxItem(item) };
  if (focused) {
    // Who else is off then: the approved time off this page already reads for its Approved tab, under the same access.
    const approved = await listWorkforceLeave(proof, "APPROVED").catch(() => null);
    const zone = await getWorkspace().then(workspace => workspace.timeZone).catch(() => "UTC");
    return <ScopedReadFrame observation={source}><FocusedReview request={focused as PendingRequest} origin={origin} error={error}
      others={approved?.state === "ready" ? approved.data : null} timeZone={zone} lang={lang} /></ScopedReadFrame>;
  }
  if (selected.status === "PENDING" && requestId && !error) {
    // Audit NV-AUDIT-05: find the decision in the Approved and Declined lists, under the same access.
    const [approvedRead, declinedRead, zone] = await Promise.all([
      listWorkforceLeave(proof, "APPROVED").catch(() => null),
      listWorkforceLeave(proof, "DENIED").catch(() => null),
      getWorkspace().then(workspace => workspace.timeZone).catch(() => "UTC")]);
    const find = (read: typeof approvedRead) => read?.state === "ready" ? read.data.find(request => request.id === requestId) : undefined;
    const approvedOne = find(approvedRead), declinedOne = approvedOne ? undefined : find(declinedRead);
    const decided = approvedOne ? { status: "APPROVED" as const, request: approvedOne } : declinedOne ? { status: "DENIED" as const, request: declinedOne } : null;
    return <ScopedReadFrame observation={source}><DecidedReview origin={origin} decided={decided} timeZone={zone} lang={lang} /></ScopedReadFrame>;
  }

  // Quiet (v4, approved Oct 23): the segments carry the waiting count on every tab.
  const waiting = selected.status === "PENDING" ? requests.length
    : await listWorkforceLeave(proof, "PENDING").then(read => read.state === "ready" ? read.data.length : 0).catch(() => 0);
  const zone = selected.status === "PENDING" ? "UTC" : await getWorkspace().then(workspace => workspace.timeZone).catch(() => "UTC");
  const decidedLine = (request: object) => selected.status === "PENDING" ? null : decisionLine(selected.status, request, zone, lang);
  const limited = source.coverage?.kind === "LOCATIONS";

  // Final polish (confirmations A #8): what the last decision left, named. Approved is the done state; a declined or
  // cancelled request is closed, so it is the grey state with the time off glyph (Truth: never the green mark). The
  // flags are the review action's own redirect; nothing new is read.
  const words = ptoCopy(lang), closedIcon = <CalendarMinusIcon weight="bold" />;
  const nothingWaiting = limited ? words.noReviewableRequests : words.nothingWaiting;
  const next = (line: string) => requests.length ? line : nothingWaiting;
  const result = selected.id === "pending" && reviewed
    ? decided === "timeoff-approved" ? <DecisionResult tone="done" title={words.approvedTitle} line={next(words.approvedLine)} />
      : decided === "timeoff-declined" ? <DecisionResult tone="closed" icon={closedIcon} title={words.declinedTitle} line={next(words.declinedLine)} />
      : <DecisionResult tone="closed" icon={closedIcon} title={words.savedTitle} line={requests.length ? undefined : nothingWaiting} />
    : selected.id === "approved" && cancelled ? <DecisionResult tone="closed" icon={closedIcon} title={words.cancelledTitle} line={words.cancelledLine} /> : null;

  return (<ScopedReadFrame observation={source}>
    <QuietPage className="q-timeoff">
      <QuietNav back={backTo(origin, lang)} />
      <QuietHeader title={t.title} />
      {/* R12: the kit's segmented control (its thumb slides once the round-2 kit lands). */}
      <CorpSegments label={t.sections} items={tabs.map(item => ({ href: `/app/requests?tab=${item.id}`, current: selected.id === item.id,
        label: item.id === "pending" ? waiting ? timeOffText(t.count, { count: waiting }) : t.waiting : t[item.id] }))} />
      {error ? <p className="q-error q-first" role="alert">{error === "pto-balance" ? t.ptoBalance : t.refused}</p> : null}
      {/* Closing F1 (NV-077): each waiting row carries the staffing check and the compact Decline / Approve, as on Things to
        do (this replaces Release 1's "no decision in the list"; the row still opens the request with its shifts).
        Final polish (confirmations A #8, #9, #25): a decision's result is the first row of the list's card (it was a grey
        line on the canvas that pushed the card off the band), and an empty tab is the kit's state card. */}
      {selected.id === "pending" ? <TimeOffWaitingList result={result}
        empty={limited ? { title: words.noReviewableRequests, line: words.scopedReviewDetail } : undefined} requests={requests.map(request => {
        const sent = (request as { createdAt?: string }).createdAt;
        return { id: request.id, employeeName: request.employeeName, avatar: initialsOf(request.employeeName), startDate: request.startDate, endDate: request.endDate,
          when: whenLabel(request, lang), ago: sent ? requestAge(sent, source.observedAt, lang) : undefined,
          aged: sent ? Date.parse(source.observedAt) - Date.parse(sent) >= 86_400_000 : undefined, href: `/app/requests?tab=pending&requestId=${encodeURIComponent(request.id)}` };
      })} />
      : requests.length || result ? <QuietList label={selected.id === "approved" ? t.approvedList : t.declinedList} style={{ marginTop: 16 }}><KeptResultRow result={result} lang={lang} />{requests.map(request => {
          // Final polish (confirmations A #17): the tab already says Approved or Declined, so no chip repeats it on every
          // row; the lines wrap whole (BSegs, BWhen).
          const row = <QuietRow key={request.id} bare={selected.id === "approved"} avatar={<RequestFace name={request.employeeName} initials={initialsOf(request.employeeName)} />} title={request.employeeName}
            detail={<><WholeParts text={whenLabel(request, lang)} />{decidedLine(request) ? <span className="q-rt__line"><WholeParts text={decidedLine(request)!} /></span> : null}</>} />;
          // PTO screens: an approval can be cancelled; the server gives the paid time back and decides who may do it.
          return selected.id === "approved" ? <li key={request.id} className="pto-approved">{row}<CancelApproval requestId={request.id} name={request.employeeName} when={whenLabel(request, lang)} lang={lang} /></li> : row;
        })}</QuietList>
      : <div className="q-list q-emptycard"><BState kind="empty" title={selected.id === "approved" ? t.noApproved : t.noDeclined} line={selected.id === "approved" ? t.approvedEmpty : t.declinedEmpty} /></div>}
    </QuietPage>
  </ScopedReadFrame>);
}
