vi.mock("server-only", () => ({}));
import {readFile} from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createDisposableFoundationDatabase } from "./local-postgres";
import type { SessionMutationProof } from "../../lib/shift-changes/types";
import type { SqlExecutor } from "../../lib/notifications/types";
import type { CompanyPolicySettings, OvertimeRiskRule } from "../../lib/business-improvements/company-policies/model";
import { saveCompanyPolicy } from "../../lib/business-improvements/company-policies/service";
import { readAttendancePolicies } from "../../lib/business-improvements/attendance-policy/service";

let db: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
let overtime: OvertimeRiskRule;
const owner = { employee: { id: "owner", role: "OWNER" }, sessionTokenHash: "a".repeat(64) } as SessionMutationProof;
const manager = { employee: { id: "manager", role: "MANAGER" }, sessionTokenHash: "b".repeat(64) } as SessionMutationProof;
const effectiveFrom = "2020-01-01T00:00:00Z";
const privateLabor = (locationId: string | null) => ({
  rates: [{ id: "private-rate", employeeId: "worker", locationId, rate: "12.125", currency: "USD", rateUnit: "HOUR" as const, validFrom: effectiveFrom, validUntil: null }],
  budgets: [{ id: "private-budget", locationId, startAt: effectiveFrom, endAt: "2040-01-01T00:00:00Z", amount: "9876.543", currency: "USD" }],
  compensation: { effectiveFrom, ruleReference: "private-compensation", breakTreatment: "INCLUDE_ALL_RECORDED_BREAKS" as const, excludedBreakTypeIds: [] },
  calculationMethod: { id: "private-method", revision: 3 },
});

beforeEach(async () => {
  db = await createDisposableFoundationDatabase({ mode: "current-runtime" });
  await db.executor.query({
    text: `INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES
      ('owner','Fictional','Owner','5550000001','OWNER','loc-1'),
      ('manager','Fictional','Manager','5550000002','MANAGER','loc-1'),
      ('worker','Fictional','Worker','5550000003','EMPLOYEE','loc-1');
      INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES
      (repeat('a',64),'owner',clock_timestamp()+interval '1 day'),
      (repeat('b',64),'manager',clock_timestamp()+interval '1 day'),
      (repeat('e',64),'worker',clock_timestamp()+interval '1 day');
      INSERT INTO clocker_devices(id,location_id,name) VALUES('inheritance-device','loc-1','Fictional inheritance device');`, values: [],
  });
  // Both fictional Owner and legacy Company Manager exist before adoption.
  for(const file of ['0031_native_payroll.sql','0032_company_access_invitations.sql'])await db.executor.query({text:await readFile('db/migrations/'+file,'utf8'),values:[]});
  const [timing] = await db.executor.query<{ weekStartsOn: number }>({
    // The fictional week starts tomorrow, so its current interval began six
    // days ago. The two-hour entry fits regardless of the wall-clock weekday.
    text: `SELECT ((extract(dow FROM clock_timestamp() AT TIME ZONE time_zone)::integer+1)%7) AS "weekStartsOn" FROM workspaces`, values: [],
  });
  overtime = { thresholdMinutes: 60, comparison: "GT", effectiveFrom, basis: "EFFECTIVE_ELAPSED_INCLUDING_BREAKS", window: "BUSINESS_WEEK", aggregation: "LOCATION", dayBoundaryTime: "00:00", weekStartsOn: timing.weekStartsOn };
  await db.executor.query({
    text: `WITH observed AS MATERIALIZED(SELECT clock_timestamp() AS at)
      INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status)
      SELECT 'inheritance-entry','worker','loc-1','inheritance-device',at-interval '3 hours',at-interval '1 hour','CLOCKED_OUT' FROM observed`, values: [],
  });
});
afterEach(async () => { await db?.dispose(); });
const revisions = () => db.executor.query({ text: "SELECT * FROM nevora_company_policy_revisions ORDER BY location_id NULLS FIRST,revision", values: [] });
const observations = () => db.executor.query({ text: "SELECT id,payload FROM attendance_policy_observations ORDER BY id", values: [] });
const save = (locationId: string | null, settings: CompanyPolicySettings, expectedRevision = 0) => saveCompanyPolicy(owner, { operationId: randomUUID(), locationId, expectedRevision, settings }, db.executor);
async function companyRule() {
  await save(null, { version: 1, labor: { ...privateLabor(null), overtimeRisk: overtime } });
}
function captureProjection() {
  const settings: Record<string, unknown>[] = [];
  const executor: SqlExecutor = {
    query: db.executor.query,
    transaction: async (statements, signal) => {
      const rows = await db.executor.transaction(statements, signal);
      for (const row of rows.flat())
        if (row && typeof row === "object" && "settings" in row)
          settings.push((row as { settings: Record<string, unknown> }).settings);
      return rows;
    },
  };
  return { executor, settings };
}
async function readOvertime(proof = manager, executor = db.executor) {
  const result = await readAttendancePolicies(proof, executor);
  expect(result.state).toBe("ready");
  if (result.state !== "ready") throw Error("Expected ready protected attendance read");
  const location = result.locations.find((row) => row.locationId === "loc-1")!;
  const detector = location.detectors.find((row) => row.kind === "overtime_risk")!;
  const [stored] = await db.executor.query<{ payload: unknown }>({ text: "SELECT payload FROM attendance_policy_observations WHERE id=$1::uuid", values: [result.observationId] });
  expect(stored.payload).toMatchObject({ observationId: result.observationId, sourceHash: result.sourceHash, locations: result.locations });
  expect(JSON.stringify(result)).not.toMatch(/private-rate|12\.125|private-budget|9876\.543|private-compensation|private-method/);
  return { result, location, detector };
}

