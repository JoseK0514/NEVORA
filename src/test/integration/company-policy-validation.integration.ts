vi.mock("server-only", () => ({}));
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createDisposableFoundationDatabase } from "./local-postgres";
import type { SessionMutationProof } from "../../lib/shift-changes/types";
import { saveCompanyPolicy, readCompanyPolicies, attendancePolicyProjection } from "../../lib/business-improvements/company-policies/service";
import { readAttendancePolicies } from "../../lib/business-improvements/attendance-policy/service";
let db: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const owner = { employee: { id: "owner", role: "OWNER" }, sessionTokenHash: "a".repeat(64) } as SessionMutationProof;
const rule = { thresholdMinutes: 7, comparison: "GT", effectiveFrom: "2030-10-01T00:00:00Z" };
beforeEach(async () => {
  db = await createDisposableFoundationDatabase({ mode: "current-runtime" });
  await db.executor.query({ text: "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner','Fictional','Owner','5550000001','OWNER','loc-1'),('manager','Fictional','Manager','5550000002','MANAGER','loc-1'); INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('a',64),'owner',clock_timestamp()+interval '1 day'),(repeat('b',64),'manager',clock_timestamp()+interval '1 day');", values: [] });
});
afterEach(async () => { await db?.dispose(); });
const revisions = () => db.executor.query<{ operation_id: string; revision: number; previous_settings: unknown; settings: unknown; command_hash: string }>({ text: "SELECT operation_id,revision,previous_settings,settings,command_hash FROM nevora_company_policy_revisions ORDER BY revision", values: [] });
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
