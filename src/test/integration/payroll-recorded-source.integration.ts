import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createPunchFixture } from './clocker-punch-fixture';
import { readTimecards, mutateTimecard } from '../../lib/timecards/service';
import { submitTimeCorrection, reviewTimeCorrection } from '../../lib/time-corrections/service';
import { saveBreakType } from '../../lib/clocker/break-types.server';
import { managementSessionStatements } from '../../lib/data/management-session';
import { buildRecordedSourceCapture, projectRecordedSourceCapture, type RecordedSourceRequest, type RecordedSourceCapture } from '../../lib/payroll/native/recorded-source.server';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
import type { Period } from '../../lib/timecards/project';

const period = { startDate: '2026-09-21', endDate: '2026-09-27' };
const owner: SessionMutationProof = { sessionTokenHash: 'a'.repeat(64), employee: { id: 'c34-owner', role: 'OWNER', firstName: 'Owner', lastName: 'QA', primaryLocationId: 'loc-1' } };
const employee: SessionMutationProof = { sessionTokenHash: 'd'.repeat(64), employee: { id: 'c34-a', role: 'EMPLOYEE', firstName: 'Avery', lastName: 'QA', primaryLocationId: 'loc-1' } };
let f: Awaited<ReturnType<typeof createPunchFixture>> | undefined;
beforeEach(async () => {
  f = await createPunchFixture({ breaks: true });
  await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'c34-a',now()+interval '1 day')");
});
afterEach(async () => { await f?.db.dispose(); f = undefined; });
function fixture() { if (!f) throw Error('Fixture missing'); return f; }
function request(): RecordedSourceRequest { return { workspaceId: 'workspace-fuel', employeeId: 'c34-a', timeZone: 'America/Puerto_Rico', period,
  coverage: [period], contexts: [{ startAt: '2026-09-21T04:00:00Z', endAt: '2026-09-28T04:00:00Z' }] }; }
