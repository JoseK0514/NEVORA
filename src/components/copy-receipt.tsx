import type { ReactNode } from "react";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { BDoneMark, BState, compactRange } from "@/components/owner-b/b-kit";
import { CorpBody, CorpButtonLink, CorpCard, CorpNav, CorpPage, CorpRow, CorpRows, CorpTitle } from "@/components/corp/corp";
import { ScheduleCopyForm } from "@/components/schedule-copy-form";
import type { CopyCommand, CopyReceipt } from "@/lib/data/schedule-copy";
import { formatDayLabel, formatTimeRange, formatWeekRange } from "@/lib/date-utils";
import "./copy-receipt.css";

/* Copy receipt (Phase 2, queue C8, Nov 22, 2026): the result of "Copy previous week" (and of applying a week template)
 * as a Direction B result screen, in the family of Find cover and Review replacement. The band says what happened, one
 * card says how many shifts were copied into which week, then each kind of warning once with the shifts it affects, then
 * what wasn't copied and why. Same receipt read and the same retry form as before; presentation only. */

/** A warning on a copied shift, in plain words. The data carries codes; an unknown code keeps the server's message. */
const WARNING_WORDS: Record<string, string> = {
  AVAILABILITY_NOT_SUBMITTED: "Availability not confirmed",
  TARGET_HOURS_EXCEEDED: "Goes over their weekly target",
  PREFERENCE_NOT_MET: "Outside their preferred hours",
  MULTIPLE_SHIFTS_SAME_DAY: "Already has a shift that day",
  PROJECTED_OVERTIME_REVIEW: "May go into overtime",
  RULE_UNVERIFIABLE: "A scheduling rule couldn’t be checked",
};

/** Why a shift wasn't copied. The copy's own codes first, then the schedule check that stopped it. */
const SKIP_WORDS: Record<string, string> = {
  TEMPLATE_UNAVAILABLE: "The template isn’t available anymore",
  EMPLOYEE_UNAVAILABLE: "Open shifts aren’t copied",
  ASSIGNMENT_UNAVAILABLE: "The person or location isn’t available anymore",
  INVALID_LOCAL_TIME: "The time doesn’t exist that day (clock change)",
  SHIFT_OVERLAP: "Overlaps another shift",
  MULTIPLE_SHIFTS_SAME_DAY: "Already has a shift that day",
  APPROVED_TIME_OFF: "Approved time off",
  OUTSIDE_AVAILABILITY: "Outside their availability",
  WEEKLY_AVAILABILITY_CONFLICT: "Conflicts with an availability change",
  AGREED_RESTRICTION: "Conflicts with an agreed restriction",
  MAX_WEEKLY_HOURS: "Over their weekly hours limit",
  MAX_DAILY_HOURS: "Over the daily hours limit",
  MAX_SHIFT_HOURS: "Longer than the shift length limit",
  MIN_REST: "Not enough rest between shifts",
  BREAK_REQUIREMENT: "Missing a required break",
  EMPLOYEE_INACTIVE: "The person isn’t active",
  LOCATION_INACTIVE: "The location isn’t active",
  LOCATION_NOT_ELIGIBLE: "Not set up for this location",
  POSITION_INELIGIBLE: "Not qualified for the position",
  POSITION_INACTIVE: "The position isn’t active",
  ROLE_INELIGIBLE: "Their role can’t take this shift",
  LEAD_REQUIREMENT: "Needs a qualified lead",
  RULE_UNVERIFIABLE: "A scheduling rule couldn’t be checked",
};
const skipWords = (code: string | null, kind: CopyCommand["kind"]) => code === "SOURCE_CHANGED"
  ? kind === "TEMPLATE" ? "The template changed while copying" : "The previous week changed while copying"
  : code ? SKIP_WORDS[code] ?? "Didn’t pass the schedule checks" : "Didn’t pass the schedule checks";

