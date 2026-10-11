import Link from 'next/link';
import {ArrowUpRightIcon, MapPinIcon} from '@phosphor-icons/react/ssr';
import type {DashboardDayItem, DashboardLocationItem} from './manager-dashboard';

const locationLabels = {NOT_STARTED: 'Not started', NEEDS_ATTENTION: 'Needs attention', READY: 'Ready to publish', PUBLISHED: 'Published'};

/** Selected-week planning data, never a substitute for recorded attendance. */
export function ManagerWeekOverview({days, locations, weekStart, weekLabel, coverageConfigured}: {
  days: DashboardDayItem[];
  locations: DashboardLocationItem[];
  weekStart: string;
  weekLabel: string;
  coverageConfigured: boolean;
}) {
  const total = days.reduce((sum, day) => sum + day.shiftCount, 0);
  const maximum = Math.max(1, ...days.map(day => day.shiftCount));
  return <section className="manager-week-overview" aria-labelledby="manager-week-title">
    <header><div><h2 id="manager-week-title">The week at a glance</h2><p>{weekLabel} · Planned shifts, including drafts</p></div><Link href={`/app/schedule?week=${encodeURIComponent(weekStart)}`}>View schedule <ArrowUpRightIcon size={18} aria-hidden="true"/></Link></header>
    <div className="manager-week-content">
      <div className="manager-week-chart">
        <p className="manager-chart-total"><strong>{total}</strong> scheduled {total === 1 ? 'shift' : 'shifts'}</p>
        {days.length ? <ol aria-label="Scheduled shifts by day">{days.map(day => <li key={day.date} data-shift-count={day.shiftCount}>
          <span className="manager-bar-value">{day.shiftCount}<span className="sr-only"> scheduled {day.shiftCount === 1 ? 'shift' : 'shifts'} on </span></span>
          <div className="manager-bar-track" aria-hidden="true"><span style={{height: `${day.shiftCount / maximum * 100}%`}}/></div>
          <time dateTime={day.date}><span>{day.weekday}</span><small>{day.day}</small></time>
        </li>)}</ol> : <p>No daily planning data is available for this week.</p>}
        <p className="manager-chart-note">Planning only. Recorded clock activity is shown above.</p>
      </div>
      <div className="manager-location-plan"><h3>Location readiness</h3>
        {locations.length ? <ul>{locations.map(location => <li key={location.locationId}><MapPinIcon size={18} aria-hidden="true"/><div><strong>{location.locationName}</strong><span>{locationLabels[location.state]}</span></div>{location.scheduleStatus ? <span className="manager-location-state" data-state={location.scheduleStatus}>{location.scheduleStatus === 'PUBLISHED' ? 'Published' : location.scheduleStatus === 'ARCHIVED' ? 'Archived' : 'Draft'}</span> : null}</li>)}</ul> : <p>No locations are available for this week.</p>}
        {!coverageConfigured ? <p className="manager-chart-note">Coverage rules need setup before readiness can be assessed.</p> : null}
      </div>
    </div>
  </section>;
}
