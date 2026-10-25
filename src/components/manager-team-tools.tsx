import Link from 'next/link';
import type { ReactNode } from 'react';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { CalendarCheckIcon } from '@phosphor-icons/react/dist/ssr/CalendarCheck';
import { CalendarXIcon } from '@phosphor-icons/react/dist/ssr/CalendarX';
import { ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { AirplaneTiltIcon } from '@phosphor-icons/react/dist/ssr/AirplaneTilt';
import { UserMinusIcon } from '@phosphor-icons/react/dist/ssr/UserMinus';
import { QuietHeader, QuietList, QuietNav, QuietPage, QuietRow, QuietSegments, initialsOf, weekLabel } from './quiet/quiet';
import { formatBusinessTimestamp } from '@/lib/business-time';
import { spacedRanges } from '@/lib/action-center/present';
import type { ManagerActionItem } from '@/lib/assistance/manager-actions';
import { formatHours } from '@/lib/date-utils';
import './quiet/u1.css';

/* Hours (T-2) and Activity (T-3), final pass Oct 25: Home's old "Team overview" and "Schedule activity" views on Quiet,
 * from the dashboard's existing read. Their addresses are unchanged (/app?view=team, /app?view=activity). */

export type HoursRow = { employeeId: string; employeeName: string; scheduledHours: number; targetHours?: number; status: 'UNDER' | 'ON_TARGET' | 'OVER' | 'TARGET_MISSING'; role?: string };
export type HoursFilter = 'all' | 'over' | 'none';
export const HOURS_PAGE = 50;

/** "24 h", "7.5 h" (the shared formatHours). */
export const hoursText = (hours: number) => formatHours(hours * 60);

/** The bar's week stepper: 44pt arrows either side of the week ("‹  Oct 19 – 25  ›"). */
function WeekStepper({ weekStart, previousHref, nextHref }: { weekStart: string; previousHref: string; nextHref: string }) {
  return <span className="u1-week">
    <Link className="u1-week__arrow" href={previousHref} aria-label="Previous week"><CaretLeftIcon className="q-ic" aria-hidden="true" /></Link>
    <span className="u1-week__label">{weekLabel(weekStart)}</span>
    <Link className="u1-week__arrow" href={nextHref} aria-label="Next week"><CaretRightIcon className="q-ic" aria-hidden="true" /></Link>
  </span>;
}

/** Owners who have no target and nothing scheduled aren't part of the team's hours. */
export function hoursPeople(rows: readonly HoursRow[]) {
  return rows.filter(row => !(row.role === 'OWNER' && row.targetHours === undefined && !row.scheduledHours));
}

export function HoursPage({ weekStart, previousWeek, nextWeek, hours, availabilitySubmitted, availabilityEligible, filter = 'all', shown = HOURS_PAGE }: {
  weekStart: string; previousWeek: string; nextWeek: string; hours: readonly HoursRow[];
  availabilitySubmitted: number; availabilityEligible: number; filter?: HoursFilter; shown?: number;
}) {
  const href = (week: string, show: HoursFilter = filter, more?: number) => `/app?view=team&week=${encodeURIComponent(week)}${show === 'all' ? '' : `&show=${show}`}${more ? `&shown=${more}` : ''}`;
  const people = hoursPeople(hours);
  const over = people.filter(row => row.status === 'OVER');
  const none = people.filter(row => row.targetHours === undefined);
  const list = filter === 'over' ? over : filter === 'none' ? none : people;
  const visible = list.slice(0, shown);
  const sent = `${availabilitySubmitted} of ${availabilityEligible} sent`;
  return <QuietPage className="u1-hours">
    <QuietNav back={{ href: '/app/employees', label: 'Team' }} title={<WeekStepper weekStart={weekStart} previousHref={href(previousWeek)} nextHref={href(nextWeek)} />} />
    <QuietHeader title="Hours" sub={`${weekLabel(weekStart)} · ${availabilitySubmitted} of ${availabilityEligible} sent availability`} />
    <QuietSegments label="Show" items={[
      { href: href(weekStart, 'all'), label: `All · ${people.length}`, current: filter === 'all' },
      { href: href(weekStart, 'over'), label: `Over target · ${over.length}`, current: filter === 'over' },
      { href: href(weekStart, 'none'), label: `No target · ${none.length}`, current: filter === 'none' },
    ]} />
    {visible.length ? <QuietList label="Scheduled hours this week" style={{ marginTop: 16 }}>
      {visible.map(row => {
        const overTarget = row.status === 'OVER';
        const detail = row.targetHours === undefined ? 'No weekly target' : `Target ${hoursText(row.targetHours)}`;
        return <QuietRow key={row.employeeId} href={`/app/employees/${encodeURIComponent(row.employeeId)}`} avatar={initialsOf(row.employeeName)}
          title={row.employeeName} detail={detail} value={hoursText(row.scheduledHours)} tone={overTarget ? 'alert' : undefined}
          label={`${row.employeeName}, ${hoursText(row.scheduledHours)} scheduled, ${detail}${overTarget ? ', over target' : ''}`} />;
      })}
    </QuietList> : <p className="q-empty" style={{ marginTop: 24 }}>{filter === 'over' ? 'No one is over their target this week.' : filter === 'none' ? 'Everyone has a weekly target.' : 'Hours show here as shifts are added.'}</p>}
    {list.length > visible.length ? <Link className="q-btn q-btn--sec" href={href(weekStart, filter, shown + HOURS_PAGE)}>Show more</Link> : null}
    <QuietList label="Related" style={{ marginTop: 40 }}>
      <QuietRow href={`/app/availability?week=${encodeURIComponent(weekStart)}`} title="Availability" value={sent} />
      <QuietRow href="/app/schedule/settings#target-hours" title="Weekly hour targets" />
    </QuietList>
  </QuietPage>;
}

export type ActivityRevision = { revisionNumber: number; sourceType: string; createdAt: string } | null;

function revisionTitle(sourceType: string) {
  if (sourceType === 'PUBLISH') return 'Schedule published';
  if (sourceType === 'EXCHANGE') return 'Shift swap applied';
  if (sourceType === 'CALLOUT') return 'Unable to work applied';
  return 'Published schedule updated';
}

type ActivityEntry = { key: string; at: string; icon: ReactNode; title: string; detail: string; value?: string; href?: string };
const ic = (Icon: typeof CalendarCheckIcon) => <Icon className="q-ic" aria-hidden="true" />;

/** "Main Office needs 1 more" from a coverage gap's title and detail; a lead-only gap needs a lead. */
function gapTitle(item: ManagerActionItem) {
  const place = /\bat (.+)$/.exec(item.title)?.[1] ?? item.detail.split(' · ')[0];
  if (/^No lead scheduled/.test(item.title)) return `${place} needs a lead`;
  const positions = [...item.detail.matchAll(/: (\d+) (?:open|missing)/g)].reduce((sum, match) => sum + Number(match[1]), 0);
  const people = Number(/Need (\d+) employees?/.exec(item.detail)?.[1] ?? 0);
  const needed = Math.max(positions, people);
  return needed ? `${place} needs ${needed} more` : `${place} isn’t covered`;
}
/** "Mon, Oct 19 · midnight – 7:00 AM" (the gap's day and time, without its counts). */
function gapWhen(item: ManagerActionItem) {
  const [day, time] = item.detail.split(' · ');
  const when = time === 'all day' ? 'All day' : time;
  return spacedRanges([day, when].filter(Boolean).join(' · ')).replace(/ /g, ' ');
}
const requestIcon = { TIME_OFF: AirplaneTiltIcon, EXCHANGE: ArrowsLeftRightIcon, CALLOUT: UserMinusIcon } as const;
const requestWords = { TIME_OFF: 'asked for time off', EXCHANGE: 'asked to change a shift', CALLOUT: 'can’t work a shift' } as const;

/** Activity rows, newest first: the latest publication, requests sent this week and coverage gaps (identical gaps on one
 * day are one row with a count). */
export function activityEntries(revision: ActivityRevision, actions: readonly ManagerActionItem[], timeZone: string): ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  if (revision) entries.push({ key: `revision:${revision.revisionNumber}`, at: revision.createdAt, icon: ic(CalendarCheckIcon), title: revisionTitle(revision.sourceType),
    detail: `Revision ${revision.revisionNumber} · ${formatBusinessTimestamp(revision.createdAt, timeZone)}` });
  const gaps = new Map<string, ActivityEntry & { count: number }>();
  for (const item of actions) {
    if (!item.dateTime) continue;
    if (item.type === 'COVERAGE_GAP') {
      const title = gapTitle(item), detail = gapWhen(item), key = `${title}|${detail}`;
      const existing = gaps.get(key);
      if (existing) { existing.count++; continue; }
      gaps.set(key, { key: item.id, at: item.dateTime, icon: ic(CalendarXIcon), title, detail, href: item.href, count: 1 });
    } else if (item.type === 'TIME_OFF' || item.type === 'EXCHANGE' || item.type === 'CALLOUT') {
      const person = item.detail.replace(/ is waiting for review\.?$/, '').trim();
      let sent = '';
      try { sent = new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(item.dateTime)); } catch { /* no time */ }
      entries.push({ key: item.id, at: item.dateTime, icon: ic(requestIcon[item.type]), title: `${person} ${requestWords[item.type]}`, detail: sent ? `Sent ${sent}` : 'Waiting for you', href: item.href });
    }
  }
  for (const gap of gaps.values()) entries.push({ ...gap, value: gap.count > 1 ? String(gap.count) : undefined });
  const time = (entry: ActivityEntry) => { const at = Date.parse(entry.at); return Number.isFinite(at) ? at : 0; };
  return entries.sort((a, b) => time(b) - time(a));
}

