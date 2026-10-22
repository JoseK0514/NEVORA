import { ManagerAttendanceReview } from "./manager-attendance-review";
import { ManagerTimeCorrections } from "./manager-time-corrections";
import {HomeActionCenterProvider} from './manager-action-center';
import {OwnerSetupRowLive} from './owner-setup-card';
import { formatBusinessTimestamp } from "@/lib/business-time";
import Link from "next/link";
import type { ManagerActionItem } from "@/lib/assistance/manager-actions";
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react/ssr';
import './manager-home.css';
import './manager-home-mobile.css';
import './manager-home-gusto.css';
import type { ReactNode } from 'react';
import type { ClockMonitor } from '@/lib/time-clock';
import { PremiumHomeLive, PremiumHomeSurface, type PremiumHomeWeek } from './premium-home';
import type { NextPay } from './payroll/my-pay';
import { Avatar, Card, CardBody, FilterPills, KitLink, MetaParts, PageBand, Row, Rows, StatGrid, Status, Tile } from './kit/kit';
import { presentItem } from '@/lib/action-center/present';
import { CalendarBlankIcon, CalendarCheckIcon } from '@phosphor-icons/react/ssr';
import type { Today } from '@/lib/today/project';
import type { ActionCenter } from '@/lib/action-center/project';

/** Workspace-local time of day for the Home greeting. */
function greeting(timeZone: string) {
  let hour = 12;
  try { hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(new Date())); }
  catch { /* An unknown zone keeps the neutral afternoon greeting. */ }
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

/** Home's own views. Schedule and Requests have one destination each
 * (/app/schedule, Inbox filtered to Requests); /app redirects old links (R1). */
export type ManagerDashboardView =
  | "overview"
  | "attendance"
  | "team"
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
  /** MK1: the next payday from My pay's pay schedule, for Home's Coming up row. */
  nextPay?: NextPay;
  /** Display-only compositions can supply prepared panels without mounting readers. */
  overviewSlots?: { actions: ReactNode; activity: ReactNode; today?: ReactNode; setup?: ReactNode; /** Fictional snapshots for the premium Home preview. */ snapshots?: { today: Today; actions: ActionCenter; monitor?: ClockMonitor } };
  /** Workspace date for the Home band, e.g. "Sunday, October 18". */
  dateLabel?: string;
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
  /** Employees and leads asked for availability this week; the submission denominator (O2). */
  availabilityEligible: number;
  activeEmployees: number;
  unavailableAllWeek: number;
  coverageIssueCount: number;
  coverageConfigured: boolean;
  pendingRequestCount: number;
  managerActions: ManagerActionItem[];
  locations: DashboardLocationItem[];
  days: DashboardDayItem[];
  hours: DashboardHourItem[];
  latestRevision: DashboardRevisionItem;
};

const tabs: Array<{ id: ManagerDashboardView; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "attendance", label: "Attendance" },
  { id: "team", label: "Team overview" },
  { id: "activity", label: "Schedule activity" },
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


