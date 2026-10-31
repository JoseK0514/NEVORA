import { ManagerAttendanceReview } from "./manager-attendance-review";
import { WhosWorkingCorp } from "./whos-working-corp";
import { ManagerTimeCorrections } from "./manager-time-corrections";
import {HomeActionCenterProvider} from './manager-action-center';
import {OwnerSetupCorpLive} from './owner-setup-card';
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
import { Avatar, Card, CardBody, FilterPills, KitLink, MetaParts, PageBand, Row, Rows, StatGrid, Status } from './kit/kit';
import { presentItem } from '@/lib/action-center/present';
import { ArrowsLeftRightIcon, CalendarBlankIcon, CalendarXIcon, PaperPlaneTiltIcon, PhoneXIcon } from '@phosphor-icons/react/ssr';
import { CorpBody, CorpCard, CorpLink, CorpNav, CorpPage, CorpRows, CorpTitle } from './corp/corp';
import './schedule-activity.css';
import type { Today } from '@/lib/today/project';
import type { ActionCenter } from '@/lib/action-center/project';


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

/** Schedule activity (Release 1, board O-Activity): "‹ Schedule", Activity, the week and its locations, then one card per
 * day with the week's publication and dated items as rows (a grey round icon, the title, a 13px line). Same read as before. */