// The regression catches SQL manufacturing an explicit null for an absent
// overtime key. Expectations are literal detector outcomes from two hours of work.
it.each(["omitted labor", "empty labor", "private labor only"])("actual SQL attendance inherits company overtime for location %s", async (scenario) => {
  await companyRule();
  const settings: CompanyPolicySettings = { version: 1, attendance: { lateness: null } };
  if (scenario === "empty labor") settings.labor = {};
  if (scenario === "private labor only") settings.labor = privateLabor("loc-1");
  await save("loc-1", settings);
  const before = await revisions(), capture = captureProjection();
  const { location, detector } = await readOvertime(manager, capture.executor);
  expect(location).toMatchObject({ companyRevision: 1, locationRevision: 1 });
  expect(detector).toMatchObject({ state: "evaluated", reason: null, policy: { thresholdNanoseconds: "3600000000000", comparison: "GT" }, observations: [{ employeeId: "worker", locationId: "loc-1", valueNanoseconds: "7200000000000" }] });
  expect(capture.settings).toHaveLength(2);
  expect(capture.settings[1].labor).toEqual({});
  expect(JSON.stringify(capture.settings)).not.toMatch(/private-rate|12\.125|private-budget|9876\.543|private-compensation|private-method/);
  expect(await revisions()).toEqual(before);
});
it("actual SQL explicit location overtime null disables company inheritance", async () => {
  await companyRule();
  await save("loc-1", { version: 1, labor: { ...privateLabor("loc-1"), overtimeRisk: null } });
  const before = await revisions(), capture = captureProjection();
  const { detector } = await readOvertime(manager, capture.executor);
  expect(detector).toMatchObject({ state: "unverifiable", reason: "policy_not_selected", policy: null, observations: [] });
  expect(capture.settings[1].labor).toEqual({ overtimeRisk: null });
  expect(await revisions()).toEqual(before);
});
it("actual SQL provided location overtime overrides the company threshold", async () => {
  await companyRule();
  await save("loc-1", { version: 1, labor: { ...privateLabor("loc-1"), overtimeRisk: { ...overtime, thresholdMinutes: 180 } } });
  const before = await revisions();
  const { detector } = await readOvertime();
  expect(detector).toMatchObject({ state: "evaluated", reason: null, policy: { thresholdNanoseconds: "10800000000000" }, observations: [] });
  expect(await revisions()).toEqual(before);
});
it("actual SQL company overtime is evaluated without a location revision", async () => {
  await companyRule();
  const { location, detector } = await readOvertime(owner);
  expect(location).toMatchObject({ companyRevision: 1, locationRevision: 0 });
  expect(detector).toMatchObject({ state: "evaluated", observations: [{ valueNanoseconds: "7200000000000" }] });
});
it.each([null, "loc-1"])("actual SQL latest malformed overtime stays unavailable in scope %s", async (locationId) => {
  await companyRule();
  if (locationId !== null) await save(locationId, { version: 1 });
  await db.executor.query({ text: `INSERT INTO nevora_company_policy_revisions(operation_id,workspace_id,location_id,revision,actor_employee_id,command_hash,previous_settings,settings,changed_keys)
    VALUES($1::uuid,'workspace-fuel',$2,2,'owner',repeat('c',64),'{"version":1}',$3::jsonb,'[]')`, values: [randomUUID(), locationId, JSON.stringify({ version: 1, labor: { overtimeRisk: { ...overtime, comparison: ["GT"] } } })] });
  const before = await revisions(), observedBefore = await observations();
  expect(await readAttendancePolicies(manager, db.executor)).toEqual({ state: "unavailable", reason: "source_changed_or_unavailable" });
  expect(await observations()).toEqual(observedBefore);
  expect(await revisions()).toEqual(before);
});
it.each(["policy", "source", "revocation"])("protected SQL reread holds overtime observation after %s changes", async (drift) => {
  await companyRule();
  await save("loc-1", { version: 1 });
  const observedBefore = await observations();
  let changed = false;
  const executor: SqlExecutor = {
    query: db.executor.query,
    transaction: async (statements, signal) => {
      const rows = await db.executor.transaction(statements, signal);
      if (!changed && rows.flat().some((row) => row && typeof row === "object" && "settings" in row)) {
        changed = true;
        if (drift === "policy") await save("loc-1", { version: 1, labor: { overtimeRisk: null } }, 1);
        if (drift === "source") await db.executor.query({ text: "UPDATE time_entries SET version=version+1 WHERE id='inheritance-entry'", values: [] });
        if (drift === "revocation") await db.executor.query({ text: "DELETE FROM employee_sessions WHERE token_hash=repeat('b',64)", values: [] });
      }
      return rows;
    },
  };
  expect(await readAttendancePolicies(manager, executor)).toEqual({ state: "unavailable", reason: drift === "revocation" ? "access_denied" : "source_changed_or_unavailable" });
  expect(changed).toBe(true);
  expect(await observations()).toEqual(observedBefore);
  if (drift === "policy") {
    const { detector } = await readOvertime();
    expect(detector).toMatchObject({ state: "unverifiable", reason: "policy_not_selected" });
  }
});
it.each(["employee", "revoked", "expired", "role changed", "inactive"])("actual SQL denies attendance evaluation for current %s authority", async (scenario) => {
  await companyRule();
  await save("loc-1", { version: 1 });
  let proof = manager;
  if (scenario === "employee") proof = { ...manager, employee: { ...manager.employee, id: "worker", role: "MANAGER" }, sessionTokenHash: "e".repeat(64) };
  if (scenario === "revoked") await db.executor.query({ text: "DELETE FROM employee_sessions WHERE token_hash=repeat('b',64)", values: [] });
  if (scenario === "expired") await db.executor.query({ text: "UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=repeat('b',64)", values: [] });
  if (scenario === "role changed") await db.executor.query({ text: "UPDATE employees SET role='EMPLOYEE' WHERE id='manager'", values: [] });
  if (scenario === "inactive") await db.executor.query({ text: "UPDATE employees SET active=false WHERE id='manager'", values: [] });
  const before = await revisions(), observedBefore = await observations();
  expect(await readAttendancePolicies(proof, db.executor)).toEqual({ state: "unavailable", reason: "access_denied" });
  expect(await observations()).toEqual(observedBefore);
  expect(await revisions()).toEqual(before);
});

