import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { SessionMutationProof } from '@/lib/shift-changes/types';
import type { SqlExecutor } from '@/lib/notifications/types';
import { companyAccessFixture } from '@/test/integration/company-access-fixture';
import { fictionalProfile } from '@/test/fixtures/shift-changes';
const state = vi.hoisted(() => ({ proof: null as SessionMutationProof | null, ex: null as SqlExecutor | null }));
vi.mock('@/lib/auth/session', () => ({ getSession: async () => state.proof?.employee ?? null, requireSessionMutationProof: async () => state.proof }));
vi.mock('@/lib/data/sql-executor', () => ({ neonNotificationExecutor: () => state.ex }));
import { POST } from '@/app/api/owner/advisor/weekly/route';
import * as weeklyPlanner from './weekly-plan.server';
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
const url = 'http://localhost/api/owner/advisor/weekly';
const request = (body: unknown, signal?: AbortSignal) => new Request(url, { method: 'POST', headers: {
  'x-nevora-owner-advisor': '1', origin: 'http://localhost', 'content-type': 'application/json',
}, body: JSON.stringify(body), signal });
const compare = () => ({ op: 'compare_week', requestId: randomUUID(), weekStart: '2026-11-16', mode: 'FILL_GAPS_ONLY', locationScope: { kind: 'SELECTED', locationIds: ['loc-1'] } });
const call = (body: unknown) => POST(request(body));
beforeEach(async () => {
  vi.stubEnv('NEVORA_OWNER_ADVISOR_ENABLED', 'true'); vi.stubEnv('NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED', 'true');
  vi.stubEnv('ANTHROPIC_API_KEY', ''); vi.stubEnv('OPENAI_API_KEY', ''); vi.stubEnv('FUEL_PORTAL_ORIGIN', 'http://localhost');
  f = await companyAccessFixture(); state.proof = f.owner; state.ex = f.db.executor;
  await f.q(`UPDATE location_staffing_settings SET minimum_staff_per_shift=1,requires_designated_lead=false;
    INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('target','loc-1');
    INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('mon-one','loc-1',1,'08:00','12:00'),('tue-one','loc-1',2,'08:00','12:00');
    INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('mon-av','target',1,'08:00','12:00'),('tue-av','target',2,'08:00','12:00');
    INSERT INTO weekly_availability_submissions(employee_id,week_start,uses_normal_availability) VALUES('target','2026-11-16',true);`);
  await f.q("INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours,operational_rule_profile) VALUES('target',40,$1::jsonb)", [JSON.stringify(fictionalProfile())]);
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); await f?.db.dispose(); });
async function reviewed() {
  const compared = await call(compare()); expect(compared.status).toBe(200);
  const result = await compared.json(), option = result.comparison.alternatives[0];
  const response = await call({ op: 'read_week_plan', requestId: randomUUID(), reviewId: option.id }); expect(response.status).toBe(200);
  const full = await response.json();
  return { option, full, command: { op: 'apply_week_plan', requestId: randomUUID(), reviewId: option.id, termsDigest: option.termsDigest,
    readReceiptId: full.readReceiptId, acknowledged: true } };
}

it('uses the real private compare/read/apply/check route without model credentials or network calls', async () => {
  const outbound = vi.spyOn(globalThis, 'fetch').mockRejectedValue(Error('No network allowed'));
  const p = await reviewed(); expect(p.full.review.changes.additions).toHaveLength(2);
  expect(p.full.validForMs).toBeGreaterThan(0); expect(p.full.validForMs).toBeLessThanOrEqual(15000);
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 0 }]);
  const response = await call(p.command); expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store, private'); expect(response.headers.get('vary')).toBe('Cookie');
  const result = await response.json(); expect(result.state).toBe('saved'); expect(result.receipt.added).toBe(2);
  const check = await (await call({ op: 'check_week_plan', requestId: randomUUID(), reviewId: p.option.id })).json();
  expect(check.receipt).toEqual(result.receipt); expect(check.progress.state).toBe('draft');
  expect(JSON.stringify(check)).not.toMatch(/session_hash|created_assignments|generatedClaims|retainedDigest/);
  expect(await f.q('SELECT (SELECT count(*)::int FROM notifications) notifications,(SELECT count(*)::int FROM schedule_publication_revisions) publications')).toEqual([{ notifications: 0, publications: 0 }]);
  expect(outbound).not.toHaveBeenCalled();
});

