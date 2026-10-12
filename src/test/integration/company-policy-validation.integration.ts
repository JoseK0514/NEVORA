vi.mock("server-only", () => ({}));
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createDisposableFoundationDatabase } from "./local-postgres";
import type { SessionMutationProof } from "../../lib/shift-changes/types";
import { saveCompanyPolicy, readCompanyPolicies, readCompanyPolicyHistory, attendancePolicyProjection } from "../../lib/business-improvements/company-policies/service";
import { readAttendancePolicies } from "../../lib/business-improvements/attendance-policy/service";
let db: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const owner = { employee: { id: "owner", role: "OWNER" }, sessionTokenHash: "a".repeat(64) } as SessionMutationProof;
const rule = { thresholdMinutes: 7, comparison: "GT", effectiveFrom: "2030-10-01T00:00:00Z" };
beforeEach(async () => {
  db = await createDisposableFoundationDatabase({ mode: "current-runtime" });
  await db.executor.query({ text: "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner','Fictional','Owner','5550000001','OWNER','loc-1'),('manager','Fictional','Manager','5550000002','MANAGER','loc-1'); INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('a',64),'owner',clock_timestamp()+interval '1 day'),(repeat('b',64),'manager',clock_timestamp()+interval '1 day');", values: [] });
});
afterEach(async () => { await db?.dispose(); });
const revisions = () => db.executor.query<{ operation_id: string; revision: number; previous_settings: unknown; settings: unknown; command_hash: string }>({ text: "SELECT operation_id,revision,previous_settings,settings,command_hash FROM nevora_company_policy_revisions ORDER BY revision,operation_id", values: [] });
const observations = () => db.executor.query({ text: "SELECT id,payload FROM attendance_policy_observations ORDER BY id", values: [] });
it("valid Owner scalar saves replay the original immutable revision and Manager cannot forge Owner authority", async () => {
  const command = { operationId: randomUUID(), expectedRevision: 0, locationId: null, settings: { version: 1, attendance: { lateness: rule } } };
  const saved = await saveCompanyPolicy(owner, command, db.executor);
  expect(saved.revision).toBe(1);
  const before = await revisions();
  expect(await saveCompanyPolicy(owner, command, db.executor)).toEqual(saved);
  const forged = { ...owner, employee: { ...owner.employee, id: "manager" }, sessionTokenHash: "b".repeat(64) };
  await expect(saveCompanyPolicy(forged, { ...command, operationId: randomUUID(), expectedRevision: 1 }, db.executor)).rejects.toThrow(/management_authorization/);
  await expect(saveCompanyPolicy({ ...owner, sessionTokenHash: "f".repeat(64) }, command, db.executor)).rejects.toThrow(/management_authorization/);
  await expect(readCompanyPolicies(forged, db.executor)).rejects.toThrow(/management_authorization/);
  await expect(db.executor.query({ text: "UPDATE nevora_company_policy_revisions SET settings='{\"version\":1}'", values: [] })).rejects.toThrow(/immutable/);
  await expect(db.executor.query({ text: "DELETE FROM nevora_company_policy_revisions", values: [] })).rejects.toThrow(/immutable|append_only/);
  expect(await revisions()).toEqual(before);
});
it.each([
  ["comparison", { attendance: { lateness: { ...rule, comparison: ["GT"] } } }],
  ["long-entry basis", { attendance: { longEntry: { ...rule, basis: ["RECORDED_ELAPSED"], appliesTo: "BOTH" } } }],
  ["rateUnit", { labor: { rates: [{ id: "rate-1", employeeId: "owner", locationId: null, rate: "12.125", currency: "USD", rateUnit: ["HOUR"], validFrom: rule.effectiveFrom, validUntil: null }] } }],
])("malformed Owner %s fails service validation without persisting history", async (_label, settings) => {
  const before = await revisions();
  await expect(saveCompanyPolicy(owner, { operationId: randomUUID(), expectedRevision: before.at(-1)?.revision ?? 0, locationId: null, settings: { version: 1, ...settings } }, db.executor)).rejects.toThrow();
  expect(await revisions()).toEqual(before);
});
async function seedMalformedHistory() {
  await saveCompanyPolicy(owner, { operationId: randomUUID(), expectedRevision: 0, locationId: null, settings: { version: 1, attendance: { lateness: rule } } }, db.executor);
  // Simulate a legacy malformed revision only in this test's fresh owned DB.
  const settings = { version: 1, attendance: { longEntry: { ...rule, basis: ["RECORDED_ELAPSED"], appliesTo: "BOTH" } } };
  await db.executor.query({ text: "INSERT INTO nevora_company_policy_revisions(operation_id,workspace_id,location_id,revision,actor_employee_id,command_hash,previous_settings,settings,changed_keys) VALUES($1,'workspace-fuel',NULL,2,'owner',repeat('c',64),$2::jsonb,$3::jsonb,'[]')", values: [randomUUID(), JSON.stringify({ version: 1, attendance: { lateness: rule } }), JSON.stringify(settings)] });
}
it("malformed saved revisions fail Owner read without rewriting history", async () => {
  await seedMalformedHistory();
  const before = await revisions();
  await expect(readCompanyPolicies(owner, db.executor)).rejects.toThrow();
  expect(await revisions()).toEqual(before);
});
it("malformed saved policy cannot publish a silent attendance evaluation", async () => {
  await seedMalformedHistory();
  const before = await revisions(), observedBefore = await observations();
  expect(await readAttendancePolicies(owner, db.executor)).toEqual({ state: "unavailable", reason: "source_changed_or_unavailable" });
  expect(await observations()).toEqual(observedBefore);
  expect(await revisions()).toEqual(before);
});
it("attendance projection keeps valid location inheritance and omits private finance history", () => {
  const rows = [{ operationId: randomUUID(), locationId: null, revision: 1, changedAt: rule.effectiveFrom, changedKeys: [], settings: { version: 1 as const, attendance: { lateness: { ...rule, comparison: "GT" as const } }, labor: { rates: [{ id: "private-rate", employeeId: "owner", locationId: null, rate: "12.125", currency: "USD", rateUnit: "HOUR" as const, validFrom: rule.effectiveFrom, validUntil: null }] } } }];
  const projection = attendancePolicyProjection(rows, "loc-1");
  expect(projection.effective.attendance.lateness).toEqual(rule);
  expect(projection.effective.labor.rates).toBeNull();
  expect(JSON.stringify(projection)).not.toMatch(/private-rate|12\.125/);
});

