import { createHash } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';

// Only framework cookies/cache/navigation and SQL transport are substituted.
// Authentication, proof derivation, actions, planner and ordered SQL are real.
const context = vi.hoisted(() => ({ executor: null as SqlExecutor | null, token: '' }));
vi.mock('@/lib/db', () => {
  const statement = (text: string, values: readonly unknown[] = []) => ({ statement: { text, values }, then: (yes: (rows: unknown[]) => unknown, no: (error: unknown) => unknown) => context.executor!.query({ text, values }).then(yes, no) });
  const tagged = Object.assign((strings: TemplateStringsArray, ...values: unknown[]) => statement(strings.reduce((text, part, index) => text + (index ? '$' + index : '') + part, ''), values), {
    query: statement, transaction: (queries: { statement: SqlStatement }[]) => context.executor!.transaction(queries.map(query => query.statement)),
  });
  return { getDb: () => tagged, queryRows: (rows: unknown) => rows };
});
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (name: string) => name === 'fuel_session' && context.token ? { value: context.token } : undefined }) }));
vi.mock('@/lib/data/notification-transactions', async original => ({ ...await original<Record<string, unknown>>(), neonNotificationExecutor: () => context.executor! }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (destination: string) => { throw Object.assign(new Error('redirect'), { destination }); } }));

import { requireSessionMutationProof } from '../../lib/auth/session';
import { generateWeekAction, clearGenerationExclusionAction } from '../../app/app/schedule/generation-actions';
import { generateWeekDraft } from '../../lib/data/schedule-generation';
import { clearGenerationExclusion, deleteGeneratedDraftShift } from '../../lib/data/generation-exclusions';
import { readGenerationSource } from '../../lib/data/generation-guards';
import { createDisposableGenerationDatabase } from './local-postgres';
import { withOwnedTestResources } from './owned-test-resources';
import { installFixtureCompanyAccess } from './fixture-company-access';

type Operation = 'BUILD_WEEK' | 'FILL_GAPS_ONLY' | 'CLEAR';
const operations: Operation[] = ['BUILD_WEEK', 'FILL_GAPS_ONLY', 'CLEAR'];
const request = { workspaceId: 'workspace-fuel', actorEmployeeId: 'owner', weekStart: '2030-10-07', mode: 'BUILD_WEEK' as const, locationScope: { kind: 'SELECTED' as const, locationIds: ['loc-1'] } };
const idle = { status: 'idle' as const, message: '' };
const hash = createHash('sha256').update('owned-generation-current-session').digest('hex');
let database: Awaited<ReturnType<typeof createDisposableGenerationDatabase>>;
const q = (text: string, values: readonly unknown[] = []) => database.executor.query<Record<string, unknown>>({ text, values });
const source = async () => (await readGenerationSource(database.executor)).source;
beforeAll(async () => { database = await createDisposableGenerationDatabase(); });
afterAll(async () => { await database?.dispose(); });
beforeEach(async () => {
  context.executor = database.executor;
  context.token = 'owned-generation-current-session';
  await database.dispose(); database=await createDisposableGenerationDatabase(); context.executor=database.executor;
  await q("UPDATE workspaces SET active=true,time_zone='America/Puerto_Rico'; UPDATE locations SET active=true; UPDATE location_staffing_settings SET minimum_staff_per_shift=1,requires_designated_lead=false");
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner','Fictional','Owner','NONE','OWNER','loc-1'),('other','Fictional','Manager','NONE','MANAGER','loc-1'),('worker','Fictional','Worker','NONE','EMPLOYEE','loc-1'); INSERT INTO employee_location_eligibility VALUES('worker','loc-1'); INSERT INTO availability_windows VALUES('normal','worker',1,'08:00','12:00'); INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('window','loc-1',1,'08:00','12:00')");
  await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'owner',clock_timestamp()+interval '1 day')", [hash]);
});

async function prepare(operation: Operation) {
  await installFixtureCompanyAccess(database.executor);
  const proof = await requireSessionMutationProof();
  let exclusionId = '';
  if (operation === 'CLEAR') {
    await generateWeekDraft({ ...request, proof }, database.executor);
    const id = String((await q('SELECT id FROM shifts'))[0].id);
    exclusionId = (await deleteGeneratedDraftShift({ ...request, proof, locationId: 'loc-1', shiftId: id }, database.executor)).exclusionId!;
  }
  const write = async (executor: SqlExecutor) => operation === 'CLEAR'
    ? clearGenerationExclusion({ ...request, proof, locationId: 'loc-1', exclusionId }, executor)
    : generateWeekDraft({ ...request, proof, mode: operation }, executor);
  const form = new FormData();
  Object.entries({ weekStart: request.weekStart, locationId: 'loc-1', ...(operation === 'CLEAR' ? { exclusionId } : { mode: operation, scope: 'SELECTED' }) }).forEach(([key, value]) => form.set(key, value));
  const action = () => operation === 'CLEAR' ? clearGenerationExclusionAction(idle, form) : generateWeekAction(idle, form);
  return { write, action, exclusionId };
}
async function invalidate(kind: string) {
  if (kind === 'revoked') await q('DELETE FROM employee_sessions WHERE token_hash=$1', [hash]);
  else if (kind === 'expired') await q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1", [hash]);
  else await q("UPDATE employee_sessions SET employee_id='other' WHERE token_hash=$1", [hash]);
}

