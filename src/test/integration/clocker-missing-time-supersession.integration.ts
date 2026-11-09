import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';
import { reviewTimeCorrection, submitTimeCorrection, type CorrectionMutationResult } from '../../lib/time-corrections/service';
import { readEmployeeTimeCorrections } from '../../lib/data/time-corrections.server';
import { createPunchFixture } from './clocker-punch-fixture';
import { ClockerPunchService } from '../../lib/clocker/punches.server';

let f: Awaited<ReturnType<typeof createPunchFixture>>;
const proof = (id: string, role: 'OWNER' | 'EMPLOYEE', hash: string): SessionMutationProof => ({
  sessionTokenHash: hash.repeat(64),
  employee: { id, firstName: 'Fictional', lastName: 'QA', role, primaryLocationId: 'loc-1' },
});
const employee = proof('c34-a', 'EMPLOYEE', 'd');
const owner = proof('c34-owner', 'OWNER', 'a');
const interval = { proposedStartAt: '2026-01-05T08:00:00Z', proposedEndAt: '2026-01-05T09:00:00Z' };
const replacement = { proposedStartAt: '2026-01-05T08:05:00Z', proposedEndAt: '2026-01-05T09:00:00Z' };
const missing = () => ({ operationId: randomUUID(), kind: 'MISSING_ENTRY' as const, locationId: 'loc-1', ...interval, reason: 'Fictional tablet outage.' });
function pending(result: CorrectionMutationResult) {
  expect(result.status).toBe('pending');
  if (result.status !== 'pending') throw new Error(JSON.stringify(result));
  return result;
}
function approved(result: CorrectionMutationResult) {
  expect(result.status).toBe('approved');
  if (result.status !== 'approved') throw new Error(JSON.stringify(result));
  return result;
}
const reviewCommand = (requestId: string) => ({ operationId: randomUUID(), requestId, expectedRevision: 1, decision: 'APPROVE' as const });
const review = (requestId: string) => reviewTimeCorrection(owner, reviewCommand(requestId), f.db.executor);
async function root(actor = employee) {
  const request = pending(await submitTimeCorrection(actor, missing(), f.db.executor));
  return approved(await review(request.requestId));
}
const supersede = (target: { adjustmentId: string; revision: number }) => ({
  ...missing(), ...replacement, targetAdjustmentId: target.adjustmentId, expectedBaseRevision: target.revision,
});
async function rawHistory() {
  const tables = ['time_entries', 'break_entries', 'clocker_devices', 'clocker_device_events', 'clocker_command_ledger', 'clocker_employee_clock_state', 'shifts', 'schedule_publication_revisions', 'schedule_publication_revision_shifts'];
  const snapshot: Record<string, unknown> = {};
  for (const table of tables) snapshot[table] = await f.q(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY to_jsonb(t)::text`);
  return snapshot;
}
beforeEach(async () => {
  f = await createPunchFixture({ breaks: true,companyAccess:true });
  await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'c34-a',clock_timestamp()+interval '1 day')");
});
afterEach(async () => { if (f) await f.db.dispose(); });

describe('D2-CODEX-004 missing-time supersession', () => {
  it('replaces A with B and C as one effective leaf while preserving the full immutable chain and raw evidence', async () => {
    const punches = new ClockerPunchService(f.key, f.db.executor);
    const identity = (await f.identity()).proof;
    for (const action of ['CLOCK_IN', 'START_BREAK', 'END_BREAK', 'CLOCK_OUT'] as const) {
      const view = await punches.read(identity), snapshot = view.snapshot;
      await punches.execute(identity, {
        commandId: randomUUID(), action, verificationId: view.verificationId,
        expected: { revision: snapshot.revision, timeEntryId: snapshot.entry?.id ?? null, timeEntryVersion: snapshot.entry?.version ?? null, breakEntryId: snapshot.break?.id ?? null, breakEntryVersion: snapshot.break?.version ?? null },
        ...(action === 'START_BREAK' ? { breakType: { id: f.breakType!.id, version: f.breakType!.version } } : {}),
      });
    }
    await f.q("INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('history-schedule','loc-1','2026-01-05','c34-owner'); INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('history-shift','history-schedule','c34-a','2026-01-05','04:00','05:00')");
    await f.q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('history-revision','2026-01-05',1,'PUBLISH','c34-owner'); INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time) VALUES('history-revision-shift','history-revision','history-shift','history-schedule','loc-1','c34-a','2026-01-05','04:00','05:00')");
    const raw = await rawHistory();
    expect(await f.q('SELECT count(*)::int AS n FROM clocker_command_ledger')).toEqual([{ n: 4 }]);
    const a = await root();
    const savedA = await f.q('SELECT to_jsonb(a) AS row FROM time_correction_adjustments a WHERE id=$1', [a.adjustmentId]);
    const bRequest = pending(await submitTimeCorrection(employee, supersede(a), f.db.executor));
    const b = approved(await review(bRequest.requestId));
    const cRequest = pending(await submitTimeCorrection(employee, { ...supersede(b), proposedStartAt: '2026-01-05T08:10:00Z' }, f.db.executor));
    const c = approved(await review(cRequest.requestId));
    expect(await f.q('SELECT id,supersedes_adjustment_id FROM time_correction_adjustments ORDER BY created_at')).toEqual([
      { id: a.adjustmentId, supersedes_adjustment_id: null },
      { id: b.adjustmentId, supersedes_adjustment_id: a.adjustmentId },
      { id: c.adjustmentId, supersedes_adjustment_id: b.adjustmentId },
    ]);
    expect(await f.q("SELECT adjustment_id,source_kind,time_entry_id,to_char(start_at AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS') AS start_at FROM nevora_effective_time_entries WHERE employee_id='c34-a' AND source_kind='ADJUSTMENT'")).toEqual([
      { adjustment_id: c.adjustmentId, source_kind: 'ADJUSTMENT', time_entry_id: null, start_at: '2026-01-05 08:10:00' },
    ]);
    expect(await f.q('SELECT count(*)::int AS n FROM time_correction_requests')).toEqual([{ n: 3 }]);
    expect(await f.q('SELECT count(*)::int AS n FROM time_correction_events')).toEqual([{ n: 6 }]);
    expect(await f.q('SELECT to_jsonb(a) AS row FROM time_correction_adjustments a WHERE id=$1', [a.adjustmentId])).toEqual(savedA);
    expect(await rawHistory()).toEqual(raw);
    for (const table of ['time_correction_requests', 'time_correction_events', 'time_correction_adjustments']) {
      await expect(f.q(`DELETE FROM ${table}`)).rejects.toThrow(/append.?only/i);
    }
    await expect(f.q('UPDATE time_correction_adjustments SET effective_start_at=effective_start_at WHERE id=$1', [a.adjustmentId])).rejects.toThrow(/append.?only/i);
    const history = await readEmployeeTimeCorrections(employee, f.db.executor);
    expect(history.state).toBe('ready');
    if (history.state !== 'ready') throw new Error('history unavailable');
    expect(history.requests).toHaveLength(3);
    expect(history.requests.find(item => item.id === c.requestId)).toMatchObject({ currentAdjustmentId: c.adjustmentId });
    expect(history.requests.find(item => item.id === a.requestId)).toMatchObject({ currentAdjustmentId: null });
  });

  it('installs 0017 over existing approved A without rewriting history or changing table/constraint definitions', async () => {
    await f.db.dispose();
    f = await createPunchFixture({ migrationStage: 'pre-break',companyAccess:true });
    for (const name of ['0014_clocker_breaks.sql', '0015_clocker_schedule_context.sql', '0016_time_corrections.sql']) await f.q(await readFile(`db/migrations/${name}`, 'utf8'));
    await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'c34-a',clock_timestamp()+interval '1 day')");
    const a = await root();
    const before = await f.q('SELECT to_jsonb(a) AS row FROM time_correction_adjustments a');
    const rawBefore = await rawHistory();
    const correctionHistory = async () => Promise.all(['time_correction_requests','time_correction_events','time_correction_adjustments'].map(table => f.q(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY to_jsonb(t)::text`)));
    const historyBefore = await correctionHistory();
    const installed = async () => f.q("SELECT proname,pronargs,pg_get_functiondef(oid) AS definition FROM pg_proc WHERE proname IN ('nevora_review_time_correction','nevora_submit_time_correction') ORDER BY proname,pronargs");
    const baselineFunctions = await installed();
    expect(baselineFunctions.map(row => row.pronargs)).toEqual([7,12]);
    expect(baselineFunctions[0].definition).not.toContain("current_kind IS DISTINCT FROM 'REQUESTED'");
    const definitions = () => f.q("SELECT c.relname,con.conname,pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,con.conname");
    const constraints = await definitions();
    await f.q(await readFile('db/migrations/0017_missing_time_supersession.sql', 'utf8'));
    expect(await definitions()).toEqual(constraints);
    expect(await rawHistory()).toEqual(rawBefore);
    expect(await correctionHistory()).toEqual(historyBefore);
    const functions = await installed();
    expect(functions.map(row => row.pronargs)).toEqual([7,12,14]);
    expect(functions[0].definition).toContain("current_kind IS DISTINCT FROM 'REQUESTED'");
    expect(functions[0].definition).toContain('FROM nevora_effective_break_entries child');
    expect(functions[0].definition).toContain('other.adjustment_id IS DISTINCT FROM request_row.base_adjustment_id');
    expect(functions[0].definition).toContain("target_event.event_kind IS DISTINCT FROM 'APPROVED'");
    expect(functions[1].definition).toContain('FROM nevora_effective_time_entries');
    expect(functions[1].definition).toContain('p_proposed_start<parent_start OR p_proposed_end>parent_end');
    expect(functions[2].definition).toContain('p_expected_base_revision');
    expect(await reviewTimeCorrection(owner, { operationId: randomUUID(), requestId: a.requestId, expectedRevision: 2, decision: 'REJECT' }, f.db.executor)).toEqual({ status: 'conflict' });
    expect(await reviewTimeCorrection(owner, { operationId: a.adjustmentId, requestId: a.requestId, expectedRevision: 1, decision: 'APPROVE' }, f.db.executor)).toEqual(a);
    expect(await f.q('SELECT to_jsonb(a) AS row FROM time_correction_adjustments a')).toEqual(before);
    const b = pending(await submitTimeCorrection(employee, supersede(a), f.db.executor));
    approved(await review(b.requestId));
    expect(await f.q('SELECT count(*)::int AS n FROM nevora_time_correction_leaf_adjustments')).toEqual([{ n: 1 }]);
  });

  it('replays identical submit/review receipts and rejects changed reuse of either operation', async () => {
    const a = await root(), command = supersede(a);
    const b = pending(await submitTimeCorrection(employee, command, f.db.executor));
    expect(await submitTimeCorrection(employee, command, f.db.executor)).toEqual(b);
    expect(await submitTimeCorrection(employee, { ...command, expectedBaseRevision: 3 }, f.db.executor)).toEqual({ status: 'conflict' });
    const decision = reviewCommand(b.requestId);
    const result = approved(await reviewTimeCorrection(owner, decision, f.db.executor));
    expect(await reviewTimeCorrection(owner, decision, f.db.executor)).toEqual(result);
    expect(await reviewTimeCorrection(owner, { ...decision, decision: 'REJECT' }, f.db.executor)).toEqual({ status: 'conflict' });
    // Saved submit receipt remains stable even after its target has been superseded.
    expect(await submitTimeCorrection(employee, command, f.db.executor)).toEqual(b);
    expect(await f.q('SELECT count(*)::int AS n FROM time_correction_adjustments')).toEqual([{ n: 2 }]);
  });

  it('rejects a stale or nonexistent target and wrong expected base revision without appending requests', async () => {
    const a = await root();
    expect(await submitTimeCorrection(employee, { ...supersede(a), expectedBaseRevision: 1 }, f.db.executor)).toEqual({ status: 'blocked', reason: 'stale_source' });
    expect(await submitTimeCorrection(employee, { ...supersede(a), targetAdjustmentId: randomUUID() }, f.db.executor)).toEqual({ status: 'unavailable' });
    const b = pending(await submitTimeCorrection(employee, supersede(a), f.db.executor));
    approved(await review(b.requestId));
    expect(await submitTimeCorrection(employee, supersede(a), f.db.executor)).toEqual({ status: 'blocked', reason: 'stale_source' });
    expect(await f.q('SELECT count(*)::int AS n FROM time_correction_requests')).toEqual([{ n: 2 }]);
  });

  it('revalidates target status at approval even when its identity is still a leaf', async () => {
    const a = await root();
    const b = pending(await submitTimeCorrection(employee, supersede(a), f.db.executor));
    // The combined 002 guard blocks a fresh terminal reversal. Seed the historical
    // invalidation that baseline 0016 could have appended, without weakening any guard.
    expect(await reviewTimeCorrection(owner, { operationId: randomUUID(), requestId: a.requestId, expectedRevision: 2, decision: 'REJECT' }, f.db.executor)).toEqual({ status: 'conflict' });
    await f.q("INSERT INTO time_correction_events(id,request_id,revision,event_kind,actor_employee_id,operation_hash,result) VALUES($1,$2,3,'REJECTED','c34-owner',repeat('f',64),$3::jsonb)", [randomUUID(),a.requestId,JSON.stringify({status:'rejected',requestId:a.requestId,revision:3})]);
    expect(await review(b.requestId)).toEqual({ status: 'blocked', reason: 'stale_source' });
    expect(await f.q('SELECT count(*)::int AS n FROM time_correction_adjustments')).toEqual([{ n: 1 }]);
  });

  it('serializes simultaneous approvals of two disjoint replacements of A so one wins and one is stale', async () => {
    const a = await root();
    const b = pending(await submitTimeCorrection(employee, supersede(a), f.db.executor));
    const c = pending(await submitTimeCorrection(employee, { ...supersede(a), proposedStartAt: '2026-01-05T10:00:00Z', proposedEndAt: '2026-01-05T11:00:00Z' }, f.db.executor));
    const results = await Promise.all([review(b.requestId), review(c.requestId)]);
    expect(results.filter(result => result.status === 'approved')).toHaveLength(1);
    expect(results).toContainEqual({ status: 'blocked', reason: 'stale_source' });
    expect(await f.q('SELECT count(*)::int AS n FROM nevora_time_correction_leaf_adjustments')).toEqual([{ n: 1 }]);
    expect(await f.q('SELECT count(*)::int AS n FROM time_correction_adjustments WHERE supersedes_adjustment_id=$1', [a.adjustmentId])).toEqual([{ n: 1 }]);
  });

  it('allows only one concurrent overlapping submission and idempotently converges concurrent identical retries', async () => {
    const a = await root(), command = supersede(a);
    const identical = await Promise.all([submitTimeCorrection(employee, command, f.db.executor), submitTimeCorrection(employee, command, f.db.executor)]);
    expect(identical[0]).toEqual(identical[1]);
    expect(identical[0].status).toBe('pending');
    expect(await submitTimeCorrection(employee, supersede(a), f.db.executor)).toEqual({ status: 'conflict' });
    const b = pending(identical[0]), decision = reviewCommand(b.requestId);
    const decisions = await Promise.all([reviewTimeCorrection(owner, decision, f.db.executor), reviewTimeCorrection(owner, decision, f.db.executor)]);
    expect(decisions[0]).toEqual(decisions[1]);
    expect(decisions[0].status).toBe('approved');
    expect(await f.q('SELECT count(*)::int AS n FROM time_correction_adjustments')).toEqual([{ n: 2 }]);
  });

  it.each(['recorded', 'missing', 'corrected', 'live'] as const)('rejects replacement overlap with unrelated %s time', async (kind) => {
    const a = await root();
    if (kind === 'missing') {
      const other = pending(await submitTimeCorrection(employee, { ...missing(), proposedStartAt: '2026-01-05T10:00:00Z', proposedEndAt: '2026-01-05T11:00:00Z' }, f.db.executor));
      approved(await review(other.requestId));
    } else {
      await f.q(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version)
        VALUES('surrounding','c34-a','loc-1',$1,'2026-01-05T10:00:00Z',$2::timestamptz,$3,1)`,
      [f.devices[0].device.id, kind === 'live' ? null : '2026-01-05T11:00:00Z', kind === 'live' ? 'CLOCKED_IN' : 'CLOCKED_OUT']);
      if (kind === 'corrected') {
        const other = pending(await submitTimeCorrection(employee, { operationId: randomUUID(), kind: 'ENTRY_BOUNDARY', timeEntryId: 'surrounding', proposedStartAt: '2026-01-05T09:45:00Z', proposedEndAt: '2026-01-05T11:00:00Z', reason: 'Fictional boundary correction.' }, f.db.executor));
        approved(await review(other.requestId));
      }
    }
    const b = pending(await submitTimeCorrection(employee, { ...supersede(a), proposedEndAt: '2026-01-05T10:30:00Z' }, f.db.executor));
    expect(await review(b.requestId)).toEqual({ status: 'blocked', reason: 'overlap' });
    expect(await f.q('SELECT count(*)::int AS n FROM time_correction_adjustments WHERE supersedes_adjustment_id=$1', [a.adjustmentId])).toEqual([{ n: 0 }]);
  });

  it('allows exact adjacency at both boundaries and keeps unrelated missing roots effective', async () => {
    const a = await root();
    for (const [start, end] of [['07:00', '08:00'], ['09:00', '10:00']]) {
      const other = pending(await submitTimeCorrection(employee, { ...missing(), proposedStartAt: `2026-01-05T${start}:00Z`, proposedEndAt: `2026-01-05T${end}:00Z` }, f.db.executor));
      approved(await review(other.requestId));
    }
    const b = pending(await submitTimeCorrection(employee, { ...supersede(a), ...interval }, f.db.executor));
    approved(await review(b.requestId));
    expect(await f.q('SELECT count(*)::int AS n FROM nevora_effective_time_entries')).toEqual([{ n: 3 }]);
  });

  it('does not allow an untargeted request to bypass overlap with A', async () => {
    await root();
    const b = pending(await submitTimeCorrection(employee, { ...missing(), ...replacement }, f.db.executor));
    expect(await review(b.requestId)).toEqual({ status: 'blocked', reason: 'overlap' });
  });

  it('fails closed for a foreign employee/workspace/location target, invalid sessions and unauthorized review', async () => {
    const a = await root();
    expect(await submitTimeCorrection(owner, supersede(a), f.db.executor)).toEqual({ status: 'unavailable' });
    expect(await submitTimeCorrection(employee, { ...supersede(a), locationId: 'loc-2' }, f.db.executor)).toEqual({ status: 'unavailable' });
    const protectedRows=async()=>Promise.all(['time_correction_requests','time_correction_events','time_correction_adjustments'].map(table=>f.q(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY to_jsonb(t)::text`)));
    const beforeInvalid=await protectedRows();
    expect(await submitTimeCorrection({ ...employee, sessionTokenHash: 'f'.repeat(64) }, supersede(a), f.db.executor)).toEqual({status:'unavailable'});
    expect(await protectedRows()).toEqual(beforeInvalid);
    const b = pending(await submitTimeCorrection(employee, supersede(a), f.db.executor));
    expect(await reviewTimeCorrection(employee, reviewCommand(b.requestId), f.db.executor)).toEqual({ status: 'unavailable' });
    await f.q("UPDATE employees SET active=false WHERE id='c34-owner'");
    const beforeReview=await protectedRows();
    expect(await review(b.requestId)).toEqual({status:'unavailable'});
    expect(await protectedRows()).toEqual(beforeReview);
    expect(await f.q('SELECT count(*)::int AS n FROM time_correction_adjustments')).toEqual([{ n: 1 }]);
  });

  it('rejects foreign workspace identity at the SQL and application boundaries without weakening the singleton schema', async () => {
    const a = await root();
    await expect(f.q("SELECT nevora_submit_time_correction($1::uuid,'foreign','c34-a','c34-a','MISSING_ENTRY',NULL,NULL,'loc-1',$2::timestamptz,$3::timestamptz,'Fictional replacement.',$4,$5::uuid,2)", [randomUUID(), replacement.proposedStartAt, replacement.proposedEndAt, 'd'.repeat(64), a.adjustmentId])).rejects.toThrow(/AUTH_REQUIRED|NOT_FOUND/);
    const b = pending(await submitTimeCorrection(employee, supersede(a), f.db.executor));
    const foreignWorkspace: SqlExecutor = {
      async query<T>(statement: SqlStatement, signal?: AbortSignal) {
        const rows = await f.db.executor.query<T>(statement, signal);
        if (statement.text.includes('FROM workspaces WHERE singleton=true')) return rows.map(row => ({ ...row, id: 'foreign' }));
        return rows;
      },
      transaction: f.db.executor.transaction,
    };
    await expect(submitTimeCorrection(employee, supersede(a), foreignWorkspace)).rejects.toThrow(/workspace_version_conflict/);
    expect(await reviewTimeCorrection(owner, reviewCommand(b.requestId), foreignWorkspace)).toEqual({ status: 'unavailable' });
  });

  it('denies self-review of a supersession even for an Owner', async () => {
    const aRequest = pending(await submitTimeCorrection(owner, missing(), f.db.executor));
    // A second fictional Owner with its own live session provides independent review.
    await f.q("UPDATE employees SET role='OWNER' WHERE id='c34-b'");
    const otherOwner = proof('c34-b', 'OWNER', 'e');
    await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('e',64),'c34-b',clock_timestamp()+interval '1 day')");
    const a = approved(await reviewTimeCorrection(otherOwner, reviewCommand(aRequest.requestId), f.db.executor));
    const b = pending(await submitTimeCorrection(owner, supersede(a), f.db.executor));
    expect(await review(b.requestId)).toEqual({ status: 'blocked', reason: 'self_review' });
    expect(await f.q('SELECT count(*)::int AS n FROM time_correction_adjustments')).toEqual([{ n: 1 }]);
  });

  it('recovers lost submit and approval responses through the exact receipt without duplicate adjustments', async () => {
    const a = await root(), command = supersede(a);
    let losses=0;
    function loseCommittedResponse(kind:'submit'|'review'): SqlExecutor {
      let lose = true;
      return { query: f.db.executor.query, async transaction(statements, signal) {
        const result = await f.db.executor.transaction(statements, signal);
        if (lose && statements.some(s=>s.text.includes(`SELECT nevora_${kind}_time_correction`))) { lose = false;losses++; throw new Error('fictional response lost after commit'); }
        return result;
      } };
    }
    expect(await submitTimeCorrection(employee, command, loseCommittedResponse('submit'))).toEqual({ status: 'outcome-unknown', operationId: command.operationId });
    expect(losses).toBe(1);
    const b = pending(await submitTimeCorrection(employee, command, f.db.executor));
    const decision = reviewCommand(b.requestId);
    expect(await reviewTimeCorrection(owner, decision, loseCommittedResponse('review'))).toEqual({ status: 'outcome-unknown', operationId: decision.operationId });
    expect(losses).toBe(2);
    approved(await reviewTimeCorrection(owner, decision, f.db.executor));
    expect(await f.q('SELECT count(*)::int AS n FROM time_correction_requests')).toEqual([{ n: 2 }]);
    expect(await f.q('SELECT count(*)::int AS n FROM time_correction_adjustments')).toEqual([{ n: 2 }]);
    expect(await f.q('SELECT count(*)::int AS n FROM nevora_effective_time_entries')).toEqual([{ n: 1 }]);
  });
});
