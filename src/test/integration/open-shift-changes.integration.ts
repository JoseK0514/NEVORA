import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it, rs } from '@rstest/core';
import { assignOperationalScope, readOwnerOperationalScope } from '../../lib/company-access/operational-scope.server';
import { executeOpenShift, listClaimableOpenShifts, readManagedOpenShifts } from '../../lib/data/open-shifts.server';
import { readEmployeeSchedule } from '../../lib/data/employee-schedule';
import { mutateSchedulingRestrictions } from '../../lib/data/scheduling-restrictions.server';
import type { SqlExecutor } from '../../lib/notifications/types';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
import { applyWorkforceCommand } from '../../lib/workforce/settings.server';
import { fictionalProfile } from '../fixtures/shift-changes';
import { companyAccessFixture, grantFixtureWorkforcePermission } from './company-access-fixture';

rs.mock('server-only', () => ({}));

let f: Awaited<ReturnType<typeof companyAccessFixture>>;
const employee = (id: string, token: string): SessionMutationProof => ({
  employee: {id, firstName: id, lastName: 'QA', role: 'EMPLOYEE', primaryLocationId: 'loc-1'},
  sessionTokenHash: token.repeat(64),
});
const first = employee('target', 'c');
const second = employee('other', 'd');
const post = (date: string, locationId = 'loc-1') => ({
  kind: 'post' as const, id: randomUUID(), locationId, positionId: 'barista', date, startTime: '08:00', endTime: '12:00',
});
const claim = (id: string) => ({kind: 'claim' as const, id});

