import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, expect, it, rs } from '@rstest/core';
import { assignOperationalScope, readOwnerOperationalScope } from '../../lib/company-access/operational-scope.server';
import { mutateSchedulingRestrictions, readSchedulingRestrictions } from '../../lib/data/scheduling-restrictions.server';
import { businessDate } from '../../lib/business-time';
import { mutateEmployeePlanning } from '../../lib/data/employee-planning-write.server';
import { readEmployeePlanning } from '../../lib/data/employee-planning.server';
import { createTimeOffRequest, listWorkforceLeave, reviewTimeOffRequest } from '../../lib/data/requests';
import type { SqlExecutor } from '../../lib/notifications/types';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
import { applyWorkforceCommand, readPtoAccount, readWorkforceSettings } from '../../lib/workforce/settings.server';
import { GET, POST } from '../../app/api/workforce/[resource]/[[...selector]]/route';
import { requireSessionMutationProof } from '../../lib/auth/session';
import * as actualExecutor from '../../lib/data/sql-executor' with { rstest: 'importActual' };
import { neonNotificationExecutor } from '../../lib/data/sql-executor';
import { companyAccessFixture } from './company-access-fixture';

rs.mock('server-only', () => ({}));
rs.mock('../../lib/auth/session', () => ({ requireSessionMutationProof: rs.fn() }));
rs.mock('../../lib/data/sql-executor', () => ({
  ...actualExecutor,
  neonNotificationExecutor: rs.fn(),
}));
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
let employee: SessionMutationProof;

beforeEach(async () => {
  f = await companyAccessFixture();
  rs.mocked(neonNotificationExecutor).mockReturnValue(f.db.executor);
  await f.q(`INSERT INTO employee_location_eligibility VALUES ('target','loc-1');
    INSERT INTO employee_sessions(token_hash,employee_id,expires_at)
      VALUES(repeat('d',64),'target',clock_timestamp()+interval '1 hour')`);
  employee = {
    employee: { id:'target', firstName:'Target', lastName:'QA', role:'EMPLOYEE', primaryLocationId:'loc-1' },
    sessionTokenHash:'d'.repeat(64),
  };
});
afterEach(async () => f?.db.dispose());

const request = () => ({
  requestId: randomUUID(), employeeId: 'target', startDate: '2030-10-12', endDate: '2030-10-12',
});
const decide = (proof: SessionMutationProof, requestId: string, status: 'APPROVED' | 'CANCELLED', executor = f.db.executor) =>
  reviewTimeOffRequest({ proof, managerId: proof.employee.id, requestId, status }, executor);
async function grant(locationId: string) {
  expect(await applyWorkforceCommand(f.owner, {
    kind: 'PERMISSION', operationId: randomUUID(), employeeId: 'manager',
    locationId, permission: 'APPROVE_LEAVE', granted: true, expectedRevision: 0,
  }, f.db.executor)).toMatchObject({ state: 'saved' });
}

it('records delegated attribution once and shows the pending request to the employee', async () => {
  const command = { ...request(), proof: f.manager, reason: 'Fictional request' };
  await expect(createTimeOffRequest(command, f.db.executor)).rejects.toThrow('operational_authorization');
  await grant('loc-1');
  await Promise.all([createTimeOffRequest(command, f.db.executor), createTimeOffRequest(command, f.db.executor)]);
  const own = await readEmployeePlanning(employee, f.db.executor, 'timeoff', command.requestId);
  expect(own).toMatchObject({ state: 'ready', data: { requests: [{
    id: command.requestId, status: 'PENDING', enteredBy: expect.any(String),
  }] } });
  expect(await f.q('SELECT employee_id, requested_by_employee_id FROM time_off_requests WHERE id=$1', [command.requestId]))
    .toEqual([{ employee_id: 'target', requested_by_employee_id: 'manager' }]);
  await expect(f.q("UPDATE time_off_requests SET employee_id='manager' WHERE id=$1", [command.requestId]))
    .rejects.toThrow('workforce_leave_capture_immutable');
  expect(await mutateEmployeePlanning(employee, {
    kind: 'request', requestId: command.requestId, startDate: command.startDate, endDate: command.endDate,
    startTime: null, endTime: null, note: command.reason,
  }, f.db.executor)).toMatchObject({ state: 'conflict' });
  await expect(decide(f.manager, command.requestId, 'APPROVED')).rejects.toThrow('operational_authorization');
  expect(await decide(f.owner, command.requestId, 'APPROVED')).toBe(true);
  await expect(decide(f.manager, command.requestId, 'CANCELLED')).rejects.toThrow('operational_authorization');
});

