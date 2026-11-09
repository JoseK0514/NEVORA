import { afterEach, beforeEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { companyAccessFixture } from "@/test/integration/company-access-fixture";
import { fictionalProfile } from "@/test/fixtures/shift-changes";
import type { SqlExecutor } from "@/lib/notifications/types";
import type { CoverageActionResult } from "./coverage-actions";
import { advisorService } from "./service.server";

let f: Awaited<ReturnType<typeof companyAccessFixture>>;
const env = { NEVORA_OWNER_ADVISOR_ENABLED: "true" };
beforeEach(async () => {
  f = await companyAccessFixture();
  await f.q(`UPDATE location_staffing_settings SET minimum_staff_per_shift=1,requires_designated_lead=false;
    INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('draft-worker','Draft','QA','555009','EMPLOYEE','loc-1');
    INSERT INTO positions(id,workspace_id,name) VALUES('draft-barista','workspace-fuel','Barista');
    INSERT INTO employee_positions(employee_id,position_id) VALUES('target','draft-barista');
    INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('target','loc-1'),('target','loc-2'),('draft-worker','loc-1');
    INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('draft-one','loc-1',4,'08:00','12:00'),('draft-two','loc-2',4,'08:00','12:00');
    INSERT INTO coverage_window_position_requirements(coverage_window_id,position_id,quantity) VALUES('draft-two','draft-barista',1);
    INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('draft-av-one','target',4,'08:00','12:00'),('draft-av-two','draft-worker',4,'08:00','12:00');
    INSERT INTO weekly_availability_submissions(employee_id,week_start,uses_normal_availability) VALUES('target','2026-10-19',true),('draft-worker','2026-10-19',true);`);
  await f.q("INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours,operational_rule_profile) VALUES('target',40,$1::jsonb),('draft-worker',40,$1::jsonb)", [JSON.stringify(fictionalProfile())]);
});
afterEach(async () => { await f?.db.dispose(); });
const call = (command: unknown, executor = f.db.executor, proof = f.owner) => advisorService(proof, executor, env, new AbortController().signal, command);
const action = async (command: unknown, executor = f.db.executor, proof = f.owner) => await call(command, executor, proof) as unknown as CoverageActionResult;
async function selection() {
  const result = await call({ op: "inspect", requestId: randomUUID(), tool: { name: "coverage_plan", args: { date: "2026-10-22" } } });
  if (result.state !== "answered" || !result.answer.coveragePlans) throw Error("Expected comparison");
  const p = result.answer.coveragePlans;
  return { op: "prepare_coverage_draft", requestId: randomUUID(), date: p.date, sourceVersion: p.sourceVersion,
    assignments: p.alternatives[0].assignments.map(a => ({ employeeId: a.employeeId, locationId: a.locationId, startTime: a.startTime, endTime: a.endTime, positionId: a.positionId ?? null, isDesignatedLead: a.isDesignatedLead })) };
}
const prepare = async () => action(await selection());
const apply = (reviewId: string, requestId = randomUUID(), executor = f.db.executor) => action({ op: "apply_coverage_draft", requestId, reviewId, acknowledged: true }, executor);
const check = (reviewId: string, executor = f.db.executor) => action({ op: "check_coverage_draft", requestId: randomUUID(), reviewId }, executor);

it("prepares exact canonical labels without saving; atomically saves the selected draft and checks positive current coverage", async () => {
  const review = await prepare();
  expect(review.state).toBe("coverage_review"); expect(review.receipt).toBeNull();
  expect(review.review.assignments).toHaveLength(2);
  expect(review.review.assignments.map(a => a.employeeName).sort()).toEqual(["Draft QA", "Target QA"]);
  expect(await f.q("SELECT count(*)::int n FROM shifts")).toEqual([{ n: 0 }]);
  const saved = await apply(review.review.id);
  expect(saved.state).toBe("coverage_saved"); expect(saved.receipt).toMatchObject({ reviewId: review.review.id, count: 2 });
  expect(await f.q("SELECT status FROM schedules ORDER BY location_id")).toEqual([{ status: "DRAFT" }, { status: "DRAFT" }]);
  expect(await f.q("SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM notifications) notifications,(SELECT count(*)::int FROM schedule_publication_revisions) publications")).toEqual([{ shifts: 2, notifications: 0, publications: 0 }]);
  const current = await check(review.review.id);
  expect(current.progress).toMatchObject({ state: "current", assignmentsPresent: 2, assignmentsTotal: 2, publishedAssignments: 0, coverage: { remainingBlocks: 0 } });
  expect(current.receipt).toEqual(saved.receipt);
});

it("rejects an entire mixed published allocation without saving only the draft subset", async () => {
  await f.q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('published-target','loc-1','2026-10-19','PUBLISHED','owner')");
  await expect(prepare()).rejects.toMatchObject({ code: "conflict" });
  expect(await f.q("SELECT count(*)::int n FROM shifts")).toEqual([{ n: 0 }]);
});
it("requires current source at preparation and does not silently rebuild after changed qualifications", async () => {
  const selected = await selection();
  await f.q("DELETE FROM employee_positions WHERE employee_id='target'");
  await expect(action(selected)).rejects.toMatchObject({ code: "conflict" });
});
it("validates proposed assignments together rather than accepting overlapping individually legal options", async () => {
  const selected = await selection();
  selected.assignments[0].employeeId = "target";
  selected.assignments[1].employeeId = "target";
  await expect(action(selected)).rejects.toMatchObject({ code: "conflict" });
});
it("rejects changed source after review and leaves every draft assignment and receipt unwritten", async () => {
  const review = await prepare();
  await f.q("UPDATE employee_scheduling_settings SET maximum_weekly_hours=0 WHERE employee_id='target'");
  await expect(apply(review.review.id)).rejects.toMatchObject({ code: "conflict" });
  expect(await f.q("SELECT count(*)::int n FROM shifts")).toEqual([{ n: 0 }]);
});
it("does not renew preparation expiry on replay and blocks a new save after expiry", async () => {
  const command = await selection(), first = await action(command), replay = await action(command);
  expect(replay.review).toEqual(first.review);
  await f.q("UPDATE owner_advisor_coverage_reviews SET prepared_at=clock_timestamp()-interval '6 minutes',expires_at=clock_timestamp()-interval '1 second' WHERE review_id=$1", [first.review.id]);
  await expect(apply(first.review.id)).rejects.toMatchObject({ code: "conflict" });
});
it("cannot use another Owner's review even with active company authority", async () => {
  const review = await prepare();
  await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('second-owner','Second','Owner','555010','OWNER','loc-1'); INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'second-owner',clock_timestamp()+interval '1 hour')");
  const proof = { ...f.owner, employee: { ...f.owner.employee, id: "second-owner" }, sessionTokenHash: "c".repeat(64) };
  await expect(action({ op: "apply_coverage_draft", requestId: randomUUID(), reviewId: review.review.id, acknowledged: true }, f.db.executor, proof)).rejects.toMatchObject({ code: "forbidden" });
});
it("denies a Manager and revoked Owner before returning a prepared review or receipt", async () => {
  const review = await prepare();
  await expect(action({ op: "check_coverage_draft", requestId: randomUUID(), reviewId: review.review.id }, f.db.executor, f.manager)).rejects.toThrow();
  await f.q("DELETE FROM employee_sessions WHERE employee_id='owner'");
  await expect(check(review.review.id)).rejects.toThrow();
});
it("concurrent identical confirmations save once and replay the same original receipt", async () => {
  const review = await prepare(), operationId = randomUUID();
  const results = await Promise.all(Array.from({ length: 6 }, () => apply(review.review.id, operationId)));
  expect(results.every(r => JSON.stringify(r.receipt) === JSON.stringify(results[0].receipt))).toBe(true);
  expect(await f.q("SELECT count(*)::int n FROM shifts")).toEqual([{ n: 2 }]);
  await expect(apply(review.review.id)).rejects.toMatchObject({ code: "conflict" });
});
it("recovers an original committed operation after a lost reply and subsequent source changes", async () => {
  const review = await prepare(), id = randomUUID(); let lost = false;
  const executor: SqlExecutor = { ...f.db.executor, async transaction(statements, signal) {
    const result = await f.db.executor.transaction(statements, signal);
    if (!lost && statements.some(s => s.text.includes("UPDATE owner_advisor_coverage_reviews") && s.text.includes("applied_operation"))) {
      lost = true; throw Object.assign(Error("Connection lost after commit"), { code: "ECONNRESET" });
    }
    return result;
  } };
  await expect(apply(review.review.id, id, executor)).rejects.toThrow(); expect(lost).toBe(true);
  await f.q("UPDATE employee_scheduling_settings SET maximum_weekly_hours=0 WHERE employee_id='target'");
  const recovered = await apply(review.review.id, id);
  expect(recovered.receipt).toMatchObject({ operationId: id, count: 2 });
  expect(await f.q("SELECT count(*)::int n FROM shifts")).toEqual([{ n: 2 }]);
});
it("receipt failure rolls back all canonical draft inserts", async () => {
  const review = await prepare();
  await f.q("CREATE FUNCTION reject_draft_receipt() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'fixture_receipt_failure'; END$$; CREATE TRIGGER reject_draft_receipt BEFORE UPDATE ON owner_advisor_coverage_reviews FOR EACH ROW EXECUTE FUNCTION reject_draft_receipt()");
  await expect(apply(review.review.id)).rejects.toThrow("fixture_receipt_failure");
  expect(await f.q("SELECT count(*)::int n FROM shifts")).toEqual([{ n: 0 }]);
  expect(await f.q("SELECT count(*)::int n FROM schedules")).toEqual([{ n: 0 }]);
});
it("detects deleted/recreated assignment episodes instead of falsely retaining resolved coverage", async () => {
  const review = await prepare(); await apply(review.review.id);
  const [old] = await f.q<{ id: string }>("SELECT id FROM shifts ORDER BY id LIMIT 1");
  await f.db.executor.transaction([
    {text:"CREATE TEMP TABLE old_shift AS SELECT * FROM shifts WHERE id=$1",values:[old.id]},
    {text:"DELETE FROM shifts WHERE id=$1",values:[old.id]},
    {text:"INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) SELECT id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead FROM old_shift",values:[]},
  ]);
  const current = await check(review.review.id);
  expect(current.progress).toMatchObject({ state: "changed", assignmentsPresent: 1, assignmentsTotal: 2 });
});
it("original save recovery does not require an available current scheduling source", async () => {
  const review = await prepare(), id = randomUUID(), saved = await apply(review.review.id, id);
  const unavailable: SqlExecutor = { ...f.db.executor, async transaction(statements, signal) {
    if (statements.some(s => s.text.includes("WITH sizes"))) throw Error("Current scheduling read unavailable");
    return f.db.executor.transaction(statements, signal);
  } };
  expect((await apply(review.review.id, id, unavailable)).receipt).toEqual(saved.receipt);
  const progress = await check(review.review.id, unavailable);
  expect(progress.progress?.state).toBe("unavailable"); expect(progress.receipt).toEqual(saved.receipt);
});

