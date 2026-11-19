import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, expect, it, rs } from '@rstest/core';
import { assignOperationalScope, readOwnerOperationalScope } from '../../lib/company-access/operational-scope.server';
import { readOperationalPlanningWeek } from '../../lib/company-access/operational-read.server';
import { mutateEmployeePlanning } from '../../lib/data/employee-planning-write.server';
import { weekStartFor } from '../../lib/date-utils';
import { businessDate } from '../../lib/business-time';
import { createTimeOffRequest, listWorkforceLeave, reviewTimeOffRequest, withdrawTimeOffRequest } from '../../lib/data/requests';
import { publishScheduleChanges, publishScheduleWithRevision } from '../../lib/data/publication-revisions';
import { readManagerTimeCorrections } from '../../lib/data/time-corrections.server';
import { applyWorkforceCommand, readPtoAccount } from '../../lib/workforce/settings.server';
import { submitTimeCorrection, reviewTimeCorrection, submitDelegatedTimeCorrection } from '../../lib/time-corrections/service';
import { withdrawalIdentity } from '../../lib/time-off-withdrawal';
import type { SqlExecutor } from '../../lib/notifications/types';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
import type { WorkforceCommand } from '../../lib/workforce/contracts';
import type { WorkforcePermission } from '../../lib/workforce/permissions';
import { companyAccessFixture } from './company-access-fixture';

rs.mock('server-only', () => ({}));

type Fixture = Awaited<ReturnType<typeof companyAccessFixture>>;
let f: Fixture;
let employee: SessionMutationProof;

beforeEach(async () => {
  f = await companyAccessFixture();
  await f.q(`INSERT INTO employee_location_eligibility VALUES ('target','loc-1');
    INSERT INTO employee_sessions(token_hash,employee_id,expires_at)
      VALUES(repeat('d',64),'target',clock_timestamp()+interval '1 hour')`);
  employee = {
    employee: { id:'target', firstName:'Target', lastName:'QA', role:'EMPLOYEE', primaryLocationId:'loc-1' },
    sessionTokenHash:'d'.repeat(64),
  };
});
afterEach(async () => f?.db.dispose());

async function grant(permission: WorkforcePermission, locationId: string, granted = true, expectedRevision = 0) {
  const result = await applyWorkforceCommand(f.owner, {
    kind:'PERMISSION', operationId:randomUUID(), employeeId:'manager', locationId, permission, granted, expectedRevision,
  }, f.db.executor);
  expect(result).toMatchObject({state:'saved',receipt:{revision:expectedRevision+1}});
}

async function request(day: string, policyId?: string, endTime = '12:00') {
  const requestId = randomUUID();
  await createTimeOffRequest({
    requestId, employeeId:employee.employee.id, proof:employee, startDate:day, endDate:day,
    ...(policyId ? {ptoPolicyId:policyId,startTime:'08:00',endTime} : {}),
  }, f.db.executor);
  return requestId;
}

const decide = (requestId: string, status: 'APPROVED' | 'DENIED' | 'CANCELLED', actor: SessionMutationProof = f.manager, executor:SqlExecutor = f.db.executor) =>
  reviewTimeOffRequest({requestId,managerId:actor.employee.id,proof:actor,status},executor);

