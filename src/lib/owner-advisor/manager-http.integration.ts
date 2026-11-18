import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { companyAccessFixture } from '@/test/integration/company-access-fixture';
import { createDisposableFoundationDatabase } from '@/test/integration/local-postgres';
import { assignOperationalScope, readOwnerOperationalScope } from '@/lib/company-access/operational-scope.server';
import type { SqlExecutor, SqlStatement } from '@/lib/notifications/types';
import type { SessionMutationProof } from '@/lib/shift-changes/types';
import { GET as managerGet } from '@/app/api/manager/advisor/route';
import { GET as ownerGet } from '@/app/api/owner/advisor/route';
import { POST as ownerWeekly } from '@/app/api/owner/advisor/weekly/route';
import { GET as ownerKnowledge } from '@/app/api/owner/advisor/knowledge/route';
import { GET as ownerBusiness } from '@/app/api/owner/advisor/business/route';

const state = vi.hoisted(() => ({
  proof: null as SessionMutationProof | null,
  executor: null as SqlExecutor | null,
}));
vi.mock('@/lib/auth/session', () => ({
  getSession: async () => state.proof?.employee ?? null,
  requireSessionMutationProof: async () => state.proof,
}));
vi.mock('@/lib/data/sql-executor', () => ({
  neonNotificationExecutor: () => state.executor,
}));

const weekStart = '2026-11-16';
const managerRequest = (query = '', headers = { 'x-nevora-manager-advisor': '1' }) =>
  new Request(`http://localhost/api/manager/advisor${query}`, { headers });
const weeklyView = `?view=weekly&weekStart=${weekStart}&locationId=loc-1`;
let fixture: Awaited<ReturnType<typeof companyAccessFixture>>;

async function setScope(locationIds?: string[]) {
  const { owner, db } = fixture;
  const current = await readOwnerOperationalScope(owner, 'manager', db.executor);
  if (current.state !== 'ready') throw Error('Fixture scope unavailable');
  const subject = current.data.current;
  const common = {
    operationId: randomUUID(), expectedEmployeeVersion: subject.employeeUpdatedAt,
    expectedRoleGeneration: subject.roleGeneration, expectedScopeRevision: subject.scopeRevision,
  };
  const command = locationIds
    ? { ...common, action: 'ASSIGN' as const, scope: { mode: 'LOCATIONS' as const, locationIds } }
    : { ...common, action: 'REVOKE' as const };
  expect((await assignOperationalScope(owner, 'manager', command, db.executor)).state).toBe('saved');
}

beforeEach(async () => {
  fixture = await companyAccessFixture();
  state.executor = fixture.db.executor;
  state.proof = fixture.manager;
  vi.stubEnv('NEVORA_OWNER_ADVISOR_ENABLED', 'true');
  vi.stubEnv('NEVORA_MANAGER_ADVISOR_ENABLED', 'true');
  vi.stubEnv('NEVORA_OWNER_ADVISOR_DATA_APPROVED', 'false');
  await setScope(['loc-1']);
  await fixture.q(`
    INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES
      ('rondo-one','loc-1','2026-11-16','DRAFT','owner'),('rondo-two','loc-2','2026-11-16','PUBLISHED','owner');
    INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes) VALUES
      ('rondo-shift','rondo-one','target','2026-11-16','08:00','12:00','fictional private shift note'),
      ('rondo-outside','rondo-two','target','2026-11-16','08:00','16:00','fictional outside note');
  `);
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await fixture?.db.dispose();
});

it('returns only the assigned active locations and exact weekly and guided facts', async () => {
  const outbound = vi.spyOn(globalThis, 'fetch').mockRejectedValue(Error('unexpected outbound'));
  const context = await managerGet(managerRequest());
  expect(context.status).toBe(200);
  expect(context.headers.get('cache-control')).toBe('no-store, private');
  expect(await context.json()).toMatchObject({
    state: 'ready', view: 'context', questionMode: 'guided', locations: [{ id: 'loc-1' }],
  });
  const weekly = await managerGet(managerRequest(weeklyView));
  expect(weekly.status).toBe(200);
  const body = await weekly.json();
  expect(body).toMatchObject({ state: 'ready', view: 'weekly', weekStart, location: { id: 'loc-1' },
    days: expect.arrayContaining([{ date: weekStart, draftShifts: 1, publishedShifts: 0, releasedShifts: 0, scheduledMinutes: 240 }]),
  });
  expect(body.days).toHaveLength(7);
  expect(JSON.stringify(body)).not.toMatch(/fictional private shift note|loc-2|employeeId|scheduleId|token|payroll/i);
  const answer = await managerGet(managerRequest(`?view=answer&weekStart=${weekStart}&locationId=loc-1&question=scheduled_minutes`));
  expect(await answer.json()).toMatchObject({ state: 'ready', view: 'answer', question: 'scheduled_minutes', value: 240 });
  expect(outbound).not.toHaveBeenCalled();
  expect(await fixture.q('SELECT count(*)::int AS count FROM shifts')).toEqual([{ count: 2 }]);
});

