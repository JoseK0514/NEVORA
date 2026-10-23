import { createHash } from 'node:crypto';
import { Client } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';
const context = vi.hoisted(() => ({ executor: null as SqlExecutor | null, token: 'owned-manager-gap-session' }));
vi.mock('@/lib/db', () => {
  const statement = (text: string, values: readonly unknown[] = []) => ({ statement: { text, values }, then: (yes: (rows: unknown[]) => unknown, no: (error: unknown) => unknown) => context.executor!.query({ text, values }).then(yes, no) });
  const tagged = Object.assign((strings: TemplateStringsArray, ...values: unknown[]) => statement(strings.reduce((text, part, i) => text + (i ? '$' + i : '') + part, ''), values), { query: statement, transaction: (queries: { statement: SqlStatement }[]) => context.executor!.transaction(queries.map(q => q.statement)) });
  return { getDb: () => tagged, queryRows: (rows: unknown) => rows };
});
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (name: string) => name === 'fuel_session' && context.token ? { value: context.token } : undefined }) }));
vi.mock('@/lib/data/notification-transactions', async original => ({ ...await original<Record<string, unknown>>(), neonNotificationExecutor: () => context.executor! }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (destination: string) => { throw Object.assign(new Error('redirect'), { destination }); } }));
import { createShiftAction } from '@/app/app/schedule/actions';
import { requireSessionMutationProof } from '../../lib/auth/session';
import { createCoverageRepairShift, insertShift } from '../../lib/data/schedules';
import { createCoverageRepairReview, deriveCoverageRepair, readCoverageRepair } from '../../lib/data/coverage-repair.server';
import { readGenerationSource } from '../../lib/data/generation-guards';
import { CoverageRepairConflictError, type CoverageRepairLocator } from '../../lib/scheduling/coverage-repair';
import { fictionalProfile } from '../fixtures/shift-changes';
import { createDisposableGenerationDatabase } from './local-postgres';
import { withOwnedTestResources } from './owned-test-resources';

