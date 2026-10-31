import { addDays } from "@/lib/date-utils";

/** "Nov 2 – 8" or "Oct 26 – Nov 1": a schedule week short enough for a card header at 320px. */
export function availabilityWeekLabel(weekStart: string) {
  const end = addDays(weekStart, 6);
  const month = (date: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short" }).format(new Date(`${date}T12:00:00Z`));
  const day = (date: string) => Number(date.slice(8));
  return month(weekStart) === month(end) ? `${month(weekStart)} ${day(weekStart)} – ${day(end)}` : `${month(weekStart)} ${day(weekStart)} – ${month(end)} ${day(end)}`;
}
