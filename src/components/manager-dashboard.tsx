import Link from "next/link";
import type { CSSProperties } from "react";
import { ManagerActionList } from "@/components/manager-action-list";
import { NavIcon } from "@/components/nav-icon";
import { StatusPill } from "@/components/status-pill";
import type { ManagerActionItem } from "@/lib/assistance/manager-actions";

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

function metricTone(
  kind: "schedule" | "availability" | "coverage" | "requests",
) {
  return `dashboard-metric-icon ${kind}`;
}

function locationStateLabel(state: DashboardLocationItem["state"]) {
  if (state === "PUBLISHED") return "Published";
  if (state === "READY") return "Ready";
  if (state === "NEEDS_ATTENTION") return "Needs attention";
  return "Not started";
}

function locationTone(state: DashboardLocationItem["state"]) {
  if (state === "PUBLISHED" || state === "READY") return "success" as const;
  if (state === "NEEDS_ATTENTION") return "warning" as const;
  return "neutral" as const;
}

function revisionSourceLabel(sourceType: string) {
  if (sourceType === "PUBLISH") return "Schedule published";
  if (sourceType === "EXCHANGE") return "Shift exchange applied";
  if (sourceType === "CALLOUT") return "Call-out applied";
  return "Published schedule updated";
}

function OverviewMetrics(props: Props) {
  const metrics = [
    {
      label: "Schedule",
      value: `${props.readyLocationCount}/${props.totalLocations}`,
      detail: "locations ready",
      icon: "schedule" as const,
      tone: "schedule" as const,
      visualState: "neutral",
      href: dashboardHref(props.weekStart, "schedule"),
    },
    {
      label: "Availability",
      value: `${props.availabilitySubmitted}/${props.activeEmployees}`,
      detail: "submitted",
      icon: "availability" as const,
      tone: "availability" as const,
      visualState:
        props.activeEmployees > 0 &&
        props.availabilitySubmitted === props.activeEmployees
          ? "healthy"
          : "neutral",
      href: dashboardHref(props.weekStart, "team"),
    },
    {
      label: "Coverage",
      value: props.coverageConfigured
        ? String(props.coverageIssueCount)
        : "Setup",
      detail: props.coverageConfigured ? "issues" : "rules needed",
      icon: "coverage" as const,
      tone: "coverage" as const,
      visualState: !props.coverageConfigured
        ? "neutral"
        : props.coverageIssueCount > 0
          ? "attention"
          : "healthy",
      href: dashboardHref(props.weekStart, "schedule"),
    },
    {
      label: "Requests",
      value: String(props.pendingRequestCount),
      detail: "pending",
      icon: "requests" as const,
      tone: "requests" as const,
      visualState: "neutral",
      href: dashboardHref(props.weekStart, "requests"),
    },
  ];

  return (
    <section className="dashboard-metric-grid" aria-label="Weekly manager summary">
      {metrics.map((metric) => (
        <Link
          className={`dashboard-metric-card ${metric.visualState}`}
          href={metric.href}
          key={metric.label}
        >
          <span className={metricTone(metric.tone)}>
            <NavIcon name={metric.icon} size={22} />
          </span>
          <span className="dashboard-metric-copy">
            <small>{metric.label}</small>
            <strong>{metric.value}</strong>
            <span>{metric.detail}</span>
          </span>
          <b aria-hidden="true">›</b>
        </Link>
      ))}
    </section>
  );
}

function LocationReadiness({
  locations,
  weekStart,
}: {
  locations: DashboardLocationItem[];
  weekStart: string;
}) {
  return (
    <section className="dashboard-panel dashboard-location-panel">
      <div className="dashboard-panel-heading">
        <h2>Location readiness</h2>
        <Link href={`/app/schedule?week=${weekStart}`}>View all</Link>
      </div>

      <div className="dashboard-location-list">
        {locations.map((location) => (
          <Link
            className="dashboard-location-row"
            href={`/app/schedule?week=${weekStart}&location=${location.locationId}`}
            key={location.locationId}
          >
            <span className="dashboard-location-icon">
              <NavIcon name="dashboard" size={18} />
            </span>
            <span className="dashboard-location-copy">
              <span>
                <strong>{location.locationName}</strong>
                <StatusPill tone={locationTone(location.state)}>
                  {locationStateLabel(location.state)}
                </StatusPill>
              </span>
              <small>
                {location.totalBlocks
                  ? `${location.coveredBlocks}/${location.totalBlocks} coverage periods · ${location.uncoveredBlocks} gap${location.uncoveredBlocks === 1 ? "" : "s"}`
                  : "No schedule coverage yet"}
              </small>
            </span>
            <b aria-hidden="true">›</b>
          </Link>
        ))}
      </div>
    </section>
  );
}

