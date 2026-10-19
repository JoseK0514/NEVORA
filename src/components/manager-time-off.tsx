import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { NavIcon } from "@/components/nav-icon";
import { TimeOffReviewActions } from "@/components/time-off-review-actions";
import { TimeOffMotion } from "@/components/time-off-motion";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listPendingTimeOffRequests, listTeamTimeOffRequests } from "@/lib/data/requests";
import { reviewTimeOffAction } from "@/app/app/requests/actions";
import { formatTime } from "@/lib/date-utils";
import { ManagerIssueFocus } from './manager-issue-focus';

const tabs = [
  { id: "pending", label: "Pending", status: "PENDING" },
  { id: "approved", label: "Approved", status: "APPROVED" },
  { id: "declined", label: "Declined", status: "DENIED" },
] as const;

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export async function ManagerTimeOff({ tab, error, reviewed, requestId }: {
  tab?: string; error?: string; reviewed?: string; requestId?: string;
}) {
  await requireRoles(MANAGER_ROLES);
  const selected = tabs.find(item => item.id === tab) ?? tabs[0];
  const requests = selected.status === "PENDING"
    ? await listPendingTimeOffRequests()
    : await listTeamTimeOffRequests(selected.status);

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
