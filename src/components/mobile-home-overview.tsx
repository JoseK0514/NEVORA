import Link from "next/link";
import { CaretLeftIcon, CaretRightIcon, UsersThreeIcon, ClipboardTextIcon,
  ClockIcon, ClockCounterClockwiseIcon, WrenchIcon, LockKeyIcon, CalendarCheckIcon } from "@phosphor-icons/react/ssr";

/** A fraction shown as "n of total" with a quiet bar; the text carries the meaning. */
function Fraction({ value, total }: { value: number; total: number }) {
  const share = total > 0 ? Math.min(100, Math.round(value / total * 100)) : 0;
  return <dd className="home-fraction">
    <span className="home-fact-value">{value}<span> of {total}</span></span>
    <span className="home-progress" aria-hidden="true"><span style={{ width: `${share}%` }}/></span>
  </dd>;
}

/** Selected-week planning facts (Gusto "This week" anatomy), on every width. */
export function MobileHomeOverview({ weekStart, weekLabel, previousWeek, nextWeek,
  plannedShifts, availabilityReceived, availabilityEligible, publishedLocations, locations }: {
  weekStart: string; weekLabel: string; previousWeek: string; nextWeek: string;
  plannedShifts: number; availabilityReceived: number; availabilityEligible: number;
  publishedLocations: number; locations: number;
}) {
  return <section className="mobile-home-schedule" aria-labelledby="mobile-home-schedule-title">
    <h2 id="mobile-home-schedule-title">This week</h2>
    <div className="mobile-home-week">
      <Link href={`/app?week=${encodeURIComponent(previousWeek)}`} aria-label="Previous schedule week" title="Previous schedule week"><CaretLeftIcon size={20} aria-hidden="true"/></Link>
      <strong>{weekLabel}</strong>
      <Link href={`/app?week=${encodeURIComponent(nextWeek)}`} aria-label="Next schedule week" title="Next schedule week"><CaretRightIcon size={20} aria-hidden="true"/></Link>
    </div>
    <dl className="mobile-home-week-facts">
      <div><dt>Planned shifts <small>Includes drafts</small></dt><dd><span className="home-fact-value">{plannedShifts}</span></dd></div>
      <div><dt>Availability received <small>Employees and leads</small></dt><Fraction value={availabilityReceived} total={availabilityEligible}/></div>
      <div><dt>Locations published</dt><Fraction value={publishedLocations} total={locations}/></div>
    </dl>
    <Link href={`/app/schedule?week=${encodeURIComponent(weekStart)}`} className="mobile-home-schedule-action"><span>View schedule</span><CaretRightIcon size={18} aria-hidden="true"/></Link>
  </section>;
}

/** The latest published-schedule revision, when one exists. */
export function HomeRecentActivity({ weekStart, label, detail, dateTime }: { weekStart: string; label: string; detail: string; dateTime: string }) {
  return <section className="home-recent-activity" aria-labelledby="home-recent-activity-title">
    <h2 id="home-recent-activity-title">Recent activity</h2>
    <div className="home-recent-row">
      <CalendarCheckIcon size={20} aria-hidden="true"/>
      <p><strong>{label}</strong><span><time dateTime={dateTime}>{detail}</time></span></p>
    </div>
    <Link className="mobile-home-schedule-action" href={`/app?week=${encodeURIComponent(weekStart)}&view=activity`}><span>View all activity</span><CaretRightIcon size={18} aria-hidden="true"/></Link>
  </section>;
}

export function MobileHomeTools({ weekStart }: { weekStart: string }) {
  const week = encodeURIComponent(weekStart);
  const actions = [
    { href: `/app?week=${week}&view=attendance`, label: "Review attendance", Icon: ClockIcon },
    { href: `/app?week=${week}&view=team`, label: "Team overview", Icon: UsersThreeIcon },
    { href: "/app/inbox?filter=requests", label: "Pending requests", Icon: ClipboardTextIcon },
    { href: `/app?week=${week}&view=activity`, label: "Schedule activity", Icon: ClockCounterClockwiseIcon },
    { href: "/app/clocker-recovery", label: "Clocker recovery", Icon: WrenchIcon },
    { href: "/app/account-recovery", label: "Account recovery", Icon: LockKeyIcon },
  ];
  return <nav className="mobile-home-tools" aria-labelledby="mobile-home-tools-title">
    <h2 id="mobile-home-tools-title">Shortcuts</h2>
    {actions.map(({ href, label, Icon }) => <Link key={href} href={href}>
      <Icon size={24} weight="regular" aria-hidden="true"/><span>{label}</span><CaretRightIcon size={18} aria-hidden="true"/>
    </Link>)}
  </nav>;
}
