import { addDays } from "@/lib/date-utils";
import { dateRange } from "@/lib/duration-format";

/** "Nov 2–8" or "Oct 26–Nov 1": a schedule week short enough for a card header at 320px. */
export function availabilityWeekLabel(weekStart: string) {
  return dateRange(weekStart, addDays(weekStart, 6), { year: "never" });
}