it('requires the Manager’s grant at a scheduled secondary location even if it is outside the employee’s eligibility', async () => {
  const command = { ...request(), proof: f.manager };
  await f.q(`INSERT INTO schedules(id,location_id,week_start,status,created_by)
    VALUES('delegated-week','loc-2','2030-10-07','DRAFT','owner');
    INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time)
    VALUES('delegated-shift','delegated-week','target','2030-10-12','08:00','09:00')`);
  await grant('loc-1');
  await expect(createTimeOffRequest(command, f.db.executor)).rejects.toThrow('operational_authorization');
  expect(await f.q('SELECT id FROM time_off_requests WHERE id=$1', [command.requestId])).toEqual([]);
  await grant('loc-2');
  await createTimeOffRequest(command, f.db.executor);
});

it('routes a Manager’s own leave to an Owner even if the requester later changes roles', async () => {
  const command = { ...request(), employeeId: 'manager', proof: f.manager };
  await createTimeOffRequest(command, f.db.executor);
  await createTimeOffRequest(command, f.db.executor);
  await grant('loc-1');
  await expect(decide(f.manager, command.requestId, 'APPROVED')).rejects.toThrow('operational_authorization');
  expect(await listWorkforceLeave(f.owner, 'PENDING', f.db.executor)).toMatchObject({
    state: 'ready', data: [{ id: command.requestId, ownerReviewRequired: true, submittedByEmployeeId: 'manager' }],
  });
  await expect(createTimeOffRequest({ ...request(), employeeId: 'owner', proof: f.owner }, f.db.executor)).rejects.toThrow();
  await f.q(`UPDATE employees SET role='EMPLOYEE' WHERE id='manager';
    INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id)
      VALUES('second-manager','Second','Manager','555004','MANAGER','loc-1');
    INSERT INTO employee_sessions(token_hash,employee_id,expires_at)
      VALUES(repeat('e',64),'second-manager',clock_timestamp()+interval '1 hour')`);
  const peer: SessionMutationProof = {
    employee: { ...f.manager.employee, id: 'second-manager' }, sessionTokenHash: 'e'.repeat(64),
  };
  expect(await applyWorkforceCommand(f.owner, {
    kind: 'PERMISSION', operationId: randomUUID(), employeeId: peer.employee.id,
    locationId: 'loc-1', permission: 'APPROVE_LEAVE', granted: true, expectedRevision: 0,
  }, f.db.executor)).toMatchObject({ state: 'saved' });
  const scope = await readOwnerOperationalScope(f.owner, peer.employee.id, f.db.executor);
  if (scope.state !== 'ready') throw Error('Peer scope unavailable');
  expect(await assignOperationalScope(f.owner, peer.employee.id, {
    action: 'ASSIGN', operationId: randomUUID(), expectedEmployeeVersion: scope.data.current.employeeUpdatedAt,
    expectedRoleGeneration: scope.data.current.roleGeneration, expectedScopeRevision: scope.data.current.scopeRevision,
    scope: { mode: 'LOCATIONS', locationIds: ['loc-1'] },
  }, f.db.executor)).toMatchObject({ state: 'saved' });
  expect(await listWorkforceLeave(peer, 'PENDING', f.db.executor)).toMatchObject({ state: 'ready', data: [] });
  await expect(decide(peer, command.requestId, 'APPROVED')).rejects.toThrow('operational_authorization');
  expect(await decide(f.owner, command.requestId, 'APPROVED')).toBe(true);
});

