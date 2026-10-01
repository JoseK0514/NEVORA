import Link from "next/link";
import type { CSSProperties } from "react";
import { ManagerActionList } from "@/components/manager-action-list";
import { NavIcon } from "@/components/nav-icon";
import { StatusPill } from "@/components/status-pill";
import { TimeClockWidget } from "@/components/time-clock-widget";
import type { ManagerActionItem } from "@/lib/assistance/manager-actions";
import { formatDayLabel, formatTime } from "@/lib/date-utils";
import type { UserRole } from "@/lib/domain";

export type ManagerDashboardView =
  | "overview"
  | "schedule"
  | "team"
  | "requests"
  | "activity";

export type DashboardLocationItem = {
  locationId: string;
  locationName: string;
  state: "NOT_STARTED" | "NEEDS_ATTENTION" | "READY" | "PUBLISHED";
  totalBlocks: number;
  coveredBlocks: number;
  uncoveredBlocks: number;
  scheduleStatus?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export type DashboardDayItem = {
  date: string;
  weekday: string;
  day: string;
  shiftCount: number;
  gapCount: number;
};

export type DashboardHourItem = {
  employeeId: string;
  employeeName: string;
  scheduledHours: number;
  targetHours?: number;
  status: "UNDER" | "ON_TARGET" | "OVER" | "TARGET_MISSING";
};

export type DashboardRevisionItem = {
  revisionNumber: number;
  sourceType: string;
  createdAt: string;
} | null;

export type DashboardOnFloorItem = {
  employeeId: string;
  employeeName: string;
  startTime: string;
  endTime: string;
  isDesignatedLead: boolean;
};

export type DashboardScheduleShiftItem = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isDesignatedLead: boolean;
};

export type DashboardScheduleEmployeeItem = {
  employeeId: string;
  employeeName: string;
  role: UserRole;
  shifts: DashboardScheduleShiftItem[];
};

type Props = {
  firstName: string;
  weekStart: string;
  weekLabel: string;
  previousWeek: string;
  nextWeek: string;
  view: ManagerDashboardView;
  readyLocationCount: number;
  totalLocations: number;
  availabilitySubmitted: number;
  activeEmployees: number;
  unavailableAllWeek: number;
  coverageIssueCount: number;
  coverageConfigured: boolean;
  pendingRequestCount: number;
  managerActions: ManagerActionItem[];
  scheduleRoster: DashboardScheduleEmployeeItem[];
  onFloor: DashboardOnFloorItem[];
  locations: DashboardLocationItem[];
  days: DashboardDayItem[];
  hours: DashboardHourItem[];
  requestCounts: {
    timeOff: number;
    exchange: number;
    callout: number;
  };
  latestRevision: DashboardRevisionItem;
};

const tabs: Array<{ id: ManagerDashboardView; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "schedule", label: "Schedule" },
  { id: "team", label: "Team" },
  { id: "requests", label: "Requests" },
  { id: "activity", label: "Activity" },
];

function dashboardHref(
  weekStart: string,
  view: ManagerDashboardView,
) {
  return view === "overview"
    ? `/app?week=${encodeURIComponent(weekStart)}`
    : `/app?week=${encodeURIComponent(weekStart)}&view=${view}`;
}

function revisionSourceLabel(sourceType: string) {
  if (sourceType === "PUBLISH") return "Schedule published";
  if (sourceType === "EXCHANGE") return "Shift exchange applied";
  if (sourceType === "CALLOUT") return "Call-out applied";
  return "Published schedule updated";
}

