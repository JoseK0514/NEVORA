import { Client } from 'pg';
import { expect, it, vi } from 'vitest';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';
import type { SessionMutationProof } from '../../lib/shift-changes/types';

// Framework SQL transport only; product repositories, guards, planner and SQL are real.
const context = vi.hoisted(() => ({ executor: null as SqlExecutor | null }));
vi.mock('@/lib/db', () => {
  const statement = (text: string, values: readonly unknown[] = []) => ({ statement: { text, values }, then: (yes: (rows: unknown[]) => unknown, no: (error: unknown) => unknown) => context.executor!.query({ text, values }).then(yes, no) });
  const tagged = Object.assign((strings: TemplateStringsArray, ...values: unknown[]) => statement(strings.reduce((text, part, index) => text + (index ? '$' + index : '') + part, ''), values), {
    query: statement, transaction: (queries: { statement: SqlStatement }[]) => context.executor!.transaction(queries.map(query => query.statement)),
  });
  return { getDb: () => tagged, queryRows: (rows: unknown) => rows };
});
vi.mock('@/lib/data/notification-transactions', async original => ({ ...await original<Record<string, unknown>>(), neonNotificationExecutor: () => context.executor! }));
import { createDisposableFoundationDatabase } from './local-postgres';
import {installFixtureCompanyAccess} from './fixture-company-access';
import { ensureSchedule, insertShift, updateShift, deleteShift } from '../../lib/data/schedules';
import { publishScheduleWithRevision } from '../../lib/data/publication-revisions';
import { reviewTimeOffRequest } from '../../lib/data/requests';
import { setAvailabilityDeadline } from '../../lib/data/week-settings';
import { generateWeekDraft } from '../../lib/data/schedule-generation';
import { clearGenerationExclusion, deleteGeneratedDraftShift } from '../../lib/data/generation-exclusions';
import { readGenerationSource } from '../../lib/data/generation-guards';

const proof: SessionMutationProof = { employee: { id: 'fr-owner', firstName: 'Owner', lastName: 'QA', role: 'OWNER', primaryLocationId: 'loc-1' }, sessionTokenHash: 'e'.repeat(64) };
const request = { workspaceId: 'workspace-fuel', actorEmployeeId: 'fr-owner', weekStart: '2030-10-07', mode: 'BUILD_WEEK' as const, locationScope: { kind: 'SELECTED' as const, locationIds: ['loc-1'] }, proof };
const scenarios = ['schedule-create', 'shift-create', 'shift-update', 'shift-delete', 'publish', 'time-off', 'deadline', 'generate', 'fill-gaps', 'delete-generated', 'clear-exclusion'] as const;

