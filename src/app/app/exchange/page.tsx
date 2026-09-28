import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { isManagerRole } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import {
  currentDateInPuertoRico,
  formatDayLabel,
  formatTime,
} from "@/lib/date-utils";
import {
  listEmployeeExchangeActivity,
  listEmployeePublishedShifts,
  listIncomingSwaps,
  listManagerPendingExchanges,
  listOpenCoverage,
} from "@/lib/data/exchanges";
import {
  cancelExchangeAction,
  claimCoverageAction,
  offerCoverageAction,
  respondSwapAction,
  reviewExchangeAction,
} from "@/app/app/exchange/actions";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_SHIFT: "That shift is no longer available for exchange.",
  SHIFT_ALREADY_OFFERED: "One of those shifts already has an active coverage or swap request.",
  LOCATION_NOT_ELIGIBLE: "The employee is not eligible to work at that location.",
  SHIFT_OVERLAP: "The exchange would create an overlapping shift.",
  APPROVED_TIME_OFF: "The exchange conflicts with approved time off.",
  OUTSIDE_AVAILABILITY: "The exchange is outside the employee's submitted availability.",
  EMPLOYEE_INACTIVE: "An inactive employee cannot participate in the exchange.",
  INVALID_TIME_RANGE: "The shift time is invalid.",
  EXCHANGE_UNAVAILABLE: "That exchange is no longer available.",
  EXCHANGE_TAKEN: "Another employee already claimed that shift.",
  SAME_SHIFT: "Choose a different shift to trade.",
  NOT_SHIFT_OWNER: "You can only trade one of your own shifts.",
  SAME_EMPLOYEE: "A direct swap must be with another employee.",
  DIFFERENT_WEEK: "Direct swaps must stay within the same schedule week.",
  EMPLOYEE_NOT_FOUND: "An employee on this request could not be found.",
  INVALID_DECISION: "That response could not be processed.",
  NOT_TARGET_EMPLOYEE: "Only the employee receiving the swap request can accept it.",
  EXCHANGE_CHANGED: "The schedule changed before approval. Review the request again.",
};

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function shiftDate(date: string) {
  const label = formatDayLabel(date);
  return `${label.weekday} · ${label.day}`;
}

