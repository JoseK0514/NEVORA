import { createHash } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';

// Substitute framework cookies/navigation/cache and transport only. Real cookie
// proof derivation, permissions, actions, repositories and PostgreSQL run here.
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

import * as actions from '../../app/app/schedule/settings/actions';
import * as health from '../../lib/data/schedule-health';
import { requireSessionMutationProof } from '../../lib/auth/session';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
import { generateWeekDraft } from '../../lib/data/schedule-generation';
import { createDisposableFoundationDatabase } from './local-postgres';
import {installFixtureCompanyAccess} from './fixture-company-access';
import { withOwnedTestResources } from './owned-test-resources';

const operations = ['SAVE', 'ADD', 'QUOTAS', 'DELETE'] as const;
type Operation = typeof operations[number];
const hash = createHash('sha256').update('owned-settings-current-session').digest('hex');
let database: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const q = (text: string, values: readonly unknown[] = []) => database.executor.query<Record<string, unknown>>({ text, values });
const snapshot = async () => { await installFixtureCompanyAccess(database.executor); return (await q(`SELECT jsonb_build_object(
 'staffing',(SELECT jsonb_agg(to_jsonb(t) ORDER BY location_id) FROM location_staffing_settings t),
 'hours',(SELECT jsonb_agg(to_jsonb(t) ORDER BY employee_id) FROM employee_scheduling_settings t),
 'windows',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM location_coverage_windows t),
 'quotas',(SELECT jsonb_agg(to_jsonb(t) ORDER BY coverage_window_id,position_id) FROM coverage_window_position_requirements t),
 'shifts',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM shifts t),
 'history',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM schedule_publication_revision_shifts t),
 'notifications',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM notifications t)) state`))[0].state; };
