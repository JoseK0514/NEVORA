import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { expect, it } from 'vitest';
import { createDisposableExchangeDatabase } from './local-postgres';
import { fixtureShift, proof, seedShiftChanges } from './shift-change-fixture';
import { executeShiftChange } from '../../lib/data/shift-changes';
import type { SqlExecutor } from '../../lib/notifications/types';

async function waitBlocked(client: Client, fragment: string) {
  for (let n = 0; n < 200; n++) {
    await client.query('SELECT pg_stat_clear_snapshot()');
    const rows = await client.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE $1 AND pid<>pg_backend_pid()", ['%' + fragment + '%']);
    if (rows.rowCount) return;
    await client.query('SELECT pg_sleep(0.005)');
  }
  throw new Error('Expected an actual blocked competing transaction');
}

it.each(['cancel-first', 'accept-first'] as const)('A003 actual two-sided trade %s has one terminal outcome and no half-swap', async order => {
  const db = await createDisposableExchangeDatabase({ mode: 'current-runtime' });
  const connection = new Client({ connectionString: db.connectionString });
  let release = () => {};
  let first: ReturnType<typeof executeShiftChange> | undefined;
  let second: ReturnType<typeof executeShiftChange> | undefined;
  try {
    await seedShiftChanges(db.executor);
    const a = await fixtureShift(db.executor, 'cancel-race-source', 'e1', '2037-06-02');
    const b = await fixtureShift(db.executor, 'cancel-race-target', 'e2', '2037-06-03');
    const request = await executeShiftChange(proof('e1'), { kind: 'PROPOSE_SWAP', operationId: randomUUID(), ...a, targetShiftId:b.sourceShiftId, targetEpisodeId:b.sourceEpisodeId, targetTermsFingerprint:b.sourceTermsFingerprint }, db.executor);
    if (request.status !== 'pending') throw Error('Trade fixture failed');
    await connection.connect();
    let signal = () => {};
    const reached = new Promise<void>(resolve => { signal = resolve; });
    const resumed = new Promise<void>(resolve => { release = resolve; });
    let held = false;
    const executor: SqlExecutor = {
      query: db.executor.query,
      async transaction(statements) {
        await connection.query('BEGIN');
        try {
          const results: unknown[][] = [];
          for (const statement of statements) {
            results.push((await connection.query(statement.text, [...statement.values])).rows);
            if (!held && statement.text.includes('generation_source_conflict')) { held = true; signal(); await resumed; }
          }
          await connection.query('COMMIT'); return results;
        } catch (error) { await connection.query('ROLLBACK'); throw error; }
      },
    };
    const cancel = { kind:'CANCEL' as const, requestId:request.requestId, expectedRevision:1, operationId:randomUUID() };
    const accept = { ...cancel, kind:'ACCEPT' as const, operationId:randomUUID() };
    first = order === 'cancel-first' ? executeShiftChange(proof('e1'), cancel, executor) : executeShiftChange(proof('e2'), accept, executor);
    let gateTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        reached,
        first.then(() => { throw new Error('Transaction finished before the controlled guard'); }),
        new Promise<never>((_, reject) => { gateTimeout = setTimeout(() => reject(new Error('Timed out reaching the controlled guard')), 5000); }),
      ]);
    } finally { if (gateTimeout) clearTimeout(gateTimeout); }
    second = order === 'cancel-first' ? executeShiftChange(proof('e2'), accept, db.executor) : executeShiftChange(proof('e1'), cancel, db.executor);
    await waitBlocked(connection, 'FROM workspaces'); release();
    expect(await first).toMatchObject({ status:order==='cancel-first'?'closed':'completed' });
    expect(await second).toEqual({ status:'conflict' });
    const rows = await db.executor.query({ text:'SELECT id,employee_id FROM shifts ORDER BY id',values:[] });
    expect(rows).toEqual([{id:'cancel-race-source',employee_id:order==='cancel-first'?'e1':'e2'},{id:'cancel-race-target',employee_id:order==='cancel-first'?'e2':'e1'}]);
    expect(await db.executor.query({text:'SELECT * FROM shift_change_participation',values:[]})).toEqual([]);
    expect(await db.executor.query({text:'SELECT * FROM shift_change_operations WHERE request_id=$1',values:[request.requestId]})).toHaveLength(2);
  } finally { release(); await Promise.allSettled([first,second].filter(Boolean)); await connection.end().catch(()=>{}); await db.dispose(); }
});

it('A013 rejected candidate leaves the offer available for a different eligible volunteer', async () => {
  const db = await createDisposableExchangeDatabase({ mode:'current-runtime' });
  try {
    await seedShiftChanges(db.executor);
    const terms = await fixtureShift(db.executor,'reject-then-valid','e1','2037-06-02');
    const request = await executeShiftChange(proof('e1'), {kind:'OFFER_COVERAGE',operationId:randomUUID(),...terms}, db.executor);
    if(request.status!=='pending')throw Error('Offer fixture failed');
    await db.executor.query({text:"INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status) VALUES('candidate-away','e2','2037-06-02','2037-06-02','APPROVED')",values:[]});
    const command = {kind:'ACCEPT' as const,requestId:request.requestId,expectedRevision:1,operationId:randomUUID()};
    expect(await executeShiftChange(proof('e2'),command,db.executor)).toMatchObject({status:'blocked'});
    expect(await db.executor.query({text:'SELECT status,request_revision::int FROM shift_exchanges WHERE id=$1',values:[request.requestId]})).toEqual([{status:'OPEN',request_revision:1}]);
    expect(await executeShiftChange(proof('e3'),{...command,operationId:randomUUID()},db.executor)).toMatchObject({status:'completed'});
    expect(await db.executor.query({text:'SELECT employee_id FROM shifts WHERE id=$1',values:[terms.sourceShiftId]})).toEqual([{employee_id:'e3'}]);
  } finally { await db.dispose(); }
});