// Removing final session authority makes each case commit after entry auth.
it.each(operations.flatMap(operation => ['revoked', 'expired', 'foreign-owner'].map(kind => ({ operation, kind }))))('actual $operation action rejects $kind session after entry authorization', async ({ operation, kind }) => {
  const prepared = await prepare(operation), before = await source();
  let transactions = 0;
  context.executor = { query: database.executor.query, transaction: async statements => {
    transactions++;
    await invalidate(kind);
    return database.executor.transaction(statements);
  } };
  const result = await prepared.action();
  expect(transactions).toBe(1);
  expect(result.status).toBe('error');
  expect(await source()).toEqual(before);
  expect(await q("SELECT active,role FROM employees WHERE id='owner'")).toEqual([{ active: true, role: 'OWNER' }]);
  expect(JSON.stringify(result)).not.toContain(hash);
});

it.each(operations.flatMap(operation => ['OWNER', 'MANAGER'].map(role => ({ operation, role }))))('actual $operation succeeds with its current owned $role session', async ({ operation, role }) => {
  await q("UPDATE employees SET role=$1 WHERE id='owner'", [role]);
  const prepared = await prepare(operation);
  const result = await prepared.action();
  expect(result.status).toBe('success');
  if (operation === 'CLEAR') {
    expect(await q('SELECT cleared_by,cleared_at IS NOT NULL cleared FROM schedule_generation_exclusions WHERE id=$1', [prepared.exclusionId])).toEqual([{ cleared_by: 'owner', cleared: true }]);
    expect(await q('SELECT id FROM shifts')).toEqual([]);
  } else {
    expect(result).toMatchObject({ result: { summary: { added: 1 } } });
    expect(await q('SELECT assignment_origin FROM shifts')).toEqual([{ assignment_origin: 'GENERATED' }]);
  }
  expect(await q('SELECT status,published_at FROM schedules')).toEqual([{ status: 'DRAFT', published_at: null }]);
  expect(await q('SELECT id FROM notifications')).toEqual([]);
  expect(await q('SELECT id FROM schedule_publication_revisions')).toEqual([]);
  expect(JSON.stringify(result)).not.toContain(hash);
});

it.each(['BUILD_WEEK', 'FILL_GAPS_ONLY', 'INVALID_BUILD', 'INVALID_FILL', 'ALREADY_CLEARED'] as const)('guarded %s no-op rejects a revoked current session', async kind => {
  const prepared = await prepare(kind === 'ALREADY_CLEARED' ? 'CLEAR' : kind.endsWith('FILL') || kind === 'FILL_GAPS_ONLY' ? 'FILL_GAPS_ONLY' : 'BUILD_WEEK');
  if (kind.startsWith('INVALID')) await q('DELETE FROM location_coverage_windows');
  else await prepared.write(database.executor);
  const before = await source();
  const executor: SqlExecutor = { query: database.executor.query, transaction: async statements => {
    await invalidate('revoked');
    return database.executor.transaction(statements);
  } };
  await expect(prepared.write(executor)).rejects.toThrow(/^(?:management|operational)_authorization$/);
  expect(await source()).toEqual(before);
});

async function controlled(defer: (cleanup: () => void | Promise<unknown>) => void, pause: (statement: SqlStatement) => boolean = () => false, generationOnly = false) {
  const client = new Client({ connectionString: database.connectionString, statement_timeout: 5000 });
  await client.connect(); defer(() => client.end());
  const pid = Number((await client.query('SELECT pg_backend_pid() pid')).rows[0].pid);
  let release!: () => void, reached!: () => void, paused = false;
  const ready = new Promise<void>(resolve => { reached = resolve; });
  const released = new Promise<void>(resolve => { release = resolve; });
  defer(() => release());
  const executor: SqlExecutor = { query: database.executor.query, transaction: async statements => {
    await client.query('BEGIN');
    try {
      const results = [];
      for (const statement of statements) {
        results.push((await client.query(statement.text, [...statement.values])).rows);
        if (!paused && (!generationOnly || statements.some(item => item.text.includes('generation_source_conflict'))) && pause(statement)) { paused = true; reached(); await released; }
      }
      await client.query('COMMIT'); return results;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  } };
  return { client, executor, pid, ready, release };
}
const outcome = <T,>(promise: Promise<T>) => promise.then(value => ({ value, error: undefined }), error => ({ value: undefined, error }));
async function blocked(pid: number, blocker: number) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if ((await q('SELECT $2::integer=ANY(pg_blocking_pids($1)) blocked', [pid, blocker]))[0].blocked) return;
  }
  throw new Error('Expected actual PostgreSQL session/source lock wait');
}

