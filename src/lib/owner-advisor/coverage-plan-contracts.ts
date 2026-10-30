export type CoverageMeasure = {
  requiredMinutes: number;
  coveredMinutes: number;
  requiredObligationMinutes: number;
  fulfilledObligationMinutes: number;
  remainingBlocks: number;
};
export type DayPlan = {
  search: "STANDARD" | "DIFFERENT_FIRST_ASSIGNMENT";
  status: "COMPLETE" | "PARTIAL" | "INVALID" | "BUDGET_EXHAUSTED";
  assignments: {
    employeeId: string; employeeName: string; locationId: string; locationName: string; date: string;
    startTime: string; endTime: string; positionName: string | null; positionId?: string | null;
    isDesignatedLead: boolean; publication: "DRAFT" | "PUBLISHED";
  }[];
  addedMinutes: number;
  publishedTargets: number;
  coverage: CoverageMeasure;
  remaining: { total: number; items: {
    locationName: string; startTime: string; endTime: string;
    missingStaff: number | null; requiresLead: boolean | null;
    positions: { name: string; missing: number }[]; positionsOmitted: number;
  }[] };
  issues: { total: number; items: { code: string; message: string }[] };
};
/** Snapshot evidence only. No execution token or authority is carried here. */
export type CoveragePlans = {
  state: "ready" | "unavailable";
  reason: "INPUT_LIMIT" | null;
  date: string; timeZone: string; observedAt: string; sourceVersion: string | null;
  basis: "CURRENT_SCHEDULING_LEDGER_INCLUDES_DRAFT_COMMITMENTS";
  partial: boolean;
  locations: { id: string; name: string; state: "INCLUDED" | "ARCHIVED" | "NEEDS_SETUP" | "INACTIVE"; issues: string[] }[];
  preservedAssignments: number;
  baseline: CoverageMeasure | null;
  alternatives: DayPlan[];
  computation: { elapsedMs: number; yields: number; maxSliceMs: number };
};