it('rejects untrusted fields and action terms before creating artifacts or assignments', async () => {
  for (const command of [{ ...compare(), workspaceId: 'other' }, { ...compare(), assignments: [] },
    { ...compare(), locationScope: { kind: 'SELECTED', locationIds: ['loc-1', 'loc-1'] } }, { ...compare(), weekStart: '2026-11-17' }]) {
    expect((await call(command)).status).toBe(400);
  }
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_operations')).toEqual([{ n: 0 }]);
  const p = await reviewed();
  expect((await call({ ...p.command, acknowledged: false })).status).toBe(400);
  expect((await call({ ...p.command, additions: p.full.review.changes.additions })).status).toBe(400);
  expect((await call({ ...p.command, readReceiptId: randomUUID() })).status).toBe(409);
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 0 }]);
});

it('rejects unknown or foreign selected locations as invalid requests', async () => {
  const response = await call({ ...compare(), locationScope: { kind: 'SELECTED', locationIds: ['other-company-location'] } });
  expect(response.status).toBe(400); expect(await response.json()).toEqual({ state: 'error', code: 'invalid' });
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 0 }]);
});

it('denies missing, Manager and Employee sessions and current revoked Owner authority', async () => {
  state.proof = null; expect((await call(compare())).status).toBe(401);
  state.proof = f.manager; expect((await call(compare())).status).toBe(403);
  state.proof = { ...f.owner, employee: { ...f.owner.employee, role: 'EMPLOYEE' } }; expect((await call(compare())).status).toBe(403);
  state.proof = f.owner; await f.q("DELETE FROM employee_sessions WHERE employee_id='owner'");
  expect((await call(compare())).status).toBe(403);
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_reviews')).toEqual([{ n: 0 }]);
});

it('returns unavailable for missing schema and does not treat it as an empty plan', async () => {
  await f.q('DROP TABLE owner_advisor_weekly_reviews,owner_advisor_weekly_operations CASCADE');
  const response = await call(compare()); expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ state: 'error', code: 'unavailable' });
});

it('keeps new actions off while allowing minimal authorized historical recovery', async () => {
  const p = await reviewed(); await call(p.command);
  vi.stubEnv('NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED', 'false');
  expect((await call(compare())).status).toBe(503);
  expect((await call({ op: 'read_week_plan', requestId: randomUUID(), reviewId: p.option.id })).status).toBe(503);
  const response = await call(p.command); expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ state: 'saved', review: null, comparison: null, progress: null });
  vi.stubEnv('NEVORA_OWNER_ADVISOR_ENABLED', 'false'); expect((await call(p.command)).status).toBe(503);
});

it('rechecks feature-off before returning details after a committed save', async () => {
  const p = await reviewed(); let changed = false;
  state.ex = { ...f.db.executor, async transaction(statements, signal) {
    const result = await f.db.executor.transaction(statements, signal);
    if (!changed && statements.some(s => s.text.includes('UPDATE owner_advisor_weekly_reviews SET applied_operation'))) {
      changed = true; vi.stubEnv('NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED', 'false');
    }
    return result;
  } };
  const response = await call(p.command); expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ state: 'saved', receipt: { added: 2 }, review: null, progress: null });
});

it.each(['request', 'deadline'])('recovers the original committed operation on %s abort after commit', async kind => {
  const p = await reviewed(), controller = new AbortController(); let aborted = false;
  const deadline = kind === 'deadline' ? vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal) : null;
  state.ex = { ...f.db.executor, async transaction(statements, signal) {
    const result = await f.db.executor.transaction(statements, signal);
    if (!aborted && statements.some(s => s.text.includes('UPDATE owner_advisor_weekly_reviews SET applied_operation'))) { aborted = true; controller.abort(); }
    return result;
  } };
  const uncertain = await POST(request(p.command, kind === 'request' ? controller.signal : undefined)); expect(uncertain.status).toBe(503);
  expect(await uncertain.json()).toEqual({ state: 'error', code: 'cancelled' });
  deadline?.mockRestore();
  state.ex = f.db.executor;
  const recovered = await (await call({ op: 'check_week_plan', requestId: randomUUID(), reviewId: p.option.id })).json();
  expect(recovered.state).toBe('saved'); expect(recovered.receipt.operationId).toBe(p.command.requestId);
  expect((await (await call(p.command)).json()).receipt).toEqual(recovered.receipt);
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 2 }]);
});

it('rechecks session revocation after receiving a streamed command', async () => {
  const body = new ReadableStream<Uint8Array>({ async start(controller) {
    controller.enqueue(new TextEncoder().encode('{'));
    await f.q("DELETE FROM employee_sessions WHERE employee_id='owner'");
    controller.enqueue(new TextEncoder().encode(JSON.stringify(compare()).slice(1))); controller.close();
  } });
  const response = await POST(new Request(url, { method: 'POST', headers: { 'x-nevora-owner-advisor': '1', origin: 'http://localhost', 'content-type': 'application/json' }, body, duplex: 'half' } as RequestInit));
  expect(response.status).toBe(403);
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_operations')).toEqual([{ n: 0 }]);
});