it('keeps grants separate, routes a cross-location leave case to a complete reviewer, and keeps historical legacy rows Owner-only', async () => {
  const first = await request('2030-10-07');
  await expect(decide(first,'APPROVED')).rejects.toThrow('operational_authorization');
  const status = await listWorkforceLeave(f.manager,'PENDING',f.db.executor);
  expect(status).toEqual({state:'unavailable',reason:'access_denied'});
  await grant('APPROVE_LEAVE','loc-1');
  await f.q(`ALTER TABLE time_off_requests DISABLE TRIGGER workforce_leave_capture;
    INSERT INTO time_off_requests(id,employee_id,start_date,end_date) VALUES('legacy-leave','target','2030-10-17','2030-10-17');
    ALTER TABLE time_off_requests ENABLE TRIGGER workforce_leave_capture`);
  await expect(decide('legacy-leave','APPROVED')).rejects.toThrow('operational_authorization');
  expect(await decide('legacy-leave','APPROVED',f.owner)).toBe(true);
  await f.q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date) VALUES('self-leave','manager','2030-10-17','2030-10-17')");
  await expect(decide('self-leave','APPROVED')).rejects.toThrow('operational_authorization');
  expect(await listWorkforceLeave(f.manager,'PENDING',f.db.executor)).toMatchObject({state:'ready',data:[{id:first}]});
  expect(await decide(first,'APPROVED')).toBe(true);

  await f.q("INSERT INTO employee_location_eligibility VALUES ('target','loc-2')");
  const cross = await request('2030-10-09');
  await expect(decide(cross,'APPROVED')).rejects.toThrow('operational_authorization');
  await f.q("DELETE FROM employee_location_eligibility WHERE employee_id='target' AND location_id='loc-2'");
  await expect(decide(cross,'APPROVED')).rejects.toThrow('operational_authorization');
  await grant('APPROVE_LEAVE','loc-2');
  expect(await decide(cross,'APPROVED')).toBe(true);
  expect(await reviewTimeCorrection(f.manager,{
    operationId:randomUUID(),requestId:randomUUID(),expectedRevision:1,decision:'APPROVE',
  },f.db.executor)).toEqual({status:'unavailable'});

  await expect(f.q("UPDATE workforce_permission_revisions SET granted=false")).rejects.toThrow('workforce_history_immutable');
});

