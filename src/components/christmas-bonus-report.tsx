import Link from "next/link";
import type { ReactNode } from "react";
import { CorpBody, CorpButton, CorpCard, CorpField, CorpMeta, CorpNav, CorpNote, CorpPage, CorpPill, CorpRow, CorpRows, CorpStats, CorpTitle } from "@/components/corp/corp";
import { formatDateRange } from "@/lib/date-utils";
import { minutesFromNanoseconds } from "@/lib/duration-format";
import { keepWhole } from "@/lib/keep-whole";
import type { BonusRow, BonusYear, ChristmasBonusReport } from "@/lib/reports/christmas-bonus";
import "./christmas-bonus-report.css";

/** The disclaimer the page leads with (Jose's brief, Nov 18, 2026); kept word for word. */
export const CHRISTMAS_BONUS_DISCLAIMER = "Informational only. Christmas bonus eligibility, amounts and exemptions depend on employer size and Puerto Rico law. Confirm with your payroll provider or counsel before paying.";

const fullDate = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const yearRange = (year: BonusYear) => formatDateRange(year.startDate, year.endDate);
const grouped = (value: number) => value.toLocaleString("en-US");
/** A row figure in the shared row style ("812 h 05", "45 min"), with thousands grouped so it reads beside "1,350 h". */
function hoursFigure(nanoseconds: string) {
  const minutes = minutesFromNanoseconds(nanoseconds);
  if (minutes === null) return "—";
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return hours && rest ? `${grouped(hours)} h ${String(rest).padStart(2, "0")}` : hours ? `${grouped(hours)} h` : rest ? `${rest} min` : "0 h";
}
const days = (count: number) => `${count} ${count === 1 ? "day" : "days"}`;

const STATUS: Record<BonusRow["status"], { words: string; tone: "green" | "amber" | null }> = {
  REACHED: { words: "Reached", tone: "green" },
  CHECK_BREAKS: { words: "Check breaks", tone: "amber" },
  NOT_CONFIRMED: { words: "Not confirmed", tone: "amber" },
  NOT_REACHED: { words: "Not reached", tone: null },
  NEEDS_HIRE_DATE: { words: "Add hire date", tone: "amber" },
};

function status(row: BonusRow): ReactNode {
  const { words, tone } = STATUS[row.status];
  return tone ? <CorpPill tone={tone}>{words}</CorpPill> : <CorpMeta>{words}</CorpMeta>;
}

/** One detail line, key figure first: "812 h 30 of 700 h · Hired Mar 2, 2016 · ID 10482". The status pill is the row's
 * only trailing item, so names keep their width on a 320px phone. */
function detail(row: BonusRow): string {
  const hours = hoursFigure(row.recordedNanoseconds);
  const parts = [row.thresholdHours !== null ? `${hours} of ${grouped(row.thresholdHours)} h` : `${hours} recorded`];
  parts.push(row.hireDate ? `Hired ${fullDate(row.hireDate)}` : "No hire date");
  parts.push(`ID ${row.employeeId}`);
  if (row.status === "CHECK_BREAKS") parts.push(`Includes ${hoursFigure(row.breakNanoseconds)} of breaks`);
  if (row.unfinalizedDays) parts.push(`${days(row.unfinalizedDays)} not finalized`);
  if (!row.active) parts.push("Inactive");
  return parts.join(" · ");
}

/** Name with its status beside it (the Team overview pattern), then one detail line. No avatar or trailing value:
 * a 320px phone keeps the whole width for the name and the figures. */
function PersonRow({ row }: { row: BonusRow }) {
  const hours = hoursFigure(row.recordedNanoseconds);
  const title = <>{row.name} {status(row)}</>;
  const spoken = [row.name, `employee ID ${row.employeeId}`, row.hireDate ? `hired ${fullDate(row.hireDate)}` : "no hire date",
    `${hours} recorded`, row.thresholdHours !== null ? `needs ${grouped(row.thresholdHours)} hours` : null, STATUS[row.status].words].filter(Boolean).join(", ");
  // Without a hire date there is no threshold: the row opens Edit employee, where the date is added.
  return row.status === "NEEDS_HIRE_DATE"
    ? <CorpRow bold title={title} detail={detail(row)} href={`/app/employees/${encodeURIComponent(row.employeeId)}?edit=1`} label={`${spoken}. Open their profile to add it.`} chevron />
    : <CorpRow bold title={title} detail={detail(row)} label={spoken} chevron={false} />;
}

