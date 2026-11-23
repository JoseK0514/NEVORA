import type { ReactNode } from "react";
import { CorpCard, CorpNav, CorpPage, CorpRow, CorpRows, CorpStats, CorpTitle } from "@/components/corp/corp";
import { BCallout, BChip, BNote, BSegs, BState, BStatusText } from "@/components/owner-b/b-kit";
import { formatDateRange } from "@/lib/date-utils";
import { dateRange } from "@/lib/duration-format";
import { minutesFromNanoseconds } from "@/lib/duration-format";
import { keepWhole } from "@/lib/keep-whole";
import type { BonusRow, BonusYear, ChristmasBonusReport } from "@/lib/reports/christmas-bonus";
import { BonusYearMenu } from "./christmas-bonus-year-menu";
import { CHRISTMAS_BONUS_COPY, type BonusCopy, type BonusLang } from "./christmas-bonus-copy";
import "./christmas-bonus-report.css";

/** The disclaimer the page leads with (Jose's brief, Nov 18, 2026); kept word for word. */
export const CHRISTMAS_BONUS_DISCLAIMER = CHRISTMAS_BONUS_COPY.en.disclaimer;
/** Final verification F (F18): the disclaimer's first sentence is its note's title, as the amber note's is; same words. */
const disclaimerParts = (disclaimer: string) => { const [title, ...rest] = disclaimer.split(/(?<=\.) /); return { title: title.replace(/\.$/, ""), rest: rest.join(" ") }; };
/** "Mar 2, 2016"; Spanish "2 mar 2016". */
const fullDate = (date: string, locale = "en-US") => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
/** "Nov 15–Dec 15, 2026"; Spanish "15 nov–15 dic 2026". */
const yearRange = (start: string, end: string, locale: string) => locale === "en-US" ? formatDateRange(start, end) : dateRange(start, end, { year: "end", locale });
const grouped = (value: number) => value.toLocaleString("en-US");
/** A figure as Insights writes hours ("812 h 5 min", "45 min"; final verification F, F19: it read "812 h 05"), with
 * thousands grouped so it reads beside "1,350 h". */
function hoursFigure(nanoseconds: string) {
  const minutes = minutesFromNanoseconds(nanoseconds);
  if (minutes === null) return "—";
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return hours && rest ? `${grouped(hours)} h ${rest} min` : hours ? `${grouped(hours)} h` : rest ? `${rest} min` : "0 h";
}
/* Review 30 (D14): one status label system (premium pass 3.1). The four states that ask for a look are chips (green done,
 * amber check); "Not reached" is the quiet grey status text. "No hire date" (it read "Add hire date", an instruction where a
 * status belongs) matches the detail it replaces and the count above; the row itself opens the profile to add it. */
const STATUS_TONE: Record<BonusRow["status"], "green" | "amber" | null> = {
  REACHED: "green", CHECK_BREAKS: "amber", NOT_CONFIRMED: "amber", NOT_REACHED: null, NEEDS_HIRE_DATE: "amber",
};
function status(row: BonusRow, t: BonusCopy): ReactNode {
  const words = t.status[row.status], tone = STATUS_TONE[row.status];
  return tone ? <BChip tone={tone}>{words}</BChip> : <BStatusText>{words}</BStatusText>;
}

/** Review 30 (D13): each fact stays whole ("ID OWN-CARL", "Hired May 6, 2019", "1 day not finalized"); a line breaks
 * only between facts. Final verification F (F07): the facts are the kit's one line of facts (BSegs), so no line starts or
 * ends with the separator dot. */
const fact = (text: string) => <span className="c-bonus__fact">{keepWhole(text)}</span>;
/** One detail line, key figure first: "812 h 30 min of 700 h · Hired Mar 2, 2016 · ID 10482". */
function detail(row: BonusRow, t: BonusCopy): ReactNode {
  const hours = hoursFigure(row.recordedNanoseconds);
  const parts = [row.thresholdHours !== null ? t.ofThreshold(hours, grouped(row.thresholdHours)) : t.recorded(hours)];
  // Without a hire date the status chip says "No hire date", so the line doesn't say it twice.
  if (row.hireDate) parts.push(t.hired(fullDate(row.hireDate, t.locale)));
  parts.push(t.id(row.employeeId));
  if (row.status === "CHECK_BREAKS") parts.push(t.includesBreaks(hoursFigure(row.breakNanoseconds)));
  if (row.unfinalizedDays) parts.push(t.notFinalized(t.days(row.unfinalizedDays)));
  if (!row.active) parts.push(t.inactive);
  return <BSegs className="c-bonus__facts" parts={parts.map(fact)} />;
}

/** Name with its status beside it (the Team overview pattern), then one detail line. No avatar or trailing value: a 320px
 * phone keeps the whole width for the name and the figures; a long name sends the status under it, never mid-name. */