it.each([false, true])("Owner recovery history selects the actual latest revision with replacement=%s", async (replacement) => {
  await seedMalformedHistory();
  const malformed = await revisions();
  const immutableEvidence = await db.executor.query({ text: "SELECT * FROM nevora_company_policy_revisions ORDER BY revision,operation_id", values: [] });
  await expect(readCompanyPolicies(owner, db.executor)).rejects.toThrow("Invalid entry basis");
  const observedBefore = await observations();
  expect(await readAttendancePolicies(owner, db.executor)).toMatchObject({ state: "unavailable" });
  expect(await observations()).toEqual(observedBefore);
  if (replacement) {
    const command = { operationId: randomUUID(), expectedRevision: 2, locationId: null, settings: { version: 1, attendance: { lateness: { ...rule, comparison: "GTE" } } } };
    const saved = await saveCompanyPolicy(owner, command, db.executor);
    expect(saved.revision).toBe(3);
    expect(await saveCompanyPolicy(owner, command, db.executor)).toEqual(saved);
    await expect(saveCompanyPolicy(owner, { ...command, operationId: randomUUID(), expectedRevision: 2 }, db.executor)).rejects.toThrow(/conflict/);
    await expect(saveCompanyPolicy(owner, { ...command, settings: { version: 1 } }, db.executor)).rejects.toThrow(/conflict/);
    await expect(readCompanyPolicies(owner, db.executor)).rejects.toThrow("Invalid entry basis");
    expect(await readAttendancePolicies(owner, db.executor)).toMatchObject({ state: "ready" });
  }
  const before = await revisions();
  const history = await readCompanyPolicyHistory(owner, db.executor);
  const scope = history.scopes.find((s) => s.locationId === null)!;
  expect(scope.expectedRevision).toBe(replacement ? 3 : 2);
  expect(scope.state).toBe(replacement ? "valid" : "unavailable");
  expect(scope.selected?.revision).toBe(replacement ? 3 : 2);
  const invalid = history.revisions.find((r) => r.revision === 2)!;
  expect(invalid).toMatchObject({ state: "unavailable", reason: "invalid_settings", revision: 2 });
  expect(invalid).not.toHaveProperty("settings");
  expect(JSON.stringify(history)).not.toContain('"basis":["RECORDED_ELAPSED"]');
  expect(history.revisions.find((r) => r.revision === 1)).toMatchObject({ state: "valid", settings: { version: 1, attendance: { lateness: rule } } });
  expect(await revisions()).toEqual(before);
  expect(before.slice(0, 2)).toEqual(malformed);
  expect(await db.executor.query({ text: "SELECT * FROM nevora_company_policy_revisions WHERE revision<=2 ORDER BY revision,operation_id", values: [] })).toEqual(immutableEvidence);
  await expect(db.executor.query({ text: "UPDATE nevora_company_policy_revisions SET settings='{\"version\":1}'", values: [] })).rejects.toThrow(/immutable/);
  await expect(db.executor.query({ text: "DELETE FROM nevora_company_policy_revisions", values: [] })).rejects.toThrow(/immutable/);
  expect(await revisions()).toEqual(before);
});
it.each(["manager", "employee", "revoked", "expired", "role-changed", "inactive"])('recovery reads and corrections deny current authority loss: %s', async (scenario) => {
  await seedMalformedHistory();
  const before = await revisions();
  let proof = owner;
  if (scenario === "manager") proof = { ...owner, employee: { ...owner.employee, id: "manager" }, sessionTokenHash: "b".repeat(64) };
  if (scenario === "employee") {
    await db.executor.query({ text: "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('employee','Fictional','Employee','5550000003','EMPLOYEE','loc-1'); INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('e',64),'employee',clock_timestamp()+interval '1 day')", values: [] });
    proof = { ...owner, employee: { ...owner.employee, id: "employee" }, sessionTokenHash: "e".repeat(64) };
  }
  if (scenario === "revoked") await db.executor.query({ text: "DELETE FROM employee_sessions WHERE token_hash=repeat('a',64)", values: [] });
  if (scenario === "expired") await db.executor.query({ text: "UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=repeat('a',64)", values: [] });
  if (scenario === "role-changed") await db.executor.query({ text: "UPDATE employees SET role='MANAGER' WHERE id='owner'", values: [] });
  if (scenario === "inactive") await db.executor.query({ text: "UPDATE employees SET active=false WHERE id='owner'", values: [] });
  await expect(readCompanyPolicyHistory(proof, db.executor)).rejects.toThrow(/management_authorization/);
  await expect(saveCompanyPolicy(proof, { operationId: randomUUID(), expectedRevision: 2, locationId: null, settings: { version: 1, attendance: { lateness: rule } } }, db.executor)).rejects.toThrow(/management_authorization/);
  expect(await revisions()).toEqual(before);
});
it("empty Owner recovery history is explicitly unconfigured at expected revision zero", async () => {
  const before = await revisions();
  expect(await readCompanyPolicyHistory(owner, db.executor)).toEqual({ revisions: [], scopes: [{ locationId: null, expectedRevision: 0, state: "not_configured", selected: null }] });
  expect(await revisions()).toEqual(before);
});