it('bounds private response validity to the actual session expiry and denies later reads', async () => {
  await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '3 seconds' WHERE employee_id='owner'");
  const compared = await call(compare()); expect(compared.status).toBe(200);
  const result = await compared.json(); expect(result.validForMs).toBeGreaterThan(0); expect(result.validForMs).toBeLessThanOrEqual(3000);
  await f.q('SELECT pg_sleep(3.1)');
  const denied = await call({ op: 'read_week_plan', requestId: randomUUID(), reviewId: result.comparison.alternatives[0].id });
  expect(denied.status).toBe(403); expect(await denied.json()).toEqual({ state: 'error', code: 'forbidden' });
});

it('denies an unsaved approval while weekly actions are off and withholds its plan details', async () => {
  const p = await reviewed(); vi.stubEnv('NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED', 'false');
  const denied = await call(p.command); expect(denied.status).toBe(503); expect(await denied.json()).toEqual({ state: 'error', code: 'disabled' });
  const observed = await (await call({ op: 'check_week_plan', requestId: randomUUID(), reviewId: p.option.id })).json();
  expect(observed).toMatchObject({ state: 'unavailable', comparison: null, review: null, receipt: null });
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 0 }]);
});

it('rejects changed knowledge feature context before returning a complete private review', async () => {
  const result = await (await call(compare())).json(), option = result.comparison.alternatives[0]; let changed = false;
  state.ex = { ...f.db.executor, async transaction(statements, signal) {
    const rows = await f.db.executor.transaction(statements, signal);
    if (!changed && statements.some(s => s.text.startsWith('WITH issued AS'))) { changed = true; vi.stubEnv('NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED', 'true'); }
    return rows;
  } };
  const response = await call({ op: 'read_week_plan', requestId: randomUUID(), reviewId: option.id });
  expect(response.status).toBe(409); expect(await response.json()).toEqual({ state: 'error', code: 'conflict' });
});

it.each(['employees','utf8'])('returns an idempotent INPUT_LIMIT through the private route for real %s overflow', async kind => {
  if(kind==='employees') {
    await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id)
      SELECT 'limit-employee-'||i,'Fictional','Limit '||i,'555'||i,'EMPLOYEE','loc-1'
      FROM generate_series(1,81-(SELECT count(*)::int FROM employees))i`);
    expect(await f.q('SELECT count(*)::int n FROM employees')).toEqual([{n:81}]);
  } else {
    await f.q(`INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('limit-parent','loc-1','2026-11-16','DRAFT','owner');
      INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes) VALUES('limit-legacy-shift','limit-parent','target','2026-11-16','08:00','12:00',repeat('😀',600000))`);
  }
  const planner=vi.spyOn(weeklyPlanner,'compareWeeklyPlans'),command=compare(),response=await call(command);
  expect(response.status).toBe(200);
  const result=await response.json();
  expect(result.comparison).toMatchObject({state:'unavailable',reason:'INPUT_LIMIT',sourceVersion:null,alternatives:[],baseline:null,partial:true});
  expect(result.comparison.observedAt).toBeTruthy();
  expect(Buffer.byteLength(JSON.stringify(result),'utf8')).toBeLessThan(2500);
  expect(await f.q('SELECT state,source_version FROM owner_advisor_weekly_operations WHERE request_id=$1',[command.requestId])).toEqual([{state:'completed',source_version:null}]);
  const replay=await call(command);expect(replay.status).toBe(200);
  expect((await replay.json()).comparison).toEqual(result.comparison);
  if(kind==='employees')await f.q("UPDATE employees SET first_name='Changed fictional input' WHERE id='limit-employee-1'");
  else await f.q("UPDATE shifts SET notes='Bounded fictional legacy note' WHERE id='limit-legacy-shift'");
  // Retrying the original ID recovers the original limit observation; it never
  // upgrades an old failed comparison into a newly solved current plan.
  const recovered=await call(command);expect(recovered.status).toBe(200);
  expect((await recovered.json()).comparison).toEqual(result.comparison);
  expect(planner).not.toHaveBeenCalled();
  const fresh=await call(compare());expect(fresh.status).toBe(200);
  expect((await fresh.json()).comparison.state).toBe(kind==='employees'?'unavailable':'ready');
  expect(planner).toHaveBeenCalledTimes(kind==='employees'?0:1);
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{n:kind==='employees'?0:1}]);
});
