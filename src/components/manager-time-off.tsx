import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSessionMutationProof} from '@/lib/auth/session';
import { TimeOffReviewActions } from "@/components/time-off-review-actions";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listPendingTimeOffRequests, listTeamTimeOffRequests } from "@/lib/data/requests";
import { reviewTimeOffAction } from "@/app/app/requests/actions";
import { formatTime, weekStartFor } from "@/lib/date-utils";
import { ActionForm } from "@/components/wave-a/action-form";
import { CorpPill } from "@/components/corp/corp";
import { agoLabel, dayLabel, initialsOf, QuietHeader, QuietList, QuietNav, QuietPage, QuietRow } from "@/components/quiet/quiet";
import { ManagerIssueFocus } from './manager-issue-focus';
import { CorpAvatar, CorpCard, CorpNav, CorpNote, CorpPage, CorpRow, CorpRows, CorpSegments, CorpTitle } from "@/components/corp/corp";
import "./manager-time-off.css";
import { inboxFilter } from "@/lib/action-center/inbox";
import { LeaveConflictCheck } from "@/components/leave-staffing/conflict-check";
import { getWorkspace } from "@/lib/data/workspaces";

const tabs = [
  { id: "pending", label: "Waiting", status: "PENDING" },
  { id: "approved", label: "Approved", status: "APPROVED" },
  { id: "declined", label: "Declined", status: "DENIED" },
] as const;

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function shortDate(date: string, weekday = true) {
  // Each date stays whole on one line; a range breaks only after its dash.
  return new Intl.DateTimeFormat("en-US", { ...(weekday ? { weekday: "short" as const } : {}), month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)).replace(/ /g, "\u00a0");
}

type PendingRequest = Awaited<ReturnType<typeof listPendingTimeOffRequests>>[number];

/** F6: one request on its own page. Back names where the manager came from;
 * the decision returns there (D-5). Dates, length and the note come first (O1). */
type Origin = { from: "home" | "inbox"; filter: string; item?: string };
/** IS-P4-11: Back to Inbox keeps the Inbox's selected item (`?item=TIME_OFF:<id>`), as the browser's Back does. */
const inboxItem = (item?: string) => item && /^[A-Z_]{1,40}:[A-Za-z0-9_.-]{1,120}$/.test(item) ? item : undefined;
const backTo = ({ from, filter, item }: Origin) => {
  if (from === "home") return { href: "/app", label: "Home" };
  const query = new URLSearchParams();
  if (filter !== "all") query.set("filter", filter);
  if (item) query.set("item", item);
  const search = query.toString();
  return { href: search ? `/app/inbox?${search}` : "/app/inbox", label: "Things to do" };
};

/** Quiet (v4): "Thu, Oct 29 – Fri, Oct 30 · 2 days", "Thu, Oct 29 · 9:00 AM – 1:00 PM" or "Thu, Oct 29 · All day". */
function whenLabel(request: { startDate: string; endDate: string; startTime?: string | null; endTime?: string | null }) {
  const days = Math.round((Date.parse(`${request.endDate}T12:00:00Z`) - Date.parse(`${request.startDate}T12:00:00Z`)) / 86_400_000) + 1;
  if (request.startTime && request.endTime) return `${dayLabel(request.startDate)} · ${formatTime(request.startTime)} – ${formatTime(request.endTime)}`;
  return days === 1 ? `${dayLabel(request.startDate)} · All day` : `${dayLabel(request.startDate)} – ${dayLabel(request.endDate)} · ${days} days`;
}


type DecidedRequest = Awaited<ReturnType<typeof listTeamTimeOffRequests>>[number];

/** "Thu, Nov 12" or "Thu, Nov 12 – Fri, Nov 13", and "All day", "9:00 AM – 1:00 PM" or "2 days" under it. */
function requestDates(request: { startDate: string; endDate: string; startTime?: string | null; endTime?: string | null }) {
  const days = Math.round((Date.parse(`${request.endDate}T12:00:00Z`) - Date.parse(`${request.startDate}T12:00:00Z`)) / 86_400_000) + 1;
  const title = request.startDate === request.endDate ? dayLabel(request.startDate) : `${dayLabel(request.startDate)} – ${dayLabel(request.endDate)}`;
  const length = request.startTime && request.endTime ? `${formatTime(request.startTime)} – ${formatTime(request.endTime)}` : days === 1 ? "All day" : `${days} days`;
  return { title, length };
}

/** "Sent Mon, Oct 26 at 7:40 PM", in the company's time zone. */
function sentLabel(createdAt: string | undefined, timeZone: string) {
  if (!createdAt) return null;
  try {
    const at = new Date(createdAt);
    const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(at);
    const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(at);
    return `Sent ${day} at ${time}`;
  } catch { return null; }
}

