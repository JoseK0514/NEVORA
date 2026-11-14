import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createPunchFixture} from './clocker-punch-fixture';
import {readTimecards,mutateTimecard} from '../../lib/timecards/service';
import {readPeriodClose,savePeriodPopulation} from '../../lib/period-close/service';
import {saveSettings,command,runs} from '../../lib/payroll/service';
import {workerOnce} from '../../lib/payroll/worker';
import {statements,document} from '../../lib/payroll/access';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';

const owner:SessionMutationProof={employee:{id:'c34-owner',role:'OWNER',firstName:'Owner',lastName:'Fictional',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
let f:Awaited<ReturnType<typeof createPunchFixture>>,legacy:SqlExecutor,current:SqlExecutor;
function formatted(ex:SqlExecutor,zone:string,style:string):SqlExecutor{
 const transaction=async(statements:readonly SqlStatement[],signal?:AbortSignal)=>
  (await ex.transaction([{text:"SELECT set_config('TimeZone',$1,true)",values:[zone]},{text:"SELECT set_config('DateStyle',$1,true)",values:[style]},...statements],signal)).slice(2);
 return {query:async<T>(statement:SqlStatement,signal?:AbortSignal)=>(await transaction([statement],signal))[0] as T[],transaction};
}
beforeEach(async()=>{
 vi.stubEnv('NEVORA_PAYROLL_ENABLED','true');f=await createPunchFixture();
 await f.q(await readFile('db/migrations/0032_company_access_invitations.sql','utf8'));
 await f.q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES('R14-old-time','c34-a','loc-1',$1,'2026-09-22T12:00Z','2026-09-22T20:00Z','CLOCKED_OUT',1)",[f.devices[0].device.id]);
 legacy=formatted(f.db.executor,'America/Puerto_Rico','ISO, MDY');current=formatted(f.db.executor,'UTC','ISO, YMD');
});
afterEach(async()=>{await f?.db.dispose();vi.unstubAllEnvs();});
async function card(ex:SqlExecutor){const view=await readTimecards(owner,period,ex);if(view.state!=='ready')throw Error('Expected current timecard');const item=view.cards.find(c=>c.source.employeeId==='c34-a');if(!item)throw Error('Expected employee card');return item;}
async function act(action:'APPROVE'|'FINALIZE'|'REOPEN',ex:SqlExecutor){const c=await card(ex);return mutateTimecard(owner,{operationId:randomUUID(),employeeId:'c34-a',...period,expectedRevision:c.revision,expectedSourceHash:c.sourceHash,action,...(action==='REOPEN'?{note:'Explicit review after timestamp session rollout'}:{})},ex);}
const history=()=>f.q("SELECT to_jsonb(r) AS row FROM timecard_revisions r WHERE employee_id='c34-a' ORDER BY revision");

it('refuses an old-format pending approval until a new explicit review without changing recorded instants or old history',async()=>{
 expect((await card(legacy)).source.entries[0].rawStartAt).toContain('-04');
 expect(await act('APPROVE',legacy)).toMatchObject({status:'approved'});const old=await card(legacy),stored=await history();
 const next=await card(current);expect(next.state).toBe('NEEDS_REVIEW');expect(next.sourceHash).not.toBe(old.sourceHash);
 expect(next.card.entries).toEqual(old.card.entries);expect(next.card.recordedNanoseconds).toBe(old.card.recordedNanoseconds);
 expect(await mutateTimecard(owner,{operationId:randomUUID(),employeeId:'c34-a',...period,expectedRevision:old.revision,expectedSourceHash:old.sourceHash,action:'FINALIZE'},current)).toEqual({status:'conflict'});
 expect(await history()).toEqual(stored);expect(await act('APPROVE',current)).toMatchObject({status:'approved',revision:2});
 expect((await history()).slice(0,1)).toEqual(stored);
});
it('preserves a legacy finalized source and its frozen review authority for an explicit current-format reopen',async()=>{
 expect(await act('APPROVE',legacy)).toMatchObject({status:'approved'});expect(await act('FINALIZE',legacy)).toMatchObject({status:'finalized'});
 const frozen=await card(legacy),stored=await history(),next=await card(current);
 expect(next.state).toBe('FINALIZED');expect(next.source).toEqual(frozen.source);expect(next.sourceHash).toBe(frozen.sourceHash);
 expect(next.card.entries).toEqual(frozen.card.entries);expect(await history()).toEqual(stored);
 expect(await act('REOPEN',current)).toMatchObject({status:'reopened',revision:3});
 expect((await history()).slice(0,2)).toEqual(stored);
});
it('renders and publishes an already-approved legacy payroll from its unchanged frozen amounts and source',async()=>{
 expect(await act('APPROVE',legacy)).toMatchObject({status:'approved'});expect(await act('FINALIZE',legacy)).toMatchObject({status:'finalized'});
 await saveSettings(owner,{action:'SAVE_SETTINGS',operationId:randomUUID(),expectedRevision:0,effectiveFrom:'2026-01-01',reason:'Fictional compatibility qualification',preferences:{companyName:'Fictional Company',language:'en',currency:'USD',schedule:{frequency:'WEEKLY',anchorDate:'2026-09-21',paydayOffsetDays:2},rules:[],automation:{prepare:false,publish:false,reminders:false,reminderLeadDays:[]},bankProfile:'NEUTRAL_UNVERIFIED'}},legacy);
 const reviewed=await readPeriodClose(owner,period,legacy);
 await savePeriodPopulation(owner,{operationId:randomUUID(),expectedRevision:0,sourceHash:reviewed.sourceHash,...period,members:reviewed.members.map(m=>({employeeId:m.employeeId,disposition:m.employeeId==='c34-a'?'INCLUDE':'ZERO_TIME',reason:'Fictional legacy reviewed period',employmentFacts:'Fictional roster',employmentBasis:'MANAGER_ATTESTED'}))},legacy);
 const prepared=await command(owner,{action:'PREPARE',operationId:randomUUID(),period,payday:'2026-09-29'},legacy);
 await command(owner,{action:'IMPORT',operationId:randomUUID(),runId:prepared.runId,expectedRevision:1,amounts:{schema:'NEVORA_PAYROLL_IMPORT_V1',currency:'USD',sourceName:'Fictional authoritative provider',sourceReference:'R14-legacy-approved',period,payday:'2026-09-29',rows:reviewed.members.map(m=>({employeeId:m.employeeId,grossMinor:m.employeeId==='c34-a'?'10000':'0',netMinor:m.employeeId==='c34-a'?'9000':'0',employeeDeductions:m.employeeId==='c34-a'?[{code:'FICTIONAL',label:'Fictional deduction',amountMinor:'1000'}]:[],employerContributions:[]}))}},legacy);
 const ready=(await runs(owner,legacy)).runs.find(r=>r.id===prepared.runId)!;
 await command(owner,{action:'APPROVE',operationId:randomUUID(),runId:ready.id,expectedRevision:ready.revision,reviewToken:ready.reviewToken},legacy);
 const [before]=await f.q('SELECT payload,snapshot FROM payroll_runs_current WHERE run_id=$1::uuid',[ready.id]);
 expect(JSON.stringify(before.snapshot)).toContain('-04');
 expect(await workerOnce(current)).toMatchObject({processed:true});
 const approved=(await runs(owner,current)).runs.find(r=>r.id===ready.id)!;
 await command(owner,{action:'PUBLISH',operationId:randomUUID(),runId:ready.id,expectedRevision:approved.revision},current);
 expect(await workerOnce(current)).toMatchObject({processed:true});
 expect((await f.q('SELECT payload,snapshot FROM payroll_runs_current WHERE run_id=$1::uuid',[ready.id]))[0]).toEqual(before);
 await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('b',64),'c34-a',clock_timestamp()+interval '1 day')");
 const employee:SessionMutationProof={employee:{...owner.employee,id:'c34-a',role:'EMPLOYEE'},sessionTokenHash:'b'.repeat(64)},published=await statements(employee,current);
 expect(published.statements).toHaveLength(1);expect((await document(employee,published.statements[0].id,current)).bytes.subarray(0,5).toString()).toBe('%PDF-');
});
