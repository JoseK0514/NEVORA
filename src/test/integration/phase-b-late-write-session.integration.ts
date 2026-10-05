import { Client } from 'pg';
import { expect, it } from 'vitest';
import { createDisposableFoundationDatabase } from './local-postgres';
import { createPosition } from '../../lib/data/positions';
import { createLocation } from '../../lib/data/locations';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';
import type { SessionMutationProof } from '../../lib/shift-changes/types';

// B-FR-01 durable regression. Fictional identities and ownership-verified
// disposable PostgreSQL; actual repository functions, observed locks and DB time.
const proof: SessionMutationProof = {
  employee: { id: 'review-owner', firstName: 'Review', lastName: 'Owner', role: 'OWNER', primaryLocationId: 'loc-1' },
  sessionTokenHash: 'c'.repeat(64),
};
for (const kind of ['position', 'location'] as const) {
  for (const waitKind of ['table', 'unique-key'] as const) {
  for (const expireDuringWait of [false, true]) {
    it(`${kind}/${waitKind}: ${expireDuringWait ? 'rejects expired authority' : 'allows current authority'} after a real INSERT lock wait`, async () => {
      const db = await createDisposableFoundationDatabase({ mode: 'current-runtime' });
      const blocker = new Client({ connectionString: db.connectionString });
      const worker = new Client({ connectionString: db.connectionString });
      let pending: Promise<{ value?: unknown; error?: unknown }> | undefined;
      const q = <T = Record<string, unknown>>(text: string, values: readonly unknown[] = []) => db.executor.query<T>({ text, values });
      try {
        await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('review-owner','Review','Owner','5550000001','OWNER','loc-1')");
        await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'review-owner',clock_timestamp()+interval '1 day')", [proof.sessionTokenHash]);
        await blocker.connect(); await worker.connect();
        const pid = (await worker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
        const executor: SqlExecutor = {
          query: async <T>(s: SqlStatement) => (await worker.query(s.text, [...s.values])).rows as T[],
          transaction: async statements => {
            await worker.query('BEGIN');
            try {
              const rows: unknown[][] = [];
              for (const s of statements) rows.push((await worker.query(s.text, [...s.values])).rows);
              await worker.query('COMMIT'); return rows;
            } catch (error) { await worker.query('ROLLBACK'); throw error; }
          },
        };
        const table = kind === 'position' ? 'positions' : 'locations';
        await blocker.query('BEGIN');
        if (waitKind === 'table') await blocker.query(`LOCK TABLE ${table} IN SHARE MODE`);
        else if (kind === 'position') await blocker.query("INSERT INTO positions(id,workspace_id,name) VALUES('review-competing-insert','workspace-fuel','Review late insert')");
        else await blocker.query("INSERT INTO locations(id,workspace_id,clocker_key,name,short_name,active) VALUES('review-competing-insert','workspace-fuel','review-late-insert','Competing review insert','Review',true)");
        if (expireDuringWait) await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1500 milliseconds' WHERE token_hash=$1", [proof.sessionTokenHash]);
        pending = (kind === 'position'
          ? createPosition({ name: 'Review late insert', actorEmployeeId: proof.employee.id, proof }, executor)
          : createLocation({ name: 'Review late insert', shortName: 'Review', clockerKey: 'review-late-insert', actorEmployeeId: proof.employee.id, proof }, executor))
          .then(value => ({ value }), error => ({ error }));
        let observed = false;
        for (let attempt = 0; attempt < 200; attempt++) {
          const [row] = await q<{ blocked: boolean; statement: string }>('SELECT cardinality(pg_blocking_pids(pid))>0 AS blocked,query AS statement FROM pg_stat_activity WHERE pid=$1', [pid]);
          if (row?.blocked) {
            expect(row.statement.toLowerCase()).toContain(`insert into ${table}`);
            observed = true; break;
          }
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        expect(observed, 'The INSERT, after the current-session check, reached the real blocking lock').toBe(true);
        if (expireDuringWait) {
          await q("SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.1) FROM employee_sessions WHERE token_hash=$1", [proof.sessionTokenHash]);
          expect(await q('SELECT expires_at<=clock_timestamp() AS expired FROM employee_sessions WHERE token_hash=$1', [proof.sessionTokenHash])).toEqual([{ expired: true }]);
        }
        await blocker.query('ROLLBACK');
        const outcome = await pending;
        const persisted = await q(`SELECT name FROM ${table} WHERE name='Review late insert'`);
        console.log('FINAL_REVIEW_OBSERVATION', JSON.stringify({ kind, waitKind, expireDuringWait, resolvedSuccessfully: Object.hasOwn(outcome, 'value'), persistedRows: persisted.length }));
        if (expireDuringWait) {
          expect(outcome, 'An expired management session must not commit after its INSERT wait').toHaveProperty('error');
          expect(persisted).toEqual([]);
        } else {
          expect(outcome).toHaveProperty('value');
          expect(persisted).toEqual([{ name: 'Review late insert' }]);
        }
      } finally {
        await blocker.query('ROLLBACK').catch(() => {});
        await pending;
        await worker.end(); await blocker.end(); await db.dispose();
      }
    });
  }
}
}
