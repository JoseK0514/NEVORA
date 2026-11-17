/* Fictional people, files and timecards for the U01 tests. Nothing here describes a real person or payroll. */
import type { TimecardItem } from "@/lib/timecards/read-model";
import type { Population } from "@/lib/period-close/service";
import type { PeriodRead } from "./export-model";
import type { RosterPerson } from "./import-model";

export const ROSTER: RosterPerson[] = [
  { id: "ana-r", name: "Ana Rivera", active: true }, { id: "luis-o", name: "Luis Ortiz", active: true },
  { id: "mara-c", name: "Mara Colón", active: true }, { id: "tomas-v", name: "Tomás Vega", active: false },
];
export const CSV_HEAD = "employeeId,gross,employeeDeductions,employerContributions,net";
/** Ana and Luis by exact ID, one row whose ID is nobody's ("M-77"); Tomás is not in the file. */
export const CSV = [CSV_HEAD, "ana-r,1000.01,123.40,70.00,876.61", "luis-o,820.5,100,57.44,720.5", "M-77,640,80.25,44.8,559.75", ""].join("\r\n");
export const RUN = { id: "44444444-4444-4444-8444-444444444444", revision: 1, status: "WAITING_FOR_AMOUNTS" as const, period: { startDate: "2026-09-21", endDate: "2026-09-27" }, payday: "2026-10-02", sourceAuthority: "PROVIDER_IMPORT" as const };
export const SOURCE = { sourceName: "Fictional accountant", sourceReference: "FICT-001" };

export const PERIOD = { startDate: "2026-09-21", endDate: "2026-09-27" };
const pad = (n: number) => String(n).padStart(2, "0");
const uuid = (a: number, b: number) => `${pad(a)}${pad(b)}0000-0000-4000-8000-${String(a * 1000 + b).padStart(12, "0")}`;

/** `count` finalized people, each with `breaksEach` recorded breaks inside the period (America/Puerto_Rico). */
export function exportSource(count: number, breaksEach: number, change: Partial<PeriodRead> = {}): { read: PeriodRead; cards: TimecardItem[] } {
  const ids = Array.from({ length: count }, (_, index) => `emp-${pad(index + 1)}`);
  const cards = ids.map((employeeId, person): TimecardItem => {
    const entries = Array.from({ length: Math.max(1, Math.ceil(breaksEach / 8)) }, (_, entry) => {
      const day = pad(21 + (entry % 7)), breaks = Array.from({ length: Math.min(8, breaksEach - entry * 8) }, (_, index) => {
        const start = 13 * 60 + index * 30, at = (minutes: number) => `2026-09-${day}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00Z`;
        return { id: uuid(person, entry * 8 + index), name: index % 2 ? "Rest" : "Lunch", startAt: at(start), endAt: at(start + (index % 2 ? 15 : 30)), rawStartAt: at(start), rawEndAt: at(start + (index % 2 ? 15 : 30)), adjustmentId: null };
      });
      return { id: uuid(90 + entry, person), locationId: "loc-1", locationName: "Old San Juan", positionId: null, positionName: null, sourceKind: "RECORDED" as const, adjustmentId: null, recordedVersion: 1,
        startAt: `2026-09-${day}T12:00:00Z`, endAt: `2026-09-${day}T20:00:00Z`, rawStartAt: `2026-09-${day}T12:00:00Z`, rawEndAt: `2026-09-${day}T20:00:00Z`, breaks };
    });
    const source = { ...PERIOD, employeeId, employeeName: `Person ${pad(person + 1)}`, timeZone: "America/Puerto_Rico", pendingCorrections: 0, entries, corrections: [] };
    return { source, card: { ...source, observedAt: "2026-09-28T12:00:00Z", startAt: "2026-09-21T04:00:00Z", endAt: "2026-09-28T04:00:00Z", recordedNanoseconds: "0", breakNanoseconds: "0", issues: [] },
      sourceHash: "a".repeat(32), revision: 2, state: "FINALIZED",
      history: [{ operationId: uuid(70, person), revision: 2, action: "FINALIZE", occurredAt: "2026-09-28T11:00:00Z", actorName: "Fictional Owner", note: null, sourceHash: "a".repeat(32), snapshot: source },
        { operationId: uuid(71, person), revision: 1, action: "APPROVE", occurredAt: "2026-09-28T10:00:00Z", actorName: "Fictional Owner", note: null, sourceHash: "a".repeat(32), snapshot: source }] };
  });
  const sourceHash = "b".repeat(64);
  const population: Population = { operationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", period: PERIOD, revision: 1, sourceHash,
    members: ids.map(employeeId => ({ employeeId, disposition: "INCLUDE", reason: "Fictional reviewed roster", employmentFacts: "Fictional employment facts", employmentBasis: "MANAGER_ATTESTED" })) };
  const read: PeriodRead = { period: PERIOD, sourceHash, population, exports: [], manifests: [],
    members: ids.map((employeeId, index) => ({ employeeId, name: `Person ${pad(index + 1)}`, active: true, cardState: "FINALIZED", revision: 2 })), ...change };
  return { read, cards };
}
export const PLAN_IDS = { planId: "12345678-1234-4234-8234-123456789012", actorId: "QAOWNER", workspaceId: "workspace-fictional" };
