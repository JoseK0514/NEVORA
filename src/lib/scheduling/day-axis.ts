/* The Schedule day view's timeline (Jose's pick "A: a timeline", Nov 21, 2026). Presentation only: where a shift's capsule
 * sits on the day's axis. All figures are minutes from the day's midnight. */

import { formatTime } from "../date-utils";

export type DayAxis = {
  /** First and last minute of the axis, both on whole hours. */
  start: number; end: number;
  /** Hours between labels (and gridlines). */
  stepHours: number;
  /** A label every `stepHours` from the start: where it sits (0–100) and what it says ("6:00 AM", "2:00 PM", "12:00 AM"). */
  ticks: { at: number; label: string }[];
};
export type AxisPlace = { left: number; width: number; /** The shift runs past midnight: its capsule is cut flat at the axis end. */ cut: boolean;
  /** G8 (Nov 23, 2026): a capsule is never narrower than its time, so a short shift's capsule can need more room than its
   * hours. One whose middle is in the later half of the axis is held at its end (`right`, from the axis end) and grows
   * toward earlier hours, so it never runs past the axis end and out of the card; the others grow toward later hours. */
  end: boolean; right: number };

const MIN_HOURS = 8;
const DAY = 24 * 60;
const minutes = (time: string) => { const [hour, minute] = time.slice(0, 5).split(":").map(Number); return Math.min(DAY, (hour || 0) * 60 + (minute || 0)); };
const round = (value: number) => Math.round(value * 1e4) / 1e4;

/** A shift's minutes within its own day. One that ends at midnight ends at 24:00; one that ends the next morning is held
 * at 24:00 and marked `cut`. */
export function shiftSpan(startTime: string, endTime: string): { start: number; end: number; cut: boolean } {
  const start = Math.min(minutes(startTime), DAY - 1), rawEnd = minutes(endTime);
  if (rawEnd === 0 || rawEnd === DAY) return { start, end: DAY, cut: false };
  return rawEnd <= start ? { start, end: DAY, cut: true } : { start, end: rawEnd, cut: false };
}

/** "6:00 AM", "2:00 PM", "12:00 PM"; midnight at either end reads "12:00 AM" (the one time format, Nov 23, 2026; it was
 * "6a"). */
export function axisHour(hour: number) { return formatTime(`${String(hour % 24).padStart(2, "0")}:00`); }

/** The day's axis: from the earliest start to the latest end among the day's shifts, rounded out to whole hours and at
 * least eight hours wide (a short day grows evenly on both sides, inside the day). No shifts: 8a to 4p. */
export function dayAxis(shifts: readonly { startTime: string; endTime: string }[]): DayAxis {
  const spans = shifts.map(shift => shiftSpan(shift.startTime, shift.endTime));
  let lo = spans.length ? Math.floor(Math.min(...spans.map(span => span.start)) / 60) : 8;
  let hi = spans.length ? Math.ceil(Math.max(...spans.map(span => span.end)) / 60) : 16;
  for (let late = true; hi - lo < MIN_HOURS; late = !late) {
    if ((late && hi < 24) || lo === 0) hi += 1; else lo -= 1;
  }
  const hours = hi - lo, stepHours = hours <= 10 ? 2 : hours <= 16 ? 4 : 6;
  const ticks = [];
  for (let hour = lo; hour <= hi; hour += stepHours) ticks.push({ at: round(((hour - lo) / hours) * 100), label: axisHour(hour) });
  return { start: lo * 60, end: hi * 60, stepHours, ticks };
}

/** A shift's left edge and width on the axis, as percentages of the axis. */
export function axisPlace(axis: DayAxis, startTime: string, endTime: string): AxisPlace {
  const span = shiftSpan(startTime, endTime), total = axis.end - axis.start;
  const from = Math.max(axis.start, Math.min(span.start, axis.end)), to = Math.max(from, Math.min(span.end, axis.end));
  const left = round(((from - axis.start) / total) * 100), width = round(((to - from) / total) * 100);
  return { left, width, cut: span.cut || span.end > axis.end, end: left + width / 2 > 50, right: round(100 - left - width) };
}