/** Team overview (Phase 7 rebuild): kit stats and rows from the dashboard's existing read. */
function TeamTab(props: Props) {
  const targetMissing = props.hours.filter(item => item.status === "TARGET_MISSING").length;
  const outside = props.hours.filter(item => item.status === "UNDER" || item.status === "OVER").length;
  const plural = (n: number, one: string, many: string) => `${n}\u00a0${n === 1 ? one : many}`;
  return <>
    <Card id="team-week" title="This week" meta={<KitLink href={`/app/availability?week=${encodeURIComponent(props.weekStart)}`}>View availability</KitLink>}>
      <StatGrid stats={[
        { label: "Active employees", value: props.activeEmployees },
        { label: "Availability received", value: `${props.availabilitySubmitted} of ${props.availabilityEligible}`, ariaLabel: `${props.availabilitySubmitted} of ${props.availabilityEligible} employees and leads sent availability` },
      ]} />
      <StatGrid stats={[
        { label: "No weekly hour target", value: targetMissing },
        { label: "Outside hour target", value: outside },
      ]} />
    </Card>
    <Card id="team-hours" title="Hours this week" meta={<KitLink href="/app/schedule/settings">Manage targets</KitLink>}
      foot={props.hours.length > 8 ? `Showing 8 of ${plural(props.hours.length, "person", "people")}` : undefined}>
      {props.hours.length ? <Rows label="Hours this week">{props.hours.slice(0, 8).map(item => <Row key={item.employeeId}
        leading={<Avatar initials={item.employeeName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase()} />}
        title={item.employeeName}
        meta={item.targetHours === undefined ? "No weekly hour target yet" : `${item.scheduledHours}h scheduled · ${item.targetHours}h target`}
        status={<Status tone={item.status === "ON_TARGET" ? "done" : item.status === "TARGET_MISSING" ? "neutral" : "review"}>
          {item.status === "UNDER" ? "Below target" : item.status === "OVER" ? "Above target" : item.status === "TARGET_MISSING" ? "Not set" : "On target"}</Status>} />)}
      </Rows> : <CardBody><p className="premium-note">Hours appear here as shifts are added.</p></CardBody>}
    </Card>
  </>;
}

/** Schedule activity (Phase 7 rebuild): publications and dated events as kit rows. */
function ActivityTab(props: Props) {
  const datedActions = props.managerActions.filter(item => Boolean(item.dateTime)).slice(0, 8);
  const hasActivity = Boolean(props.latestRevision) || datedActions.length > 0;
  return <Card id="activity-list" title="Recent activity">
    {hasActivity ? <Rows label="Recent activity">
      {props.latestRevision ? <Row leading={<Tile tone="done"><CalendarCheckIcon size={20} weight="bold" /></Tile>}
        title={revisionSourceLabel(props.latestRevision.sourceType)}
        meta={`Revision ${props.latestRevision.revisionNumber} · ${formatBusinessTimestamp(props.latestRevision.createdAt, props.timeZone)}`} /> : null}
      {datedActions.map(item => {
        const shown = presentItem({ ...item, category: item.type === "TIME_OFF" || item.type === "EXCHANGE" || item.type === "CALLOUT" ? "requests" : "scheduling" }, "Open");
        return <Row key={item.id} href={item.href} label={`${shown.title}, ${shown.detail.replace(/\u00a0/g, " ")}`}
          leading={<Tile tone={item.priority === "URGENT" ? "urgent" : "neutral"}><CalendarBlankIcon size={20} weight="bold" /></Tile>}
          title={shown.title} meta={<MetaParts text={shown.detail} />} />;
      })}
    </Rows> : <CardBody><p className="premium-note">Schedule publications and requests show up here.</p></CardBody>}
  </Card>;
}

/** The shared read runs only on live Home; the preview mounts no private reader. */
function SharedHomeRead({live, children, ...read}: {live: boolean; weekStart: string; actorId: string; owner: boolean; initialItems: ManagerActionItem[]; children: ReactNode}) {
  return live ? <HomeActionCenterProvider {...read}>{children}</HomeActionCenterProvider> : <>{children}</>;
}

/** The week facts Home shows, from the dashboard's existing read. */
export function homeWeek(props: Props): PremiumHomeWeek {
  return {
    weekStart: props.weekStart, weekLabel: props.weekLabel,
    plannedShifts: props.days.reduce((total, day) => total + day.shiftCount, 0),
    availabilitySubmitted: props.availabilitySubmitted, availabilityEligible: props.availabilityEligible,
    locations: props.locations.map(location => ({ name: location.locationName, state: location.scheduleStatus === 'PUBLISHED' ? 'published' as const : location.scheduleStatus === 'DRAFT' ? 'draft' as const : 'not_started' as const })),
    lastPublished: props.latestRevision ? formatBusinessTimestamp(props.latestRevision.createdAt, props.timeZone) : null,
  };
}

