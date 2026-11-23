import { evaluateLocationReadiness } from '../location-readiness';
import type { GenerationInput, GenerationExplanation } from './types';
import { addDays, weekStartFor } from '../../date-utils';
import { businessDateStart } from '../periods';

/** Read-only hypothetical additions, never a generation/write request. `notBefore` is the first minute of
 * `date` (after midnight, business-local) that a review may still use; time before it has passed.
 * `maxShiftMinutes` caps a proposed shift's length (Rondo's day plans, QA S-09 follow-up): whole-day coverage is offered
 * as shorter shifts for several people instead of one 24-hour shift. Normal generation sets neither. */
export type GenerationReviewScope = { date: string; notBefore?: number; maxShiftMinutes?: number };
export function generationDates(input: GenerationInput, review?: GenerationReviewScope) {
  if (!review) return Array.from({ length: 7 }, (_, day) => addDays(input.weekStart, day));
  businessDateStart(review.date);
  if (review.notBefore !== undefined && (!Number.isInteger(review.notBefore) || review.notBefore < 0 || review.notBefore > 1440))
    throw new Error('Read-only review start must be a minute of the selected date.');
  if (review.maxShiftMinutes !== undefined && (!Number.isInteger(review.maxShiftMinutes) || review.maxShiftMinutes < 60 || review.maxShiftMinutes > 1440))
    throw new Error('Read-only review shift cap must be between 1 and 24 hours.');
  if (weekStartFor(review.date) !== input.weekStart || input.mode !== 'FILL_GAPS_ONLY')
    throw new Error('Read-only review requires one date in the unchanged commitment week.');
  return [review.date];
}

/** Scope affects attempted demand only; callers retain the complete source and ledger. */
export function selectGenerationScope(input: GenerationInput, review?: GenerationReviewScope) {
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
      schedule.status !== "DRAFT" && !(review && schedule.status === "PUBLISHED")
    )
      issues.push({
        code: "TARGET_NOT_DRAFT",
        locationId: schedule.locationId,
        message: "Automatic scheduling requires a Draft target.",
      });
  return { scoped, readiness, locationIds, excludedLocations, issues };
}
