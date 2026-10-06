import { expect, it, vi } from "vitest";
import { acknowledgeScheduleWeek, getAcknowledgementSummary, listUnacknowledgedEmployeeIds } from "./acknowledgements";
vi.mock("./publication-revisions", () => ({ getLatestPublicationRevision: vi.fn(async () => ({ id: "revision-1" })), listRevisionShifts: vi.fn(async () => [{ employeeId: "employee-1" }, { employeeId: "owner-1" }]) }));
vi.mock("../db", async importOriginal => ({ ...await importOriginal<typeof import("../db")>(), getDb: () => ({ query: async (sql: string) => sql.includes("FROM employees") ? [{ id: "employee-1" }] : [] }) }));
it("requires acknowledgement only from scheduled self-service roles", async () => {
  expect(await getAcknowledgementSummary("2030-10-07")).toEqual({ scheduledEmployees: 1, acknowledgedEmployees: 0 });
  expect(await listUnacknowledgedEmployeeIds("2030-10-07")).toEqual(["employee-1"]);
});

it("acknowledgement commits under the week lock and cancels outstanding reminders including claimed deliveries", async () => {
  const transaction = vi.fn(async (statements: readonly import('../notifications/types').SqlStatement[]) => statements.map(s => s.text.includes("INSERT INTO schedule_acknowledgements") ? [{employee_id:"employee-1",publication_revision_id:"revision-1"}] : []));
  const executor = {query:vi.fn(),transaction};
  expect(await acknowledgeScheduleWeek({weekStart:"2030-10-07",employeeId:"employee-1"},executor)).toBe(true);
  const statements=transaction.mock.calls.at(-1)![0];
  expect(statements[0].text).toContain("pg_advisory_xact_lock");
  expect(statements.some(s=>s.text.includes("purpose = 'REMINDER'") && s.text.includes("UPDATE notifications"))).toBe(true);
  expect(statements.some(s=>s.text.includes("UPDATE push_deliveries") && s.text.includes("processing"))).toBe(true);
});

it("types the cancellation week parameter for text source IDs and both date comparisons", async () => {
  const transaction = vi.fn(async (statements: readonly import('../notifications/types').SqlStatement[]) => statements.map(() => []));
  await acknowledgeScheduleWeek({weekStart:"2030-10-07",employeeId:"employee-1"}, {query:vi.fn(),transaction});
  const cancellation = transaction.mock.calls[0][0].find(statement => statement.text.includes("UPDATE notifications"))!;
  expect(cancellation.values).toEqual(["2030-10-07", "employee-1"]);
  expect(cancellation.text).toMatch(/source_id\s*=\s*\$1::text\b/);
  expect(cancellation.text).toMatch(/a\.week_start\s*=\s*\$1::date\b/);
  expect(cancellation.text).toMatch(/FROM schedule_publication_revisions WHERE week_start\s*=\s*\$1::date\b/);
});