function homeDateLabel(timeZone: string) {
  try { return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()); }
  catch { return ''; }
}

/** Manager and Owner Home (premium direction, phase 2): band, Today, Next up, This week. */
function PremiumOverview(props: Props) {
  const common = { greeting: `${greeting(props.timeZone)}, ${props.firstName}`, dateLabel: props.dateLabel ?? homeDateLabel(props.timeZone), timeZone: props.timeZone, week: homeWeek(props) };
  const slots = props.overviewSlots;
  if (slots?.snapshots) return <PremiumHomeSurface {...common} setup={slots.setup ?? null} setupHoldsItems={!!slots.setup}
    today={slots.snapshots.today} monitor={slots.snapshots.monitor ?? null} actions={slots.snapshots.actions} actionsConnection="ready" />;
  return <SharedHomeRead key={`${props.actorId}:${props.weekStart}`} live weekStart={props.weekStart} actorId={props.actorId ?? ''}
    owner={props.role === 'OWNER'} initialItems={props.managerActions}>
    <PremiumHomeLive {...common} nextPay={props.nextPay ?? null} setup={props.role === 'OWNER' ? <OwnerSetupRowLive locationCount={props.totalLocations}/> : null} />
  </SharedHomeRead>;
}

const viewTitle: Record<Exclude<ManagerDashboardView, 'overview'>, { title: string; summary: string }> = {
  attendance: { title: 'Attendance', summary: 'Clock-ins today and corrections to review.' },
  team: { title: 'Team overview', summary: 'Hours and availability by person.' },
  activity: { title: 'Schedule activity', summary: 'Publications and changes.' },
};

/** Home's other views (Phase 7, IS-9): the band, a Back to Home, and the views as pills on the band. */
function PremiumHomeView(props: Props & { view: Exclude<ManagerDashboardView, 'overview'> }) {
  const copy = viewTitle[props.view];
  return <div className="manager-dashboard-v3 premium-legacy-page premium-home-view" data-nv-page="">
    <PageBand back={{ href: `/app?week=${encodeURIComponent(props.weekStart)}`, label: 'Home' }} title={copy.title} summary={copy.summary}
      aside={props.view === 'attendance' ? <span className="nv-masthead__eyebrow premium-band-aside">Today</span> : <span className="premium-week-eyebrow">
        <Link className="nv-band-control premium-week-arrow" href={dashboardHref(props.previousWeek, props.view)} aria-label="Previous week"><CaretLeftIcon size={18} weight="bold" aria-hidden="true" /></Link>
        <span>{props.weekLabel}</span>
        <Link className="nv-band-control premium-week-arrow" href={dashboardHref(props.nextWeek, props.view)} aria-label="Next week"><CaretRightIcon size={18} weight="bold" aria-hidden="true" /></Link>
      </span>}
      extra={<FilterPills label="Home views" items={tabs.filter(tab => tab.id !== 'overview').map(tab => ({ href: dashboardHref(props.weekStart, tab.id), label: tab.label, current: tab.id === props.view }))} />} />
    <div className="nv-content premium-legacy-content">
      {props.view === 'attendance' ? <div className="manager-attendance-stack">
        <ManagerAttendanceReview />
        <ManagerTimeCorrections key={props.correctionAuthority??props.actorId} actorId={props.actorId} authority={props.correctionAuthority}/>
        <Link className="nv-link" href="/app/clocker-recovery">Clocker recovery</Link>
      </div> : props.view === 'team' ? <TeamTab {...props} /> : <ActivityTab {...props} />}
    </div>
  </div>;
}

export function ManagerDashboard(props: Props) {
  // Clean Manager (v3): Home is "Today"; its views keep their addresses. The old Home layout is gone (deleted, not restyled).
  if (props.view === 'overview') return <PremiumOverview {...props} />;
  return <PremiumHomeView {...props} view={props.view} />;
}
