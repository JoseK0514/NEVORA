import { randomUUID } from 'node:crypto';
import { afterEach, expect, it, rs } from '@rstest/core';
import { POST } from '../../app/api/workforce/[resource]/[[...selector]]/route';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
import { applyWorkforceCommand } from '../../lib/workforce/settings.server';
import type { PuertoRicoAccrualEvidence } from '../../lib/workforce/puerto-rico-pto';
import { companyAccessFixture } from './company-access-fixture';

let f: Awaited<ReturnType<typeof companyAccessFixture>>;
let session: SessionMutationProof;
rs.mock('server-only', () => ({}));
rs.mock('@/lib/auth/session', () => ({ requireSessionMutationProof: async () => session }));
rs.mock('../../lib/data/sql-executor', () => ({ neonNotificationExecutor: () => f.db.executor }));
afterEach(async () => f?.db.dispose());

async function setup() {
  f = await companyAccessFixture();
  session = f.owner;
  const [{ year }] = await f.q<{ year: string }>("SELECT extract(year FROM clock_timestamp() AT TIME ZONE 'America/Puerto_Rico')::text AS year");
  const startDate = year + '-01-01';
  const endDate = year + '-01-31';
  const hireDate = String(Number(year) - 3) + '-01-01';
  const vest = String(Number(year) - 3) + '-07-01';
  await f.q("UPDATE workspaces SET time_zone='America/Puerto_Rico'");
  await f.q("UPDATE employees SET hire_date=$1 WHERE id='target'", [hireDate]);
  await f.q(`INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id,hire_date)
    VALUES ('part-time','Fictional','PartTime','555004','part-time@example.invalid','EMPLOYEE','loc-1',$1)`, [hireDate]);
  const policyIds = { vacation: await policy('VACATION'), sick: await policy('SICK') };
  const evidence: PuertoRicoAccrualEvidence = {
    reference: 'fictional-payroll-jan',
    coverage: 'STANDARD', windowMethod: 'HIRE_ANNIVERSARY', vacationVestsOn: vest, openingBalancesReconciled: true,
    unresolvedTime: false, regularMinutes: 9600, overtimeMinutes: 0, paidBreakMinutes: 0,
    vacationUsedMinutes: 0, sickUsedMinutes: 0, catastrophicLeaveMinutes: 0, day: { kind: 'FIXED', minutes: 480 },
  };
  async function finalized(employeeId: string, recordedMinutes: number, revision = 1) {
    const operation = randomUUID();
    const entries = [];
    let remaining = recordedMinutes;
    for (let day = 1; remaining > 0; day++) {
      const start = Date.parse(year + '-01-' + String(day).padStart(2, '0') + 'T12:00:00Z');
      const work = Math.min(remaining, employeeId === 'part-time' ? 360 : 480);
      const startAt = new Date(start).toISOString();
      const endAt = new Date(start + work * 60000).toISOString();
      entries.push({
        id: employeeId + '-' + day, locationId: 'loc-1', locationName: 'Fictional Puerto Rico',
        positionId: null, positionName: null, sourceKind: 'RECORDED', adjustmentId: null, recordedVersion: revision,
        startAt, endAt, rawStartAt: startAt, rawEndAt: endAt, breaks: [],
      });
      remaining -= work;
    }
    await f.q(`INSERT INTO timecard_revisions(operation_id,workspace_id,employee_id,start_date,end_date,revision,action,
      actor_employee_id,source_hash,snapshot,command_hash,occurred_at)
      SELECT $1,id,$2,$3,$4,$5,'FINALIZE','owner',repeat('a',32),$6::jsonb,repeat('b',64),$7::timestamptz
      FROM workspaces WHERE singleton`,
    [operation, employeeId, startDate, endDate, revision, JSON.stringify({
      employeeId, employeeName: 'Fictional Employee', timeZone: 'America/Puerto_Rico', startDate, endDate,
      pendingCorrections: 0, entries, corrections: [],
    }), year + '-02-01T05:00:00Z']);
    return operation;
  }
  return { evidence, policyIds, finalized };
}