function PersonRow({ row, year, t }: { row: BonusRow; year: number; t: BonusCopy }) {
  const title = <><span className="c-bonus__name">{row.name}</span>{status(row, t)}</>;
  // Without a hire date there is no threshold: the row opens Edit employee on the hire date, and comes back here after
  // Save (Review 30, D21). Its name is its visible words (Rondo fix, Nov 23: no separate label).
  return row.status === "NEEDS_HIRE_DATE"
    ? <CorpRow bold title={title} detail={detail(row, t)} href={`/app/employees/${encodeURIComponent(row.employeeId)}?edit=1&from=bonus&year=${year}`} chevron />
    : <CorpRow bold title={title} detail={detail(row, t)} chevron={false} />;
}

/** Christmas bonus hours (Insights): who crossed the Puerto Rico hours threshold in a completed bonus year. No money
 * amounts and no eligibility decision; the disclaimer says to confirm before paying. Server-rendered from one read. */
/* Rondo Spanish (G98): a server view, so the page passes the person's language (English when it isn't given). */
export function ChristmasBonusView({ report, choices, lang = "en" }: { report: ChristmasBonusReport; choices: BonusYear[]; lang?: BonusLang }) {
  const t = CHRISTMAS_BONUS_COPY[lang], locale = t.locale;
  const { year, rows, summary } = report;
  const years = choices.map(choice => ({ endYear: choice.endYear, label: t.yearLabel(choice.endYear) }));
  const unfinalized = summary.peopleWithUnfinalizedDays ? t.unfinalized(summary.peopleWithUnfinalizedDays, summary.unfinalizedDays) : null;
  const disclaimer = disclaimerParts(t.disclaimer);
  return <CorpPage className="c-bonus c-page--narrow" labelledBy="bonus-title">
    <CorpNav back={{ href: "/app/reports", label: t.insights }} title={t.title} titleId="bonus-nav-title" phoneOnly />
    {/* D11: the year is the band's pill (a menu), as Insights keeps its period; on a phone it sits under the title. */}
    <CorpTitle id="bonus-title" title={t.title} sub={<>{keepWhole(yearRange(year.startDate, year.endDate, locale))} · {t.allLocations}</>} wide
      actions={<BonusYearMenu id="bonus-year-menu" current={year.endYear} choices={years} text={t.bonusYear} />} />
    <div className="c-phone-sub c-bonus__phoneyear"><BonusYearMenu id="bonus-year-menu-phone" current={year.endYear} choices={years} text={yearRange(year.startDate, year.endDate, locale)} /></div>
    <CorpCard id="bonus-about" ariaLabel={t.about}>
      {/* The disclaimer is the kit's information note (Jose's words unchanged as its body). */}
      <BCallout tone="teal" icon="info" title={disclaimer.title}>{disclaimer.rest}</BCallout>
      <CorpRows label={t.datesForYear}>
        <li><CorpRow title={t.paymentWindow} value={keepWhole(yearRange(year.paymentStartDate, year.paymentEndDate, locale))} valueTone="soft" /></li>
        <li><CorpRow title={t.exemptionDeadline} value={keepWhole(fullDate(year.exemptionDeadline, locale))} valueTone="soft" /></li>
      </CorpRows>
    </CorpCard>
    {/* D16: the counts that ask for a decision; the People card already counts people. D17: no counts when no one is
      listed. */}
    {rows.length ? <CorpCard id="bonus-summary" label={t.atAGlance}>
      <CorpStats items={[{ label: t.status.REACHED, value: summary.reached }, { label: t.status.CHECK_BREAKS, value: summary.checkBreaks },
        { label: t.status.NOT_CONFIRMED, value: summary.notConfirmed }, { label: t.status.NEEDS_HIRE_DATE, value: summary.needsHireDate }]} />
    </CorpCard> : null}
    {/* F20: no "0" beside the empty state, and the footnote explains rows, so it shows only with rows. */}
    <CorpCard id="bonus-people" label={t.people} count={rows.length || undefined}>
      {/* D12: the days not finalized qualify these figures, so the note is the People card's first line: the amber
        wait note with Open Timecards as its one action. Same words. */}
      {unfinalized ? <BCallout tone="amber" icon="wait" title={t.finalizedOnly} action={{ label: t.openTimecards, href: "/app/timecards" }}>{unfinalized}</BCallout> : null}
      {rows.length
        ? <CorpRows label={t.peopleInYear}>{rows.map(row => <li key={row.employeeId}><PersonRow row={row} year={year.endYear} t={t} /></li>)}</CorpRows>
        // D17: the kit's empty state, and only what NEVORA knows: it has no hours for this year.
        : <div className="c-bonus__empty"><BState kind="empty" silent title={t.empty} /></div>}
      {rows.length ? <BNote>{t.footnote}</BNote> : null}
    </CorpCard>
  </CorpPage>;
}
