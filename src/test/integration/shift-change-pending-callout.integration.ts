import { updateShift } from './management-api';
import {reviewedFixtureSource} from './shift-change-api';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createDisposableExchangeDatabase } from './local-postgres';
import { fixtureShift, proof, seedShiftChanges } from './shift-change-fixture';
import { executeShiftChange } from '../../lib/data/shift-changes';

import { readShiftChangeHistory } from '../../lib/data/shift-change-history';

let db: Awaited<ReturnType<typeof createDisposableExchangeDatabase>>;
const query = (text: string, values: readonly unknown[] = []) =>
  db.executor.query<Record<string, unknown>>({ text, values });
beforeAll(async () => {
  db = await createDisposableExchangeDatabase({ mode: 'current-runtime' });
  await seedShiftChanges(db.executor);
});
afterAll(async () => { await db?.dispose(); });

it.each(['owner', 'terms'] as const)(
  'A019/A021/A051 stale PENDING callout after an actual manager %s edit cannot block a fresh report',
  async (change) => {
    const shiftId = `pending-${change}`;
    await fixtureShift(db.executor, shiftId, 'e1', '2036-06-02');
    const first = await executeShiftChange(proof('e1'), {
      kind: 'SUBMIT_CALLOUT', operationId: randomUUID(), ...await reviewedFixtureSource(db.executor,shiftId),
      reasonCode: 'ILLNESS', reasonNote: 'Original employee private reason',
    }, db.executor);
    expect(first.status).toBe('pending');
    if (first.status !== 'pending') throw new Error('Initial report was not created');
    const [original] = await query('SELECT source_terms FROM shift_callouts WHERE id=$1', [first.requestId]);
    const employeeId = change === 'owner' ? 'e2' : 'e1';
    expect(await updateShift({
      shiftId, employeeId, date: '2036-06-02', startTime: '09:00',
      endTime: '16:00', actorEmployeeId: 'owner',
    }, db.executor)).toBe(true);
    const second = await executeShiftChange(proof(employeeId), {
      kind: 'SUBMIT_CALLOUT', operationId: randomUUID(), ...await reviewedFixtureSource(db.executor,shiftId),
      reasonCode: 'OTHER', reasonNote: 'Fresh current-assignment report',
    }, db.executor);
    expect(second, 'An obsolete pending reservation must not reject a genuine new report').toMatchObject({ status: 'pending' });
    if (second.status !== 'pending') throw new Error('Fresh report remained blocked');
    expect(second.requestId).not.toBe(first.requestId);
    expect(await query('SELECT callout_id FROM shift_change_participation WHERE shift_id=$1', [shiftId]))
      .toEqual([{ callout_id: second.requestId }]);
    expect(await query('SELECT status FROM shift_callouts WHERE id=$1', [first.requestId]))
      .toEqual([{ status: 'CANCELLED' }]);
    const events = await readShiftChangeHistory(proof('e1'), first.requestId, db.executor);
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ event_kind: 'STALE', source_terms: original.source_terms });
    if (change === 'owner') expect(await readShiftChangeHistory(proof('e2'), first.requestId, db.executor)).toEqual([]);
    expect(await executeShiftChange(proof('e1'), {
      kind: 'CANCEL_CALLOUT', requestId: first.requestId, expectedRevision: 1, operationId: randomUUID(),
    }, db.executor)).toEqual({ status: 'conflict' });
    expect(await query('SELECT status FROM shift_callouts WHERE id=$1', [second.requestId])).toEqual([{ status: 'PENDING' }]);
  },
);

it('stale retirement and a fresh report roll back together on an injected event failure', async () => {
  await fixtureShift(db.executor, 'pending-rollback', 'e1', '2036-06-03');
  const first = await executeShiftChange(proof('e1'), {
    kind: 'SUBMIT_CALLOUT', operationId: randomUUID(), ...await reviewedFixtureSource(db.executor,'pending-rollback'), reasonCode: 'ILLNESS',
  }, db.executor);
  if (first.status !== 'pending') throw new Error('Initial report failed');
  await updateShift({ shiftId: 'pending-rollback', employeeId: 'e2', date: '2036-06-03', startTime: '09:00', endTime: '16:00', actorEmployeeId: 'owner' }, db.executor);
  const before = await query('SELECT * FROM shift_callouts ORDER BY id');
  const reservations = await query('SELECT * FROM shift_change_participation ORDER BY shift_id');
  const notifications = await query('SELECT * FROM notifications ORDER BY id');
  const operationId = randomUUID();
  const injected = {
    query: db.executor.query,
    transaction: (statements: readonly import('../../lib/notifications/types').SqlStatement[]) => {
      const index = statements.findIndex(s => s.text.startsWith('INSERT INTO shift_change_events') && s.values[4] === 'STALE');
      expect(index).toBeGreaterThan(0);
      return db.executor.transaction([...statements.slice(0, index + 1), { text: 'SELECT 1/0', values: [] }, ...statements.slice(index + 1)]);
    },
  };
  await expect(executeShiftChange(proof('e2'), { kind: 'SUBMIT_CALLOUT', operationId, ...await reviewedFixtureSource(db.executor,'pending-rollback'), reasonCode: 'OTHER', reasonNote: 'Fictional approved-contract details' }, injected)).rejects.toMatchObject({ code: '22012' });
  expect(await query('SELECT * FROM shift_callouts ORDER BY id')).toEqual(before);
  expect(await query('SELECT * FROM shift_change_participation ORDER BY shift_id')).toEqual(reservations);
  expect(await query('SELECT * FROM notifications ORDER BY id')).toEqual(notifications);
  expect(await query('SELECT * FROM shift_change_operations WHERE operation_id=$1', [operationId])).toEqual([]);
});

it.each(['current', 'legacy'] as const)('does not retire an unchanged %s pending report to permit duplicates', async (kind) => {
  const id = `retained-${kind}`;
  await fixtureShift(db.executor, id, 'e1', '2036-06-04');
  if (kind === 'legacy') await query("INSERT INTO shift_callouts(id,shift_id,employee_id,status,reason_code) VALUES($1,$1,'e1','PENDING','OTHER')", [id]);
  else expect((await executeShiftChange(proof('e1'), { kind: 'SUBMIT_CALLOUT', operationId: randomUUID(), ...await reviewedFixtureSource(db.executor,id), reasonCode: 'OTHER', reasonNote: 'Fictional approved-contract details' }, db.executor)).status).toBe('pending');
  const before = await query('SELECT * FROM shift_callouts WHERE shift_id=$1', [id]);
  expect(await executeShiftChange(proof('e1'), { kind: 'SUBMIT_CALLOUT', operationId: randomUUID(), ...await reviewedFixtureSource(db.executor,id), reasonCode: 'OTHER', reasonNote: 'Fictional approved-contract details' }, db.executor)).toEqual({ status: 'conflict' });
  expect(await query('SELECT * FROM shift_callouts WHERE shift_id=$1', [id])).toEqual(before);
});
