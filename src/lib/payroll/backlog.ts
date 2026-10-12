import type {
  PayrollSettingsRevision,
  PayrollPeriod,
  PayrollMissingPeriod,
  PayrollBacklogSummary,
} from "./contracts";
import { duePeriod, day } from "./calendar";
const DAY = 86400000;
const key = (p: PayrollPeriod) => `${p.startDate}:${p.endDate}`;
const shape = (r: PayrollSettingsRevision) =>
  JSON.stringify(r.preferences.schedule);
/** Bound the entire history, never silently replace old gaps with today's schedule. */
export function missingPayrollPeriods(
  history: PayrollSettingsRevision[],
  existing: PayrollPeriod[],
  today: string,
  limit = 50,
): { missingPeriods: PayrollMissingPeriod[]; backlog: PayrollBacklogSummary } {
  const effective = [...history]
    .filter((r) => r.effectiveFrom < today)
    .sort(
      (a, b) =>
        a.effectiveFrom.localeCompare(b.effectiveFrom) ||
        b.revision - a.revision,
    )
    .filter(
      (r, i, all) => i === 0 || all[i - 1].effectiveFrom !== r.effectiveFrom,
    );
  const start = effective.length
    ? effective.reduce((min, r) => {
        const from =
          r.effectiveFrom > r.preferences.schedule.anchorDate
            ? r.effectiveFrom
            : r.preferences.schedule.anchorDate;
        return from < min ? from : min;
      }, today)
    : null;
  const overflow =
    history.length > 1000 ||
    existing.length > 10000 ||
    (!!start && (day(today).getTime() - day(start).getTime()) / DAY > 3660);
  const summary: PayrollBacklogSummary = {
    asOfDate: today,
    rangeStart: start,
    rangeEnd: today,
    missingCount: overflow ? null : 0,
    remainingCount: overflow ? null : 0,
    returnedCount: 0,
    ambiguousCount: overflow ? null : 0,
    overflow,
  };
  if (overflow || !start) return { missingPeriods: [], backlog: summary };
  const candidates = new Map<string, PayrollMissingPeriod>();
  for (const r of effective) {
    const next = effective.find((x) => x.effectiveFrom > r.effectiveFrom);
    const lower =
      r.effectiveFrom > r.preferences.schedule.anchorDate
        ? r.effectiveFrom
        : r.preferences.schedule.anchorDate;
    const upper = next
      ? Math.min(
          day(today).getTime(),
          day(next.effectiveFrom).getTime() + 31 * DAY,
        )
      : day(today).getTime();
    for (let t = day(lower).getTime() + DAY; t <= upper; t += DAY) {
      const due = duePeriod(
        r.preferences.schedule,
        new Date(t).toISOString().slice(0, 10),
      );
      if (
        !due ||
        due.period.startDate < r.effectiveFrom ||
        (next && due.period.startDate >= next.effectiveFrom) ||
        due.period.endDate >= today
      )
        continue;
      const issues =
        next &&
        next.effectiveFrom <= due.period.endDate &&
        shape(next) !== shape(r)
          ? [
              "Schedule changes inside this period; review the transition before preparation.",
            ]
          : [];
      candidates.set(key(due.period), {
        ...due,
        settingsRevision: r.revision,
        state: issues.length ? "AMBIGUOUS_TRANSITION" : "MISSING",
        issues,
      });
    }
  }
  const all = [...candidates.values()].sort((a, b) =>
    a.period.startDate.localeCompare(b.period.startDate),
  );
  for (let i = 0; i < all.length; i++)
    for (
      let j = i + 1;
      j < all.length && all[j].period.startDate <= all[i].period.endDate;
      j++
    )
      for (const r of [all[i], all[j]]) {
        r.state = "AMBIGUOUS_TRANSITION";
        if (!r.issues.includes("Historical schedule periods overlap."))
          r.issues.push("Historical schedule periods overlap.");
      }
  const present = new Set(existing.map(key));
  const missing = all.filter((r) => !present.has(key(r.period)));
  const visible = missing.slice(0, Math.max(1, Math.min(600, limit)));
  return {
    missingPeriods: visible,
    backlog: {
      ...summary,
      missingCount: missing.length,
      remainingCount: missing.length - visible.length,
      returnedCount: visible.length,
      ambiguousCount: missing.filter((x) => x.state === "AMBIGUOUS_TRANSITION")
        .length,
    },
  };
}
