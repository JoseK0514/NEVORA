import { businessDate } from "@/lib/business-time";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listManagerPendingExchanges, listManagementCoverage, listTeamExchangeActivity, type ExchangeRecord, type ExchangeShift } from "@/lib/data/exchanges";
import { listPendingCallouts, listTeamCalloutHistory } from "@/lib/data/callouts";
import { reviewExchangeAction } from "@/app/app/exchange/actions";
import { reviewCalloutAction } from "@/app/app/exchange/callout/actions";
import {  formatDayLabel, formatTime } from "@/lib/date-utils";

const tabs = [{ id: "pending", label: "Pending" }, { id: "coverage", label: "Open Coverage" }, { id: "activity", label: "Team Activity" }] as const;
const reasons: Record<string, string> = { ILLNESS: "Illness / sick", FAMILY_EMERGENCY: "Family emergency", TRANSPORTATION: "Transportation issue", SCHOOL: "School conflict", PERSONAL_EMERGENCY: "Personal emergency", OTHER: "Other" };
const errors: Record<string, string> = {
  EXCHANGE_CHANGED: "The schedule changed before approval. Review the request again.",
  SHIFT_OVERLAP: "The exchange would create an overlapping shift.",
  APPROVED_TIME_OFF: "The exchange conflicts with approved time off.",
  OUTSIDE_AVAILABILITY: "The exchange is outside the employee’s submitted availability.",
  LOCATION_NOT_ELIGIBLE: "The employee is not eligible to work at that location.",
  EMPLOYEE_INACTIVE: "An inactive employee cannot participate in the exchange.",
  CALLOUT_EXISTS: "This shift already has an active call-out request.",
};
function shiftLabel(shift: Pick<ExchangeShift, "date" | "startTime" | "endTime" | "locationName">) {
  const day = formatDayLabel(shift.date);
  return `${day.weekday}, ${day.day} · ${formatTime(shift.startTime)} – ${formatTime(shift.endTime)} · ${shift.locationName}`;
}
function statusLabel(status: string) {
  if (status === "DENIED") return "Declined";
  return status.toLowerCase().replaceAll("_", " ").replace(/^./, first => first.toUpperCase());
}
function ExchangeCopy({ exchange }: { exchange: ExchangeRecord }) {
  return <div className="manager-workflow-copy"><h3>{exchange.kind === "SWAP" ? "Trade" : "Coverage"} · {exchange.requestedByName}</h3><span>{shiftLabel(exchange.sourceShift)}</span>{exchange.targetEmployeeName ? <span>{exchange.kind === "SWAP" ? "Trading with" : "Claimed by"} {exchange.targetEmployeeName}</span> : null}{exchange.kind === "SWAP" && exchange.targetShift ? <span>{shiftLabel(exchange.targetShift)}</span> : null}</div>;
}