it("actual SQL preserves the retained 2400-minute Company/business-week review rule with no location overtime override", async () => {
  // Literal NQAR-001 oracle: review configuration only, not wage entitlement.
  const retainedRule: OvertimeRiskRule = {
    thresholdMinutes: 2400, comparison: "GT", effectiveFrom: "2026-01-01T00:00:00Z",
    basis: "RECORDED_ELAPSED_INCLUDING_BREAKS", window: "BUSINESS_WEEK",
    aggregation: "COMPANY", dayBoundaryTime: "04:15", weekStartsOn: 1,
  };
  await save(null, { version: 1, labor: { ...privateLabor(null), overtimeRisk: retainedRule } });
  await save("loc-1", { version: 1, attendance: { earlyDeparture: null }, labor: { rates: [] } });
  const before = await revisions(), capture = captureProjection();
  const { detector } = await readOvertime(manager, capture.executor);
  expect(detector).toMatchObject({ state: "evaluated", reason: null, policy: { thresholdNanoseconds: "144000000000000", comparison: "GT", approvalReference: "owner-settings:1:1" }, observations: [] });
  expect(capture.settings[0].labor).toEqual({ overtimeRisk: retainedRule });
  expect(capture.settings[1].labor).toEqual({});
  expect(await revisions()).toEqual(before);
});
