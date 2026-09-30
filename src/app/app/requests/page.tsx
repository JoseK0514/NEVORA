import { randomUUID } from "node:crypto";
import Link from "next/link";
import "./timeoff-premium.css";
import { NavIcon } from "@/components/nav-icon";
import { StatusPill } from "@/components/status-pill";
import { isTimeOffReviewerRole } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import {
  listEmployeeTimeOffRequests,
  listPendingTimeOffRequests,
} from "@/lib/data/requests";
import { reviewTimeOffAction } from "@/app/app/requests/actions";
import { TimeOffForm } from "@/app/app/requests/time-off-form";
import { currentDateInPuertoRico, formatTime } from "@/lib/date-utils";

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

  const currentYear = currentDateInPuertoRico().slice(0, 4);
  const pendingMine = mine.filter((request) => request.status === "PENDING").length;
  const approvedMine = mine.filter((request) => request.status === "APPROVED").length;
  const deniedMine = mine.filter((request) => request.status === "DENIED").length;
  const thisYearMine = mine.filter((request) => request.startDate.startsWith(currentYear)).length;

  return (
    <div className="timeoff-page">
      <section className="timeoff-hero">
        <div className="timeoff-hero-copy">
          <p>Time off</p>
          <h1>Request Time Off</h1>
          <span>Request time away and keep track of approvals.</span>
        </div>
      </section>

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
          <NavIcon name="requests" size={16} />
          New Request
        </Link>
        <Link
          className={activeTab === "my" ? "selected" : ""}
          href="/app/requests?tab=my"
          aria-current={activeTab === "my" ? "page" : undefined}
        >
          <NavIcon name="clock" size={16} />
          My Requests
        </Link>
        {manager ? (
          <Link
            className={activeTab === "team" ? "selected" : ""}
            href="/app/requests?tab=team"
            aria-current={activeTab === "team" ? "page" : undefined}
          >
            <NavIcon name="employees" size={16} />
            Team Requests
            <span className={pending.length ? "tab-count attention" : "tab-count"}>
              {pending.length}
            </span>
          </Link>
        ) : null}
      </nav>

      <section className="timeoff-workspace">
        {activeTab === "new" ? (
          <div className="timeoff-new-layout">
            <article className="panel timeoff-panel timeoff-form-panel">
              <div className="timeoff-panel-heading timeoff-new-heading">
                <div>
                  <h2>Request Time Off</h2>
                  <p>Choose your dates and request type. Add a note only if needed.</p>
                </div>
              </div>
              <TimeOffForm requestId={randomUUID()} />
            </article>

            <aside className="timeoff-side-rail">
              <section className="timeoff-side-card timeoff-overview-card">
                <div className="timeoff-side-heading">
                  <span>
                    <NavIcon name="calendar" size={18} />
                    <strong>Request Overview</strong>
                  </span>
                  <Link href="/app/requests?tab=my">View All</Link>
                </div>

                <div className="timeoff-overview-grid">
                  <div className="pending">
                    <span><NavIcon name="clock" size={20} /></span>
                    <strong>{pendingMine}</strong>
                    <small>Pending</small>
                  </div>
                  <div className="approved">
                    <span><NavIcon name="coverage" size={20} /></span>
                    <strong>{approvedMine}</strong>
                    <small>Approved</small>
                  </div>
                  <div className="declined">
                    <span><NavIcon name="alert" size={20} /></span>
                    <strong>{deniedMine}</strong>
                    <small>Declined</small>
                  </div>
                  <div className="total">
                    <span><NavIcon name="requests" size={20} /></span>
                    <strong>{thisYearMine}</strong>
                    <small>Total this year</small>
                  </div>
                </div>
              </section>

              <section className="timeoff-side-card timeoff-how-card">
                <div className="timeoff-side-heading">
                  <span>
                    <NavIcon name="templates" size={18} />
                    <strong>How It Works</strong>
                  </span>
                </div>

                <div className="timeoff-steps">
                  <div>
                    <span>1</span>
                    <p><strong>Submit Your Request</strong><small>Fill in your dates and request type.</small></p>
                  </div>
                  <div>
                    <span>2</span>
                    <p><strong>Manager Reviews</strong><small>You’ll be notified once a decision is made.</small></p>
                  </div>
                  <div>
                    <span>3</span>
                    <p><strong>Track the Status</strong><small>Check My Requests to see the latest updates.</small></p>
                  </div>
                </div>
              </section>

              <section className="timeoff-recharge-card" aria-label="Fuel Coffee Drive">
                <div>
                  <strong>Take time<br />to recharge.</strong>
                  <small>People Fuel Possibility.</small>
                </div>
              </section>
            </aside>
          </div>
        ) : null}

        {activeTab === "my" ? (
          <article className="panel timeoff-panel request-history-panel">
            <div className="timeoff-panel-heading">
              <div>
                <p className="eyebrow">MY REQUESTS</p>
                <h2>Request History</h2>
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
                <p className="eyebrow">MANAGER REVIEW</p>
                <h2>Team Requests</h2>
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
