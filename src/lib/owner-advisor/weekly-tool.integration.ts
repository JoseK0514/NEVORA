import { afterEach, beforeEach, expect, it } from '@rstest/core';
import { randomUUID } from 'node:crypto';
import { companyAccessFixture } from '@/test/integration/company-access-fixture';
import { fictionalProfile } from '@/test/fixtures/shift-changes';
import { AdvisorStore } from './store.server';
import { admitOwner } from './authority.server';
import { weeklyService } from './weekly-service.server';
import { AdvisorMemory } from './memory.server';
import { weeklyMemoryAdmission } from './weekly-context.server';
import { readWeeklyTool, prepareWeeklyAnswerFence, weeklyToolRequestId } from './weekly-tool.server';

let f: Awaited<ReturnType<typeof companyAccessFixture>>;
const env = { NEVORA_OWNER_ADVISOR_ENABLED: 'true', NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED: 'true' };
const args = { weekStart: '2026-11-16', locationScope: { kind: 'SELECTED' as const, locationIds: ['loc-1'] } };
const signal = () => new AbortController().signal;
beforeEach(async () => {
  f = await companyAccessFixture();
  await f.q(`UPDATE location_staffing_settings SET minimum_staff_per_shift=1,requires_designated_lead=false;
    INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('target','loc-1');
    INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('mon-one','loc-1',1,'08:00','12:00'),('tue-one','loc-1',2,'08:00','12:00');
    INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('mon-av','target',1,'08:00','12:00'),('tue-av','target',2,'08:00','12:00');
    INSERT INTO weekly_availability_submissions(employee_id,week_start,uses_normal_availability) VALUES('target','2026-11-16',true);`);
  await f.q("INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours,operational_rule_profile) VALUES('target',40,$1::jsonb)", [JSON.stringify(fictionalProfile())]);
});
afterEach(async () => { await f?.db.dispose(); });
async function setup() {
  const store = new AdvisorStore(f.owner, await admitOwner(f.owner, f.db.executor), f.db.executor);
  const memory = new AdvisorMemory(store, signal(), env), read = await memory.read();
  if (read.state !== 'ready') throw Error('Expected model memory');
  const runtime = { env, origin: { requestId: randomUUID(), profileRevision: 0, notebookRevision: 0, memoryRevision: read.memory.revision,
    memoryAdmission: weeklyMemoryAdmission(read.memory, await memory.clock(), store.original.workspace.timeZone) } };
  return { store, runtime };
}
async function read() {
  const p = await setup(), result = await readWeeklyTool(p.store, args, signal(), p.runtime, { sourceSlots: 1, occurrence: 1 });
  if (!result.weeklyPlans) throw Error('Expected weekly projection');
  return { ...p, result, model: result.weeklyPlans };
}
const fenceFor = (p: Awaited<ReturnType<typeof read>>, model = p.model) => prepareWeeklyAnswerFence(p.store, model, env, signal(), p.runtime.origin.requestId);

it('returns only a bounded FILL_GAPS_ONLY projection and keeps all approval authority outside the model', async () => {
  const p = await read();
  expect(p.model).toMatchObject({ state: 'ready', mode: 'FILL_GAPS_ONLY', weekStart: args.weekStart, locationScope: args.locationScope });
  expect(p.model.alternatives[0]).toMatchObject({ added: 2, applyEligible: true });
  expect(p.model.alternatives[0].reviewHref).toBe(`/app/ai-manager/weekly?review=${p.model.alternatives[0].id}`);
  expect(p.result.sources).toHaveLength(1); expect(p.result.sources[0].href).toBe(p.model.alternatives[0].reviewHref);
  expect(Buffer.byteLength(JSON.stringify(p.result), 'utf8')).toBeLessThanOrEqual(12288);
  expect(JSON.stringify(p.result)).not.toMatch(/readReceiptId|read_receipt|generatedClaims|retainedDigest|"changes"|session_hash/);
  expect(await f.q('SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM notifications) notifications,(SELECT count(*)::int FROM owner_advisor_weekly_reviews WHERE read_receipt_id IS NOT NULL) handles')).toEqual([{ shifts: 0, notifications: 0, handles: 0 }]);
});

it('reuses the same original investigation occurrence and conflicts on changed arguments without solving again', async () => {
  const p = await read();
  const repeat = await readWeeklyTool(p.store, args, signal(), p.runtime, { sourceSlots: 1, occurrence: 1 });
  expect(repeat.weeklyPlans).toEqual(p.model);
  await expect(readWeeklyTool(p.store, { ...args, weekStart: '2026-11-23' }, signal(), p.runtime, { sourceSlots: 1, occurrence: 1 })).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q("SELECT count(*)::int n FROM owner_advisor_weekly_operations WHERE command_kind='compare_week'")).toEqual([{ n: 1 }]);
});