beforeAll(async () => {
  f = await companyAccessFixture({database: 'exchange'});
  await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id)
    VALUES('other','Other','QA','555004','EMPLOYEE','loc-1');
    INSERT INTO employee_sessions(token_hash,employee_id,expires_at)
    VALUES(repeat('c',64),'target',clock_timestamp()+interval '1 hour'),
          (repeat('d',64),'other',clock_timestamp()+interval '1 hour');
    INSERT INTO positions(id,workspace_id,name) VALUES('barista','workspace-fuel','Barista');
    INSERT INTO employee_positions VALUES('target','barista'),('other','barista');
    INSERT INTO employee_location_eligibility VALUES('target','loc-1'),('target','loc-2'),('other','loc-1');
    INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time)
      SELECT e.id||d,e.id,d,'00:00','24:00' FROM employees e CROSS JOIN generate_series(0,6) d WHERE e.id IN ('target','other');`);
  await f.q(`INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours,operational_rule_profile)
    VALUES('target',40,40,$1),('other',40,40,$1)`, [JSON.stringify(fictionalProfile())]);
});
afterAll(async () => f?.db.dispose());

it('gives one assignment to the first of two concurrent eligible claimants', async () => {
  const posting = post('2035-10-02');
  expect(await executeOpenShift(f.owner, posting, f.db.executor)).toEqual({state: 'posted', id: posting.id});
  expect(await executeOpenShift(f.owner, posting, f.db.executor)).toEqual({state: 'posted', id: posting.id});
  expect(await listClaimableOpenShifts(first, f.db.executor)).toMatchObject([{id: posting.id, state: 'open'}]);
  expect(await listClaimableOpenShifts(second, f.db.executor)).toHaveLength(1);

  let arrivals = 0;
  let release!: () => void;
  const both = new Promise<void>(resolve => { release = resolve; });
  const synchronized: SqlExecutor = {...f.db.executor, mutationTransaction: async statements => {
    if (++arrivals === 2) release();
    await both;
    return f.db.executor.transaction(statements);
  }};
  const results = await Promise.all([first, second].map(actor => executeOpenShift(actor, claim(posting.id), synchronized)));
  expect(results.map(result => result.state).sort()).toEqual(['claimed', 'filled']);
  const winner = results[0].state === 'claimed' ? first : second;
  const receipt = results.find(result => result.state === 'claimed')!;
  expect(await f.q('SELECT id,employee_id FROM shifts WHERE date=$1', [posting.date]))
    .toEqual([{id: receipt.assignmentId, employee_id: winner.employee.id}]);
  expect(await readEmployeeSchedule(winner, '2035-10-01', f.db.executor))
    .toMatchObject({shifts: [{id: receipt.assignmentId}]});
  expect(await f.q("SELECT source_type,source_id FROM schedule_publication_revisions WHERE source_id=$1", [posting.id]))
    .toEqual([{source_type: 'OPEN_SHIFT', source_id: posting.id}]);
  expect(await listClaimableOpenShifts(first, f.db.executor)).toEqual([]);
});

it('returns the same assignment after the transaction response is lost', async () => {
  const posting = post('2035-10-03');
  expect((await executeOpenShift(f.owner, posting, f.db.executor)).state).toBe('posted');
  const transport: SqlExecutor = {...f.db.executor, mutationTransaction: async statements => {
    await f.db.executor.transaction(statements);
    throw new Error('Connection closed after commit');
  }};
  expect(await executeOpenShift(first, claim(posting.id), transport)).toEqual({state: 'outcome_unknown', id: posting.id});
  const rows = await f.q('SELECT id FROM shifts WHERE date=$1', [posting.date]);
  expect(rows).toHaveLength(1);
  const notifications = await f.q('SELECT id FROM notifications ORDER BY id');
  expect(await executeOpenShift(first, claim(posting.id), f.db.executor))
    .toEqual({state: 'claimed', id: posting.id, assignmentId: rows[0].id, visibility: 'published'});
  expect(await f.q('SELECT id FROM shifts WHERE date=$1', [posting.date])).toEqual(rows);
  expect(await f.q('SELECT id FROM notifications ORDER BY id')).toEqual(notifications);
});

it('rejects a Manager whose publishing grant is revoked between admission and the write', async () => {
  const scope = await readOwnerOperationalScope(f.owner, 'manager', f.db.executor);
  expect(scope.state).toBe('ready');
  if (scope.state !== 'ready') throw new Error('Manager scope fixture unavailable');
  const assigned = await assignOperationalScope(f.owner, 'manager', {
    operationId: randomUUID(), expectedScopeRevision: scope.data.current.scopeRevision,
    expectedEmployeeVersion: scope.data.current.employeeUpdatedAt,
    expectedRoleGeneration: scope.data.current.roleGeneration, action: 'ASSIGN',
    scope: {mode: 'LOCATIONS', locationIds: ['loc-1']},
  }, f.db.executor);
  expect(assigned.state).toBe('saved');
  const posting = post('2035-10-04');
  expect(await executeOpenShift(f.manager, posting, f.db.executor)).toEqual({state: 'forbidden'});
  await grantFixtureWorkforcePermission(f, 'PUBLISH_SCHEDULE', 'loc-1');
  expect(await executeOpenShift(f.manager, {...posting, locationId: 'loc-2'}, f.db.executor)).toEqual({state: 'forbidden'});
  expect(await executeOpenShift(f.manager, posting, f.db.executor)).toEqual({state: 'posted', id: posting.id});
  expect(await readManagedOpenShifts(f.manager, f.db.executor))
    .toMatchObject({locations: [{id: 'loc-1'}], shifts: expect.arrayContaining([expect.objectContaining({id: posting.id, state: 'open'})])});
  const revoke = async () => {
    expect((await applyWorkforceCommand(f.owner, {kind: 'PERMISSION', employeeId: 'manager',
      permission: 'PUBLISH_SCHEDULE', locationId: 'loc-1', granted: false, expectedRevision: 1,
      operationId: randomUUID(),
    }, f.db.executor)).state).toBe('saved');
  };
  const revoked: SqlExecutor = {...f.db.executor, mutationTransaction: async statements => {
    await revoke();
    return f.db.executor.transaction(statements);
  }};
  const withdraw = {kind: 'withdraw', id: posting.id};
  expect(await executeOpenShift(f.manager, withdraw, revoked)).toEqual({state: 'forbidden'});
  expect(await executeOpenShift(f.manager, post('2035-10-05'), f.db.executor)).toEqual({state: 'forbidden'});
  expect(await readManagedOpenShifts(f.manager, f.db.executor)).toEqual({locations: [], positions: [], shifts: []});
  expect(await executeOpenShift(f.owner, withdraw, f.db.executor)).toEqual({state: 'withdrawn', id: posting.id});
  expect(await executeOpenShift(f.owner, withdraw, f.db.executor)).toEqual({state: 'withdrawn', id: posting.id});
  expect(await executeOpenShift(first, claim(posting.id), f.db.executor)).toEqual({state: 'withdrawn', id: posting.id});
  expect(await f.q('SELECT id FROM shifts WHERE date=$1', [posting.date])).toEqual([]);
});

it('does not publish an existing draft and retains the assignment for the normal publish flow', async () => {
  const posting = post('2035-10-09');
  await f.q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('draft-open','loc-1','2035-10-08','DRAFT','owner')");
  expect((await executeOpenShift(f.owner, posting, f.db.executor)).state).toBe('posted');
  await f.q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('other-draft','draft-open','other','2035-10-09','08:00','12:00')");
  expect(await executeOpenShift(first, claim(posting.id), f.db.executor)).toMatchObject({state: 'claimed', visibility: 'draft'});
  expect(await f.q("SELECT status FROM schedules WHERE id='draft-open'")).toEqual([{status: 'DRAFT'}]);
  expect(await f.q("SELECT source_id FROM schedule_publication_revisions WHERE source_id=$1", [posting.id])).toEqual([]);
  expect(await f.q("SELECT employee_id FROM shifts WHERE schedule_id='draft-open' ORDER BY employee_id"))
    .toEqual([{employee_id: 'other'}, {employee_id: 'target'}]);
});

it('does not pick up a posting that expired at its start time', async () => {
  const posting = post('2035-10-10');
  await f.q(`INSERT INTO manager_open_shifts(workspace_id,id,location_id,position_id,date,start_time,end_time,time_zone,starts_at,posted_by,posted_at)
    VALUES('workspace-fuel',$1,'loc-1','barista','2020-01-01','08:00','12:00','America/Puerto_Rico','2020-01-01T12:00Z','owner','2019-12-30T12:00Z')`, [posting.id]);
  expect(await executeOpenShift(first, claim(posting.id), f.db.executor)).toEqual({state: 'expired', id: posting.id});
  expect(await executeOpenShift(f.owner, {kind: 'withdraw', id: posting.id}, f.db.executor)).toEqual({state: 'expired', id: posting.id});
});

it('rechecks eligibility after listing and hides postings the employee cannot claim', async () => {
  const posting = post('2035-11-15', 'loc-2');
  expect((await executeOpenShift(f.owner, posting, f.db.executor)).state).toBe('posted');
  expect((await listClaimableOpenShifts(first, f.db.executor)).map(shift => shift.id)).toContain(posting.id);
  expect((await listClaimableOpenShifts(second, f.db.executor)).map(shift => shift.id)).not.toContain(posting.id);

  await f.q("DELETE FROM employee_location_eligibility WHERE employee_id='target' AND location_id='loc-2'");
  expect(await executeOpenShift(first, claim(posting.id), f.db.executor)).toMatchObject({state: 'ineligible', reason: 'LOCATION_NOT_ELIGIBLE'});
  await f.q("INSERT INTO employee_location_eligibility VALUES('target','loc-2'); DELETE FROM employee_positions WHERE employee_id='target'");
  expect(await executeOpenShift(first, claim(posting.id), f.db.executor)).toMatchObject({state: 'ineligible', reason: 'POSITION_INELIGIBLE'});
  await f.q("INSERT INTO employee_positions VALUES('target','barista')");
  await f.q(`INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('cross-location','loc-1','2035-11-12','PUBLISHED','owner');
    INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('overlap','cross-location','target','2035-11-15','08:00','12:00')`);
  expect(await executeOpenShift(first, claim(posting.id), f.db.executor)).toMatchObject({state: 'ineligible', reason: 'SHIFT_OVERLAP'});
  await f.q("DELETE FROM shifts WHERE id='overlap'; UPDATE employee_scheduling_settings SET maximum_weekly_hours=3 WHERE employee_id='target'");
  expect(await executeOpenShift(first, claim(posting.id), f.db.executor)).toMatchObject({state: 'ineligible', reason: 'MAX_WEEKLY_HOURS'});

  await f.q("UPDATE employee_scheduling_settings SET maximum_weekly_hours=40 WHERE employee_id='target'");
  const approvedWhileWaiting: SqlExecutor = {...f.db.executor, mutationTransaction: async statements => {
    await f.q(`INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status)
      VALUES('approved-while-claiming','target','2035-11-15','2035-11-15','APPROVED')`);
    return f.db.executor.transaction(statements);
  }};
  expect(await executeOpenShift(first, claim(posting.id), approvedWhileWaiting)).toMatchObject({state: 'ineligible', reason: 'APPROVED_TIME_OFF'});
  expect((await listClaimableOpenShifts(first, f.db.executor)).map(shift => shift.id)).not.toContain(posting.id);
  expect(await f.q('SELECT assignment_id FROM manager_open_shifts WHERE id=$1', [posting.id])).toEqual([{assignment_id: null}]);
});

it('honors a firm approved restriction even when normal availability allows the shift', async () => {
  const posting = post('2036-01-07');
  expect((await executeOpenShift(f.owner, posting, f.db.executor)).state).toBe('posted');
  await mutateSchedulingRestrictions(f.owner, first.employee.id, {
    kind: 'SET', operationId: randomUUID(), expectedRevision: 0, effectiveWeek: '2036-01-07',
    reason: 'Recorded agreement', unavailable: [{dayOfWeek: 1, startTime: '00:00', endTime: '24:00'}],
  }, f.db.executor);
  expect(await executeOpenShift(first, claim(posting.id), f.db.executor)).toMatchObject({state: 'ineligible', reason: 'AGREED_RESTRICTION'});
  expect((await listClaimableOpenShifts(first, f.db.executor)).map(shift => shift.id)).not.toContain(posting.id);
});

it('publishes the claimed assignment without releasing unrelated held changes', async () => {
  const posting = post('2035-10-04', 'loc-2');
  await f.q(`INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time)
    SELECT 'held-open-test',id,'other','2035-10-05','08:00','12:00' FROM schedules
    WHERE location_id='loc-1' AND week_start='2035-10-01'`);
  const stamp = await f.q("SELECT updated_at FROM schedules WHERE location_id='loc-1' AND week_start='2035-10-01'");
  expect((await executeOpenShift(f.owner, posting, f.db.executor)).state).toBe('posted');
  const result = await executeOpenShift(first, claim(posting.id), f.db.executor);
  expect(result.state).toBe('claimed');
  if (result.state !== 'claimed') throw new Error('Claim unavailable');
  const captured = await f.q(`SELECT rs.source_shift_id FROM schedule_publication_revision_shifts rs
    JOIN schedule_publication_revisions r ON r.id=rs.revision_id WHERE r.source_id=$1`, [posting.id]);
  expect(captured).toContainEqual({source_shift_id: result.assignmentId});
  expect(captured).not.toContainEqual({source_shift_id: 'held-open-test'});
  expect(await f.q("SELECT updated_at FROM schedules WHERE location_id='loc-1' AND week_start='2035-10-01'")).toEqual(stamp);
});

it('rolls back the claim receipt if the assignment write fails', async () => {
  const posting = post('2035-11-27', 'loc-2');
  expect((await executeOpenShift(f.owner, posting, f.db.executor)).state).toBe('posted');
  const failing: SqlExecutor = {...f.db.executor, mutationTransaction: async statements => {
    const index = statements.findIndex(statement => statement.text.startsWith('INSERT INTO shifts'));
    return f.db.executor.transaction([...statements.slice(0, index + 1), {text: 'SELECT 1/0', values: []}, ...statements.slice(index + 1)]);
  }};
  await expect(executeOpenShift(first, claim(posting.id), failing)).rejects.toMatchObject({code: '22012'});
  expect(await f.q('SELECT assignment_id,claimed_by FROM manager_open_shifts WHERE id=$1', [posting.id]))
    .toEqual([{assignment_id: null, claimed_by: null}]);
  expect(await f.q('SELECT id FROM shifts WHERE date=$1', [posting.date])).toEqual([]);
  expect((await executeOpenShift(first, claim(posting.id), f.db.executor)).state).toBe('claimed');
});