beforeAll(async () => { database = await createDisposableFoundationDatabase({ mode: 'current-runtime' }); });
afterAll(async () => { await database?.dispose(); });
beforeEach(async () => {
  context.executor = database.executor; context.token = 'owned-settings-current-session';
  await database.dispose(); database=await createDisposableFoundationDatabase({mode:'current-runtime'}); context.executor=database.executor;
  await q("UPDATE workspaces SET active=true; UPDATE locations SET active=true; UPDATE location_staffing_settings SET minimum_staff_per_shift=1,requires_designated_lead=false");
  await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES
   ('owner','Fictional','Owner','NONE','OWNER','loc-1'),('other','Fictional','Manager','NONE','MANAGER','loc-1'),('worker','Fictional','Worker','NONE','EMPLOYEE','loc-1');
   INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours) VALUES('owner',10,20),('worker',24,40);
   INSERT INTO positions(id,workspace_id,name) VALUES('p1','workspace-fuel','Cashier'),('p2','workspace-fuel','Barista');
   INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('window','loc-1',1,'08:00','12:00');
   INSERT INTO coverage_window_position_requirements VALUES('window','p1',1);
   INSERT INTO schedules(id,location_id,week_start,created_by,status) VALUES('history-schedule','loc-1','2030-10-07','owner','PUBLISHED');
   INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES('historical-shift','history-schedule','worker','2030-10-07','08:00','12:00','p1');
   INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('history-revision','2030-10-07',1,'PUBLISH','owner');
   INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,position_id,position_name) VALUES('history-snapshot','history-revision','historical-shift','history-schedule','loc-1','worker','2030-10-07','08:00','12:00','p1','Cashier');
   INSERT INTO notifications(id,employee_id,type,title,body) VALUES('historical-notice','worker','TEST','History','Fictional history');`);
  await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'owner',clock_timestamp()+interval '1 day')", [hash]);
});
function form(operation: Operation) {
  const data = new FormData();
  for (const id of ['loc-1', 'loc-2']) { data.set(`staffing-${id}`, '3'); data.set(`lead-configured-${id}`, 'true'); }
  for (const id of ['owner', 'other', 'worker']) { data.set(`target-${id}`, '25.13'); data.set(`maximum-${id}`, '32.13'); }
  Object.entries({ locationId: 'loc-1', dayOfWeek: '2', startTime: '08:00', endTime: '12:00', windowId: 'window', 'quota-p1': '4' }).forEach(([key, value]) => data.set(key, value));
  data.append('quotaPositionId', 'p1');
  // These fields must never influence authority derived from the actual cookie.
  data.set('actorEmployeeId', 'FORGED'); data.set('sessionTokenHash', 'FORGED');
  if (operation === 'SAVE') data.set('target-worker', '');
  return data;
}
const outcome = <T,>(promise: Promise<T>) => promise.then(value => ({ value, error: undefined }), error => ({ value: undefined, error }));
async function action(operation: Operation) {
  await installFixtureCompanyAccess(database.executor);
  const data = form(operation);
  return outcome<unknown>(operation === 'SAVE' ? actions.saveScheduleHealthSettingsFormAction(data)
    : operation === 'ADD' ? actions.addCoverageWindowFormAction(data)
    : operation === 'QUOTAS' ? actions.replaceCoverageWindowPositionRequirementsAction(data)
    : actions.deleteCoverageWindowAction(data));
}
async function invalidate(kind: string) {
  if (kind === 'revoked') await q('DELETE FROM employee_sessions WHERE token_hash=$1', [hash]);
  else if (kind === 'expired') await q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1", [hash]);
  else if (kind === 'foreign') await q("UPDATE employee_sessions SET employee_id='other' WHERE token_hash=$1", [hash]);
  else if (kind === 'inactive') await q("UPDATE employees SET active=false WHERE id='owner'");
  else await q("UPDATE employees SET role='EMPLOYEE' WHERE id='owner'");
}

// Removing final session/current-role authority makes each family commit.
it.each(operations.flatMap(operation => ['revoked', 'expired', 'foreign', 'inactive', 'demoted'].map(kind => ({ operation, kind }))))('actual $operation rejects $kind authority changed after entry', async ({ operation, kind }) => {
  const before = await snapshot(); let invalidations = 0;
  context.executor = {
    query: async <T>(statement: SqlStatement) => {
      // The original DELETE was a standalone query. Keep this old boundary in
      // the driver so the identical regression reproduces both implementations.
      if (statement.text.trimStart().startsWith('DELETE FROM location_coverage_windows')) { invalidations++; await invalidate(kind); }
      return database.executor.query<T>(statement);
    },
    transaction: async statements => {
      invalidations++; await invalidate(kind); return database.executor.transaction(statements);
    },
  };
  const result = await action(operation);
  expect(await snapshot()).toEqual(before);
  expect(invalidations).toBeGreaterThan(0);
  expect(result.value).not.toMatchObject({ success: expect.any(String) });
  expect(JSON.stringify(result)).not.toContain(hash);
});

it.each(operations.flatMap(operation => ['OWNER', 'MANAGER'].map(role => ({ operation, role }))))('actual $operation succeeds for a current $role session and preserves history', async ({ operation, role }) => {
  await q("UPDATE employees SET role=$1 WHERE id='owner'", [role]);
  const before = await snapshot() as Record<string, unknown>;
  const result = await action(operation);
  if (operation === 'DELETE') expect(result.error).toMatchObject({ destination: '/app/schedule/settings?windowDeleted=1' });
  else expect(result.value).toHaveProperty('success');
  const after = await snapshot() as Record<string, unknown>;
  for (const key of ['shifts', 'history', 'notifications']) expect(after[key]).toEqual(before[key]);
  if (operation === 'SAVE') {
    expect(await q('SELECT minimum_staff_per_shift,requires_designated_lead FROM location_staffing_settings ORDER BY location_id')).toEqual([{minimum_staff_per_shift:3,requires_designated_lead:false},{minimum_staff_per_shift:3,requires_designated_lead:false}]);
    expect(await q("SELECT target_weekly_hours,maximum_weekly_hours FROM employee_scheduling_settings WHERE employee_id='worker'")).toEqual([{target_weekly_hours:null,maximum_weekly_hours:'32.25'}]);
    expect(await q("SELECT target_weekly_hours,maximum_weekly_hours FROM employee_scheduling_settings WHERE employee_id='owner'")).toEqual([{target_weekly_hours:'25.25',maximum_weekly_hours:'32.25'}]);
  } else if (operation === 'DELETE') {
    expect(await q("SELECT id FROM location_coverage_windows WHERE id='window'")).toEqual([]);
    expect(await q("SELECT * FROM coverage_window_position_requirements WHERE coverage_window_id='window'")).toEqual([]);
  } else expect(await q('SELECT quantity FROM coverage_window_position_requirements WHERE coverage_window_id<>$1', [operation === 'ADD' ? 'window' : 'missing'])).toEqual([{quantity:4}]);
});

// A fault in the hour write must roll back staffing from this same native Save.
it('actual Save rolls back staffing and hours together when the hour write fails', async () => {
  const before = await snapshot();
  await q(`CREATE FUNCTION b05_fail_hours() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'owned hours fault'; END$$;
   CREATE TRIGGER b05_hours_fault BEFORE INSERT OR UPDATE ON employee_scheduling_settings FOR EACH ROW EXECUTE FUNCTION b05_fail_hours()`);
  try {
    const result = await action('SAVE');
    expect(result.value).toHaveProperty('error');
    expect(await snapshot()).toEqual(before);
  } finally { await q('DROP TRIGGER b05_hours_fault ON employee_scheduling_settings; DROP FUNCTION b05_fail_hours()'); }
});

async function controlled(defer: (cleanup: () => void | Promise<unknown>) => void, pause: (statement: SqlStatement) => boolean = () => false, mutationOnly = false) {
  await installFixtureCompanyAccess(database.executor);
  const client = new Client({ connectionString: database.connectionString, statement_timeout: 5000 });
  await client.connect(); defer(() => client.end());
  const pid = Number((await client.query('SELECT pg_backend_pid() pid')).rows[0].pid);
  let release!: () => void, reached!: () => void, paused = false;
  const ready = new Promise<void>(resolve => { reached = resolve; });
  const released = new Promise<void>(resolve => { release = resolve; });
  defer(() => release());
  const executor: SqlExecutor = { query: database.executor.query, transaction: async statements => {
    const mutation = statements.some(statement => /^\s*(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b/.test(statement.text));
    await client.query('BEGIN');
    try {
      const results = [];
      for (const statement of statements) {
        results.push((await client.query(statement.text, [...statement.values])).rows);
        if (!paused && (!mutationOnly || mutation) && pause(statement)) { paused = true; reached(); await released; }
      }
      await client.query('COMMIT'); return results;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  } };
  return { client, executor, pid, ready, release };
}
async function blocked(pid: number, blocker: number) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if ((await q('SELECT $2::integer=ANY(pg_blocking_pids($1)) blocked', [pid, blocker]))[0].blocked) return;
  }
  throw new Error('Expected actual PostgreSQL settings/session lock wait');
}

it.each(operations.flatMap(operation => ['session', 'input'].map(lock => ({ operation, lock }))))('actual $operation rejects expiry after actual $lock row-lock wait', async ({ operation, lock }) => {
  const before = await snapshot();
  await withOwnedTestResources(async defer => {
    const blocker = await controlled(defer), writer = await controlled(defer);
    context.executor = { query: database.executor.query, transaction: async statements => {
      await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '600 milliseconds' WHERE token_hash=$1", [hash]);
      await blocker.client.query('BEGIN');
      const input = operation === 'SAVE' ? "SELECT employee_id FROM employee_scheduling_settings WHERE employee_id='owner' FOR UPDATE"
        : operation === 'ADD' ? "SELECT id FROM locations WHERE id='loc-1' FOR UPDATE"
        : "SELECT id FROM location_coverage_windows WHERE id='window' FOR UPDATE";
      await blocker.client.query(lock === 'session' ? 'SELECT token_hash FROM employee_sessions WHERE token_hash=$1 FOR UPDATE' : input, lock === 'session' ? [hash] : []);
      return writer.executor.transaction(statements);
    } };
    defer(() => blocker.client.query('ROLLBACK'));
    const writing = action(operation); defer(() => writing);
    await blocked(writer.pid, blocker.pid);
    await q('SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.03) FROM employee_sessions WHERE token_hash=$1', [hash]);
    expect(await q('SELECT expires_at<=clock_timestamp() expired FROM employee_sessions WHERE token_hash=$1', [hash])).toEqual([{expired:true}]);
    await blocker.client.query('COMMIT');
    const result = await writing;
    expect(result.value).not.toMatchObject({success:expect.any(String)});
    expect(await snapshot()).toEqual(before);
  });
});

it.each(operations.flatMap(operation => ['logout-first', 'write-first'].map(order => ({ operation, order }))))('actual $operation / $order serializes logout and mutation', async ({ operation, order }) => {
  const before = await snapshot();
  await withOwnedTestResources(async defer => {
    const writer = await controlled(defer, s => order === 'write-first' && s.text.includes('management_authorization'), true);
    const logout = await controlled(defer, s => order === 'logout-first' && s.text.startsWith('DELETE FROM employee_sessions'));
    const deleting = () => logout.executor.transaction([{text:'DELETE FROM employee_sessions WHERE token_hash=$1',values:[hash]}]);
    context.executor = writer.executor;
    if (order === 'logout-first') {
      const loggingOut = outcome(deleting()); defer(() => loggingOut);
      await logout.ready;
      const writing = action(operation); defer(() => writing); defer(() => logout.release());
      await blocked(writer.pid, logout.pid);
      logout.release(); expect((await loggingOut).error).toBeUndefined();
      const result = await writing; expect(result.value).not.toMatchObject({success:expect.any(String)});
      expect(await snapshot()).toEqual(before);
    } else {
      const writing = action(operation); defer(() => writing);
      await Promise.race([writer.ready, writing.then(() => { throw new Error('Mutation completed before session guard barrier'); })]);
      const loggingOut = outcome(deleting()); defer(() => loggingOut); defer(() => writer.release());
      await blocked(logout.pid, writer.pid);
      writer.release();
      const result = await writing;
      if (operation === 'DELETE') expect(result.error).toMatchObject({destination:'/app/schedule/settings?windowDeleted=1'});
      else expect(result.value).toHaveProperty('success');
      expect((await loggingOut).error).toBeUndefined();
    }
    expect(await q('SELECT employee_id FROM employee_sessions')).toEqual([]);
  });
});

async function repositoryWrite(operation: Operation, proof: SessionMutationProof, executor: SqlExecutor = database.executor) {
  await installFixtureCompanyAccess(database.executor);
  return operation === 'SAVE' ? health.saveScheduleHealthSettings({ staffingSettings: [{locationId:'loc-1',minimumStaffPerShift:3,requiresDesignatedLead:false}], hourTargets: [{employeeId:'worker',targetWeeklyHours:25,maximumWeeklyHours:32}], proof }, executor)
    : operation === 'ADD' ? health.createCoverageWindow({locationId:'loc-1',dayOfWeek:2,startTime:'08:00',endTime:'12:00',actorEmployeeId:'owner',positionRequirements:[{positionId:'p1',quantity:4}],proof}, executor)
    : operation === 'QUOTAS' ? health.replaceCoverageWindowPositionRequirements({windowId:'window',actorEmployeeId:'owner',requirements:[{positionId:'p1',quantity:4}],proof}, executor)
    : health.deleteCoverageWindow('window', proof, executor);
}
it.each(operations.flatMap(operation => ['missing', 'malformed', 'unknown-hash', 'wrong-employee'].map(kind => ({ operation, kind }))))('$operation repository denies $kind proof without an actor-only fallback', async ({ operation, kind }) => {
  const before = await snapshot(), valid = await requireSessionMutationProof();
  const proof = kind === 'missing' ? undefined : kind === 'malformed' ? {...valid,sessionTokenHash:'FORGED'}
    : kind === 'unknown-hash' ? {...valid,sessionTokenHash:'b'.repeat(64)}
    : {...valid,employee:{...valid.employee,id:'other'}};
  await expect(repositoryWrite(operation, proof as SessionMutationProof)).rejects.toThrow(/^(?:management|operational)_authorization$/);
  expect(await snapshot()).toEqual(before);
});

it.each(['missing-location', 'inactive-location', 'missing-employee', 'inactive-employee'])('atomic settings rejects %s inputs at the repository boundary', async kind => {
  const proof = await requireSessionMutationProof(), before = await snapshot();
  if (kind === 'inactive-location') await q("UPDATE locations SET active=false WHERE id='loc-1'");
  if (kind === 'inactive-employee') await q("UPDATE employees SET active=false WHERE id='worker'");
  await expect(health.saveScheduleHealthSettings({
    staffingSettings:[{locationId:kind==='missing-location'?'missing':'loc-1',minimumStaffPerShift:3,requiresDesignatedLead:false}],
    hourTargets:[{employeeId:kind==='missing-employee'?'missing':'worker',maximumWeeklyHours:32}],proof,
  }, database.executor)).rejects.toThrow(kind.endsWith('location') ? 'settings_location_invalid' : 'settings_employee_invalid');
  expect(await snapshot()).toEqual(before);
});

it('coverage deletion permits removal of an inactive location configuration and preserves historical assignments', async () => {
  const proof = await requireSessionMutationProof(), before = await snapshot() as Record<string,unknown>;
  await q("UPDATE locations SET active=false WHERE id='loc-1'");
  expect(await health.deleteCoverageWindow('window', proof, database.executor)).toBe(true);
  const after = await snapshot() as Record<string,unknown>;
  expect(after.windows).toBeNull(); expect(after.quotas).toBeNull();
  for (const key of ['shifts','history','notifications']) expect(after[key]).toEqual(before[key]);
});

// An absent settings key must wait on its locked parent BEFORE authority. The
// competing INSERT owns the real FK parent lock and uncommitted unique key.
it.each(['hours', 'staffing'])('Save rejects expiry waiting for absent %s UPSERT ownership', async kind => {
  const proof = await requireSessionMutationProof();
  await q(kind === 'hours' ? "DELETE FROM employee_scheduling_settings WHERE employee_id='worker'" : "DELETE FROM location_staffing_settings WHERE location_id='loc-1'");
  await withOwnedTestResources(async defer => {
    const blocker = await controlled(defer), writer = await controlled(defer);
    await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '600 milliseconds' WHERE token_hash=$1", [hash]);
    await blocker.client.query('BEGIN'); defer(() => blocker.client.query('ROLLBACK'));
    await blocker.client.query(kind === 'hours'
      ? "INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours) VALUES('worker',24,40)"
      : "INSERT INTO location_staffing_settings(location_id,minimum_staff_per_shift,requires_designated_lead) VALUES('loc-1',1,false)");
    const writing = outcome(repositoryWrite('SAVE', proof, writer.executor)); defer(() => writing);
    await blocked(writer.pid, blocker.pid);
    await q('SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.03) FROM employee_sessions WHERE token_hash=$1', [hash]);
    await blocker.client.query('COMMIT');
    const before = await snapshot();
    expect(String((await writing).error)).toContain('management_authorization');
    expect(await snapshot()).toEqual(before);
  });
});

// Preserve generation's established FIRST workspace lock. Both orderings run
// the real generation repository and real Settings actions, not fabricated locks.
it.each(operations.flatMap(operation => ['generation-first', 'settings-first'].map(order => ({operation,order}))))('$operation / $order completes without settings/global-generation lock inversion', async ({ operation, order }) => {
  await q("INSERT INTO employee_location_eligibility VALUES('worker','loc-1'); INSERT INTO employee_positions VALUES('worker','p1'); INSERT INTO availability_windows VALUES('normal','worker',1,'08:00','12:00')");
  const proof = await requireSessionMutationProof();
  await withOwnedTestResources(async defer => {
    const writer = await controlled(defer, s => order === 'settings-first' && s.text.includes('FROM workspaces') && s.text.endsWith('FOR SHARE'));
    const generator = await controlled(defer, s => order === 'generation-first' && s.text.endsWith('FOR NO KEY UPDATE'));
    const generate = () => outcome(generateWeekDraft({workspaceId:'workspace-fuel',actorEmployeeId:'owner',weekStart:'2030-10-14',mode:'BUILD_WEEK',locationScope:{kind:'SELECTED',locationIds:['loc-1']},proof},generator.executor));
    context.executor = writer.executor;
    if (order === 'generation-first') {
      const generating = generate(); defer(() => generating);
      await Promise.race([generator.ready,generating.then(() => {throw new Error('Generation completed before workspace barrier');})]);
      const writing = action(operation); defer(() => writing); defer(() => generator.release());
      await blocked(writer.pid,generator.pid); generator.release();
      expect((await generating).error).toBeUndefined();
      const result=await writing;
      if(operation==='DELETE') expect(result.error).toMatchObject({destination:'/app/schedule/settings?windowDeleted=1'});
      else expect(result.value).toHaveProperty('success');
    } else {
      const writing = action(operation); defer(() => writing);
      await Promise.race([writer.ready,writing.then(() => {throw new Error('Settings completed before workspace barrier');})]);
      const generating = generate(); defer(() => generating); defer(() => writer.release());
      await blocked(generator.pid,writer.pid); writer.release();
      const result=await writing;
      if(operation==='DELETE') expect(result.error).toMatchObject({destination:'/app/schedule/settings?windowDeleted=1'});
      else expect(result.value).toHaveProperty('success');
      expect((await generating).error).toBeUndefined();
    }
    expect(await q("SELECT id FROM shifts WHERE id='historical-shift'")).toEqual([{id:'historical-shift'}]);
    expect(await q('SELECT position_name FROM schedule_publication_revision_shifts')).toEqual([{position_name:'Cashier'}]);
  });
});

// A table SHARE lock acquired after initial authority permits existing read/row
// locks but blocks later DML. The final fresh check must abort ALL written rows.
it.each(operations)('actual %s rolls back expiry during a later SQL write lock wait', async operation => {
  const before = await snapshot();
  await withOwnedTestResources(async defer => {
    const writer = await controlled(defer, s => s.text.includes('management_authorization'), true);
    const blocker = await controlled(defer);
    await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '800 milliseconds' WHERE token_hash=$1", [hash]);
    context.executor = writer.executor;
    const writing = action(operation); defer(() => writing);
    await Promise.race([writer.ready,writing.then(() => {throw new Error('Settings completed before initial authority barrier');})]);
    await blocker.client.query('BEGIN'); defer(() => blocker.client.query('ROLLBACK'));
    const table = operation === 'SAVE' ? 'location_staffing_settings' : operation === 'QUOTAS' ? 'coverage_window_position_requirements' : 'location_coverage_windows';
    await blocker.client.query(`LOCK TABLE ${table} IN SHARE MODE`);
    writer.release(); await blocked(writer.pid,blocker.pid);
    expect(await q('SELECT query FROM pg_stat_activity WHERE pid=$1',[writer.pid])).toEqual([{query:expect.stringMatching(/INSERT INTO|DELETE FROM/)}]);
    await q('SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.03) FROM employee_sessions WHERE token_hash=$1', [hash]);
    await blocker.client.query('COMMIT');
    const result = await writing;
    expect(await snapshot()).toEqual(before);
    expect(result.value).not.toMatchObject({success:expect.any(String)});
  });
});

// The native action must recover a recognized current-authority failure through
// existing login/role routing; the transactional guard still rolls everything back.
it.each(['revoked','expired','foreign','inactive','demoted'])('native Remove redirects safely after actual %s final-authority denial', async kind => {
  const before=await snapshot(); let invalidated=false;
  context.executor={query:database.executor.query,transaction:async statements=>{
    invalidated=true; await invalidate(kind); return database.executor.transaction(statements);
  }};
  const result=await action('DELETE');
  expect(await snapshot()).toEqual(before); expect(invalidated).toBe(true);
  expect(result.error).toMatchObject({destination:'/app/schedule/settings?error=ACCESS_DENIED'});
  expect(result.value).toBeUndefined();
});
