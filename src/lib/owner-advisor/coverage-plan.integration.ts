import { afterEach, beforeEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { companyAccessFixture } from "@/test/integration/company-access-fixture";
import { fictionalProfile } from "@/test/fixtures/shift-changes";
import type { SqlExecutor } from "@/lib/notifications/types";
import { advisorService } from "./service.server";
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
beforeEach(async () => { f = await companyAccessFixture(); });
afterEach(async () => { await f?.db.dispose(); });
const signal = () => new AbortController().signal;
const command = () => ({ op: "inspect", requestId: randomUUID(), tool: { name: "coverage_plan", args: { date: "2026-10-22" } } });
const env = { NEVORA_OWNER_ADVISOR_ENABLED: "true" };
async function seed() {
  await f.q(`UPDATE location_staffing_settings SET minimum_staff_per_shift=1,requires_designated_lead=false;
    INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('joint-worker','Joint','QA','555009','EMPLOYEE','loc-1');
    INSERT INTO positions(id,workspace_id,name) VALUES('joint-barista','workspace-fuel','Barista');
    INSERT INTO employee_positions(employee_id,position_id) VALUES('target','joint-barista');
    INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('target','loc-1'),('target','loc-2'),('joint-worker','loc-1');
    INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('joint-one','loc-1',4,'08:00','12:00'),('joint-two','loc-2',4,'08:00','12:00');
    INSERT INTO coverage_window_position_requirements(coverage_window_id,position_id,quantity) VALUES('joint-two','joint-barista',1);
    INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('joint-av-one','target',4,'08:00','12:00'),('joint-av-two','joint-worker',4,'08:00','12:00');
    INSERT INTO weekly_availability_submissions(employee_id,week_start,uses_normal_availability) VALUES('target','2026-10-19',true),('joint-worker','2026-10-19',true);`);
  await f.q("INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours,operational_rule_profile) VALUES('target',40,$1::jsonb),('joint-worker',40,$1::jsonb)", [JSON.stringify(fictionalProfile())]);
}
async function inspect(proof = f.owner, executor = f.db.executor) {
  const result = await advisorService(proof, executor, env, signal(), command());
  if (result.state !== "answered") throw Error("Expected an answer");
  expect(result.answer.coveragePlans).toBeDefined();
  return result.answer.coveragePlans!;
}

it("reads a joint cross-location solution with no provider or business/request writes", async () => {
  await seed(); const result = await inspect();
  expect(result.state).toBe("ready");
  expect(result.alternatives[0]).toMatchObject({ status: "COMPLETE", addedMinutes: 480, remaining: { total: 0 } });
  expect(result.alternatives[0].assignments.map(a => [a.employeeName, a.locationName, a.positionName]).sort())
    .toEqual([["Joint QA", "FUEL - 2", null], ["Target QA", "FUEL - 110", "Barista"]]);
  expect(await f.q("SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM schedules) schedules,(SELECT count(*)::int FROM notifications) notifications,(SELECT count(*)::int FROM owner_advisor_requests) requests"))
    .toEqual([{ shifts: 0, schedules: 0, notifications: 0, requests: 0 }]);
});

it("retains exact provenance while a fresh investigation sees changed qualification/availability", async () => {
  await seed(); const first = await inspect();
  const retained = JSON.stringify(first);
  await f.q("DELETE FROM employee_positions WHERE employee_id='target'");
  const second = await inspect();
  expect(second.sourceVersion).not.toBe(first.sourceVersion);
  expect(second.alternatives[0].status).not.toBe("COMPLETE");
  expect(second.alternatives[0].remaining.total).toBeGreaterThan(0);
  expect(JSON.stringify(first)).toBe(retained);
});

it("reviews published additions and reports archived locations without mutating publication or consent", async () => {
  await seed();
  await f.q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('joint-published','loc-1','2026-10-19','PUBLISHED','owner'),('joint-archived','loc-2','2026-10-19','ARCHIVED','owner')");
  const result = await inspect();
  expect(result.partial).toBe(true);
  expect(result.locations.find(l => l.name === "FUEL - 110")?.state).toBe("ARCHIVED");
  expect(result.alternatives[0]).toMatchObject({ status: "COMPLETE", publishedTargets: 1 });
  expect(result.alternatives[0].assignments.every(a => a.publication === "PUBLISHED")).toBe(true);
  expect(await f.q("SELECT count(*)::int n FROM shifts")).toEqual([{ n: 0 }]);
  expect(await f.q("SELECT count(*)::int n FROM schedule_publication_revisions")).toEqual([{ n: 0 }]);
});

it("denies Manager, a forged Employee and revoked Owner authority", async () => {
  await seed();
  await expect(inspect(f.manager)).rejects.toThrow();
  await expect(inspect({ ...f.owner, employee: { ...f.owner.employee, id: "target", role: "EMPLOYEE" } })).rejects.toThrow();
  await f.q("DELETE FROM employee_sessions WHERE employee_id='owner'");
  await expect(inspect()).rejects.toThrow();
});

it("rechecks live authority after source capture and refuses to return a revoked private plan", async () => {
  await seed(); let revoked = false;
  const executor: SqlExecutor = { ...f.db.executor, async transaction(statements, abort) {
    const result = await f.db.executor.transaction(statements, abort);
    if (!revoked && statements.some(s => s.text.includes("AS source"))) {
      revoked = true; await f.q("DELETE FROM employee_sessions WHERE employee_id='owner'");
    }
    return result;
  } };
  await expect(inspect(f.owner, executor)).rejects.toThrow();
  expect(revoked).toBe(true);
});

it("reports excessive company source as unavailable rather than solving a truncated population", async () => {
  await seed();
  await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) SELECT 'joint-bulk-'||n,'Bulk','Fictional','bulk-'||n,'EMPLOYEE','loc-1' FROM generate_series(1,81)n");
  expect(await inspect()).toMatchObject({ state: "unavailable", reason: "INPUT_LIMIT", baseline: null, alternatives: [], partial: true });
});

it("retains historical joint evidence on exact paid-question replay without another model call", async () => {
  await seed();
  const configured = { ...env, NEVORA_OWNER_ADVISOR_PROVIDER: "openai", NEVORA_OWNER_ADVISOR_DATA_APPROVED: "true", NEVORA_OWNER_ADVISOR_MODEL: "fixture-model", NEVORA_OWNER_ADVISOR_DAILY_LIMIT: "3", OPENAI_API_KEY: "fictional" };
  let calls = 0;
  const transport = async () => Response.json({ output: ++calls === 1
    ? [{ type: "function_call", name: "coverage_plan", arguments: '{"date":"2026-10-22"}', call_id: "joint" }]
    : [{ type: "message", content: [{ type: "output_text", text: "Review the jointly checked day plans; no change has been saved." }] }] });
  const ask = { op: "ask", requestId: randomUUID(), message: "Compare whole day plans for October 22" };
  const first = await advisorService(f.owner, f.db.executor, configured, signal(), ask, transport);
  expect(first).toMatchObject({ state: "answered", answer: { coveragePlans: { state: "ready" } } });
  await f.q("DELETE FROM employee_positions WHERE employee_id='target'");
  const replay = await advisorService(f.owner, f.db.executor, configured, signal(), ask, transport);
  if (first.state !== "answered" || replay.state !== "answered") throw Error("Expected answer replay");
  expect(replay.answer).toEqual(first.answer);
  expect(calls).toBe(2);
  expect(await f.q("SELECT count(*)::int n FROM owner_advisor_requests WHERE kind='ask'")).toEqual([{ n: 1 }]);
});
