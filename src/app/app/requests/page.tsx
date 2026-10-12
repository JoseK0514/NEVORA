import { TimeOffWithdrawal } from "@/components/time-off-withdrawal";
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
import { TimeOffMotion } from "@/components/time-off-motion";
import "./time-off.css";

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
    <TimeOffMotion><div className="timeoff-page employee-view employee-timeoff-view nto-page">
      <header className="nto-header" data-timeoff-intro><div><h1>Time off</h1><p>Plan your time away. Keep every request in one place.</p></div><Link href="/app/requests/hub" className="nto-back-link">All requests <NavIcon name="arrowRight" size={18} /></Link></header>

      {params.error ? (
        <p className="form-error" role="alert">The request could not be saved. Check that the end date is on or after the start date. Partial-day requests need one date and an end time after the start time.</p>
      ) : null}
      {params.submitted ? (
        <p className="form-success" role="status">Your request was submitted for manager review. Track the decision below.</p>
      ) : null}
      {params.reviewed ? (
        <p className="form-success" role="status">The request was reviewed.</p>
      ) : null}

      <nav className="nto-tabs" aria-label="Time off sections">
        <Link
          className={activeTab === "new" ? "selected" : ""}
          href="/app/requests?tab=new"
          aria-current={activeTab === "new" ? "page" : undefined}
        >
          New request
        </Link>
        <Link
          className={activeTab === "my" ? "selected" : ""}
          href="/app/requests?tab=my"
          aria-current={activeTab === "my" ? "page" : undefined}
        >
          My requests
        </Link>

      </nav>

      <section className="timeoff-workspace">
        {activeTab === "new" ? (
          <article className="nto-panel nto-request-panel">
            <div className="nto-panel-heading">
              <div>
                <h2>Request time off</h2>
                <p>Choose when you need to be away.</p>
              </div>
            </div>
            <TimeOffForm employeeView requestId={randomUUID()} />
          </article>
        ) : null}

        {activeTab === "my" ? (
          <article className="nto-panel nto-history-panel">
            <div className="nto-panel-heading">
              <div>
                <h2>My requests</h2>
                <p>Pending requests can be withdrawn before a decision.</p>
              </div>
              <span className="nto-count">{mine.length} request{mine.length === 1 ? "" : "s"}</span>
            </div>

            <div className="request-list timeoff-request-list">
              {mine.length ? (
                mine.map((request) => (
                  <div className="request-list-row timeoff-request-row" id={`request-${request.id}`} tabIndex={-1} data-employee-status={request.status} key={request.id}>
                    <div className="request-row-copy">
                      <><strong>{request.startDate === request.endDate ? dateLabel(request.startDate) : `${dateLabel(request.startDate)} – ${dateLabel(request.endDate)}`}</strong>
                        <span>{request.startTime && request.endTime ? `Partial day · ${formatTime(request.startTime)} – ${formatTime(request.endTime)}` : "Full day"}</span>
                        {request.reason ? <span className="nto-request-note">{request.reason}</span> : null}
                      </>
                      {request.employeeId === session.id && request.status === "PENDING" ? <details className="nto-withdrawal"><summary>Withdraw this request <NavIcon name="chevronRight" size={16} /></summary><TimeOffWithdrawal requestId={request.id} dateLabel={request.startDate === request.endDate ? dateLabel(request.startDate) : `${dateLabel(request.startDate)} – ${dateLabel(request.endDate)}`} /></details> : null}
                    </div>
                    <StatusPill tone={statusTone(request.status)}>
                      {request.status === "DENIED" ? "Declined" : request.status === "CANCELLED" ? "Withdrawn" : statusLabel(request.status)}
                    </StatusPill>
                  </div>
                ))
              ) : (
                <div className="nto-empty-state">
                  <span className="nto-empty-icon"><NavIcon name="timeOff" size={28} /></span>
                  <strong>No time-off requests yet</strong>
                  <span>Choose your dates and send a request to your manager.</span>
                  <Link className="nto-button nto-primary" href="/app/requests?tab=new">Request time off <NavIcon name="arrowRight" /></Link>
                </div>
              )}
            </div>
          </article>
        ) : null}

      </section>
    </div></TimeOffMotion>
  );
}
