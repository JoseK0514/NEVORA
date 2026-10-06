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
import * as actions from '../../app/app/settings/actions';
import { createShiftAction, setAvailabilityDeadlineAction } from '../../app/app/schedule/actions';

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
    context.cookies.set('fuel_session', token);
    let revoked = false;
    context.executor = { query: db.executor.query, transaction: async (statements, signal) => {
      if (!revoked) { revoked = true; await db.executor.query({ text: 'DELETE FROM employee_sessions WHERE token_hash=$1', values: [hash] }); }
      return db.executor.transaction(statements, signal);
    } };
    const data = new FormData(); for (const [key, value] of Object.entries(test.form)) data.set(key, String(value));
    data.set('actorEmployeeId', 'FORGED'); data.set('sessionTokenHash', 'FORGED');
    let result: unknown; try { result = await test.action(data); } catch (error) { result = error; }
    expect(revoked).toBe(true);
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
    let injected = false;
    context.executor = { query: db.executor.query, transaction: async (statements, signal) => {
      if (!injected) { injected = true; await db.executor.query({ text: change === 'overlap'
        ? "INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('concurrent','other','WORKER','2030-10-07','08:00','16:00')"
        : "INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reviewed_by) VALUES('concurrent','WORKER','2030-10-07','2030-10-07','APPROVED','owner')", values: [] }); }
      return db.executor.transaction(statements, signal);
    } };
    const data = new FormData(); for (const [key, value] of Object.entries({ weekStart: '2030-10-07', employeeId: 'WORKER', locationId: 'loc-1', date: '2030-10-07', startTime: '10:00', endTime: '12:00' })) data.set(key, value);
    await createShiftAction(data).catch(() => {});
    expect(injected).toBe(true);
    expect(await db.executor.query({ text: "SELECT id FROM shifts WHERE schedule_id='schedule'", values: [] })).toEqual([]);
  } finally { context.executor = db.executor; await db.dispose(); }
});
