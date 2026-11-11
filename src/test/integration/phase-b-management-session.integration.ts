import { createHash } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';

const context = vi.hoisted(() => ({ executor: null as SqlExecutor | null, cookies: new Map<string, string>() }));
vi.mock('@/lib/db', () => {
  const statement = (text: string, values: readonly unknown[] = []) => ({ statement: { text, values }, then: (yes: (rows: unknown[]) => unknown, no: (error: unknown) => unknown) => context.executor!.query({ text, values }).then(yes, no) });
  const tagged = Object.assign((strings: TemplateStringsArray, ...values: unknown[]) => statement(strings.reduce((text, part, index) => text + (index ? '$' + index : '') + part, ''), values), {
    query: statement, transaction: (queries: { statement: SqlStatement }[]) => context.executor!.transaction(queries.map(query => query.statement)),
  });
  return { getDb: () => tagged, queryRows: (rows: unknown) => rows };
});
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (name: string) => context.cookies.has(name) ? { value: context.cookies.get(name)! } : undefined }) }));
vi.mock('@/lib/data/notification-transactions', async original => ({ ...await original<Record<string, unknown>>(), neonNotificationExecutor: () => context.executor! }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (destination: string) => { throw Object.assign(new Error('redirect'), { destination }); } }));
import { createDisposableFoundationDatabase } from './local-postgres';
import {installFixtureCompanyAccess} from './fixture-company-access';
import * as actions from '../../app/app/settings/actions';
import { createShiftAction, setAvailabilityDeadlineAction } from '../../app/app/schedule/actions';
import type { GenerationSource } from '../../lib/data/generation-guards';

