import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { isManagerRole } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import {
  listEmployeeTimeOffRequests,
  listPendingTimeOffRequests,
} from "@/lib/data/requests";
import {
  requestTimeOffAction,
  reviewTimeOffAction,
} from "@/app/app/requests/actions";
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

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    submitted?: string;
    reviewed?: string;
  }>;
}) {
  const session = await requireSession();
  const manager = isManagerRole(session.role);
  const params = await searchParams;

  const [mine, pending] = await Promise.all([
    listEmployeeTimeOffRequests(session.id),
    manager ? listPendingTimeOffRequests() : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Scheduling requests"
        title="Time Off"
        description="Request time off here. Approved requests automatically become scheduling blocks."
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

      <section className="content-grid two request-layout">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">New request</p>
              <h2>Request time off</h2>
            </div>
          </div>

          <form action={requestTimeOffAction} className="employee-form">
            <div className="form-columns">
              <label>
                Start Date
                <input type="date" name="startDate" required />
              </label>
              <label>
                End Date
                <input type="date" name="endDate" required />
              </label>
            </div>

            <label className="checkbox-row partial-toggle">
              <input type="checkbox" name="partialDay" />
              <span>This is only part of the day</span>
            </label>

            <div className="form-columns">
              <label>
                Start Time <span>Only for partial-day requests</span>
                <input type="time" name="startTime" />
              </label>
              <label>
                End Time <span>Only for partial-day requests</span>
                <input type="time" name="endTime" />
              </label>
            </div>

            <label>
              Reason <span>Optional</span>
              <input name="reason" maxLength={250} placeholder="Optional note for management" />
            </label>

            <div className="form-footer">
              <button className="button primary" type="submit">Submit Request</button>
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">My requests</p>
              <h2>Request history</h2>
            </div>
          </div>

          <div className="request-list">
            {mine.length ? mine.map((request) => (
              <div className="request-list-row" key={request.id}>
                <div>
                  <strong>{requestRange(request)}</strong>
                  {request.reason ? <span>{request.reason}</span> : null}
                </div>
                <StatusPill
                  tone={
                    request.status === "APPROVED"
                      ? "success"
                      : request.status === "PENDING"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {request.status[0]}{request.status.slice(1).toLowerCase()}
                </StatusPill>
              </div>
            )) : (
              <div className="empty-state">
                <strong>No requests yet.</strong>
                <span>Your submitted requests will appear here.</span>
              </div>
            )}
          </div>
        </article>
      </section>

      {manager ? (
        <section className="manager-request-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Manager review</p>
              <h2>Pending team requests</h2>
            </div>
            <StatusPill tone={pending.length ? "warning" : "success"}>
              {pending.length} pending
            </StatusPill>
          </div>

          <div className="request-review-grid">
            {pending.length ? pending.map((request) => (
              <article className="panel request-card" key={request.id}>
                <div>
                  <p className="eyebrow">Time off</p>
                  <h2>{request.employeeName}</h2>
                  <p>{requestRange(request)}</p>
                  {request.reason ? <p>{request.reason}</p> : null}
                </div>

                <form action={reviewTimeOffAction} className="request-actions">
                  <input type="hidden" name="requestId" value={request.id} />
                  <button className="button secondary" name="decision" value="DENIED" type="submit">
                    Deny
                  </button>
                  <button className="button primary" name="decision" value="APPROVED" type="submit">
                    Approve
                  </button>
                </form>
              </article>
            )) : (
              <article className="panel empty-state">
                <strong>Nothing waiting for review.</strong>
                <span>New employee time-off requests will show here.</span>
              </article>
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}