it('shows saved policy revisions and restores the pinned deduction after an edit and cancellation retry', async () => {
  const policy = {
    kind: 'PTO_POLICY', operationId: randomUUID(), code: 'VACATION', label: 'Fictional vacation',
    enabled: true, fullDayMinutes: 480, earnedMinutesPer100Hours: 0, carryoverCapMinutes: 0, expectedRevision: 0,
  };
  const first = await applyWorkforceCommand(f.owner, policy, f.db.executor);
  if (first.state !== 'saved') throw Error('PTO policy unavailable');
  const adjustment = {
    kind: 'PTO_POST', operationId: randomUUID(), employeeId: 'target', policyCode: 'VACATION',
    expectedPolicyRevision: 1, effectiveDate: businessDate(new Date(), 'America/Puerto_Rico'),
    entryKind: 'ADJUSTMENT', quantity: 600, sourceReference: null, note: 'Fictional adjustment',
  };
  await expect(applyWorkforceCommand(f.manager, adjustment, f.db.executor)).rejects.toThrow('management_authorization');
  const posted = await applyWorkforceCommand(f.owner, adjustment, f.db.executor);
  expect(posted).toMatchObject({ state: 'saved', receipt: { balanceMinutes: 600 } });
  expect(await applyWorkforceCommand(f.owner, adjustment, f.db.executor)).toEqual(posted);
  const command = { ...request(), proof: employee, ptoPolicyId: first.receipt.policyId };
  await createTimeOffRequest(command, f.db.executor);
  const second = await applyWorkforceCommand(f.owner, {
    ...policy, operationId: randomUUID(), fullDayMinutes: 300, expectedRevision: 1, enabled: false,
  }, f.db.executor);
  expect(second).toMatchObject({ state: 'saved', receipt: { revision: 2 } });
  expect((await readWorkforceSettings(f.owner, f.db.executor)).policies).toMatchObject([{ revision: 2, enabled: false }]);
  expect((await readWorkforceSettings(employee, f.db.executor)).policies).toEqual([]);
  expect(await decide(f.owner, command.requestId, 'APPROVED')).toBe(true);
  expect(await decide(f.owner, command.requestId, 'APPROVED')).toBe(false);
  const lost: SqlExecutor = {
    ...f.db.executor,
    async transaction(statements) {
      const result = await f.db.executor.transaction(statements);
      if (statements.some(s => s.text.includes('SET status=$3,cancelled_by'))) throw Error('Lost cancellation response');
      return result;
    },
  };
  await expect(decide(f.owner, command.requestId, 'CANCELLED', lost)).rejects.toThrow('Lost cancellation response');
  expect(await decide(f.owner, command.requestId, 'CANCELLED')).toBe(true);
  const account = await readPtoAccount(employee, undefined, f.db.executor);
  expect(account?.balances).toMatchObject([{ code: 'VACATION', balanceMinutes: 600 }]);
  expect(account?.entries).toMatchObject([
    { kind: 'REVERSAL', minutes: 480, policyId: first.receipt.policyId, note: null },
    { kind: 'USAGE', minutes: -480, policyId: first.receipt.policyId, note: null },
    { kind: 'ADJUSTMENT', minutes: 600, note: null },
  ]);
  expect((await readPtoAccount(f.owner, 'target', f.db.executor))?.entries.at(-1))
    .toMatchObject({ kind: 'ADJUSTMENT', note: 'Fictional adjustment' });
});


it('enforces HTTP intent and session boundaries and exposes the Manager’s own saved request', async () => {
  const requestId = randomUUID();
  const body = {
    kind: 'request', requestId, startDate: '2030-10-12', endDate: '2030-10-12',
    startTime: null, endTime: null, note: '',
  };
  const origin = 'http://127.0.0.1:3000';
  const url = origin + '/api/workforce/leave';
  const headers = { 'x-nevora-workforce': '1', 'content-type': 'application/json', origin };
  const route = (selector: string[] = []) => ({ params: Promise.resolve({ resource: 'leave', selector }) });
  const post = (value: object, overrides: Record<string, string> = {}) =>
    POST(new Request(url, { method: 'POST', headers: { ...headers, ...overrides }, body: JSON.stringify(value) }), route());
  rs.stubEnv('NODE_ENV', 'test');
  rs.stubEnv('FUEL_PORTAL_ORIGIN', origin);
  try {
    rs.mocked(requireSessionMutationProof).mockResolvedValue(f.manager);
    expect((await post(body, { 'sec-fetch-site': 'cross-site' })).status).toBe(403);
    expect((await post({ ...body, requestedByEmployeeId: 'owner' })).status).toBe(400);
    rs.mocked(requireSessionMutationProof).mockResolvedValue(employee);
    expect((await post(body)).status).toBe(403);
    rs.mocked(requireSessionMutationProof).mockResolvedValue(f.manager);
    const submitted = await post(body);
    expect(submitted.status).toBe(200);
    expect(await submitted.json()).toEqual({ state: 'saved', requestId });
    expect(await (await post(body)).json()).toEqual({ state: 'saved', requestId });
    const mine = await GET(new Request(url + '/mine', { headers }), route(['mine']));
    expect(mine.status).toBe(200);
    expect(await mine.json()).toMatchObject({ state: 'ready', data: [{ id: requestId, status: 'PENDING' }] });
    const withdraw = { kind: 'withdraw', requestId, confirmed: true };
    expect(await (await post(withdraw)).json()).toEqual({ state: 'saved', requestId });
    expect(await (await post(withdraw)).json()).toEqual({ state: 'saved', requestId });
  } finally {
    rs.unstubAllEnvs();
  }
});


it('lets the sole Owner record scheduling unavailability without creating leave or a ledger entry', async () => {
  const current = await readSchedulingRestrictions(f.owner, f.owner.employee.id, f.db.executor);
  expect(await mutateSchedulingRestrictions(f.owner, f.owner.employee.id, {
    kind: 'SET', operationId: randomUUID(), expectedRevision: current.document.revision,
    effectiveWeek: current.earliestWeek, reason: 'Fictional scheduling unavailability',
    unavailable: [{ dayOfWeek: 1, startTime: '00:00', endTime: '24:00' }],
  }, f.db.executor)).toMatchObject({ changed: true });
  expect(await f.q('SELECT id FROM time_off_requests')).toEqual([]);
  expect(await f.q('SELECT id FROM pto_ledger')).toEqual([]);
});
