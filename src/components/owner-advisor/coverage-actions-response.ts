import { record } from "@/lib/owner-advisor/contracts";
import { coverageUuid, parseCoverageAction, type CoverageActionResult } from "@/lib/owner-advisor/coverage-actions";
export type CoverageActionResponse = CoverageActionResult & { authority: string; observedAt: string; validForMs: number };
function valid(v: unknown): asserts v { if (!v) throw Error("Invalid coverage action response"); }
function object(v: unknown, keys: string): asserts v is Record<string, unknown> {
  valid(record(v) && Object.keys(v).sort().join(",") === keys.split(" ").sort().join(","));
}
const text = (v: unknown, max = 120): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const instant = (v: unknown): v is string => typeof v === "string" && v.length <= 50 && Number.isFinite(Date.parse(v));
const count = (v: unknown, max = 1e9): v is number => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= max;
function measure(v: unknown) {
  object(v, "requiredMinutes coveredMinutes requiredObligationMinutes fulfilledObligationMinutes remainingBlocks");
  valid(Object.values(v).every(n => count(n)) && Number(v.coveredMinutes) <= Number(v.requiredMinutes) && Number(v.fulfilledObligationMinutes) <= Number(v.requiredObligationMinutes));
}
function zone(v: unknown) { valid(text(v, 100)); new Intl.DateTimeFormat("en", { timeZone: v }); }
export function parseCoverageActionResult(value: unknown): CoverageActionResponse {
  object(value, "state review receipt progress authority observedAt validForMs");
  valid(JSON.stringify(value).length <= 45000 && text(value.authority, 512) && instant(value.observedAt) && count(value.validForMs, 15000) && value.validForMs > 0 && ["coverage_review", "coverage_saved", "coverage_checked"].includes(String(value.state)));
  const r = value.review;
  object(r, "id date timeZone sourceVersion preparedAt expiresAt assignments coverage partial");
  valid(coverageUuid(r.id) && instant(r.preparedAt) && instant(r.expiresAt) && Date.parse(r.expiresAt) - Date.parse(r.preparedAt) === 300000 && typeof r.partial === "boolean" && Array.isArray(r.assignments));
  zone(r.timeZone); measure(r.coverage);
  const assignments = r.assignments.map(a => {
    object(a, "employeeId locationId startTime endTime positionId isDesignatedLead employeeName locationName positionName");
    valid(text(a.employeeName) && text(a.locationName) && (a.positionName === null || text(a.positionName)) && ((a.positionId === null) === (a.positionName === null)));
    return { employeeId: a.employeeId, locationId: a.locationId, startTime: a.startTime, endTime: a.endTime, positionId: a.positionId, isDesignatedLead: a.isDesignatedLead };
  });
  parseCoverageAction({ op: "prepare_coverage_draft", requestId: r.id, date: r.date, sourceVersion: r.sourceVersion, assignments });
  const receipt = value.receipt;
  if (receipt !== null) {
    object(receipt, "operationId reviewId savedAt count");
    valid(coverageUuid(receipt.operationId) && receipt.reviewId === r.id && instant(receipt.savedAt) && receipt.count === assignments.length);
  }
  valid(value.state === "coverage_review" || receipt !== null);
  if (value.state === "coverage_checked") {
    const p = value.progress;
    object(p, "state observedAt timeZone assignmentsPresent assignmentsTotal publishedAssignments coverage scopeComplete");
    valid(instant(p.observedAt) && ["current", "changed", "unavailable"].includes(String(p.state)) && p.assignmentsTotal === assignments.length && count(p.assignmentsPresent, assignments.length) && count(p.publishedAssignments, Number(p.assignmentsPresent)) && typeof p.scopeComplete === "boolean");
    zone(p.timeZone);
    if (p.state === "unavailable") valid(p.coverage === null && p.assignmentsPresent === 0 && p.publishedAssignments === 0 && !p.scopeComplete);
    else { measure(p.coverage); if (p.state === "current") valid(p.assignmentsPresent === p.assignmentsTotal); }
  } else valid(value.progress === null);
  return value as CoverageActionResponse;
}
