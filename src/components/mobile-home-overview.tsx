import Link from "next/link";
import { CaretLeftIcon, CaretRightIcon, UsersThreeIcon, ClipboardTextIcon,
  ClockIcon, ClockCounterClockwiseIcon } from "@phosphor-icons/react/ssr";

/** Card and mapped action anatomy adapted from 21st's Dashboard Activities
 * and Quick Actions Grid Drawer, with NEVORA routes, tokens and icon family. */
export function MobileHomeOverview({ weekStart, weekLabel, previousWeek, nextWeek,
  plannedShifts, availabilityReceived, activeEmployees, publishedLocations, locations }: {
  weekStart: string; weekLabel: string; previousWeek: string; nextWeek: string;
  plannedShifts: number; availabilityReceived: number; activeEmployees: number;
  publishedLocations: number; locations: number;
}) {
  return <section className="mobile-home-schedule" aria-labelledby="mobile-home-schedule-title">
    <h2 id="mobile-home-schedule-title">Weekly schedule</h2>
    <div className="mobile-home-week">
      <Link href={`/app?week=${encodeURIComponent(previousWeek)}`} aria-label="Previous schedule week" title="Previous schedule week"><CaretLeftIcon size={20} aria-hidden="true"/></Link>
      <strong>{weekLabel}</strong>
      <Link href={`/app?week=${encodeURIComponent(nextWeek)}`} aria-label="Next schedule week" title="Next schedule week"><CaretRightIcon size={20} aria-hidden="true"/></Link>
    </div>
    <dl className="mobile-home-week-facts">
      <div><dt>Planned shifts <small>including drafts</small></dt><dd>{plannedShifts}</dd></div>
      <div><dt>Availability received</dt><dd>{availabilityReceived}<span> / {activeEmployees}</span></dd></div>
      <div><dt>Published locations</dt><dd>{publishedLocations}<span> / {locations}</span></dd></div>
    </dl>
    <Link href={`/app/schedule?week=${encodeURIComponent(weekStart)}`} className="mobile-home-schedule-action">View schedule</Link>
  </section>;
}

export function MobileHomeTools({ weekStart }: { weekStart: string }) {
  const actions = [
    { view: "attendance", label: "Review attendance", Icon: ClockIcon },
    { view: "team", label: "Team overview", Icon: UsersThreeIcon },
    { view: "requests", label: "Pending requests", Icon: ClipboardTextIcon },
    { view: "activity", label: "Schedule activity", Icon: ClockCounterClockwiseIcon },
  ];
  return <nav className="mobile-home-tools" aria-label="Home team views">
    {actions.map(({ view, label, Icon }) => <Link key={view} href={`/app?week=${encodeURIComponent(weekStart)}&view=${view}`}>
      <Icon size={24} weight="regular" aria-hidden="true"/><span>{label}</span><CaretRightIcon size={18} aria-hidden="true"/>
    </Link>)}
  </nav>;
}
