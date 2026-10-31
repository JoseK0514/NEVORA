import { Client } from 'pg';
import { expect, it } from 'vitest';
import { createDisposableFoundationDatabase } from './local-postgres';
import {installFixtureCompanyAccess} from './fixture-company-access';
import { updatePosition } from '../../lib/data/positions';
import { updateLocation } from '../../lib/data/locations';
import { saveWorkspaceProfile } from '../../lib/data/workspaces';
import { insertEmployee, updateEmployeeProfile, saveEmployeeSchedulingProfile } from '../../lib/data/employees';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';
import type { SessionMutationProof } from '../../lib/shift-changes/types';

const proof: SessionMutationProof = {
  employee: { id: 'fr-owner', firstName: 'Fictional', lastName: 'Owner', role: 'OWNER', primaryLocationId: 'loc-1' },
  sessionTokenHash: 'd'.repeat(64),
};
const scenarios = ['position-update', 'location-update', 'workspace-update', 'employee-create',
  'employee-profile', 'employee-scheduling', 'self-demotion', 'self-deactivation'] as const;
for (const scenario of scenarios) for (const expires of [false, true]) {
  it(`${scenario}: ${expires ? 'rolls back expiry' : 'preserves valid authority'} after a later business write waits`, async () => {
    const db = await createDisposableFoundationDatabase({ mode: 'current-runtime' });
    const q = <T = Record<string, unknown>>(text: string, values: readonly unknown[] = []) => db.executor.query<T>({ text, values });
    const blocker = new Client({ connectionString: db.connectionString, statement_timeout: 5000 });
    const worker = new Client({ connectionString: db.connectionString, statement_timeout: 5000 });
    let pending: Promise<{ value?: unknown; error?: unknown }> | undefined;
    try {
      await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES
        ('fr-owner','Fictional','Owner','5550000001','OWNER','loc-1'),
        ('fr-owner-2','Second','Owner','5550000002','OWNER','loc-1'),
        ('fr-worker','Worker','QA','5550000003','EMPLOYEE','loc-1');
        INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('fr-owner','loc-1'),('fr-worker','loc-1');
        INSERT INTO positions(id,workspace_id,name) VALUES('fr-position','workspace-fuel','Original position');`);
      await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'fr-owner',clock_timestamp()+interval '1 day')", [proof.sessionTokenHash]);
      await installFixtureCompanyAccess(db.executor);
      const self = scenario.startsWith('self-'), target = self ? 'fr-owner' : 'fr-worker';
      const [reviewed] = await q<{ updatedAt: string }>('SELECT updated_at::text AS "updatedAt" FROM employees WHERE id=$1', [target]);
      const [positionReview] = await q<{ updatedAt: string }>('SELECT updated_at::text AS "updatedAt" FROM positions WHERE id=$1', ['fr-position']);
      const [locationReview] = await q<{ updatedAt: string }>('SELECT updated_at::text AS "updatedAt" FROM locations WHERE id=$1', ['loc-2']);
      const table = scenario === 'position-update' ? 'positions' : scenario === 'location-update' ? 'locations'
        : scenario === 'workspace-update' ? 'workspaces' : scenario === 'employee-scheduling' ? 'employee_positions' : 'employees';
      const expectedQuery = scenario === 'employee-create' ? 'insert into employees' : scenario === 'employee-scheduling' ? 'delete from employee_positions' : `update ${table}`;
      const snapshot = () => q(`SELECT
        (SELECT jsonb_agg(e ORDER BY e.id) FROM employees e) AS employees,
        (SELECT jsonb_agg(p ORDER BY p.id) FROM positions p) AS positions,
        (SELECT jsonb_agg(l ORDER BY l.id) FROM locations l) AS locations,
        (SELECT jsonb_agg(w ORDER BY w.id) FROM workspaces w) AS workspaces,
        (SELECT jsonb_agg(ep ORDER BY ep.employee_id,ep.position_id) FROM employee_positions ep) AS qualifications,
        (SELECT jsonb_agg(el ORDER BY el.employee_id,el.location_id) FROM employee_location_eligibility el) AS eligibility`);
      const before = await snapshot();
      await blocker.connect(); await worker.connect();
      const pid = (await worker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      const executor: SqlExecutor = {
        query: async <T>(s: SqlStatement) => (await worker.query(s.text, [...s.values])).rows as T[],
        transaction: async statements => {
          await worker.query('BEGIN');
          try { const rows: unknown[][] = []; for (const s of statements) rows.push((await worker.query(s.text, [...s.values])).rows); await worker.query('COMMIT'); return rows; }
          catch (error) { await worker.query('ROLLBACK'); throw error; }
        },
      };
      await blocker.query('BEGIN'); await blocker.query(`LOCK TABLE ${table} IN SHARE MODE`);
      if (expires) await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1500 milliseconds' WHERE token_hash=$1", [proof.sessionTokenHash]);
      const action = () => {
        const actor = { actorEmployeeId: proof.employee.id, proof };
        if (scenario === 'position-update') return updatePosition({ ...actor, id: 'fr-position', name: 'Changed position', active: false, expectedUpdatedAt: positionReview.updatedAt }, executor);
        if (scenario === 'location-update') return updateLocation({ ...actor, id: 'loc-2', name: 'Changed location', shortName: 'Changed', active: false, expectedUpdatedAt: locationReview.updatedAt }, executor);
        if (scenario === 'workspace-update') return saveWorkspaceProfile({ ...actor, name: 'Changed workspace', timeZone: 'America/Puerto_Rico' }, executor);
        if (scenario === 'employee-create') return insertEmployee({ ...actor, id: 'fr-new', firstName: 'Created', lastName: 'Worker', phone: '5550000004', role: 'EMPLOYEE', primaryLocationId: 'loc-1', eligibleLocationIds: ['loc-1'], positionIds: ['fr-position'] }, executor);
        if (scenario === 'employee-scheduling') return saveEmployeeSchedulingProfile({ ...actor, employeeId: target, expectedUpdatedAt: reviewed.updatedAt, eligibleLocationIds: ['loc-1','loc-2'], positionIds: ['fr-position'] }, executor);
        return updateEmployeeProfile({ ...actor, employeeId: target, expectedUpdatedAt: reviewed.updatedAt,
          firstName: 'Changed', lastName: 'QA', phone: '5550000001', primaryLocationId: 'loc-1',
          role: scenario === 'self-deactivation' ? 'OWNER' : 'EMPLOYEE', active: scenario !== 'self-deactivation' }, executor);
      };
      pending = action().then(value => ({ value }), error => ({ error }));
      let observed = false;
      for (let n = 0; n < 500; n++) {
        const [row] = await q<{ blocked: boolean; statement: string }>('SELECT cardinality(pg_blocking_pids(pid))>0 AS blocked,query AS statement FROM pg_stat_activity WHERE pid=$1', [pid]);
        // Poll for matching activity AND live blocking; a cross-statement statistics sample is not yet proof.
        if (row?.blocked && row.statement.toLowerCase().includes(expectedQuery)) { observed = true; break; }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(observed, 'The actual later DML was blocked after authorization').toBe(true);
      if (expires) {
        await q("SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.05) FROM employee_sessions WHERE token_hash=$1", [proof.sessionTokenHash]);
        expect(await q('SELECT expires_at<=clock_timestamp() AS expired FROM employee_sessions WHERE token_hash=$1', [proof.sessionTokenHash])).toEqual([{ expired: true }]);
      }
      await blocker.query('ROLLBACK'); const outcome = await pending;
      if (expires) {
        expect(outcome).toHaveProperty('error'); expect(await snapshot()).toEqual(before);
        expect(await q('SELECT employee_id FROM employee_sessions WHERE token_hash=$1', [proof.sessionTokenHash])).toEqual([{ employee_id: 'fr-owner' }]);
      } else {
        expect(outcome).not.toHaveProperty('error'); expect(await snapshot()).not.toEqual(before);
        if (scenario === 'self-deactivation') expect(await q('SELECT employee_id FROM employee_sessions WHERE token_hash=$1', [proof.sessionTokenHash])).toEqual([]);
        if (scenario === 'self-demotion') expect(await q("SELECT role,active FROM employees WHERE id='fr-owner'")).toEqual([{ role: 'EMPLOYEE', active: true }]);
        if (scenario === 'employee-profile' || self || scenario === 'employee-scheduling') expect(outcome.value).toMatchObject({ updatedAt: expect.any(String) });
        if (scenario === 'position-update' || scenario === 'location-update' || scenario === 'workspace-update') expect(outcome.value).toMatchObject({ id: expect.any(String), name: expect.stringContaining('Changed') });
      }
    } finally { await blocker.query('ROLLBACK').catch(() => {}); await pending; await worker.end(); await blocker.end(); await db.dispose(); }
  });
}
