import type { ReactNode } from "react";
import { CorpCard, CorpNav, CorpPage, CorpRow, CorpRows, CorpStats, CorpTitle } from "@/components/corp/corp";
import { BCallout, BChip, BNote, BSegs, BState, BStatusText } from "@/components/owner-b/b-kit";
import { formatDateRange } from "@/lib/date-utils";
import { minutesFromNanoseconds } from "@/lib/duration-format";
import { keepWhole } from "@/lib/keep-whole";
import type { BonusRow, BonusYear, ChristmasBonusReport } from "@/lib/reports/christmas-bonus";
import { BonusYearMenu } from "./christmas-bonus-year-menu";
import "./christmas-bonus-report.css";

/** The disclaimer the page leads with (Jose's brief, Nov 18, 2026); kept word for word. */
export const CHRISTMAS_BONUS_DISCLAIMER = "Informational only. Christmas bonus eligibility, amounts and exemptions depend on employer size and Puerto Rico law. Confirm with your payroll provider or counsel before paying.";
/** Final verification F (F18): the disclaimer's first sentence is its note's title, as the amber note's is; same words. */
const [DISCLAIMER_TITLE, ...DISCLAIMER_REST] = CHRISTMAS_BONUS_DISCLAIMER.split(/(?<=\.) /);

const fullDate = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const grouped = (value: number) => value.toLocaleString("en-US");
/** A figure as Insights writes hours ("812 h 5 min", "45 min"; final verification F, F19: it read "812 h 05"), with
 * thousands grouped so it reads beside "1,350 h". */
function hoursFigure(nanoseconds: string) {
  const minutes = minutesFromNanoseconds(nanoseconds);
  if (minutes === null) return "—";
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return hours && rest ? `${grouped(hours)} h ${rest} min` : hours ? `${grouped(hours)} h` : rest ? `${rest} min` : "0 h";
}
const days = (count: number) => `${count} ${count === 1 ? "day" : "days"}`;
/** "Oct 2025 – Sep 2026": the year menu's words for one bonus year. */
const yearLabel = (endYear: number) => `Oct ${endYear - 1} – Sep ${endYear}`;

/* Review 30 (D14): one status label system (premium pass 3.1). The four states that ask for a look are chips (green done,
 * amber check); "Not reached" is the quiet grey status text. "No hire date" (it read "Add hire date", an instruction where a
 * status belongs) matches the detail it replaces and the count above; the row itself opens the profile to add it. */
const STATUS: Record<BonusRow["status"], { words: string; tone: "green" | "amber" | null }> = {
  REACHED: { words: "Reached", tone: "green" },
  CHECK_BREAKS: { words: "Check breaks", tone: "amber" },
  NOT_CONFIRMED: { words: "Not confirmed", tone: "amber" },
  NOT_REACHED: { words: "Not reached", tone: null },
  NEEDS_HIRE_DATE: { words: "No hire date", tone: "amber" },
};

function status(row: BonusRow): ReactNode {
  const { words, tone } = STATUS[row.status];
  return tone ? <BChip tone={tone}>{words}</BChip> : <BStatusText>{words}</BStatusText>;
}

/** Review 30 (D13): each fact stays whole ("ID OWN-CARL", "Hired May 6, 2019", "1 day not finalized"); a line breaks
 * only between facts. Final verification F (F07): the facts are the kit's one line of facts (BSegs), so no line starts or
 * ends with the separator dot. */
const fact = (text: string) => <span className="c-bonus__fact">{keepWhole(text)}</span>;
/** One detail line, key figure first: "812 h 30 min of 700 h · Hired Mar 2, 2016 · ID 10482". */
function detail(row: BonusRow): ReactNode {
  const hours = hoursFigure(row.recordedNanoseconds);
  const parts = [row.thresholdHours !== null ? `${hours} of ${grouped(row.thresholdHours)} h` : `${hours} recorded`];
  // Without a hire date the status chip says "No hire date", so the line doesn't say it twice.
  if (row.hireDate) parts.push(`Hired ${fullDate(row.hireDate)}`);
  parts.push(`ID ${row.employeeId}`);
  if (row.status === "CHECK_BREAKS") parts.push(`Includes ${hoursFigure(row.breakNanoseconds)} of breaks`);
  if (row.unfinalizedDays) parts.push(`${days(row.unfinalizedDays)} not finalized`);
  if (!row.active) parts.push("Inactive");
  return <BSegs className="c-bonus__facts" parts={parts.map(fact)} />;
}

/** Name with its status beside it (the Team overview pattern), then one detail line. No avatar or trailing value: a 320px
 * phone keeps the whole width for the name and the figures; a long name sends the status under it, never mid-name. */