it("cannot reuse a review in a different session belonging to the same Owner", async () => {
  const review=await prepare();
  await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'owner',clock_timestamp()+interval '1 hour')");
  await expect(action({op:"check_coverage_draft",requestId:randomUUID(),reviewId:review.review.id},f.db.executor,{...f.owner,sessionTokenHash:"d".repeat(64)})).rejects.toMatchObject({code:"forbidden"});
});
it("does not repair unrelated published baselines or create publication/notification effects", async () => {
  await f.q("INSERT INTO locations(id,name,short_name,clocker_key,workspace_id) VALUES('loc-3','Third','Third','third-qa','workspace-fuel'); INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('unrelated-published','loc-3','2026-10-19','PUBLISHED','owner'); INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('historic-published','unrelated-published','manager','2026-10-21','08:00','12:00')");
  const review=await prepare(); await apply(review.review.id);
  expect(await f.q("SELECT (SELECT count(*)::int FROM notifications) notifications,(SELECT count(*)::int FROM schedule_publication_revisions) publications")).toEqual([{notifications:0,publications:0}]);
  expect(await f.q("SELECT status FROM schedules WHERE id='unrelated-published'")).toEqual([{status:"PUBLISHED"}]);
});
it("checks later publication separately and uses the current workspace timezone",async()=>{
  const review=await prepare(); await apply(review.review.id);
  await f.q("UPDATE schedules SET status='PUBLISHED'");
  expect((await check(review.review.id)).progress).toMatchObject({state:"current",assignmentsPresent:2,publishedAssignments:2});
  await f.q("UPDATE workspaces SET time_zone='America/New_York'");
  expect((await check(review.review.id)).progress).toMatchObject({state:"changed",timeZone:"America/New_York"});
});
it("fails closed when the additive review schema is unavailable",async()=>{
  const selected=await selection(); await f.q("DROP TABLE owner_advisor_coverage_reviews");
  await expect(action(selected)).rejects.toMatchObject({code:"unavailable"});
});
it("rolls back every business insert after a silent receipt no-op",async()=>{
  const review=await prepare();
  await f.q("CREATE FUNCTION skip_draft_receipt() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NULL; END$$; CREATE TRIGGER skip_draft_receipt BEFORE UPDATE ON owner_advisor_coverage_reviews FOR EACH ROW EXECUTE FUNCTION skip_draft_receipt()");
  await expect(apply(review.review.id)).rejects.toThrow();
  expect(await f.q("SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM schedules) schedules,(SELECT count(*)::int FROM owner_advisor_coverage_reviews WHERE receipt IS NOT NULL) receipts")).toEqual([{shifts:0,schedules:0,receipts:0}]);
});
it.each(["location","week"])("does not count a saved parent moved to another %s as exact or published",async(kind)=>{
  const review=await prepare();await apply(review.review.id);
  const before=await f.q("SELECT id,assignment_episode_id::text FROM shifts ORDER BY id");
  const [parent]=await f.q<{id:string}>("SELECT id FROM schedules ORDER BY id LIMIT 1");
  if(kind==="location"){
    await f.q("INSERT INTO locations(id,name,short_name,clocker_key,workspace_id) VALUES('moved-location','Moved','Moved','moved-qa','workspace-fuel')");
    await f.q("UPDATE schedules SET location_id='moved-location',status='PUBLISHED' WHERE id=$1",[parent.id]);
  }else await f.q("UPDATE schedules SET week_start='2026-10-26',status='PUBLISHED' WHERE id=$1",[parent.id]);
  expect(await f.q("SELECT id,assignment_episode_id::text FROM shifts ORDER BY id")).toEqual(before);
  expect((await check(review.review.id)).progress).toMatchObject({state:"changed",assignmentsPresent:1,assignmentsTotal:2,publishedAssignments:0});
});
it("links a decision to exact server-checked progress and records later changes without upgrading to business success",async()=>{
 const review=await prepare();await apply(review.review.id);
 const decisionId=randomUUID(),today=new Date().toISOString().slice(0,10);
 await call({op:"memory",requestId:randomUUID(),expectedRevision:0,change:{kind:"save_decision",decisionId,summary:"Use checked draft",course:"Keep these assignments",reason:"Current coverage comparison",focus:{kind:"coverage",date:"2026-10-22"},decisionDate:today,expiryDate:today}});
 const command={op:"memory",requestId:randomUUID(),expectedRevision:1,change:{kind:"check_outcome",decisionId,reviewId:review.review.id}};
 await call(command);
 const read=()=>f.q<{decisions:{outcome:{kind:string;progress:unknown}}[]}>("SELECT decisions FROM owner_advisor_memories");
 const first=(await read())[0].decisions[0].outcome;
 expect(first).toMatchObject({kind:"coverage_checked",progress:{state:"current",assignmentsPresent:2,assignmentsTotal:2,publishedAssignments:0,coverage:{remainingBlocks:0}}});
 expect(JSON.stringify(first)).not.toContain("verified");
 await f.q("DELETE FROM shifts WHERE id=(SELECT id FROM shifts ORDER BY id LIMIT 1)");
 await call({...command,requestId:randomUUID(),expectedRevision:2});
 expect((await read())[0].decisions[0].outcome).toMatchObject({kind:"coverage_checked",progress:{state:"changed",assignmentsPresent:1,assignmentsTotal:2}});
 // Replaying the original check returns its revision receipt, never overwrites
 // the later observation or rechecks under a new result for the same identity.
 expect(await call(command)).toMatchObject({state:"memory_saved",revision:2});
 expect((await read())[0].decisions[0].outcome).toMatchObject({progress:{state:"changed"}});
 await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('second-owner','Second','Owner','555010','OWNER','loc-1'); INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'second-owner',clock_timestamp()+interval '1 hour')");
 const other={...f.owner,employee:{...f.owner.employee,id:"second-owner"},sessionTokenHash:"c".repeat(64)};
 await call({op:"memory",requestId:randomUUID(),expectedRevision:0,change:{kind:"save_decision",decisionId,summary:"Other",course:"Other",reason:"Other",focus:{kind:"coverage",date:"2026-10-22"},decisionDate:today,expiryDate:today}},f.db.executor,other);
 await expect(call({...command,requestId:randomUUID()},f.db.executor,other)).rejects.toMatchObject({code:"forbidden"});
});
