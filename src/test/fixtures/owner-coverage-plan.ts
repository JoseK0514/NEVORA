import type { CoveragePlans } from "@/lib/owner-advisor/coverage-plan-contracts";
/** Hand-derived fictional one-person, four-hour review; never a live model result. */
export function ownerCoveragePlan(): CoveragePlans {
  return {
    state: "ready", reason: null, date: "2026-10-22", timeZone: "America/Puerto_Rico",
    observedAt: "2026-10-30T12:00:00.000Z", sourceVersion: "a".repeat(64),
    basis: "CURRENT_SCHEDULING_LEDGER_INCLUDES_DRAFT_COMMITMENTS", partial: false,
    locations: [{ id: "north", name: "North", state: "INCLUDED", issues: [] }], preservedAssignments: 2,
    baseline: { requiredMinutes: 240, coveredMinutes: 0, requiredObligationMinutes: 240, fulfilledObligationMinutes: 0, remainingBlocks: 1 },
    alternatives: [{ search: "STANDARD", status: "COMPLETE", assignments: [{ employeeId: "ana", employeeName: "Fictional Ana", locationId: "north", locationName: "North", date: "2026-10-22", startTime: "08:00", endTime: "12:00", positionName: null, isDesignatedLead: false, publication: "DRAFT" }],
      addedMinutes: 240, publishedTargets: 0,
      coverage: { requiredMinutes: 240, coveredMinutes: 240, requiredObligationMinutes: 240, fulfilledObligationMinutes: 240, remainingBlocks: 0 },
      remaining: { total: 0, items: [] }, issues: { total: 0, items: [] } }],
    computation: { elapsedMs: 25, yields: 2, maxSliceMs: 5 },
  };
}