const ACTIVITY_ICON: Partial<Record<ManagerActionItem["type"], typeof CalendarBlankIcon>> = {
  COVERAGE_GAP: CalendarBlankIcon, TIME_OFF: CalendarXIcon, EXCHANGE: ArrowsLeftRightIcon, CALLOUT: PhoneXIcon,
};
const ACTIVITY_SHOWN = 8;
function ActivityCorp(props: Props) {
  const dated = props.managerActions.filter(item => Boolean(item.dateTime));
  const dayKey = (iso: string) => { try { return new Intl.DateTimeFormat("en-CA", { timeZone: props.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)); } catch { return iso.slice(0, 10); } };
  const clock = (iso: string) => { try { return new Intl.DateTimeFormat("en-US", { timeZone: props.timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso)); } catch { return ""; } };
  const today = dayKey(new Date().toISOString());
  type Event = { key: string; at: string; title: string; detail: ReactNode; href?: string; label?: string; Icon: typeof CalendarBlankIcon; tint?: boolean };
  const events: Event[] = [
    ...(props.latestRevision ? [{ key: "revision", at: props.latestRevision.createdAt, title: revisionSourceLabel(props.latestRevision.sourceType),
      detail: `${props.weekLabel} · ${clock(props.latestRevision.createdAt)}`, Icon: PaperPlaneTiltIcon, tint: true }] : []),
    ...dated.slice(0, ACTIVITY_SHOWN).map((item): Event => {
      const shown = presentItem({ ...item, category: item.type === "TIME_OFF" || item.type === "EXCHANGE" || item.type === "CALLOUT" ? "requests" : "scheduling" }, "Open");
      return { key: item.id, at: item.dateTime!, title: shown.title, detail: <MetaParts text={shown.detail} />, href: item.href,
        label: `${shown.title}, ${shown.detail.replace(/\u00a0/g, " ")}`, Icon: ACTIVITY_ICON[item.type] ?? CalendarBlankIcon };
    }),
  ];
  const days = [...new Set(events.map(event => dayKey(event.at)))].sort().reverse();
  const dayLabel = (key: string) => { const text = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`)); return key === today ? `Today · ${text}` : text; };
  const row = (event: Event) => {
    const body = <>
      <span className={event.tint ? "c-act__icon c-act__icon--tint" : "c-act__icon"} aria-hidden="true"><event.Icon className="c-ic c-ic--s" /></span>
      <span className="c-row__main"><span className="c-row__title c-row__title--b">{event.title}</span><span className="c-row__detail"><span>{event.detail}</span></span></span>
    </>;
    return <li key={event.key}>{event.href ? <Link className="c-row c-act__row" href={event.href} aria-label={event.label}>{body}</Link> : <div className="c-row c-act__row">{body}</div>}</li>;
  };
  return <CorpPage className="c-act" labelledBy="activity-title">
    <CorpNav back={{ href: `/app/schedule?week=${encodeURIComponent(props.weekStart)}`, label: "Schedule" }} title="Activity" titleId="activity-title" phoneOnly />
    <CorpTitle title="Activity" wide />
    <div className="c-act__sub">
      <span>{`${props.weekLabel} · All locations`}</span>
      <span className="c-act__weeks">
        <Link className="c-act__arrow" href={dashboardHref(props.previousWeek, "activity")} aria-label="Previous week"><CaretLeftIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true" /></Link>
        <Link className="c-act__arrow" href={dashboardHref(props.nextWeek, "activity")} aria-label="Next week"><CaretRightIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true" /></Link>
      </span>
    </div>
    {days.length ? days.map((key, index) => <CorpCard key={key} id={`activity-${key}`} label={dayLabel(key)}
      footer={index === days.length - 1 && dated.length > ACTIVITY_SHOWN ? <CorpLink href="/app/inbox" large>{`Show ${dated.length - ACTIVITY_SHOWN} more in Things to do`}</CorpLink> : undefined}>
      <CorpRows label={dayLabel(key)}>{events.filter(event => dayKey(event.at) === key).sort((a, b) => b.at.localeCompare(a.at)).map(row)}</CorpRows>
    </CorpCard>) : <CorpCard id="activity-list"><CorpBody><p className="c-act__empty">Schedule publications and requests show up here.</p></CorpBody></CorpCard>}
  </CorpPage>;
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
  // Corporate (Release 1, board C-Owner): "Welcome back, Carmen".
  const common = { greeting: `Welcome back, ${props.firstName}`, dateLabel: props.dateLabel ?? homeDateLabel(props.timeZone), timeZone: props.timeZone, week: homeWeek(props), workspaceName: props.workspaceName };
  const slots = props.overviewSlots;
  if (slots?.snapshots) return <PremiumHomeSurface {...common} corporate nextPay={props.nextPay ?? null} setup={slots.setup ?? null} setupHoldsItems={!!slots.setup}
    today={slots.snapshots.today} monitor={slots.snapshots.monitor ?? null} actions={slots.snapshots.actions} actionsConnection="ready" />;
  return <SharedHomeRead key={`${props.actorId}:${props.weekStart}`} live weekStart={props.weekStart} actorId={props.actorId ?? ''}
    owner={props.role === 'OWNER'} initialItems={props.managerActions}>
    <PremiumHomeLive {...common} corporate nextPay={props.nextPay ?? null} setup={props.role === 'OWNER' ? <OwnerSetupCorpLive locationCount={props.totalLocations}/> : null} />
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
        {props.role==='OWNER' ? <Link className="nv-link" href="/app/clocker-recovery">Clocker recovery</Link> : null}
      </div> : props.view === 'team' ? <TeamTab {...props} /> : <ActivityCorp {...props} />}
    </div>
  </div>;
}

export function ManagerDashboard(props: Props) {
  // Clean Manager (v3): Home is "Today"; its views keep their addresses. The old Home layout is gone (deleted, not restyled).
  if (props.view === 'overview') return <PremiumOverview {...props} />;
  // Release 1 (board O-OnShift): Who's working, then the attendance review and time corrections as before.
  if (props.view === 'attendance' && !props.overviewSlots) return <WhosWorkingCorp homeHref={`/app?week=${encodeURIComponent(props.weekStart)}`}>
    <ManagerAttendanceReview />
    <ManagerTimeCorrections key={props.correctionAuthority??props.actorId} actorId={props.actorId} authority={props.correctionAuthority}/>
    {props.role==='OWNER' ? <Link className="c-link c-link--l" href="/app/clocker-recovery">Clocker recovery</Link> : null}
  </WhosWorkingCorp>;
  // Release 1 (board O-Activity): Schedule activity is its own page under Schedule.
  if (props.view === 'activity') return <ActivityCorp {...props} />;
  return <PremiumHomeView {...props} view={props.view} />;
}
