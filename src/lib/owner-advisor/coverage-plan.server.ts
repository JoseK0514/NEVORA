import "server-only";
import { setImmediate as yieldTurn } from "node:timers/promises";
import { createHash } from "node:crypto";
import { generationSourceSql, generationSourceTables, type GenerationSource } from "@/lib/data/generation-guards";
import { mapGenerationSource } from "@/lib/data/schedule-generation-snapshot";
import { weekStartFor } from "@/lib/date-utils";
import { planWeekSteps } from "@/lib/scheduling/generation/planner";
import { deriveGenerationDemand } from "@/lib/scheduling/generation/demand";
import { selectGenerationScope } from "@/lib/scheduling/generation/scope";
import type { GenerationDemand, GenerationInput, GenerationPlan } from "@/lib/scheduling/generation/types";
import type { CoverageMeasure, CoveragePlans, DayPlan } from "./coverage-plan-contracts";
import type { AdvisorStore } from "./store.server";
import { AdvisorError, type ToolResult } from "./contracts";
import { checkOwner } from "./authority.server";

const LIMITS = Object.freeze({ maxNodes: 64, maxEvaluations: 2000, maxPeriods: 128 });
const text = (v: string) => v.slice(0, 120);
type Metadata = { date: string; observedAt: string; sourceVersion: string };
const measure = (demand: GenerationDemand): CoverageMeasure => ({
  requiredMinutes: demand.coverage.requiredMinutes,
  coveredMinutes: demand.coverage.coveredMinutes,
  requiredObligationMinutes: demand.score.requiredObligationMinutes,
  fulfilledObligationMinutes: demand.score.fulfilledObligationMinutes,
  remainingBlocks: demand.blocks.filter(b => !b.covered).length,
});
function unavailable(input: Pick<GenerationInput, "workspace">, metadata: Omit<Metadata, "sourceVersion">): CoveragePlans {
  return { state: "unavailable", reason: "INPUT_LIMIT", ...metadata, sourceVersion: null,
    timeZone: input.workspace.timeZone, basis: "CURRENT_SCHEDULING_LEDGER_INCLUDES_DRAFT_COMMITMENTS",
    partial: true, locations: [], preservedAssignments: 0, baseline: null, alternatives: [],
    computation: { elapsedMs: 0, yields: 0, maxSliceMs: 0 } };
}
function projection(input: GenerationInput, plan: GenerationPlan, search: DayPlan["search"]): DayPlan {
  const gaps = plan.demand.blocks.filter(b => !b.covered);
  const issues = [...new Map([...plan.explanations, ...plan.warnings].map(i =>
    [JSON.stringify([i.code, i.message]), { code: i.code, message: text(i.message) }])).values()];
  return { search, status: plan.status,
    assignments: plan.additions.map(a => ({
      employeeId: a.employeeId, locationId: a.locationId,
      employeeName: text(input.employees.filter(e => e.id === a.employeeId).map(e => `${e.firstName} ${e.lastName}`)[0]),
      locationName: text(input.locations.find(l => l.id === a.locationId)!.shortName), date: a.date,
      startTime: a.startTime, endTime: a.endTime,
      positionName: a.positionId ? text(input.positions.find(p => p.id === a.positionId)!.name) : null,
      isDesignatedLead: !!a.isDesignatedLead,
      publication: input.schedules.some(s => s.locationId === a.locationId && s.weekStart === input.weekStart && s.status === "PUBLISHED") ? "PUBLISHED" : "DRAFT",
    })),
    addedMinutes: plan.additions.reduce((sum, a) => sum + a.end - a.start, 0),
    publishedTargets: new Set(plan.additions.filter(a => input.schedules.some(s => s.locationId === a.locationId && s.weekStart === input.weekStart && s.status === "PUBLISHED")).map(a => a.locationId)).size,
    coverage: measure(plan.demand),
    remaining: { total: gaps.length, items: gaps.slice(0, 8).map(b => ({
      locationName: text(b.locationName), startTime: b.startTime, endTime: b.endTime,
      missingStaff: b.gap, requiresLead: b.requiresLead === null ? null : b.requiresLead && !b.leadCovered,
      positions: b.positionCoverage.filter(p => p.missing > 0).slice(0, 4).map(p => ({ name: text(p.positionName), missing: p.missing })),
      positionsOmitted: Math.max(0, b.positionCoverage.filter(p => p.missing > 0).length - 4),
    })) }, issues: { total: issues.length, items: issues.slice(0, 20) },
  };
}

