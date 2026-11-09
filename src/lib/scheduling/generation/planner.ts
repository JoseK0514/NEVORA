import { addDays } from "../../date-utils";
import { isProtectedAssignment } from "../generation-provenance";
import {
  calculateScheduleHealth,
  type CoverageBlock,
} from "../schedule-health";
import { affectedWorkweeks, shiftPeriod } from "../periods";
import {
  schedulingIssueMessage,
  validateShift,
  type ValidationIssue,
} from "../validate-shift";
import { deriveGenerationDemand } from "./demand";
import { enumerateGenerationPeriods } from "./periods";
import {
  allocateAutomaticCapacity,
  selectActiveGenerationReservations,
} from "./reservations";
import { aggregateGenerationRejections } from "./explanations";
import { compareEmployeeFairness } from "./fairness";
import { boundedSearchSteps } from "./search";
import { generationDates, type GenerationReviewScope } from "./scope";
import type {
  GenerationAssignment,
  GenerationDemand,
  GenerationExplanation,
  GenerationInput,
  GenerationPeriod,
  GenerationPlan,
} from "./types";

type Candidate = GenerationPeriod & {
  id: string;
  employeeId: string;
  positionId?: string;
  isDesignatedLead?: boolean;
};
type Gap = {
  key: string;
  block: CoverageBlock;
  start: number;
  end: number;
  positionId?: string;
  lead: boolean;
  quantity: number;
};
type State = {
  additions: Candidate[];
  demand: GenerationDemand;
  skipped: string[];
};
type Option = {
  candidate: Candidate;
  gain: number;
  confirmed: boolean;
  gaps: string[];
};
const civil = (minute: number) =>
  new Date(minute * 60000).toISOString().slice(0, 16);
const lexical = (a: unknown, b: unknown) =>
  JSON.stringify(a).localeCompare(JSON.stringify(b));

function canonicalInput(source: GenerationInput): GenerationInput {
  const input = structuredClone(source);
  for (const rows of [
    input.locations,
    input.positions,
    input.employees,
    input.ledger,
    input.schedules,
    input.exclusions,
    input.coverageWindows,
  ])
    rows.sort((a, b) => a.id.localeCompare(b.id));
  input.staffing.sort((a, b) => a.locationId.localeCompare(b.locationId));
  for (const e of input.employees) {
    e.positionIds.sort();
    e.eligibleLocationIds.sort();
    e.availability = [...e.availability].sort(lexical);
    e.weeklyAvailability = [...e.weeklyAvailability].sort(lexical);
    e.availabilityExceptions = [...e.availabilityExceptions].sort(lexical);
    e.approvedTimeOff = [...e.approvedTimeOff].sort(lexical);
  }
  for (const w of input.coverageWindows) w.positionRequirements.sort(lexical);
  return input;
}
function gapsFor(demand: GenerationDemand): Gap[] {
  return demand.blocks.flatMap((block) => {
    const period = shiftPeriod(block);
    const make = (
      kind: string,
      quantity: number,
      positionId?: string,
      lead = false,
    ): Gap => ({
      key: JSON.stringify([block.locationId, period.start, period.end, kind]),
      block,
      ...period,
      positionId,
      lead,
      quantity,
    });
    return [
      ...block.positionCoverage
        .filter((p) => p.missing > 0)
        .map((p) => make(`POSITION:${p.positionId}`, p.missing, p.positionId)),
      ...(block.requiresLead && !block.leadCovered
        ? [make("LEAD", 1, undefined, true)]
        : []),
      ...(block.gap && block.gap > 0 ? [make("STAFFING", block.gap)] : []),
    ];
  });
}
function intersects(
  candidate: Candidate | GenerationPeriod,
  gap: Gap,
): boolean {
  return (
    candidate.locationId === gap.block.locationId &&
    candidate.start < gap.end &&
    gap.start < candidate.end
  );
}
function serves(candidate: Candidate, gap: Gap): boolean {
  return (
    intersects(candidate, gap) &&
    (!gap.positionId || candidate.positionId === gap.positionId) &&
    (!gap.lead || Boolean(candidate.isDesignatedLead))
  );
}
function asAssignment(
  input: GenerationInput,
  candidate: Candidate,
): GenerationAssignment {
  return {
    ...candidate,
    scheduleId:
      input.schedules.find(
        (s) =>
          s.locationId === candidate.locationId &&
          s.weekStart === input.weekStart,
      )?.id ?? "",
    scheduleStatus: "DRAFT",
    assignmentOrigin: "GENERATED",
    hasExchangeHistory: false,
    hasCalloutHistory: false,
    hasPublicationHistory: false,
  };
}
function compareScore(a: State, b: State): number {
  return (
    a.demand.score.fulfilledObligationMinutes -
      b.demand.score.fulfilledObligationMinutes ||
    a.demand.coverage.coveredMinutes - b.demand.coverage.coveredMinutes ||
    a.demand.score.contiguousDurationScore -
      b.demand.score.contiguousDurationScore ||
    b.additions.length - a.additions.length
  );
}

