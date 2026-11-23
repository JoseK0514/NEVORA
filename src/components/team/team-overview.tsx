import "./team-overview.css";
import Link from "next/link";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import type { PortalLang } from "@/lib/i18n/portal-lang";
import { TEAM_COPY } from "@/components/team-copy";
import { CorpAvatar, CorpCard, CorpLink, CorpNav, CorpPage, CorpPill, CorpRow, CorpRows, CorpStats, CorpTitle } from "@/components/corp/corp";

export type TeamOverviewHour = {
  employeeId: string; employeeName: string; scheduledHours: number; targetHours?: number;
  status: "UNDER" | "ON_TARGET" | "OVER" | "TARGET_MISSING";
};

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const week = (weekStart: string) => `/app?week=${encodeURIComponent(weekStart)}&view=team`;
const hoursText = (value: number) => `${Math.round(Math.abs(value) * 10) / 10} h`;
/** Owner premium (visual-craft I): the variance as plain detail text, not a pill on every row ("32 h of 32 h · On target",
 * "0 h of 32 h · 32 h under"); the off-target count stays in This week. */
const hoursDetail = (item: TeamOverviewHour, t: typeof TEAM_COPY.en) => item.targetHours === undefined || item.status === "TARGET_MISSING"
  ? t.scheduledNoTarget(item.scheduledHours)
  : t.hoursOf(item.scheduledHours, item.targetHours, item.status === "ON_TARGET");
/** Review B5 (NV-072): off target is a chip, amber over ("16 h over") and grey under ("8 h under"); on target stays a line. */
const variance = (item: TeamOverviewHour, t: typeof TEAM_COPY.en) => item.targetHours === undefined || (item.status !== "OVER" && item.status !== "UNDER") ? undefined
  : { text: `${hoursText(item.scheduledHours - item.targetHours)} ${item.status === "UNDER" ? t.under : t.over}`, tone: item.status === "OVER" ? "amber" as const : "neutral" as const };

/** Hours this week (Team → Hours this week), on the kit: the week's facts, then each person's scheduled hours against their
 * weekly target, everyone listed (no hidden ninth person). Presentation only: the same dashboard read, the same week links. */
export function TeamOverviewCorp({ weekStart, weekLabel, previousWeek, nextWeek, hours, activeEmployees, availabilitySubmitted, availabilityEligible, viewerId, lang = "en" }: {
  weekStart: string; weekLabel: string; previousWeek: string; nextWeek: string; hours: TeamOverviewHour[];
  activeEmployees: number; availabilitySubmitted: number; availabilityEligible: number;
  /** The person looking (review B5, NV-138): their own row says "You". */
  viewerId?: string;
  /** The person's language (the dashboard passes it). */
  lang?: PortalLang;
}) {
  const t = TEAM_COPY[lang];
  const outside = hours.filter(item => item.status === "UNDER" || item.status === "OVER").length;
  return <CorpPage className="c-teamweek c-page--narrow" labelledBy="team-week-title" lang={lang === "es" ? "es" : undefined}>
    <CorpNav back={{ href: "/app/employees", label: t.team }} title={t.hoursThisWeek} titleId="team-week-nav" phoneOnly />
    <CorpTitle id="team-week-title" title={t.hoursThisWeek} wide />
    <nav className="c-week" aria-label={t.week}>
      <Link className="c-week__arrow" href={week(previousWeek)} aria-label={t.previousWeek}><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true" /></Link>
      <span className="c-week__label">{weekLabel}</span>
      <Link className="c-week__arrow" href={week(nextWeek)} aria-label={t.nextWeek}><CaretRightIcon className="c-ic" weight="bold" aria-hidden="true" /></Link>
    </nav>
    <CorpCard id="team-week" label={t.thisWeek} aside={<CorpLink href={`/app/availability?week=${encodeURIComponent(weekStart)}`}>{t.viewAvailability}</CorpLink>}>
      <CorpStats items={[
        { label: t.active, value: activeEmployees },
        { label: t.availability, value: t.of(availabilitySubmitted, availabilityEligible) },
        // R3: figures are ink; each person's line below says under or over.
        { label: t.offTarget, value: outside },
      ]} />
    </CorpCard>
    <CorpCard id="team-hours" label={t.scheduledHours} aside={<CorpLink href="/app/schedule/settings">{t.manageTargets}</CorpLink>}>
      {/* Review B5 (NV-138): people in name order, as on Team. */}
      {hours.length ? <CorpRows label={t.byPerson}>{[...hours].sort((a, b) => a.employeeName.localeCompare(b.employeeName)).map(item => <li key={item.employeeId}>
        <CorpRow bold title={item.employeeId === viewerId ? <>{item.employeeName} <CorpPill>{t.you}</CorpPill></> : item.employeeName}
          avatar={<CorpAvatar name={item.employeeName} initials={initials(item.employeeName)} />}
          detail={hoursDetail(item, t)} trail={variance(item, t) ? <CorpPill tone={variance(item, t)!.tone}>{variance(item, t)!.text}</CorpPill> : undefined}
          label={t.rowLabel(item.employeeName, item.scheduledHours, item.targetHours)}
          chevron={false} />
      </li>)}</CorpRows> : <div className="c-empty c-empty--card"><b className="c-empty__title">{t.noHours}</b><span className="c-empty__body">{t.hoursAppear}</span></div>}
    </CorpCard>
  </CorpPage>;
}