it('posts company-configured PTO, checks replay/source identity, and serializes approval and reversal against the account', async () => {
  await grant('APPROVE_LEAVE','loc-1');
  const policy = {
    operationId:randomUUID(), kind:'PTO_POLICY',code:'VACATION',label:'Vacation',enabled:true,
    fullDayMinutes:480, earnedMinutesPer100Hours:120, carryoverCapMinutes:480, expectedRevision:0,
  } satisfies WorkforceCommand;
  const saved = await applyWorkforceCommand(f.owner,policy,f.db.executor);
  expect(saved.state).toBe('saved');
  if (saved.state !== 'saved' || !saved.receipt.policyId) throw new Error('Policy receipt unavailable');
  const policyId = saved.receipt.policyId;
  expect(await applyWorkforceCommand(f.owner,policy,f.db.executor)).toEqual(saved);
  expect(await applyWorkforceCommand(f.owner,{...policy,fullDayMinutes:400},f.db.executor)).toEqual({state:'conflict'});
  await expect(applyWorkforceCommand(f.manager,{...policy,operationId:randomUUID()},f.db.executor)).rejects.toThrow('management_authorization');

  const today = businessDate(new Date(),'America/Puerto_Rico');
  const year = Number(today.slice(0,4));
  const command = {
    kind:'PTO_POST',employeeId:'target',policyCode:'VACATION',expectedPolicyRevision:1,
    effectiveDate:`${year-1}-12-31`,note:'Verified company source',
  } as const;
  const post = (entryKind: 'OPENING' | 'EARNED' | 'ADJUSTMENT' | 'CARRYOVER', quantity: number, sourceReference: string | null, effectiveDate: string = command.effectiveDate) => ({
    ...command,operationId:randomUUID(),entryKind,quantity,sourceReference,effectiveDate,
  });
  expect(await applyWorkforceCommand(f.owner,post('OPENING',600,null),f.db.executor)).toMatchObject({state:'saved',receipt:{minutes:600,balanceMinutes:600}});
  const earned = post('EARNED',6000,'verified-time-period-1');
  const earnedResult = await applyWorkforceCommand(f.owner,earned,f.db.executor);
  expect(earnedResult).toMatchObject({state:'saved',receipt:{minutes:120,balanceMinutes:720}});
  expect(await applyWorkforceCommand(f.owner,earned,f.db.executor)).toEqual(earnedResult);
  expect(await applyWorkforceCommand(f.owner,{...earned,operationId:randomUUID()},f.db.executor)).toEqual({state:'conflict'});
  const roll = post('CARRYOVER',0,null,`${year}-01-01`);
  expect(await applyWorkforceCommand(f.owner,roll,f.db.executor)).toMatchObject({state:'saved',receipt:{minutes:-240,balanceMinutes:480}});
  expect(await applyWorkforceCommand(f.owner,{...roll,operationId:randomUUID()},f.db.executor)).toEqual({state:'conflict'});
  const adjustment = post('ADJUSTMENT',-30,null,today);
  const disconnected: SqlExecutor = {
    ...f.db.executor,
    async transaction(statements) {
      await f.db.executor.transaction(statements);
      throw new Error('response dropped after commit');
    },
  };
  expect(await applyWorkforceCommand(f.owner,adjustment,disconnected)).toEqual({state:'unknown'});
  expect(await applyWorkforceCommand(f.owner,adjustment,f.db.executor)).toMatchObject({state:'saved',receipt:{minutes:-30,balanceMinutes:450}});
  const balance = async () => (await readPtoAccount(employee,'target',f.db.executor))?.balances;
  const assertBalance = async (minutes:number) => expect(await balance()).toMatchObject([{code:'VACATION',balanceMinutes:minutes}]);
  await assertBalance(450);

  const native = {kind:'request',requestId:randomUUID(), startDate:'2030-10-11',endDate:'2030-10-11',
    startTime:null,endTime:null,note:'Verified paid request',ptoPolicyId:policyId};
  expect(await mutateEmployeePlanning(employee,native,f.db.executor)).toMatchObject({state:'complete'});
  expect(await mutateEmployeePlanning(employee,native,f.db.executor)).toMatchObject({state:'complete'});
  expect(await mutateEmployeePlanning(employee,{...native,ptoPolicyId:randomUUID()},f.db.executor)).toMatchObject({state:'conflict'});
  expect(await f.q('SELECT pto_minutes FROM time_off_requests WHERE id=$1',[native.requestId])).toEqual([{pto_minutes:480}]);
  const pending = native.requestId;
  expect(await withdrawTimeOffRequest({requestId:pending,operationId:withdrawalIdentity(pending),employeeId:'target',proof:employee},f.db.executor)).toMatchObject({status:'CANCELLED'});
  await assertBalance(450);
  const denied = await request('2030-10-12',policyId);
  expect(await decide(denied,'DENIED')).toBe(true);
  await assertBalance(450);

  const all = [await request('2030-10-15',policyId),await request('2030-10-16',policyId)];
  const results = await Promise.allSettled(all.map(id => decide(id,'APPROVED')));
  expect(results.filter(result => result.status==='fulfilled' && result.value)).toHaveLength(1);
  expect(results.find(result => result.status==='rejected')).toMatchObject({reason:{message:'pto_insufficient_balance'}});
  const approved = all[results.findIndex(result => result.status==='fulfilled' && result.value)];
  expect(await decide(approved,'APPROVED')).toBe(false);
  await assertBalance(210);
  expect(await decide(approved,'CANCELLED')).toBe(true);
  expect(await decide(approved,'CANCELLED')).toBe(true);
  await assertBalance(450);
  expect(await f.q('SELECT kind,minutes FROM pto_ledger WHERE request_id=$1 ORDER BY recorded_at',[approved])).toEqual([
    {kind:'USAGE',minutes:-240},{kind:'REVERSAL',minutes:240},
  ]);
  expect(await f.q('SELECT reviewed_by,cancelled_by,status FROM time_off_requests WHERE id=$1',[approved])).toEqual([
    {reviewed_by:'manager',cancelled_by:'manager',status:'CANCELLED'},
  ]);
});