function PersonRow({ row, year }: { row: BonusRow; year: number }) {
  const title = <><span className="c-bonus__name">{row.name}</span>{status(row)}</>;
  // Without a hire date there is no threshold: the row opens Edit employee on the hire date, and comes back here after
  // Save (Review 30, D21). Its name is its visible words (Rondo fix, Nov 23: no separate label).
  return row.status === "NEEDS_HIRE_DATE"
    ? <CorpRow bold title={title} detail={detail(row)} href={`/app/employees/${encodeURIComponent(row.employeeId)}?edit=1&from=bonus&year=${year}`} chevron />
    : <CorpRow bold title={title} detail={detail(row)} chevron={false} />;
}

/** Christmas bonus hours (Insights): who crossed the Puerto Rico hours threshold in a completed bonus year. No money
 * amounts and no eligibility decision; the disclaimer says to confirm before paying. Server-rendered from one read. */
export function ChristmasBonusView({ report, choices }: { report: ChristmasBonusReport; choices: BonusYear[] }) {
  const { year, rows, summary } = report;
  const years = choices.map(choice => ({ endYear: choice.endYear, label: yearLabel(choice.endYear) }));
  const unfinalized = summary.peopleWithUnfinalizedDays
    ? `${summary.peopleWithUnfinalizedDays === 1 ? "1 person has" : `${summary.peopleWithUnfinalizedDays} people have`} recorded time on ${days(summary.unfinalizedDays)} that ${summary.unfinalizedDays === 1 ? "isn’t" : "aren’t"} on a finalized timecard yet.`
    : null;
  return <CorpPage className="c-bonus c-page--narrow" labelledBy="bonus-title">
    <CorpNav back={{ href: "/app/reports", label: "Insights" }} title="Christmas bonus hours" titleId="bonus-nav-title" phoneOnly />
    {/* D11: the year is the band's pill (a menu), as Insights keeps its period; on a phone it sits under the title. */}
    <CorpTitle id="bonus-title" title="Christmas bonus hours" sub={<>{keepWhole(formatDateRange(year.startDate, year.endDate))} · All locations</>} wide
      actions={<BonusYearMenu id="bonus-year-menu" current={year.endYear} choices={years} text="Bonus year" />} />
    <div className="c-phone-sub c-bonus__phoneyear"><BonusYearMenu id="bonus-year-menu-phone" current={year.endYear} choices={years} text={formatDateRange(year.startDate, year.endDate)} /></div>
    <CorpCard id="bonus-about" ariaLabel="About this report">
      {/* The disclaimer is the kit's information note (Jose's words unchanged as its body). */}
      <BCallout tone="teal" icon="info" title={DISCLAIMER_TITLE.replace(/\.$/, "")}>{DISCLAIMER_REST.join(" ")}</BCallout>
      <CorpRows label="Dates for this bonus year">
        <li><CorpRow title="Payment window" value={keepWhole(formatDateRange(year.paymentStartDate, year.paymentEndDate))} valueTone="soft" /></li>
        <li><CorpRow title="Exemption filing deadline" value={keepWhole(fullDate(year.exemptionDeadline))} valueTone="soft" /></li>
      </CorpRows>
    </CorpCard>
    {/* D16: the counts that ask for a decision; the People card already counts people. D17: no counts when no one is
      listed. */}
    {rows.length ? <CorpCard id="bonus-summary" label="At a glance">
      <CorpStats items={[{ label: "Reached", value: summary.reached }, { label: "Check breaks", value: summary.checkBreaks },
        { label: "Not confirmed", value: summary.notConfirmed }, { label: "No hire date", value: summary.needsHireDate }]} />
    </CorpCard> : null}
    {/* F20: no "0" beside the empty state, and the footnote explains rows, so it shows only with rows. */}
    <CorpCard id="bonus-people" label="People" count={rows.length || undefined}>
      {/* D12: the days not finalized qualify these figures, so the note is the People card's first line: the amber
        wait note with Open Timecards as its one action. Same words. */}
      {unfinalized ? <BCallout tone="amber" icon="wait" title="Hours count finalized timecards only" action={{ label: "Open Timecards", href: "/app/timecards" }}>{unfinalized}</BCallout> : null}
      {rows.length
        ? <CorpRows label="People in this bonus year">{rows.map(row => <li key={row.employeeId}><PersonRow row={row} year={year.endYear} /></li>)}</CorpRows>
        // D17: the kit's empty state, and only what NEVORA knows: it has no hours for this year.
        : <div className="c-bonus__empty"><BState kind="empty" silent title="No hours recorded in NEVORA for this bonus year" /></div>}
      {rows.length ? <BNote>{`Hours are recorded time on finalized timecards in this bonus year, breaks included. People hired before Jan 26, 2017 need 700 hours; people hired on or after need 1,350. “Check breaks” means they reach it only if their recorded breaks count as hours worked. Owners aren’t listed.`}</BNote> : null}
    </CorpCard>
  </CorpPage>;
}
