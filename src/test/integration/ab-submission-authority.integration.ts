// Real action/SQL regressions. Only framework context/transport is adapted.
import { createHash } from 'node:crypto';
import { Client } from 'pg';
import { beforeAll, afterAll, beforeEach, it, expect, vi } from 'vitest';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';
const context = vi.hoisted(() => ({ executor: null as SqlExecutor | null, cookie: '' }));
vi.mock('@/lib/db', () => {
  const statement = (text: string, values: readonly unknown[] = []) => ({ statement: { text, values }, then: (yes: (r: unknown[]) => unknown, no: (e: unknown) => unknown) => context.executor!.query({ text, values }).then(yes, no) });
  const tagged = Object.assign((strings: TemplateStringsArray, ...values: unknown[]) => statement(strings.reduce((t, p, i) => t + (i ? '$' + i : '') + p, ''), values), {
    query: statement, transaction: (queries: { statement: SqlStatement }[]) => context.executor!.transaction(queries.map(q => q.statement)),
  });
  return { getDb: () => tagged, queryRows: (r: unknown) => r };
});
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (n: string) => n === 'fuel_session' ? { value: context.cookie } : undefined }) }));
vi.mock('@/lib/data/notification-transactions', async original => ({ ...await original<Record<string, unknown>>(), neonNotificationExecutor: () => context.executor! }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (destination: string) => { throw Object.assign(new Error('redirect'), { destination }); } }));
import { createDisposableFoundationDatabase } from './local-postgres';
import { saveAvailabilityAction, saveWeeklyAvailabilityAction } from '../../app/app/availability/actions';
import { requestTimeOffAction } from '../../app/app/requests/actions';
import { saveTemplateAction, archiveTemplateAction } from '../../app/app/schedule/templates/actions';

let db: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const q = <T = Record<string, unknown>>(text: string, values: readonly unknown[] = []) => db.executor.query<T>({ text, values });
const token = 'fictional-ab-remediation-session';
const hash = createHash('sha256').update(token).digest('hex');
const workflows = [
  { name: 'normal availability', action: saveAvailabilityAction, role: 'EMPLOYEE', table: 'availability_windows', form: { 'available-1': 'on', 'start-1': '08:00', 'end-1': '12:00' }, success: 'saved=1' },
  { name: 'weekly availability', action: saveWeeklyAvailabilityAction, role: 'EMPLOYEE', table: 'weekly_availability_submissions', form: { weekStart: '2030-10-07', 'available-1': 'on', 'start-1': '08:00', 'end-1': '12:00', changedDays: '1' }, success: 'saved=1' },
  { name: 'Time Off', action: requestTimeOffAction, role: 'EMPLOYEE', table: 'time_off_requests', form: { requestId: 'cf1aa1a1-2ad2-4b12-a990-93da17e8c319', startDate: '2030-10-07', endDate: '2030-10-07', reason: 'Fictional leave' }, success: 'submitted=1' },
  { name: 'template save', action: saveTemplateAction, role: 'MANAGER', table: 'schedule_templates', form: { name: 'Fictional remediation template', weekStart: '2030-10-07' }, success: 'saved=1' },
  { name: 'template archive', action: archiveTemplateAction, role: 'MANAGER', table: 'schedule_templates', form: { templateId: 'ab-template', weekStart: '2030-10-07' }, success: 'archived=1' },
] as const;
const businessTables = ['availability_windows', 'weekly_availability_windows', 'weekly_availability_submissions', 'availability_exceptions', 'time_off_requests', 'schedule_templates', 'schedule_template_shifts', 'notifications', 'push_deliveries'] as const;
async function snapshot() {
  return Object.fromEntries(await Promise.all(businessTables.map(async table => [table, await q(`SELECT to_jsonb(r) AS row FROM ${table} r ORDER BY to_jsonb(r)::text`)])));
}
function form(values: Record<string, string>) { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; }
async function outcome(workflow: typeof workflows[number]) { try { await workflow.action(form(workflow.form)); return undefined; } catch (error) { return error; } }
function destination(result: unknown) { return result && typeof result === 'object' && 'destination' in result ? String(result.destination) : String(result); }
beforeAll(async () => { db = await createDisposableFoundationDatabase({ mode: 'current-runtime' }); });
afterAll(async () => { context.executor = db?.executor; await db?.dispose(); });
beforeEach(async () => {
  await q('TRUNCATE employees,schedules,notifications RESTART IDENTITY CASCADE');
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('ab-actor','Fictional','Actor','NONE','EMPLOYEE','loc-1'),('ab-manager','Fictional','Manager','NONE','MANAGER','loc-1'); INSERT INTO employee_location_eligibility SELECT id,'loc-1' FROM employees; INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('ab-existing','ab-actor',1,'10:00','11:00'); INSERT INTO schedule_templates(id,name,created_by) VALUES('ab-template','Fictional retained template','ab-manager')");
  await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'ab-actor',clock_timestamp()+interval '1 day')", [hash]);
  context.executor = db.executor; context.cookie = token;
});

