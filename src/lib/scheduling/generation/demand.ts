import { addDays, weekStartFor } from "../../date-utils";
import { selectGenerationScope } from "./scope";
import { calculateScheduleHealth } from "../schedule-health";
import { businessDateStart, shiftPeriod } from "../periods";
import { deriveConfiguredNeeds } from "./needs";
import type {
  GenerationInput,
  GenerationDemand,
} from "./types";

/**
 * Measure configured demand against a supplied ledger, keeping configuration
 * identity independent of incidental assignment splits. Scope limits attempted
 * locations; readiness and zero configured coverage remain explicit rather than
 * manufacturing demand from existing shifts.
 */
export function deriveGenerationDemand(
  input: GenerationInput,
  ledger = input.ledger,
): GenerationDemand {
  businessDateStart(input.weekStart);
  if (weekStartFor(input.weekStart) !== input.weekStart)
    throw new Error("Generation requires a Monday week.");
  if (
    typeof input.workspace.timeZone !== "string" ||
    !input.workspace.timeZone.trim()
  )
    throw new Error("Generation requires an explicit workspace timezone.");
  new Intl.DateTimeFormat("en", { timeZone: input.workspace.timeZone });
  const { scoped, readiness, locationIds, excludedLocations, issues } = selectGenerationScope(input);
  const locations = scoped
    .filter((l) => locationIds.includes(l.id))
    .map((l) => ({
      ...l,
      ...input.staffing.find((s) => s.locationId === l.id)!,
      name: l.name,
    }));
  const common = {
    workspace: input.workspace,
    positions: input.positions,
    locations,
    employees: input.employees.map((e) => ({
      ...e,
      name: `${e.firstName} ${e.lastName}`,
    })),
    coverageWindows: input.coverageWindows.filter((w) =>
      locationIds.includes(w.locationId),
    ),
    weekDates: Array.from({ length: 7 }, (_, day) =>
      addDays(input.weekStart, day),
    ),
  };
  const configured = calculateScheduleHealth({
    ...common,
    shifts: [],
  }).coverageBlocks;
  const blocks = calculateScheduleHealth({
    ...common,
    shifts: ledger,
  }).coverageBlocks.filter((block) =>
    configured.some(
      (c) =>
        c.locationId === block.locationId &&
        c.date === block.date &&
        c.startTime <= block.startTime &&
        c.endTime >= block.endTime,
    ),
  );
  for (const block of blocks) {
    block.positionCoverage.sort((a, b) =>
      a.positionId.localeCompare(b.positionId),
    );
    block.leadNames.sort();
  }
  blocks.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.startTime.localeCompare(b.startTime) ||
      a.locationId.localeCompare(b.locationId),
  );
  issues.sort(
    (a, b) =>
      (a.locationId ?? "").localeCompare(b.locationId ?? "") ||
      a.code.localeCompare(b.code),
  );
  let requiredMinutes = 0,
    coveredMinutes = 0,
    fulfilledObligationMinutes = 0,
    requiredObligationMinutes = 0;
  for (const block of blocks) {
    const p = shiftPeriod({
        date: block.date,
        startTime: block.startTime,
        endTime: block.endTime,
      }),
      duration = p.end - p.start;
    requiredMinutes += duration;
    if (block.covered) coveredMinutes += duration;
    requiredObligationMinutes +=
      duration *
      ((block.requiredStaff ?? 0) +
        block.positionCoverage.reduce((s, p) => s + p.required, 0) +
        (block.requiresLead ? 1 : 0));
    fulfilledObligationMinutes +=
      duration *
      (Math.min(block.assignedStaff, block.requiredStaff ?? 0) +
        block.positionCoverage.reduce(
          (s, p) => s + Math.min(p.assigned, p.required),
          0,
        ) +
        (block.requiresLead && block.leadCovered ? 1 : 0));
  }
  // Sum of squared contiguous durations breaks equal-coverage ties toward fewer fragments.
  const runs = new Map<string, { start: number; end: number }[]>();
  for (const row of ledger.filter(
    (s) => !s.isCalloutApproved && locationIds.includes(s.locationId),
  )) {
    const key = JSON.stringify([
      row.employeeId,
      row.locationId,
      row.positionId,
      row.isDesignatedLead,
    ]);
    const list = runs.get(key) ?? [];
    list.push(shiftPeriod(row));
    runs.set(key, list);
  }
  let contiguousDurationScore = 0;
  for (const list of runs.values()) {
    let last: { start: number; end: number } | undefined;
    for (const p of list.sort((a, b) => a.start - b.start)) {
      if (last && p.start <= last.end) last.end = Math.max(last.end, p.end);
      else {
        if (last) contiguousDurationScore += (last.end - last.start) ** 2;
        last = { ...p };
      }
    }
    if (last) contiguousDurationScore += (last.end - last.start) ** 2;
  }
  return {
    ready: issues.length === 0 && locationIds.length > 0,
    locationIds,
    excludedLocations,
    readiness,
    issues,
    blocks,
    needs: deriveConfiguredNeeds(input, configured),
    coverage: {
      requiredMinutes,
      coveredMinutes,
      percentage: requiredMinutes
        ? (100 * coveredMinutes) / requiredMinutes
        : null,
      unavailable: requiredMinutes === 0,
    },
    score: {
      fulfilledObligationMinutes,
      requiredObligationMinutes,
      contiguousDurationScore,
    },
  };
}
