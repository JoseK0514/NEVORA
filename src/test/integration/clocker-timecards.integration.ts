import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import { Temporal } from '@js-temporal/polyfill';
import { Client } from 'pg';
import { createPunchFixture } from './clocker-punch-fixture';
import { readTimecards, mutateTimecard, timecardReadSql } from '../../lib/timecards/service';
import { reviewTimecards, runReviewedBatch } from '../../lib/timecards/reviewed-batch';
import { submitTimeCorrection, reviewTimeCorrection } from '../../lib/time-corrections/service';
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
async function publishMissingShift() {
  await f.q("DELETE FROM time_entries WHERE id='D3-T'");
  await f.q(`INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by)
    VALUES('BL20-PUB','2026-09-21',1,'PUBLISH','c34-owner')`);
  await f.q(`INSERT INTO schedule_publication_revision_shifts
    (id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,is_callout_approved)
    VALUES('BL20-ASSIGNMENT','BL20-PUB','BL20-SHIFT','BL20-SCHEDULE','loc-1','c34-a','2026-09-22','08:00','16:00',false)`);
}

async function publishCalloutRelease() {
  await f.q(`INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,source_id,created_by)
    VALUES('BL20-RELEASE','2026-09-21',2,'CALLOUT','BL20-CALLOUT','c34-owner');
    INSERT INTO schedule_publication_revision_shifts
    (id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,is_callout_approved)
    SELECT 'BL20-RELEASED-ASSIGNMENT','BL20-RELEASE',source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,true
    FROM schedule_publication_revision_shifts WHERE id='BL20-ASSIGNMENT'`);
}

async function seedApprovalForCurrentSource() {
  await f.q(`INSERT INTO timecard_revisions(operation_id,workspace_id,employee_id,start_date,end_date,revision,
    action,actor_employee_id,source_hash,snapshot,command_hash)
    SELECT $1,w.id,'c34-a',$2,$3,1,'APPROVE','c34-owner',md5(v.source::text),v.source,repeat('0',64)
    FROM workspaces w CROSS JOIN LATERAL (SELECT nevora_timecard_source(w.id,'c34-a',$2,$3) AS source) v
    WHERE w.singleton`,[randomUUID(),period.startDate,period.endDate]);
}

