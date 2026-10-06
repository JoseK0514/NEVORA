import { businessDateStart, shiftPeriod, timeMinutes } from "../periods";
import {
  validateGenerationClaims,
  type GenerationClaim,
  type GenerationClaims,
} from "../generation-claims";
import type { ShiftCandidate } from "../validate-shift";
import type {
  ConfiguredNeed,
  GenerationInput,
  GenerationDemand,
  GenerationAssignment,
  GenerationExplanation,
} from "./types";
import { deriveGenerationDemand } from "./demand";
export type CapacityCandidate = ShiftCandidate & { id: string };
export type CapacityAllocation = {
  allowed: boolean;
  claimsByCandidate: Record<string, GenerationClaims>;
  issues: GenerationExplanation[];
  activeExclusionIds: string[];
};
const minute = (value: string) =>
  businessDateStart(value.slice(0, 10)) + timeMinutes(value.slice(11), true);
const civil = (value: number) =>
  new Date(value * 60000).toISOString().slice(0, 16);

/** Shared semantic reservation selection for matching and candidate-period boundaries. */
export function selectActiveGenerationReservations(
  input: GenerationInput,
  demand: GenerationDemand,
) {
  const currentNeeds = new Map(demand.needs.map((n) => [n.needKey, n]));
  const eventIds = new Set<string>();
  const reservations = input.exclusions
    .filter((e) => {
      if (
        e.clearedAt ||
        e.workspaceId !== input.workspace.id ||
        e.weekStart !== input.weekStart ||
        !demand.locationIds.includes(e.locationId) ||
        eventIds.has(e.id)
      )
        return false;
      eventIds.add(e.id);
      return true;
    })
    .flatMap((e) =>
      e.claims.claims
        .filter((c) => currentNeeds.get(c.needKey)?.locationId === e.locationId)
        .map((c) => ({
          eventId: e.id,
          locationId: e.locationId,
          claim: c,
          start: minute(c.coveredStart),
          end: minute(c.coveredEnd),
        })),
    );
  return reservations;
}

