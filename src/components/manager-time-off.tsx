import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSessionMutationProof} from '@/lib/auth/session';
import { TimeOffReviewActions } from "@/components/time-off-review-actions";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listScopedTimeOffRequests, type TimeOffListItem } from "@/lib/data/requests";
import { reviewTimeOffAction } from "@/app/app/requests/actions";
import { formatTime, weekStartFor } from "@/lib/date-utils";
import { ActionForm } from "@/components/wave-a/action-form";
import { agoLabel, dayLabel, initialsOf, QuietHeader, QuietList, QuietNav, QuietPage, QuietRow, QuietSegments } from "@/components/quiet/quiet";
import { ManagerIssueFocus } from './manager-issue-focus';
import { inboxFilter } from "@/lib/action-center/inbox";
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

type PendingRequest = TimeOffListItem;

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
  return { href: search ? `/app/inbox?${search}` : "/app/inbox", label: "Inbox" };
};

/** Quiet (v4): "Thu, Oct 29 – Fri, Oct 30 · 2 days", "Thu, Oct 29 · 9:00 AM – 1:00 PM" or "Thu, Oct 29 · All day". */
function whenLabel(request: { startDate: string; endDate: string; startTime?: string | null; endTime?: string | null }) {
  const days = Math.round((Date.parse(`${request.endDate}T12:00:00Z`) - Date.parse(`${request.startDate}T12:00:00Z`)) / 86_400_000) + 1;
  if (request.startTime && request.endTime) return `${dayLabel(request.startDate)} · ${formatTime(request.startTime)} – ${formatTime(request.endTime)}`;
  return days === 1 ? `${dayLabel(request.startDate)} · All day` : `${dayLabel(request.startDate)} – ${dayLabel(request.endDate)} · ${days} days`;
}

function Decision({ id, name }: { id: string; name: string }) {
  return <ActionForm action={reviewTimeOffAction} className="q-acts-form" label={`Review time off for ${name}`}
    failure={{ title: "Your decision wasn’t saved", body: "Check your connection and try again. Nothing changed." }}>
    <input type="hidden" name="requestId" value={id} />
    <TimeOffReviewActions name={name} quiet />
  </ActionForm>;
}

/** F6: one request on its own page. Back names where the manager came from; the decision returns there (D-5). */
function FocusedReview({ request, origin, error }: { request: PendingRequest; origin: Origin; error?: string }) {
  const week = weekStartFor(request.startDate);
  return <QuietPage>
    <QuietNav back={backTo(origin)} />
    <QuietHeader title={request.employeeName} sub={whenLabel(request)} />
    {error ? <p className="q-error q-first" role="alert">The request may have changed. Check it and decide again.</p> : null}
    <QuietList style={{ marginTop: 16 }}>
      <QuietRow title="Note" detail={request.reason ? request.reason : "No note"} />
      <QuietRow title="That week’s schedule" href={`/app/schedule?week=${encodeURIComponent(week)}`} />
    </QuietList>
    <form action={reviewTimeOffAction} className="q-acts-form q-acts-form--page" aria-label={`Review time off for ${request.employeeName}`}>
      <input type="hidden" name="requestId" value={request.id} />
      <input type="hidden" name="returnTo" value={origin.from} />
      <input type="hidden" name="returnFilter" value={origin.filter} />
      <TimeOffReviewActions name={request.employeeName} quiet />
    </form>
  </QuietPage>;
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
  // B-12: Owners and company-wide Managers see everyone; a location-scoped Manager sees the people of their locations.
  const source=await listScopedTimeOffRequests(proof,selected.status);
  if(source.state==='unavailable')return <OperationalUnavailable title="Team time off unavailable" reason={source.reason}/>;
  const requests=source.data;

  const focused = selected.status === "PENDING" && requestId ? requests.find(request => request.id === requestId) : undefined;
  const origin: Origin = { from: from === "home" ? "home" : "inbox", filter: inboxFilter(filter ?? "requests"), item: inboxItem(item) };
  if (focused) return <ScopedReadFrame observation={source}><FocusedReview request={focused as PendingRequest} origin={origin} error={error} /></ScopedReadFrame>;
  if (selected.status === "PENDING" && requestId && !error) return <ScopedReadFrame observation={source}><DecidedReview origin={origin} /></ScopedReadFrame>;

  // Quiet (v4, approved Oct 23): the segments carry the waiting count on every tab.
  const waiting = selected.status === "PENDING" ? requests.length
    : await listScopedTimeOffRequests(proof, "PENDING").then(read => read.state === "ready" ? read.data.length : 0).catch(() => 0);
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
      <QuietHeader title="Time off" />
      <QuietSegments label="Time off sections" items={tabs.map(item => ({ href: `/app/requests?tab=${item.id}`, current: selected.id === item.id,
        label: item.id === "pending" && waiting ? `Waiting · ${waiting}` : item.label }))} />
      {error ? <p className="q-error q-first" role="alert">That decision wasn’t saved. The request may have changed; check it and decide again.</p> : null}
      {reviewed ? <p className="q-help q-first" role="status">Decision saved.</p> : null}
      {selected.id === "pending" ? (requests.length ? <ul className="q-list q-requests" aria-label="Waiting time off">{requests.map(request => {
        const sent = (request as { createdAt?: string }).createdAt;
        return <li key={request.id} id={`request-${request.id}`} tabIndex={-1} className="q-request">
          <QuietRow bare avatar={initialsOf(request.employeeName)} title={request.employeeName} detail={whenLabel(request)}
            value={sent ? agoLabel(sent, source.observedAt) : undefined} href={`/app/requests?tab=pending&requestId=${encodeURIComponent(request.id)}`} chevron={false} />
          <Decision id={request.id} name={request.employeeName} />
        </li>;
      })}</ul> : <p className="q-empty q-first">You’re all caught up.</p>)
      : requests.length ? <QuietList label={`${selected.label} time off`} style={{ marginTop: 16 }}>{requests.map(request => (
          <QuietRow key={request.id} avatar={initialsOf(request.employeeName)} title={request.employeeName}
            detail={decidedLine(request) ? <>{whenLabel(request)}<span className="q-rt__line">{decidedLine(request)}</span></> : whenLabel(request)} />
        ))}</QuietList>
      : <p className="q-empty q-first">{`No ${selected.label.toLowerCase()} time off yet.`}</p>}
    </QuietPage>
  </ScopedReadFrame>);
}
