import { businessDateStart, minutesInWorkweek, shiftPeriod } from "../periods";
import type { GenerationEmployee, GenerationAssignment } from "./types";

export type FairnessContext = {
  weekStart: string;
  ledger: GenerationAssignment[];
  confirmedEmployeeIds: ReadonlySet<string>;
  employeeIds: string[];
};

/** Nominal scheduled minutes, including cross-location carry-in; never actual payroll time. */
export function scheduledWeekMinutes(
  employeeId: string,
  context: Pick<FairnessContext, "ledger" | "weekStart">,
): number {
  const seen = new Set<string>();
  return context.ledger.reduce((minutes, row) => {
    if (
      row.employeeId !== employeeId ||
      row.isCalloutApproved ||
      seen.has(row.id)
    )
      return minutes;
    seen.add(row.id);
    return minutes + minutesInWorkweek(shiftPeriod(row), context.weekStart);
  }, 0);
}

/** Coverage and scarcity are ranked by the caller before these otherwise-equivalent choices. */
export function compareEmployeeFairness(
  a: GenerationEmployee,
  b: GenerationEmployee,
  context: FairnessContext,
): number {
  const confirmed =
    Number(context.confirmedEmployeeIds.has(b.id)) -
    Number(context.confirmedEmployeeIds.has(a.id));
  if (confirmed) return confirmed;
  const am = scheduledWeekMinutes(a.id, context),
    bm = scheduledWeekMinutes(b.id, context);
  const at = (a.targetWeeklyHours ?? 0) * 60,
    bt = (b.targetWeeklyHours ?? 0) * 60;
  const below = Number(bt > 0 && bm < bt) - Number(at > 0 && am < at);
  if (below) return below;
  // Completion ratio ranks only employees who are both below positive targets.
  // At/above-target and absent/zero-target employees instead compare actual hours.
  if (at > 0 && am < at && bt > 0 && bm < bt && am / at !== bm / bt)
    return am / at < bm / bt ? -1 : 1;
  const remaining = Math.max(0, bt - bm) - Math.max(0, at - am);
  if (remaining) return remaining;
  if (am !== bm) return am - bm;
  const ids = [...new Set(context.employeeIds)].sort();
  const week = Math.floor(businessDateStart(context.weekStart) / (7 * 1440));
  const offset = ((week % ids.length) + ids.length) % ids.length;
  const rank = (id: string) =>
    (ids.indexOf(id) - offset + ids.length) % ids.length;
  return rank(a.id) - rank(b.id) || a.id.localeCompare(b.id);
}
