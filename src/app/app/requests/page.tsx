import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { isTimeOffReviewerRole } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import {
  listEmployeeTimeOffRequests,
  listPendingTimeOffRequests,
} from "@/lib/data/requests";
import { reviewTimeOffAction } from "@/app/app/requests/actions";
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

function requestRange(request: {
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
}) {
  const dates =
    request.startDate === request.endDate
      ? dateLabel(request.startDate)
      : `${dateLabel(request.startDate)} – ${dateLabel(request.endDate)}`;

  if (request.startTime && request.endTime) {
    return `${dates} · ${formatTime(request.startTime)} – ${formatTime(request.endTime)}`;
  }

  return `${dates} · Full day`;
}

function statusTone(status: string) {
  if (status === "APPROVED") return "success" as const;
  if (status === "PENDING") return "warning" as const;
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
  }>;
}) {
  const session = await requireSession();
  const manager = isTimeOffReviewerRole(session.role);
  const params = await searchParams;

  const [mine, pending] = await Promise.all([
    listEmployeeTimeOffRequests(session.id),
    manager ? listPendingTimeOffRequests() : Promise.resolve([]),
  ]);

  const activeTab =
    params.tab === "my"
      ? "my"
      : params.tab === "team" && manager
        ? "team"
        : "new";

  return (
    <div className="timeoff-page">
      <PageHeader
        eyebrow="Scheduling requests"
        title="Time off"
        description="Request time away and keep track of approvals."
      />

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
        {manager ? (
          <Link
            className={activeTab === "team" ? "selected" : ""}
            href="/app/requests?tab=team"
            aria-current={activeTab === "team" ? "page" : undefined}
          >
            Team requests
            <span className={pending.length ? "tab-count attention" : "tab-count"}>
              {pending.length}
            </span>
          </Link>
        ) : null}
      </nav>

      <section className="timeoff-workspace">
        {activeTab === "new" ? (
          <article className="panel timeoff-panel timeoff-form-panel">
            <div className="timeoff-panel-heading timeoff-new-heading">
              <div>
                <h2>Request time off</h2>
                <p>Choose your dates and request type. Add a note only if needed.</p>
              </div>
            </div>
            <TimeOffForm />
          </article>
        ) : null}

        {activeTab === "my" ? (
          <article className="panel timeoff-panel request-history-panel">
            <div className="timeoff-panel-heading">
              <div>
                <p className="eyebrow">My requests</p>
                <h2>Request history</h2>
                <p>Track the status of your submitted time-off requests.</p>
              </div>
            </div>

            <div className="request-list timeoff-request-list">
              {mine.length ? (
                mine.map((request) => (
                  <div className="request-list-row timeoff-request-row" key={request.id}>
                    <div className="request-row-copy">
                      <strong>{requestRange(request)}</strong>
                      {request.reason ? (
                        <span>{request.reason}</span>
                      ) : (
                        <span>{request.startTime ? "Partial-day request" : "Full-day request"}</span>
                      )}
                    </div>
                    <StatusPill tone={statusTone(request.status)}>
                      {statusLabel(request.status)}
                    </StatusPill>
                  </div>
                ))
              ) : (
                <div className="timeoff-empty-state">
                  <span className="empty-state-mark" aria-hidden="true">—</span>
                  <strong>No time-off requests yet</strong>
                  <span>Your submitted requests will appear here.</span>
                </div>
              )}
            </div>
          </article>
        ) : null}

        {activeTab === "team" && manager ? (
          <div className="team-request-view">
            <div className="team-request-heading">
              <div>
                <p className="eyebrow">Manager review</p>
                <h2>Team requests</h2>
                <p>
                  {pending.length
                    ? `${pending.length} request${pending.length === 1 ? "" : "s"} waiting for review.`
                    : "No requests are waiting for review."}
                </p>
              </div>
            </div>

            {pending.length ? (
              <div className="request-review-grid timeoff-review-grid">
                {pending.map((request) => (
                  <article className="panel request-card timeoff-review-card" key={request.id}>
                    <div className="review-card-copy">
                      <div className="review-card-topline">
                        <span className="review-avatar" aria-hidden="true">
                          {request.employeeName
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                        <div>
                          <h2>{request.employeeName}</h2>
                          <p>{requestRange(request)}</p>
                        </div>
                      </div>
                      {request.reason ? (
                        <p className="review-reason">{request.reason}</p>
                      ) : (
                        <p className="review-reason muted">No reason provided.</p>
                      )}
                    </div>

                    <form action={reviewTimeOffAction} className="request-actions">
                      <input type="hidden" name="requestId" value={request.id} />
                      <button className="button secondary" name="decision" value="DENIED" type="submit">
                        Decline
                      </button>
                      <button className="button primary" name="decision" value="APPROVED" type="submit">
                        Approve
                      </button>
                    </form>
                  </article>
                ))}
              </div>
            ) : (
              <article className="panel timeoff-panel compact-empty-panel">
                <div className="timeoff-empty-state">
                  <span className="empty-state-mark" aria-hidden="true">✓</span>
                  <strong>You&apos;re all caught up</strong>
                  <span>New employee time-off requests will appear here.</span>
                </div>
              </article>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