const businessMutation = (statements: readonly SqlStatement[]) => statements.some(statement => /^\s*(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b/.test(statement.text));

const cases = [
  { key: 'createLocation', action: actions.createLocationAction, form: { name: 'Revoked Location', shortName: 'Revoked', clockerKey: 'revoked-location' }, sql: "SELECT id FROM locations WHERE clocker_key='revoked-location'" },
  { key: 'updateLocation', action: actions.updateLocationAction, form: { id: 'loc-1', name: 'Revoked Location', shortName: 'Revoked', active: 'on' }, sql: "SELECT id FROM locations WHERE id='loc-1' AND name='Revoked Location'" },
  { key: 'createPosition', action: actions.createPositionAction, form: { name: 'Revoked Position' }, sql: "SELECT id FROM positions WHERE name='Revoked Position'" },
  { key: 'updatePosition', action: actions.updatePositionAction, form: { id: 'p1', name: 'Revoked Position', active: 'on' }, sql: "SELECT id FROM positions WHERE id='p1' AND name='Revoked Position'" },
  { key: 'saveWorkspace', action: actions.saveWorkspaceProfileAction, form: { name: 'Revoked Workspace', timeZone: 'America/Puerto_Rico' }, sql: "SELECT id FROM workspaces WHERE name='Revoked Workspace'" },
  { key: 'setAvailabilityDeadline', action: setAvailabilityDeadlineAction, form: { weekStart: '2030-10-07', availabilityDeadline: '' }, sql: "SELECT week_start FROM schedule_week_settings WHERE week_start='2030-10-07'" },
];
it.each(cases)('actual $key action rejects a session revoked after entry authorization', async test => {
  const db = await createDisposableFoundationDatabase({ mode: 'current-runtime' }); context.executor = db.executor; context.cookies.clear();
  try {
    await db.executor.query({ text: "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner','Fictional','Owner','5550000001','OWNER','loc-1'); INSERT INTO positions(id,workspace_id,name) VALUES('p1','workspace-fuel','Original Position');", values: [] });
    const token = 'owned-phase-b-owner-session', hash = createHash('sha256').update(token).digest('hex');
    await db.executor.query({ text: "INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'owner',clock_timestamp()+interval '1 day')", values: [hash] });
    await installFixtureCompanyAccess(db.executor);
    context.cookies.set('fuel_session', token);
    const reviewedVersion = test.key === 'updateLocation'
      ? (await db.executor.query<{ updatedAt: string }>({ text: "SELECT updated_at::text AS \"updatedAt\" FROM locations WHERE id='loc-1'", values: [] }))[0].updatedAt
      : test.key === 'updatePosition'
        ? (await db.executor.query<{ updatedAt: string }>({ text: "SELECT updated_at::text AS \"updatedAt\" FROM positions WHERE id='p1'", values: [] }))[0].updatedAt
        : undefined;
    let revoked = false, mutationAttempts = 0, sqlDenial: unknown;
    context.executor = { query: db.executor.query, transaction: async (statements, signal) => {
      const mutation = businessMutation(statements);
      if (mutation) mutationAttempts++;
      // Revoke after action proof/validation, at the guarded write batch.
      if (mutation && !revoked) { revoked = true; await db.executor.query({ text: 'DELETE FROM employee_sessions WHERE token_hash=$1', values: [hash] }); }
      try { return await db.executor.transaction(statements, signal); }
      catch (error) { if (mutation) sqlDenial = error; throw error; }
    } };
    const data = new FormData(); for (const [key, value] of Object.entries(test.form)) data.set(key, String(value));
    if (reviewedVersion) data.set('expectedUpdatedAt', reviewedVersion);
    data.set('actorEmployeeId', 'FORGED'); data.set('sessionTokenHash', 'FORGED');
    let result: unknown; try { result = await test.action(data); } catch (error) { result = error; }
    expect(revoked).toBe(true);
    expect(mutationAttempts).toBe(1);
    expect(sqlDenial).toMatchObject({code:'22P02',message:expect.stringMatching(/(?:management|operational)_authorization/)});
    expect(await db.executor.query({ text: test.sql, values: [] })).toEqual([]);
    expect(result).not.toMatchObject({ success: expect.any(String) });
    expect(await db.executor.query({ text: 'SELECT employee_id FROM employee_sessions', values: [] })).toEqual([]);
  } finally { context.executor = db.executor; await db.dispose(); }
});

it.each(['overlap', 'approved-time-off'])('actual manual assignment rejects newly committed %s in another final-write snapshot', async change => {
  const db = await createDisposableFoundationDatabase({ mode: 'current-runtime' }); context.executor = db.executor; context.cookies.clear();
  try {
    await db.executor.query({ text: `INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner','Fictional','Owner','5550000001','OWNER','loc-1'),('WORKER','Fictional','Worker','5550000002','EMPLOYEE','loc-1');
      INSERT INTO employee_location_eligibility VALUES('WORKER','loc-1'),('WORKER','loc-2');
      INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('normal','WORKER',1,'08:00','20:00');
      INSERT INTO schedules(id,location_id,week_start,created_by,status) VALUES('schedule','loc-1','2030-10-07','owner','DRAFT'),('other','loc-2','2030-10-07','owner','DRAFT');`, values: [] });
    const token = 'owned-phase-b-owner-session', hash = createHash('sha256').update(token).digest('hex');
    await db.executor.query({ text: "INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'owner',clock_timestamp()+interval '1 day')", values: [hash] });
    context.cookies.set('fuel_session', token);
    await installFixtureCompanyAccess(db.executor);
    let injected = false, writeAttempts = 0;
    const snapshots: GenerationSource[] = [], conflicts: unknown[] = [];
    const history = await db.executor.query({text:'SELECT id FROM schedule_publication_revisions ORDER BY id',values:[]});
    const notices = await db.executor.query({text:'SELECT id FROM notifications ORDER BY id',values:[]});
    context.executor = { query: async <T>(statement:SqlStatement,signal?:AbortSignal) => {
      const rows = await db.executor.query<T>(statement,signal);
      if(statement.text.includes(' AS state, clock_timestamp()::text AS read_at')) snapshots.push((rows[0] as {source:GenerationSource}).source);
      return rows;
    }, transaction: async (statements, signal) => {
      const assignment = statements.some(statement => /^INSERT INTO shifts\b/.test(statement.text));
      if(assignment)writeAttempts++;
      // The first real write is already planned against a clean snapshot. A
      // separately committed conflict must abort its source guard and force retry.
      if (assignment && !injected) { injected = true; await db.executor.query({ text: change === 'overlap'
        ? "INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('concurrent','other','WORKER','2030-10-07','08:00','16:00')"
        : "INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reviewed_by) VALUES('concurrent','WORKER','2030-10-07','2030-10-07','APPROVED','owner')", values: [] }); }
      try { return await db.executor.transaction(statements, signal); }
      catch(error){if(assignment)conflicts.push(error);throw error;}
    } };
    const data = new FormData(); for (const [key, value] of Object.entries({ weekStart: '2030-10-07', employeeId: 'WORKER', locationId: 'loc-1', date: '2030-10-07', startTime: '10:00', endTime: '12:00' })) data.set(key, value);
    const result = await createShiftAction(data);
    expect(injected).toBe(true);
    expect(writeAttempts).toBe(1);
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].shifts).toEqual([]);
    expect(snapshots[0].time_off_requests).toEqual([]);
    expect(conflicts).toEqual([expect.objectContaining({code:'22P02',message:expect.stringContaining('generation_source_conflict')})]);
    expect(change==='overlap'?snapshots[1].shifts:snapshots[1].time_off_requests).toEqual([expect.objectContaining({id:'concurrent'})]);
    expect(result).toMatchObject({issueCode:change==='overlap'?'SHIFT_OVERLAP':'APPROVED_TIME_OFF'});
    expect(await db.executor.query({ text: "SELECT id FROM shifts WHERE schedule_id='schedule'", values: [] })).toEqual([]);
    expect(await db.executor.query({text:'SELECT id FROM schedule_publication_revisions ORDER BY id',values:[]})).toEqual(history);
    expect(await db.executor.query({text:'SELECT id FROM notifications ORDER BY id',values:[]})).toEqual(notices);
  } finally { context.executor = db.executor; await db.dispose(); }
});
