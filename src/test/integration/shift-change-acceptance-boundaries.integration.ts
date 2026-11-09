import {reviewedFixtureSource} from './shift-change-api';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { Client } from 'pg';
import { createDisposableExchangeDatabase } from './local-postgres';
import { fixtureShift, proof, seedShiftChanges } from './shift-change-fixture';
import { executeShiftChange } from '../../lib/data/shift-changes';
import type { SqlExecutor } from '../../lib/notifications/types';

let db: Awaited<ReturnType<typeof createDisposableExchangeDatabase>>;
let sequence = 0;
const q = (text: string, values: readonly unknown[] = []) => db.executor.query<Record<string, unknown>>({ text, values });
beforeAll(async () => { db = await createDisposableExchangeDatabase({ mode: 'current-runtime' }); await seedShiftChanges(db.executor,{companyAccess:true}); });
afterAll(async () => { await db?.dispose(); });
async function offer() {
  const id = `boundary-${++sequence}`;
  const terms = await fixtureShift(db.executor, id, 'e1', `2037-02-${String(sequence + 1).padStart(2, '0')}`);
  const result = await executeShiftChange(proof('e1'), { kind: 'OFFER_COVERAGE', operationId: randomUUID(), ...terms }, db.executor);
  if (result.status !== 'pending') throw new Error('Boundary fixture offer was not created');
  return { id, terms, requestId: result.requestId, command: { kind: 'ACCEPT' as const, operationId: randomUUID(), requestId: result.requestId, expectedRevision: 1 } };
}

it.each(['before-first-authority', 'after-initial-authority'] as const)(
  'A053/A054 actual acceptance deadline expires %s and rolls back any prepared mutation',
  async (stage) => {
    const item = await offer();
    await q("UPDATE shift_exchanges SET completion_deadline=clock_timestamp()+interval '650 milliseconds' WHERE id=$1", [item.requestId]);
    const [revision] = await q('SELECT request_revision FROM shift_exchanges WHERE id=$1', [item.requestId]);
    const command = { ...item.command, expectedRevision: Number(revision.request_revision) };
    const before = await q('SELECT to_jsonb(x) row FROM shift_exchanges x WHERE id=$1', [item.requestId]);
    const connection = new Client({ connectionString: db.connectionString });
    await connection.connect();
    let waited = false;
    const executor: SqlExecutor = {
      query: db.executor.query,
      async transaction(statements) {
        await connection.query('BEGIN');
        try {
          const results: unknown[][] = [];
          for (const statement of statements) {
            if (!waited && stage === 'before-first-authority' && statement.text.includes('shift_change_authorization')) {
              await connection.query('SELECT pg_sleep(0.7)'); waited = true;
            }
            results.push((await connection.query(statement.text, [...statement.values])).rows);
            if (!waited && stage === 'after-initial-authority' && statement.text.includes('generation_source_conflict')) {
              await connection.query('SELECT pg_sleep(0.7)'); waited = true;
            }
          }
          await connection.query('COMMIT');
          return results;
        } catch (error) { await connection.query('ROLLBACK'); throw error; }
      },
    };
    try {
      expect(await executeShiftChange(proof('e2'), command, executor)).toMatchObject({ status: 'blocked', issues: [{ code: 'DEADLINE_PASSED' }] });
      expect(waited).toBe(true);
      expect(await q('SELECT to_jsonb(x) row FROM shift_exchanges x WHERE id=$1', [item.requestId])).toEqual(before);
      expect(await q('SELECT employee_id FROM shifts WHERE id=$1', [item.id])).toEqual([{ employee_id: 'e1' }]);
      expect(await q('SELECT * FROM shift_change_operations WHERE operation_id=$1', [command.operationId])).toEqual([]);
      expect(await q("SELECT * FROM shift_change_events WHERE request_id=$1 AND event_kind='COMPLETED'", [item.requestId])).toEqual([]);
      expect(await q('SELECT * FROM schedule_publication_revisions WHERE source_id=$1', [item.requestId])).toEqual([]);
    } finally { await connection.end(); }
  },
);

it('A014 a volunteer withdrawal clears manual-pending consent without silently reopening the request', async () => {
  await q("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,mode}','\"MANAGER_REVIEW\"')");
  try {
    const item = await offer();
    const accepted = await executeShiftChange(proof('e2'), item.command, db.executor);
    expect(accepted).toMatchObject({ status: 'pending', revision: 2 });
    expect((await executeShiftChange(proof('e2'), { kind: 'WITHDRAW', requestId: item.requestId, expectedRevision: 2, operationId: randomUUID() }, db.executor)).status).toBe('closed');
    expect(await q('SELECT status,target_consent FROM shift_exchanges WHERE id=$1', [item.requestId])).toEqual([{ status: 'CANCELLED', target_consent: null }]);
    expect(await q('SELECT * FROM shift_change_participation WHERE exchange_id=$1', [item.requestId])).toEqual([]);
    expect(await q('SELECT employee_id FROM shifts WHERE id=$1', [item.id])).toEqual([{ employee_id: 'e1' }]);
    expect((await executeShiftChange(proof('owner'), { kind: 'MANAGER_APPROVE', requestId: item.requestId, expectedRevision: 3, operationId: randomUUID() }, db.executor)).status).not.toBe('completed');
  } finally { await q("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,mode}','\"AUTOMATIC_WHEN_VALID\"')"); }
});

it.each(['self', 'same-shift', 'missing-target'] as const)('A010 %s trade cannot reserve or mutate assignments', async (kind) => {
  const source = await fixtureShift(db.executor, `invalid-${kind}`, 'e1', '2037-03-02');
  const target = kind === 'self' ? await fixtureShift(db.executor, `invalid-${kind}-target`, 'e1', '2037-03-03') : source;
  const result = await executeShiftChange(proof('e1'), {
    kind: 'PROPOSE_SWAP', operationId: randomUUID(), ...source,
    targetShiftId: kind === 'missing-target' ? 'does-not-exist' : target.sourceShiftId,
    targetEpisodeId: target.sourceEpisodeId, targetTermsFingerprint: target.sourceTermsFingerprint,
  }, db.executor);
  expect(['blocked', 'unavailable']).toContain(result.status);
  expect(await q('SELECT * FROM shift_change_participation WHERE shift_id=$1', [source.sourceShiftId])).toEqual([]);
  expect(await q('SELECT employee_id FROM shifts WHERE id=$1', [source.sourceShiftId])).toEqual([{ employee_id: 'e1' }]);
});

it('A022 genuine post-start inability remains reportable without backdated assignment transfer', async () => {
  const past = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const source = await fixtureShift(db.executor, 'late-report-boundary', 'e1', past);
  const report = await executeShiftChange(proof('e1'), { kind: 'SUBMIT_CALLOUT', operationId: randomUUID(), ...await reviewedFixtureSource(db.executor,source.sourceShiftId), reasonCode: 'OTHER', reasonNote: 'Fictional approved-contract details' }, db.executor);
  expect(report.status).toBe('pending');
  expect(await q('SELECT employee_id FROM shifts WHERE id=$1', [source.sourceShiftId])).toEqual([{ employee_id: 'e1' }]);
  expect(await q('SELECT * FROM time_entries')).toEqual([]);
});