it('keeps another location’s held edit private during scoped publication and preserves historical keys across a planning calendar change', async () => {
  const week = '2030-10-07';
  await f.q(`INSERT INTO employee_location_eligibility VALUES ('target','loc-2');
    INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES
      ('s1','loc-1','2030-10-07','DRAFT','owner'),('s2','loc-2','2030-10-07','DRAFT','owner');
    INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes) VALUES
      ('sh1','s1','target','2030-10-13','08:00','09:00','First A'),
      ('sh2','s2','target','2030-10-07','08:00','09:00','First B')`);
  const publish = (locationId: string, actor = f.manager) => publishScheduleWithRevision({locationId,weekStart:week,managerId:actor.employee.id,proof:actor},f.db.executor);
  await expect(publish('loc-1')).rejects.toThrow('operational_authorization');
  const context = await readOwnerOperationalScope(f.owner,'manager',f.db.executor);
  if(context.state!=='ready')throw new Error('Owner scope unavailable');
  expect(await assignOperationalScope(f.owner,'manager',{
    action:'ASSIGN',operationId:randomUUID(),expectedEmployeeVersion:context.data.current.employeeUpdatedAt,
    expectedRoleGeneration:context.data.current.roleGeneration,expectedScopeRevision:context.data.current.scopeRevision,
    scope:{mode:'LOCATIONS',locationIds:['loc-1']},
  },f.db.executor)).toMatchObject({state:'saved'});
  await grant('PUBLISH_SCHEDULE','loc-1');
  expect((await publish('loc-1')).published).toBe(true);
  await expect(publish('loc-2')).rejects.toThrow('operational_authorization');
  expect((await publish('loc-2',f.owner)).published).toBe(true);
  await f.q("UPDATE shifts SET notes='Held B' WHERE id='sh2'; UPDATE shifts SET notes='Held A' WHERE id='sh1'");
  const published = await publishScheduleChanges({locationId:'loc-1',weekStart:week,managerId:'manager',proof:f.manager},f.db.executor);
  expect(published.published).toBe(true);
  expect(await f.q('SELECT location_id,notes FROM schedule_publication_revision_shifts WHERE revision_id=$1 ORDER BY location_id',[published.revision?.id])).toEqual([
    {location_id:'loc-1',notes:'Held A'},{location_id:'loc-2',notes:'First B'},
  ]);
  await expect(publishScheduleChanges({weekStart:week,managerId:'manager',proof:f.manager},f.db.executor)).rejects.toThrow('operational_authorization');
  const history = await f.q('SELECT id,week_start FROM schedule_publication_revisions ORDER BY id');
  expect(await applyWorkforceCommand(f.owner,{kind:'PLANNING_CALENDAR',operationId:randomUUID(),startsOn:0,expectedRevision:0},f.db.executor)).toMatchObject({state:'saved'});
  expect(await readOperationalPlanningWeek(f.manager,'2030-10-15',f.db.executor)).toMatchObject({
    state:'ready',data:{startDate:'2030-10-13',endDate:'2030-10-19',shifts:[{id:'sh1',scheduleWeekStart:week}],publishLocationIds:['loc-1']},
  });
  expect(await f.q('SELECT id,week_start FROM schedule_publication_revisions ORDER BY id')).toEqual(history);
  expect(weekStartFor('2030-10-13')).toBe(week);
});

it('publishes both ends of a cross-location move as Owner and retains unrelated held edits', async () => {
  const week = '2030-10-07';
  await f.q(`INSERT INTO employee_location_eligibility VALUES ('target','loc-2');
    INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES
      ('s1','loc-1','2030-10-07','DRAFT','owner'),('s2','loc-2','2030-10-07','DRAFT','owner');
    INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes) VALUES
      ('move','s1','target','2030-10-08','08:00','09:00','Assignment to move'),
      ('held','s1','target','2030-10-09','08:00','09:00','Published note')`);
  const publish = (locationId: string, actor: SessionMutationProof) => publishScheduleWithRevision({
    locationId,weekStart:week,managerId:actor.employee.id,proof:actor,
  },f.db.executor);
  const original = await publish('loc-1',f.owner);
  await grant('PUBLISH_SCHEDULE','loc-1');
  await grant('PUBLISH_SCHEDULE','loc-2');
  await f.q("UPDATE shifts SET schedule_id='s2' WHERE id='move'; UPDATE shifts SET notes='Held note' WHERE id='held'");
  await expect(publish('loc-1',f.manager)).rejects.toThrow('operational_authorization');
  await expect(publish('loc-2',f.manager)).rejects.toThrow('operational_authorization');
  expect(await f.q("SELECT status FROM schedules WHERE id='s2'")).toEqual([{status:'DRAFT'}]);
  const published = await publish('loc-2',f.owner);
  const capture = (id: string | undefined) => f.q(
    'SELECT source_shift_id,location_id,notes FROM schedule_publication_revision_shifts WHERE revision_id=$1 ORDER BY source_shift_id',[id],
  );
  expect(await capture(original.revision?.id)).toEqual([
    {source_shift_id:'held',location_id:'loc-1',notes:'Published note'},
    {source_shift_id:'move',location_id:'loc-1',notes:'Assignment to move'},
  ]);
  expect(await capture(published.revision?.id)).toEqual([
    {source_shift_id:'held',location_id:'loc-1',notes:'Published note'},
    {source_shift_id:'move',location_id:'loc-2',notes:'Assignment to move'},
  ]);
});