function TeamAvailability({
  submitted,
  active,
  unavailable,
  weekStart,
}: {
  submitted: number;
  active: number;
  unavailable: number;
  weekStart: string;
}) {
  const percentage = active ? Math.round((submitted / active) * 100) : 0;
  const ringStyle = {
    "--dashboard-availability-progress": `${percentage}%`,
  } as CSSProperties;

  return (
    <section className="dashboard-panel dashboard-availability-panel">
      <div className="dashboard-panel-heading">
        <h2>Team availability</h2>
        <Link href={`/app/availability?week=${weekStart}`}>View details</Link>
      </div>

      <div className="dashboard-availability-body">
        <div className="dashboard-availability-ring" style={ringStyle}>
          <span>
            <strong>{percentage}%</strong>
            <small>{submitted}/{active}</small>
            <em>submitted</em>
          </span>
        </div>

        <div className="dashboard-availability-legend">
          <div>
            <span className="legend-dot submitted" />
            <span>Submitted</span>
            <strong>{submitted}</strong>
          </div>
          <div>
            <span className="legend-dot missing" />
            <span>Not submitted</span>
            <strong>{Math.max(0, active - submitted)}</strong>
          </div>
          {unavailable ? (
            <small>{unavailable} submitted unavailable all week</small>
          ) : (
            <small>Weekly availability status updates automatically.</small>
          )}
        </div>
      </div>
    </section>
  );
}

function scheduleRoleLabel(role: UserRole) {
  if (role === "OWNER") return "Owner";
  if (role === "MANAGER") return "Manager";
  if (role === "LEAD") return "Lead Barista";
  return "Barista";
}

