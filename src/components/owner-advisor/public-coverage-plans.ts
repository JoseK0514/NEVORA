import { shiftPeriod } from "@/lib/scheduling/periods";
import type { CoverageMeasure, CoveragePlans } from "@/lib/owner-advisor/coverage-plan-contracts";

function valid(condition: unknown): asserts condition {
  if (!condition) throw Error("Invalid day-plan response");
}
function object(value: unknown, keys: string): asserts value is Record<string, unknown> {
  valid(value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === keys.split(" ").sort().join(","));
}
const text = (v: unknown, max = 200): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const count = (v: unknown, max = 1_000_000_000): v is number => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= max;
const day = (v: unknown): v is string => typeof v === "string" && /^20\d\d-\d\d-\d\d$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const time = (v: unknown): v is string => typeof v === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
const endTime = (v: unknown): v is string => v === "24:00" || time(v);
function measure(value: unknown): asserts value is CoverageMeasure {
  object(value, "requiredMinutes coveredMinutes requiredObligationMinutes fulfilledObligationMinutes remainingBlocks");
  valid(Object.values(value).every(v => count(v)) && Number(value.coveredMinutes) <= Number(value.requiredMinutes) &&
    Number(value.fulfilledObligationMinutes) <= Number(value.requiredObligationMinutes));
}

/** Bound and cross-check public evidence, including completion claims. It is still
 * a historical review, never authority to execute an assignment. */
export function parseCoveragePlans(value: unknown): CoveragePlans {
  object(value, "state reason date timeZone observedAt sourceVersion basis partial locations preservedAssignments baseline alternatives computation");
  valid(JSON.stringify(value).length <= 40000 && day(value.date) && text(value.timeZone, 100) &&
    typeof value.observedAt === "string" && Number.isFinite(Date.parse(value.observedAt)) &&
    value.basis === "CURRENT_SCHEDULING_LEDGER_INCLUDES_DRAFT_COMMITMENTS" && typeof value.partial === "boolean" &&
    count(value.preservedAssignments, 2500) && Array.isArray(value.locations) && value.locations.length <= 20 &&
    Array.isArray(value.alternatives) && value.alternatives.length <= 2);
  new Intl.DateTimeFormat("en", { timeZone: value.timeZone });
  object(value.computation, "elapsedMs yields maxSliceMs");
  valid(Object.values(value.computation).every(v => count(v)) && Number(value.computation.maxSliceMs) <= Number(value.computation.elapsedMs));
  if (value.state === "unavailable") {
    valid(value.reason === "INPUT_LIMIT" && value.sourceVersion === null && value.baseline === null &&
      value.alternatives.length === 0 && value.locations.length === 0 && value.partial);
    return value as CoveragePlans;
  }
  valid(value.state === "ready" && value.reason === null && typeof value.sourceVersion === "string" && /^[a-f0-9]{64}$/.test(value.sourceVersion) && value.alternatives.length >= 1);
  measure(value.baseline);
  let incomplete = value.baseline.requiredMinutes === 0;
  const locationIds = new Set<string>();
  for (const location of value.locations) {
    object(location, "id name state issues");
    valid(text(location.id, 128) && !locationIds.has(location.id) && text(location.name) &&
      ["INCLUDED", "ARCHIVED", "NEEDS_SETUP", "INACTIVE"].includes(String(location.state)) &&
      Array.isArray(location.issues) && location.issues.length <= 20 && location.issues.every(v => text(v, 80) && /^[A-Z_]+$/.test(v)));
    locationIds.add(location.id);
    incomplete ||= location.state === "ARCHIVED" || location.state === "NEEDS_SETUP";
  }
  for (const [index, plan] of value.alternatives.entries()) {
    object(plan, "search status assignments addedMinutes publishedTargets coverage remaining issues");
    valid(plan.search === (index === 0 ? "STANDARD" : "DIFFERENT_FIRST_ASSIGNMENT") &&
      ["COMPLETE", "PARTIAL", "INVALID", "BUDGET_EXHAUSTED"].includes(String(plan.status)) &&
      Array.isArray(plan.assignments) && plan.assignments.length <= 12 && count(plan.addedMinutes, 17280) &&
      count(plan.publishedTargets, plan.assignments.length));
    measure(plan.coverage);
    valid(plan.coverage.requiredMinutes === value.baseline.requiredMinutes && plan.coverage.requiredObligationMinutes === value.baseline.requiredObligationMinutes);
    let addedMinutes = 0;
    const people = new Map<string, { start: number; end: number }[]>();
    for (const assignment of plan.assignments) {
      object(assignment, "employeeId employeeName locationId locationName date startTime endTime positionName isDesignatedLead publication");
      valid(text(assignment.employeeId, 128) && text(assignment.employeeName) && text(assignment.locationId, 128) && text(assignment.locationName) &&
        assignment.date === value.date && time(assignment.startTime) && endTime(assignment.endTime) &&
        (assignment.positionName === null || text(assignment.positionName)) && typeof assignment.isDesignatedLead === "boolean" &&
        ["DRAFT", "PUBLISHED"].includes(String(assignment.publication)) &&
        value.locations.some(l => l.id === assignment.locationId && l.state === "INCLUDED"));
      const period = shiftPeriod({ date: value.date, startTime: assignment.startTime, endTime: assignment.endTime });
      const prior = people.get(assignment.employeeId) ?? [];
      valid(!prior.some(p => p.start < period.end && period.start < p.end));
      prior.push(period); people.set(assignment.employeeId, prior);
      addedMinutes += period.end - period.start;
    }
    valid(plan.addedMinutes === addedMinutes && plan.publishedTargets === new Set(plan.assignments.filter(a => a.publication === "PUBLISHED").map(a => a.locationId)).size);
    object(plan.remaining, "total items");
    valid(count(plan.remaining.total) && plan.remaining.total === plan.coverage.remainingBlocks && Array.isArray(plan.remaining.items) && plan.remaining.items.length <= 8 && plan.remaining.items.length <= plan.remaining.total);
    for (const block of plan.remaining.items) {
      object(block, "locationName startTime endTime missingStaff requiresLead positions positionsOmitted");
      valid(text(block.locationName) && time(block.startTime) && endTime(block.endTime) &&
        (block.missingStaff === null || count(block.missingStaff, 100)) && (block.requiresLead === null || typeof block.requiresLead === "boolean") &&
        Array.isArray(block.positions) && block.positions.length <= 4 && count(block.positionsOmitted, 80));
      for (const position of block.positions) {
        object(position, "name missing"); valid(text(position.name) && count(position.missing, 100) && position.missing > 0);
      }
      incomplete ||= block.positionsOmitted > 0;
    }
    object(plan.issues, "total items");
    valid(count(plan.issues.total) && Array.isArray(plan.issues.items) && plan.issues.items.length <= 20 && plan.issues.items.length <= plan.issues.total);
    for (const issue of plan.issues.items) {
      object(issue, "code message"); valid(text(issue.code, 80) && /^[A-Z_]+$/.test(issue.code) && text(issue.message));
    }
    if (plan.status === "COMPLETE") valid(plan.remaining.total === 0 && plan.coverage.requiredMinutes > 0 &&
      plan.coverage.coveredMinutes === plan.coverage.requiredMinutes && plan.coverage.fulfilledObligationMinutes === plan.coverage.requiredObligationMinutes);
    incomplete ||= plan.status !== "COMPLETE" || plan.remaining.total > plan.remaining.items.length || plan.issues.total > plan.issues.items.length;
  }
  valid(!incomplete || value.partial);
  return value as CoveragePlans;
}