for (const scenario of scenarios) for (const expires of [false, true]) {
  it(`${scenario}: ${expires ? 'rolls back expired authority and all side records' : 'retains valid behavior'} after late DML blocks`, async () => {
    const db = await createDisposableFoundationDatabase({ mode: 'current-runtime' });
    context.executor = db.executor;
    const q = <T = Record<string, unknown>>(text: string, values: readonly unknown[] = []) => db.executor.query<T>({ text, values });
    const blocker = new Client({ connectionString: db.connectionString, statement_timeout: 5000 });
    const worker = new Client({ connectionString: db.connectionString, statement_timeout: 5000 });
    let pending: Promise<{ value?: unknown; error?: unknown }> | undefined;
    try {
      await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES
        ('fr-owner','Owner','QA','5550000001','OWNER','loc-1'),('fr-worker','Worker','QA','5550000002','EMPLOYEE','loc-1');
        INSERT INTO employee_location_eligibility VALUES('fr-worker','loc-1');
        INSERT INTO availability_windows VALUES('fr-window','fr-worker',1,'08:00','12:00');
        UPDATE location_staffing_settings SET minimum_staff_per_shift=1,requires_designated_lead=false;
        INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('fr-coverage','loc-1',1,'08:00','12:00');
        INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status) VALUES('fr-leave','fr-worker','2030-11-01','2030-11-01','PENDING');`);
      await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'fr-owner',clock_timestamp()+interval '1 day')", [proof.sessionTokenHash]);
      await installFixtureCompanyAccess(db.executor);
      let scheduleId = '', shiftId = '', exclusionId = '';
      if (['shift-create','shift-update','shift-delete','publish'].includes(scenario)) {
        scheduleId = await ensureSchedule({ locationId: 'loc-1', weekStart: request.weekStart, createdBy: 'fr-owner', proof }, db.executor);
        if (scenario !== 'shift-create') {
          await insertShift({ scheduleId, employeeId: 'fr-worker', date: request.weekStart, startTime: '08:00', endTime: '10:00', actorEmployeeId: 'fr-owner', proof }, db.executor);
          shiftId = String((await q('SELECT id FROM shifts'))[0].id);
        }
      }
      if (['delete-generated','clear-exclusion'].includes(scenario)) {
        await generateWeekDraft(request, db.executor);
        shiftId = String((await q('SELECT id FROM shifts'))[0].id);
        if (scenario === 'clear-exclusion') exclusionId = (await deleteGeneratedDraftShift({ ...request, locationId: 'loc-1', shiftId }, db.executor)).exclusionId!;
      }
      const table = scenario === 'publish' ? 'schedule_publication_revisions' : scenario === 'time-off' ? 'time_off_requests'
        : scenario === 'deadline' ? 'schedule_week_settings' : ['delete-generated','clear-exclusion'].includes(scenario) ? 'schedule_generation_exclusions'
          : scenario === 'schedule-create' ? 'schedules' : 'shifts';
      // Test-only trigger supplies a genuine late write wait even with broad source locks.
      // It changes no row or policy and holds no production resource.
      await q(`CREATE FUNCTION fr_late_wait() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        PERFORM pg_advisory_xact_lock(8265140); IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END $$;
        CREATE TRIGGER fr_late_wait BEFORE INSERT OR UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION fr_late_wait();`);
      const snapshot = async () => ({ source: (await readGenerationSource(db.executor)).source,
        notifications: await q('SELECT to_jsonb(n) AS row FROM notifications n ORDER BY id'),
        deliveries: await q('SELECT to_jsonb(d) AS row FROM push_deliveries d ORDER BY id') });
      const before = await snapshot();
      await blocker.connect(); await worker.connect();
      await blocker.query('BEGIN'); await blocker.query('SELECT pg_advisory_xact_lock(8265140)');
      const pid = Number((await worker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);
      const executor: SqlExecutor = {
        query: async <T>(s: SqlStatement) => (await worker.query(s.text, [...s.values])).rows as T[],
        transaction: async statements => {
          if (expires) await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1200 milliseconds' WHERE token_hash=$1", [proof.sessionTokenHash]);
          await worker.query('BEGIN');
          try { const rows: unknown[][] = []; for (const s of statements) rows.push((await worker.query(s.text, [...s.values])).rows); await worker.query('COMMIT'); return rows; }
          catch (error) { await worker.query('ROLLBACK'); throw error; }
        },
      };
      context.executor = executor;
      const action = () => {
        if (scenario === 'schedule-create') return ensureSchedule({ locationId: 'loc-1', weekStart: request.weekStart, createdBy: 'fr-owner', proof }, executor);
        if (scenario === 'shift-create') return insertShift({ scheduleId, employeeId: 'fr-worker', date: request.weekStart, startTime: '08:00', endTime: '10:00', actorEmployeeId: 'fr-owner', proof }, executor);
        if (scenario === 'shift-update') return updateShift({ shiftId, employeeId: 'fr-worker', date: request.weekStart, startTime: '09:00', endTime: '11:00', actorEmployeeId: 'fr-owner', proof }, executor);
        if (scenario === 'shift-delete') return deleteShift(shiftId, proof, executor);
        if (scenario === 'publish') return publishScheduleWithRevision({ locationId: 'loc-1', weekStart: request.weekStart, managerId: 'fr-owner', proof }, executor);
        if (scenario === 'time-off') return reviewTimeOffRequest({ requestId: 'fr-leave', managerId: 'fr-owner', status: 'APPROVED', proof }, executor);
        if (scenario === 'deadline') return setAvailabilityDeadline({ weekStart: request.weekStart, deadlineIso: '2030-10-06T12:00:00Z', updatedBy: 'fr-owner', proof });
        if (scenario === 'generate' || scenario === 'fill-gaps') return generateWeekDraft({ ...request, mode: scenario === 'generate' ? 'BUILD_WEEK' : 'FILL_GAPS_ONLY' }, executor);
        if (scenario === 'delete-generated') return deleteGeneratedDraftShift({ ...request, locationId: 'loc-1', shiftId }, executor);
        return clearGenerationExclusion({ ...request, locationId: 'loc-1', exclusionId }, executor);
      };
      pending = action().then(value => ({ value }), error => ({ error }));
      let observed = false;
      for (let n = 0; n < 250; n++) {
        const [row] = await q<{ blocked: boolean; statement: string }>('SELECT cardinality(pg_blocking_pids(pid))>0 AS blocked,query AS statement FROM pg_stat_activity WHERE pid=$1', [pid]);
        // Poll for matching activity AND live blocking; a cross-statement statistics sample is not yet proof.
        if (row?.blocked && row.statement.toLowerCase().includes(table) && !row.statement.includes('LOCK TABLE')) { observed = true; break; }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(observed, 'Product reaches actual DML after its initial authority guard').toBe(true);
      if (expires) {
        await q("SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.05) FROM employee_sessions WHERE token_hash=$1", [proof.sessionTokenHash]);
        expect(await q('SELECT expires_at<=clock_timestamp() AS expired FROM employee_sessions WHERE token_hash=$1', [proof.sessionTokenHash])).toEqual([{ expired: true }]);
      }
      await blocker.query('ROLLBACK');
      const result = await pending;
      if (expires) { expect(result).toHaveProperty('error'); expect(String(result.error)).toContain('management_authorization'); expect(await snapshot()).toEqual(before); }
      else { expect(result).not.toHaveProperty('error'); expect(await snapshot()).not.toEqual(before); }
    } finally {
      await blocker.query('ROLLBACK').catch(() => {}); await pending;
      context.executor = db.executor; await worker.end(); await blocker.end(); await db.dispose(); context.executor = null;
    }
  });
}
