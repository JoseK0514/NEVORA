import type { CoverageMeasure } from "./coverage-plan-contracts";

export type CoverageDraftTerms = {
  employeeId: string; locationId: string; startTime: string; endTime: string;
  positionId: string | null; isDesignatedLead: boolean;
};
export type CoverageActionCommand =
  | { op: "prepare_coverage_draft"; requestId: string; date: string; sourceVersion: string; assignments: CoverageDraftTerms[] }
  | { op: "apply_coverage_draft"; requestId: string; reviewId: string; acknowledged: true }
  | { op: "check_coverage_draft"; requestId: string; reviewId: string };
export type CoverageDraftReview = {
  id: string; date: string; timeZone: string; sourceVersion: string; preparedAt: string; expiresAt: string;
  assignments: (CoverageDraftTerms & { employeeName: string; locationName: string; positionName: string | null })[];
  coverage: CoverageMeasure; partial: boolean;
};
export type CoverageDraftReceipt = { operationId: string; reviewId: string; savedAt: string; count: number };
export type CoverageDraftProgress = {
  state: "current" | "changed" | "unavailable"; observedAt: string;
  assignmentsPresent: number; assignmentsTotal: number; publishedAssignments: number;
  coverage: CoverageMeasure | null; scopeComplete: boolean;
};
export type CoverageActionResult = {
  state: "coverage_review" | "coverage_saved" | "coverage_checked";
  review: CoverageDraftReview; receipt: CoverageDraftReceipt | null; progress: CoverageDraftProgress | null;
};
export const coverageUuid = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
export const coverageId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 128 && v.trim() === v && !/[\u0000-\u001f\u007f]/.test(v);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const keys = (v: Record<string, unknown>, names: string) => Object.keys(v).sort().join(",") === names.split(" ").sort().join(",");
const day = (v: unknown): v is string => typeof v === "string" && /^20\d\d-\d\d-\d\d$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const time = (v: unknown): v is string => typeof v === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);

/** Explicit Owner commands only. This parser is never registered as a model tool. */
export function parseCoverageAction(value: unknown): CoverageActionCommand {
  if (!object(value) || !coverageUuid(value.requestId)) throw Error("Invalid coverage action");
  const requestId = value.requestId.toLowerCase();
  if (value.op === "prepare_coverage_draft" && keys(value, "op requestId date sourceVersion assignments") && day(value.date) &&
      typeof value.sourceVersion === "string" && /^[a-f0-9]{64}$/.test(value.sourceVersion) &&
      Array.isArray(value.assignments) && value.assignments.length > 0 && value.assignments.length <= 12) {
    const assignments = value.assignments.map(a => {
      if (!object(a) || !keys(a, "employeeId locationId startTime endTime positionId isDesignatedLead") ||
          !coverageId(a.employeeId) || !coverageId(a.locationId) || !time(a.startTime) || !(time(a.endTime) || a.endTime === "24:00") ||
          a.startTime === a.endTime || !(a.positionId === null || coverageId(a.positionId)) || typeof a.isDesignatedLead !== "boolean") throw Error("Invalid assignment");
      return { employeeId: a.employeeId, locationId: a.locationId, startTime: a.startTime, endTime: a.endTime,
        positionId: a.positionId as string | null, isDesignatedLead: a.isDesignatedLead };
    });
    if (new Set(assignments.map(a => JSON.stringify(a))).size !== assignments.length) throw Error("Duplicate assignment");
    return { op: value.op, requestId, date: value.date, sourceVersion: value.sourceVersion, assignments };
  }
  if (coverageUuid(value.reviewId)) {
    const reviewId = value.reviewId.toLowerCase();
    if (value.op === "apply_coverage_draft" && keys(value, "op requestId reviewId acknowledged") && value.acknowledged === true)
      return { op: value.op, requestId, reviewId, acknowledged: true };
    if (value.op === "check_coverage_draft" && keys(value, "op requestId reviewId")) return { op: value.op, requestId, reviewId };
  }
  throw Error("Invalid coverage action");
}