function ScheduleTab(props: Props) {
  return (
    <section className="schedule-builder">
      <header className="schedule-builder-header">
        <div className="schedule-builder-week" aria-label="Schedule week">
          <Link
            href={dashboardHref(props.previousWeek, "schedule")}
            aria-label="Previous week"
          >
            ‹
          </Link>
          <strong>{props.weekLabel}</strong>
          <Link
            href={dashboardHref(props.nextWeek, "schedule")}
            aria-label="Next week"
          >
            ›
          </Link>
        </div>

        <Link
          className="schedule-builder-add"
          href={`/app/schedule/new?week=${props.weekStart}`}
        >
          + Add Shift
        </Link>
      </header>

      <div className="schedule-builder-roster">
        {props.scheduleRoster.map((employee) => (
          <div className="schedule-builder-row" key={employee.employeeId}>
            <div className="schedule-builder-employee">
              <strong>
                {employee.employeeName}
                <span> · {scheduleRoleLabel(employee.role)}</span>
              </strong>
            </div>

            <div
              className="schedule-builder-shifts"
              aria-label={`${employee.employeeName} shifts`}
            >
              {employee.shifts.map((shift) => {
                const day = formatDayLabel(shift.date).weekday;

                return (
                  <Link
                    className={
                      shift.isDesignatedLead
                        ? "schedule-shift-pill lead"
                        : "schedule-shift-pill"
                    }
                    href={`/app/schedule/edit?shiftId=${shift.id}`}
                    key={shift.id}
                  >
                    {shift.isDesignatedLead ? (
                      <span className="schedule-shift-lead-dot" aria-hidden="true" />
                    ) : null}
                    <span>{day}</span>
                    <strong>
                      {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                    </strong>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TeamTab(props: Props) {
  const targetMissing = props.hours.filter((item) => item.status === "TARGET_MISSING").length;
  const underOrOver = props.hours.filter(
    (item) => item.status === "UNDER" || item.status === "OVER",
  );

  return (
    <div className="dashboard-tab-layout">
      <section className="dashboard-team-summary">
        <div><span>Active employees</span><strong>{props.activeEmployees}</strong></div>
        <div><span>Availability submitted</span><strong>{props.availabilitySubmitted}/{props.activeEmployees}</strong></div>
        <div><span>Hour targets missing</span><strong>{targetMissing}</strong></div>
        <div><span>Hours to review</span><strong>{underOrOver.length}</strong></div>
      </section>

      <div className="dashboard-tab-two-column">
        <TeamAvailability
          submitted={props.availabilitySubmitted}
          active={props.activeEmployees}
          unavailable={props.unavailableAllWeek}
          weekStart={props.weekStart}
        />

        <section className="dashboard-panel dashboard-hours-panel">
          <div className="dashboard-panel-heading">
            <h2>Employee hours</h2>
            <Link href="/app/schedule/settings">Manage targets</Link>
          </div>
          <div className="dashboard-hours-list">
            {props.hours.length ? props.hours.slice(0, 8).map((item) => (
              <div key={item.employeeId}>
                <span>
                  <strong>{item.employeeName}</strong>
                  <small>
                    {item.targetHours === undefined
                      ? "Weekly target not set"
                      : `${item.scheduledHours}h scheduled · ${item.targetHours}h target`}
                  </small>
                </span>
                <StatusPill
                  tone={
                    item.status === "ON_TARGET"
                      ? "success"
                      : item.status === "TARGET_MISSING"
                        ? "neutral"
                        : "warning"
                  }
                >
                  {item.status === "UNDER"
                    ? "Below target"
                    : item.status === "OVER"
                      ? "Above target"
                      : item.status === "TARGET_MISSING"
                        ? "Target missing"
                        : "On target"}
                </StatusPill>
              </div>
            )) : (
              <div className="dashboard-empty-state compact">
                <strong>No hour data yet</strong>
                <span>Hour balance appears as shifts are scheduled.</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function RequestsTab(props: Props) {
  const requestActions = props.managerActions.filter((item) =>
    ["TIME_OFF", "EXCHANGE", "CALLOUT"].includes(item.type),
  );

  return (
    <div className="dashboard-tab-layout">
      <section className="dashboard-team-summary three">
        <div><span>Time off</span><strong>{props.requestCounts.timeOff}</strong></div>
        <div><span>Shift requests</span><strong>{props.requestCounts.exchange}</strong></div>
        <div><span>Call-outs</span><strong>{props.requestCounts.callout}</strong></div>
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-panel-heading">
          <div>
            <h2>Pending requests</h2>
            <p>Items waiting for a manager decision.</p>
          </div>
        </div>
        <ManagerActionList
          items={requestActions}
          emptyTitle="No pending requests"
          emptyDetail="There are no time-off, shift-exchange, or call-out requests waiting for review."
        />
      </section>
    </div>
  );
}

function ActivityTab(props: Props) {
  const datedActions = props.managerActions
    .filter((item) => Boolean(item.dateTime))
    .slice(0, 8);

  return (
    <div className="dashboard-tab-layout">
      <section className="dashboard-panel dashboard-activity-panel">
        <div className="dashboard-panel-heading">
          <div>
            <h2>Current activity</h2>
            <p>Recent schedule publication and active operational events.</p>
          </div>
        </div>

        <div className="dashboard-activity-list">
          {props.latestRevision ? (
            <div>
              <span className="dashboard-activity-icon">
                <NavIcon name="schedule" size={18} />
              </span>
              <span>
                <strong>{revisionSourceLabel(props.latestRevision.sourceType)}</strong>
                <small>
                  Revision {props.latestRevision.revisionNumber} · {new Date(props.latestRevision.createdAt).toLocaleString("en-US", {
                    timeZone: "America/Puerto_Rico",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </small>
              </span>
            </div>
          ) : null}

          {datedActions.map((item) => (
            <div key={item.id}>
              <span className="dashboard-activity-icon">
                <NavIcon name={item.type === "TIME_OFF" ? "timeOff" : item.type === "EXCHANGE" || item.type === "CALLOUT" ? "exchange" : "coverage"} size={18} />
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </span>
              <Link href={item.href}>Open</Link>
            </div>
          ))}

          {!props.latestRevision && !datedActions.length ? (
            <div className="dashboard-empty-state">
              <strong>No recent activity</strong>
              <span>New schedule publications and employee requests will appear here.</span>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function employeeInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function PendingApprovals({ items }: { items: ManagerActionItem[] }) {
  const approvals = items
    .filter((item) => ["TIME_OFF", "EXCHANGE", "CALLOUT"].includes(item.type))
    .slice(0, 6);

  return (
    <section className="manager-home-card manager-approvals-card">
      <div className="manager-home-card-header">
        <h2>Pending Approvals</h2>
        <span className="manager-home-count">{approvals.length}</span>
      </div>

      {approvals.length ? (
        <div className="manager-home-list">
          {approvals.map((item) => (
            <div className="manager-home-row" key={item.id}>
              <div className="manager-home-row-copy">
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </div>
              <Link className="manager-home-action" href={item.href}>
                Review
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="manager-home-empty">
          <span aria-hidden="true">✓</span>
          <strong>All caught up</strong>
          <small>No approvals are waiting for review.</small>
        </div>
      )}
    </section>
  );
}

function OnFloorNow({ people }: { people: DashboardOnFloorItem[] }) {
  return (
    <section className="manager-home-card manager-floor-card">
      <div className="manager-home-card-header">
        <h2>Who&apos;s on the Floor Right Now</h2>
        <span className="manager-home-count">{people.length}</span>
      </div>

      {people.length ? (
        <div className="manager-home-list">
          {people.map((person) => (
            <div className="manager-floor-row" key={person.employeeId}>
              <div className="manager-floor-person">
                <span className="manager-floor-avatar" aria-hidden="true">
                  {employeeInitials(person.employeeName)}
                </span>
                <span className="manager-floor-copy">
                  <strong>{person.employeeName}</strong>
                  <small>
                    {person.isDesignatedLead ? "Shift lead · " : ""}
                    {formatTime(person.startTime)} – {formatTime(person.endTime)}
                  </small>
                </span>
              </div>
              <span className="manager-floor-status">On shift</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="manager-home-empty">
          <strong>No one is scheduled right now</strong>
          <small>The published schedule has no active shift at this time.</small>
        </div>
      )}
    </section>
  );
}

export function ManagerDashboard(props: Props) {
  return (
    <div
      className={
        props.view === "overview"
          ? "manager-dashboard-v3 dashboard-overview-active"
          : "manager-dashboard-v3"
      }
    >
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p>Manager dashboard</p>
          <h1>Welcome back, {props.firstName}.</h1>
          <span>Here’s what’s happening this week at Fuel.</span>
        </div>

        {props.view !== "schedule" ? (
          <div className="dashboard-hero-actions">
            <div className="dashboard-week-nav">
              <Link
                href={dashboardHref(props.previousWeek, props.view)}
                aria-label="Previous week"
              >
                ‹
              </Link>
              <span className="dashboard-week-label">
                <NavIcon name="calendar" size={16} />
                <strong>{props.weekLabel}</strong>
              </span>
              <Link
                href={dashboardHref(props.nextWeek, props.view)}
                aria-label="Next week"
              >
                ›
              </Link>
            </div>
            <Link className="button primary" href={`/app/schedule?week=${props.weekStart}`}>
              <NavIcon name="calendar" size={17} />
              Open schedule
            </Link>
          </div>
        ) : null}
      </section>

      <nav className="dashboard-tabs" aria-label="Dashboard views">
        {tabs.map((tab) => (
          <Link
            className={props.view === tab.id ? "active" : ""}
            href={dashboardHref(props.weekStart, tab.id)}
            key={tab.id}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {props.view === "overview" ? (
        <div className="manager-home-grid">
          <PendingApprovals items={props.managerActions} />
          <div className="manager-home-right">
            <TimeClockWidget />
            <OnFloorNow people={props.onFloor} />
          </div>
        </div>
      ) : props.view === "schedule" ? (
        <ScheduleTab {...props} />
      ) : props.view === "team" ? (
        <TeamTab {...props} />
      ) : props.view === "requests" ? (
        <RequestsTab {...props} />
      ) : (
        <ActivityTab {...props} />
      )}
    </div>
  );
}
