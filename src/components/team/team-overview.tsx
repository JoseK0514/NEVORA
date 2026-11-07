import "./team-overview.css";
import Link from "next/link";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { CorpAvatar, CorpCard, CorpLink, CorpNav, CorpPage, CorpRow, CorpRows, CorpStats, CorpTitle } from "@/components/corp/corp";

export type TeamOverviewHour = {
  employeeId: string; employeeName: string; scheduledHours: number; targetHours?: number;
  status: "UNDER" | "ON_TARGET" | "OVER" | "TARGET_MISSING";
};

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const week = (weekStart: string) => `/app?week=${encodeURIComponent(weekStart)}&view=team`;
const hoursText = (value: number) => `${Math.round(Math.abs(value) * 10) / 10} h`;
/** Owner premium (visual-craft I): the variance as plain detail text, not a pill on every row ("32 h of 32 h · On target",
 * "0 h of 32 h · 32 h under"); the off-target count stays in This week. */
const hoursDetail = (item: TeamOverviewHour) => item.targetHours === undefined || item.status === "TARGET_MISSING"
  ? `${item.scheduledHours} h scheduled · No weekly target`
  : `${item.scheduledHours} h of ${item.targetHours} h · ${item.status === "ON_TARGET" ? "On target" : `${hoursText(item.scheduledHours - item.targetHours)} ${item.status === "UNDER" ? "under" : "over"}`}`;

/** Hours this week (Team → Hours this week), on the kit: the week's facts, then each person's scheduled hours against their
 * weekly target, everyone listed (no hidden ninth person). Presentation only: the same dashboard read, the same week links. */
export function TeamOverviewCorp({ weekStart, weekLabel, previousWeek, nextWeek, hours, activeEmployees, availabilitySubmitted, availabilityEligible }: {
  weekStart: string; weekLabel: string; previousWeek: string; nextWeek: string; hours: TeamOverviewHour[];
  activeEmployees: number; availabilitySubmitted: number; availabilityEligible: number;
}) {
  const outside = hours.filter(item => item.status === "UNDER" || item.status === "OVER").length;
  return <CorpPage className="c-teamweek c-page--narrow" labelledBy="team-week-title">
    <CorpNav back={{ href: "/app/employees", label: "Team" }} title="Hours this week" titleId="team-week-nav" phoneOnly />
    <CorpTitle id="team-week-title" title="Hours this week" wide />
    <nav className="c-week" aria-label="Week">
      <Link className="c-week__arrow" href={week(previousWeek)} aria-label="Previous week"><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true" /></Link>
      <span className="c-week__label">{weekLabel}</span>
      <Link className="c-week__arrow" href={week(nextWeek)} aria-label="Next week"><CaretRightIcon className="c-ic" weight="bold" aria-hidden="true" /></Link>
    </nav>
    <CorpCard id="team-week" label="This week" aside={<CorpLink href={`/app/availability?week=${encodeURIComponent(weekStart)}`}>View availability</CorpLink>}>
      <CorpStats items={[
        { label: "Active", value: activeEmployees },
        { label: "Availability", value: `${availabilitySubmitted} of ${availabilityEligible}` },
        // R3: figures are ink; each person's line below says under or over.
        { label: "Off target", value: outside },
      ]} />
    </CorpCard>
    <CorpCard id="team-hours" label="Scheduled hours" aside={<CorpLink href="/app/schedule/settings">Manage targets</CorpLink>}>
      {hours.length ? <CorpRows label="Scheduled hours by person">{hours.map(item => <li key={item.employeeId}>
        <CorpRow bold title={item.employeeName}
          avatar={<CorpAvatar name={item.employeeName} initials={initials(item.employeeName)} />}
          detail={hoursDetail(item)}
          label={`${item.employeeName}, ${item.scheduledHours} hours scheduled${item.targetHours === undefined ? ", no weekly target" : ` of a ${item.targetHours} hour target`}`}
          chevron={false} />
      </li>)}</CorpRows> : <div className="c-empty c-empty--card"><b className="c-empty__title">No hours scheduled</b><span className="c-empty__body">Hours appear here as shifts are added.</span></div>}
    </CorpCard>
  </CorpPage>;
}
