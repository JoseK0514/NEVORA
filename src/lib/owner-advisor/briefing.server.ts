import "server-only";
import { readToday } from "@/lib/data/today.server";
import { generationSourceSql, type GenerationSource } from "@/lib/data/generation-guards";
import { mapSchedulingSourceFacts } from "@/lib/data/scheduling-source-facts";
import { calculateScheduleHealth } from "@/lib/scheduling/schedule-health";
import { addDays, weekStartFor } from "@/lib/date-utils";
import { checkOwner } from "./authority.server";
import { deriveAttention, type AttentionCoverage } from "./briefing";
import type { AdvisorStore } from "./store.server";

/** Read current Today facts, optional bounded planning coverage and saved dispositions.
 * Coverage failures remain null/partial, while Owner authority is checked before
 * reads and after projection; absence of coverage evidence cannot prove all-clear. */
export async function readOwnerAttention(store: AdvisorStore) {
  const { proof, original, ex } = store;
  await checkOwner(proof, original, ex);
  const today = await readToday(proof, ex);
  let coverage: AttentionCoverage | null = null;
  if (today.state === "ready") {
    try {
      const [row] = await store.transaction<{source: GenerationSource; observedAt: string}>({
        text: `SELECT ${generationSourceSql} AS source,clock_timestamp()::text AS "observedAt"`, values: [],
      });
      if (row && Object.values(row.source).every(rows => rows.length <= 3000)) {
        const facts = mapSchedulingSourceFacts(row.source, { workspaceId: original.workspace.id, startDate: weekStartFor(today.today), endDate: addDays(weekStartFor(today.today), 7), retainAdjacentCommitments: true });
        const locations = facts.locations.filter(l => l.active);
        const dayOfWeek = new Date(`${today.today}T12:00:00Z`).getUTCDay();
        const rules = Object.fromEntries(locations.map(l => [l.id, {
          minimumStaff: facts.staffing.find(s => s.locationId === l.id)?.minimumStaffPerShift ?? null,
          requiresLead: facts.staffing.find(s => s.locationId === l.id)?.requiresDesignatedLead ?? null,
          windows: facts.coverageWindows.filter(w => w.locationId === l.id && w.dayOfWeek === dayOfWeek).map(w => ({
            startTime: w.startTime, endTime: w.endTime, minimumStaff: w.minimumStaff ?? null,
            positions: w.positionRequirements.map(p => ({ id: p.positionId, quantity: p.quantity, active: facts.positions.some(position => position.id === p.positionId && position.active) })),
          })),
        }]));
        if (locations.length <= 100) coverage = { observedAt: row.observedAt, locations: locations.map(l => ({id: l.id, name: l.shortName})), rules, health: calculateScheduleHealth({
          workspace: facts.workspace, positions: facts.positions, shifts: facts.ledger,
          employees: facts.employees.map(e => ({...e, name: `${e.firstName} ${e.lastName}`})),
          locations: locations.map(l => ({ id: l.id, name: l.shortName, minimumStaffPerShift: facts.staffing.find(s => s.locationId === l.id)?.minimumStaffPerShift ?? null, requiresDesignatedLead: facts.staffing.find(s => s.locationId === l.id)?.requiresDesignatedLead ?? null })),
          coverageWindows: facts.coverageWindows, weekDates: [today.today],
        }) };
      }
    } catch {
      coverage = null;
    }
  }
  const reviews = await store.briefingReviews();
  await checkOwner(proof, original, ex);
  return { today, ...deriveAttention(today, coverage, reviews) };
}
