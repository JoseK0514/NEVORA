import { evaluateLocationReadiness } from '../location-readiness';
import type { GenerationInput, GenerationExplanation } from './types';

/** Scope affects attempted demand only; callers retain the complete source and ledger. */
export function selectGenerationScope(input: GenerationInput) {
  const selected =
    input.scope.kind === "SELECTED" ? new Set(input.scope.locationIds) : null;
  const scoped = input.locations
    .filter((l) => !selected || selected.has(l.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const readiness = scoped.map((location) =>
    evaluateLocationReadiness({
      workspace: input.workspace,
      location,
      staffing:
        input.staffing.find((s) => s.locationId === location.id) ?? null,
      coverageWindows: input.coverageWindows,
      positions: input.positions,
      eligibleEmployees: input.employees,
    }),
  );
  const excludedLocations = readiness.filter((r) => r.state !== "READY");
  const locationIds = readiness
    .filter((r) => r.state === "READY")
    .map((r) => r.locationId);
  const issues: GenerationExplanation[] = [];
  if (selected)
    for (const id of [...selected].sort())
      if (!readiness.some((r) => r.locationId === id && r.state === "READY"))
        issues.push({
          code: "LOCATION_NOT_READY",
          locationId: id,
          message: "Selected location is unavailable or needs setup.",
        });
  for (const schedule of input.schedules)
    if (
      schedule.weekStart === input.weekStart &&
      locationIds.includes(schedule.locationId) &&
      schedule.status !== "DRAFT"
    )
      issues.push({
        code: "TARGET_NOT_DRAFT",
        locationId: schedule.locationId,
        message: "Automatic scheduling requires a Draft target.",
      });
  return { scoped, readiness, locationIds, excludedLocations, issues };
}