it.each(operations.flatMap(operation => ['session', 'generation-input'].map(lock => ({ operation, lock }))))('$operation rejects expiry after actual $lock lock wait using fresh wall clock', async ({ operation, lock }) => {
  const prepared = await prepare(operation), before = await source();
  await withOwnedTestResources(async defer => {
    const blocker = await controlled(defer), generator = await controlled(defer);
    let introduced = false;
    const executor: SqlExecutor = { query: generator.executor.query, transaction: async statements => {
      // Snapshot/proof already exist; introduce the blocking transaction here.
      if (!introduced && statements.some(item => item.text.includes('generation_source_conflict'))) {
        introduced = true;
        await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '800 milliseconds' WHERE token_hash=$1", [hash]);
        await blocker.client.query('BEGIN');
        await blocker.client.query(lock === 'session' ? 'SELECT token_hash FROM employee_sessions WHERE token_hash=$1 FOR UPDATE' : 'LOCK TABLE location_coverage_windows IN ACCESS EXCLUSIVE MODE', lock === 'session' ? [hash] : []);
      }
      return generator.executor.transaction(statements);
    } };
    defer(() => blocker.client.query('ROLLBACK'));
    const generating = outcome(prepared.write(executor)); defer(() => generating);
    // The input wait must precede the final session check; session wait must
    // precede the fresh expiry check. PostgreSQL itself verifies the barrier.
    await blocked(generator.pid, blocker.pid);
    await q('SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.03) FROM employee_sessions WHERE token_hash=$1', [hash]);
    expect(await q('SELECT expires_at<=clock_timestamp() expired FROM employee_sessions WHERE token_hash=$1', [hash])).toEqual([{ expired: true }]);
    await blocker.client.query('COMMIT');
    const result = await generating;
    expect(result.error).toBeInstanceOf(Error);
    expect(String(result.error)).toMatch(/(?:management|operational)_authorization/);
    expect(await source()).toEqual(before);
  });
});

it.each(operations.flatMap(operation => ['logout-first', 'generation-first'].map(order => ({ operation, order }))))('$operation / $order linearizes actual session deletion with final generation authority', async ({ operation, order }) => {
  const prepared = await prepare(operation), before = await source();
  await withOwnedTestResources(async defer => {
    const generation = await controlled(defer, statement => order === 'generation-first' && statement.text.includes('management_authorization'), true);
    const logout = await controlled(defer, statement => order === 'logout-first' && statement.text.startsWith('DELETE FROM employee_sessions'));
    const deleting = () => logout.executor.transaction([{ text: 'DELETE FROM employee_sessions WHERE token_hash=$1', values: [hash] }]);
    if (order === 'logout-first') {
      const loggingOut = outcome(deleting()); defer(() => loggingOut);
      await logout.ready;
      const generating = outcome(prepared.write(generation.executor)); defer(() => generating);
      defer(() => logout.release());
      await blocked(generation.pid, logout.pid);
      logout.release(); expect((await loggingOut).error).toBeUndefined();
      expect(String((await generating).error)).toMatch(/(?:management|operational)_authorization/);
      expect(await source()).toEqual(before);
    } else {
      let loggingOut:ReturnType<typeof outcome<unknown>>|undefined;
      const executor:SqlExecutor={query:generation.executor.query,transaction:async statements=>{
        const result=await generation.executor.transaction(statements);
        if(statements.some(statement=>statement.text.includes('generation_source_conflict'))) await loggingOut;
        return result;
      }};
      const generating = outcome(prepared.write(executor)); defer(() => generating);
      await generation.ready;
      loggingOut = outcome(deleting()); defer(() => loggingOut);
      defer(() => generation.release());
      await blocked(logout.pid, generation.pid);
      generation.release();
      const result = await generating;
      if(operation==='CLEAR') {
        expect(result.error).toBeUndefined();
        expect(result.value).toMatchObject({status:'cleared'});
      } else {
        expect(result.error).toBeInstanceOf(Error);
        expect(String(result.error)).toContain('operational_authorization');
        expect(result.value).toBeUndefined();
      }
      expect((await loggingOut).error).toBeUndefined();
      if (operation === 'CLEAR') expect(await q('SELECT cleared_by FROM schedule_generation_exclusions')).toEqual([{ cleared_by: 'owner' }]);
      else expect(await q('SELECT assignment_origin FROM shifts')).toEqual([{ assignment_origin: 'GENERATED' }]);
    }
    expect(await q('SELECT employee_id FROM employee_sessions')).toEqual([]);
  });
});
