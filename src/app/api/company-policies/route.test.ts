import { beforeEach, expect, it, vi } from "vitest";
import type { SqlStatement } from "@/lib/notifications/types";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ session: vi.fn(), proof: vi.fn(), query: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSession: mocks.session, requireSessionMutationProof: mocks.proof }));
// Only DB transport and server session are replaced. Route, parsers, workspace
// validation, current-role guard construction and save service remain real.
vi.mock("@/lib/data/notification-transactions", () => ({ neonNotificationExecutor: () => ({ query: mocks.query, transaction: mocks.transaction }) }));
import { POST } from "./route";
const owner = { id: "owner", firstName: "Fictional", lastName: "Owner", role: "OWNER", primaryLocationId: "loc-1" };
const rule = { thresholdMinutes: 7, comparison: "GT", effectiveFrom: "2030-10-07T00:00:00Z" };
const command = { operationId: "11111111-1111-4111-8111-111111111111", expectedRevision: 0, locationId: null, settings: { version: 1, attendance: { lateness: rule } } };
const request = (input: unknown) => new Request("https://nevora.invalid/api/company-policies", { method: "POST", headers: { "origin": "https://nevora.invalid", "content-type": "application/json", "x-nevora-company-policies": "1" }, body: JSON.stringify(input) });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("FUEL_PORTAL_ORIGIN", "https://nevora.invalid");
  mocks.session.mockResolvedValue(owner);
  mocks.proof.mockResolvedValue({ employee: owner, sessionTokenHash: "a".repeat(64) });
  mocks.query.mockResolvedValue([{ id: "workspace-fuel", name: "Fictional Company", timeZone: "America/Puerto_Rico", active: true, createdAt: "2030-10-01T00:00:00Z", updatedAt: "2030-10-01T00:00:00Z" }]);
  mocks.transaction.mockImplementation(async (statements: SqlStatement[]) => statements.map((s) => s.text.includes("nevora_set_company_policy") ? [{ result: { operationId: command.operationId, revision: 1, locationId: null, changedKeys: ["attendance.lateness"], changedAt: "2030-10-07T00:00:00Z" } }] : []));
});
it.each([["array", ["GT"]], ["object", {}], ["number", 1], ["boolean", true], ["null", null]])("returns 400 for Owner %s comparison before persistence", async (_label, comparison) => {
  const response = await POST(request({ ...command, settings: { version: 1, attendance: { lateness: { ...rule, comparison } } } }));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ state: "invalid" });
  expect(mocks.query).not.toHaveBeenCalled();
  expect(mocks.transaction).not.toHaveBeenCalled();
});
it.each([
  ["long-entry basis", { attendance: { longEntry: { ...rule, basis: ["RECORDED_ELAPSED"], appliesTo: "BOTH" } } }],
  ["long-entry applicability", { attendance: { longEntry: { ...rule, basis: "RECORDED_ELAPSED", appliesTo: ["OPEN"] } } }],
  ["clock-in cutoff", { attendance: { missingClockIn: { ...rule, association: "CAPTURED_PUBLISHED_SHIFT", cutoff: ["AFTER_SCHEDULE_START"] } } }],
  ["overtime basis", { labor: { overtimeRisk: { ...rule, basis: ["RECORDED_ELAPSED_INCLUDING_BREAKS"], window: "BUSINESS_DAY", aggregation: "COMPANY", dayBoundaryTime: "04:00" } } }],
  ["overtime window", { labor: { overtimeRisk: { ...rule, basis: "RECORDED_ELAPSED_INCLUDING_BREAKS", window: ["BUSINESS_DAY"], aggregation: "COMPANY", dayBoundaryTime: "04:00" } } }],
  ["overtime aggregation", { labor: { overtimeRisk: { ...rule, basis: "RECORDED_ELAPSED_INCLUDING_BREAKS", window: "BUSINESS_DAY", aggregation: ["COMPANY"], dayBoundaryTime: "04:00" } } }],
  ["break treatment", { labor: { compensation: { effectiveFrom: rule.effectiveFrom, ruleReference: "owner-reference", breakTreatment: ["INCLUDE_ALL_RECORDED_BREAKS"], excludedBreakTypeIds: [] } } }],
  ["rate unit", { labor: { rates: [{ id: "rate-1", employeeId: "owner", locationId: null, rate: "12.125", currency: "USD", rateUnit: ["HOUR"], validFrom: rule.effectiveFrom, validUntil: null }] } }],
])("rejects malformed Owner %s before persistence", async (_label, settings) => {
  const response = await POST(request({ ...command, settings: { version: 1, ...settings } }));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ state: "invalid" });
  expect(mocks.query).not.toHaveBeenCalled();
  expect(mocks.transaction).not.toHaveBeenCalled();
});
it.each(["MANAGER", "LEAD", "EMPLOYEE"])("denies %s writes before parsing/persistence", async (role) => {
  mocks.session.mockResolvedValue({ ...owner, role });
  const response = await POST(request(command));
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ state: "unavailable" });
  expect(mocks.transaction).not.toHaveBeenCalled();
});
it("requires a session and returns private saved state for valid scalar Owner input", async () => {
  mocks.session.mockResolvedValueOnce(null);
  expect((await POST(request(command))).status).toBe(401);
  const response = await POST(request(command));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ state: "saved", result: { revision: 1 } });
  expect(response.headers.get("cache-control")).toBe("no-store, private");
  const statements: SqlStatement[] = mocks.transaction.mock.calls[0][0];
  expect(JSON.parse(statements.find((s) => s.text.includes("nevora_set_company_policy"))!.values[5] as string)).toEqual(command.settings);
});