type Row = CopyReceipt["rows"][number];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** Owner and Manager screens name people by first name and last initial ("Ana R."). */
export function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1].charAt(0)}.` : parts[0];
}
/** Receipts written before rows carried their person, day and time have the source reference only. */
const described = (row: Row): row is Row & { date: string; startTime: string; endTime: string } =>
  typeof row.date === "string" && typeof row.startTime === "string" && typeof row.endTime === "string";
const sortKey = (row: Row) => described(row) ? `${row.date} ${row.startTime}` : `~${row.sourceId}`;
const byWhen = (a: Row, b: Row) => sortKey(a).localeCompare(sortKey(b));

// Each part stays whole at 200% text ("9 AM – 5 PM" never splits inside), and a " · " never starts a line.
const whole = (text: string) => text.replace(/ /g, "\u00a0");
const DOT = "\u00a0· ";
const timeOf = (row: Row & { startTime: string; endTime: string }) => whole(compactRange(formatTimeRange(row.startTime, row.endTime)));
/** The summary names the week once, so a row names only its weekday: "Mon · 9 AM – 5 PM", and the location when the copy
 * spans more than one. */
function when(row: Row, withPlace: boolean) {
  if (!described(row)) return row.sourceId;
  return [formatDayLabel(row.date).weekday, timeOf(row), withPlace ? row.locationName : null].filter(Boolean).join(DOT);
}
const personOf = (row: Row) => described(row) ? row.employeeName ? shortName(row.employeeName) : "Open shift" : "Shift";

/** A copied shift with a warning: the person, then the day and time. It opens in Edit shift. */
function ShiftRow({ row, withPlace }: { row: Row; withPlace: boolean }) {
  const href = row.status === "COMMITTED" && row.shiftId ? `/app/schedule/edit?shiftId=${encodeURIComponent(row.shiftId)}` : undefined;
  return <li><CorpRow title={personOf(row)} detail={when(row, withPlace)} href={href} /></li>;
}

/** Shifts that weren't copied have no shift to open, so each person shows once per reason with their days:
 * "Mon, Tue · 6 AM – 2 PM; Thu · 2–10 PM". */
function PersonRows({ rows, withPlace }: { rows: Row[]; withPlace: boolean }) {
  const people = new Map<string, Row[]>();
  for (const row of rows) people.set(personOf(row), [...(people.get(personOf(row)) ?? []), row]);
  return <CorpRows>{[...people].map(([name, own]) => {
    const parts = new Map<string, string[]>();
    for (const row of own) {
      if (!described(row)) { parts.set(row.sourceId, []); continue; }
      const key = [timeOf(row), withPlace ? row.locationName : null].filter(Boolean).join(DOT);
      parts.set(key, [...(parts.get(key) ?? []), formatDayLabel(row.date).weekday]);
    }
    const detail = [...parts].map(([key, days]) => days.length ? `${days.join(", ")}${DOT}${key}` : key).join("; ");
    return <li key={name}><CorpRow title={name} detail={detail} /></li>;
  })}</CorpRows>;
}

/** Rows grouped under one heading per kind (a warning or a reason), each kind once, in the order first seen. */
function group<T>(rows: Row[], keys: (row: Row) => T[], label: (key: T, row: Row) => string) {
  const groups = new Map<string, { label: string; rows: Row[] }>();
  for (const row of rows) for (const key of new Set(keys(row))) {
    const id = String(key);
    const found = groups.get(id);
    if (found) found.rows.push(row);
    else groups.set(id, { label: label(key, row), rows: [row] });
  }
  return [...groups].map(([id, value]) => ({ id, ...value, rows: value.rows.sort(byWhen) }));
}

/** A kind's heading: under the card's heading (h3), or the card's own heading when the card has none (h2). */
function Kind({ level, id, children }: { level: 2 | 3; id: string; children: ReactNode }) {
  const Tag = level === 2 ? "h2" : "h3";
  return <Tag className="c-copy__kind" id={id}>{children}</Tag>;
}

function Frame({ title, back, children }: { title: string; back: string; children: ReactNode }) {
  return <CorpPage className="c-copy c-page--narrow" labelledBy="copy-title">
    <CorpNav back={{ href: back, label: "Schedule" }} title={title} titleId="copy-title" phoneOnly />
    <CorpTitle title={title} wide />
    {children}
  </CorpPage>;
}

function Action({ href, children }: { href: string; children: ReactNode }) {
  return <div className="c-copy__action"><CorpButtonLink href={href}>{children}</CorpButtonLink></div>;
}

export function CopyReceiptView({ receipt }: { receipt: CopyReceipt }) {
  const { command } = receipt;
  const back = `/app/schedule?week=${command.weekStart}`;
  const week = formatWeekRange(command.weekStart);
  const copied = receipt.rows.filter(row => row.status === "COMMITTED");
  const skipped = receipt.rows.filter(row => row.status === "SKIPPED");
  // A warning on a shift that wasn't copied doesn't apply to anything on the schedule; the reason it wasn't copied does.
  const warned = copied.filter(row => row.warnings.length > 0);
  const places = new Set(receipt.rows.map(row => row.locationName).filter(Boolean));
  const withPlace = places.size > 1;
  const place = places.size === 1 ? [...places][0] : null;
  const warnings = group(warned, row => row.warnings.map(warning => warning.code || warning.message),
    (code, row) => WARNING_WORDS[code] ?? row.warnings.find(warning => (warning.code || warning.message) === code)?.message ?? code);
  const reasons = group(skipped, row => [row.reason ?? receipt.reason ?? ""], code => skipWords(code || null, command.kind));
  const title = copied.length ? command.kind === "TEMPLATE" ? "Template applied" : "Week copied" : "Nothing copied";
  const clean = copied.length > 0 && !skipped.length && !warned.length;

  const where = [week, place].filter(Boolean).join(" · ");
  // Each fact once: the band says what happened, the summary how many and where, and each list carries its own count.
  const summary = <CorpCard id="copy-result" ariaLabel="Result">
    <CorpBody>
      <div className="c-copy__done">
        {clean ? <BDoneMark still /> : null}
        <p className="c-copy__line">
          <span className="c-copy__big">{copied.length ? plural(copied.length, "shift", "shifts")
            : receipt.rows.length ? week : receipt.reason ? skipWords(receipt.reason, command.kind) : command.kind === "TEMPLATE" ? "The template has no shifts" : "The previous week has no shifts"}</span>
          {copied.length ? <span className="c-copy__sub">{where}</span> : receipt.rows.length ? place ? <span className="c-copy__sub">{place}</span> : null : <span className="c-copy__sub">{week}</span>}
        </p>
      </div>
    </CorpBody>
  </CorpCard>;
  const count = (n: number) => <span className="c-copy__count">{n}</span>;

  return <Frame title={title} back={back}>
    {summary}
    <Action href={back}>Review schedule</Action>
    {warnings.length ? <CorpCard id="copy-warnings" label="With warnings" aside={count(warned.length)}>
      {warnings.map((kind, index) => <section className="c-copy__group" key={kind.id} aria-labelledby={`copy-warning-${index}`}>
        <h3 className="c-copy__kind" id={`copy-warning-${index}`}><WarningIcon className="c-copy__warn" weight="bold" aria-hidden="true" /><span>{kind.label}</span></h3>
        <CorpRows>{kind.rows.map(row => <ShiftRow key={row.sourceId} row={row} withPlace={withPlace} />)}</CorpRows>
      </section>)}
    </CorpCard> : null}
    {/* When nothing was copied the band already says so: the list keeps its reasons, without a second "Not copied". */}
    {reasons.length ? <CorpCard id="copy-skipped" label={copied.length ? "Not copied" : undefined} ariaLabel={copied.length ? undefined : "Not copied"} aside={copied.length ? count(skipped.length) : undefined}>
      {reasons.map((reason, index) => <section className="c-copy__group" key={reason.id} aria-labelledby={`copy-reason-${index}`}>
        <Kind level={copied.length ? 3 : 2} id={`copy-reason-${index}`}><span>{reason.label}</span></Kind>
        <PersonRows rows={reason.rows} withPlace={withPlace} />
      </section>)}
    </CorpCard> : null}
  </Frame>;
}

/** The copy may or may not have run (the receipt isn't there). Checking the week comes first; a retry reuses the same
 * operation, so it never copies a shift twice. */
export function CopyUnconfirmed({ command, actorId }: { command: CopyCommand | null; actorId: string }) {
  const back = command ? `/app/schedule?week=${command.weekStart}` : "/app/schedule";
  const into = command ? ` into ${formatWeekRange(command.weekStart)}` : "";
  return <Frame title="Copy not confirmed" back={back}>
    <CorpCard id="copy-result" ariaLabel="Result">
      <BState kind="paused" silent title={`Some shifts may already be copied${into}`}
        line={`Don’t start a new copy.${command ? " Retrying never adds a shift twice." : ""}`}>
        <div className="c-copy__buttons">
          <CorpButtonLink href={back}>Review schedule</CorpButtonLink>
          {command ? <ScheduleCopyForm actorId={actorId} command={command} label="Retry this copy" className="c-btn c-btn--secondary c-copy__retry" /> : null}
        </div>
      </BState>
    </CorpCard>
  </Frame>;
}

/** The link has no copy reference in it. */
export function CopyNotFound() {
  return <Frame title="Copy not found" back="/app/schedule">
    <CorpCard id="copy-result" ariaLabel="Result">
      <BState kind="empty" silent line="This link is incomplete." action={{ label: "Review schedule", href: "/app/schedule" }} />
    </CorpCard>
  </Frame>;
}
