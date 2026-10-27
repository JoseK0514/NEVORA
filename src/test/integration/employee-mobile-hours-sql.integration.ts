import {it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createDisposableExchangeDatabase} from './local-postgres';
import {seedOwnedApp} from './owned-app-fixture';
import {fixtureProof} from './shift-change-api';
import {seedEmployeeHours} from './employee-hours-fixture';
import {readEmployeeHours} from '../../lib/data/employee-hours.server';
import {submitEmployeeHoursCorrection} from '../../lib/data/employee-hours-write.server';
import {reviewTimeCorrection} from '../../lib/time-corrections/service';
import {parsePeriod} from '../../lib/timecards/project';
import {mutateTimecard} from '../../lib/timecards/service';
import type {EmployeeHoursSnapshot,HoursCorrectionPayload} from '../../lib/employee-hours';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
const corr=(r:EmployeeHoursSnapshot)=>{if(r.state!=='ready'||r.view!=='corrections'||r.data.snapshot.state!=='ready')throw Error('Expected own corrections');return {...r.data,snapshot:r.data.snapshot};};
async function setup(){const db=await createDisposableExchangeDatabase({mode:'current-runtime'});try{await seedOwnedApp(db.executor);const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>db.executor.query<T>({text,values});await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('HOURS-A','Fictional','Employee','555-0191','EMPLOYEE','loc-1'),('HOURS-B','Fictional','Peer','555-0192','LEAD','loc-2');INSERT INTO employee_location_eligibility VALUES('HOURS-A','loc-1'),('HOURS-B','loc-2')");const proof=await fixtureProof(db.executor,'HOURS-A'),peer=await fixtureProof(db.executor,'HOURS-B'),f=await seedEmployeeHours(db.executor,proof.employee.id,'SQL');return {db,q,proof,peer,f};}catch(error){await db.dispose();throw error;}}
function command(f:{entryId:string;startAt:string;endAt:string},basis:string):HoursCorrectionPayload{return {basis,command:{operationId:randomUUID(),kind:'ENTRY_BOUNDARY',timeEntryId:f.entryId,proposedStartAt:f.startAt,proposedEndAt:new Date(Date.parse(f.endAt)+15*60000).toISOString(),reason:'Device punch ended early'}};}
it('reads only current Employee/Lead records and refuses changed role/session before publishing',async()=>{const {db,q,proof,peer,f}=await setup();try{for(const p of [proof,peer]){const read=await readEmployeeHours(p,db.executor,'records','overview');expect(read.state).toBe('ready');if(read.state==='ready'&&read.view==='records'&&read.data.state==='ready')expect([...read.data.today.entries,...read.data.recent.entries].some(r=>r.id===f.entryId)).toBe(p===proof);}await q("UPDATE employees SET role='MANAGER' WHERE id='HOURS-A'");expect(await readEmployeeHours(proof,db.executor,'records','overview')).toEqual({state:'unavailable',reason:'access_denied'});await q("UPDATE employees SET role='EMPLOYEE' WHERE id='HOURS-A'");await q('DELETE FROM employee_sessions WHERE token_hash=$1',[proof.sessionTokenHash]);expect((await readEmployeeHours(proof,db.executor,'cards','2026-10-01_2026-10-31')).state).toBe('unavailable');}finally{await db.dispose();}});
it('persists original entry/break proposals once and exposes own exact current decision without editing raw punches',async()=>{const {db,q,proof,peer,f}=await setup();try{const own=corr(await readEmployeeHours(proof,db.executor,'corrections','list')),payload=command(f,own.basis);expect((await submitEmployeeHoursCorrection(proof,payload,db.executor)).status).toBe('recorded');expect((await submitEmployeeHoursCorrection(proof,payload,db.executor)).status).toBe('recorded');expect((await submitEmployeeHoursCorrection(proof,{...payload,command:{...payload.command,reason:'Different request'}},db.executor)).status).toBe('conflict');const id=payload.command.operationId;expect(corr(await readEmployeeHours(peer,db.executor,'corrections',id)).snapshot.state==='ready'&&corr(await readEmployeeHours(peer,db.executor,'corrections',id)).snapshot.requests.length).toBe(0);const owner=await fixtureProof(db.executor,'QAOWNER');expect((await reviewTimeCorrection(owner,{operationId:randomUUID(),requestId:id,expectedRevision:1,decision:'APPROVE',note:'Confirmed with employee'},db.executor)).status).toBe('approved');const detail=corr(await readEmployeeHours(proof,db.executor,'corrections',id));expect(detail.snapshot.state==='ready'&&detail.snapshot.requests[0].status).toBe('APPROVED');expect(detail.decisions[0].note).toBe('Confirmed with employee');expect((await q('SELECT clock_out_at::text FROM time_entries WHERE id=$1',[f.entryId]))[0].clock_out_at).toBeTruthy();const [raw]=await q<{at:string}>('SELECT clock_out_at::text AS at FROM time_entries WHERE id=$1',[f.entryId]);expect(Date.parse(raw.at)).toBe(Date.parse(f.endAt));const next=corr(await readEmployeeHours(proof,db.executor,'corrections','list'));const breakPayload={basis:next.basis,command:{operationId:randomUUID(),kind:'BREAK_BOUNDARY',timeEntryId:f.entryId,breakEntryId:f.breakId,proposedStartAt:f.breakStart,proposedEndAt:new Date(Date.parse(f.breakEnd)+5*60000).toISOString(),reason:'Break lasted longer'}};expect((await submitEmployeeHoursCorrection(proof,breakPayload,db.executor)).status).toBe('recorded');}finally{await db.dispose();}});
it('refuses a stale reviewed source while preserving original-event retry after the source changes',async()=>{const {db,q,proof,f}=await setup();try{const read=corr(await readEmployeeHours(proof,db.executor,'corrections','list')),payload=command(f,read.basis);await q('UPDATE time_entries SET version=version+1 WHERE id=$1',[f.entryId]);expect(await submitEmployeeHoursCorrection(proof,payload,db.executor)).toEqual({status:'blocked',reason:'stale_source'});const current=corr(await readEmployeeHours(proof,db.executor,'corrections','list')),original=command(f,current.basis);expect((await submitEmployeeHoursCorrection(proof,original,db.executor)).status).toBe('recorded');await q('UPDATE time_entries SET version=version+1 WHERE id=$1',[f.entryId]);expect((await submitEmployeeHoursCorrection(proof,original,db.executor)).status).toBe('recorded');}finally{await db.dispose();}});
it('submits own missing time and preserves current location eligibility',async()=>{const {db,q,proof,peer,f}=await setup();try{const source=corr(await readEmployeeHours(proof,db.executor,'corrections','list')),payload={basis:source.basis,command:{operationId:randomUUID(),kind:'MISSING_ENTRY',locationId:'loc-1',proposedStartAt:new Date(Date.parse(f.startAt)-2*86400000).toISOString(),proposedEndAt:new Date(Date.parse(f.startAt)-2*86400000+3600000).toISOString(),reason:'Forgot my punch'}};expect((await submitEmployeeHoursCorrection(proof,payload,db.executor)).status).toBe('recorded');const peerSource=corr(await readEmployeeHours(peer,db.executor,'corrections','list'));expect((await submitEmployeeHoursCorrection(peer,{...payload,basis:peerSource.basis,command:{...payload.command,operationId:randomUUID()}},db.executor)).status).not.toBe('recorded');await q("DELETE FROM employee_location_eligibility WHERE employee_id='HOURS-A'");expect(corr(await readEmployeeHours(proof,db.executor,'corrections','list')).snapshot.state==='ready').toBe(true);}finally{await db.dispose();}});
it('keeps own timecards separate from manager approval and reads the canonical effective source',async()=>{const {db,proof,f}=await setup();try{const startDate=new Date(Date.parse(f.startAt)).toISOString().slice(0,10),endDate=new Date(Date.parse(f.endAt)).toISOString().slice(0,10),period=parsePeriod(startDate,endDate),read=await readEmployeeHours(proof,db.executor,'cards',startDate+'_'+endDate);expect(read.state).toBe('ready');if(read.state==='ready'&&read.view==='cards'&&read.data.state==='ready'){expect(read.data.cards).toHaveLength(1);const item=read.data.cards[0];expect(item.card.employeeId).toBe(proof.employee.id);expect(item.card.entries[0].id).toBe(f.entryId);expect(await mutateTimecard(proof,{operationId:randomUUID(),employeeId:proof.employee.id,...period,expectedRevision:item.revision,expectedSourceHash:item.sourceHash,action:'APPROVE'},db.executor)).toEqual({status:'unavailable'});}}finally{await db.dispose();}});
it('detects a role change during write admission instead of returning a usable correction control',async()=>{const {db,q,proof,f}=await setup();try{const payload=command(f,corr(await readEmployeeHours(proof,db.executor,'corrections','list')).basis);let changed=false;const racing:SqlExecutor={query:db.executor.query,async transaction(statements:readonly SqlStatement[],signal?:AbortSignal){if(!changed&&statements.some(s=>s.text.includes('nevora_submit_time_correction('))){changed=true;await q("UPDATE employees SET role='MANAGER' WHERE id='HOURS-A'");}return db.executor.transaction(statements,signal);}};expect(await submitEmployeeHoursCorrection(proof,payload,racing)).toEqual({status:'denied'});}finally{await db.dispose();}});
it('serializes two reviewed proposals under the employee lock without creating duplicate pending requests',async()=>{
 const {db,q,proof,f}=await setup();try{
  const basis=corr(await readEmployeeHours(proof,db.executor,'corrections','list')).basis;
  const results=await Promise.all([submitEmployeeHoursCorrection(proof,command(f,basis),db.executor),submitEmployeeHoursCorrection(proof,command(f,basis),db.executor)]);
  expect(results.filter(r=>r.status==='recorded')).toHaveLength(1);expect(results.some(r=>r.status==='blocked'&&r.reason==='stale_source'||r.status==='conflict')).toBe(true);
  expect((await q<{n:number}>('SELECT count(*)::integer AS n FROM time_correction_requests WHERE employee_id=$1',[proof.employee.id]))[0].n).toBe(1);
 }finally{await db.dispose();}
});
it('keeps finalized periods read only through the mobile correction adapter',async()=>{
 const {db,proof,f}=await setup();try{
  const date=f.startAt.slice(0,10),period=parsePeriod(date,date),owner=await fixtureProof(db.executor,'QAOWNER');
  for(const action of ['APPROVE','FINALIZE'] as const){
   const read=await readEmployeeHours(proof,db.executor,'cards',date+'_'+date);if(read.state!=='ready'||read.view!=='cards'||read.data.state!=='ready')throw Error('Own card unavailable');const card=read.data.cards[0];
   expect((await mutateTimecard(owner,{operationId:randomUUID(),employeeId:proof.employee.id,...period,expectedRevision:card.revision,expectedSourceHash:card.sourceHash,action},db.executor)).status).toBe(action==='APPROVE'?'approved':'finalized');
  }
  const basis=corr(await readEmployeeHours(proof,db.executor,'corrections','list')).basis;
  expect(await submitEmployeeHoursCorrection(proof,command(f,basis),db.executor)).toEqual({status:'blocked',reason:'finalized_period'});
 }finally{await db.dispose();}
});
it('reads an exact own old target beyond the recent window without exposing it to a peer',async()=>{
 const {db,q,proof,peer,f}=await setup();try{
  await q("UPDATE time_entries SET clock_in_at=clock_in_at-interval '100 days',clock_out_at=clock_out_at-interval '100 days' WHERE id=$1",[f.entryId]);
  await q("UPDATE break_entries SET break_start_at=break_start_at-interval '100 days',break_end_at=break_end_at-interval '100 days' WHERE id=$1",[f.breakId]);
  for(let n=0;n<21;n++)await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status) VALUES($1,$2,'loc-1',$3,clock_timestamp()-($4::integer||' days')::interval-interval '2 hours',clock_timestamp()-($4::integer||' days')::interval,'CLOCKED_OUT')",['recent-'+n,proof.employee.id,f.deviceId,n+1]);
  expect(corr(await readEmployeeHours(proof,db.executor,'corrections','list')).snapshot.targets.some(t=>t.timeEntryId===f.entryId)).toBe(false);
  expect(corr(await readEmployeeHours(proof,db.executor,'corrections','target:'+f.entryId)).snapshot.targets.some(t=>t.timeEntryId===f.entryId)).toBe(true);
  expect(corr(await readEmployeeHours(peer,db.executor,'corrections','target:'+f.entryId)).snapshot.targets.some(t=>t.timeEntryId===f.entryId)).toBe(false);
 }finally{await db.dispose();}
});
it('opens a retained exact own request outside the latest50 without leaking it to a peer',async()=>{
 const {db,proof,peer,f}=await setup();try{
  const {submitTimeCorrection}=await import('../../lib/time-corrections/service');let first='';
  for(let n=0;n<51;n++){
   const operationId=randomUUID(),start=Date.parse(f.startAt)-(10+n)*86400000;
   const result=await submitTimeCorrection(proof,{operationId,kind:'MISSING_ENTRY',locationId:'loc-1',proposedStartAt:new Date(start).toISOString(),proposedEndAt:new Date(start+3600000).toISOString(),reason:'Fictional retained request'},db.executor);
   expect(result.status).toBe('pending');if(n===0)first=operationId;
  }
  const recent=corr(await readEmployeeHours(proof,db.executor,'corrections','list')).snapshot;
  expect(recent.totalRequests).toBe(51);expect(recent.requests).toHaveLength(50);expect(recent.requests.some(r=>r.id===first)).toBe(false);
  const exact=corr(await readEmployeeHours(proof,db.executor,'corrections',first)).snapshot;
  expect(exact.requests).toHaveLength(1);expect(exact.requests[0].id).toBe(first);
  expect(corr(await readEmployeeHours(peer,db.executor,'corrections',first)).snapshot.requests).toHaveLength(0);
 }finally{await db.dispose();}
});
it('retries one correction source read when a manager decision crosses its basis check',async()=>{
 const {db,proof,f}=await setup();try{
  const payload=command(f,corr(await readEmployeeHours(proof,db.executor,'corrections','list')).basis);
  expect((await submitEmployeeHoursCorrection(proof,payload,db.executor)).status).toBe('recorded');
  const owner=await fixtureProof(db.executor,'QAOWNER');let decided=false,basisReads=0;
  const racing:SqlExecutor={query:db.executor.query,async transaction(statements,signal){
   const rows=await db.executor.transaction(statements,signal);
   if(statements.some(s=>s.text.endsWith(' AS basis'))){basisReads++;if(!decided){decided=true;expect((await reviewTimeCorrection(owner,{operationId:randomUUID(),requestId:payload.command.operationId,expectedRevision:1,decision:'APPROVE',note:'Decision during read'},db.executor)).status).toBe('approved');}}
   return rows;
  }};
  const current=await readEmployeeHours(proof,racing,'corrections','list');expect(current.state).toBe('ready');const read=corr(current);
  expect(decided).toBe(true);expect(basisReads).toBe(4);expect(read.snapshot.requests[0].status).toBe('APPROVED');expect(read.decisions[0].note).toBe('Decision during read');
 }finally{await db.dispose();}
});
it('bounds changing-source retries and still refuses current authority loss',async()=>{
 const {db,q,proof,f}=await setup();try{
  let basisReads=0;
  const changing:SqlExecutor={query:db.executor.query,async transaction(statements,signal){
   const rows=await db.executor.transaction(statements,signal);
   if(statements.some(s=>s.text.endsWith(' AS basis'))){basisReads++;if(basisReads%2===1)await q('UPDATE time_entries SET version=version+1 WHERE id=$1',[f.entryId]);}
   return rows;
  }};
  expect(await readEmployeeHours(proof,changing,'corrections','list')).toEqual({state:'unavailable',reason:'read_failed'});expect(basisReads).toBe(4);
  let revoked=false;
  const revoking:SqlExecutor={query:db.executor.query,async transaction(statements,signal){
   const rows=await db.executor.transaction(statements,signal);
   if(!revoked&&statements.some(s=>s.text.endsWith(' AS basis'))){revoked=true;await q('DELETE FROM employee_sessions WHERE token_hash=$1',[proof.sessionTokenHash]);}
   return rows;
  }};
  expect(await readEmployeeHours(proof,revoking,'corrections','list')).toEqual({state:'unavailable',reason:'access_denied'});
 }finally{await db.dispose();}
});
