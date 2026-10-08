import {afterEach,beforeEach,expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createPunchFixture} from '../../test/integration/clocker-punch-fixture';
import {readTimecards,mutateTimecard} from '../../lib/timecards/service';
let f:Awaited<ReturnType<typeof createPunchFixture>>;
const owner={employee:{id:'c34-owner',role:'OWNER' as const,firstName:'Owner',lastName:'QA',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
beforeEach(async()=>{f=await createPunchFixture();await f.q(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES('AUDIT-T','c34-a','loc-1',$1,'2026-09-22T12:00:00Z','2026-09-22T20:00:00Z','CLOCKED_OUT',1)`,[f.devices[0].device.id]);});
afterEach(async()=>{await f?.db.dispose();});
async function card(){const r=await readTimecards(owner,period,f.db.executor);expect(r.state).toBe('ready');if(r.state!=='ready')throw Error(JSON.stringify(r));return r.cards.find(c=>c.card.employeeId==='c34-a')!;}
async function act(action:'APPROVE'|'FINALIZE'|'REOPEN'){const c=await card();return mutateTimecard(owner,{...period,operationId:randomUUID(),employeeId:'c34-a',expectedRevision:c.revision,expectedSourceHash:c.sourceHash,action,...(action==='REOPEN'?{note:'Independent audit: reopen for correction.'}:{})},f.db.executor);}
it('control: finalized timecard can reopen without metadata changes',async()=>{expect((await act('APPROVE')).status).toBe('approved');expect((await act('FINALIZE')).status).toBe('finalized');expect((await act('REOPEN')).status).toBe('reopened');});
it('finalized timecard can reopen after employee display-name update',async()=>{await act('APPROVE');await act('FINALIZE');const old=await card();await f.q("UPDATE employees SET first_name='Renamed' WHERE id='c34-a'");const current=await card();expect(current.sourceHash).toBe(old.sourceHash);expect(current.card.employeeName).toBe(old.card.employeeName);const result=await act('REOPEN');console.log('AUDIT_REOPEN_AFTER_EMPLOYEE_RENAME',JSON.stringify(result));expect(result.status).toBe('reopened');});
it('finalized timecard can reopen after location display-name update',async()=>{await act('APPROVE');await act('FINALIZE');await f.q("UPDATE locations SET name='Renamed location',short_name='Renamed' WHERE id='loc-1'");const result=await act('REOPEN');console.log('AUDIT_REOPEN_AFTER_LOCATION_RENAME',JSON.stringify(result));expect(result.status).toBe('reopened');});

import {submitTimeCorrection,reviewTimeCorrection} from '../../lib/time-corrections/service';
import {readEmployeeTimeCorrections,readManagerTimeCorrections} from '../../lib/data/time-corrections.server';
const employee={...owner,employee:{...owner.employee,id:'c34-a',role:'EMPLOYEE' as const},sessionTokenHash:'d'.repeat(64)};
async function missing(start:string,end:string,extra:object={}){
 const r=await submitTimeCorrection(employee,{operationId:randomUUID(),kind:'MISSING_ENTRY',locationId:'loc-1',proposedStartAt:'2020-01-05T'+start+':00Z',proposedEndAt:'2020-01-05T'+end+':00Z',reason:'Fictional chain regression',...extra},f.db.executor);
 if(r.status!=='pending')throw Error(JSON.stringify(r));return r;
}
async function approve(requestId:string){const r=await reviewTimeCorrection(owner,{operationId:randomUUID(),requestId,expectedRevision:1,decision:'APPROVE'},f.db.executor);if(r.status!=='approved')throw Error(JSON.stringify(r));return r;}
it('missing successor resolves the disjoint canonical leaf and stale baseline without rebasing',async()=>{
 await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'c34-a',clock_timestamp()+interval '1 day')");
 const a=await missing('08:00','09:00'),approvedA=await approve(a.requestId);
 const target={targetAdjustmentId:approvedA.adjustmentId,expectedBaseRevision:2};
 const b=await missing('08:05','09:00',target),c=await missing('10:00','11:00',target),approvedC=await approve(c.requestId);
 const executor=f.db.executor;
 const manager=await readManagerTimeCorrections(owner,executor),self=await readEmployeeTimeCorrections(employee,executor);
 expect(manager.state).toBe('ready');expect(self.state).toBe('ready');if(manager.state!=='ready'||self.state!=='ready')return;
 expect(manager.requests.find(r=>r.id===b.requestId)).toMatchObject({baseChanged:true,context:{state:'confirmed',totalDecisions:2}});
 const context=manager.requests.find(r=>r.id===b.requestId)!.context;
 if(context.state==='confirmed'){expect(new Date(context.startAt).toISOString()).toBe('2020-01-05T10:00:00.000Z');expect(new Date(context.endAt).toISOString()).toBe('2020-01-05T11:00:00.000Z');}
 expect(self.requests.find(r=>r.id===a.requestId)).toMatchObject({baseChanged:true,currentAdjustmentId:null,context:{state:'confirmed'}});
 expect(await reviewTimeCorrection(owner,{operationId:randomUUID(),requestId:b.requestId,expectedRevision:1,decision:'APPROVE'},f.db.executor)).toEqual({status:'blocked',reason:'stale_source'});
 expect(await f.q("SELECT adjustment_id::text FROM nevora_effective_time_entries WHERE employee_id='c34-a' AND source_kind='ADJUSTMENT'")).toEqual([{adjustment_id:approvedC.adjustmentId}]);
});

it.each(['employee','location','timezone'] as const)('reopen preserves old immutable revisions after %s metadata changes',async kind=>{
 await act('APPROVE');await act('FINALIZE');const old=await f.q('SELECT to_jsonb(t) AS row FROM timecard_revisions t ORDER BY revision');
 if(kind==='employee')await f.q("UPDATE employees SET first_name='Renamed' WHERE id='c34-a'");
 if(kind==='location')await f.q("UPDATE locations SET name='New long location label',short_name='New label' WHERE id='loc-1'");
 if(kind==='timezone')await f.q("UPDATE workspaces SET time_zone='America/New_York'");
 expect((await act('REOPEN')).status).toBe('reopened');
 expect(await f.q('SELECT to_jsonb(t) AS row FROM timecard_revisions t WHERE revision<=2 ORDER BY revision')).toEqual(old);
 const next=await card();expect(next.revision).toBe(3);expect(next.state).toBe('REOPENED');
 await expect(f.q("UPDATE timecard_revisions SET note='rewrite' WHERE revision=1")).rejects.toThrow();
});
it('reopen remains one-winner and exact-operation idempotent after label changes',async()=>{
 await act('APPROVE');await act('FINALIZE');const frozen=await card();await f.q("UPDATE employees SET first_name='Renamed' WHERE id='c34-a'");
 const command={...period,operationId:randomUUID(),employeeId:'c34-a',expectedRevision:frozen.revision,expectedSourceHash:frozen.sourceHash,action:'REOPEN' as const,note:'Fictional concurrent reopen'};
 const outcomes=await Promise.all([mutateTimecard(owner,command,f.db.executor),mutateTimecard(owner,{...command,operationId:randomUUID()},f.db.executor)]);
 expect(outcomes.map(r=>r.status).sort()).toEqual(['conflict','reopened']);
 const winner=outcomes.find(r=>r.status==='reopened')!;
 if(winner.status==='reopened'){const exact={...command,operationId:winner.operationId};expect(await mutateTimecard(owner,exact,f.db.executor)).toEqual(winner);expect((await mutateTimecard(owner,{...exact,note:'Changed operation reuse'},f.db.executor)).status).toBe('conflict');}
 expect((await f.q("SELECT count(*)::int AS n FROM timecard_revisions WHERE action='REOPEN'"))[0].n).toBe(1);
});
it('reopen refuses stale hashes/revisions, revoked authority and self service while raw writes stay interlocked',async()=>{
 await act('APPROVE');await act('FINALIZE');const c=await card();
 const command={...period,operationId:randomUUID(),employeeId:'c34-a',expectedRevision:c.revision,expectedSourceHash:c.sourceHash,action:'REOPEN' as const,note:'Fictional boundary test'};
 expect((await mutateTimecard(owner,{...command,expectedSourceHash:'0'.repeat(32)},f.db.executor)).status).toBe('conflict');
 expect((await mutateTimecard(owner,{...command,expectedRevision:1},f.db.executor)).status).toBe('conflict');
 expect((await mutateTimecard(employee,command,f.db.executor)).status).toBe('unavailable');
 await f.q("DELETE FROM employee_sessions WHERE employee_id='c34-owner'");expect((await mutateTimecard(owner,command,f.db.executor)).status).toBe('unavailable');
 await expect(f.q("UPDATE time_entries SET clock_out_at='2026-09-22T21:00:00Z' WHERE id='AUDIT-T'")).rejects.toThrow('FINALIZED_PERIOD');
 expect((await f.q("SELECT count(*)::int AS n FROM timecard_revisions"))[0].n).toBe(2);
});
it('upgrade of an existing finalized period preserves records and enables reopen; rollback retains all history',async()=>{
 // Restore the original function only in this invocation-owned database to model upgrade.
 const {readFile}=await import('node:fs/promises');const original=await readFile('db/migrations/0018_timecards.sql','utf8');
 const start=original.indexOf('CREATE FUNCTION nevora_timecard_command('),end=original.indexOf('\n$$;',start)+4;
 await f.q(original.slice(start,end).replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION'));
 await act('APPROVE');await act('FINALIZE');const before=await f.q('SELECT to_jsonb(t) AS row FROM timecard_revisions t ORDER BY revision');await f.q("UPDATE employees SET first_name='Renamed' WHERE id='c34-a'");expect((await act('REOPEN')).status).toBe('conflict');
 await f.q(await readFile('db/migrations/0022_timecard_reopen_revision_authority.sql','utf8'));expect(await f.q('SELECT to_jsonb(t) AS row FROM timecard_revisions t ORDER BY revision')).toEqual(before);expect((await act('REOPEN')).status).toBe('reopened');
 const retained=await f.q('SELECT to_jsonb(t) AS row FROM timecard_revisions t ORDER BY revision');await f.q(original.slice(start,end).replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION'));expect(await f.q('SELECT to_jsonb(t) AS row FROM timecard_revisions t ORDER BY revision')).toEqual(retained);
});
it('deep missing chains retain scoped prior decisions and reject competing stale replacements',async()=>{
 await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'c34-a',clock_timestamp()+interval '1 day')");
 const root=await missing('08:00','09:00'),a=await approve(root.requestId),pending=await missing('08:05','09:00',{targetAdjustmentId:a.adjustmentId,expectedBaseRevision:2});
 const c=await approve((await missing('10:00','11:00',{targetAdjustmentId:a.adjustmentId,expectedBaseRevision:2})).requestId);
 const d=await approve((await missing('12:00','13:00',{targetAdjustmentId:c.adjustmentId,expectedBaseRevision:2})).requestId);
 const rejected=await missing('12:05','13:00',{targetAdjustmentId:d.adjustmentId,expectedBaseRevision:2});expect((await reviewTimeCorrection(owner,{operationId:randomUUID(),requestId:rejected.requestId,expectedRevision:1,decision:'REJECT',note:'Fictional decline'},f.db.executor)).status).toBe('rejected');
 const unrelated=await approve((await missing('14:00','15:00')).requestId);
 const view=await readEmployeeTimeCorrections(employee,f.db.executor);expect(view.state).toBe('ready');if(view.state!=='ready')return;
 const stale=view.requests.find(r=>r.id===pending.requestId)!,ctx=stale.context;expect(stale.baseChanged).toBe(true);expect(ctx.state).toBe('confirmed');if(ctx.state==='confirmed'){expect(new Date(ctx.startAt).toISOString()).toBe('2020-01-05T12:00:00.000Z');expect(ctx.totalDecisions).toBe(4);expect(ctx.decisions.map(x=>x.status)).toContain('REJECTED');expect(ctx.decisions.every(x=>new Date(x.startAt).getUTCHours()!==14)).toBe(true);}
 const unrelatedContext=view.requests.find(r=>r.currentAdjustmentId===unrelated.adjustmentId)!.context;expect(unrelatedContext).toMatchObject({state:'confirmed',totalDecisions:0});
 expect((await reviewTimeCorrection(owner,{operationId:randomUUID(),requestId:pending.requestId,expectedRevision:1,decision:'APPROVE'},f.db.executor))).toEqual({status:'blocked',reason:'stale_source'});
});
it('captured historical position remains identifiable after the current position label changes',async()=>{
 await f.q("INSERT INTO positions(id,workspace_id,name,active) VALUES('REOPEN-P','workspace-fuel','Captured position QA',true)");
 const prepared={version:1,employeeId:'c34-a',locationId:'loc-1',workspaceId:'workspace-fuel',timeZone:'America/Puerto_Rico',windowStartAt:'2026-09-22T08:00:00Z',windowEndAt:'2026-09-22T12:00:00Z',reviewedRevisionIds:[],candidates:[{startAt:'2026-09-22T10:00:00Z',endAt:'2026-09-22T11:00:00Z',uncertain:false,revisionId:'fixture-revision',revisionNumber:1,publishedShiftId:'fixture-shift',sourceShiftId:null,scheduleId:'fixture-schedule',positionId:'REOPEN-P',positionName:'Captured position QA'}]};
 await f.db.executor.transaction([{text:"SELECT set_config('nevora.clocker_schedule_capture',$1,true)",values:[JSON.stringify(prepared)]},{text:"INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES('AUDIT-P','c34-a','loc-1',$1,'2026-09-22T10:00:00Z','2026-09-22T11:00:00Z','CLOCKED_OUT',1)",values:[f.devices[0].device.id]}]);
 await act('APPROVE');await act('FINALIZE');const frozen=await card();await f.q("UPDATE positions SET name='Renamed current position' WHERE id='REOPEN-P'");expect((await card()).sourceHash).toBe(frozen.sourceHash);expect((await act('REOPEN')).status).toBe('reopened');
 expect((await card()).card.entries.find(e=>e.id==='AUDIT-P')?.positionName).toBe('Captured position QA');
});
it('missing contexts exclude another employee corrections and prior decisions',async()=>{
 await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'c34-a',clock_timestamp()+interval '1 day'),(repeat('b',64),'c34-b',clock_timestamp()+interval '1 day')");
 const a=await approve((await missing('08:00','09:00')).requestId);
 const bProof={...employee,employee:{...employee.employee,id:'c34-b'},sessionTokenHash:'b'.repeat(64)};
 const b=await submitTimeCorrection(bProof,{operationId:randomUUID(),kind:'MISSING_ENTRY',locationId:'loc-1',proposedStartAt:'2020-01-05T10:00:00Z',proposedEndAt:'2020-01-05T11:00:00Z',reason:'Other employee private fixture'},f.db.executor);if(b.status!=='pending')throw Error('Expected own B correction');await approve(b.requestId);
 const self=await readEmployeeTimeCorrections(employee,f.db.executor),other=await readEmployeeTimeCorrections(bProof,f.db.executor);expect(self.state).toBe('ready');expect(other.state).toBe('ready');if(self.state!=='ready'||other.state!=='ready')return;
 expect(self.requests).toHaveLength(1);expect(self.requests[0]).toMatchObject({currentAdjustmentId:a.adjustmentId,context:{state:'confirmed',totalDecisions:0,decisions:[]}});expect(other.requests).toHaveLength(1);expect(other.requests[0].id).toBe(b.requestId);expect(JSON.stringify(self)).not.toContain('Other employee private fixture');
});