export default async function ExchangePage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    offered?: string;
    claimed?: string;
    swapRequested?: string;
    swapAccepted?: string;
    swapDeclined?: string;
    reviewed?: string;
    approved?: string;
    cancelled?: string;
  }>;
}) {
  const session = await requireSession();
  const manager = isManagerRole(session.role);
  const today = currentDateInPuertoRico();
  const params = await searchParams;

  const [myShifts, openCoverage, incomingSwaps, activity, managerPending] =
    await Promise.all([
      listEmployeePublishedShifts(session.id, today),
      listOpenCoverage(session.id, today),
      listIncomingSwaps(session.id),
      listEmployeeExchangeActivity(session.id),
      manager ? listManagerPendingExchanges() : Promise.resolve([]),
    ]);

  const successMessage =
    params.offered
      ? "Your shift is now available for another eligible employee to claim."
      : params.claimed
        ? "Coverage request sent to management. The original employee remains scheduled until approval."
        : params.swapRequested
          ? "Swap request sent to the other employee."
          : params.swapAccepted
            ? "You accepted the swap. It is now waiting for manager approval."
            : params.swapDeclined
              ? "The swap request was declined."
              : params.approved
                ? "The exchange was approved and the schedule was updated."
                : params.reviewed
                  ? "The exchange was reviewed."
                  : params.cancelled
                    ? "The exchange request was cancelled."
                    : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Schedule flexibility"
        title="Shift Exchange"
        description="Offer coverage or trade shifts without changing the published schedule until everyone involved and management approve."
      />

      {params.error ? (
        <p className="form-error">
          {ERROR_MESSAGES[params.error] ?? "The exchange could not be processed."}
        </p>
      ) : null}
      {successMessage ? <p className="form-success">{successMessage}</p> : null}

      <section className="exchange-summary-bar" aria-label="Shift exchange overview">
        {manager ? (
          <div className="exchange-summary-item">
            <span>Manager approvals</span>
            <strong>{managerPending.length}</strong>
            <small>{managerPending.length ? "Needs review" : "All clear"}</small>
          </div>
        ) : null}
        <div className="exchange-summary-item">
          <span>My eligible shifts</span>
          <strong>{myShifts.length}</strong>
          <small>Available to offer or swap</small>
        </div>
        <div className="exchange-summary-item">
          <span>Open coverage</span>
          <strong>{openCoverage.length}</strong>
          <small>Available from the team</small>
        </div>
        <div className="exchange-summary-item">
          <span>Swap requests</span>
          <strong>{incomingSwaps.length}</strong>
          <small>{incomingSwaps.length ? "Waiting on you" : "Nothing waiting"}</small>
        </div>
      </section>

      {manager && managerPending.length ? (
        <section className="exchange-priority-section">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">Manager approval</p>
              <h2>Needs your review</h2>
            </div>
            <StatusPill tone="warning">{managerPending.length} pending</StatusPill>
          </div>

          <div className="request-review-grid">
            {managerPending.map((exchange) => (
              <article className="panel request-card" key={exchange.id}>
                <div>
                  <p className="eyebrow">
                    {exchange.kind === "COVERAGE" ? "Shift coverage" : "Direct swap"}
                  </p>
                  <h2>
                    {exchange.kind === "COVERAGE"
                      ? `${exchange.requestedByName} → ${exchange.targetEmployeeName ?? "Employee"}`
                      : `${exchange.requestedByName} ↔ ${exchange.targetEmployeeName ?? "Employee"}`}
                  </h2>
                  <p>
                    {shiftDate(exchange.sourceShift.date)} · {formatTime(exchange.sourceShift.startTime)} – {formatTime(exchange.sourceShift.endTime)} · {exchange.sourceShift.locationName}
                  </p>
                  {exchange.targetShift ? (
                    <p>
                      For {shiftDate(exchange.targetShift.date)} · {formatTime(exchange.targetShift.startTime)} – {formatTime(exchange.targetShift.endTime)} · {exchange.targetShift.locationName}
                    </p>
                  ) : null}
                </div>

                <form action={reviewExchangeAction} className="request-actions">
                  <input type="hidden" name="exchangeId" value={exchange.id} />
                  <button className="button secondary" name="decision" value="DENIED" type="submit">
                    Deny
                  </button>
                  <button className="button primary" name="decision" value="APPROVED" type="submit">
                    Approve
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {incomingSwaps.length ? (
        <section className="exchange-priority-section">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">Your response</p>
              <h2>Swap requests</h2>
            </div>
            <StatusPill tone="warning">{incomingSwaps.length} waiting</StatusPill>
          </div>

          <div className="request-review-grid">
            {incomingSwaps.map((exchange) => (
              <article className="panel request-card" key={exchange.id}>
                <div>
                  <p className="eyebrow">{exchange.requestedByName} wants to swap</p>
                  <h2>
                    {shiftDate(exchange.sourceShift.date)} · {formatTime(exchange.sourceShift.startTime)} – {formatTime(exchange.sourceShift.endTime)}
                  </h2>
                  <p>
                    In exchange for your {exchange.targetShift ? `${shiftDate(exchange.targetShift.date)} · ${formatTime(exchange.targetShift.startTime)} – ${formatTime(exchange.targetShift.endTime)}` : "shift"}.
                  </p>
                </div>

                <form action={respondSwapAction} className="request-actions">
                  <input type="hidden" name="exchangeId" value={exchange.id} />
                  <button className="button secondary" name="decision" value="DENIED" type="submit">
                    Decline
                  </button>
                  <button className="button primary" name="decision" value="ACCEPTED" type="submit">
                    Accept
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="exchange-workspace">
        <article className="panel exchange-pane">
          <div className="exchange-pane-header">
            <div>
              <p className="eyebrow">My upcoming shifts</p>
              <h2>Offer or trade a shift</h2>
            </div>
            <StatusPill>{myShifts.length}</StatusPill>
          </div>

          {myShifts.length ? (
            <div className="exchange-compact-list">
              {myShifts.map((shift) => (
                <div className="exchange-compact-row" key={shift.id}>
                  <div className="exchange-row-copy">
                    <strong>{shiftDate(shift.date)}</strong>
                    <span>
                      {formatTime(shift.startTime)} – {formatTime(shift.endTime)} · {shift.locationName}
                    </span>
                  </div>
                  <div className="exchange-row-actions">
                    <form action={offerCoverageAction}>
                      <input type="hidden" name="sourceShiftId" value={shift.id} />
                      <button className="button secondary" type="submit">Offer</button>
                    </form>
                    <Link
                      className="button primary"
                      href={`/app/exchange/swap?sourceShiftId=${shift.id}`}
                    >
                      Swap
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="exchange-empty-inline">
              <strong>No shifts available to exchange</strong>
              <span>Future published shifts will appear here automatically.</span>
            </div>
          )}
        </article>

        <article className="panel exchange-pane">
          <div className="exchange-pane-header">
            <div>
              <p className="eyebrow">Coverage board</p>
              <h2>Available shifts</h2>
            </div>
            <StatusPill tone={openCoverage.length ? "info" : "neutral"}>
              {openCoverage.length} open
            </StatusPill>
          </div>

          {openCoverage.length ? (
            <div className="exchange-compact-list">
              {openCoverage.map((exchange) => (
                <div className="exchange-compact-row" key={exchange.id}>
                  <div className="exchange-row-copy">
                    <strong>{shiftDate(exchange.sourceShift.date)}</strong>
                    <span>
                      {formatTime(exchange.sourceShift.startTime)} – {formatTime(exchange.sourceShift.endTime)} · {exchange.sourceShift.locationName}
                    </span>
                    <small>Offered by {exchange.requestedByName}</small>
                  </div>
                  <form action={claimCoverageAction}>
                    <input type="hidden" name="exchangeId" value={exchange.id} />
                    <button className="button primary" type="submit">Take Shift</button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <div className="exchange-empty-inline">
              <strong>No open shifts right now</strong>
              <span>Team coverage requests will appear here when someone offers a shift.</span>
            </div>
          )}
        </article>
      </section>

      <section className="exchange-history-section">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">History</p>
            <h2>My exchange activity</h2>
          </div>
        </div>

        <article className="panel exchange-history-panel">
          {activity.length ? (
            <div className="request-list">
              {activity.map((exchange) => (
                <div className="request-list-row" key={exchange.id}>
                  <div>
                    <strong>
                      {exchange.kind === "COVERAGE" ? "Coverage" : "Swap"} · {shiftDate(exchange.sourceShift.date)}
                    </strong>
                    <span>
                      {formatTime(exchange.sourceShift.startTime)} – {formatTime(exchange.sourceShift.endTime)} · {exchange.sourceShift.locationName}
                    </span>
                  </div>
                  <div className="activity-status">
                    <StatusPill
                      tone={
                        exchange.status === "APPROVED"
                          ? "success"
                          : ["OPEN", "EMPLOYEE_PENDING", "MANAGER_PENDING"].includes(exchange.status)
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {statusLabel(exchange.status)}
                    </StatusPill>
                    {exchange.requestedByEmployeeId === session.id &&
                    ["OPEN", "EMPLOYEE_PENDING"].includes(exchange.status) ? (
                      <form action={cancelExchangeAction}>
                        <input type="hidden" name="exchangeId" value={exchange.id} />
                        <button className="text-button danger" type="submit">Cancel</button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="exchange-empty-inline history-empty">
              <strong>No exchange activity yet</strong>
              <span>Your coverage and swap history will stay here once you start using it.</span>
            </div>
          )}
        </article>
      </section>
    </>
  );
}