async function policy(code: string) {
  const result = await applyWorkforceCommand(f.owner, {
    kind: 'PTO_POLICY', operationId: randomUUID(), code, label: 'Fictional ' + code,
    enabled: true, fullDayMinutes: 480, earnedMinutesPer100Hours: 600, carryoverCapMinutes: 0, expectedRevision: 0,
  }, f.db.executor);
  if (result.state !== 'saved' || !result.receipt.policyId) throw new Error('Missing fictional policy');
  return result.receipt.policyId;
}

async function request(action: 'preview' | 'post', context: Awaited<ReturnType<typeof setup>>, timecardOperationId: string, evidence: PuertoRicoAccrualEvidence) {
  const origin = 'https://nevora.example.invalid';
  const response = await POST(new Request(origin + '/api/workforce/pto-accrual', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', 'x-nevora-workforce': '1' },
    body: JSON.stringify({ action, timecardOperationId, policyIds: context.policyIds, evidence }),
  }), { params: Promise.resolve({ resource: 'pto-accrual' }) });
  return { status: response.status, body: await response.json() as unknown };
}

const balances = () => f.q(`SELECT employee_id,policy_code,sum(minutes)::integer AS minutes
  FROM pto_ledger GROUP BY employee_id,policy_code ORDER BY employee_id,policy_code`);

it('previews and posts the verified full-time and part-time amounts through the Owner route', async () => {
  const ctx = await setup();
  const fullTime = await ctx.finalized('target', 9600);
  const partTime = await ctx.finalized('part-time', 7200);
  const partEvidence: PuertoRicoAccrualEvidence = {
    ...ctx.evidence, regularMinutes: 7200, sickUsedMinutes: 600, day: { kind: 'VARIABLE', workedDays: 20 },
  };
  session = f.manager;
  expect((await request('post', ctx, fullTime, ctx.evidence)).status).toBe(403);
  expect(await balances()).toEqual([]);
  session = f.owner;
  expect(await request('preview', ctx, partTime, partEvidence)).toMatchObject({
    status: 200, body: { state: 'ready', entries: [
      { policyCode: 'SICK', awardMinutes: 360, qualifyingMinutes: 7800 },
      { policyCode: 'VACATION', awardMinutes: 270, qualifyingMinutes: 7800 },
    ] },
  });
  expect(await balances()).toEqual([]);
  expect(await request('post', ctx, fullTime, ctx.evidence)).toMatchObject({ status: 200, body: { state: 'saved' } });
  const retries = await Promise.all([
    request('post', ctx, partTime, partEvidence), request('post', ctx, partTime, partEvidence),
  ]);
  expect(retries[0]).toEqual(retries[1]);
  expect(retries[0]).toMatchObject({ status: 200, body: { state: 'saved' } });
  expect(await balances()).toEqual([
    { employee_id: 'part-time', policy_code: 'SICK', minutes: 360 },
    { employee_id: 'part-time', policy_code: 'VACATION', minutes: 270 },
    { employee_id: 'target', policy_code: 'SICK', minutes: 480 },
    { employee_id: 'target', policy_code: 'VACATION', minutes: 360 },
  ]);
  expect(await f.q("SELECT count(*)::integer AS count FROM pto_timecard_accrual_revisions WHERE statutory_evidence->>'reference'='fictional-payroll-jan'"))
    .toEqual([{ count: 4 }]);
});

it('keeps an overtime-only qualifying window and a late downward correction out of both balances', async () => {
  const ctx = await setup();
  const overtime = await ctx.finalized('target', 7800);
  expect(await request('post', ctx, overtime, { ...ctx.evidence, regularMinutes: 7740, overtimeMinutes: 60 }))
    .toEqual({ status: 409, body: { state: 'review_required', reasons: ['OVERTIME_DETERMINES_ELIGIBILITY'] } });
  expect(await request('post', ctx, overtime, { ...ctx.evidence, regularMinutes: 7800, windowMethod: null }))
    .toEqual({ status: 409, body: { state: 'review_required', reasons: ['WINDOW_UNRESOLVED'] } });
  expect(await balances()).toEqual([]);

  const initial = await ctx.finalized('part-time', 7680);
  const below = { ...ctx.evidence, regularMinutes: 7680, day: { kind: 'FIXED', minutes: 360 } } as const;
  expect(await request('post', ctx, initial, below)).toMatchObject({
    status: 200, body: { entries: [{ awardMinutes: 0, changeMinutes: 0 }, { awardMinutes: 0, changeMinutes: 0 }] },
  });
  expect(await balances()).toEqual([]);
  const corrected = await ctx.finalized('part-time', 7800, 2);
  expect(await request('post', ctx, corrected, { ...below, regularMinutes: 7800 }))
    .toMatchObject({ status: 200, body: { entries: [{ changeMinutes: 360 }, { changeMinutes: 270 }] } });
  const after = await balances();
  const downward = await ctx.finalized('part-time', 7740, 3);
  expect(await request('post', ctx, downward, { ...below, regularMinutes: 7740 }))
    .toEqual({ status: 409, body: { state: 'review_required', reasons: ['DOWNWARD_CORRECTION'] } });
  expect(await balances()).toEqual(after);
  expect(await f.q('SELECT 1 FROM pto_timecard_accrual_revisions WHERE timecard_operation_id=$1', [downward])).toEqual([]);
});