it('binds deterministic request IDs to workspace, Owner, original request and occurrence without session quota resets', async () => {
  const p = await read(), identity = { workspaceId: p.store.original.workspace.id, ownerId: 'owner', requestId: p.runtime.origin.requestId, occurrence: 1 };
  const id = weeklyToolRequestId(identity); expect(id).toBe(p.model.comparisonId);
  expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  for (const changed of [{ ownerId: 'other' }, { workspaceId: 'other' }, { requestId: randomUUID() }, { occurrence: 2 }]) expect(weeklyToolRequestId({ ...identity, ...changed })).not.toBe(id);
  await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'owner',clock_timestamp()+interval '1 hour')");
  const proof = { ...f.owner, sessionTokenHash: 'c'.repeat(64) }, store = new AdvisorStore(proof, await admitOwner(proof, f.db.executor), f.db.executor);
  await expect(readWeeklyTool(store, args, signal(), p.runtime, { sourceSlots: 1, occurrence: 1 })).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q("SELECT count(*)::int n FROM owner_advisor_weekly_operations WHERE command_kind='compare_week'")).toEqual([{ n: 1 }]);
});

it('rejects missing source slots and invalid server occurrence before reserving work', async () => {
  const p = await setup();
  for (const budget of [{ sourceSlots: 0, occurrence: 1 }, { sourceSlots: 1, occurrence: -1 }, { sourceSlots: 1, occurrence: 8 }, { sourceSlots: 1, occurrence: 1.5 }]) {
    await expect(readWeeklyTool(p.store, args, signal(), p.runtime, budget)).rejects.toThrow();
  }
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_operations')).toEqual([{ n: 0 }]);
});

it('prepares a solver-free settlement fence and rejects a source change after the fence was captured', async () => {
  const p = await read(), fence = await fenceFor(p);
  await f.db.executor.transaction([...fence.before, ...fence.after], signal());
  await f.q("UPDATE employees SET first_name='Changed' WHERE id='target'");
  await expect(f.db.executor.transaction([...fence.before, ...fence.after], signal())).rejects.toThrow();
  await expect(fenceFor(p)).rejects.toMatchObject({ code: 'conflict' });
});

it('rejects forged option identity, digest, scope and review link on answer settlement', async () => {
  const p = await read();
  const mutations = [
    { ...p.model, comparisonId: randomUUID() }, { ...p.model, weekStart: '2026-11-23' },
    { ...p.model, locationScope: { kind: 'ALL' as const } },
    { ...p.model, alternatives: p.model.alternatives.map(a => ({ ...a, termsDigest: 'a'.repeat(64) })) },
    { ...p.model, alternatives: p.model.alternatives.map(a => ({ ...a, reviewHref: 'https://evil.invalid' })) },
  ];
  for (const model of mutations) await expect(fenceFor(p, model)).rejects.toMatchObject({ code: 'conflict' });
});

it('does not qualify an answer after an option was declined or admitted Owner context changed', async () => {
  const p = await read();
  await weeklyService(f.owner, f.db.executor, env, signal(), { op: 'decline_week_plan', requestId: randomUUID(), reviewId: p.model.alternatives[0].id });
  await expect(fenceFor(p)).rejects.toMatchObject({ code: 'conflict' });
  const next = await read();
  await f.q("INSERT INTO owner_advisor_notebooks(workspace_id,owner_id,revision) VALUES('workspace-fuel','owner',1)");
  await expect(fenceFor(next)).rejects.toMatchObject({ code: 'conflict' });
});

it('binds an unavailable no-option comparison to its original source without manufacturing freshness', async () => {
  await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,'Legacy','Fictional','555099','EMPLOYEE','loc-1')", ['legacy-' + 'x'.repeat(123)]);
  const p = await read();
  expect(p.model).toMatchObject({ state: 'unavailable', reason: 'INPUT_LIMIT', sourceVersion: null, alternatives: [] });
  expect(p.model.sourceFence).toMatch(/^[a-f0-9]{64}$/);
  const fence = await fenceFor(p); await f.db.executor.transaction([...fence.before, ...fence.after], signal());
  await f.q("UPDATE employees SET first_name='Changed' WHERE id='target'");
  await expect(fenceFor(p)).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q('SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM owner_advisor_weekly_reviews) reviews')).toEqual([{ shifts: 0, reviews: 0 }]);
});
