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

// A time keeps its "AM" or "PM", a range wraps only after its dash ("8:00 AM –" / "4:00 PM"), and a " · " never starts a
// line. "All day" stays whole.
const rangeBreaks = (text: string) => text.replace(/(\d) ([AP]M)/g, "$1\u00a0$2").replace(/ \u2013 /g, "\u00a0\u2013 ").replace(/^All day$/, "All\u00a0day");
const DOT = "\u00a0· ";
const timeOf = (row: Row & { startTime: string; endTime: string }) => rangeBreaks(compactRange(formatTimeRange(row.startTime, row.endTime)));
const personOf = (row: Row) => described(row) ? row.employeeName ? shortName(row.employeeName) : "Open shift" : "Shift";

/** One row per person in a group, with their days: "Mon, Tue · 6 AM – 2 PM; Thu · 2–10 PM". The summary names the week
 * once, so a row names only weekdays; the location shows when the copy spans more than one (once at the end of the line
 * when this person worked in one place). Both lists use it, so they read alike. `href` gets the person's shifts. */
function PersonRows({ rows, withPlace, href }: { rows: Row[]; withPlace: boolean; href?: (own: Row[]) => string | undefined }) {
  // Grouped by the full name, so two people who share "Ana R." stay two rows; the row shows the short name.
  const fullName = (row: Row) => described(row) ? row.employeeName ?? "" : `~${row.sourceId}`;
  const people = new Map<string, Row[]>();
  for (const row of rows) people.set(fullName(row), [...(people.get(fullName(row)) ?? []), row]);
  return <CorpRows>{[...people].map(([key, own]) => {
    const name = personOf(own[0]);
    const theirPlaces = new Set(own.map(row => row.locationName).filter(Boolean));
    const placeEach = withPlace && theirPlaces.size > 1;
    const placeOnce = withPlace && theirPlaces.size === 1 ? [...theirPlaces][0] : null;
    // Each weekday once: a day's times are listed together ("Mon · 6 AM – 2 PM, 8 AM – 4 PM"), then days with the same
    // times share one part ("Mon, Tue · 8 AM – 4 PM").
    const days = new Map<string, string[]>();
    const loose: string[] = [];
    for (const row of [...own].sort(byWhen)) {
      if (!described(row)) { loose.push(row.sourceId); continue; }
      const day = formatDayLabel(row.date).weekday;
      days.set(day, [...(days.get(day) ?? []), [timeOf(row), placeEach ? row.locationName : null].filter(Boolean).join(DOT)]);
    }
    const parts = new Map<string, string[]>();
    for (const [day, times] of days) { const slot = times.join(", "); parts.set(slot, [...(parts.get(slot) ?? []), day]); }
    for (const id of loose) parts.set(id, []);
    const detail = [...parts].map(([slot, days]) => days.length ? `${days.join(", ")}${DOT}${slot}` : slot).join("; ") + (placeOnce ? `${DOT}${placeOnce}` : "");
    return <li key={key}><CorpRow title={name} detail={detail} href={href?.(own)} /></li>;
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
  const allWarned = copied.length > 0 && warned.length === copied.length;
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
  // One copied shift opens in Edit shift; several open the copied week (the Schedule has no person filter to pass).
  const openShifts = (own: Row[]) => own.length === 1 && own[0].shiftId ? `/app/schedule/edit?shiftId=${encodeURIComponent(own[0].shiftId)}` : back;

  return <Frame title={title} back={back}>
    {summary}
    <Action href={back}>Review schedule</Action>
    {/* Each count once: when every copied shift has a warning, the summary's count already covers them, so the card says
      * "All with warnings" without a second, equal number. */}
    {warnings.length ? <CorpCard id="copy-warnings" label={allWarned ? "All with warnings" : "With warnings"} aside={allWarned ? undefined : count(warned.length)}>
      {warnings.map((kind, index) => <section className="c-copy__group" key={kind.id} aria-labelledby={`copy-warning-${index}`}>
        <h3 className="c-copy__kind" id={`copy-warning-${index}`}><WarningIcon className="c-copy__warn" weight="bold" aria-hidden="true" /><span>{kind.label}</span></h3>
        <PersonRows rows={kind.rows} withPlace={withPlace} href={openShifts} />
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