async function seed(id = 'RS-entry', loc = 'loc-1', start = '2026-09-22T12:00:00Z', end = '2026-09-22T20:00:00Z') {
  await fixture().q(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version)
    VALUES($1,'c34-a',$2,$3,$4::timestamptz,$5::timestamptz,'CLOCKED_OUT',1)`, [id, loc, fixture().devices[loc === 'loc-1' ? 0 : 2].device.id, start, end]);
}
async function action(action: 'APPROVE' | 'FINALIZE' | 'REOPEN', p: Period = period) {
  const result = await readTimecards(owner, p, fixture().db.executor);
  if (result.state !== 'ready') throw Error('Timecard read unavailable');
  const card = result.cards.find(c => c.source.employeeId === 'c34-a'); if (!card) throw Error('Timecard absent');
  const response = await mutateTimecard(owner, { operationId: randomUUID(), employeeId: 'c34-a', ...p, action,
    expectedRevision: card.revision, expectedSourceHash: card.sourceHash,
    ...(action === 'REOPEN' ? { note: 'Fictional source re-review' } : {}) }, fixture().db.executor);
  expect(response.status).toBe(action === 'APPROVE' ? 'approved' : action === 'FINALIZE' ? 'finalized' : 'reopened');
}
async function finalize(p: Period = period) { await action('APPROVE', p); await action('FINALIZE', p); }
async function capture(r = request()): Promise<RecordedSourceCapture> {
  // Test-owned caller transaction only. Production Finance still supplies its payroll grants and full locks.
  const guard = managementSessionStatements(owner, 'c34-owner', ['OWNER']);
  const sql = buildRecordedSourceCapture(r);
  const results = await fixture().db.executor.transaction([
    { text: 'SELECT id FROM workspaces WHERE id=$1 ORDER BY id FOR SHARE', values: [r.workspaceId] },
    { text: 'SELECT id FROM employees WHERE id IN($1,$2) ORDER BY id FOR UPDATE', values: [r.employeeId, 'c34-owner'] },
    ...guard, { text: 'LOCK TABLE time_entries,break_entries,time_correction_requests,time_correction_adjustments,time_correction_events,timecard_revisions IN SHARE MODE', values: [] },
    sql, ...guard,
  ]);
  return projectRecordedSourceCapture(r, results[3 + guard.length][0]);
}
function ready(c: RecordedSourceCapture) { expect(c.state).toBe('ready'); if (c.state !== 'ready') throw Error(`Blocked: ${c.reason}`); return c; }
async function approveCorrection(command: Parameters<typeof submitTimeCorrection>[1]) {
  const pending = await submitTimeCorrection(employee, command, fixture().db.executor);
  expect(pending.status).toBe('pending'); if (pending.status !== 'pending') throw Error('Expected pending correction');
  const approved = await reviewTimeCorrection(owner, { operationId: randomUUID(), requestId: pending.requestId, expectedRevision: 1, decision: 'APPROVE' }, fixture().db.executor);
  expect(approved.status).toBe('approved'); if (approved.status !== 'approved') throw Error('Expected approved correction'); return approved;
}

it('captures retained classification, effective/raw timing and reproducible hashes from actual finalized rows', async () => {
  await seed(); const b = fixture().breakType!;
  await fixture().q(`INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at,version,break_type_id,break_type_snapshot)
    VALUES('RS-break','RS-entry','2026-09-22T16:00:00Z','2026-09-22T16:15:00Z',1,$1,$2::jsonb)`,
  [b.id, JSON.stringify({ id: b.id, version: b.version, name: b.name, category: b.category, targetMinutes: b.targetMinutes })]);
  await finalize(); const first = ready(await capture()), second = ready(await capture());
  expect(first.entries).toHaveLength(1); expect(first.entries[0].breaks[0].classification?.category).toBe('REST');
  expect(first.entries[0].breaks[0]).not.toHaveProperty('paid'); expect(first.sourceFence).toBe(second.sourceFence);
  expect(first.coverage[0].sourceHash).toMatch(/^[a-f0-9]{32}$/); expect(first.coverage[0].currentSourceHash).toBe(first.coverage[0].sourceHash);
});
it('retains unknown break classification and distinguishes no-break actual time', async () => {
  await seed(); await fixture().q("INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at) VALUES('RS-unknown','RS-entry','2026-09-22T16:00:00Z','2026-09-22T16:10:00Z')");
  await seed('RS-no-break', 'loc-1', '2026-09-23T12:00:00Z', '2026-09-23T20:00:00Z'); await finalize();
  const c = ready(await capture()); expect(c.entries[0].breaks[0].classification).toBeNull(); expect(c.entries[1].breaks).toEqual([]);
});
it('retains approved entry and break corrections without changing raw recorded provenance', async () => {
  await seed(); await fixture().q("INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at) VALUES('RS-break','RS-entry','2026-09-22T16:00:00Z','2026-09-22T16:15:00Z')");
  await approveCorrection({ operationId: randomUUID(), kind: 'ENTRY_BOUNDARY', timeEntryId: 'RS-entry', proposedStartAt: '2026-09-22T11:00:00Z', proposedEndAt: '2026-09-22T21:00:00Z', reason: 'Fictional boundary evidence' });
  await approveCorrection({ operationId: randomUUID(), kind: 'BREAK_BOUNDARY', timeEntryId: 'RS-entry', breakEntryId: 'RS-break', proposedStartAt: '2026-09-22T16:01:00Z', proposedEndAt: '2026-09-22T16:14:00Z', reason: 'Fictional break evidence' });
  await finalize(); const c = ready(await capture());
  expect(c.entries[0].startAt).toBe('2026-09-22T11:00:00Z'); expect(c.entries[0].rawStartAt).toBe('2026-09-22T12:00:00Z');
  expect(c.entries[0].breaks[0].startAt).toBe('2026-09-22T16:01:00Z'); expect(c.entries[0].breaks[0].rawStartAt).toBe('2026-09-22T16:00:00Z');
  expect(c.lineage.adjustments).toHaveLength(2); expect(c.lineage.events).toHaveLength(4);
});
it('retains all nine approved missing-entry revisions/events and both historical work locations', async () => {
  let prior: string | undefined;
  for (let i = 0; i < 9; i++) {
    const next = await approveCorrection({ operationId: randomUUID(), kind: 'MISSING_ENTRY', locationId: 'loc-2',
      proposedStartAt: i === 0 ? '2026-09-20T12:00:00Z' : '2026-09-22T12:00:00Z', proposedEndAt: i === 0 ? '2026-09-20T20:00:00Z' : '2026-09-22T20:00:00Z', reason: `Fictional complete chain ${i}`,
      ...(prior ? { targetAdjustmentId: prior, expectedBaseRevision: 2 } : {}) }); prior = next.adjustmentId;
  }
  await seed('RS-other', 'loc-1', '2026-09-23T12:00:00Z', '2026-09-23T20:00:00Z');
  await finalize(); const c = ready(await capture());
  expect(c.entries).toHaveLength(2); expect(c.entries[0].sourceKind).toBe('ADJUSTMENT');
  expect(c.lineage.requests).toHaveLength(9); expect(c.lineage.adjustments).toHaveLength(9); expect(c.lineage.events).toHaveLength(18);
  expect(c.locationIds).toEqual(['loc-1', 'loc-2']);
  expect(await fixture().q('SELECT id FROM time_entries ORDER BY id')).toEqual([{ id: 'RS-other' }]);
});
it('deduplicates overnight time crossing adjacent finalized coverage and blocks missing context coverage', async () => {
  await seed('RS-overnight', 'loc-2', '2026-09-21T02:00:00Z', '2026-09-21T10:00:00Z');
  const adjacent = { startDate: '2026-09-20', endDate: '2026-09-20' }; await finalize(adjacent); await finalize();
  const r = request(); r.contexts = [{ startAt: '2026-09-20T04:00:00Z', endAt: '2026-09-28T04:00:00Z' }, ...r.contexts];
  r.coverage = [adjacent, period]; const c = ready(await capture(r)); expect(c.entries).toHaveLength(1); expect(c.locationIds).toEqual(['loc-2']);
  expect(c.entries[0].startAt).toBe('2026-09-21T02:00:00Z'); r.coverage = [period];
  expect(await capture(r)).toEqual({ state: 'blocked', reason: 'coverage_missing' });
});
it('keeps explicit finalized zero separate from absent approval and reopened source', async () => {
  expect(await capture()).toEqual({ state: 'blocked', reason: 'coverage_missing' });
  await action('APPROVE'); expect(await capture()).toEqual({ state: 'blocked', reason: 'not_finalized' });
  await action('FINALIZE'); const c = ready(await capture()); expect(c.entries).toEqual([]); expect(c.emptyFinalizedCoverage).toEqual([period]);
  await action('REOPEN'); expect(await capture()).toEqual({ state: 'blocked', reason: 'not_finalized' });
});
it('does not auto-finalize pending or open source and preserves database finalization interlocks', async () => {
  await seed(); const pending = await submitTimeCorrection(employee, { operationId: randomUUID(), kind: 'ENTRY_BOUNDARY', timeEntryId: 'RS-entry',
    proposedStartAt: '2026-09-22T11:00:00Z', proposedEndAt: '2026-09-22T21:00:00Z', reason: 'Fictional pending evidence' }, fixture().db.executor);
  expect(pending.status).toBe('pending'); expect((await capture()).state).toBe('blocked');
  expect(await fixture().q('SELECT count(*)::int AS n FROM timecard_revisions')).toEqual([{ n: 0 }]);
  if (pending.status !== 'pending') throw Error('Expected pending');
  await reviewTimeCorrection(owner, { operationId: randomUUID(), requestId: pending.requestId, expectedRevision: 1, decision: 'REJECT' }, fixture().db.executor);
  await finalize(); await expect(fixture().q("UPDATE time_entries SET version=2 WHERE id='RS-entry'")).rejects.toThrow('FINALIZED_PERIOD');
  await action('REOPEN'); await fixture().q("UPDATE time_entries SET clock_out_at=NULL,status='CLOCKED_IN',version=2 WHERE id='RS-entry'");
  expect((await capture()).state).toBe('blocked');
});
it('accepts frozen display metadata with a changed current hash and rejects wrong server identity', async () => {
  await seed(); await finalize(); const before = ready(await capture());
  await fixture().q("UPDATE employees SET first_name='Fictional renamed' WHERE id='c34-a'"); const after = ready(await capture());
  expect(after.coverage[0].sourceHash).toBe(before.coverage[0].sourceHash); expect(after.coverage[0].currentSourceHash).not.toBe(before.coverage[0].currentSourceHash);
  const wrong = request(); wrong.timeZone = 'America/New_York'; expect((await capture(wrong)).state).toBe('blocked');
});

it('uses an actual limit-plus-one sentinel and refuses a truncated entry capture', async () => {
  await fixture().q(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version)
    SELECT 'RS-limit-'||n,'c34-a','loc-1',$1,'2026-09-22T12:00:00Z'::timestamptz+n*interval '2 seconds',
      '2026-09-22T12:00:00Z'::timestamptz+n*interval '2 seconds'+interval '1 second','CLOCKED_OUT',1 FROM generate_series(1,2049) n`, [fixture().devices[0].device.id]);
  await finalize(); expect(await capture()).toEqual({ state: 'blocked', reason: 'source_limit' });
});

it('accepts the existing valid 80-code-point Unicode name in an actual immutable break snapshot', async () => {
  const name = 'R'.repeat(79) + '😀';
  const b = await saveBreakType(fixture().owner, { name, category: 'REST', targetMinutes: 15, active: true, expectedVersion: 0 }, fixture().db.executor);
  await seed(); await fixture().q(`INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at,version,break_type_id,break_type_snapshot)
    VALUES('RS-unicode','RS-entry','2026-09-22T16:00:00Z','2026-09-22T16:15:00Z',1,$1,$2::jsonb)`,
  [b.id, JSON.stringify({ id: b.id, version: b.version, name: b.name, category: b.category, targetMinutes: b.targetMinutes })]);
  await finalize(); const c = ready(await capture()); expect(c.entries[0].breaks[0].classification?.name).toBe(name);
  expect(c.coverage[0].snapshot.entries[0].breaks[0].name).toBe(name);
});
