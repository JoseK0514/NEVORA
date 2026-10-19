import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { NavIcon } from "@/components/nav-icon";
import { TimeOffReviewActions } from "@/components/time-off-review-actions";
import { TimeOffMotion } from "@/components/time-off-motion";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listPendingTimeOffRequests, listTeamTimeOffRequests } from "@/lib/data/requests";
import { reviewTimeOffAction } from "@/app/app/requests/actions";
import { formatTime, weekStartFor } from "@/lib/date-utils";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { Card, KitLink, PageBand, Row, Rows, Status, Tile } from "@/components/kit/kit";
import { TimeOffReviewDecision } from "@/components/time-off-review-decision";
import { ManagerIssueFocus } from './manager-issue-focus';
import { inboxFilter } from "@/lib/action-center/inbox";

const tabs = [
  { id: "pending", label: "Pending", status: "PENDING" },
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
type Origin = { from: "home" | "inbox"; filter: string };
const backTo = ({ from, filter }: Origin) => from === "home" ? { href: "/app", label: "Home" } : { href: filter === "all" ? "/app/inbox" : `/app/inbox?filter=${filter}`, label: "Inbox" };

function FocusedReview({ request, origin, error }: { request: PendingRequest; origin: Origin; error?: string }) {
  const back = backTo(origin);
  const from = origin.from;
  const range = request.endDate !== request.startDate ? `${shortDate(request.startDate)}\u00a0– ${shortDate(request.endDate)}` : shortDate(request.startDate);
  const days = Math.round((Date.parse(`${request.endDate}T12:00:00Z`) - Date.parse(`${request.startDate}T12:00:00Z`)) / 86_400_000) + 1;
  const length = request.startTime && request.endTime ? `Partial day · ${formatTime(request.startTime)}\u00a0– ${formatTime(request.endTime)}`
    : days === 1 ? "Full day" : `${days} full days`;
  const week = weekStartFor(request.startDate);
  return <div className="nv-page premium-review" data-nv-page="">
    <PageBand back={back} eyebrow="Time-off request" title={request.employeeName}
      summary={`Wants ${request.endDate !== request.startDate ? `${shortDate(request.startDate, false)}\u00a0– ${shortDate(request.endDate, false)}` : shortDate(request.startDate, false)} off.`} />
    <form action={reviewTimeOffAction} className="nv-content premium-review-form" aria-label={`Review time off for ${request.employeeName}`}>
      <input type="hidden" name="requestId" value={request.id} />
      <input type="hidden" name="returnTo" value={from} />
      <input type="hidden" name="returnFilter" value={origin.filter} />
      {error ? <p className="form-error premium-review-error" role="alert">The request could not be reviewed. It may have changed; review it again.</p> : null}
      <Card id={`request-${request.id}`} title="Request" meta={<Status tone="review">Waiting</Status>}>
        <Rows label="Request details">
          <Row title="Dates" trailing={<span className="premium-fact">{range}</span>} />
          <Row title="Length" trailing={<span className="premium-fact">{length}</span>} />
        </Rows>
      </Card>
      <Card id="request-note" title="Note">
        <p className="premium-review-note">{request.reason ? request.reason : "No note was added."}</p>
      </Card>
      <p className="premium-review-more"><KitLink href="/app/requests?tab=pending">All pending time-off requests</KitLink></p>
      <Card id="request-context" title="Before you decide">
        <Rows label="Before you decide">
          <Row href={`/app/schedule?week=${encodeURIComponent(week)}`} title="See that week’s schedule" meta="Who else is working those days"
            leading={<Tile><CalendarBlankIcon size={20} weight="bold" /></Tile>} />
        </Rows>
      </Card>
      {/* Sticky inside the form, so the decision stays on screen while the facts scroll. */}
      <TimeOffReviewDecision />
    </form>
  </div>;
}

/** IS-10: a link to a request that is no longer waiting says so, instead of opening the list. */
function DecidedReview({ origin }: { origin: Origin }) {
  return <div className="nv-page premium-review" data-nv-page="">
    <PageBand back={backTo(origin)} eyebrow="Time-off request" title="Already decided" summary="This request isn’t waiting for review anymore." />
    <div className="nv-content">
      <Card title="Where to find it">
        <p className="premium-review-note">Approved and declined requests stay in Time off for the record.</p>
        <p className="premium-review-more"><KitLink href="/app/requests?tab=approved">See approved time off</KitLink> · <KitLink href="/app/requests?tab=declined">See declined</KitLink></p>
      </Card>
    </div>
  </div>;
}

export async function ManagerTimeOff({ tab, error, reviewed, requestId, from, filter }: {
  tab?: string; error?: string; reviewed?: string; requestId?: string; from?: string; filter?: string;
}) {
  await requireRoles(MANAGER_ROLES);
  const selected = tabs.find(item => item.id === tab) ?? tabs[0];
  const requests = selected.status === "PENDING"
    ? await listPendingTimeOffRequests()
    : await listTeamTimeOffRequests(selected.status);
  const focused = selected.status === "PENDING" && requestId ? requests.find(request => request.id === requestId) : undefined;
  const origin: Origin = { from: from === "home" ? "home" : "inbox", filter: inboxFilter(filter ?? "requests") };
  if (focused) return <FocusedReview request={focused as PendingRequest} origin={origin} error={error} />;
  if (selected.status === "PENDING" && requestId && !error) return <DecidedReview origin={origin} />;

  return (
    <TimeOffMotion><div className="timeoff-page manager-workflow-page manager-timeoff nto-page">
      <ManagerIssueFocus prefix="request-" />
      <header className="nto-header" data-timeoff-intro><div><h1>Time off</h1><p>Review time away and keep your team informed.</p></div><Link href="/app/inbox?filter=requests" className="nto-back-link">All requests <NavIcon name="arrowRight" /></Link></header>
      {error ? <p className="form-error" role="alert">The request could not be reviewed. It may have changed; review it again.</p> : null}
      {reviewed ? <p className="form-success" role="status">The request was reviewed.</p> : null}
      <nav className="nto-tabs nto-manager-tabs" aria-label="Time off sections">
        {tabs.map(item => <Link key={item.id} className={selected.id === item.id ? "selected" : ""} href={`/app/requests?tab=${item.id}`} aria-current={selected.id === item.id ? "page" : undefined}>{item.label}</Link>)}
      </nav>
      <section className="nto-panel nto-review-panel" aria-label={`${selected.label} time off`}>
        <div className="nto-panel-heading"><div><h2>{selected.id === "pending" ? "Awaiting your review" : `${selected.label} requests`}</h2><p>{selected.id === "pending" ? "Check the dates and note, then choose a decision." : "A record of your team's time-off decisions."}</p></div><span className="nto-count">{requests.length} request{requests.length === 1 ? "" : "s"}</span></div>
        {requests.length ? requests.map(request => (
          <article className={`nto-review-row manager-issue-target${requestId === request.id ? " selected" : ""}`} tabIndex={-1} id={`request-${request.id}`} key={request.id}>
            <div className="nto-person"><span className="nto-avatar" aria-hidden="true">{request.employeeName.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join("")}</span><div><h3>{request.employeeName}</h3><StatusPill tone={request.status === "APPROVED" ? "success" : request.status === "PENDING" ? "warning" : "neutral"}>{selected.label}</StatusPill></div></div>
            <div className="nto-request-facts">
              <strong>{dateLabel(request.startDate)}{request.endDate !== request.startDate ? ` – ${dateLabel(request.endDate)}` : ""}</strong>
              <span><NavIcon name={request.startTime ? "clock" : "schedule"} size={16} />{request.startTime && request.endTime ? `Partial day · ${formatTime(request.startTime)} – ${formatTime(request.endTime)}` : "Full day"}</span>
              {request.reason ? <p className="nto-request-note">{request.reason}</p> : null}
            </div>
            {request.status === "PENDING" ? <form action={reviewTimeOffAction} className="nto-review-action" aria-label={`Review time off for ${request.employeeName}`}>
                <input type="hidden" name="requestId" value={request.id} />
                <TimeOffReviewActions />
              </form> : null}
          </article>
        )) : <div className="nto-empty-state"><span className="nto-empty-icon"><NavIcon name={selected.id === "pending" ? "calendar" : "timeOff"} size={28} /></span><strong>{selected.id === "pending" ? "You're all caught up" : `No ${selected.label.toLowerCase()} requests`}</strong><span>{selected.id === "pending" ? "New employee requests will appear here for your review." : "Requests will appear here after you make a decision."}</span></div>}
      </section>
    </div></TimeOffMotion>
  );
}