/**
 * Pure, deterministic planning over a cloned snapshot and explicit search budgets.
 * BUILD_WEEK replaces only unprotected draft work in ready scope; published,
 * manual and historical assignments remain fixed. Every addition must satisfy
 * shared automatic rules and unreserved configured capacity, including a final
 * check against the complete proposed ledger. BUDGET_EXHAUSTED describes bounded
 * search, not proof that the remaining demand is impossible. Persistence must
 * independently verify the snapshot and review before applying this plan.
 */
export function planWeek(source: GenerationInput): GenerationPlan {
  const steps = planWeekSteps(source);
  let next = steps.next();
  while (!next.done) next = steps.next();
  return next.value;
}

export type PlannerControls = {
  review?: GenerationReviewScope;
  stopped?: () => boolean;
  maxAdditions?: number;
  excludedCandidateIds?: readonly string[];
};
/** Same canonical solver, with cooperative checkpoints for bounded read-only reviews.
 * The synchronous management facade supplies no review controls. */
export function* planWeekSteps(source: GenerationInput, controls: PlannerControls = {}): Generator<undefined, GenerationPlan, undefined> {
  const input = canonicalInput(source);
  const dates = generationDates(input, controls.review);
  if (controls.maxAdditions !== undefined && (!Number.isSafeInteger(controls.maxAdditions) || controls.maxAdditions < 1))
    throw new Error("Invalid addition budget.");
  const excluded = new Set(controls.excludedCandidateIds ?? []);
  for (const value of Object.values(input.limits))
    if (!Number.isSafeInteger(value) || value < 1)
      throw new Error("Planner budgets must be positive safe integers.");
  const initialDemand = deriveGenerationDemand(input, input.ledger, controls.review);
  yield;
  const replaceable = new Set(
    input.ledger
      .filter(
        (s) =>
          input.mode === "BUILD_WEEK" &&
          initialDemand.ready &&
          initialDemand.locationIds.includes(s.locationId) &&
          s.date >= input.weekStart &&
          s.date < addDays(input.weekStart, 7) &&
          s.scheduleStatus === "DRAFT" &&
          input.schedules.some(
            (parent) =>
              parent.id === s.scheduleId &&
              parent.weekStart === input.weekStart &&
              parent.locationId === s.locationId &&
              parent.status === "DRAFT",
          ) &&
          !isProtectedAssignment(s),
      )
      .map((s) => s.id),
  );
  const fixed = input.ledger.filter((s) => !replaceable.has(s.id));
  const baseDemand = deriveGenerationDemand(input, fixed, controls.review);
  yield;
  const employees = new Map(input.employees.map((e) => [e.id, e]));
  const locations = new Map(input.locations.map((l) => [l.id, l]));
  const positions = new Map(input.positions.map((p) => [p.id, p]));
  let evaluations = 0,
    cacheHits = 0,
    periodsEnumerated = 0,
    budgetExhausted = false,
    reservedFinalEvaluations = 0;
  type Evaluations = Map<string, ReturnType<typeof validateShift>>;
  const cache = new Map<string, Evaluations>();
  const cacheForLedger = (employeeId: string, rows: GenerationAssignment[]) => {
    const key = JSON.stringify([employeeId, rows]);
    let results = cache.get(key);
    if (!results) {
      results = new Map();
      cache.set(key, results);
    }
    return results;
  };
  const enumerationIssues: GenerationExplanation[] = [];
  const ledgerFor = (additions: Candidate[]) => [
    ...fixed,
    ...additions.map((a) => asAssignment(input, a)),
  ];
  const evaluate = (
    candidate: Candidate,
    ledger: GenerationAssignment[],
    reserve: number,
    final = false,
    employeeLedger?: { rows: GenerationAssignment[]; results: Evaluations },
  ) => {
    // The immutable invocation input fixes qualifications/availability/policy. Include the complete
    // employee dated ledger in each key; a change at another location or workweek invalidates it.
    const relevant =
      employeeLedger?.rows ??
      ledger
        .filter((s) => s.employeeId === candidate.employeeId)
        .sort((a, b) => a.id.localeCompare(b.id));
    const results =
      employeeLedger?.results ?? cacheForLedger(candidate.employeeId, relevant);
    const hit = results.get(candidate.id);
    if (hit) {
      cacheHits++;
      return hit;
    }
    if (
      evaluations >=
      input.limits.maxEvaluations -
        (final ? 0 : Math.max(reserve, reservedFinalEvaluations))
    ) {
      budgetExhausted = true;
      return undefined;
    }
    const e = employees.get(candidate.employeeId)!;
    evaluations++;
    const result = validateShift({
      candidate,
      workspace: input.workspace,
      location: locations.get(candidate.locationId)!,
      position: candidate.positionId
        ? positions.get(candidate.positionId)
        : undefined,
      employee: e,
      existingShifts: relevant,
      availability: e.availability,
      weeklyAvailability: e.weeklyAvailability,
      availabilityExceptions: e.availabilityExceptions,
      approvedTimeOff: e.approvedTimeOff,
      mode: "AUTOMATIC",
      policy: input.policy,
      operationalProfile: e.operationalProfile,
    });
    results.set(candidate.id, result);
    return result;
  };
  const enumerate = (state: State) => {
    const remaining = input.limits.maxPeriods - periodsEnumerated;
    if (remaining <= 0) {
      budgetExhausted = true;
      return [];
    }
    const result = enumerateGenerationPeriods(
      { ...input, limits: { ...input.limits, maxPeriods: remaining } },
      state.demand,
      ledgerFor(state.additions),
    );
    periodsEnumerated += result.periods.length;
    enumerationIssues.push(...result.issues);
    if (result.exhausted) budgetExhausted = true;
    return result.periods;
  };
  type Rejections = { employeeId: string; issues: ValidationIssue[] }[];
  const rejectionRecords = new Map<string, Map<string, Rejections>>();
  const diagnosticKey = (state: State) =>
    JSON.stringify(state.additions.map((a) => a.id).sort());
  function* optionsFor(
    state: State,
    periods: GenerationPeriod[],
    gaps: Gap[],
  ): Generator<undefined, Option[], undefined> {
    const ledger = ledgerFor(state.additions),
      options: Option[] = [];
    const stateKey = diagnosticKey(state);
    const stateRejections =
      rejectionRecords.get(stateKey) ?? new Map<string, Rejections>();
    rejectionRecords.set(stateKey, stateRejections);
    const assignedIds = new Set(state.additions.map((a) => a.id));
    const employeeLedgers = new Map(
      input.employees.map((e) => {
        const rows = ledger
          .filter((s) => s.employeeId === e.id)
          .sort((a, b) => a.id.localeCompare(b.id));
        return [e.id, { rows, results: cacheForLedger(e.id, rows) }] as const;
      }),
    );
    for (const period of periods) {
      const local = gaps.filter((g) => intersects(period, g));
      if (!local.length) continue;
      const positionIds = [
        undefined,
        ...new Set(local.flatMap((g) => (g.positionId ? [g.positionId] : []))),
      ];
      const leads = local.some((g) => g.lead) ? [false, true] : [false];
      for (const e of input.employees)
        for (const positionId of positionIds)
          for (const lead of leads) {
            yield;
            if (controls.stopped?.()) { budgetExhausted = true; return options; }
            const candidate: Candidate = {
              ...period,
              id: `auto:${JSON.stringify([e.id, period.locationId, period.date, period.startTime, period.endTime, positionId ?? null, lead])}`,
              employeeId: e.id,
              ...(positionId ? { positionId } : {}),
              ...(lead ? { isDesignatedLead: true } : {}),
            };
            if (assignedIds.has(candidate.id) || excluded.has(candidate.id)) continue;
            const served = local.filter((g) => serves(candidate, g));
            if (!served.length) continue;
            const result = evaluate(
              candidate,
              ledger,
              state.additions.length + 1,
              false,
              employeeLedgers.get(e.id),
            );
            if (!result) return options;
            for (const gap of served) {
              const records = stateRejections.get(gap.key) ?? [];
              // Keep only distinct employee/code diagnostics, never candidate or search-path counts.
              for (const issue of result.blockers)
                if (
                  !records.some(
                    (r) =>
                      r.employeeId === e.id && r.issues[0].code === issue.code,
                  )
                )
                  records.push({ employeeId: e.id, issues: [issue] });
              stateRejections.set(gap.key, records);
            }
            if (!result.eligible) continue;
            options.push({
              candidate,
              gain: served.reduce(
                (sum, g) =>
                  sum +
                  Math.min(candidate.end, g.end) -
                  Math.max(candidate.start, g.start),
                0,
              ),
              confirmed: affectedWorkweeks(candidate).every((week) =>
                e.weeklyAvailability.some(
                  (w) => w.weekStart === week && w.submitted,
                ),
              ),
              gaps: served.map((g) => g.key),
            });
          }
    }
    return options;
  }
  const initial: State = { additions: [], demand: baseDemand, skipped: [] };
  const search = baseDemand.ready
    ? yield* boundedSearchSteps({
        initial,
        maxNodes: input.limits.maxNodes,
        key: (s: State) =>
          JSON.stringify([
            s.additions.map((a) => a.id).sort(),
            s.skipped.slice().sort(),
          ]),
        better: (a: State, b: State) => {
          const better = compareScore(a, b) > 0;
          if (better)
            reservedFinalEvaluations = Math.max(
              reservedFinalEvaluations,
              a.additions.length,
            );
          return better;
        },
        complete: (s: State) =>
          s.demand.coverage.requiredMinutes > 0 &&
          s.demand.coverage.coveredMinutes ===
            s.demand.coverage.requiredMinutes,
        stopped: () => controls.stopped?.() ?? false,
        children: function* (state: State): IterableIterator<State | undefined> {
          if (budgetExhausted) return;
          if (controls.maxAdditions !== undefined && state.additions.length >= controls.maxAdditions) {
            budgetExhausted = true;
            return;
          }
          const gaps = gapsFor(state.demand).filter(
            (g) => !state.skipped.includes(g.key),
          );
          if (!gaps.length) return;
          yield;
          const options = yield* optionsFor(state, enumerate(state), gaps);
          const byGap = new Map<string, Option[]>(gaps.map((g) => [g.key, []]));
          const opportunities = new Map<string, Set<string>>();
          for (const option of options) {
            const employeeGaps =
              opportunities.get(option.candidate.employeeId) ??
              new Set<string>();
            for (const key of option.gaps) {
              byGap.get(key)!.push(option);
              employeeGaps.add(key);
            }
            opportunities.set(option.candidate.employeeId, employeeGaps);
          }
          const counts = new Map(
            gaps.map((g) => [
              g.key,
              new Set(byGap.get(g.key)!.map((o) => o.candidate.employeeId))
                .size / g.quantity,
            ]),
          );
          const count = (g: Gap) => counts.get(g.key)!;
          // Whole-week minimum remaining values: constrained position, Lead, location and date
          // opportunities are considered together, including the current remaining weekly cap.
          gaps.sort(
            (a, b) =>
              count(a) - count(b) ||
              Number(Boolean(b.positionId || b.lead)) -
                Number(Boolean(a.positionId || a.lead)) ||
              a.key.localeCompare(b.key),
          );
          const gap = gaps[0];
          // Once enumeration/evaluation stops, zero collected options may mean an
          // unvisited gap, not an impossible one. Visit every already-evaluated
          // choice without spending more evaluator budget or losing final headroom.
          const choices = budgetExhausted ? options : byGap.get(gap.key)!;
          const flexibility = new Map(
            input.employees.map((e) => [
              e.id,
              opportunities.get(e.id)?.size ?? 0,
            ]),
          );
          const fairnessContext = {
            weekStart: input.weekStart,
            ledger: ledgerFor(state.additions),
            employeeIds: input.employees.map((e) => e.id),
          };
          choices.sort((a, b) => {
            const ae = a.candidate,
              be = b.candidate;
            const confirmed = new Set([
              ...(a.confirmed ? [ae.employeeId] : []),
              ...(b.confirmed ? [be.employeeId] : []),
            ]);
            return (
              b.gain - a.gain ||
              be.end - be.start - (ae.end - ae.start) ||
              flexibility.get(ae.employeeId)! -
                flexibility.get(be.employeeId)! ||
              compareEmployeeFairness(
                employees.get(ae.employeeId)!,
                employees.get(be.employeeId)!,
                { ...fairnessContext, confirmedEmployeeIds: confirmed },
              ) ||
              ae.id.localeCompare(be.id)
            );
          });
          for (const choice of choices) {
            yield;
            if (controls.stopped?.()) { budgetExhausted = true; return; }
            const additions = [...state.additions, choice.candidate];
            // The entire proposed set remains automatic, so split/superset/other-person
            // variations cannot escape reserved capacity by becoming artificial fixed work.
            if (
              !allocateAutomaticCapacity(input, baseDemand, fixed, additions)
                .allowed
            )
              continue;
            const demand = deriveGenerationDemand(input, ledgerFor(additions), controls.review);
            if (
              demand.score.fulfilledObligationMinutes <=
              state.demand.score.fulfilledObligationMinutes
            )
              continue;
            yield { additions, demand, skipped: state.skipped };
          }
          if (!budgetExhausted)
            yield { ...state, skipped: [...state.skipped, gap.key] };
        },
      })
    : { best: initial, exploredNodes: 0, exhausted: false };
  budgetExhausted ||= search.exhausted;
  const additions = search.best.additions
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  const finalLedger = ledgerFor(additions);
  const warnings: ValidationIssue[] = [];
  // Explicitly revalidate every accepted addition against the actual final complete ledger.
  // Reserved evaluator budget ensures this is performed even when the search is exhausted.
  for (const candidate of additions) {
    yield;
    const result = evaluate(
      candidate,
      finalLedger.filter((s) => s.id !== candidate.id),
      0,
      true,
    );
    if (!result?.eligible)
      throw new Error("Planner final eligibility invariant failed.");
    warnings.push(
      ...result.warnings.map((w) => ({
        ...w,
        details: {
          ...w.details,
          employeeId: candidate.employeeId,
          locationId: candidate.locationId,
          date: candidate.date,
        },
      })),
    );
  }
  const allocation = baseDemand.ready
    ? allocateAutomaticCapacity(input, baseDemand, fixed, additions)
    : undefined;
  if (allocation && !allocation.allowed)
    throw new Error("Planner final capacity invariant failed.");
  yield;
  const demand = deriveGenerationDemand(input, finalLedger, controls.review);
  const gaps = gapsFor(demand);
  const explanations: GenerationExplanation[] = [
    ...demand.issues,
    // A skipped long alternative is relevant only where real configured demand
    // remains uncovered. Fully covered periods need no storage-shape warning.
    ...enumerationIssues.filter(
      (issue) =>
        issue.code !== "UNREPRESENTABLE_PERIOD" ||
        gaps.some(
          (gap) =>
            (!issue.locationId || gap.block.locationId === issue.locationId) &&
            (!issue.start || civil(gap.end) > issue.start) &&
            (!issue.end || civil(gap.start) < issue.end),
        ),
    ),
  ];
  for (const gap of gaps) {
    const code = gap.positionId
      ? "POSITION_COVERAGE_GAP"
      : gap.lead
        ? "LEAD_COVERAGE_GAP"
        : "STAFFING_GAP";
    explanations.push({
      code,
      message: schedulingIssueMessage(code),
      locationId: gap.block.locationId,
      start: civil(gap.start),
      end: civil(gap.end),
    });
    explanations.push(
      ...aggregateGenerationRejections(
        rejectionRecords.get(diagnosticKey(search.best))?.get(gap.key) ?? [],
      ).map((r) => ({
        ...r,
        locationId: gap.block.locationId,
        start: civil(gap.start),
        end: civil(gap.end),
      })),
    );
    for (const reservation of selectActiveGenerationReservations(
      input,
      demand,
    ).filter(
      (r) =>
        r.locationId === gap.block.locationId &&
        r.start < gap.end &&
        r.end > gap.start,
    ))
      explanations.push({
        code: "MANAGER_EXCLUDED",
        locationId: gap.block.locationId,
        start: civil(Math.max(gap.start, reservation.start)),
        end: civil(Math.min(gap.end, reservation.end)),
        exclusionIds: [reservation.eventId],
        message: "Excluded from automatic scheduling by Manager",
      });
  }
  for (const r of demand.excludedLocations)
    explanations.push({
      code: "LOCATION_NOT_READY",
      locationId: r.locationId,
      message: "Location is unavailable or needs setup.",
    });
  if (budgetExhausted)
    explanations.push({
      code: "BUDGET_EXHAUSTED",
      message:
        "The deterministic planning budget was exhausted. Remaining gaps may still have a feasible solution.",
    });
  const unique = <T>(items: T[]) =>
    [...new Map(items.map((i) => [JSON.stringify(i), i])).values()].sort(
      lexical,
    );
  const health = calculateScheduleHealth({
    workspace: input.workspace,
    positions: input.positions,
    locations: input.locations
      .filter((l) => demand.locationIds.includes(l.id))
      .map((l) => ({
        ...l,
        ...input.staffing.find((s) => s.locationId === l.id)!,
      })),
    employees: input.employees.map((e) => ({
      ...e,
      name: `${e.firstName} ${e.lastName}`,
    })),
    shifts: finalLedger,
    coverageWindows: input.coverageWindows.filter((w) =>
      demand.locationIds.includes(w.locationId),
    ),
    weekDates: dates,
  });
  return {
    status: !demand.ready
      ? "INVALID"
      : gaps.length === 0 && !demand.coverage.unavailable
        ? "COMPLETE"
        : budgetExhausted
          ? "BUDGET_EXHAUSTED"
          : "PARTIAL",
    additions: additions.map((a) => ({
      ...a,
      generatedClaims: allocation!.claimsByCandidate[a.id],
    })),
    fixedAssignments: fixed,
    preservedShiftIds: fixed.map((s) => s.id).sort(),
    replacedShiftIds: [...replaceable].sort(),
    demand,
    explanations: unique(explanations),
    warnings: unique(warnings),
    health,
    limits: { ...input.limits },
    exploredNodes: search.exploredNodes,
    evaluations,
    cacheHits,
    periodsEnumerated,
  };
}
