import { ManagerClockMonitor } from "./manager-clock-monitor";
import { ManagerAttendanceReview } from "./manager-attendance-review";
import { ManagerTimeCorrections } from "./manager-time-corrections";
import {ManagerActionCenter} from './manager-action-center';
import { formatBusinessTimestamp } from "@/lib/business-time";
import Link from "next/link";
import { employeeRoleLabel } from "../lib/employee-display";
import { NavIcon } from "@/components/nav-icon";
import { StatusPill } from "@/components/status-pill";
import type { ManagerActionItem } from "@/lib/assistance/manager-actions";
import { formatDayLabel, formatTime } from "@/lib/date-utils";
import type { UserRole } from "@/lib/domain";
import { CaretLeftIcon, CaretRightIcon, CheckCircleIcon } from '@phosphor-icons/react/ssr';
import { EmptyState } from './empty-state';
import './manager-home.css';
import './manager-home-mobile.css';
import './manager-home-gusto.css';
import { HomeRecentActivity, MobileHomeOverview, MobileHomeTools } from './mobile-home-overview';
import type { ReactNode } from 'react';

/** Workspace-local time of day for the Home greeting. */
function greeting(timeZone: string) {
  let hour = 12;
  try { hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(new Date())); }
  catch { /* An unknown zone keeps the neutral afternoon greeting. */ }
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export type ManagerDashboardView =
  | "overview"
  | "attendance"
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
  /** Display-only compositions can supply prepared panels without mounting readers. */
  overviewSlots?: { actions: ReactNode; activity: ReactNode };
  role?: "OWNER" | "MANAGER";
  actorId?: string;
  correctionAuthority?:string;
  workspaceName: string;
  timeZone: string;
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
  { id: "attendance", label: "Attendance" },
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
                <span> · {employeeRoleLabel(employee.role)}</span>
              </strong>
            </div>

            <div
              className="schedule-builder-shifts"
              role="group"
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