it('scopes time exceptions independently, rejects a delegated requester, and rechecks capability revocation at the write', async () => {
  const now = new Date();
  now.setUTCDate(now.getUTCDate()-3);
  now.setUTCHours(12,0,0,0);
  const proposedStartAt = now.toISOString();
  const proposedEndAt = new Date(now.getTime()+3600000).toISOString();
  const command = {kind:'MISSING_ENTRY',locationId:'loc-1',proposedStartAt,proposedEndAt,reason:'Missing tablet entry'} as const;
  const submitted = await submitTimeCorrection(employee,{...command,operationId:randomUUID()},f.db.executor);
  expect(submitted.status).toBe('pending');
  if (submitted.status!=='pending') throw new Error('No correction request');
  const review = {operationId:randomUUID(),requestId:submitted.requestId,expectedRevision:1,decision:'APPROVE'} as const;
  expect(await reviewTimeCorrection(f.manager,review,f.db.executor)).toEqual({status:'unavailable'});
  await grant('REVIEW_TIME_EXCEPTION','loc-1');
  await f.q("INSERT INTO employee_location_eligibility VALUES ('target','loc-2')");
  const otherSite = await submitTimeCorrection(employee,{...command,locationId:'loc-2',operationId:randomUUID(),
    proposedStartAt:new Date(now.getTime()-172800000).toISOString(),
    proposedEndAt:new Date(now.getTime()-169200000).toISOString()},f.db.executor);
  if (otherSite.status!=='pending') throw new Error('No second location request: '+otherSite.status);
  expect(await readManagerTimeCorrections(f.manager,f.db.executor)).toMatchObject({state:'ready',requests:[{id:submitted.requestId}]});
  expect(await reviewTimeCorrection(f.manager,{...review,operationId:randomUUID(),requestId:otherSite.requestId},f.db.executor)).toEqual({status:'unavailable'});
  let entered=false;
  const racing:SqlExecutor={...f.db.executor,transaction:async statements=>{
    if (!entered && statements.some(statement=>statement.text.includes('SELECT nevora_review_time_correction('))) {
      entered=true;await grant('REVIEW_TIME_EXCEPTION','loc-1',false,1);
    }
    return f.db.executor.transaction(statements);
  }};
  expect(await reviewTimeCorrection(f.manager,review,racing)).toEqual({status:'unavailable'});
  expect(entered).toBe(true);
  await grant('REVIEW_TIME_EXCEPTION','loc-1',true,2);
  expect(await reviewTimeCorrection(f.manager,review,f.db.executor)).toMatchObject({status:'approved'});
  expect(await reviewTimeCorrection(f.manager,review,f.db.executor)).toMatchObject({status:'approved'});

  const secondStart = new Date(now.getTime()-86400000).toISOString();
  const secondEnd = new Date(now.getTime()-82800000).toISOString();
  const delegated = await submitDelegatedTimeCorrection(f.owner,'target',{...command,operationId:randomUUID(),
    proposedStartAt:secondStart,proposedEndAt:secondEnd},f.db.executor);
  if (delegated.status!=='pending') throw new Error('No delegated request: '+delegated.status);
  const decideDelegation = {operationId:randomUUID(),requestId:delegated.requestId,expectedRevision:1,decision:'APPROVE'} as const;
  expect(await reviewTimeCorrection(f.owner,decideDelegation,f.db.executor)).toEqual({status:'blocked',reason:'self_review'});
  expect(await reviewTimeCorrection(f.manager,decideDelegation,f.db.executor)).toMatchObject({status:'approved'});
});
