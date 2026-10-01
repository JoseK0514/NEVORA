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
  marketplaceDisplayName,
  marketplaceRoleLabel,
  marketplaceView,
} from "@/lib/exchange-marketplace";
import {
  listEmployeeCallouts,
  listPendingCallouts,
} from "@/lib/data/callouts";
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
import {
  cancelCalloutAction,
  reviewCalloutAction,
} from "@/app/app/exchange/callout/actions";

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
  CALLOUT_EXISTS: "This shift already has an active call-out request.",
};

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function statusTone(status: string) {
  if (status === "APPROVED") return "success" as const;
  if (["OPEN", "EMPLOYEE_PENDING", "MANAGER_PENDING"].includes(status)) {
    return "warning" as const;
  }
  return "neutral" as const;
}

function calloutReason(code: string) {
  const labels: Record<string, string> = {
    ILLNESS: "Illness / sick",
    FAMILY_EMERGENCY: "Family emergency",
    TRANSPORTATION: "Transportation issue",
    SCHOOL: "School conflict",
    PERSONAL_EMERGENCY: "Personal emergency",
    OTHER: "Other",
  };
  return labels[code] ?? code;
}

function marketplaceDate(date: string) {
  const label = formatDayLabel(date);
  return `${label.weekday}, ${label.day}`;
}

function MarketplaceEmptyState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="marketplace-empty">
      <span aria-hidden="true">✓</span>
      <strong>{title}</strong>
      <small>{detail}</small>
    </div>
  );
}