/** Joint day allocation over the complete immutable ledger. Only a bounded projection
 * leaves this function. All alternatives are individually final-validated as SETS;
 * alternatives must never be combined. This function has no business writer. */
export async function compareCoveragePlans(source: GenerationInput, metadata: Metadata, signal: AbortSignal): Promise<CoveragePlans> {
  signal.throwIfAborted();
  if (source.employees.length > 80 || source.locations.length > 20 || source.positions.length > 80 ||
      source.ledger.length > 2500 || source.coverageWindows.length > 200 ||
      [...source.employees, ...source.locations, ...source.positions].some(row => !row.id || row.id.length > 128) ||
      Object.values(source).some(v => Array.isArray(v) && v.length > 5000))
    return unavailable(source, metadata);
  const started = performance.now();
  let sliceStarted = started, yields = 0, maxSliceMs = 0;
  const checkpoint = async () => {
    signal.throwIfAborted();
    const now = performance.now();
    maxSliceMs = Math.max(maxSliceMs, now - sliceStarted);
    if (now - sliceStarted >= 4) {
      await yieldTurn(undefined, { signal });
      yields++; sliceStarted = performance.now();
    }
    signal.throwIfAborted();
  };
  // A read-only scope excludes archived targets without omitting their commitments.
  const review = { date: metadata.date };
  const archived = new Set(source.schedules.filter(s => s.weekStart === source.weekStart && s.status === "ARCHIVED").map(s => s.locationId));
  const input: GenerationInput = { ...source, mode: "FILL_GAPS_ONLY", limits: { ...LIMITS },
    scope: { kind: "SELECTED", locationIds: source.locations.filter(l => l.active && !archived.has(l.id)).map(l => l.id) } };
  const scope = selectGenerationScope({ ...input, scope: { kind: "ALL" } }, review);
  if (input.scope.kind === "SELECTED") input.scope.locationIds = input.scope.locationIds.filter(id => scope.readiness.some(r => r.locationId === id && r.state === "READY"));
  const baseline = deriveGenerationDemand(input, input.ledger, review);
  await checkpoint();
  async function solve(excludedCandidateIds: string[] = []) {
    const deadline = Math.min(started + 5000, performance.now() + 2250);
    const steps = planWeekSteps(input, { review, maxAdditions: 12, excludedCandidateIds, stopped: () => performance.now() >= deadline });
    let next = steps.next();
    while (!next.done) { await checkpoint(); next = steps.next(); }
    await checkpoint();
    return next.value;
  }
  const first = await solve();
  const plans: CoveragePlans = { state: "ready", reason: null, ...metadata,
    timeZone: input.workspace.timeZone, basis: "CURRENT_SCHEDULING_LEDGER_INCLUDES_DRAFT_COMMITMENTS",
    partial: false,
    locations: input.locations.slice().sort((a, b) => a.id.localeCompare(b.id)).map(l => {
      const readiness = scope.readiness.find(r => r.locationId === l.id)!;
      return { id: l.id, name: text(l.shortName), state: !l.active ? "INACTIVE" : archived.has(l.id) ? "ARCHIVED" : readiness.state === "READY" ? "INCLUDED" : "NEEDS_SETUP",
        issues: readiness.issues.map(i => i.code) };
    }),
    preservedAssignments: first.fixedAssignments.length, baseline: measure(baseline),
    alternatives: [projection(input, first, "STANDARD")],
    computation: { elapsedMs: 0, yields: 0, maxSliceMs: 0 },
  };
  if (first.additions.length && performance.now() < started + 4500) {
    const alternative = await solve([first.additions[0].id]);
    const signature = (plan: GenerationPlan) => JSON.stringify(plan.additions.map(a => a.id).sort());
    if (signature(first) !== signature(alternative)) plans.alternatives.push(projection(input, alternative, "DIFFERENT_FIRST_ASSIGNMENT"));
  }
  // Never truncate an allocation set. Bound only diagnostics, retaining totals.
  while (JSON.stringify(plans).length > 40000) {
    const last = plans.alternatives.slice().reverse().find(p => p.remaining.items.length || p.issues.items.length);
    if (!last) throw new Error("Coverage projection exceeded its allocation bound.");
    if (last.issues.items.length) last.issues.items.pop(); else last.remaining.items.pop();
  }
  plans.partial = plans.locations.some(l => l.state === "ARCHIVED" || l.state === "NEEDS_SETUP") ||
    !plans.baseline!.requiredMinutes || plans.alternatives.some(p => p.status !== "COMPLETE" || p.remaining.total > p.remaining.items.length || p.issues.total > p.issues.items.length || p.remaining.items.some(b => b.positionsOmitted > 0));
  await checkpoint();
  plans.computation = { elapsedMs: Math.ceil(performance.now() - started), yields, maxSliceMs: Math.ceil(maxSliceMs) };
  return plans;
}

