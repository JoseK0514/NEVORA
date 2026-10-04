import { Client } from 'pg';
import { expect, it, vi } from 'vitest';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';
import { createDisposableFoundationDatabase } from './local-postgres';
import { withOwnedTestResources } from './owned-test-resources';

// Keep action, civil conversion, repository, SQL guards and PostgreSQL real.
// Only Next request context and the SQL transport are supplied by this fixture.
const transport = vi.hoisted(() => ({ executor: null as SqlExecutor | null }));
vi.mock('../../lib/db', () => {
  const statement = (text: string, values: readonly unknown[] = []) => ({
    statement: { text, values },
    then: (yes: (rows: unknown[]) => unknown, no: (error: unknown) => unknown) => transport.executor!.query({ text, values }).then(yes, no),
  });
  const tagged = Object.assign((strings: TemplateStringsArray, ...values: unknown[]) => statement(strings.reduce((text, part, index) => text + (index ? '$' + index : '') + part, ''), values), {
    query: statement,
    transaction: (queries: { statement: SqlStatement }[]) => transport.executor!.transaction(queries.map(query => query.statement)),
  });
  return { getDb: () => tagged, queryRows: (result: unknown) => Array.isArray(result) ? result : [] };
});
vi.mock('../../lib/auth/session', () => ({ requireSession: async () => ({ id: 'manager', role: 'MANAGER' }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('next/navigation', () => ({ redirect: (destination: string) => { throw Object.assign(new Error('redirect'), { destination }); } }));
import { setAvailabilityDeadlineAction } from '../../app/app/schedule/actions';
import { setAvailabilityDeadline } from '../../lib/data/week-settings';
import { getWorkspace, saveWorkspaceProfile, WorkspaceTimezoneLockedError } from '../../lib/data/workspaces';

const week = '2030-10-07';
function form(local = '2030-10-06T09:00') {
  const data = new FormData(); data.set('weekStart', week); data.set('availabilityDeadline', local); return data;
}
async function fixture() {
  const database = await createDisposableFoundationDatabase({ mode: 'current-runtime' });
  try {
    await database.executor.query({ text: `UPDATE workspaces SET time_zone='America/New_York';
      INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES
      ('owner','Test','Owner','555','OWNER','loc-1'),('manager','Test','Manager','556','MANAGER','loc-1');
      INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('normal','manager',1,'08:00','12:00');
      INSERT INTO notifications(id,employee_id,type,title,body,source_kind,source_id,source_version,push_state,environment,effective_version,purpose,due_at,expires_at,urgency,event_key)
      VALUES('reminder','manager','TEST','Test','Test','AVAILABILITY','2030-10-07','old','pending','test','old','REMINDER','2030-10-01T12:00Z','2030-10-06T12:00Z','normal','fixture-reminder');`, values: [] });
    transport.executor = database.executor;
    return database;
  } catch (error) { await database.dispose(); throw error; }
}
async function noWrite(db: SqlExecutor) {
  expect(await db.query({ text: 'SELECT * FROM schedule_week_settings', values: [] })).toEqual([]);
  expect(await db.query({ text: 'SELECT * FROM weekly_availability_windows', values: [] })).toEqual([]);
  expect(await db.query({ text: "SELECT push_state FROM notifications WHERE id='reminder'", values: [] })).toEqual([{ push_state: 'pending' }]);
}
it('deadline action rejects a timezone edit between conversion read and repository guard without seed/cancellation writes', async () => {
  const database = await fixture(); const db = database.executor;
  try {
    let read = false;
    transport.executor = { transaction: db.transaction, query: async <T>(statement: SqlStatement) => {
      const result = await db.query<T>(statement);
      if (!read && statement.text.includes('FROM workspaces')) {
        read = true;
        await saveWorkspaceProfile({ name: 'Edited', timeZone: 'Asia/Tokyo', actorEmployeeId: 'owner' }, db);
      }
      return result;
    } };
    await expect(setAvailabilityDeadlineAction(form())).rejects.toMatchObject({ destination: '/app/schedule?week=2030-10-07&error=DEADLINE_WORKSPACE_CHANGED&availabilityDeadline=2030-10-06T09%3A00' });
    await noWrite(db);
    expect((await getWorkspace(db)).timeZone).toBe('Asia/Tokyo');
  } finally { await database.dispose(); }
});
it('deadline action commits first and blocks the racing timezone edit until its first operational write exists', async () => {
  await withOwnedTestResources(async defer => {
    const database = await fixture(); defer(() => database.dispose()); const db = database.executor;
    const writer = new Client({ connectionString: database.connectionString, statement_timeout: 5000 }); defer(() => writer.end());
    const editor = new Client({ connectionString: database.connectionString, statement_timeout: 5000 }); defer(() => editor.end());
    await writer.connect(); await editor.connect();
    let release!: () => void; const released = new Promise<void>(resolve => { release = resolve; });
    let reached!: () => void; const barrier = new Promise<void>(resolve => { reached = resolve; });
    const execute = async (client: Client, statements: readonly SqlStatement[], pause = false) => {
      await client.query('BEGIN');
      try { const results = []; for (const statement of statements) {
        results.push((await client.query(statement.text, [...statement.values])).rows);
        if (pause && statement.text.includes('AS workspace_guard')) { reached(); await released; }
      } await client.query('COMMIT'); return results; }
      catch (error) { await client.query('ROLLBACK'); throw error; }
    };
    transport.executor = { query: db.query, transaction: statements => execute(writer, statements, true) };
    const editorExecutor: SqlExecutor = { query: db.query, transaction: statements => execute(editor, statements) };
    let write: Promise<unknown> | undefined, edit: Promise<unknown> | undefined;
    defer(() => edit); defer(() => write); defer(release);
    write = setAvailabilityDeadlineAction(form()).catch(error => error);
    await Promise.race([barrier, write.then(() => { throw new Error('Missed writer barrier'); })]);
    const pid = (await editor.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    edit = saveWorkspaceProfile({ name: 'Edited', timeZone: 'Asia/Tokyo', actorEmployeeId: 'owner' }, editorExecutor).catch(error => error);
    let blocked = false;
    for (let attempt = 0; attempt < 100 && !blocked; attempt++) blocked = (await db.query<{ blocked: boolean }>({ text: 'SELECT cardinality(pg_blocking_pids($1))>0 AS blocked', values: [pid] }))[0].blocked;
    expect(blocked).toBe(true); release();
    expect(await write).toMatchObject({ destination: '/app/schedule?week=2030-10-07&deadlineSaved=1' });
    expect(await edit).toBeInstanceOf(WorkspaceTimezoneLockedError);
    expect((await getWorkspace(db)).timeZone).toBe('America/New_York');
    expect(await db.query({ text: 'SELECT availability_deadline FROM schedule_week_settings', values: [] })).toEqual([{ availability_deadline: new Date('2030-10-06T13:00:00Z') }]);
    expect(await db.query({ text: 'SELECT employee_id FROM weekly_availability_windows', values: [] })).toEqual([{ employee_id: 'manager' }]);
    expect(await db.query({ text: "SELECT push_state FROM notifications WHERE id='reminder'", values: [] })).toEqual([{ push_state: 'cancelled' }]);
  });
});
it('unchanged workspace saves civil time, explicit UTC stays absolute, and clear removes the deadline', async () => {
  const database = await fixture(); const db = database.executor;
  try {
    await expect(setAvailabilityDeadlineAction(form())).rejects.toMatchObject({ destination: '/app/schedule?week=2030-10-07&deadlineSaved=1' });
    expect(await db.query({ text: 'SELECT availability_deadline FROM schedule_week_settings', values: [] })).toEqual([{ availability_deadline: new Date('2030-10-06T13:00:00Z') }]);
    await setAvailabilityDeadline({ weekStart: week, deadlineIso: '2030-10-06T09:00:00Z', updatedBy: 'manager' });
    expect(await db.query({ text: 'SELECT availability_deadline FROM schedule_week_settings', values: [] })).toEqual([{ availability_deadline: new Date('2030-10-06T09:00:00Z') }]);
    await expect(setAvailabilityDeadlineAction(form(''))).rejects.toMatchObject({ destination: '/app/schedule?week=2030-10-07&deadlineSaved=1' });
    expect(await db.query({ text: 'SELECT availability_deadline FROM schedule_week_settings', values: [] })).toEqual([{ availability_deadline: null }]);
  } finally { await database.dispose(); }
});
it.each(['2030-11-03T01:30','2030-03-10T02:30','2030-02-30T09:00'])('invalid deadline %s preserves civil input with no writes', async local => {
  const database = await fixture();
  try {
    await expect(setAvailabilityDeadlineAction(form(local))).rejects.toMatchObject({ destination: `/app/schedule?week=${week}&error=INVALID_DEADLINE&availabilityDeadline=${encodeURIComponent(local)}` });
    await noWrite(database.executor);
  } finally { await database.dispose(); }
});
it('late deadline cancellation failure rolls back the deadline and seeded availability together', async () => {
  const database = await fixture(); const db = database.executor;
  try {
    transport.executor = { query: db.query, transaction: statements => db.transaction([...statements, { text: 'SELECT 1/0', values: [] }]) };
    await expect(setAvailabilityDeadlineAction(form())).rejects.toMatchObject({ code: '22012' });
    await noWrite(db);
  } finally { await database.dispose(); }
});