/** Demand permission only. Call validateShift(AUTOMATIC) for every actual employee assignment. */
export function allocateAutomaticCapacity(
  input: GenerationInput,
  demand: GenerationDemand,
  fixed: GenerationAssignment[],
  additions: CapacityCandidate[],
): CapacityAllocation {
  if (!demand.ready)
    return {
      allowed: false,
      claimsByCandidate: {},
      issues: demand.issues.length
        ? demand.issues
        : [
            {
              code: "LOCATION_NOT_READY",
              message: "No ready location is available in this scope.",
            },
          ],
      activeExclusionIds: [],
    };
  if (new Set(additions.map((a) => a.id)).size !== additions.length)
    throw new Error("Duplicate capacity candidate identity.");
  const reservations = selectActiveGenerationReservations(input, demand);
  const activeExclusionIds = [
    ...new Set(reservations.map((r) => r.eventId)),
  ].sort();
  const fixedDemand = deriveGenerationDemand(input, fixed);
  const pending = additions
    .map((row) => ({ row, period: shiftPeriod(row) }))
    .sort((a, b) => a.row.id.localeCompare(b.row.id));
  const claims = new Map<string, GenerationClaim[]>(
    additions.map((a) => [a.id, []]),
  );
  const issues: GenerationExplanation[] = [];
  const fail = (
    code: GenerationExplanation["code"],
    locationId: string,
    start: number,
    end: number,
    ids: string[] = [],
  ) => {
    issues.push({
      code,
      locationId,
      start: civil(start),
      end: civil(end),
      exclusionIds: ids,
      message:
        code === "MANAGER_EXCLUDED"
          ? "Excluded from automatic scheduling by Manager"
          : code === "COUPLED_RESERVATION"
            ? "Fulfilling this Lead need would recreate staffing excluded by Manager."
            : "No unreserved automatic demand is available for this assignment.",
    });
  };
  for (const locationId of [
    ...new Set([...demand.locationIds, ...additions.map((a) => a.locationId)]),
  ].sort()) {
    const needs = demand.needs
      .filter((n) => n.locationId === locationId)
      .map((n) => ({
        need: n,
        start: minute(n.needStart),
        end: minute(n.needEnd),
      }));
    const excluded = reservations.filter((r) => r.locationId === locationId);
    const local = pending.filter((p) => p.row.locationId === locationId);
    const boundaries = new Set<number>();
    for (const n of needs) {
      boundaries.add(n.start);
      boundaries.add(n.end);
    }
    for (const r of excluded) {
      boundaries.add(r.start);
      boundaries.add(r.end);
    }
    for (const p of local) {
      boundaries.add(p.period.start);
      boundaries.add(p.period.end);
    }
    for (const block of fixedDemand.blocks.filter(
      (b) => b.locationId === locationId,
    )) {
      const p = shiftPeriod(block);
      boundaries.add(p.start);
      boundaries.add(p.end);
    }
    const points = [...boundaries].sort((a, b) => a - b);
    for (let index = 0; index < points.length - 1; index++) {
      const start = points[index],
        end = points[index + 1];
      const active = local.filter(
        (p) => p.period.start <= start && p.period.end >= end,
      );
      if (!active.length) continue;
      const units = needs
        .filter((n) => n.start <= start && n.end >= end)
        .map((n) => {
          const ids = [
            ...new Set(
              excluded
                .filter(
                  (r) =>
                    r.claim.needKey === n.need.needKey &&
                    r.start <= start &&
                    r.end >= end,
                )
                .map((r) => r.eventId),
            ),
          ].sort();
          return {
            need: n.need,
            reservedIds: ids,
            remaining: Math.max(0, n.need.configuredCapacity - ids.length),
          };
        });
      const health = fixedDemand.blocks.find((b) => {
        if (b.locationId !== locationId) return false;
        const p = shiftPeriod(b);
        return p.start <= start && p.end >= end;
      });
      let matchedPeople = 0;
      for (const unit of units.filter((u) => u.need.kind === "POSITION")) {
        const count =
          health?.positionCoverage.find(
            (p) => p.positionId === unit.need.positionId,
          )?.assigned ?? 0;
        const matched = Math.min(unit.remaining, count);
        unit.remaining -= matched;
        matchedPeople += matched;
      }
      const staffing = units.find((u) => u.need.kind === "STAFFING");
      if (staffing)
        staffing.remaining = Math.max(
          0,
          staffing.remaining -
            Math.max(0, (health?.assignedStaff ?? 0) - matchedPeople),
        );
      const lead = units.find((u) => u.need.kind === "LEAD");
      if (lead && health?.requiresLead && health.leadCovered)
        lead.remaining = 0;
      const addClaim = (id: string, need: ConfiguredNeed) => {
        const { locationId: _, ...facts } = need;
        void _;
        claims.get(id)!.push({
          ...facts,
          coveredStart: civil(start),
          coveredEnd: civil(end),
          quantity: 1,
        });
      };
      // Required compatible position capacity precedes generic staffing, followed by
      // joint Lead coverage. An unrelated position label confers no priority.
      const hasRequiredPositionCapacity = (row: CapacityCandidate) =>
        units.some(
          (unit) =>
            unit.need.kind === "POSITION" &&
            unit.need.positionId === row.positionId &&
            unit.remaining > 0,
        );
      const ordered = [...active].sort(
        (a, b) =>
          Number(hasRequiredPositionCapacity(b.row)) -
            Number(hasRequiredPositionCapacity(a.row)) ||
          Number(Boolean(b.row.isDesignatedLead)) -
            Number(Boolean(a.row.isDesignatedLead)) ||
          a.row.id.localeCompare(b.row.id),
      );
      for (const { row } of ordered) {
        const position = units.find(
          (u) =>
            u.need.kind === "POSITION" && u.need.positionId === row.positionId,
        );
        if (row.isDesignatedLead && lead?.reservedIds.length) {
          fail("MANAGER_EXCLUDED", locationId, start, end, lead.reservedIds);
          continue;
        }
        if (
          position &&
          position.remaining === 0 &&
          position.reservedIds.length
        ) {
          fail(
            "MANAGER_EXCLUDED",
            locationId,
            start,
            end,
            position.reservedIds,
          );
          continue;
        }
        const person =
          position && position.remaining > 0
            ? position
            : staffing && staffing.remaining > 0
              ? staffing
              : undefined;
        const leadAvailable =
          row.isDesignatedLead && lead && lead.remaining > 0;
        if (!person && !leadAvailable) {
          const ids = [...new Set(units.flatMap((u) => u.reservedIds))].sort();
          fail(
            ids.length ? "MANAGER_EXCLUDED" : "NO_AUTOMATIC_CAPACITY",
            locationId,
            start,
            end,
            ids,
          );
          continue;
        }
        if (!person && leadAvailable && staffing?.reservedIds.length) {
          fail(
            "COUPLED_RESERVATION",
            locationId,
            start,
            end,
            staffing.reservedIds,
          );
          continue;
        }
        if (person) {
          person.remaining--;
          addClaim(row.id, person.need);
        }
        if (leadAvailable) {
          lead.remaining--;
          addClaim(row.id, lead.need);
        }
      }
    }
  }
  if (issues.length)
    return {
      allowed: false,
      claimsByCandidate: {},
      issues,
      activeExclusionIds,
    };
  const claimsByCandidate: Record<string, GenerationClaims> =
    Object.create(null);
  for (const { row } of pending) {
    // Coalesce incidental atomic boundaries before applying Task1's explicit JSON/entry bounds.
    const list = claims
      .get(row.id)!
      .sort(
        (a, b) =>
          a.needKey.localeCompare(b.needKey) ||
          a.coveredStart.localeCompare(b.coveredStart),
      );
    const merged: GenerationClaim[] = [];
    for (const claim of list) {
      const last = merged.at(-1);
      if (
        last?.needKey === claim.needKey &&
        last.coveredEnd === claim.coveredStart
      )
        last.coveredEnd = claim.coveredEnd;
      else merged.push({ ...claim });
    }
    claimsByCandidate[row.id] = validateGenerationClaims(
      { version: 1, claims: merged },
      {
        workspaceId: input.workspace.id,
        timeZone: input.workspace.timeZone,
        weekStart: input.weekStart,
        locationId: row.locationId,
      },
      row,
    );
  }
  return { allowed: true, claimsByCandidate, issues: [], activeExclusionIds };
}