function MarketplaceSectionHeading({ children }: { children: string }) {
  return <h2 className="marketplace-section-title">{children}</h2>;
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
    calloutSubmitted?: string;
    calloutApproved?: string;
    calloutDenied?: string;
    calloutCancelled?: string;
    tab?: string;
  }>;
}) {
  const session = await requireSession();
  const manager = isManagerRole(session.role);
  const today = currentDateInPuertoRico();
  const params = await searchParams;

  const [
    myShifts,
    openCoverage,
    incomingSwaps,
    activity,
    managerPending,
    myCallouts,
    managerCallouts,
  ] = await Promise.all([
    listEmployeePublishedShifts(session.id, today),
    listOpenCoverage(session.id, today),
    listIncomingSwaps(session.id),
    listEmployeeExchangeActivity(session.id),
    manager ? listManagerPendingExchanges() : Promise.resolve([]),
    listEmployeeCallouts(session.id),
    manager ? listPendingCallouts() : Promise.resolve([]),
  ]);

  const activeView = marketplaceView(params.tab);
  const myExchangeActivity = activity.filter(
    (exchange) => exchange.requestedByEmployeeId === session.id,
  );
  const successMessage =
    params.offered
      ? "Your shift is now available for another eligible employee to claim."
      : params.claimed
        ? "Coverage request sent to management."
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
                    : params.calloutSubmitted
                      ? "Call-out submitted for manager review."
                      : params.calloutApproved
                        ? "Call-out approved. The shift is now open for coverage."
                        : params.calloutDenied
                          ? "The call-out request was declined."
                          : params.calloutCancelled
                            ? "The pending call-out was cancelled."
                            : undefined;

  const hasTradeRequests =
    myShifts.length > 0 ||
    incomingSwaps.length > 0 ||
    myExchangeActivity.length > 0 ||
    myCallouts.length > 0 ||
    managerPending.length > 0 ||
    managerCallouts.length > 0;

  return (
    <div className="exchange-page marketplace-page">
      <PageHeader
        eyebrow="Schedule flexibility"
        title="Shift Marketplace"
        description="Pick up an available shift or manage your trade requests in one place."
      />

      {params.error ? (
        <p className="form-error">
          {ERROR_MESSAGES[params.error] ?? "The exchange could not be processed."}
        </p>
      ) : null}
      {successMessage ? <p className="form-success">{successMessage}</p> : null}

      <section className="shift-marketplace-card">
        <nav className="marketplace-segmented" aria-label="Shift marketplace views">
          <Link
            className={activeView === "available" ? "selected" : ""}
            href="/app/exchange?tab=available"
            aria-current={activeView === "available" ? "page" : undefined}
          >
            Available Shifts
          </Link>
          <Link
            className={activeView === "requests" ? "selected" : ""}
            href="/app/exchange?tab=requests"
            aria-current={activeView === "requests" ? "page" : undefined}
          >
            Your Trade Requests
          </Link>
        </nav>

        {activeView === "available" ? (
          <div className="marketplace-view">
            {openCoverage.length ? (
              <div className="marketplace-offer-list">
                {openCoverage.map((exchange) => (
                  <div className="marketplace-offer-row" key={exchange.id}>
                    <div className="marketplace-offer-copy">
                      <strong>
                        {marketplaceDisplayName(exchange.requestedByName)} ·{" "}
                        {marketplaceRoleLabel(exchange.requestedByRole)}
                      </strong>
                      <span>
                        {marketplaceDate(exchange.sourceShift.date)} ·{" "}
                        {formatTime(exchange.sourceShift.startTime)} –{" "}
                        {formatTime(exchange.sourceShift.endTime)}
                      </span>
                    </div>

                    <form action={claimCoverageAction}>
                      <input type="hidden" name="exchangeId" value={exchange.id} />
                      <button className="marketplace-claim" type="submit">
                        Claim Shift
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <MarketplaceEmptyState
                title="The shift board is clear"
                detail="Check back later for available open shifts."
              />
            )}
          </div>
        ) : (
          <div className="marketplace-view marketplace-requests-view">
            {hasTradeRequests ? (
              <>
                {myShifts.length ? (
                  <section className="marketplace-request-section">
                    <MarketplaceSectionHeading>Start a Trade</MarketplaceSectionHeading>
                    <div className="marketplace-request-list">
                      {myShifts.map((shift) => (
                        <div className="marketplace-request-row" key={shift.id}>
                          <div className="marketplace-request-copy">
                            <strong>
                              {marketplaceDate(shift.date)} · {formatTime(shift.startTime)} –{" "}
                              {formatTime(shift.endTime)}
                            </strong>
                            <span>{shift.locationName}</span>
                          </div>
                          <div className="marketplace-row-actions">
                            <Link
                              className="marketplace-text-action danger"
                              href={`/app/exchange/callout?shiftId=${shift.id}`}
                            >
                              Unable to Work
                            </Link>
                            <form action={offerCoverageAction}>
                              <input type="hidden" name="sourceShiftId" value={shift.id} />
                              <button className="marketplace-secondary-action" type="submit">
                                Offer Shift
                              </button>
                            </form>
                            <Link
                              className="marketplace-primary-action"
                              href={`/app/exchange/swap?sourceShiftId=${shift.id}`}
                            >
                              Trade Shift
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {incomingSwaps.length ? (
                  <section className="marketplace-request-section">
                    <MarketplaceSectionHeading>Waiting for You</MarketplaceSectionHeading>
                    <div className="marketplace-request-list">
                      {incomingSwaps.map((exchange) => (
                        <div className="marketplace-request-row" key={exchange.id}>
                          <div className="marketplace-request-copy">
                            <strong>{marketplaceDisplayName(exchange.requestedByName)} wants to trade</strong>
                            <span>
                              {marketplaceDate(exchange.sourceShift.date)} ·{" "}
                              {formatTime(exchange.sourceShift.startTime)} –{" "}
                              {formatTime(exchange.sourceShift.endTime)}
                            </span>
                          </div>
                          <form action={respondSwapAction} className="marketplace-row-actions">
                            <input type="hidden" name="exchangeId" value={exchange.id} />
                            <button
                              className="marketplace-secondary-action"
                              name="decision"
                              value="DENIED"
                              type="submit"
                            >
                              Decline
                            </button>
                            <button
                              className="marketplace-primary-action"
                              name="decision"
                              value="ACCEPTED"
                              type="submit"
                            >
                              Accept
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {myExchangeActivity.length ? (
                  <section className="marketplace-request-section">
                    <MarketplaceSectionHeading>Your Requests</MarketplaceSectionHeading>
                    <div className="marketplace-request-list">
                      {myExchangeActivity.slice(0, 8).map((exchange) => (
                        <div className="marketplace-request-row" key={exchange.id}>
                          <div className="marketplace-request-copy">
                            <strong>
                              {exchange.kind === "COVERAGE" ? "Coverage" : "Trade"} ·{" "}
                              {marketplaceDate(exchange.sourceShift.date)}
                            </strong>
                            <span>
                              {formatTime(exchange.sourceShift.startTime)} –{" "}
                              {formatTime(exchange.sourceShift.endTime)}
                            </span>
                          </div>
                          <div className="marketplace-row-actions">
                            <StatusPill tone={statusTone(exchange.status)}>
                              {statusLabel(exchange.status)}
                            </StatusPill>
                            {["OPEN", "EMPLOYEE_PENDING"].includes(exchange.status) ? (
                              <form action={cancelExchangeAction}>
                                <input type="hidden" name="exchangeId" value={exchange.id} />
                                <button className="marketplace-text-action danger" type="submit">
                                  Cancel
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {myCallouts.length ? (
                  <section className="marketplace-request-section">
                    <MarketplaceSectionHeading>Unable-to-Work Requests</MarketplaceSectionHeading>
                    <div className="marketplace-request-list">
                      {myCallouts.slice(0, 6).map((callout) => (
                        <div className="marketplace-request-row" key={callout.id}>
                          <div className="marketplace-request-copy">
                            <strong>
                              {marketplaceDate(callout.date)} · {formatTime(callout.startTime)} –{" "}
                              {formatTime(callout.endTime)}
                            </strong>
                            <span>{calloutReason(callout.reasonCode)}</span>
                          </div>
                          <div className="marketplace-row-actions">
                            <StatusPill tone={statusTone(callout.status)}>
                              {statusLabel(callout.status)}
                            </StatusPill>
                            {callout.status === "PENDING" ? (
                              <form action={cancelCalloutAction}>
                                <input type="hidden" name="calloutId" value={callout.id} />
                                <button className="marketplace-text-action danger" type="submit">
                                  Cancel
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {managerPending.length || managerCallouts.length ? (
                  <section className="marketplace-request-section">
                    <MarketplaceSectionHeading>Manager Review</MarketplaceSectionHeading>
                    <div className="marketplace-request-list">
                      {managerPending.map((exchange) => (
                        <div className="marketplace-request-row" key={exchange.id}>
                          <div className="marketplace-request-copy">
                            <strong>
                              {exchange.kind === "COVERAGE" ? "Coverage" : "Trade"} ·{" "}
                              {marketplaceDisplayName(exchange.requestedByName)}
                            </strong>
                            <span>
                              {marketplaceDate(exchange.sourceShift.date)} ·{" "}
                              {formatTime(exchange.sourceShift.startTime)} –{" "}
                              {formatTime(exchange.sourceShift.endTime)}
                            </span>
                          </div>
                          <form action={reviewExchangeAction} className="marketplace-row-actions">
                            <input type="hidden" name="exchangeId" value={exchange.id} />
                            <button
                              className="marketplace-secondary-action"
                              name="decision"
                              value="DENIED"
                              type="submit"
                            >
                              Decline
                            </button>
                            <button
                              className="marketplace-primary-action"
                              name="decision"
                              value="APPROVED"
                              type="submit"
                            >
                              Approve
                            </button>
                          </form>
                        </div>
                      ))}

                      {managerCallouts.map((callout) => (
                        <div className="marketplace-request-row" key={callout.id}>
                          <div className="marketplace-request-copy">
                            <strong>{callout.employeeName} · Unable to Work</strong>
                            <span>
                              {marketplaceDate(callout.date)} · {formatTime(callout.startTime)} –{" "}
                              {formatTime(callout.endTime)} · {calloutReason(callout.reasonCode)}
                            </span>
                          </div>
                          <form action={reviewCalloutAction} className="marketplace-row-actions">
                            <input type="hidden" name="calloutId" value={callout.id} />
                            <button
                              className="marketplace-secondary-action"
                              name="decision"
                              value="DENIED"
                              type="submit"
                            >
                              Decline
                            </button>
                            <button
                              className="marketplace-primary-action"
                              name="decision"
                              value="APPROVED"
                              type="submit"
                            >
                              Approve
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </>
            ) : (
              <MarketplaceEmptyState
                title="No trade requests yet"
                detail="Your offers, swaps, and coverage requests will appear here."
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}