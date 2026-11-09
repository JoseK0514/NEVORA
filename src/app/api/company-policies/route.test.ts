import { beforeEach, expect, it, vi } from "vitest";
import type { SqlStatement } from "@/lib/notifications/types";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ session: vi.fn(), proof: vi.fn(), query: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSession: mocks.session, requireSessionMutationProof: mocks.proof }));
// Only DB transport and server session are replaced. Route, parsers, workspace
// validation, current-role guard construction and save service remain real.
vi.mock("@/lib/data/notification-transactions", () => ({ neonNotificationExecutor: () => ({ query: mocks.query, transaction: mocks.transaction }) }));
import { GET, POST } from "./route";
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

const readRequest = (headers: Record<string, string> = { "x-nevora-company-policies": "1" }, suffix = "") => new Request("https://nevora.invalid/api/company-policies" + suffix, { headers });
const savedRow = { operationId: command.operationId, revision: 2, locationId: null, changedKeys: ["attendance.longEntry"], changedAt: rule.effectiveFrom, settings: { version: 1, attendance: { longEntry: { ...rule, basis: ["RECORDED_ELAPSED"], appliesTo: "BOTH" } } } };
it("GET exposes private typed Owner recovery history without trusting malformed settings", async () => {
  mocks.transaction.mockImplementation(async (statements: SqlStatement[]) => statements.map((s) => s.text.includes("FROM nevora_company_policy_revisions") ? [savedRow] : []));
  const response = await GET(readRequest());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store, private");
  expect(response.headers.get("vary")).toBe("Cookie");
  const body = await response.json();
  expect(body).toMatchObject({ state: "ready", history: { revisions: [{ state: "unavailable", reason: "invalid_settings", revision: 2 }], scopes: [{ locationId: null, expectedRevision: 2, state: "unavailable" }] } });
  expect(body.history.revisions[0]).not.toHaveProperty("settings");
  expect(JSON.stringify(body)).not.toContain("RECORDED_ELAPSED");
});
it.each(["MANAGER", "EMPLOYEE", "LEAD"])("GET denies %s before private policy history reads", async (role) => {
  mocks.session.mockResolvedValue({ ...owner, role });
  const response = await GET(readRequest());
  expect(response.status).toBe(403);
  expect(response.headers.get("cache-control")).toBe("no-store, private");
  expect(await response.json()).toEqual({ state: "unavailable" });
  expect(mocks.transaction).not.toHaveBeenCalled();
});
it("GET denies absent/currently invalid Owner authority and hides transport diagnostics", async () => {
  mocks.session.mockResolvedValueOnce(null);
  const absent = await GET(readRequest());
  expect(absent.status).toBe(401);
  expect(await absent.json()).toEqual({ state: "unavailable" });
  mocks.transaction.mockRejectedValueOnce(new Error("private SQL role/session diagnostic"));
  const failed = await GET(readRequest());
  expect(failed.status).toBe(503);
  expect(failed.headers.get("cache-control")).toBe("no-store, private");
  expect(await failed.json()).toEqual({ state: "unavailable" });
});
it("GET rejects missing/suspicious boundary headers and query parameters before reading history", async () => {
  expect((await GET(readRequest({}))).status).toBe(403);
  expect((await GET(readRequest({ "x-nevora-company-policies": "1", "sec-fetch-site": "cross-site" }))).status).toBe(403);
  expect((await GET(readRequest({ "x-nevora-company-policies": "1" }, "?scope=private"))).status).toBe(400);
  expect(mocks.query).not.toHaveBeenCalled();
  expect(mocks.transaction).not.toHaveBeenCalled();
});
