import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
import { reviewTimeCorrection, submitTimeCorrection, type CorrectionMutationResult } from '../../lib/time-corrections/service';
import { readEmployeeTimeCorrections, readManagerTimeCorrections } from '../../lib/data/time-corrections.server';
import { readAttendanceReview } from '../../lib/data/attendance-review.server';
import { createPunchFixture } from './clocker-punch-fixture';

let f: Awaited<ReturnType<typeof createPunchFixture>>;

const employeeProof: SessionMutationProof = {
  sessionTokenHash: 'd'.repeat(64),
  employee: {
    id: 'c34-a',
    firstName: 'Avery',
    lastName: 'QA',
    role: 'EMPLOYEE',
    primaryLocationId: 'loc-1',
  },
};
const ownerProof: SessionMutationProof = {
  sessionTokenHash: 'a'.repeat(64),
  employee: {
    id: 'c34-owner',
    firstName: 'Owner',
    lastName: 'QA',
    role: 'OWNER',
    primaryLocationId: 'loc-1',
  },
};

const isoAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

type PendingCorrectionResult = Extract<CorrectionMutationResult,{status:'pending'}>;
function mustBePending(result: CorrectionMutationResult): PendingCorrectionResult {
  if (result.status !== 'pending') throw new Error('expected pending correction result');
  return result;
}

async function seedClosedEntry(options: {
  id?: string;
  employeeId?: string;
  startMinutesAgo?: number;
  endMinutesAgo?: number;
  withBreak?: boolean;
} = {}) {
  const id = options.id ?? 'd2-entry-1';
  const employeeId = options.employeeId ?? 'c34-a';
  const startAt = isoAgo(options.startMinutesAgo ?? 240);
  const endAt = isoAgo(options.endMinutesAgo ?? 120);
  await f.q(
    `INSERT INTO time_entries(
       id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version
     ) VALUES($1,$2,'loc-1',$3,$4::timestamptz,$5::timestamptz,'CLOCKED_OUT',4)`,
    [id, employeeId, f.devices[0].device.id, startAt, endAt],
  );
  let breakId: string | null = null;
  if (options.withBreak) {
    breakId = `${id}-break`;
    const snapshot = {
      id: f.breakType!.id,
      version: f.breakType!.version,
      name: f.breakType!.name,
      category: f.breakType!.category,
      targetMinutes: f.breakType!.targetMinutes,
    };
    await f.q(
      `INSERT INTO break_entries(
         id,time_entry_id,break_start_at,break_end_at,version,break_type_id,break_type_snapshot
       ) VALUES($1,$2,$3::timestamptz,$4::timestamptz,2,$5,$6::jsonb)`,
      [breakId, id, isoAgo(190), isoAgo(175), f.breakType!.id, JSON.stringify(snapshot)],
    );
  }
  return { id, breakId, startAt, endAt };
}

async function submitEntryResult(entryId: string, overrides: Partial<{
  operationId: string;
  proposedStartAt: string;
  proposedEndAt: string;
  reason: string;
}> = {}): Promise<CorrectionMutationResult> {
  return submitTimeCorrection(employeeProof, {
    operationId: overrides.operationId ?? randomUUID(),
    kind: 'ENTRY_BOUNDARY',
    timeEntryId: entryId,
    proposedStartAt: overrides.proposedStartAt ?? isoAgo(235),
    proposedEndAt: overrides.proposedEndAt ?? isoAgo(125),
    reason: overrides.reason ?? 'Recorded entry boundaries need review.',
  }, f.db.executor);
}
async function submitEntry(entryId: string, overrides: Partial<{
  operationId: string;
  proposedStartAt: string;
  proposedEndAt: string;
  reason: string;
}> = {}): Promise<PendingCorrectionResult> {
  return mustBePending(await submitEntryResult(entryId, overrides));
}

async function approve(requestId: string, operationId = randomUUID()) {
  return reviewTimeCorrection(ownerProof, {
    operationId,
    requestId,
    expectedRevision: 1,
    decision: 'APPROVE',
    note: 'Compared with the recorded time evidence.',
  }, f.db.executor);
}