it("location correction uses its own latest revision, preserves inheritance/null and never evaluates an invalid override", async () => {
  const settings = { version: 1, attendance: { lateness: rule, earlyDeparture: rule } };
  await saveCompanyPolicy(owner, { operationId: randomUUID(), expectedRevision: 0, locationId: null, settings }, db.executor);
  const malformed = { version: 1, attendance: { longEntry: { ...rule, basis: ["RECORDED_ELAPSED"], appliesTo: "BOTH" } } };
  await db.executor.query({ text: "INSERT INTO nevora_company_policy_revisions(operation_id,workspace_id,location_id,revision,actor_employee_id,command_hash,previous_settings,settings,changed_keys) VALUES($1,'workspace-fuel','loc-1',1,'owner',repeat('c',64),'{\"version\":1}',$2::jsonb,'[]')", values: [randomUUID(), JSON.stringify(malformed)] });
  const immutable = await db.executor.query({ text: "SELECT * FROM nevora_company_policy_revisions ORDER BY location_id NULLS FIRST,revision", values: [] });
  const history = await readCompanyPolicyHistory(owner, db.executor);
  expect(history.scopes.map((scope) => [scope.locationId, scope.expectedRevision, scope.state])).toEqual([[null, 1, "valid"], ["loc-1", 1, "unavailable"]]);
  const observedBefore = await observations();
  expect(await readAttendancePolicies(owner, db.executor)).toMatchObject({ state: "unavailable" });
  expect(await observations()).toEqual(observedBefore);
  const command = { operationId: randomUUID(), expectedRevision: 1, locationId: "loc-1", settings: { version: 1, attendance: { lateness: null } } };
  const saved = await saveCompanyPolicy(owner, command, db.executor);
  expect(saved.revision).toBe(2);
  expect(await saveCompanyPolicy(owner, command, db.executor)).toEqual(saved);
  expect((await readCompanyPolicyHistory(owner, db.executor)).scopes[1]).toMatchObject({ expectedRevision: 2, state: "valid", selected: { settings: command.settings } });
  expect(await readAttendancePolicies(owner, db.executor)).toMatchObject({ state: "ready" });
  const projected = attendancePolicyProjection([{ operationId: randomUUID(), locationId: null, revision: 1, changedAt: rule.effectiveFrom, changedKeys: [], settings: { version: 1, attendance: { lateness: { ...rule, comparison: "GT" }, earlyDeparture: { ...rule, comparison: "GT" } } } }, { ...saved, settings: { version: 1, attendance: { lateness: null } } }], "loc-1");
  expect(projected.effective.attendance.lateness).toBeNull();
  expect(projected.effective.attendance.earlyDeparture).toEqual(rule);
  expect(await db.executor.query({ text: "SELECT * FROM nevora_company_policy_revisions WHERE revision=1 ORDER BY location_id NULLS FIRST,revision", values: [] })).toEqual(immutable);
});
