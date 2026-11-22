import { businessDate, businessTime } from "@/lib/business-time";

/** The first minute of `date` (minutes after midnight, in the company's time zone) that a day plan may still offer.
 *
 * Decision (QA S-09): clip, don't drop. A coverage period already under way still needs someone for the rest of it,
 * so for today a plan starts at the next quarter hour after `now` and leaves out everything before. Dropping the whole
 * period instead would hide time that still needs cover. The quarter hour keeps starts on times people schedule
 * ("6:45 PM", not "6:42 PM"); 1440 means nothing is left today. Any other date returns 0: later dates start at
 * midnight, and earlier dates keep their existing behaviour. The server passes its own observation time, and the page
 * reads the same value from the plan, so both always agree. */
export function firstOpenMinute(date: string, now: string | Date, timeZone: string): number {
  const at = typeof now === "string" ? new Date(now) : now;
  if (!Number.isFinite(at.getTime()) || businessDate(at, timeZone) !== date) return 0;
  const [hour, minute] = businessTime(at, timeZone).split(":").map(Number);
  // Zone offsets are whole minutes, so UTC seconds are local seconds. A started minute has passed.
  const passed = hour * 60 + minute + (at.getUTCSeconds() || at.getUTCMilliseconds() ? 1 : 0);
  return Math.min(1440, Math.ceil(passed / 15) * 15);
}

/** "18:45" for 1125 minutes; 1440 reads "24:00", the stored end of a day. */
export function minuteClock(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Jose (Nov 22, 2026, QA S-09 follow-up): a day plan never proposes, and its save never accepts, a shift longer than
 * the business's own per-shift maximum or, when none is configured, 10 hours. Whole-day coverage is then offered as
 * shorter shifts for several people instead of one 24-hour shift. The smallest configured maximum wins, since validation
 * already blocks anything longer for that person. */
export const DEFAULT_PLAN_SHIFT_MINUTES = 600;
export function planShiftCap(employees: readonly { operationalProfile?: { maximumShift?: { status: string; value?: { minutes: number } } } }[]): number {
  const configured = employees.flatMap(e => {
    const rule = e.operationalProfile?.maximumShift;
    return rule?.status === "CONFIGURED" && rule.value && Number.isInteger(rule.value.minutes) && rule.value.minutes >= 60 ? [Math.min(1440, rule.value.minutes)] : [];
  });
  return configured.length ? Math.min(...configured) : DEFAULT_PLAN_SHIFT_MINUTES;
}
