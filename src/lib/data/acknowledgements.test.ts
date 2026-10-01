import { expect, it, vi } from "vitest";
import { getAcknowledgementSummary, listUnacknowledgedEmployeeIds } from "./acknowledgements";
vi.mock("./publication-revisions", () => ({ getLatestPublicationRevision: vi.fn(async () => ({ id: "revision-1" })), listRevisionShifts: vi.fn(async () => [{ employeeId: "employee-1" }, { employeeId: "owner-1" }]) }));
vi.mock("../db", async importOriginal => ({ ...await importOriginal<typeof import("../db")>(), getDb: () => ({ query: async (sql: string) => sql.includes("FROM employees") ? [{ id: "employee-1" }] : [] }) }));
it("requires acknowledgement only from scheduled self-service roles", async () => {
  expect(await getAcknowledgementSummary("2030-10-07")).toEqual({ scheduledEmployees: 1, acknowledgedEmployees: 0 });
  expect(await listUnacknowledgedEmployeeIds("2030-10-07")).toEqual(["employee-1"]);
});
