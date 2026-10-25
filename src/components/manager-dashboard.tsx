import { ManagerOnShift } from "./manager-on-shift";
import { ActivityPage, HoursPage, type HoursFilter } from "./manager-team-tools";
import {HomeActionCenterProvider} from './manager-action-center';
import {OwnerSetupQuietLive} from './owner-setup-card';
import { formatBusinessTimestamp } from "@/lib/business-time";
import type { ManagerActionItem } from "@/lib/assistance/manager-actions";
import './manager-home.css';
import './manager-home-mobile.css';
import './manager-home-gusto.css';
import type { ReactNode } from 'react';
import type { ClockMonitor } from '@/lib/time-clock';
import { PremiumHomeLive, PremiumHomeSurface, type PremiumHomeWeek } from './premium-home';
import type { NextPay } from './payroll/my-pay';
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
  /** The person's role, so Hours can leave out Owners with nothing scheduled and no target. */
  role?: string;
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
  /** Hours (T-2): which people to list, and how many. */
  hoursFilter?: HoursFilter;
  hoursShown?: number;
};

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
  const common = { greeting: `${greeting(props.timeZone)}, ${props.firstName}`, dateLabel: props.dateLabel ?? homeDateLabel(props.timeZone), timeZone: props.timeZone, week: homeWeek(props), workspaceName: props.workspaceName,
    viewer: props.actorId && props.role ? { id: props.actorId, role: props.role } : undefined };
  const slots = props.overviewSlots;
  if (slots?.snapshots) return <PremiumHomeSurface {...common} setup={slots.setup ?? null} setupHoldsItems={!!slots.setup}
    today={slots.snapshots.today} monitor={slots.snapshots.monitor ?? null} actions={slots.snapshots.actions} actionsConnection="ready" />;
  return <SharedHomeRead key={`${props.actorId}:${props.weekStart}`} live weekStart={props.weekStart} actorId={props.actorId ?? ''}
    owner={props.role === 'OWNER'} initialItems={props.managerActions}>
    <PremiumHomeLive {...common} nextPay={props.nextPay ?? null} setup={props.role === 'OWNER' ? <OwnerSetupQuietLive locationCount={props.totalLocations}/> : null} />
  </SharedHomeRead>;
}

/** Home's other views (final pass, T-1 to T-3): On shift, Hours and Activity, each a Quiet page with its own way back. */
function HomeView(props: Props & { view: Exclude<ManagerDashboardView, 'overview'> }) {
  if (props.view === 'attendance') return <ManagerOnShift dateLabel={props.dateLabel ?? homeDateLabel(props.timeZone)} timeZone={props.timeZone}
    actorId={props.actorId} correctionAuthority={props.correctionAuthority} key={props.correctionAuthority ?? props.actorId} />;
  if (props.view === 'team') return <HoursPage weekStart={props.weekStart} previousWeek={props.previousWeek} nextWeek={props.nextWeek} hours={props.hours}
    availabilitySubmitted={props.availabilitySubmitted} availabilityEligible={props.availabilityEligible} filter={props.hoursFilter} shown={props.hoursShown} />;
  return <ActivityPage weekStart={props.weekStart} previousWeek={props.previousWeek} nextWeek={props.nextWeek} latestRevision={props.latestRevision}
    managerActions={props.managerActions} timeZone={props.timeZone} />;
}

export function ManagerDashboard(props: Props) {
  // Clean Manager (v3): Home is "Today"; its views keep their addresses. The old Home layout is gone (deleted, not restyled).
  if (props.view === 'overview') return <PremiumOverview {...props} />;
  return <HomeView {...props} view={props.view} />;
}