function WeekSummary({
  days,
  weekStart,
}: {
  days: DashboardDayItem[];
  weekStart: string;
}) {
  const maxShifts = Math.max(1, ...days.map((day) => day.shiftCount));

  return (
    <section className="dashboard-panel dashboard-week-panel">
      <div className="dashboard-panel-heading">
        <h2>This week</h2>
        <Link href={`/app/schedule?week=${weekStart}`}>View schedule</Link>
      </div>

      <div className="dashboard-week-scroll">
        <div className="dashboard-week-grid">
          {days.map((day) => {
            const fill = Math.max(10, Math.round((day.shiftCount / maxShifts) * 100));
            return (
              <div className="dashboard-week-day" key={day.date}>
                <small>{day.weekday}</small>
                <strong>{day.day}</strong>
                <span className="dashboard-day-bar" aria-hidden="true">
                  <i style={{ height: `${fill}%` }} />
                </span>
                <b>{day.shiftCount}</b>
                <em>{day.shiftCount === 1 ? "shift" : "shifts"}</em>
                {day.gapCount ? (
                  <span className="dashboard-gap-count">{day.gapCount} gap{day.gapCount === 1 ? "" : "s"}</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
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

function QuickActions({ weekStart }: { weekStart: string }) {
  const actions = [
    {
      label: "Add shift",
      detail: "Create a new shift",
      href: `/app/schedule/new?week=${weekStart}`,
      icon: "schedule" as const,
    },
    {
      label: "Review time off",
      detail: "Approve or deny requests",
      href: "/app/requests?tab=team",
      icon: "timeOff" as const,
    },
    {
      label: "Shift requests",
      detail: "Manage employee requests",
      href: "/app/exchange?tab=requests",
      icon: "exchange" as const,
    },
    {
      label: "Add employee",
      detail: "Invite and set permissions",
      href: "/app/employees/new",
      icon: "employees" as const,
    },
  ];

  return (
    <section className="dashboard-panel dashboard-quick-panel">
      <div className="dashboard-panel-heading">
        <div>
          <h2>Quick actions</h2>
          <p>Common tasks, without hunting through the app.</p>
        </div>
      </div>

      <div className="dashboard-quick-grid">
        {actions.map((action) => (
          <Link href={action.href} key={action.label}>
            <span><NavIcon name={action.icon} size={18} /></span>
            <strong>{action.label}</strong>
            <small>{action.detail}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ScheduleTab(props: Props) {
  const scheduleActions = props.managerActions.filter((item) =>
    [
      "COVERAGE_GAP",
      "HOURS_REVIEW",
      "TARGET_MISSING",
      "ACKNOWLEDGEMENT_MISSING",
      "DEADLINE_MISSING",
      "COVERAGE_RULES_MISSING",
    ].includes(item.type),
  );

  return (
    <div className="dashboard-tab-layout">
      <div className="dashboard-tab-two-column">
        <LocationReadiness locations={props.locations} weekStart={props.weekStart} />
        <WeekSummary days={props.days} weekStart={props.weekStart} />
      </div>
      <section className="dashboard-panel">
        <div className="dashboard-panel-heading">
          <div>
            <h2>Schedule review</h2>
            <p>Coverage, hours, publishing, and acknowledgement items.</p>
          </div>
          <Link href={`/app/schedule?week=${props.weekStart}`}>Open schedule</Link>
        </div>
        <ManagerActionList
          items={scheduleActions}
          emptyTitle="No schedule issues"
          emptyDetail="Coverage, publishing, hour targets, and acknowledgements are clear for this week."
        />
      </section>
    </div>
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
        <div>
          <p>Manager dashboard</p>
          <h1>Welcome, {props.firstName}.</h1>
          <span>Here’s what’s happening this week at Fuel.</span>
        </div>

        <div className="dashboard-hero-actions">
          <div className="dashboard-week-nav">
            <Link
              href={dashboardHref(props.previousWeek, props.view)}
              aria-label="Previous week"
            >
              ‹
            </Link>
            <strong>{props.weekLabel}</strong>
            <Link
              href={dashboardHref(props.nextWeek, props.view)}
              aria-label="Next week"
            >
              ›
            </Link>
          </div>
          <Link className="button primary" href={`/app/schedule?week=${props.weekStart}`}>
            <NavIcon name="schedule" size={17} />
            Open schedule
          </Link>
        </div>
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
        <div className="dashboard-overview">
          <OverviewMetrics {...props} />

          <div className="dashboard-overview-main">
            <section className="dashboard-panel dashboard-attention-panel">
              <div className="dashboard-panel-heading">
                <div className="dashboard-panel-title-with-count">
                  <h2>Needs attention</h2>
                  {props.managerActions.length ? (
                    <span
                      className={
                        props.managerActions.some((item) => item.priority === "URGENT")
                          ? "urgent"
                          : props.managerActions.some((item) => item.priority === "REVIEW")
                            ? "review"
                            : "setup"
                      }
                    >
                      {props.managerActions.length}
                    </span>
                  ) : null}
                </div>
                <Link href={dashboardHref(props.weekStart, "activity")}>View all</Link>
              </div>
              <ManagerActionList items={props.managerActions} limit={6} />
            </section>

            <div className="dashboard-overview-side">
              <LocationReadiness locations={props.locations} weekStart={props.weekStart} />
              <WeekSummary days={props.days} weekStart={props.weekStart} />
            </div>
          </div>

          <div className="dashboard-overview-bottom">
            <TeamAvailability
              submitted={props.availabilitySubmitted}
              active={props.activeEmployees}
              unavailable={props.unavailableAllWeek}
              weekStart={props.weekStart}
            />
            <QuickActions weekStart={props.weekStart} />
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