const SOURCE_LIMITS: Partial<Record<keyof GenerationSource, number>> = {
  workspaces: 1, employees: 80, locations: 20, positions: 80,
  shifts: 2500, location_coverage_windows: 200, coverage_window_position_requirements: 400,
};
const sourceLimit = (table: keyof GenerationSource) => SOURCE_LIMITS[table] ?? 5000;
const sizesSql = generationSourceTables.map(table =>
  `(SELECT count(*)::int FROM (SELECT 1 FROM ${table} LIMIT ${sourceLimit(table) + 1}) bounded) AS ${table}`).join(",");
const withinSql = generationSourceTables.map(table => `${table}<=${sourceLimit(table)}`).join(" AND ") +
  ` AND (${generationSourceTables.join("+")})<=16000`;
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

/** One MVCC source observation, with bounded counts before constructing the complete
 * source. Limits decline the whole review; no eligibility row is silently omitted. */
export async function readCoveragePlans(store: AdvisorStore, date: string, incoming: AbortSignal): Promise<ToolResult> {
  const signal = AbortSignal.any([incoming, AbortSignal.timeout(20000)]);
  signal.throwIfAborted();
  const [row] = await store.transaction<{ source: GenerationSource | null; observedAt: string }>({
    text: `WITH sizes AS (SELECT ${sizesSql}) SELECT CASE WHEN ${withinSql} THEN ${generationSourceSql} ELSE NULL END AS source,to_jsonb(clock_timestamp()) AS "observedAt" FROM sizes`,
    values: [],
  }, signal);
  if (!row) throw new AdvisorError("unavailable");
  const metadata = { date, observedAt: row.observedAt };
  let coveragePlans: CoveragePlans;
  if (!row.source || JSON.stringify(row.source).length > 2_000_000) {
    coveragePlans = unavailable({ workspace: store.original.workspace }, metadata);
  } else {
    signal.throwIfAborted();
    const snapshot = mapGenerationSource({ workspaceId: store.original.workspace.id, actorEmployeeId: store.proof.employee.id,
      weekStart: weekStartFor(date), mode: "FILL_GAPS_ONLY", locationScope: { kind: "ALL" } }, row.source, row.observedAt);
    const sourceVersion = createHash("sha256").update(stable(row.source)).digest("hex");
    coveragePlans = await compareCoveragePlans(snapshot.input, { ...metadata, sourceVersion }, signal);
  }
  signal.throwIfAborted();
  await checkOwner(store.proof, store.original, store.ex);
  signal.throwIfAborted();
  return { observedAt: row.observedAt,
    sources: [{ label: "Joint day coverage review", href: `/app/schedule?week=${weekStartFor(date)}`, observedAt: row.observedAt }],
    partial: coveragePlans.partial, coveragePlans,
    data: { date, status: coveragePlans.state, scope: "Selected date; ready active locations; hypothetical additions only" },
  };
}
