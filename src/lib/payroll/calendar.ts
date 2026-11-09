/**
 * Date-only schedule arithmetic uses UTC midnight as a stable calendar container,
 * not as the workspace clock. Callers supply today in the workspace time zone;
 * period endpoints are inclusive and payday offsets are calendar days.
 */
import type { PayrollPreferences } from "./contracts";
export const day = (s: string) => new Date(`${s}T00:00:00Z`),
  iso = (d: Date) => d.toISOString().slice(0, 10),
  add = (s: string, n: number) => {
    const d = day(s);
    d.setUTCDate(d.getUTCDate() + n);
    return iso(d);
  };
/** Most recent completed period only. Historical catch-up is an explicit review action. */
export function duePeriod(
  schedule: PayrollPreferences["schedule"],
  today: string,
) {
  const anchor = schedule.anchorDate;
  let start: string, end: string;
  if (schedule.frequency === "WEEKLY" || schedule.frequency === "BIWEEKLY") {
    const length = schedule.frequency === "WEEKLY" ? 7 : 14;
    const elapsed = Math.floor(
      (day(today).getTime() - day(anchor).getTime()) / 86400000,
    );
    if (elapsed < length) return null;
    start = add(anchor, (Math.floor(elapsed / length) - 1) * length);
    end = add(start, length - 1);
  } else {
    const now = day(today);
    if (schedule.frequency === "MONTHLY") {
      start = iso(
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
      );
      end = iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)));
    } else if (now.getUTCDate() >= 16) {
      start = iso(
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      );
      end = iso(
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15)),
      );
    } else {
      start = iso(
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 16)),
      );
      end = iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)));
    }
    if (start < anchor) return null;
  }
  return {
    period: { startDate: start, endDate: end },
    payday: add(end, schedule.paydayOffsetDays),
  };
}

/** The pay period that contains `today`, and its payday (end plus the payday offset).
 * Null before the schedule's anchor. Used to tell employees when the hours they're working now are paid. */
export function openPeriod(
  schedule: PayrollPreferences["schedule"],
  today: string,
) {
  let start: string, end: string;
  if (schedule.frequency === "WEEKLY" || schedule.frequency === "BIWEEKLY") {
    const length = schedule.frequency === "WEEKLY" ? 7 : 14;
    const elapsed = Math.floor(
      (day(today).getTime() - day(schedule.anchorDate).getTime()) / 86400000,
    );
    if (elapsed < 0) return null;
    start = add(schedule.anchorDate, Math.floor(elapsed / length) * length);
    end = add(start, length - 1);
  } else {
    const now = day(today);
    const year = now.getUTCFullYear(), month = now.getUTCMonth();
    const last = iso(new Date(Date.UTC(year, month + 1, 0)));
    if (schedule.frequency === "MONTHLY") {
      start = iso(new Date(Date.UTC(year, month, 1)));
      end = last;
    } else if (now.getUTCDate() <= 15) {
      start = iso(new Date(Date.UTC(year, month, 1)));
      end = iso(new Date(Date.UTC(year, month, 15)));
    } else {
      start = iso(new Date(Date.UTC(year, month, 16)));
      end = last;
    }
    if (start < schedule.anchorDate) return null;
  }
  return { period: { startDate: start, endDate: end }, payday: add(end, schedule.paydayOffsetDays) };
}