beforeEach(async () => {
  f = await createPunchFixture({ breaks: true });
  await f.q(
    `INSERT INTO employee_sessions(token_hash,employee_id,expires_at)
     VALUES(repeat('d',64),'c34-a',clock_timestamp()+interval '1 day')`,
  );
});
afterEach(async () => {
  if (f) await f.db.dispose();
});

describe('D2 append-only time correction protocol', () => {
  it('approves a recorded-entry correction without changing the raw Clocker row', async () => {
    const entry = await seedClosedEntry();
    const rawBefore = await f.q(
      `SELECT clock_in_at::text,clock_out_at::text,status,version,device_id,schedule_context
       FROM time_entries WHERE id=$1`, [entry.id],
    );

    const requested = await submitEntry(entry.id);
    expect(requested.status).toBe('pending');
    expect(await f.q('SELECT count(*)::int AS count FROM nevora_pending_time_corrections'))
      .toEqual([{ count: 1 }]);

    const accepted = await approve(requested.requestId!);
    expect(accepted.status).toBe('approved');

    expect(await f.q(
      `SELECT clock_in_at::text,clock_out_at::text,status,version,device_id,schedule_context
       FROM time_entries WHERE id=$1`, [entry.id],
    )).toEqual(rawBefore);
    expect(await f.q(
      `SELECT source_kind,time_entry_id,adjustment_id IS NOT NULL AS adjusted,
              start_at<end_at AS valid
       FROM nevora_effective_time_entries WHERE time_entry_id=$1`, [entry.id],
    )).toEqual([{ source_kind: 'RECORDED', time_entry_id: entry.id, adjusted: true, valid: true }]);
    expect(await f.q('SELECT count(*)::int AS count FROM nevora_pending_time_corrections'))
      .toEqual([{ count: 0 }]);
    expect(await f.q(
      `SELECT event_kind,revision FROM time_correction_events
       WHERE request_id=$1::uuid ORDER BY revision`, [requested.requestId],
    )).toEqual([
      { event_kind: 'REQUESTED', revision: 1 },
      { event_kind: 'APPROVED', revision: 2 },
    ]);
  });

  it('replays identical request/review operations and rejects operation-ID reuse with changed content', async () => {
    const entry = await seedClosedEntry();
    const requestId = randomUUID();
    const command = {
      operationId: requestId,
      proposedStartAt: isoAgo(235),
      proposedEndAt: isoAgo(125),
      reason: 'Recorded entry boundaries need review.',
    };
    const first = await submitEntry(entry.id, command);
    expect(await submitEntry(entry.id, command)).toEqual(first);
    expect(await submitEntryResult(entry.id, { ...command, reason: 'Different request body.' }))
      .toEqual({ status: 'conflict' });

    const reviewId = randomUUID();
    const accepted = await approve(first.requestId!, reviewId);
    expect(await approve(first.requestId!, reviewId)).toEqual(accepted);
    const changed = await reviewTimeCorrection(ownerProof, {
      operationId: reviewId,
      requestId: first.requestId!,
      expectedRevision: 1,
      decision: 'REJECT',
      note: 'Changed decision.',
    }, f.db.executor);
    expect(changed).toEqual({ status: 'conflict' });
    expect(await f.q('SELECT count(*)::int AS count FROM time_correction_adjustments'))
      .toEqual([{ count: 1 }]);
  });

  it('never permits correction of the open live Clocker entry', async () => {
    await f.q(
      `INSERT INTO time_entries(
        id,employee_id,location_id,device_id,clock_in_at,status,version
      ) VALUES('d2-live','c34-a','loc-1',$1,$2::timestamptz,'CLOCKED_IN',1)`,
      [f.devices[0].device.id, isoAgo(20)],
    );
    await f.q(`INSERT INTO clocker_employee_clock_state(employee_id,revision) VALUES('c34-a',9)`);
    const before = await f.q(
      `SELECT id,clock_out_at,status,version FROM time_entries WHERE id='d2-live'`,
    );
    const result = await submitEntryResult('d2-live', {
      proposedStartAt: isoAgo(19),
      proposedEndAt: isoAgo(1),
    });
    expect(result).toEqual({ status: 'blocked', reason: 'live_state' });
    expect(await f.q(
      `SELECT id,clock_out_at,status,version FROM time_entries WHERE id='d2-live'`,
    )).toEqual(before);
    expect(await f.q(
      `SELECT revision FROM clocker_employee_clock_state WHERE employee_id='c34-a'`,
    )).toEqual([{ revision: 9 }]);
    expect(await f.q('SELECT count(*)::int AS count FROM time_correction_requests'))
      .toEqual([{ count: 0 }]);
  });

  it('blocks self-approval even for an Owner', async () => {
    const entry = await seedClosedEntry({ id: 'd2-owner-entry', employeeId: 'c34-owner' });
    const requested = mustBePending(await submitTimeCorrection(ownerProof, {
      operationId: randomUUID(),
      kind: 'ENTRY_BOUNDARY',
      timeEntryId: entry.id,
      proposedStartAt: isoAgo(235),
      proposedEndAt: isoAgo(125),
      reason: 'Owner entry needs independent review.',
    }, f.db.executor));
    expect(requested.status).toBe('pending');
    const reviewed = await reviewTimeCorrection(ownerProof, {
      operationId: randomUUID(),
      requestId: requested.requestId!,
      expectedRevision: 1,
      decision: 'APPROVE',
    }, f.db.executor);
    expect(reviewed).toEqual({ status: 'blocked', reason: 'self_review' });
    expect(await f.q('SELECT count(*)::int AS count FROM time_correction_adjustments'))
      .toEqual([{ count: 0 }]);
  });

  it('preserves break classification while adjusting only approved historical boundaries', async () => {
    const entry = await seedClosedEntry({ withBreak: true });
    const before = await f.q(
      `SELECT break_type_id,break_type_snapshot,break_start_at::text,break_end_at::text,version
       FROM break_entries WHERE id=$1`, [entry.breakId],
    );
    const requested = mustBePending(await submitTimeCorrection(employeeProof, {
      operationId: randomUUID(),
      kind: 'BREAK_BOUNDARY',
      timeEntryId: entry.id,
      breakEntryId: entry.breakId!,
      proposedStartAt: isoAgo(188),
      proposedEndAt: isoAgo(174),
      reason: 'Break ended one minute earlier.',
    }, f.db.executor));
    expect(requested.status).toBe('pending');
    expect((await approve(requested.requestId!)).status).toBe('approved');

    expect(await f.q(
      `SELECT break_type_id,break_type_snapshot,break_start_at::text,break_end_at::text,version
       FROM break_entries WHERE id=$1`, [entry.breakId],
    )).toEqual(before);
    const effective = await f.q<{
      break_type_id: string;
      break_type_snapshot: Record<string, unknown>;
      adjusted: boolean;
    }>(
      `SELECT break_type_id,break_type_snapshot,adjustment_id IS NOT NULL AS adjusted
       FROM nevora_effective_break_entries WHERE break_entry_id=$1`, [entry.breakId],
    );
    expect(effective[0].break_type_id).toBe(f.breakType!.id);
    expect(effective[0].break_type_snapshot).toEqual(before[0].break_type_snapshot);
    expect(effective[0].adjusted).toBe(true);
  });

  it('records a missing-entry approval as an adjustment, never as a fabricated Clocker punch', async () => {
    const requested = mustBePending(await submitTimeCorrection(employeeProof, {
      operationId: randomUUID(),
      kind: 'MISSING_ENTRY',
      locationId: 'loc-1',
      proposedStartAt: isoAgo(300),
      proposedEndAt: isoAgo(240),
      reason: 'The tablet was unavailable for this completed shift.',
    }, f.db.executor));
    expect(requested.status).toBe('pending');
    expect((await approve(requested.requestId!)).status).toBe('approved');

    expect(await f.q('SELECT count(*)::int AS count FROM time_entries')).toEqual([{ count: 0 }]);
    expect(await f.q('SELECT count(*)::int AS count FROM clocker_command_ledger')).toEqual([{ count: 0 }]);
    expect(await f.q(
      `SELECT source_kind,time_entry_id,adjustment_id IS NOT NULL AS adjusted,status
       FROM nevora_effective_time_entries`,
    )).toEqual([{
      source_kind: 'ADJUSTMENT',
      time_entry_id: null,
      adjusted: true,
      status: 'CLOCKED_OUT',
    }]);
  });

  it('serializes simultaneous approve/reject decisions so exactly one terminal decision wins', async () => {
    const entry = await seedClosedEntry();
    const requested = await submitEntry(entry.id);
    const [approveResult, rejectResult] = await Promise.all([
      reviewTimeCorrection(ownerProof, {
        operationId: randomUUID(),
        requestId: requested.requestId!,
        expectedRevision: 1,
        decision: 'APPROVE',
      }, f.db.executor),
      reviewTimeCorrection(ownerProof, {
        operationId: randomUUID(),
        requestId: requested.requestId!,
        expectedRevision: 1,
        decision: 'REJECT',
      }, f.db.executor),
    ]);
    const statuses = [approveResult.status, rejectResult.status].sort();
    expect(statuses).toContain('conflict');
    expect(statuses.some((status) => status === 'approved' || status === 'rejected')).toBe(true);
    expect(await f.q(
      `SELECT count(*)::int AS count FROM time_correction_events
       WHERE request_id=$1::uuid AND event_kind IN ('APPROVED','REJECTED')`,
      [requested.requestId],
    )).toEqual([{ count: 1 }]);
  });

  it('blocks stale source and overlapping effective time rather than silently rewriting history', async () => {
    const first = await seedClosedEntry({
      id: 'd2-entry-early',
      startMinutesAgo: 360,
      endMinutesAgo: 300,
    });
    await seedClosedEntry({
      id: 'd2-entry-late',
      startMinutesAgo: 240,
      endMinutesAgo: 180,
    });

    const stale = await submitEntry(first.id, {
      proposedStartAt: isoAgo(355),
      proposedEndAt: isoAgo(305),
    });
    await f.q('UPDATE time_entries SET version=version+1 WHERE id=$1', [first.id]);
    expect(await approve(stale.requestId!)).toEqual({ status: 'blocked', reason: 'stale_source' });

    const clean = await seedClosedEntry({
      id: 'd2-entry-middle',
      startMinutesAgo: 290,
      endMinutesAgo: 250,
    });
    const overlap = await submitEntry(clean.id, {
      proposedStartAt: isoAgo(260),
      proposedEndAt: isoAgo(210),
    });
    expect(await approve(overlap.requestId!)).toEqual({ status: 'blocked', reason: 'overlap' });
    expect(await f.q(
      `SELECT count(*)::int AS count FROM time_correction_adjustments
       WHERE request_id=ANY($1::uuid[])`,
      [[stale.requestId, overlap.requestId]],
    )).toEqual([{ count: 0 }]);
  });

  it('supersedes an earlier approved adjustment while retaining both immutable revisions', async () => {
    const entry = await seedClosedEntry();
    const rawBefore = await f.q(
      'SELECT clock_in_at::text,clock_out_at::text,version FROM time_entries WHERE id=$1',
      [entry.id],
    );
    const first = await submitEntry(entry.id, {
      proposedStartAt: isoAgo(235),
      proposedEndAt: isoAgo(125),
    });
    const firstApproval = await approve(first.requestId!);
    expect(firstApproval.status).toBe('approved');

    const second = await submitEntry(entry.id, {
      proposedStartAt: isoAgo(230),
      proposedEndAt: isoAgo(130),
      reason: 'A second review found the exact boundaries.',
    });
    const secondApproval = await approve(second.requestId!);
    expect(secondApproval.status).toBe('approved');

    expect(await f.q(
      `SELECT count(*)::int AS count FROM time_correction_adjustments WHERE time_entry_id=$1`,
      [entry.id],
    )).toEqual([{ count: 2 }]);
    expect(await f.q(
      `SELECT count(*)::int AS count FROM nevora_time_correction_leaf_adjustments
       WHERE time_entry_id=$1`, [entry.id],
    )).toEqual([{ count: 1 }]);
    expect(await f.q(
      'SELECT clock_in_at::text,clock_out_at::text,version FROM time_entries WHERE id=$1',
      [entry.id],
    )).toEqual(rawBefore);
  });

  it('keeps requests, decisions and adjustments append-only', async () => {
    const entry = await seedClosedEntry();
    const requested = await submitEntry(entry.id);
    const accepted = await approve(requested.requestId!);
    expect(accepted.status).toBe('approved');

    await expect(f.q(
      'UPDATE time_correction_requests SET reason=$2 WHERE id=$1::uuid',
      [requested.requestId, 'Changed later'],
    )).rejects.toThrow(/append.?only/i);
    await expect(f.q(
      'DELETE FROM time_correction_events WHERE request_id=$1::uuid',
      [requested.requestId],
    )).rejects.toThrow(/append.?only/i);
    await expect(f.q(
      'UPDATE time_correction_adjustments SET effective_start_at=effective_start_at+interval \'1 minute\' WHERE request_id=$1::uuid',
      [requested.requestId],
    )).rejects.toThrow(/append.?only/i);
  });

  it('serves the employee history and manager inbox from the same protected pending state', async () => {
    const entry = await seedClosedEntry();
    const requested = await submitEntry(entry.id);
    const employee = await readEmployeeTimeCorrections(employeeProof, f.db.executor);
    expect(employee.state).toBe('ready');
    if (employee.state !== 'ready') throw new Error('employee corrections unavailable');
    expect(employee.requests).toHaveLength(1);
    expect(employee.requests[0]).toMatchObject({id:requested.requestId,status:'PENDING',kind:'ENTRY_BOUNDARY'});
    expect(employee.locations.map((location) => location.id)).toContain('loc-1');

    const manager = await readManagerTimeCorrections(ownerProof, f.db.executor);
    expect(manager.state).toBe('ready');
    if (manager.state !== 'ready') throw new Error('manager corrections unavailable');
    expect(manager.requests).toHaveLength(1);
    expect(manager.requests[0]).toMatchObject({id:requested.requestId,status:'PENDING',employeeName:'Avery QA',isSelf:false});

    expect((await approve(requested.requestId!)).status).toBe('approved');
    const refreshed = await readEmployeeTimeCorrections(employeeProof, f.db.executor);
    expect(refreshed.state).toBe('ready');
    if (refreshed.state !== 'ready') throw new Error('employee corrections unavailable');
    expect(refreshed.requests[0].status).toBe('APPROVED');
    const inbox = await readManagerTimeCorrections(ownerProof, f.db.executor);
    expect(inbox).toMatchObject({state:'ready',requests:[]});
  });

  it('feeds the authoritative pending correction count into D1 without enabling future policy signals', async () => {
    const requested = mustBePending(await submitTimeCorrection(employeeProof, {
      operationId:randomUUID(),kind:'MISSING_ENTRY',locationId:'loc-1',
      proposedStartAt:isoAgo(300),proposedEndAt:isoAgo(240),reason:'Tablet was unavailable.',
    }, f.db.executor));
    expect(requested.status).toBe('pending');
    const attendance = await readAttendanceReview(ownerProof, f.db.executor);
    expect(attendance.state).toBe('ready');
    if (attendance.state !== 'ready') throw new Error('attendance unavailable');
    expect(attendance.pendingCorrectionCount).toBe(1);
    expect(attendance.coverage.deferredCapabilities).not.toContain('correction_review');
    expect(attendance.coverage.deferredCapabilities).toContain('overtime_risk');

    expect((await approve(requested.requestId!)).status).toBe('approved');
    const after = await readAttendanceReview(ownerProof, f.db.executor);
    expect(after.state).toBe('ready');
    if (after.state !== 'ready') throw new Error('attendance unavailable');
    expect(after.pendingCorrectionCount).toBe(0);
  });

});