function DashboardEmptyTray({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return <EmptyState className="manager-empty-tray" icon={<CheckCircleIcon size={22} />} title={title}>{detail}</EmptyState>;
}

function TeamTab(props: Props) {
  const targetMissing = props.hours.filter(
    (item) => item.status === "TARGET_MISSING",
  ).length;
  const underOrOver = props.hours.filter(
    (item) => item.status === "UNDER" || item.status === "OVER",
  );
  const availabilityPercentage = props.activeEmployees
    ? Math.round((props.availabilitySubmitted / props.activeEmployees) * 100)
    : 0;

  return (
    <section className="manager-subtab-card">
      <header className="manager-subtab-header">
        <div>
          <span>Team</span>
          <h2>Team overview</h2>
          <p>Availability and scheduled hours for this week.</p>
        </div>
        <Link className="manager-subtab-link" href={`/app/availability?week=${props.weekStart}`}>
          View availability
        </Link>
      </header>

      <div className="manager-team-summary-line" aria-label="Team summary">
        <div>
          <strong>{props.activeEmployees}</strong>
          <span>Active employees</span>
        </div>
        <div>
          <strong>{availabilityPercentage}%</strong>
          <span>Availability submitted</span>
        </div>
        <div>
          <strong>{targetMissing}</strong>
          <span>Targets missing</span>
        </div>
        <div>
          <strong>{underOrOver.length}</strong>
          <span>Hours to Review</span>
        </div>
      </div>

      <section className="manager-subtab-section">
        <header className="manager-subtab-section-heading">
          <h3>Employee hours</h3>
          <Link href="/app/schedule/settings">Manage targets</Link>
        </header>

        {props.hours.length ? (
          <div className="manager-team-hours-list">
            {props.hours.slice(0, 8).map((item) => (
              <div className="manager-team-hours-row" key={item.employeeId}>
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
            ))}
          </div>
        ) : (
          <DashboardEmptyTray
            title="No hour data yet"
            detail="Scheduled hour balances will appear here as shifts are added."
          />
        )}
      </section>
    </section>
  );
}

function RequestsTab(props: Props) {
  const requestActions = props.managerActions.filter((item) =>
    ["TIME_OFF", "EXCHANGE", "CALLOUT"].includes(item.type),
  );

  return (
    <section className="manager-subtab-card">
      <header className="manager-subtab-header">
        <div>
          <span>Requests</span>
          <h2>Pending requests</h2>
          <p>Only items waiting for a manager decision appear here.</p>
        </div>
        <div className="manager-request-counts" aria-label="Pending request counts">
          <span>Time Off <strong>{props.requestCounts.timeOff}</strong></span>
          <span>Trades <strong>{props.requestCounts.exchange}</strong></span>
          <span>Call-outs <strong>{props.requestCounts.callout}</strong></span>
        </div>
      </header>

      {requestActions.length ? (
        <div className="manager-subtab-list">
          {requestActions.map((item) => (
            <div className="manager-subtab-row" key={item.id}>
              <div className="manager-subtab-row-copy">
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </div>
              <Link className="manager-subtab-action" href={item.href}>
                Review
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <DashboardEmptyTray
          title="No pending requests"
          detail="There are no time-off, shift-trade, or call-out requests waiting for review."
        />
      )}
    </section>
  );
}

function ActivityTab(props: Props) {
  const datedActions = props.managerActions
    .filter((item) => Boolean(item.dateTime))
    .slice(0, 8);
  const hasActivity = Boolean(props.latestRevision) || datedActions.length > 0;

  return (
    <section className="manager-subtab-card">
      <header className="manager-subtab-header">
        <div>
          <span>Activity</span>
          <h2>Recent activity</h2>
          <p>Schedule publications and active operational events.</p>
        </div>
      </header>

      {hasActivity ? (
        <div className="manager-activity-list">
          {props.latestRevision ? (
            <div className="manager-activity-row">
              <span className="manager-activity-icon">
                <NavIcon name="schedule" size={17} />
              </span>
              <span>
                <strong>{revisionSourceLabel(props.latestRevision.sourceType)}</strong>
                <small>
                  Revision {props.latestRevision.revisionNumber} · {formatBusinessTimestamp(props.latestRevision.createdAt, props.timeZone)}
                </small>
              </span>
            </div>
          ) : null}

          {datedActions.map((item) => (
            <div className="manager-activity-row" key={item.id}>
              <span className="manager-activity-icon">
                <NavIcon
                  name={
                    item.type === "TIME_OFF"
                      ? "timeOff"
                      : item.type === "EXCHANGE" || item.type === "CALLOUT"
                        ? "exchange"
                        : "coverage"
                  }
                  size={17}
                />
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </span>
              <Link href={item.href}>Open</Link>
            </div>
          ))}
        </div>
      ) : (
        <DashboardEmptyTray
          title="No recent activity"
          detail="New schedule publications and employee requests will appear here."
        />
      )}
    </section>
  );
}

export function ManagerDashboard(props: Props) {
  const actions = props.overviewSlots?.actions ?? <ManagerActionCenter key={`${props.actorId}:${props.weekStart}`} weekStart={props.weekStart} actorId={props.actorId??''} timeZone={props.timeZone}/>;
  const activity = props.overviewSlots?.activity ?? <div className="manager-monitor-block" key="recorded-activity">
    <ManagerClockMonitor />
    <Link className="manager-attendance-link" href={dashboardHref(props.weekStart, 'attendance')}><NavIcon name="clock" size={18} />Review attendance</Link>
  </div>;
  return (
    <div
      className={
        props.view === "overview"
          ? "manager-dashboard-v3 dashboard-overview-active manager-portal-home"
          : props.view === "attendance"
            ? "manager-dashboard-v3 dashboard-attendance-active"
            : "manager-dashboard-v3"
      }
    >
      {props.view === 'overview' ? <div className="mobile-home-heading"><h1>Home</h1><p>{props.workspaceName}</p></div> : null}
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          {props.view !== 'overview' ? <p>{props.view === "attendance" ? "Attendance" : "Manager dashboard"}</p> : null}
          <h1 suppressHydrationWarning>{props.view === "attendance" ? "Time review" : props.view === 'overview' ? `${greeting(props.timeZone)}, ${props.firstName}` : `Welcome back, ${props.firstName}.`}</h1>
          <span>
            {props.view === "attendance"
              ? `Who clocked in today at ${props.workspaceName}, and anything that needs a look.`
              : props.view === 'overview' ? `Here’s what’s going on with your team at ${props.workspaceName}.` : `Here’s what’s happening this week at ${props.workspaceName}.`}
          </span>
        </div>

        {props.view !== "schedule" && props.view !== "attendance" && props.view !== 'overview' ? (
          <div className="dashboard-hero-actions">
            <div className="dashboard-week-nav">
              <Link
                href={dashboardHref(props.previousWeek, props.view)}
                aria-label="Previous week"
              >
                <CaretLeftIcon size={18} aria-hidden="true" />
              </Link>
              <span className="dashboard-week-label">
                <NavIcon name="calendar" size={16} />
                <strong>{props.weekLabel}</strong>
              </span>
              <Link
                href={dashboardHref(props.nextWeek, props.view)}
                aria-label="Next week"
              >
                <CaretRightIcon size={18} aria-hidden="true" />
              </Link>
            </div>
            <Link className="button primary" href={`/app/schedule?week=${props.weekStart}`}>
              Open schedule
            </Link>
          </div>
        ) : null}
      </section>

      {props.view !== 'overview' ? <nav className="dashboard-tabs" aria-label="Dashboard views">
        {tabs.map((tab) => (
          <Link
            className={props.view === tab.id ? "active" : ""}
            href={dashboardHref(props.weekStart, tab.id)}
            key={tab.id}
            aria-current={props.view === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav> : null}

      {props.view === "overview" ? (
        /* Gusto-style Home: Tasks lead; this week, live activity and shortcuts form the rail. */
        <div className="home-layout">
          <MobileHomeOverview weekStart={props.weekStart} weekLabel={props.weekLabel}
            previousWeek={props.previousWeek} nextWeek={props.nextWeek}
            plannedShifts={props.days.reduce((total, day) => total + day.shiftCount, 0)}
            availabilityReceived={props.availabilitySubmitted} activeEmployees={props.activeEmployees}
            publishedLocations={props.locations.filter(location => location.scheduleStatus === 'PUBLISHED').length}
            locations={props.locations.length}/>
          <div className="home-layout-tasks">{actions}</div>
          <div className="home-layout-live">{activity}</div>
          {props.latestRevision ? <HomeRecentActivity weekStart={props.weekStart} label={revisionSourceLabel(props.latestRevision.sourceType)}
            dateTime={props.latestRevision.createdAt}
            detail={`Revision ${props.latestRevision.revisionNumber} · ${formatBusinessTimestamp(props.latestRevision.createdAt, props.timeZone)}`}/> : null}
          <MobileHomeTools weekStart={props.weekStart}/>
        </div>
      ) : props.view === "attendance" ? (
        <div className="manager-attendance-stack">
          <ManagerAttendanceReview />
          <ManagerTimeCorrections key={props.correctionAuthority??props.actorId} actorId={props.actorId} authority={props.correctionAuthority}/>
          <Link className="button secondary" href="/app/clocker-recovery">Clocker recovery</Link>
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