it('requires review for unverified sick carryover and applies the verified 15-day rollover once', async () => {
  const ctx = await setup();
  const [{ currentYear }] = await f.q<{ currentYear: string }>(
    "SELECT extract(year FROM clock_timestamp() AT TIME ZONE 'America/Puerto_Rico')::text AS \"currentYear\"",
  );
  const startOfYear = currentYear + '-01-01';
  const opened = await applyWorkforceCommand(f.owner, {
    kind: 'PTO_POST', operationId: randomUUID(), employeeId: 'target', policyCode: 'SICK',
    expectedPolicyRevision: 1, effectiveDate: String(Number(currentYear) - 1) + '-12-31',
    entryKind: 'OPENING', quantity: 24 * 480, sourceReference: null, note: 'Fictional opening sick balance of 24 days',
  }, f.db.executor);
  expect(opened.state).toBe('saved');
  const timecard = await ctx.finalized('target', 9600);
  expect(await request('post', ctx, timecard, ctx.evidence))
    .toEqual({ status: 409, body: { state: 'review_required', reasons: ['SICK_CARRYOVER_UNRESOLVED'] } });
  const command = {
    kind: 'PR_SICK_CARRYOVER', operationId: randomUUID(), employeeId: 'target',
    expectedPolicyRevision: 1, effectiveDate: startOfYear, regularDayMinutes: null, reference: 'fictional-carryover-record',
  };
  expect(await applyWorkforceCommand(f.owner, command, f.db.executor))
    .toEqual({ state: 'review_required', reasons: ['SICK_CARRYOVER_UNRESOLVED'] });
  const verified = { ...command, regularDayMinutes: 480 };
  const stored = await applyWorkforceCommand(f.owner, verified, f.db.executor);
  expect(stored).toMatchObject({ state: 'saved', receipt: { minutes: -9 * 480, balanceMinutes: 15 * 480 } });
  expect(await applyWorkforceCommand(f.owner, verified, f.db.executor)).toEqual(stored);
  expect(await request('post', ctx, timecard, ctx.evidence)).toMatchObject({ status: 200, body: { state: 'saved' } });
  expect(await balances()).toEqual([
    { employee_id: 'target', policy_code: 'SICK', minutes: 16 * 480 },
    { employee_id: 'target', policy_code: 'VACATION', minutes: 360 },
  ]);
});

it('posts sick leave on its own during a documented probationary period', async () => {
  const ctx = await setup();
  const [{ year }] = await f.q<{ year: string }>(
    "SELECT extract(year FROM clock_timestamp() AT TIME ZONE 'America/Puerto_Rico')::text AS year",
  );
  await f.q("UPDATE employees SET hire_date=$1 WHERE id='target'", [year + '-01-01']);
  const probation = { ...ctx.evidence, vacationVestsOn: String(Number(year) + 1) + '-01-01' };
  const timecard = await ctx.finalized('target', 9600);
  expect(await request('post', ctx, timecard, probation)).toMatchObject({
    status: 200, body: { state: 'saved', vacationDeferred: true, entries: [{ policyCode: 'SICK', changeMinutes: 480 }] },
  });
  expect(await request('post', ctx, timecard, probation)).toMatchObject({
    status: 200, body: { state: 'saved', vacationDeferred: true },
  });
  expect(await balances()).toEqual([{ employee_id: 'target', policy_code: 'SICK', minutes: 480 }]);
});