/** Christmas bonus hours (Insights): who crossed the Puerto Rico hours threshold in a completed bonus year. No money
 * amounts and no eligibility decision; the disclaimer says to confirm before paying. Server-rendered from one read. */
export function ChristmasBonusView({ report, choices }: { report: ChristmasBonusReport; choices: BonusYear[] }) {
  const { year, rows, summary } = report;
  return <CorpPage className="c-bonus c-page--narrow" labelledBy="bonus-title">
    <CorpNav back={{ href: "/app/reports", label: "Insights" }} title="Christmas bonus hours" titleId="bonus-nav-title" phoneOnly />
    <CorpTitle id="bonus-title" title="Christmas bonus hours" sub={<>{keepWhole(`Bonus year ${yearRange(year)}`)} · All locations</>} wide />
    <CorpCard id="bonus-about" ariaLabel="About this report">
      <CorpBody><p className="c-line2" role="note">{CHRISTMAS_BONUS_DISCLAIMER}</p></CorpBody>
      <CorpRows label="Dates for this bonus year">
        <li><CorpRow title="Payment window" value={keepWhole(formatDateRange(year.paymentStartDate, year.paymentEndDate))} valueTone="soft" /></li>
        <li><CorpRow title="Exemption filing deadline" value={keepWhole(fullDate(year.exemptionDeadline))} valueTone="soft" /></li>
      </CorpRows>
    </CorpCard>
    <CorpCard id="bonus-year" as="div" ariaLabel="Choose a bonus year">
      <CorpBody>
        <form className="c-bonus__year" method="get" action="/app/reports/christmas-bonus">
          <CorpField label="Bonus year (Oct 1 to Sep 30)" htmlFor="bonus-year-choice">
            <select id="bonus-year-choice" className="c-in" name="year" defaultValue={String(year.endYear)}>
              {choices.map(choice => <option key={choice.endYear} value={String(choice.endYear)}>{`Oct ${choice.endYear - 1} – Sep ${choice.endYear}`}</option>)}
            </select>
          </CorpField>
          <CorpButton type="submit" kind="secondary" size="md">Show year</CorpButton>
        </form>
      </CorpBody>
    </CorpCard>
    <CorpCard id="bonus-summary" label="At a glance">
      <CorpStats items={[{ label: "People", value: summary.people }, { label: "Reached", value: summary.reached }, { label: "Need a hire date", value: summary.needsHireDate }]} />
    </CorpCard>
    {summary.peopleWithUnfinalizedDays ? <p className="c-note c-note--warn"><span>
      {`Hours count finalized timecards only. ${summary.peopleWithUnfinalizedDays === 1 ? "1 person has" : `${summary.peopleWithUnfinalizedDays} people have`} recorded time on ${days(summary.unfinalizedDays)} that ${summary.unfinalizedDays === 1 ? "isn’t" : "aren’t"} on a finalized timecard yet. `}
      <Link className="c-link" href="/app/timecards">Open Timecards</Link>
    </span></p> : null}
    <CorpCard id="bonus-people" label="People" count={rows.length}>
      {rows.length
        ? <CorpRows label="People in this bonus year">{rows.map(row => <li key={row.employeeId}><PersonRow row={row} /></li>)}</CorpRows>
        : <div className="c-empty c-empty--card"><b className="c-empty__title">No one to show</b><span className="c-empty__body">No one other than Owners was employed or recorded time in this bonus year.</span></div>}
    </CorpCard>
    <CorpNote>{`Hours are recorded time on finalized timecards in this bonus year, breaks included. People hired before Jan 26, 2017 need 700 hours; people hired on or after need 1,350. “Check breaks” means they reach it only if their recorded breaks count as hours worked. Owners aren’t listed.`}</CorpNote>
  </CorpPage>;
}