const enabled = !!process.env.FUEL_TEST_DATABASE_URL && process.env.FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN === 'yes';
const week = '2030-10-07', hash = createHash('sha256').update('owned-manager-gap-session').digest('hex');
let db: Awaited<ReturnType<typeof createDisposableGenerationDatabase>>;
const q = (text: string, values: readonly unknown[] = []) => db.executor.query<Record<string, unknown>>({ text, values });
const source = async () => (await readGenerationSource(db.executor)).source;
const outcome = <T,>(promise: Promise<T>) => promise.then(value => ({ value, error: undefined }), error => ({ value: undefined, error }));
async function oracle() {
  const tables = ['schedules','shifts','schedule_publication_revisions','schedule_publication_revision_shifts','notifications','push_deliveries','calendar_removals'];
  const rows = await q(`SELECT jsonb_build_object(${tables.map(t => `'${t}',COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text COLLATE "C") FROM ${t} r),'[]'::jsonb)`).join(',')}) AS state`);
  return rows[0].state;
}
async function prepare(target: CoverageRepairLocator['target'] = 'POSITION') {
  const proof = await requireSessionMutationProof();
  const locator: CoverageRepairLocator = { version: 1, weekStart: week, gapKey: `loc-1|${week}|08:00|12:00`, locationId: 'loc-1', date: week, startTime: '08:00', endTime: '12:00', target,
    ...(target === 'POSITION' ? { positionId: 'barista' } : {}), reported: { missingStaff: 2, requiresLead: true, positions: [{ positionId: 'barista', missing: 1 }] } };
  const review = createCoverageRepairReview(await source(), locator, 'E', proof);
  const command = { review, employeeId: 'E', locationId: 'loc-1', weekStart: week, date: week, startTime: '08:00', endTime: '12:00', ...(target === 'POSITION' ? { positionId: 'barista' } : {}), isDesignatedLead: true, publicationConsent: true, actorEmployeeId: 'M', proof };
  const form = new FormData(); Object.entries({ coverageRepairReview: review, employeeId: 'E', locationId: 'loc-1', weekStart: week, date: week, startTime: '08:00', endTime: '12:00', positionId: target === 'POSITION' ? 'barista' : '', isDesignatedLead: 'on', actorEmployeeId: 'FORGED' }).forEach(([k,v]) => form.set(k,v));
  form.set('publicationConsent', 'on');
  return { proof, locator, review, command, form };
}
async function controlled(defer: (cleanup: () => void | Promise<unknown>) => void, pause: (s: SqlStatement) => boolean = () => false) {
  const client = new Client({ connectionString: db.connectionString, statement_timeout: 5000 });
  await client.connect(); defer(() => client.end());
  const pid = Number((await client.query('SELECT pg_backend_pid() pid')).rows[0].pid);
  let release!: () => void, reached!: () => void, paused = false;
  const ready = new Promise<void>(resolve => { reached = resolve; }); const released = new Promise<void>(resolve => { release = resolve; }); defer(() => release());
  const executor: SqlExecutor = { query: db.executor.query, transaction: async statements => {
    await client.query('BEGIN');
    try { const rows = []; for (const s of statements) { rows.push((await client.query(s.text, [...s.values])).rows); if (!paused && pause(s)) { paused = true; reached(); await released; } } await client.query('COMMIT'); return rows; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
  } };
  return { client, pid, executor, ready, release };
}
async function blocked(pid: number, blocker: number) {
  for (let i = 0; i < 100; i++) if ((await q('SELECT $2::integer=ANY(pg_blocking_pids($1)) blocked', [pid, blocker]))[0].blocked) {
    console.info(JSON.stringify({ barrier: 'actual-postgres-lock-wait', pid, blocker })); return;
  }
  throw new Error('Actual owned PostgreSQL wait was not observed');
}
async function expireAfterDatabaseClock() {
  await q('SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.03) FROM employee_sessions WHERE token_hash=$1', [hash]);
  expect(await q('SELECT expires_at<=clock_timestamp() expired FROM employee_sessions WHERE token_hash=$1', [hash])).toEqual([{ expired: true }]);
}

describe.skipIf(!enabled)('BA-MGR-001 owned SQL', () => {
  afterEach(async () => { await db?.dispose(); });
  beforeEach(async () => {
    db = await createDisposableGenerationDatabase();
    context.executor = db.executor; context.token = 'owned-manager-gap-session';
    await q("UPDATE workspaces SET active=true,time_zone='America/Puerto_Rico'; UPDATE locations SET active=true; UPDATE locations SET short_name='Fictional South' WHERE id='loc-1'; UPDATE location_staffing_settings SET minimum_staff_per_shift=2,requires_designated_lead=true");
    await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('M','Fictional','Manager','NONE','MANAGER','loc-1'),('E','Fictional','Qualified','NONE','LEAD','loc-1'),('U','Fictional','Unqualified','NONE','EMPLOYEE','loc-1'),('F','Fictional','Alternate','NONE','LEAD','loc-1'); INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('M','loc-1'),('E','loc-1'),('E','loc-2'),('U','loc-1'),('F','loc-1'); INSERT INTO positions(id,workspace_id,name) VALUES('barista','workspace-fuel','Barista'),('cashier','workspace-fuel','Cashier'); INSERT INTO employee_positions(employee_id,position_id) VALUES('E','barista'),('F','barista'); INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('coverage','loc-1',1,'08:00','12:00'); INSERT INTO coverage_window_position_requirements(coverage_window_id,position_id,quantity) VALUES('coverage','barista',1)");
    await q("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT e.id||'-normal-'||d,e.id,d,'00:00','24:00' FROM employees e CROSS JOIN generate_series(0,6) d");
    await q("INSERT INTO weekly_availability_submissions(employee_id,week_start) SELECT id,$1::date FROM employees", [week]);
    await q("INSERT INTO weekly_availability_windows(id,employee_id,week_start,day_of_week,start_time,end_time) SELECT e.id||'-weekly-'||d,e.id,$1::date,d,'00:00','24:00' FROM employees e CROSS JOIN generate_series(0,6) d", [week]);
    await q("INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours,operational_rule_profile) SELECT id,20,80,$1::jsonb FROM employees", [JSON.stringify(fictionalProfile())]);
    await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'M',clock_timestamp()+interval '1 day')", [hash]);
  });

  it.each(['POSITION','STAFFING','LEAD'] as const)('SQL-01 current %s target creates one legal compound draft repair', async target => {
    const r = await prepare(target); let transactions = 0;
    const executor: SqlExecutor = { query: db.executor.query, transaction: s => { transactions++; return db.executor.transaction(s); } };
    await createCoverageRepairShift(r.command, executor);
    expect(transactions).toBe(1); expect(await q('SELECT location_id,status FROM schedules')).toEqual([{ location_id: 'loc-1', status: 'DRAFT' }]);
    expect(await q('SELECT employee_id,date::text,start_time::text,end_time::text,position_id,is_designated_lead,assignment_origin FROM shifts')).toEqual([{ employee_id: 'E', date: week, start_time: '08:00:00', end_time: '12:00:00', position_id: target === 'POSITION' ? 'barista' : null, is_designated_lead: true, assignment_origin: 'MANAGER' }]);
    expect(await q('SELECT id FROM notifications')).toEqual([]); expect(await q('SELECT id FROM schedule_publication_revisions')).toEqual([]);
  });

  it('SQL-02 published repair retains existing publication/outbox semantics in the same batch', async () => {
    await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('published','loc-1',$1,'PUBLISHED','M')", [week]);
    const r = await prepare(); await createCoverageRepairShift(r.command, db.executor);
    expect((await q('SELECT id FROM shifts')).length).toBe(1); expect((await q('SELECT id FROM schedule_publication_revisions')).length).toBe(1);
    expect((await q('SELECT id FROM notifications')).length).toBeGreaterThan(0); expect(await q('SELECT id FROM push_deliveries')).toEqual([]);
  });

  const changes = [
    ['membership', "DELETE FROM employee_positions WHERE employee_id='E'"], ['position-inactive', "UPDATE positions SET active=false WHERE id='barista'"],
    ['location-inactive', "UPDATE locations SET active=false WHERE id='loc-1'"], ['employee-inactive', "UPDATE employees SET active=false WHERE id='E'"],
    ['lead-role', "UPDATE employees SET role='EMPLOYEE' WHERE id='E'"], ['staffing', "UPDATE location_staffing_settings SET minimum_staff_per_shift=3 WHERE location_id='loc-1'"],
    ['position-deficit', "UPDATE coverage_window_position_requirements SET quantity=2 WHERE position_id='barista'"], ['removed-window', "DELETE FROM location_coverage_windows"],
    ['availability', "DELETE FROM availability_windows WHERE employee_id='E'"], ['weekly-unavailable', "DELETE FROM weekly_availability_windows WHERE employee_id='E' AND week_start='2030-10-07' AND day_of_week=1"],
    ['maximum-hours', "UPDATE employee_scheduling_settings SET maximum_weekly_hours=1 WHERE employee_id='E'"], ['workspace-timezone', "UPDATE workspaces SET time_zone='America/New_York'"],
    ['time-off', "INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reviewed_by) VALUES('leave','E','2030-10-07','2030-10-07','APPROVED','M')"],
    ['overlap', "INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('other','loc-2','2030-10-07','DRAFT','M'); INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('other-shift','other','E','2030-10-07','08:00','12:00')"],
    ['gap-filled', "INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('filled','loc-1','2030-10-07','DRAFT','M'); INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES('filled-shift','filled','F','2030-10-07','08:00','12:00','barista',true)"],
  ] as const;
  it.each(changes)('SQL-03/08 stale %s review denies writes and repeated attempt without refresh', async (_, sql) => {
    const r = await prepare(); await q(sql); const before = await oracle();
    for (let i = 0; i < 2; i++) await expect(createCoverageRepairShift(r.command, db.executor)).rejects.toBeInstanceOf(CoverageRepairConflictError);
    expect(await oracle()).toEqual(before);
  });

  it.each([{ employeeId: 'U' }, { positionId: 'cashier' }, { locationId: 'loc-2' }, { endTime: '13:00' }, { isDesignatedLead: false }])('SQL-09 posted context mismatch rejects without ordinary fallback: %j', async change => {
    const r = await prepare(), before = await oracle(); await expect(createCoverageRepairShift({ ...r.command, ...change }, db.executor)).rejects.toBeInstanceOf(CoverageRepairConflictError); expect(await oracle()).toEqual(before);
  });

  it('SQL-09 legal current unsigned hint re-selection is a permitted manager intent control', async () => {
    const r = await prepare(); const hint = JSON.parse(Buffer.from(r.review, 'base64url').toString()); hint.employeeId = 'F';
    await createCoverageRepairShift({ ...r.command, employeeId: 'F', review: Buffer.from(JSON.stringify(hint)).toString('base64url') }, db.executor);
    expect(await q('SELECT employee_id FROM shifts')).toEqual([{ employee_id: 'F' }]);
  });

  it.each(['revoked','expired','role','inactive'])('SQL-10/17 current %s management authority rejects after entry proof', async kind => {
    const r = await prepare(); const before = await oracle();
    const executor: SqlExecutor = { query: db.executor.query, transaction: async statements => {
      await q(kind === 'revoked' ? 'DELETE FROM employee_sessions WHERE token_hash=$1' : kind === 'expired' ? "UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1" : kind === 'role' ? "UPDATE employees SET role='EMPLOYEE' WHERE id='M'" : "UPDATE employees SET active=false WHERE id='M'", kind === 'revoked' || kind === 'expired' ? [hash] : []);
      return db.executor.transaction(statements);
    } };
    await expect(createCoverageRepairShift(r.command, executor)).rejects.toThrow(kind === 'role' || kind === 'inactive' ? 'Coverage changed' : 'management_authorization'); expect(await oracle()).toEqual(before);
  });

  it('SQL-11 observed source-lock wait rejects the original review after a committed membership change', async () => {
    const r = await prepare(); await withOwnedTestResources(async defer => {
      const blocker = await controlled(defer), writer = await controlled(defer);
      const executor: SqlExecutor = { query: db.executor.query, transaction: async s => { await blocker.client.query('BEGIN'); await blocker.client.query('SELECT id FROM workspaces WHERE singleton FOR UPDATE'); return writer.executor.transaction(s); } };
      defer(() => blocker.client.query('ROLLBACK')); const pending = outcome(createCoverageRepairShift(r.command, executor)); defer(() => pending);
      await blocked(writer.pid, blocker.pid); await blocker.client.query("DELETE FROM employee_positions WHERE employee_id='E'"); await blocker.client.query('COMMIT');
      const expected = await oracle(); expect((await pending).error).toBeInstanceOf(CoverageRepairConflictError); expect(await oracle()).toEqual(expected);
    });
  });

  it.each(['session','source'])('SQL-14/15 expiry after an observed %s lock wait rolls back the complete repair', async lock => {
    const r = await prepare(), before = await oracle(); await withOwnedTestResources(async defer => {
      const blocker = await controlled(defer), writer = await controlled(defer);
      const executor: SqlExecutor = { query: db.executor.query, transaction: async s => {
        await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '800 milliseconds' WHERE token_hash=$1", [hash]);
        await blocker.client.query('BEGIN'); await blocker.client.query(lock === 'session' ? 'SELECT token_hash FROM employee_sessions WHERE token_hash=$1 FOR UPDATE' : 'LOCK TABLE location_coverage_windows IN ACCESS EXCLUSIVE MODE', lock === 'session' ? [hash] : []);
        return writer.executor.transaction(s);
      } };
      defer(() => blocker.client.query('ROLLBACK')); const pending = outcome(createCoverageRepairShift(r.command, executor)); defer(() => pending);
      await blocked(writer.pid, blocker.pid); await expireAfterDatabaseClock(); await blocker.client.query('COMMIT');
      expect(String((await pending).error)).toContain('management_authorization'); expect(await oracle()).toEqual(before);
    });
  });

  it('SQL-16 published notification DML waits past expiry then final authority rolls back ALL business/history/outbox writes', async () => {
    await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('published','loc-1',$1,'PUBLISHED','M')", [week]);
    const r = await prepare(), before = await oracle(); await withOwnedTestResources(async defer => {
      const blocker = await controlled(defer), writer = await controlled(defer);
      const executor: SqlExecutor = { query: db.executor.query, transaction: async s => {
        expect(s.some(statement => statement.text.includes('INSERT INTO notifications'))).toBe(true);
        await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '800 milliseconds' WHERE token_hash=$1", [hash]);
        await blocker.client.query('BEGIN'); await blocker.client.query('LOCK TABLE notifications IN ACCESS EXCLUSIVE MODE'); return writer.executor.transaction(s);
      } };
      defer(() => blocker.client.query('ROLLBACK')); const pending = outcome(createCoverageRepairShift(r.command, executor)); defer(() => pending);
      await blocked(writer.pid, blocker.pid); await expireAfterDatabaseClock(); await blocker.client.query('COMMIT');
      expect(String((await pending).error)).toContain('management_authorization'); expect(await oracle()).toEqual(before);
    });
  });

  it.each(['logout-first','repair-first'])('SQL-12/13 actual %s session deletion serializes with repair authority', async order => {
    const r = await prepare(), before = await oracle(); await withOwnedTestResources(async defer => {
      const writer = await controlled(defer, s => order === 'repair-first' && s.text.includes('management_authorization'));
      const logout = await controlled(defer, s => order === 'logout-first' && s.text.startsWith('DELETE FROM employee_sessions'));
      const deleting = () => logout.executor.transaction([{ text: 'DELETE FROM employee_sessions WHERE token_hash=$1', values: [hash] }]);
      if (order === 'logout-first') {
        const logoutPending = outcome(deleting()); defer(() => logoutPending); await logout.ready;
        const repairPending = outcome(createCoverageRepairShift(r.command, writer.executor)); defer(() => repairPending); defer(() => logout.release());
        await blocked(writer.pid, logout.pid); logout.release(); expect((await logoutPending).error).toBeUndefined();
        expect(String((await repairPending).error)).toContain('management_authorization'); expect(await oracle()).toEqual(before);
      } else {
        const repairPending = outcome(createCoverageRepairShift(r.command, writer.executor)); defer(() => repairPending); await writer.ready;
        const logoutPending = outcome(deleting()); defer(() => logoutPending); defer(() => writer.release());
        await blocked(logout.pid, writer.pid); writer.release(); expect((await repairPending).error).toBeUndefined(); expect((await logoutPending).error).toBeUndefined();
        expect((await q('SELECT id FROM shifts')).length).toBe(1);
      }
      expect(await q('SELECT employee_id FROM employee_sessions')).toEqual([]);
    });
  });

  it('SQL-19 an ordinary no-review insert preserves its existing source-conflict rebuild', async () => {
    await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('ordinary','loc-1',$1,'DRAFT','M')", [week]);
    const proof = await requireSessionMutationProof(); let attempts = 0;
    const executor: SqlExecutor = { query: db.executor.query, transaction: async s => { if (!attempts++) { await q("UPDATE location_staffing_settings SET minimum_staff_per_shift=3 WHERE location_id='loc-1'"); throw Object.assign(new Error('generation_source_conflict'), { code: '22P02' }); } return db.executor.transaction(s); } };
    await insertShift({ scheduleId: 'ordinary', employeeId: 'E', date: week, startTime: '08:00', endTime: '12:00', positionId: 'barista', isDesignatedLead: true, actorEmployeeId: 'M', proof }, executor);
    expect(attempts).toBe(2); expect((await q('SELECT id FROM shifts')).length).toBe(1);
  });

  it('SQL-21 canonical 24:00 gap accepts HTML 00:00 without changing the saved interval', async () => {
    await q("UPDATE location_coverage_windows SET start_time='20:00',end_time='24:00'");
    const proof = await requireSessionMutationProof();
    const exact: CoverageRepairLocator = { version: 1, weekStart: week, gapKey: `loc-1|${week}|20:00|24:00`, locationId: 'loc-1', date: week, startTime: '20:00', endTime: '24:00', target: 'POSITION', positionId: 'barista', reported: { missingStaff: 2, requiresLead: true, positions: [{ positionId: 'barista', missing: 1 }] } };
    const review = createCoverageRepairReview(await source(), exact, 'E', proof);
    await createCoverageRepairShift({ review, employeeId: 'E', locationId: 'loc-1', weekStart: week, date: week, startTime: '20:00', endTime: '00:00', positionId: 'barista', isDesignatedLead: true, actorEmployeeId: 'M', proof }, db.executor);
    expect(await q('SELECT start_time::text,end_time::text FROM shifts')).toEqual([{ start_time: '20:00:00', end_time: '24:00:00' }]);
  });

  it('SQL-23 a covered Lead permits a qualified non-Lead position repair and a truthful remaining chooser', async () => {
    await q("UPDATE employees SET role='EMPLOYEE' WHERE id='E'");
    await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('current','loc-1',$1,'DRAFT','M')", [week]);
    await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,is_designated_lead) VALUES('lead','current','F',$1,'08:00','12:00',true)", [week]);
    const proof = await requireSessionMutationProof(); const locator: CoverageRepairLocator = { version: 1, weekStart: week, gapKey: `loc-1|${week}|08:00|12:00`, locationId: 'loc-1', date: week, startTime: '08:00', endTime: '12:00', target: 'POSITION', positionId: 'barista', reported: { missingStaff: 1, requiresLead: false, positions: [{ positionId: 'barista', missing: 1 }] } };
    const review = await readCoverageRepair(locator, proof, false, db.executor); expect(review.candidates.map(c => c.employeeId)).toContain('E'); expect(review.designatedLead).toBe(false);
    await createCoverageRepairShift({ review: review.candidates.find(c => c.employeeId === 'E')!.review, employeeId: 'E', locationId: 'loc-1', weekStart: week, date: week, startTime: '08:00', endTime: '12:00', positionId: 'barista', isDesignatedLead: false, actorEmployeeId: 'M', proof }, db.executor);
    expect(deriveCoverageRepair(await source(), locator, true).status).toBe('RESOLVED');
  });

  it('BA-MGR baseline action rejects stale repair context with zero application writes', async () => {
    const r = await prepare(); await q("UPDATE location_staffing_settings SET minimum_staff_per_shift=3 WHERE location_id='loc-1'"); const before = await oracle();
    const actual = await outcome(createShiftAction(r.form));
    console.info(JSON.stringify({ case: 'actual-stale-repair-action', result: actual.value ?? { destination: actual.error?.destination, name: actual.error?.name, code: actual.error?.code, message: actual.error?.message, stack: actual.error?.stack }, noBusinessDelta: JSON.stringify(await oracle()) === JSON.stringify(before) }));
    expect(actual.value).toMatchObject({ issueCode: 'COVERAGE_REVIEW_STALE' }); expect(await oracle()).toEqual(before);
  });
});
