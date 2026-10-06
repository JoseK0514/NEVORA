import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listPendingTimeOffRequests, listTeamTimeOffRequests } from "@/lib/data/requests";
import { reviewTimeOffAction } from "@/app/app/requests/actions";
import { formatTime } from "@/lib/date-utils";

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
    <div className="timeoff-page manager-workflow-page manager-timeoff">
      <PageHeader eyebrow="Team requests" title="Time Off" description="Review time away and track team decisions." />
      {error ? <p className="form-error" role="alert">The request could not be reviewed. It may have changed; review it again.</p> : null}
      {reviewed ? <p className="form-success" role="status">The request was reviewed.</p> : null}
      <nav className="timeoff-tabs manager-workflow-tabs" aria-label="Time off sections">
        {tabs.map(item => <Link key={item.id} className={selected.id === item.id ? "selected" : ""} href={`/app/requests?tab=${item.id}`} aria-current={selected.id === item.id ? "page" : undefined}>{item.label}</Link>)}
      </nav>
      <section className="panel manager-workflow-panel" aria-label={`${selected.label} time off`}>
        <div className="manager-workflow-heading"><h2>{selected.label}</h2><span className="muted">{requests.length} request{requests.length === 1 ? "" : "s"}</span></div>
        {requests.length ? requests.map(request => (
          <article className={requestId === request.id ? "manager-workflow-row selected" : "manager-workflow-row"} id={`request-${request.id}`} key={request.id}>
            <div className="manager-workflow-copy">
              <h3>{request.employeeName}</h3>
              <span>{dateLabel(request.startDate)}{request.endDate !== request.startDate ? ` – ${dateLabel(request.endDate)}` : ""}</span>
              <span>{request.startTime && request.endTime ? `Partial day · ${formatTime(request.startTime)} – ${formatTime(request.endTime)}` : "Full day"}</span>
              {request.reason ? <p>{request.reason}</p> : null}
            </div>
            <div className="manager-workflow-review">
              <StatusPill tone={request.status === "APPROVED" ? "success" : request.status === "PENDING" ? "warning" : "neutral"}>{selected.label === "Pending" ? "Pending" : selected.label}</StatusPill>
              {request.status === "PENDING" ? <form action={reviewTimeOffAction} className="request-actions">
                <input type="hidden" name="requestId" value={request.id} />
                <button className="button secondary" name="decision" value="DENIED" type="submit">Decline</button>
                <button className="button primary" name="decision" value="APPROVED" type="submit">Approve</button>
              </form> : null}
            </div>
          </article>
        )) : <div className="timeoff-empty-state"><strong>{selected.id === "pending" ? "You’re all caught up" : `No ${selected.label.toLowerCase()} requests`}</strong><span>{selected.id === "pending" ? "New employee requests will appear here." : "Reviewed requests will appear here."}</span></div>}
      </section>
    </div>
  );
}
