import "./team-overview.css";
import Link from "next/link";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { CorpAvatar, CorpCard, CorpLink, CorpNav, CorpPage, CorpPill, CorpRow, CorpRows, CorpStats, CorpTitle } from "@/components/corp/corp";

export type TeamOverviewHour = {
  employeeId: string; employeeName: string; scheduledHours: number; targetHours?: number;
  status: "UNDER" | "ON_TARGET" | "OVER" | "TARGET_MISSING";
};

const SHOWN = 8;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const week = (weekStart: string) => `/app?week=${encodeURIComponent(weekStart)}&view=team`;
const pill = (status: TeamOverviewHour["status"]) => status === "ON_TARGET" ? <CorpPill tone="teal">On target</CorpPill>
  : status === "TARGET_MISSING" ? <CorpPill tone="neutral">Not set</CorpPill>
  : <CorpPill tone="amber">{status === "UNDER" ? "Below target" : "Above target"}</CorpPill>;

/** Team overview (Team → Hours this week), on the kit: the week's facts, then each person's scheduled hours against their
 * weekly target. Presentation only: the same dashboard read as before, the same week links. */
export function TeamOverviewCorp({ weekStart, weekLabel, previousWeek, nextWeek, hours, activeEmployees, availabilitySubmitted, availabilityEligible }: {
  weekStart: string; weekLabel: string; previousWeek: string; nextWeek: string; hours: TeamOverviewHour[];
  activeEmployees: number; availabilitySubmitted: number; availabilityEligible: number;
}) {
  const outside = hours.filter(item => item.status === "UNDER" || item.status === "OVER").length;
  const shown = hours.slice(0, SHOWN);
  return <CorpPage className="c-teamweek" labelledBy="team-week-title">
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
        { label: "Outside target", value: outside, tone: outside ? "amber" : undefined },
      ]} />
    </CorpCard>
    <CorpCard id="team-hours" label="Scheduled hours" aside={<CorpLink href="/app/schedule/settings">Manage targets</CorpLink>}>
      {shown.length ? <CorpRows label="Scheduled hours by person">{shown.map(item => <li key={item.employeeId}>
        <CorpRow bold title={item.employeeName}
          avatar={<CorpAvatar initials={initials(item.employeeName)} />}
          detail={item.targetHours === undefined ? `${item.scheduledHours} h scheduled · no weekly target` : `${item.scheduledHours} h scheduled · ${item.targetHours} h target`}
          trail={pill(item.status)} chevron={false} />
      </li>)}</CorpRows> : <p className="c-empty">Hours appear here as shifts are added.</p>}
      {hours.length > SHOWN ? <p className="c-teamweek__more">{`Showing ${SHOWN} of ${hours.length} people`}</p> : null}
    </CorpCard>
  </CorpPage>;
}
