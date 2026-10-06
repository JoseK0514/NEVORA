import { randomUUID } from "node:crypto";
import Link from "next/link";
import { ManagerTimeOff } from "@/components/manager-time-off";
import { NavIcon } from "@/components/nav-icon";
import { StatusPill } from "@/components/status-pill";
import { isTimeOffReviewerRole } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { listEmployeeTimeOffRequests } from "@/lib/data/requests";
import { TimeOffForm } from "@/app/app/requests/time-off-form";
import { formatTime } from "@/lib/date-utils";

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function statusTone(status: string) {
  if (status === "APPROVED") return "success" as const;
  return "neutral" as const;
}

function statusLabel(status: string) {
  return status[0] + status.slice(1).toLowerCase();
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    submitted?: string;
    reviewed?: string;
    tab?: string;
    requestId?: string;
  }>;
}) {
  const session = await requireSession();
  const manager = isTimeOffReviewerRole(session.role);
  const params = await searchParams;

  if (manager) return ManagerTimeOff(params);

  const mine = await listEmployeeTimeOffRequests(session.id);
  const activeTab = params.tab === "my" ? "my" : "new";

  return (
    <div className="timeoff-page employee-view employee-timeoff-view">
      <header className="employee-view-heading"><div><p className="employee-view-eyebrow">Your requests</p><h1>Time Off</h1></div></header>

      {params.error ? (
        <p className="form-error">The request could not be saved. Check the dates and times.</p>
      ) : null}
      {params.submitted ? (
        <p className="form-success">Your request was submitted for manager review.</p>
      ) : null}
      {params.reviewed ? (
        <p className="form-success">The request was reviewed.</p>
      ) : null}

      <nav className="timeoff-tabs" aria-label="Time off sections">
        <Link
          className={activeTab === "new" ? "selected" : ""}
          href="/app/requests?tab=new"
          aria-current={activeTab === "new" ? "page" : undefined}
        >
          New Request
        </Link>
        <Link
          className={activeTab === "my" ? "selected" : ""}
          href="/app/requests?tab=my"
          aria-current={activeTab === "my" ? "page" : undefined}
        >
          My Requests
        </Link>

      </nav>

      <section className="timeoff-workspace">
        {activeTab === "new" ? (
          <article className="panel timeoff-panel timeoff-form-panel">
            <div className="timeoff-panel-heading timeoff-new-heading">
              <div>
                <h2>Request time off</h2>
              </div>
            </div>
            <TimeOffForm employeeView requestId={randomUUID()} />
          </article>
        ) : null}

        {activeTab === "my" ? (
          <article className="panel timeoff-panel request-history-panel">
            <div className="timeoff-panel-heading">
              <div>
                <h2>Request history</h2>
              </div>
            </div>

            <div className="request-list timeoff-request-list">
              {mine.length ? (
                mine.map((request) => (
                  <div className="request-list-row timeoff-request-row" id={`request-${request.id}`} tabIndex={-1} data-employee-status={request.status} key={request.id}>
                    <div className="request-row-copy">
                      <><strong>{request.startDate === request.endDate ? dateLabel(request.startDate) : `${dateLabel(request.startDate)} – ${dateLabel(request.endDate)}`}</strong>
                        <span>{request.startTime && request.endTime ? `Partial day · ${formatTime(request.startTime)} – ${formatTime(request.endTime)}` : "Full day"}</span>
                        {request.reason ? <span>{request.reason}</span> : null}
                      </>
                    </div>
                    <StatusPill tone={statusTone(request.status)}>
                      {request.status === "DENIED" ? "Declined" : statusLabel(request.status)}
                    </StatusPill>
                  </div>
                ))
              ) : (
                <div className="timeoff-empty-state">
                  <span className="employee-empty-icon"><NavIcon name="timeOff" employee size={16} /></span>
                  <strong>No time-off requests yet</strong>
                  <span>Your submitted requests will appear here.</span>
                </div>
              )}
            </div>
          </article>
        ) : null}

      </section>
    </div>
  );
}