/** F6 / Release 1 (board O-RequestDetail): one request on its own page. Who asked (Waiting), the dates and their note, that
 * week's schedule, who else is off then, and Decline / Approve. Back names where the manager came from; the decision
 * returns there (D-5). */
function FocusedReview({ request, origin, error, others, timeZone }: { request: PendingRequest; origin: Origin; error?: string; others: DecidedRequest[] | null; timeZone: string }) {
  const week = weekStartFor(request.startDate);
  const dates = requestDates(request);
  const first = request.employeeName.split(/\s+/)[0] || request.employeeName;
  const sent = sentLabel((request as { createdAt?: string }).createdAt, timeZone);
  const offNames = others ? [...new Set(others.filter(other => other.employeeId !== request.employeeId && other.startDate <= request.endDate && other.endDate >= request.startDate).map(other => other.employeeName))] : null;
  // Copy table 15: "Also off that day · No one".
  const offLabel = request.startDate === request.endDate ? "Also off that day" : "Also off those days";
  return <CorpPage className="c-request c-page--narrow" labelledBy="request-title">
    <CorpNav back={backTo(origin)} title="Time-off request" titleId="request-nav-title" phoneOnly />
    <CorpTitle id="request-title" title="Time-off request" sub={request.employeeName} wide />
    {error ? <p className="c-error" role="alert">The request may have changed. Check it and decide again.</p> : null}
    {/* Review B6 (NV-093): one request card: who and its amber Waiting status, the dates, their note and when it was sent,
      * then that week's schedule and who else is off as rows of the same card. */}
    <CorpCard ariaLabel={`Time off for ${request.employeeName}`}>
      <div className="c-request__who">
        <CorpAvatar name={request.employeeName} initials={initialsOf(request.employeeName)} large />
        <span className="c-row__main"><span className="c-row__title c-row__title--b">{request.employeeName}</span></span>
        <span className="c-request__status">Waiting</span>
      </div>
      <div className="c-request__body">
        <span className="c-big">{dates.title}</span>
        <span className="c-line2">{dates.length}</span>
        {request.reason ? <p className="c-request__note">{`“${request.reason}”`}</p> : <p className="c-line3">No note</p>}
        {sent ? <span className="c-line3">{sent}</span> : null}
      </div>
      <CorpRows label="That week">
        <li><CorpRow href={`/app/schedule?week=${encodeURIComponent(week)}`} bold title="See that week’s schedule" chevron /></li>
        {offNames ? <li><CorpRow title={offLabel} value={offNames.length ? offNames.join(", ") : "No one"} valueTone="soft" /></li> : null}
      </CorpRows>
    </CorpCard>
    {/* Nov 9, 2026: the published shifts this time off overlaps, and what approving does to them, before Approve. */}
    <LeaveConflictCheck request={{ id: request.id, startDate: request.startDate, endDate: request.endDate }} employeeName={request.employeeName} />
    {/* Review B6 (NV-093): the decision is one footer: who hears about it, then Decline and Approve, on the right. */}
    <div className="c-request__foot">
      <CorpNote>{`${first} gets a notification either way.`}</CorpNote>
      <form action={reviewTimeOffAction} className="c-request__decide" aria-label={`Review time off for ${request.employeeName}`}>
        <input type="hidden" name="requestId" value={request.id} />
        <input type="hidden" name="returnTo" value={origin.from} />
        <input type="hidden" name="returnFilter" value={origin.filter} />
        <TimeOffReviewActions name={request.employeeName} corp />
      </form>
    </div>
  </CorpPage>;
}

/** IS-10: a link to a request that is no longer waiting says so, instead of opening the list. */
function DecidedReview({ origin }: { origin: Origin }) {
  return <QuietPage>
    <QuietNav back={backTo(origin)} />
    <QuietHeader title="Already decided" sub="This request isn’t waiting anymore." />
    <QuietList style={{ marginTop: 16 }}>
      <QuietRow title="Approved time off" href="/app/requests?tab=approved" />
      <QuietRow title="Declined time off" href="/app/requests?tab=declined" />
    </QuietList>
  </QuietPage>;
}

