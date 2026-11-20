import { randomUUID } from 'node:crypto';
import { afterEach, expect, it, rs } from '@rstest/core';
import { businessDate } from '../../lib/business-time';
import type { SqlExecutor } from '../../lib/notifications/types';
import { reviewTimeCorrection, submitTimeCorrection } from '../../lib/time-corrections/service';
import { mutateTimecard, readTimecards } from '../../lib/timecards/service';
import { applyTimecardAccrual } from '../../lib/workforce/pto-accrual.server';
import { applyWorkforceCommand, readPtoAccount } from '../../lib/workforce/settings.server';
import { companyAccessFixture } from './company-access-fixture';

rs.mock('server-only', () => ({}));
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
afterEach(async () => f?.db.dispose());

it('posts separate fictional accruals from finalized effective time and one visible late correction per balance', async () => {
  f = await companyAccessFixture();
  await f.q(`INSERT INTO clocker_devices(id,location_id,name) VALUES ('pto-qa','loc-1','Fictional device');
    INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES
      ('work','target','loc-1','pto-qa','2026-01-07T12:00Z','2026-01-07T20:00Z','CLOCKED_OUT',1),
      ('other','manager','loc-1','pto-qa','2026-01-07T12:00Z','2026-01-07T22:00Z','CLOCKED_OUT',1);
    INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at)
      VALUES ('work-break','work','2026-01-07T16:00Z','2026-01-07T17:00Z');
    INSERT INTO employee_sessions(token_hash,employee_id,expires_at)
      VALUES(repeat('d',64),'target',clock_timestamp()+interval '1 hour')`);
  const employee = {
    employee: { ...f.manager.employee, id: 'target', role: 'EMPLOYEE' as const },
    sessionTokenHash: 'd'.repeat(64),
  };
  const policy = {
    kind: 'PTO_POLICY', enabled: true, fullDayMinutes: 480, carryoverCapMinutes: 0,
  };
  async function savePolicy(code: 'VACATION' | 'SICK', rate: number, expectedRevision = 0) {
    const result = await applyWorkforceCommand(f.owner, {
      ...policy, code, label: 'Fictional ' + code, operationId: randomUUID(), expectedRevision, earnedMinutesPer100Hours: rate,
    }, f.db.executor);
    if (result.state !== 'saved' || !result.receipt.policyId) throw Error('Fictional policy missing');
    return result.receipt.policyId;
  }
  const policyIds = { vacation: await savePolicy('VACATION', 600), sick: await savePolicy('SICK', 300) };
  const period = { startDate: '2026-01-05', endDate: '2026-01-11' };
  async function act(action: 'APPROVE' | 'FINALIZE' | 'REOPEN', dates = period) {
    const read = await readTimecards(f.owner, dates, f.db.executor);
    const card = read.state === 'ready' && read.cards.find(item => item.source.employeeId === 'target');
    if (!card) throw Error('Fictional card missing');
    const operationId = randomUUID();
    const outcome = await mutateTimecard(f.owner, {
      operationId, employeeId: 'target', ...dates, action, expectedRevision: card.revision, expectedSourceHash: card.sourceHash,
      ...(action === 'REOPEN' ? { note: 'Fictional late correction' } : {}),
    }, f.db.executor);
    expect(outcome.status).toBe({ APPROVE: 'approved', FINALIZE: 'finalized', REOPEN: 'reopened' }[action]);
    return operationId;
  }
  const approvedId = await act('APPROVE');
  expect(await applyTimecardAccrual(f.owner, { timecardOperationId: approvedId, policyIds }, f.db.executor))
    .toEqual({ state: 'conflict' });
  const initial = { timecardOperationId: await act('FINALIZE'), policyIds };
  await expect(applyTimecardAccrual(f.manager, initial, f.db.executor)).rejects.toThrow('operational_authorization');
  const first = await applyTimecardAccrual(f.owner, initial, f.db.executor);
  expect(first).toMatchObject({ state: 'saved', entries: [
    { policyCode: 'SICK', qualifyingMinutes: 420, awardMinutes: 21, changeMinutes: 21 },
    { policyCode: 'VACATION', qualifyingMinutes: 420, awardMinutes: 42, changeMinutes: 42 },
  ] });
  const updatedVacation = await savePolicy('VACATION', 1200, 1);
  await act('REOPEN');
  const correction = await submitTimeCorrection(employee, {
    kind: 'ENTRY_BOUNDARY', operationId: randomUUID(), timeEntryId: 'work',
    proposedStartAt: '2026-01-07T12:00:00Z', proposedEndAt: '2026-01-07T21:00:00Z', reason: 'Fictional missing hour',
  }, f.db.executor);
  if (correction.status !== 'pending') throw Error('Fictional correction missing: ' + correction.status);
  expect(await reviewTimeCorrection(f.owner, {
    requestId: correction.requestId, operationId: randomUUID(), expectedRevision: 1, decision: 'APPROVE',
  }, f.db.executor)).toMatchObject({ status: 'approved' });
  await act('APPROVE');
  const corrected = { timecardOperationId: await act('FINALIZE'), policyIds };
  expect(await applyTimecardAccrual(f.owner, {
    ...corrected, policyIds: { ...policyIds, vacation: updatedVacation },
  }, f.db.executor)).toEqual({ state: 'conflict' });
  const lost: SqlExecutor = {
    ...f.db.executor,
    async transaction(statements) {
      const result = await f.db.executor.transaction(statements);
      if (statements.some(s => s.text.includes('INSERT INTO pto_timecard_accrual'))) throw Error('Lost accrual response');
      return result;
    },
  };
  await expect(applyTimecardAccrual(f.owner, corrected, lost)).rejects.toThrow('Lost accrual response');
  const retries = await Promise.all([
    applyTimecardAccrual(f.owner, corrected, f.db.executor), applyTimecardAccrual(f.owner, corrected, f.db.executor),
  ]);
  expect(retries[0]).toMatchObject({ state: 'saved', entries: [
    { policyCode: 'SICK', qualifyingMinutes: 480, awardMinutes: 24, changeMinutes: 3 },
    { policyCode: 'VACATION', qualifyingMinutes: 480, awardMinutes: 48, changeMinutes: 6 },
  ] });
  expect(retries[1]).toEqual(retries[0]);
  expect(await applyTimecardAccrual(f.owner, initial, f.db.executor)).toEqual(first);
  const account = await readPtoAccount(employee, undefined, f.db.executor);
  expect(account?.balances).toMatchObject([{ code: 'SICK', balanceMinutes: 24 }, { code: 'VACATION', balanceMinutes: 48 }]);
  expect(account?.entries).toHaveLength(4);
  expect(account?.entries).toEqual(expect.arrayContaining([
    expect.objectContaining({ kind: 'ADJUSTMENT', minutes: 6, policyCode: 'VACATION', note: null,
      accrual: { ...period, qualifyingMinutes: 480, policyRevision: 1, awardMinutes: 48, changeMinutes: 6 } }),
    expect.objectContaining({ kind: 'ADJUSTMENT', minutes: 3, policyCode: 'SICK',
      accrual: { ...period, qualifyingMinutes: 480, policyRevision: 1, awardMinutes: 24, changeMinutes: 3 } }),
  ]));

  // A downward correction that exceeds one account's available balance must
  // leave both accounts untouched until the Owner resolves the shortfall.
  expect(await applyWorkforceCommand(f.owner, {
    kind: 'PTO_POST', operationId: randomUUID(), employeeId: 'target', policyCode: 'VACATION',
    expectedPolicyRevision: 2, effectiveDate: businessDate(new Date(), 'America/Puerto_Rico'),
    entryKind: 'ADJUSTMENT', quantity: -48, sourceReference: null, note: 'Fictional balance debit',
  }, f.db.executor)).toMatchObject({ state: 'saved' });
  await act('REOPEN');
  await f.q("UPDATE time_entries SET clock_out_at='2026-01-07T19:00Z',version=2 WHERE id='work'");
  // Replace the prior approved effective boundary, which still overrides the raw punch.
  const shorter = await submitTimeCorrection(employee, {
    kind: 'ENTRY_BOUNDARY', operationId: randomUUID(), timeEntryId: 'work',
    proposedStartAt: '2026-01-07T12:00:00Z', proposedEndAt: '2026-01-07T19:00:00Z', reason: 'Fictional revised boundary',
  }, f.db.executor);
  if (shorter.status !== 'pending') throw Error('Fictional downward correction missing: ' + shorter.status);
  expect(await reviewTimeCorrection(f.owner, {
    requestId: shorter.requestId, operationId: randomUUID(), expectedRevision: 1, decision: 'APPROVE',
  }, f.db.executor)).toMatchObject({ status: 'approved' });
  await act('APPROVE');
  const downward = { timecardOperationId: await act('FINALIZE'), policyIds };
  expect(await applyTimecardAccrual(f.owner, downward, f.db.executor)).toEqual({ state: 'conflict' });
  expect((await readPtoAccount(employee, undefined, f.db.executor))?.balances)
    .toMatchObject([{ code: 'SICK', balanceMinutes: 24 }, { code: 'VACATION', balanceMinutes: 0 }]);
  expect(await f.q('SELECT 1 FROM pto_timecard_accrual_revisions WHERE timecard_operation_id=$1', [downward.timecardOperationId]))
    .toEqual([]);
});
