import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import { createPunchFixture } from './clocker-punch-fixture';
import { readTimecards, mutateTimecard } from '../../lib/timecards/service';
import { submitTimeCorrection } from '../../lib/time-corrections/service';
import type { SessionMutationProof } from '../../lib/shift-changes/types';

const proof = (id: string, role: 'OWNER'|'MANAGER'|'EMPLOYEE'|'LEAD', hash: string): SessionMutationProof => ({
  sessionTokenHash: hash.repeat(64), employee: { id, role, firstName: 'QA', lastName: 'Fictional', primaryLocationId: 'loc-1' },
});
const owner = proof('c34-owner','OWNER','a'), employee = proof('c34-a','EMPLOYEE','d');
let f: Awaited<ReturnType<typeof createPunchFixture>>;
const period = { startDate:'2026-09-21',endDate:'2026-09-27' };
beforeEach(async () => {
  f = await createPunchFixture({companyAccess:true});
  await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'c34-a',now()+interval '1 day')");
  await f.q(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version)
    VALUES('D3-T','c34-a','loc-1',$1,'2026-09-22T12:00:00Z','2026-09-22T20:00:00Z','CLOCKED_OUT',1)`, [f.devices[0].device.id]);
});
afterEach(async () => { await f?.db.dispose(); });
async function card() {
  const result = await readTimecards(owner,period,f.db.executor);
  if (result.state !== 'ready') throw new Error('Expected ready timecards');
  const item = result.cards.find(c => c.source.employeeId === 'c34-a');
  if (!item) throw new Error('Expected employee card');
  return item;
}
async function act(action:'APPROVE'|'FINALIZE'|'REOPEN', overrides:Record<string,unknown> = {}) {
  const targetPeriod = {startDate:String(overrides.startDate??period.startDate),endDate:String(overrides.endDate??period.endDate)};
  const targetId = String(overrides.employeeId??'c34-a');
  const result = await readTimecards(owner,targetPeriod,f.db.executor);
  if(result.state!=='ready')throw new Error('Expected target period read');
  const current = result.cards.find(c=>c.source.employeeId===targetId);
  if(!current)throw new Error('Expected target employee card');
  return mutateTimecard(owner,{ operationId:randomUUID(),employeeId:'c34-a',...period,
    expectedRevision:current.revision,expectedSourceHash:current.sourceHash,action,
    ...(action==='REOPEN'?{note:'Recorded correction requires a new period revision.'}:{}),...overrides },f.db.executor);
}
describe('D3 owned timecard protocol', () => {
  it('reads canonical effective time, scopes employee self-service and refuses Lead management', async () => {
    const result = await readTimecards(employee,period,f.db.executor);
    expect(result.state).toBe('ready');
    if (result.state === 'ready') {
      expect(result.cards.map(c => c.source.employeeId)).toEqual(['c34-a']);
      expect(result.cards[0].card.recordedNanoseconds).toBe('28800000000000');
    }
    expect(await mutateTimecard(employee,{operationId:randomUUID(),employeeId:'c34-b',...period,expectedRevision:0,
      expectedSourceHash:'0'.repeat(32),action:'APPROVE'},f.db.executor)).toEqual({status:'unavailable'});
  });
  it('P4 reopen is refused while approved payroll pays this person for the period, and allowed once a correction is open', async () => {
    expect((await act('APPROVE')).status).toBe('approved');
    expect((await act('FINALIZE')).status).toBe('finalized');
    const [{ id: workspaceId }] = await f.q<{ id: string }>('SELECT id FROM workspaces WHERE singleton');
    const run = randomUUID(), correction = randomUUID();
    await f.q('INSERT INTO payroll_runs(workspace_id,id,start_date,end_date) VALUES($1,$2,$3,$4)', [workspaceId, run, '2026-09-21', '2026-10-04']);
    await f.q('INSERT INTO payroll_run_revisions(workspace_id,run_id,revision,payload) VALUES($1,$2,1,$3)', [workspaceId, run, { id: run, status: 'APPROVED', rows: null, nativeCalculation: { employees: [{ employeeId: 'c34-a' }] } }]);
    expect(await act('REOPEN')).toEqual({ status: 'blocked', reason: 'payroll_approved' });
    expect((await card()).state).toBe('FINALIZED');
    await f.q('INSERT INTO payroll_runs(workspace_id,id,start_date,end_date,correction_of) VALUES($1,$2,$3,$4,$5)', [workspaceId, correction, '2026-09-21', '2026-10-04', run]);
    await f.q('INSERT INTO payroll_run_revisions(workspace_id,run_id,revision,payload) VALUES($1,$2,1,$3)', [workspaceId, correction, { id: correction, status: 'REVIEW_REQUIRED', rows: [{ employeeId: 'c34-a' }] }]);
    expect((await act('REOPEN')).status).toBe('reopened');
  });
  it('recovers an exact committed reopen after later payroll approval without admitting fresh changes or stale authority', async () => {
    await act('APPROVE'); await act('FINALIZE');
    const current = await card();
    const command = { operationId:randomUUID(),employeeId:'c34-a',...period,
      expectedRevision:current.revision,expectedSourceHash:current.sourceHash,
      action:'REOPEN' as const,note:'Reviewed correction of recorded time.' };
    const receipt = await mutateTimecard(owner,command,f.db.executor);
    expect(receipt).toEqual({status:'reopened',operationId:command.operationId,revision:3});
    expect(await mutateTimecard(owner,command,f.db.executor)).toEqual(receipt);
    await act('APPROVE'); await act('FINALIZE');
    const [{id:workspaceId}] = await f.q<{id:string}>('SELECT id FROM workspaces WHERE singleton');
    const run = randomUUID();
    await f.q('INSERT INTO payroll_runs(workspace_id,id,start_date,end_date) VALUES($1,$2,$3,$4)',[workspaceId,run,period.startDate,period.endDate]);
    await f.q('INSERT INTO payroll_run_revisions(workspace_id,run_id,revision,payload) VALUES($1,$2,1,$3)',
      [workspaceId,run,{id:run,status:'APPROVED',rows:null,nativeCalculation:{employees:[{employeeId:'c34-a'}]}}]);
    expect(await act('REOPEN')).toEqual({status:'blocked',reason:'payroll_approved'});
    expect(await mutateTimecard(owner,command,f.db.executor)).toEqual(receipt);
    expect(await mutateTimecard(owner,{...command,note:'Changed retry payload.'},f.db.executor)).toEqual({status:'conflict'});
    expect(await mutateTimecard(owner,{...command,employeeId:'c34-b'},f.db.executor)).toEqual({status:'conflict'});
    await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('c34-other-owner','Other','Fictional Owner','558','OWNER','loc-1')");
    await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('e',64),'c34-other-owner',now()+interval '1 day')");
    const otherOwner=proof('c34-other-owner','OWNER','e');
    expect(await mutateTimecard(otherOwner,command,f.db.executor)).toEqual({status:'blocked',reason:'payroll_approved'});
    expect(await mutateTimecard(otherOwner,{...command,operationId:randomUUID()},f.db.executor)).toEqual({status:'blocked',reason:'payroll_approved'});
    expect(await f.q('SELECT revision,action FROM timecard_revisions WHERE operation_id=$1',[command.operationId])).toEqual([{revision:3,action:'REOPEN'}]);
    expect((await card()).state).toBe('FINALIZED');
    await f.q("DELETE FROM employee_sessions WHERE token_hash=repeat('a',64)");
    expect(await mutateTimecard(owner,command,f.db.executor)).toEqual({status:'unavailable'});
  });
  it('approves, finalizes and retains history across explicit reopen', async () => {
    expect((await act('APPROVE')).status).toBe('approved');
    expect((await act('FINALIZE')).status).toBe('finalized');
    const finalized = await card();
    expect(finalized.state).toBe('FINALIZED');
    expect(finalized.history.map(h => h.action)).toEqual(['FINALIZE','APPROVE']);
    expect((await act('REOPEN')).status).toBe('reopened');
    const reopened = await card();
    expect(reopened.state).toBe('REOPENED');
    expect(reopened.history[1].snapshot).toEqual(finalized.history[0].snapshot);
    expect((await act('FINALIZE')).status).toBe('blocked');
  });
  it('binds review to exact source and refuses stale approval/finalization', async () => {
    const before = await card();
    await f.q("UPDATE time_entries SET clock_out_at='2026-09-22T21:00:00Z',version=2 WHERE id='D3-T'");
    expect((await act('APPROVE',{expectedSourceHash:before.sourceHash})).status).toBe('conflict');
    expect((await act('APPROVE')).status).toBe('approved');
    await f.q("UPDATE time_entries SET clock_out_at='2026-09-22T22:00:00Z',version=3 WHERE id='D3-T'");
    expect((await act('FINALIZE')).status).toBe('blocked');
  });
  it('replays one receipt and rejects operation reuse', async () => {
    const current = await card();
    const command = { operationId:randomUUID(),employeeId:'c34-a',...period,expectedRevision:0,
      expectedSourceHash:current.sourceHash,action:'APPROVE' as const };
    const first = await mutateTimecard(owner,command,f.db.executor);
    expect(first.status).toBe('approved');
    expect(await mutateTimecard(owner,command,f.db.executor)).toEqual(first);
    expect((await mutateTimecard(owner,{...command,action:'FINALIZE'},f.db.executor)).status).toBe('conflict');
    expect(await f.q('SELECT count(*)::int AS count FROM timecard_revisions')).toEqual([{count:1}]);
  });
  it('serializes simultaneous review to one approved revision', async () => {
    const current = await card();
    const outcomes = await Promise.all([1,2].map(() => mutateTimecard(owner,{operationId:randomUUID(),employeeId:'c34-a',...period,
      expectedRevision:0,expectedSourceHash:current.sourceHash,action:'APPROVE'},f.db.executor)));
    expect(outcomes.map(r => r.status).sort()).toEqual(['approved','conflict']);
  });
  it('interlocks correction submission with finalized periods until reopen', async () => {
    await act('APPROVE'); await act('FINALIZE');
    const command = {operationId:randomUUID(),kind:'ENTRY_BOUNDARY' as const,timeEntryId:'D3-T',
      proposedStartAt:'2026-09-22T12:00:00Z',proposedEndAt:'2026-09-22T21:00:00Z',reason:'Fictional completed work review'};
    expect((await submitTimeCorrection(employee,command,f.db.executor)).status).toBe('blocked');
    await act('REOPEN');
    expect((await submitTimeCorrection(employee,command,f.db.executor)).status).toBe('pending');
    expect((await act('APPROVE')).status).toBe('blocked');
  });
  it('blocks overlapping finalized periods and protects append-only history', async () => {
    await act('APPROVE'); await act('FINALIZE');
    expect((await act('APPROVE',{startDate:'2026-09-22',endDate:'2026-09-28'})).status).toBe('blocked');
    await expect(f.q('DELETE FROM timecard_revisions')).rejects.toThrow();
  });
  it('D8 bounds the authorized snapshot by the current session deadline and refuses logout after projection',async()=>{
    await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '10 seconds' WHERE employee_id='c34-owner'");const result=await readTimecards(owner,period,f.db.executor);expect(result.state).toBe('ready');if(result.state==='ready'){expect(result.validForMs).toBeGreaterThan(0);expect(result.validForMs).toBeLessThanOrEqual(10000);}
    const executor={...f.db.executor,transaction:async(statements:Parameters<typeof f.db.executor.transaction>[0])=>{const result=await f.db.executor.transaction(statements);if(statements.some(statement=>statement.text.includes('WITH scope AS')))await f.q("DELETE FROM employee_sessions WHERE employee_id='c34-owner'");return result;}};
    expect(await readTimecards(owner,period,executor)).toEqual({state:'unavailable',reason:'access_denied'});
  });
  it('refuses expired or revoked sessions without exposing card data', async () => {
    await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id='c34-owner'");
    expect((await readTimecards(owner,period,f.db.executor)).state).toBe('unavailable');
    expect((await mutateTimecard(owner,{operationId:randomUUID(),employeeId:'c34-a',...period,expectedRevision:0,
      expectedSourceHash:'0'.repeat(32),action:'APPROVE'},f.db.executor)).status).toBe('unavailable');
  });
  it('refuses manager reads after the actor loses management authority',async()=>{
    await f.q("UPDATE employees SET role='EMPLOYEE' WHERE id='c34-owner'");
    expect((await readTimecards(owner,period,f.db.executor)).state).toBe('unavailable');
  });
  it('protects finalized captured punches and break sources from historical writes',async()=>{
    await act('APPROVE');await act('FINALIZE');
    await expect(f.q("UPDATE time_entries SET clock_out_at='2026-09-22T21:00:00Z',version=2 WHERE id='D3-T'")).rejects.toThrow('FINALIZED_PERIOD');
    await expect(f.q("INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at) VALUES('D3-B','D3-T','2026-09-22T16:00:00Z','2026-09-22T16:15:00Z')")).rejects.toThrow('FINALIZED_PERIOD');
  });
  it('D8 protects the old finalized employee/parent when a historical record is reassigned',async()=>{
    await f.q("INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at) VALUES('D8-B','D3-T','2026-09-22T16:00:00Z','2026-09-22T16:15:00Z')");
    await f.q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) SELECT 'D8-OTHER','c34-b',location_id,device_id,clock_in_at,clock_out_at,status,version FROM time_entries WHERE id='D3-T'");
    await act('APPROVE');await act('FINALIZE');
    await expect(f.q("UPDATE time_entries SET employee_id='c34-b' WHERE id='D3-T'")).rejects.toThrow('FINALIZED_PERIOD');
    await expect(f.q("UPDATE break_entries SET time_entry_id='D8-OTHER' WHERE id='D8-B'")).rejects.toThrow('FINALIZED_PERIOD');
    expect((await f.q("SELECT employee_id FROM time_entries WHERE id='D3-T'"))[0].employee_id).toBe('c34-a');
    expect((await f.q("SELECT time_entry_id FROM break_entries WHERE id='D8-B'"))[0].time_entry_id).toBe('D3-T');
  });
  it('refuses self-review, open periods and open entries', async () => {
    expect((await act('APPROVE',{employeeId:'c34-owner'})).status).toBe('blocked');
    const today = Temporal.Now.zonedDateTimeISO('America/Puerto_Rico').toPlainDate().toString();
    expect((await act('APPROVE',{startDate:today,endDate:today})).status).toBe('blocked');
    await f.q("UPDATE time_entries SET clock_out_at=NULL,status='CLOCKED_IN' WHERE id='D3-T'");
    expect((await act('APPROVE')).status).toBe('blocked');
  });
});
