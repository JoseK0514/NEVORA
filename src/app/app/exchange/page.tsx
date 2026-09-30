import Link from "next/link";
import "./exchange-premium.css";
import { NavIcon } from "@/components/nav-icon";
import { StatusPill } from "@/components/status-pill";
import { isManagerRole } from "@/lib/auth/permissions";
import {
  listEmployeeCallouts,
  listPendingCallouts,
} from "@/lib/data/callouts";
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

function shiftDate(date: string) {
  const label = formatDayLabel(date);
  return `${label.weekday} · ${label.day}`;
}

function tabClass(active: boolean) {
  return active ? "selected" : "";
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

  const validTabs = ["my", "coverage", "requests", "history"];
  const activeTab = validTabs.includes(params.tab ?? "") ? params.tab! : "my";
  const myPendingCallouts = myCallouts.filter(
    (callout) => callout.status === "PENDING",
  );
  const requestCount =
    incomingSwaps.length +
    managerPending.length +
    managerCallouts.length +
    myPendingCallouts.length;

  const offeredCount = activity.filter(
    (exchange) =>
      exchange.kind === "COVERAGE" &&
      exchange.requestedByEmployeeId === session.id &&
      ["OPEN", "MANAGER_PENDING"].includes(exchange.status),
  ).length;
  const tradeCount = activity.filter(
    (exchange) =>
      exchange.kind === "SWAP" &&
      (exchange.requestedByEmployeeId === session.id ||
        exchange.targetEmployeeId === session.id) &&
      ["EMPLOYEE_PENDING", "MANAGER_PENDING"].includes(exchange.status),
  ).length;
  const unableCount = myPendingCallouts.length;
  const pendingPersonalCount =
    activity.filter(
      (exchange) =>
        (exchange.requestedByEmployeeId === session.id ||
          exchange.targetEmployeeId === session.id) &&
        ["OPEN", "EMPLOYEE_PENDING", "MANAGER_PENDING"].includes(exchange.status),
    ).length + myPendingCallouts.length;

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
                    : params.calloutSubmitted
                      ? "Call-out submitted for manager review."
                      : params.calloutApproved
                        ? "Call-out approved. The shift is now open for coverage."
                        : params.calloutDenied
                          ? "The call-out request was declined."
                          : params.calloutCancelled
                            ? "The pending call-out was cancelled."
                            : undefined;

  return (
    <div className="exchange-page">
      <section className="exchange-hero">
        <div className="exchange-hero-copy">
          <p>Shift exchange</p>
          <h1>Manage your shifts</h1>
          <span>
            Offer a shift, find coverage, trade with a coworker, or report that you are unable to work.
          </span>
        </div>
      </section>

      {params.error ? (
        <p className="form-error">
          {ERROR_MESSAGES[params.error] ?? "The exchange could not be processed."}
        </p>
      ) : null}
      {successMessage ? <p className="form-success">{successMessage}</p> : null}

      <nav className="exchange-tabs" aria-label="Shift exchange sections">
        <Link
          className={tabClass(activeTab === "my")}
          href="/app/exchange?tab=my"
          aria-current={activeTab === "my" ? "page" : undefined}
        >
          <NavIcon name="calendar" size={16} />
          My Shifts
          {myShifts.length ? <span className="exchange-tab-count">{myShifts.length}</span> : null}
        </Link>
        <Link
          className={tabClass(activeTab === "coverage")}
          href="/app/exchange?tab=coverage"
          aria-current={activeTab === "coverage" ? "page" : undefined}
        >
          <NavIcon name="employees" size={16} />
          Coverage
          {openCoverage.length ? <span className="exchange-tab-count">{openCoverage.length}</span> : null}
        </Link>
        <Link
          className={tabClass(activeTab === "requests")}
          href="/app/exchange?tab=requests"
          aria-current={activeTab === "requests" ? "page" : undefined}
        >
          <NavIcon name="exchange" size={16} />
          Requests
          {requestCount ? (
            <span className="exchange-tab-count attention">{requestCount}</span>
          ) : null}
        </Link>
        <Link
          className={tabClass(activeTab === "history")}
          href="/app/exchange?tab=history"
          aria-current={activeTab === "history" ? "page" : undefined}
        >
          <NavIcon name="clock" size={16} />
          History
        </Link>
      </nav>

      <section className="exchange-main-layout">
        <section className="exchange-focus-workspace">
        {activeTab === "my" ? (
          <article className="panel exchange-focus-panel exchange-my-shifts-panel">
            <div className="exchange-focus-heading">
              <div>
                <h2>My upcoming shifts</h2>
                <p>Here are your scheduled shifts. Take action if needed.</p>
              </div>
            </div>

            {myShifts.length ? (
              <div className="exchange-shift-list">
                {myShifts.map((shift) => (
                  <div className="exchange-shift-row" key={shift.id}>
                    <div className="exchange-shift-date">
                      <strong>{shiftDate(shift.date)}</strong>
                      <span>{shift.locationName}</span>
                    </div>
                    <div className="exchange-shift-time">
                      <strong>{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</strong>
                    </div>
                    <div className="exchange-shift-actions three-actions">
                      <Link
                        className="button danger-button"
                        href={`/app/exchange/callout?shiftId=${shift.id}`}
                      >
                        Unable to work
                      </Link>
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
              <div className="exchange-focused-empty exchange-my-empty">
                <span className="exchange-empty-mark exchange-empty-calendar" aria-hidden="true">
                  <NavIcon name="calendar" size={28} />
                </span>
                <strong>No upcoming shifts right now</strong>
                <span>Your future published shifts will appear here automatically.</span>
                <div className="exchange-empty-actions">
                  <Link className="button primary" href="/app/schedule">
                    <NavIcon name="calendar" size={16} />
                    View schedule
                  </Link>
                  <a className="button secondary" href="#exchange-help">
                    <NavIcon name="requests" size={16} />
                    Learn how shift exchange works
                  </a>
                </div>
              </div>
            )}
          </article>
        ) : null}

        {activeTab === "coverage" ? (
          <article className="panel exchange-focus-panel">
            <div className="exchange-focus-heading">
              <div>
                <p className="eyebrow">Coverage board</p>
                <h2>Available coverage</h2>
                <p>Pick up an eligible shift that a coworker has offered.</p>
              </div>
            </div>

            {openCoverage.length ? (
              <div className="exchange-shift-list">
                {openCoverage.map((exchange) => (
                  <div className="exchange-shift-row" key={exchange.id}>
                    <div className="exchange-shift-date">
                      <strong>{shiftDate(exchange.sourceShift.date)}</strong>
                      <span>{exchange.sourceShift.locationName}</span>
                    </div>
                    <div className="exchange-shift-time">
                      <strong>
                        {formatTime(exchange.sourceShift.startTime)} – {formatTime(exchange.sourceShift.endTime)}
                      </strong>
                      <span>Offered by {exchange.requestedByName}</span>
                    </div>
                    <div className="exchange-shift-actions single">
                      <form action={claimCoverageAction}>
                        <input type="hidden" name="exchangeId" value={exchange.id} />
                        <button className="button primary" type="submit">Take shift</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="exchange-focused-empty">
                <span className="exchange-empty-mark" aria-hidden="true">—</span>
                <strong>No shifts available right now</strong>
                <span>When a coworker offers a shift, you will see it here.</span>
              </div>
            )}
          </article>
        ) : null}

        {activeTab === "requests" ? (
          <div className="exchange-requests-view">
            {managerCallouts.length ? (
              <section className="exchange-request-section">
                <div className="exchange-section-heading">
                  <div>
                    <p className="eyebrow">Call-outs</p>
                    <h2>Unable-to-work requests</h2>
                  </div>
                  <StatusPill tone="warning">
                    {managerCallouts.length} pending
                  </StatusPill>
                </div>

                <div className="exchange-request-cards">
                  {managerCallouts.map((callout) => (
                    <article className="panel exchange-request-card" key={callout.id}>
                      <div className="exchange-request-copy">
                        <span className="exchange-request-kind">Call-out request</span>
                        <h3>{callout.employeeName}</h3>
                        <p>
                          {shiftDate(callout.date)} · {formatTime(callout.startTime)} – {formatTime(callout.endTime)}
                        </p>
                        <span>{callout.locationName}</span>
                        <p className="exchange-secondary-shift">
                          {calloutReason(callout.reasonCode)}
                          {callout.reasonNote ? ` · ${callout.reasonNote}` : ""}
                        </p>
                      </div>

                      <form action={reviewCalloutAction} className="exchange-request-actions">
                        <input type="hidden" name="calloutId" value={callout.id} />
                        <button
                          className="button secondary"
                          name="decision"
                          value="DENIED"
                          type="submit"
                        >
                          Decline
                        </button>
                        <button
                          className="button primary"
                          name="decision"
                          value="APPROVED"
                          type="submit"
                        >
                          Approve & open coverage
                        </button>
                      </form>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {myCallouts.length ? (
              <section className="exchange-request-section">
                <div className="exchange-section-heading">
                  <div>
                    <p className="eyebrow">My call-outs</p>
                    <h2>Unable-to-work requests</h2>
                  </div>
                </div>

                <div className="exchange-request-cards">
                  {myCallouts.slice(0, 6).map((callout) => (
                    <article className="panel exchange-request-card" key={callout.id}>
                      <div className="exchange-request-copy">
                        <span className="exchange-request-kind">
                          {calloutReason(callout.reasonCode)}
                        </span>
                        <h3>
                          {shiftDate(callout.date)} · {formatTime(callout.startTime)} – {formatTime(callout.endTime)}
                        </h3>
                        <p>{callout.locationName}</p>
                        {callout.reasonNote ? (
                          <p className="exchange-secondary-shift">{callout.reasonNote}</p>
                        ) : null}
                      </div>

                      <div className="callout-status-row">
                        <StatusPill tone={statusTone(callout.status)}>
                          {statusLabel(callout.status)}
                        </StatusPill>
                        {callout.status === "PENDING" ? (
                          <form action={cancelCalloutAction}>
                            <input type="hidden" name="calloutId" value={callout.id} />
                            <button className="text-button danger" type="submit">
                              Cancel request
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
            {managerPending.length ? (
              <section className="exchange-request-section">
                <div className="exchange-section-heading">
                  <div>
                    <p className="eyebrow">Manager approval</p>
                    <h2>Needs your review</h2>
                  </div>
                  <StatusPill tone="warning">{managerPending.length} pending</StatusPill>
                </div>

                <div className="exchange-request-cards">
                  {managerPending.map((exchange) => (
                    <article className="panel exchange-request-card" key={exchange.id}>
                      <div className="exchange-request-copy">
                        <span className="exchange-request-kind">
                          {exchange.kind === "COVERAGE" ? "Coverage request" : "Direct swap"}
                        </span>
                        <h3>
                          {exchange.kind === "COVERAGE"
                            ? `${exchange.requestedByName} → ${exchange.targetEmployeeName ?? "Employee"}`
                            : `${exchange.requestedByName} ↔ ${exchange.targetEmployeeName ?? "Employee"}`}
                        </h3>
                        <p>
                          {shiftDate(exchange.sourceShift.date)} · {formatTime(exchange.sourceShift.startTime)} – {formatTime(exchange.sourceShift.endTime)}
                        </p>
                        <span>{exchange.sourceShift.locationName}</span>
                        {exchange.targetShift ? (
                          <p className="exchange-secondary-shift">
                            For {shiftDate(exchange.targetShift.date)} · {formatTime(exchange.targetShift.startTime)} – {formatTime(exchange.targetShift.endTime)} · {exchange.targetShift.locationName}
                          </p>
                        ) : null}
                      </div>

                      <form action={reviewExchangeAction} className="exchange-request-actions">
                        <input type="hidden" name="exchangeId" value={exchange.id} />
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
              </section>
            ) : null}

            {incomingSwaps.length ? (
              <section className="exchange-request-section">
                <div className="exchange-section-heading">
                  <div>
                    <p className="eyebrow">Your response</p>
                    <h2>Swap requests</h2>
                  </div>
                  <StatusPill tone="warning">{incomingSwaps.length} waiting</StatusPill>
                </div>

                <div className="exchange-request-cards">
                  {incomingSwaps.map((exchange) => (
                    <article className="panel exchange-request-card" key={exchange.id}>
                      <div className="exchange-request-copy">
                        <span className="exchange-request-kind">Swap request</span>
                        <h3>{exchange.requestedByName} wants to trade shifts</h3>
                        <p>
                          Their shift · {shiftDate(exchange.sourceShift.date)} · {formatTime(exchange.sourceShift.startTime)} – {formatTime(exchange.sourceShift.endTime)}
                        </p>
                        {exchange.targetShift ? (
                          <p className="exchange-secondary-shift">
                            Your shift · {shiftDate(exchange.targetShift.date)} · {formatTime(exchange.targetShift.startTime)} – {formatTime(exchange.targetShift.endTime)}
                          </p>
                        ) : null}
                      </div>

                      <form action={respondSwapAction} className="exchange-request-actions">
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

            {!requestCount ? (
              <article className="panel exchange-focus-panel exchange-empty-panel">
                <div className="exchange-focused-empty">
                  <span className="exchange-empty-mark" aria-hidden="true">✓</span>
                  <strong>No requests need your attention</strong>
                  <span>Call-outs, coverage approvals, and swap requests will appear here.</span>
                </div>
              </article>
            ) : null}
          </div>
        ) : null}

        {activeTab === "history" ? (
          <article className="panel exchange-focus-panel">
            <div className="exchange-focus-heading">
              <div>
                <p className="eyebrow">History</p>
                <h2>Exchange activity</h2>
                <p>Review your previous coverage and swap requests.</p>
              </div>
            </div>

            {activity.length ? (
              <div className="exchange-history-list">
                {activity.map((exchange) => (
                  <div className="exchange-history-row" key={exchange.id}>
                    <div>
                      <strong>
                        {exchange.kind === "COVERAGE" ? "Coverage" : "Swap"} · {shiftDate(exchange.sourceShift.date)}
                      </strong>
                      <span>
                        {formatTime(exchange.sourceShift.startTime)} – {formatTime(exchange.sourceShift.endTime)} · {exchange.sourceShift.locationName}
                      </span>
                    </div>
                    <div className="activity-status">
                      <StatusPill tone={statusTone(exchange.status)}>
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
              <div className="exchange-focused-empty">
                <span className="exchange-empty-mark" aria-hidden="true">—</span>
                <strong>No exchange activity yet</strong>
                <span>Your coverage and swap history will appear here once you start using it.</span>
              </div>
            )}
          </article>
        ) : null}
        </section>

        <aside className="exchange-side-rail">
          <section className="exchange-side-card exchange-overview-card">
            <div className="exchange-side-heading">
              <span>
                <NavIcon name="requests" size={18} />
                <strong>Request overview</strong>
              </span>
              <Link href="/app/exchange?tab=requests">View all</Link>
            </div>

            <div className="exchange-overview-list">
              <Link href="/app/exchange?tab=history">
                <span className="offered"><NavIcon name="timeOff" size={17} /></span>
                <strong>Shifts offered</strong>
                <b>{offeredCount}</b>
                <em>›</em>
              </Link>
              <Link href="/app/exchange?tab=requests">
                <span className="trades"><NavIcon name="exchange" size={17} /></span>
                <strong>Trades</strong>
                <b>{tradeCount}</b>
                <em>›</em>
              </Link>
              <Link href="/app/exchange?tab=requests">
                <span className="unable"><NavIcon name="employee" size={17} /></span>
                <strong>Unable to work</strong>
                <b>{unableCount}</b>
                <em>›</em>
              </Link>
              <Link href="/app/exchange?tab=requests">
                <span className="pending"><NavIcon name="clock" size={17} /></span>
                <strong>Pending</strong>
                <b>{pendingPersonalCount}</b>
                <em>›</em>
              </Link>
            </div>
          </section>

          <details className="exchange-side-card exchange-how-card" id="exchange-help" open>
            <summary>
              <span>
                <NavIcon name="templates" size={18} />
                <strong>How shift exchange works</strong>
              </span>
              <b aria-hidden="true">⌄</b>
            </summary>
            <div className="exchange-steps">
              <div>
                <span>1</span>
                <p><strong>Choose a shift</strong><small>Select one of your upcoming shifts.</small></p>
              </div>
              <div>
                <span>2</span>
                <p><strong>Offer, trade, or report</strong><small>Pick the option that fits your situation.</small></p>
              </div>
              <div>
                <span>3</span>
                <p><strong>Management reviews</strong><small>You’ll be notified once a decision is made.</small></p>
              </div>
              <div>
                <span>4</span>
                <p><strong>Track the outcome</strong><small>Check the Requests tab for updates.</small></p>
              </div>
            </div>
          </details>

          <section className="exchange-team-card" aria-label="Fuel Coffee Drive">
            <div>
              <strong>Different shifts.<br />Same team.</strong>
              <small>People Fuel Possibility.</small>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
