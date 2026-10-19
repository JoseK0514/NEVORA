import { keepWhole } from "@/lib/keep-whole";
import { TimeOffWithdrawal } from "@/components/time-off-withdrawal";
import { moduleGate } from "@/lib/workspace-presentation/current.server";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { ManagerTimeOff } from "@/components/manager-time-off";
import { NavIcon } from "@/components/nav-icon";
import { isTimeOffReviewerRole } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { listEmployeeTimeOffRequests } from "@/lib/data/requests";
import { TimeOffForm } from "@/app/app/requests/time-off-form";
import { formatTime } from "@/lib/date-utils";
import { TimeOffMotion } from "@/components/time-off-motion";
import "./time-off.css";
import { Card, CardBody, FilterPills, PageBand, Status } from "@/components/kit/kit";
import { getWorkspace } from "@/lib/data/workspaces";

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
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
    from?: string;
    filter?: string;
  }>;
}) {
  const moduleOff = await moduleGate("timeOff");
  if (moduleOff) return moduleOff;

  const session = await requireSession();
  const manager = isTimeOffReviewerRole(session.role);
  const params = await searchParams;

  if (manager) return ManagerTimeOff(params);

  const mine = await listEmployeeTimeOffRequests(session.id);
  const activeTab = params.tab === "my" ? "my" : "new";

  const zone = await getWorkspace().then(workspace => workspace.timeZone).catch(() => "UTC");
  const sentOn = (at: string) => { try { return new Intl.DateTimeFormat("en-US", { timeZone: zone, month: "short", day: "numeric" }).format(new Date(at)); } catch { return ""; } };
  const waiting = mine.filter(request => request.status === "PENDING").length;

  // Phase 3: Time off on the kit. The band names what is waiting; New request and My requests are its pills.
  return (
    <TimeOffMotion><div className="nv-page timeoff-page employee-view employee-timeoff-view nto-page premium-employee-timeoff" data-nv-page="">
      <PageBand title="Time off" overlap={false}
        summary={waiting ? `${waiting}\u00a0${waiting === 1 ? "request" : "requests"} waiting for approval.` : "Plan your time away."}
        extra={<FilterPills label="Time off sections" items={[
          { href: "/app/requests?tab=new", label: "New request", current: activeTab === "new" },
          { href: "/app/requests?tab=my", label: `My requests${mine.length ? ` (${mine.length})` : ""}`, current: activeTab === "my" },
        ]} />} />
      <div className="premium-employee-content" data-timeoff-intro>
      {params.error ? (
        <p className="form-error" role="alert">Your request wasn’t sent. Check that the end date is on or after the start date. A partial day needs one date and an end time after the start time.</p>
      ) : null}
      {params.submitted ? (
        <p className="form-success" role="status">Your request was submitted for manager review. Track the decision below.</p>
      ) : null}
      {params.reviewed ? (
        <p className="form-success" role="status">The request was reviewed.</p>
      ) : null}

      {activeTab === "new" ? (
        <Card title="Request time off" id="timeoff-new">
          <CardBody>
            <p className="premium-card-lead">Choose when you need to be away.</p>
            <TimeOffForm employeeView requestId={randomUUID()} draftOwner={session.id} />
          </CardBody>
        </Card>
      ) : null}

      {activeTab === "my" ? (
        <Card title="My requests" id="timeoff-mine" meta={`${mine.length}\u00a0request${mine.length === 1 ? "" : "s"}`}>
          {mine.length ? <ul className="nv-rows premium-timeoff-list" aria-label="My requests">
            {mine.map((request) => (
              <li className="premium-timeoff-row" id={`request-${request.id}`} tabIndex={-1} data-employee-status={request.status} key={request.id}>
                <div className="premium-timeoff-row__head">
                  <span className="nv-row__title">{keepWhole(request.startDate === request.endDate ? dateLabel(request.startDate) : `${dateLabel(request.startDate)} – ${dateLabel(request.endDate)}`)}</span>
                  <Status tone={request.status === "APPROVED" ? "done" : request.status === "PENDING" ? "review" : "neutral"}>
                    {request.status === "DENIED" ? "Declined" : request.status === "CANCELLED" ? "Withdrawn" : request.status === "PENDING" ? "Waiting" : statusLabel(request.status)}
                  </Status>
                </div>
                <span className="nv-row__meta">{request.startTime && request.endTime ? keepWhole(`Partial day · ${formatTime(request.startTime)} – ${formatTime(request.endTime)}`) : "Full day"}</span>
                {request.reason ? <span className="nv-row__meta premium-timeoff-note">Note: {request.reason}</span> : null}
                {/* Request timeline: when it was sent, then who decided it and when (Jose, 2026-10-19). */}
                <ol className="premium-timeline" aria-label="Request timeline">
                  <li data-done="true">{keepWhole(`Sent ${sentOn(request.createdAt)}`)}</li>
                  <li data-done={request.status !== "PENDING" ? "true" : undefined}>{request.status === "PENDING" ? "Waiting for approval"
                    : keepWhole(`${request.status === "APPROVED" ? "Approved" : request.status === "DENIED" ? "Declined" : "Withdrawn"}${request.reviewerName && request.status !== "CANCELLED" ? ` by ${request.reviewerName}` : ""}${request.reviewedAt ? ` · ${sentOn(request.reviewedAt)}` : ""}`)}</li>
                </ol>
                {request.employeeId === session.id && request.status === "PENDING" ? <details className="nto-withdrawal"><summary>Withdraw this request <NavIcon name="chevronRight" size={16} /></summary><TimeOffWithdrawal requestId={request.id} dateLabel={request.startDate === request.endDate ? dateLabel(request.startDate) : `${dateLabel(request.startDate)} – ${dateLabel(request.endDate)}`} /></details> : null}
              </li>
            ))}
          </ul> : (
            <CardBody>
              <div className="nto-empty-state">
                <span className="nto-empty-icon"><NavIcon name="timeOff" size={28} /></span>
                <strong>No time-off requests yet</strong>
                <span>Choose your dates and send a request to your manager.</span>
                <Link className="nv-btn" data-kind="primary" href="/app/requests?tab=new">Request time off</Link>
              </div>
            </CardBody>
          )}
        </Card>
      ) : null}
      </div>
    </div></TimeOffMotion>
  );
}