describe('BL-20 published shifts with no effective time', () => {
  it.each([['individual','APPROVE'],['individual','FINALIZE'],['batch','APPROVE'],['batch','FINALIZE']] as const)(
  'refuses %s %s on an unresolved shift', async (path,action) => {
    await publishMissingShift();
    if (action==='FINALIZE') await seedApprovalForCurrentSource();
    const before = await card();
    expect(before.source.entries).toEqual([]);
    expect(before.source.corrections).toEqual([]);
    expect(before.card.recordedNanoseconds).toBe('0');
    if (path==='individual') {
      expect(await act(action)).toEqual({status:'blocked',reason:'missing_shift_disposition'});
    } else {
      // Exercise a queued command reaching the server despite client exclusions.
      const review = reviewTimecards(period,owner.employee.id,[{...before,card:{...before.card,issues:[]}}],['c34-a'],action,randomUUID);
      const [result] = await runReviewedBatch(review,()=>true,async command=>{
        const body = await mutateTimecard(owner,command,f.db.executor);
        return {body,httpStatus:body.status==='blocked'||body.status==='conflict'?409:200};
      });
      expect(result.status).toBe('blocked');
    }
    expect((await card()).revision).toBe(before.revision);
  });

  it('requires a fresh review after an approved callout release and freezes its zero-hour outcome', async () => {
    await publishMissingShift();
    const before = await card();
    expect(before.card.issues).toContain('missing_shift_disposition');
    expect(()=>reviewTimecards(period,owner.employee.id,[before],['c34-a'],'APPROVE',randomUUID)).toThrow('not eligible');
    const blocked = {operationId:randomUUID(),employeeId:'c34-a',...period,action:'APPROVE',
      expectedRevision:before.revision,expectedSourceHash:before.sourceHash,note:'Employee did not work.'} as const;
    const refusal = {status:'blocked',reason:'missing_shift_disposition'};
    expect(await mutateTimecard(owner,blocked,f.db.executor)).toEqual(refusal);
    expect(await mutateTimecard(owner,blocked,f.db.executor)).toEqual(refusal);
    expect(await f.q('SELECT operation_id FROM timecard_revisions WHERE operation_id=$1',[blocked.operationId])).toEqual([]);

    await publishCalloutRelease();
    expect(await mutateTimecard(owner,blocked,f.db.executor)).toEqual({status:'conflict'});
    const released = await card();
    expect(released.card.issues).toEqual([]);
    expect(released.source.shiftOutcomes).toEqual([
      {assignmentId:'BL20-RELEASED-ASSIGNMENT',locationId:'loc-1',date:'2026-09-22',status:'APPROVED_CALLOUT'},
    ]);
    const approval = await act('APPROVE');
    expect(approval.status).toBe('approved');
    const operationId = randomUUID();
    const finalized = await act('FINALIZE',{operationId});
    expect(finalized).toEqual({status:'finalized',operationId,revision:2});
    expect(await act('FINALIZE',{operationId,expectedRevision:1})).toEqual(finalized);
    const frozen = await card();
    expect(frozen.card.recordedNanoseconds).toBe('0');
    expect(frozen.history[0].snapshot.shiftOutcomes).toEqual(released.source.shiftOutcomes);
    expect(frozen.history.map(record=>record.action)).toEqual(['FINALIZE','APPROVE']);
  });

  it('holds a mixed period until missing worked time goes through independent correction', async () => {
    await publishMissingShift();
    await f.q(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status)
      VALUES('BL20-OTHER-DAY','c34-a','loc-1',$1,'2026-09-23T12:00:00Z','2026-09-23T20:00:00Z','CLOCKED_OUT'),
        ('BL20-OTHER-SITE','c34-a','loc-2',$2,'2026-09-22T12:00:00Z','2026-09-22T20:00:00Z','CLOCKED_OUT')`,
      [f.devices[0].device.id,f.devices[2].device.id]);
    expect((await card()).card.recordedNanoseconds).toBe('57600000000000');
    expect(await act('APPROVE')).toEqual({status:'blocked',reason:'missing_shift_disposition'});

    // The other site's overlapping time must be resolved before adding a replacement.
    await f.q("DELETE FROM time_entries WHERE id='BL20-OTHER-SITE'");
    const pending = await submitTimeCorrection(employee,{operationId:randomUUID(),kind:'MISSING_ENTRY',locationId:'loc-1',
      proposedStartAt:'2026-09-22T12:00:00Z',proposedEndAt:'2026-09-22T19:00:00Z',reason:'Fictional verified work interval.'},f.db.executor);
    expect(pending.status).toBe('pending');
    if(pending.status!=='pending')throw Error('Expected a missing-time request');
    expect(await act('APPROVE')).toEqual({status:'blocked',reason:'unresolved_time'});
    const decision = {operationId:randomUUID(),requestId:pending.requestId,expectedRevision:1,decision:'APPROVE'} as const;
    expect((await reviewTimeCorrection(employee,decision,f.db.executor)).status).toBe('unavailable');
    expect((await reviewTimeCorrection(owner,decision,f.db.executor)).status).toBe('approved');
    expect((await card()).source.shiftOutcomes).toBeUndefined();
    expect((await act('APPROVE')).status).toBe('approved');
    expect((await act('FINALIZE')).status).toBe('finalized');
    expect((await card()).card.recordedNanoseconds).toBe('54000000000000');
  });

  it('requires a company reviewer and prevents a newly published assignment from reusing a prior approval', async () => {
    await f.q("DELETE FROM time_entries WHERE id='D3-T'");
    expect((await act('APPROVE')).status).toBe('approved');
    const reviewed = await card();
    await publishMissingShift();
    expect((await card()).state).toBe('NEEDS_REVIEW');
    expect(await act('FINALIZE',{expectedSourceHash:reviewed.sourceHash})).toEqual({status:'conflict'});
    const current = await card();
    const command = {operationId:randomUUID(),employeeId:'c34-a',...period,action:'FINALIZE',
      expectedRevision:current.revision,expectedSourceHash:current.sourceHash};
    await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id)
      VALUES('bl20-manager','Fictional','Location Manager','558','MANAGER','loc-1');
      INSERT INTO employee_sessions(token_hash,employee_id,expires_at)
      VALUES(repeat('e',64),'bl20-manager',now()+interval '1 day')`);
    expect(await mutateTimecard(proof('bl20-manager','MANAGER','e'),command,f.db.executor)).toEqual({status:'unavailable'});
    expect(await mutateTimecard(employee,command,f.db.executor)).toEqual({status:'unavailable'});
    expect(await mutateTimecard(owner,command,f.db.executor)).toEqual({status:'blocked',reason:'missing_shift_disposition'});
  });

  it('accepts ordinary captured work for a published shift', async () => {
    await publishMissingShift();
    await f.q(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status)
      VALUES('BL20-WORKED','c34-a','loc-1',$1,'2026-09-22T12:05:00Z','2026-09-22T19:55:00Z','CLOCKED_OUT')`,[f.devices[0].device.id]);
    expect((await card()).source.shiftOutcomes).toBeUndefined();
    expect((await act('APPROVE')).status).toBe('approved');
    expect((await act('FINALIZE')).status).toBe('finalized');
    expect((await card()).card.recordedNanoseconds).toBe('28200000000000');
  });

  it('uses the latest publication even for an overnight assignment owned by an older week', async () => {
    await publishMissingShift();
    await f.q(`UPDATE schedule_publication_revisions SET week_start='2026-09-07' WHERE id='BL20-PUB';
      UPDATE schedule_publication_revision_shifts SET date='2026-09-20',start_time='22:00',end_time='02:00'
      WHERE id='BL20-ASSIGNMENT'`);
    expect((await card()).card.issues).toContain('missing_shift_disposition');
    expect(await act('APPROVE')).toEqual({status:'blocked',reason:'missing_shift_disposition'});
    await f.q(`INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by)
      VALUES('BL20-REMOVED','2026-09-07',2,'PUBLISH','c34-owner')`);
    expect((await card()).source.shiftOutcomes).toBeUndefined();
    expect((await act('APPROVE')).status).toBe('approved');
  });

  it('holds a pre-revision published assignment and ignores an unpublished draft', async () => {
    await f.q(`DELETE FROM time_entries WHERE id='D3-T';
      INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('BL20-LEGACY','loc-1','2026-09-21','DRAFT','c34-owner');
      INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time)
      VALUES('BL20-LEGACY-SHIFT','BL20-LEGACY','c34-a','2026-09-22','08:00','16:00')`);
    expect((await card()).source.shiftOutcomes).toBeUndefined();
    await f.q("UPDATE schedules SET status='PUBLISHED' WHERE id='BL20-LEGACY'");
    expect(await act('APPROVE')).toEqual({status:'blocked',reason:'missing_shift_disposition'});
  });

  it('waits for a publishing transaction and rejects its stale finalization command', async () => {
    await f.q("DELETE FROM time_entries WHERE id='D3-T'");
    expect((await act('APPROVE')).status).toBe('approved');
    const current = await card();
    const operationId = randomUUID();
    await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id)
      VALUES('bl20-publisher','Fictional','Publishing Owner','558','OWNER','loc-1')`);
    const publisher = new Client({connectionString:f.db.connectionString});
    await publisher.connect();
    let pending: ReturnType<typeof mutateTimecard> | undefined;
    try {
      await publisher.query('BEGIN');
      const [{pid}] = (await publisher.query('SELECT pg_backend_pid() AS pid')).rows;
      await publisher.query("SELECT pg_advisory_xact_lock(hashtextextended('schedule-week:2026-09-21',0))");
      await publisher.query(`INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by)
        VALUES('BL20-RACE-PUB','2026-09-21',1,'PUBLISH','bl20-publisher');
        INSERT INTO schedule_publication_revision_shifts
        (id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time)
        VALUES('BL20-RACE-ASSIGNMENT','BL20-RACE-PUB','BL20-RACE-SHIFT','BL20-RACE-SCHEDULE','loc-1','c34-a','2026-09-22','08:00','16:00')`);
      pending = mutateTimecard(owner,{operationId,employeeId:'c34-a',...period,action:'FINALIZE',
        expectedRevision:current.revision,expectedSourceHash:current.sourceHash},f.db.executor);
      let waiting = false;
      for (let attempt=0;attempt<150&&!waiting;attempt++) {
        const [row] = await f.q<{waiting:boolean}>(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity
          WHERE $1=ANY(pg_blocking_pids(pid)) AND query LIKE '%pg_advisory_xact_lock_shared%') AS waiting`,[pid]);
        waiting = row.waiting;
        if(!waiting)await new Promise(resolve=>setTimeout(resolve,10));
      }
      expect(waiting).toBe(true);
      await publisher.query('COMMIT');
      expect(await pending).toEqual({status:'conflict'});
      expect((await card()).state).toBe('NEEDS_REVIEW');
    } finally {
      await publisher.query('ROLLBACK').catch(()=>{});
      await pending;
      await publisher.end();
    }
  });
});
describe('D3 owned timecard protocol', () => {
  it('BL-09 keeps unscheduled worked time in an independently reviewed and finalized card', async () => {
    const before=await card();
    expect(before.source.shiftOutcomes).toBeUndefined();
    expect(before.source.entries).toMatchObject([{id:'D3-T',sourceKind:'RECORDED',locationId:'loc-1'}]);
    const note='Confirmed unscheduled coverage and actual time with the employee.';
    expect((await act('APPROVE',{note})).status).toBe('approved');
    expect((await act('FINALIZE')).status).toBe('finalized');
    expect(await card()).toMatchObject({state:'FINALIZED',card:{recordedNanoseconds:'28800000000000'},
      history:[{action:'FINALIZE'},{action:'APPROVE',note}]});
  });
  it('BL-21 blocks duplicate recorded intervals before either one can reach payroll', async () => {
    await f.q(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version)
      SELECT 'D3-DUPLICATE',employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version
      FROM time_entries WHERE id='D3-T'`);
    const before=await card();
    expect(before.card.issues).toContain('overlapping_time');
    expect(await act('APPROVE')).toEqual({status:'blocked',reason:'unresolved_time'});
    expect(await act('FINALIZE')).toEqual({status:'blocked',reason:'unresolved_time'});
    expect((await card()).revision).toBe(before.revision);
  });
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
  it.each(['provider','native'] as const)('BL-23 an approved %s payroll revision keeps the finalized period locked after correction creation', async (kind) => {
    expect((await act('APPROVE')).status).toBe('approved');
    expect((await act('FINALIZE')).status).toBe('finalized');
    const frozen = await card();
    const [{ id: workspaceId }] = await f.q<{ id: string }>('SELECT id FROM workspaces WHERE singleton');
    const run = randomUUID(), correction = randomUUID(), statement = randomUUID();
    await f.q('INSERT INTO payroll_runs(workspace_id,id,start_date,end_date) VALUES($1,$2,$3,$4)', [workspaceId, run, '2026-09-21', '2026-10-04']);
    const employeeRows = [{employeeId:'c34-a'}];
    const membership = kind==='provider' ? {rows:employeeRows} : {rows:null,nativeCalculation:{employees:employeeRows}};
    const payrollSnapshot = {source:{revision:frozen.revision,sourceHash:frozen.sourceHash}};
    await f.q(`INSERT INTO payroll_run_revisions(workspace_id,run_id,revision,payload,snapshot)
      VALUES($1,$2,1,$3,$4),($1,$2,2,$5,$4)`,[workspaceId,run,{id:run,status:'REVIEW_REQUIRED',...membership},payrollSnapshot,{id:run,status:'APPROVED',...membership}]);
    await f.q(`INSERT INTO payroll_documents(workspace_id,id,run_id,employee_id,kind,filename,sha256,content,payload)
      VALUES($1,$2,$3,'c34-a','EMPLOYEE_STATEMENT','fictional.pdf',repeat('a',64),convert_to('Fictional statement','UTF8'),'{}')`,[workspaceId,statement,run]);
    await f.q('INSERT INTO payroll_publications(workspace_id,run_id) VALUES($1,$2)',[workspaceId,run]);
    expect(await act('REOPEN')).toEqual({ status: 'blocked', reason: 'payroll_approved' });
    expect((await card()).state).toBe('FINALIZED');
    await f.q('INSERT INTO payroll_runs(workspace_id,id,start_date,end_date,correction_of) VALUES($1,$2,$3,$4,$5)', [workspaceId, correction, '2026-09-21', '2026-10-04', run]);
    await f.q('INSERT INTO payroll_run_revisions(workspace_id,run_id,revision,payload) VALUES($1,$2,1,$3)', [workspaceId, correction, { id: correction, status: 'REVIEW_REQUIRED', rows: [{ employeeId: 'c34-a' }] }]);
    const operationId = randomUUID();
    const blocked = {status:'blocked',reason:'payroll_approved'};
    expect(await act('REOPEN',{operationId})).toEqual(blocked);
    expect(await act('REOPEN',{operationId})).toEqual(blocked);
    expect(await card()).toMatchObject({state:'FINALIZED',revision:frozen.revision,sourceHash:frozen.sourceHash,history:frozen.history});
    expect(await f.q('SELECT snapshot FROM payroll_run_revisions WHERE run_id=$1 AND revision=2',[run])).toEqual([{snapshot:payrollSnapshot}]);
    expect(await f.q(`SELECT convert_from(d.content,'UTF8') AS body FROM payroll_documents d
      JOIN payroll_publications p ON p.workspace_id=d.workspace_id AND p.run_id=d.run_id WHERE d.id=$1`,[statement])).toEqual([{body:'Fictional statement'}]);

    const controls = [{employeeId:'c34-b'}, {startDate:'2026-09-14',endDate:'2026-09-20'}];
    for (const datesOrEmployee of controls) {
      expect((await act('APPROVE',datesOrEmployee)).status).toBe('approved');
      expect((await act('FINALIZE',datesOrEmployee)).status).toBe('finalized');
      expect((await act('REOPEN',datesOrEmployee)).status).toBe('reopened');
    }
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
    let revoked=false;
    const executor={...f.db.executor,transaction:async(statements:Parameters<typeof f.db.executor.transaction>[0])=>{const result=await f.db.executor.transaction(statements);if(statements.some(statement=>statement.text===timecardReadSql)){await f.q("DELETE FROM employee_sessions WHERE employee_id='c34-owner'");revoked=true;}return result;}};
    expect(await readTimecards(owner,period,executor)).toEqual({state:'unavailable',reason:'access_denied'});
    expect(revoked).toBe(true);
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