// Removing a writer's proof/role/final guard must make these tests fail by a
// persisted business or outbox change. Only framework context/transport is adapted.
for (const workflow of workflows) for (const change of ['revoke', 'expire', 'deactivate', 'change-role', 'valid'] as const) {
  it(`${workflow.name} ${change}: current authority is enforced at transaction entry`, async () => {
    await q('UPDATE employees SET role=$1 WHERE id=$2', [workflow.role, 'ab-actor']);
    const before = await snapshot(); let injected = false;
    const mutateAuthority = async () => {
      if (injected) return; injected = true;
      if (change === 'revoke') await q('DELETE FROM employee_sessions WHERE token_hash=$1', [hash]);
      if (change === 'expire') await q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1", [hash]);
      if (change === 'deactivate') await q("UPDATE employees SET active=false WHERE id='ab-actor'");
      if (change === 'change-role') await q('UPDATE employees SET role=$1 WHERE id=$2', [workflow.role === 'MANAGER' ? 'EMPLOYEE' : 'MANAGER', 'ab-actor']);
    };
    context.executor = {
      transaction: async statements => { await mutateAuthority(); return db.executor.transaction(statements); },
      query: async <T>(statement: SqlStatement) => {
        // The original archive path is a standalone UPDATE; the corrected path
        // must instead transact proof checks with this business mutation.
        if (/^\s*UPDATE schedule_templates/i.test(statement.text)) await mutateAuthority();
        return db.executor.query<T>(statement);
      },
    };
    const result = await outcome(workflow);
    expect(injected).toBe(true);
    if (change === 'valid') { expect(destination(result)).toContain(workflow.success); expect(await snapshot()).not.toEqual(before); }
    else { expect(destination(result)).not.toContain(workflow.success); expect(await snapshot()).toEqual(before); }
  });
}

for (const workflow of workflows) for (const expires of [false, true]) {
  it(`${workflow.name}: ${expires ? 'natural late expiry rolls back all effects' : 'valid late wait commits'}`, async () => {
    await q('UPDATE employees SET role=$1 WHERE id=$2', [workflow.role, 'ab-actor']);
    await q(`CREATE FUNCTION ab_late_wait() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(8265161); IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END $$; CREATE TRIGGER ab_late_wait BEFORE INSERT OR UPDATE OR DELETE ON ${workflow.table} FOR EACH ROW EXECUTE FUNCTION ab_late_wait()`);
    const before = await snapshot();
    const blocker = new Client({ connectionString: db.connectionString, statement_timeout: 5000 });
    const worker = new Client({ connectionString: db.connectionString, statement_timeout: 5000 });
    let pending: Promise<unknown> | undefined; let prepared = false;
    let queue = Promise.resolve();
    const workerQuery = <T>(statement: SqlStatement) => { const run = queue.then(async () => (await worker.query(statement.text, [...statement.values])).rows as T[]); queue = run.then(() => {}, () => {}); return run; };
    const prepare = async () => { if (prepared) return; prepared = true; if (expires) await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1200 milliseconds' WHERE token_hash=$1", [hash]); };
    try {
      await blocker.connect(); await worker.connect(); await blocker.query('BEGIN'); await blocker.query('SELECT pg_advisory_xact_lock(8265161)');
      const pid = Number((await worker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);
      context.executor = {
        query: async <T>(statement: SqlStatement) => { if (/^\s*UPDATE schedule_templates/i.test(statement.text)) await prepare(); return workerQuery<T>(statement); },
        transaction: async statements => { await prepare(); await worker.query('BEGIN'); try { const rows: unknown[][] = []; for (const statement of statements) rows.push((await worker.query(statement.text, [...statement.values])).rows); await worker.query('COMMIT'); return rows; } catch (error) { await worker.query('ROLLBACK'); throw error; } },
      };
      pending = outcome(workflow);
      let blocked = false;
      for (let n = 0; n < 250; n += 1) {
        const [row] = await q<{ blocked: boolean; statement: string }>('SELECT cardinality(pg_blocking_pids(pid))>0 AS blocked,query AS statement FROM pg_stat_activity WHERE pid=$1', [pid]);
        if (row?.blocked && row.statement.toLowerCase().includes(workflow.table) && !row.statement.includes('LOCK TABLE')) { blocked = true; break; }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(blocked, 'Action reached real late DML wait').toBe(true);
      if (expires) {
        await q("SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.05) FROM employee_sessions WHERE token_hash=$1", [hash]);
        expect(await q('SELECT expires_at<=clock_timestamp() AS expired FROM employee_sessions WHERE token_hash=$1', [hash])).toEqual([{ expired: true }]);
      }
      await blocker.query('ROLLBACK'); const result = await pending;
      if (expires) { expect(destination(result)).not.toContain(workflow.success); expect(await snapshot()).toEqual(before); }
      else { expect(destination(result)).toContain(workflow.success); expect(await snapshot()).not.toEqual(before); }
    } finally {
      await blocker.query('ROLLBACK').catch(() => {}); await pending;
      context.executor = db.executor; await worker.end(); await blocker.end();
      await q(`DROP TRIGGER IF EXISTS ab_late_wait ON ${workflow.table}; DROP FUNCTION IF EXISTS ab_late_wait()`);
    }
  });
}

it.each(['revoke', 'expire', 'valid'] as const)('Time Off exact retry receipt: %s authority during acknowledgment', async change => {
  const workflow = workflows[2];
  expect(destination(await outcome(workflow))).toContain('submitted=1');
  const before = await snapshot(); let transactions = 0, injected = false;
  const changeAuthority = async () => { if (injected) return; injected = true; if (change === 'revoke') await q('DELETE FROM employee_sessions WHERE token_hash=$1', [hash]); if (change === 'expire') await q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1", [hash]); };
  context.executor = {
    transaction: async statements => { transactions += 1; if (transactions === 2) await changeAuthority(); return db.executor.transaction(statements); },
    query: async <T>(statement: SqlStatement) => { if (statement.text.startsWith('SELECT id FROM time_off_requests WHERE id=$1 AND employee_id=$2')) await changeAuthority(); return db.executor.query<T>(statement); },
  };
  const result = await outcome(workflow);
  expect(injected).toBe(true);
  if (change === 'valid') expect(destination(result)).toContain('submitted=1');
  else expect(destination(result)).not.toContain('submitted=1');
  expect(await snapshot()).toEqual(before);
});