export async function ManagerShiftRequests({ tab, error, approved, reviewed, calloutApproved, calloutDenied, requestId, timeZone }: {
  timeZone: string; tab?: string; error?: string; approved?: string; reviewed?: string; calloutApproved?: string; calloutDenied?: string; requestId?: string;
}) {
  await requireRoles(MANAGER_ROLES);
  const selected = tabs.find(item => item.id === tab) ?? tabs[0];
  const [pending, callouts, coverage, exchanges, history] = await Promise.all([
    selected.id === "pending" ? listManagerPendingExchanges() : Promise.resolve([]),
    selected.id === "pending" ? listPendingCallouts() : Promise.resolve([]),
    selected.id === "coverage" ? listManagementCoverage(businessDate(new Date(), timeZone)) : Promise.resolve([]),
    selected.id === "activity" ? listTeamExchangeActivity(true) : Promise.resolve([]),
    selected.id === "activity" ? listTeamCalloutHistory() : Promise.resolve([]),
  ]);
  const activity = [...exchanges.map(exchange => ({ id: exchange.id, createdAt: exchange.createdAt, status: exchange.status, copy: <ExchangeCopy exchange={exchange} /> })), ...history.map(callout => ({ id: callout.id, createdAt: callout.createdAt, status: callout.status, copy: <div className="manager-workflow-copy"><h3>Call-out · {callout.employeeName}</h3><span>{shiftLabel(callout)}</span><span>{reasons[callout.reasonCode] ?? callout.reasonCode}</span>{callout.reasonNote ? <p>{callout.reasonNote}</p> : null}</div> }))].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);
  const count = selected.id === "pending" ? pending.length + callouts.length : selected.id === "coverage" ? coverage.length : activity.length;
  const success = calloutApproved ? "Call-out approved. The shift is now open for coverage." : calloutDenied ? "The call-out was declined." : approved ? "The exchange was approved and the schedule was updated." : reviewed ? "The exchange was reviewed." : undefined;

  return <div className="exchange-page marketplace-page manager-workflow-page manager-shift-requests">
    <PageHeader eyebrow="Team requests" title="Shift Requests" description="Review exceptions, open coverage and recent team outcomes." />
    {error ? <p className="form-error" role="alert">{errors[error] ?? "The request could not be reviewed. It may have changed; review it again."}</p> : null}
    {success ? <p className="form-success" role="status">{success}</p> : null}
    <nav className="timeoff-tabs manager-workflow-tabs" aria-label="Shift request sections">{tabs.map(item => <Link key={item.id} href={`/app/exchange?tab=${item.id}`} className={selected.id === item.id ? "selected" : ""} aria-current={selected.id === item.id ? "page" : undefined}>{item.label}</Link>)}</nav>
    <section className="panel manager-workflow-panel" aria-label={selected.label}>
      <div className="manager-workflow-heading"><h2>{selected.label}</h2><span className="muted">{count} {selected.id === "coverage" ? "shift" : "request"}{count === 1 ? "" : "s"}</span></div>
      {pending.map(exchange => <article className={requestId === exchange.id ? "manager-workflow-row selected" : "manager-workflow-row"} id={`request-${exchange.id}`} key={exchange.id}>
        <ExchangeCopy exchange={exchange} />
        <div className="manager-workflow-review"><StatusPill tone="warning">Needs review</StatusPill><form action={reviewExchangeAction} className="request-actions"><input type="hidden" name="exchangeId" value={exchange.id} /><button className="button secondary" name="decision" value="DENIED" type="submit">Decline</button><button className="button primary" name="decision" value="APPROVED" type="submit">Approve</button></form></div>
      </article>)}
      {callouts.map(callout => <article className={requestId === callout.id ? "manager-workflow-row selected" : "manager-workflow-row"} id={`request-${callout.id}`} key={callout.id}>
        <div className="manager-workflow-copy"><h3>Call-out · {callout.employeeName}</h3><span>{shiftLabel(callout)}</span><span>{reasons[callout.reasonCode] ?? callout.reasonCode}</span>{callout.reasonNote ? <p>{callout.reasonNote}</p> : null}</div>
        <div className="manager-workflow-review"><StatusPill tone="warning">Pending</StatusPill><form action={reviewCalloutAction} className="request-actions"><input type="hidden" name="calloutId" value={callout.id} /><button className="button secondary" name="decision" value="DENIED" type="submit">Decline</button><button className="button primary" name="decision" value="APPROVED" type="submit">Approve</button></form></div>
      </article>)}
      {coverage.map(exchange => <article className="manager-workflow-row" key={exchange.id}><ExchangeCopy exchange={exchange} /><StatusPill tone="warning">Unclaimed</StatusPill></article>)}
      {activity.map(item => <article className="manager-workflow-row" key={item.id}>{item.copy}<StatusPill tone={item.status === "APPROVED" ? "success" : "neutral"}>{statusLabel(item.status)}</StatusPill></article>)}
      {!count ? <div className="timeoff-empty-state"><strong>{selected.id === "pending" ? "You’re all caught up" : selected.id === "coverage" ? "No open coverage" : "No recent outcomes"}</strong><span>{selected.id === "pending" ? "Requests needing a management decision will appear here." : selected.id === "coverage" ? "Unclaimed published shifts will appear here." : "Completed and declined requests will appear here."}</span></div> : null}
    </section>
  </div>;
}