export async function ManagerTimeOff({ tab, error, reviewed, requestId, from, filter, item }: {
  tab?: string; error?: string; reviewed?: string; requestId?: string; from?: string; filter?: string; item?: string;
}) {
  await requireRoles(MANAGER_ROLES);
  const selected = tabs.find(item => item.id === tab) ?? tabs[0];
  const proof = await requireSessionMutationProof();
  const source=await withOperationalCompany(proof,()=>selected.status==='PENDING'?listPendingTimeOffRequests():listTeamTimeOffRequests(selected.status));
  if(source.state==='unavailable')return <OperationalUnavailable title="Team time off unavailable" reason={source.reason}/>;
  const requests=source.data;

  const focused = selected.status === "PENDING" && requestId ? requests.find(request => request.id === requestId) : undefined;
  const origin: Origin = { from: from === "home" ? "home" : "inbox", filter: inboxFilter(filter ?? "requests"), item: inboxItem(item) };
  if (focused) {
    // Who else is off then: the approved time off this page already reads for its Approved tab, under the same access.
    const approved = await withOperationalCompany(proof, () => listTeamTimeOffRequests("APPROVED")).catch(() => null);
    const zone = await getWorkspace().then(workspace => workspace.timeZone).catch(() => "UTC");
    return <ScopedReadFrame observation={source}><FocusedReview request={focused as PendingRequest} origin={origin} error={error}
      others={approved?.state === "ready" ? approved.data : null} timeZone={zone} /></ScopedReadFrame>;
  }
  if (selected.status === "PENDING" && requestId && !error) return <ScopedReadFrame observation={source}><DecidedReview origin={origin} /></ScopedReadFrame>;

  // Quiet (v4, approved Oct 23): the segments carry the waiting count on every tab.
  const waiting = selected.status === "PENDING" ? requests.length
    : await withOperationalCompany(proof, () => listPendingTimeOffRequests()).then(read => read.state === "ready" ? read.data.length : 0).catch(() => 0);
  const zone = selected.status === "PENDING" ? "UTC" : await getWorkspace().then(workspace => workspace.timeZone).catch(() => "UTC");
  // Codex C1: who decided and when, once the read includes it: "Approved by Dana Kim · Oct 2".
  const decidedLine = (request: object) => {
    const { reviewerName, reviewedAt } = request as { reviewerName?: string; reviewedAt?: string };
    if (!reviewerName && !reviewedAt) return null;
    let on = "";
    try { on = reviewedAt ? new Intl.DateTimeFormat("en-US", { timeZone: zone, month: "short", day: "numeric" }).format(new Date(reviewedAt)) : ""; } catch { on = ""; }
    return `${selected.id === "approved" ? "Approved" : "Declined"}${reviewerName ? ` by ${reviewerName}` : ""}${on ? ` · ${on}` : ""}`;
  };

  return (<ScopedReadFrame observation={source}>
    <QuietPage className="q-timeoff">
      <QuietNav back={backTo(origin)} />
      <QuietHeader title="Time off requests" />
      {/* R12: the kit's segmented control (its thumb slides once the round-2 kit lands). */}
      <CorpSegments label="Time off sections" items={tabs.map(item => ({ href: `/app/requests?tab=${item.id}`, current: selected.id === item.id,
        label: item.id === "pending" && waiting ? `Waiting (${waiting})` : item.label }))} />
      {error ? <p className="q-error q-first" role="alert">That decision wasn’t saved. The request may have changed; check it and decide again.</p> : null}
      {reviewed ? <p className="q-help q-first" role="status">Decision saved.</p> : null}
      {selected.id === "pending" ? (requests.length ? <ul className="q-list q-requests" aria-label="Waiting time off">{requests.map(request => {
        const sent = (request as { createdAt?: string }).createdAt;
        return <li key={request.id} id={`request-${request.id}`} tabIndex={-1} className="q-request">
          {/* Release 1 (Jose's rule): no Approve or Decline in the list; the row opens the request, where the decision is made. */}
          <QuietRow bare avatar={initialsOf(request.employeeName)} title={request.employeeName} detail={whenLabel(request)}
            value={sent ? agoLabel(sent, source.observedAt) : undefined} href={`/app/requests?tab=pending&requestId=${encodeURIComponent(request.id)}`} />
        </li>;
      })}</ul> : <p className="q-empty q-first">You’re all caught up.</p>)
      : requests.length ? <QuietList label={`${selected.label} time off`} style={{ marginTop: 16 }}>{requests.map(request => (
          <QuietRow key={request.id} avatar={initialsOf(request.employeeName)} title={request.employeeName}
            detail={decidedLine(request) ? <>{whenLabel(request)}<span className="q-rt__line">{decidedLine(request)}</span></> : whenLabel(request)}
            // Review B5 (NV-268): a decided request carries its state as a chip (green approved, grey declined).
            value={<CorpPill tone={selected.id === "approved" ? "green" : "neutral"}>{selected.id === "approved" ? "Approved" : "Declined"}</CorpPill>} />
        ))}</QuietList>
      : <p className="q-empty q-first">{`No ${selected.label.toLowerCase()} time off yet.`}</p>}
    </QuietPage>
  </ScopedReadFrame>);
}