export function ActivityPage({ weekStart, previousWeek, nextWeek, latestRevision, managerActions, timeZone }: {
  weekStart: string; previousWeek: string; nextWeek: string; latestRevision: ActivityRevision; managerActions: readonly ManagerActionItem[]; timeZone: string;
}) {
  const href = (week: string) => `/app?view=activity&week=${encodeURIComponent(week)}`;
  const entries = activityEntries(latestRevision, managerActions, timeZone);
  return <QuietPage className="u1-activity">
    <QuietNav back={{ href: `/app/schedule?week=${encodeURIComponent(weekStart)}`, label: 'Schedule' }} title={<WeekStepper weekStart={weekStart} previousHref={href(previousWeek)} nextHref={href(nextWeek)} />} />
    <QuietHeader title="Activity" sub={weekLabel(weekStart)} />
    {entries.length ? <QuietList label="Activity this week" style={{ marginTop: 16 }}>
      {entries.map(entry => <QuietRow key={entry.key} icon={entry.icon} title={entry.title} detail={entry.detail} value={entry.value} href={entry.href}
        label={entry.href ? `${entry.title}, ${entry.detail}${entry.value ? `, ${entry.value} shifts` : ''}` : undefined} />)}
    </QuietList> : <p className="q-empty" style={{ marginTop: 24 }}>No activity this week.</p>}
  </QuietPage>;
}