it('denies another location, a location in a separate workspace database, and Owner APIs', async () => {
  const originalUrl = process.env.FUEL_TEST_DATABASE_URL;
  if (!originalUrl) throw Error('Missing owned SQL environment');
  const foreignUrl = new URL(originalUrl);
  foreignUrl.pathname = '/nevora_foundation_test_foreign_rondo';
  vi.stubEnv('FUEL_TEST_DATABASE_URL', foreignUrl.href);
  const foreign = await createDisposableFoundationDatabase({ mode: 'current-runtime' });
  vi.stubEnv('FUEL_TEST_DATABASE_URL', originalUrl);
  try {
    const locations = await foreign.executor.query<{ id: string }>({
      text: `INSERT INTO locations(id,name,short_name,workspace_id,clocker_key)
        VALUES ('foreign-rondo','Foreign fictional branch','Foreign','workspace-fuel','foreign-rondo') RETURNING id`,
      values: [],
    });
    expect(locations).toEqual([{ id: 'foreign-rondo' }]);
    for (const locationId of ['loc-2', 'foreign-rondo']) {
      const result = await managerGet(managerRequest(weeklyView.replace('loc-1', locationId)));
      expect(result.status).toBe(403);
      expect(await result.json()).toEqual({ state: 'error', code: 'forbidden' });
    }
  } finally {
    await foreign.dispose();
  }
  const ownerRoute = (url: string, header: string, method = 'GET') => new Request(`http://localhost/api/owner/advisor${url}`, {
    method, headers: { [header]: '1', origin: 'http://localhost', 'content-type': 'application/json' },
  });
  expect((await ownerGet(ownerRoute('', 'x-nevora-owner-advisor'))).status).toBe(403);
  expect((await ownerWeekly(ownerRoute('/weekly', 'x-nevora-owner-advisor', 'POST'))).status).toBe(403);
  expect((await ownerKnowledge(ownerRoute('/knowledge', 'x-nevora-company-knowledge'))).status).toBe(403);
  expect((await ownerBusiness(ownerRoute('/business', 'x-nevora-business-evidence'))).status).toBe(403);
});

it('keeps the gate off by default and honors current role and session revocation', async () => {
  vi.stubEnv('NEVORA_MANAGER_ADVISOR_ENABLED', undefined);
  expect((await managerGet(managerRequest())).status).toBe(404);
  vi.stubEnv('NEVORA_MANAGER_ADVISOR_ENABLED', 'true');
  vi.stubEnv('NEVORA_OWNER_ADVISOR_ENABLED', 'false');
  expect((await managerGet(managerRequest())).status).toBe(404);
  vi.stubEnv('NEVORA_OWNER_ADVISOR_ENABLED', 'true');
  await fixture.q("UPDATE employees SET role='EMPLOYEE' WHERE id='manager'");
  expect((await managerGet(managerRequest(weeklyView))).status).toBe(403);
  await fixture.q("UPDATE employees SET role='MANAGER' WHERE id='manager'");
  expect((await managerGet(managerRequest(weeklyView))).status).toBe(403);
  await setScope(['loc-1']);
  await fixture.q("DELETE FROM employee_sessions WHERE employee_id='manager'");
  expect((await managerGet(managerRequest(weeklyView))).status).toBe(403);
  state.proof = null;
  expect((await managerGet(managerRequest())).status).toBe(401);
});

it('withholds an in-flight response when access is revoked during the schedule read', async () => {
  const original = fixture.db.executor;
  state.executor = {
    ...original,
    async query<T>(statement: SqlStatement, signal?: AbortSignal): Promise<T[]> {
      const result = await original.query<T>(statement, signal);
      if (statement.text.includes('operational scoped roster')) await setScope();
      return result;
    },
  };
  const response = await managerGet(managerRequest(weeklyView));
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ state: 'error', code: 'forbidden' });
  expect((await managerGet(managerRequest())).status).toBe(403);
});

it('rejects unrecognized questions and input while the Owner contract remains usable', async () => {
  for (const query of [weeklyView + '&employeeId=target', weeklyView + '&locationId=loc-2', weeklyView.replace(weekStart, '2026-11-17')]) {
    expect((await managerGet(managerRequest(query))).status).toBe(400);
  }
  expect((await managerGet(managerRequest(weeklyView.replace('weekly', 'answer') + '&question=payroll'))).status).toBe(400);
  expect((await managerGet(managerRequest('', { 'x-nevora-manager-advisor': '0' }))).status).toBe(403);
  state.proof = fixture.owner;
  expect((await managerGet(managerRequest())).status).toBe(403);
  const result = await ownerGet(new Request('http://localhost/api/owner/advisor', { headers: { 'x-nevora-owner-advisor': '1' } }));
  expect(result.status).toBe(200);
  expect(await result.json()).toMatchObject({ state: 'ready', connection: 'unavailable' });
});
