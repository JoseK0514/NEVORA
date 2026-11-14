import {randomUUID} from 'node:crypto';
import {afterEach,beforeEach,expect,it} from 'vitest';
import {createPunchFixture} from './clocker-punch-fixture';
import {readTimecards,readTimecardsWithInternalCapture} from '../../lib/timecards/service';
import {readManagerTimeCorrections,readManagerTimeCorrectionsWithInternalCapture} from '../../lib/data/time-corrections.server';
import {submitTimeCorrection} from '../../lib/time-corrections/service';
import {readActionCenter} from '../../lib/action-center/service';
import {prepareTimecardActionRows} from '../../lib/action-center/canonical-source';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {SqlExecutor} from '../../lib/notifications/types';

let f:Awaited<ReturnType<typeof createPunchFixture>>;
const owner:SessionMutationProof={employee:{id:'c34-owner',role:'OWNER',firstName:'Owner',lastName:'Fictional',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
const employee:SessionMutationProof={employee:{...owner.employee,id:'c34-a',role:'EMPLOYEE'},sessionTokenHash:'d'.repeat(64)};
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
beforeEach(async()=>{f=await createPunchFixture({companyAccess:true});await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'c34-a',clock_timestamp()+interval '1 day')");});
afterEach(async()=>{await f?.db.dispose();});

async function roster(total:number){
 const [{count}]=await f.q<{count:number}>('SELECT count(*)::integer AS count FROM employees');
 await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,active)
  SELECT 'R09-'||lpad(n::text,4,'0'),'Retained','Fictional '||n,'r09-'||n,'EMPLOYEE','loc-1',n%2=0 FROM generate_series(1,$1::integer) n`,[total-count]);
}
function corruptPage(ex:SqlExecutor,source:string,mode:'missing'|'repeated'='missing'):{executor:SqlExecutor;injected:()=>boolean}{
 let injected=false;
 return {injected:()=>injected,executor:{...ex,transaction:async(statements,signal)=>{
  const result=await ex.transaction(statements,signal),index=statements.findIndex(s=>s.text.includes(source));
  if(index>=0&&result[index].length>1){injected=true;result[index]=mode==='missing'?result[index].slice(0,-1):[...result[index].slice(0,-1),result[index][0]];}
  return result;
 }}};
}
function incompleteCapture(ex:SqlExecutor,source:string,field:string):SqlExecutor{
 return {...ex,transaction:async(statements,signal)=>{
  const result=await ex.transaction(statements,signal),index=statements.findIndex(s=>s.text.includes(source));
  if(index>=0)result[index]=result[index].map((page,i)=>i===1&&page&&typeof page==='object'?{...page,[field]:[]}:page);
  return result;
 }};
}
function revokeAfterRead(ex:SqlExecutor,source:string):SqlExecutor{
 return {...ex,transaction:async(statements,signal)=>{
  const result=await ex.transaction(statements,signal);
  if(statements.some(s=>s.text.includes(source)))await f.q("DELETE FROM employee_sessions WHERE token_hash=repeat('a',64)");
  return result;
 }};
}
it('retains inactive-roster completeness at300,301and601 with exact capture and current-authority denial',async()=>{
 await roster(300);
 const at300=await readTimecards(owner,period,f.db.executor);expect(at300.state).toBe('ready');
 if(at300.state!=='ready')throw Error('Expected all300 retained cards');expect(at300.cards).toHaveLength(300);
 expect(at300.cards.some(c=>c.card.employeeId==='R09-0001')).toBe(true);
 await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,active) VALUES('R09-LAST','Last','Retained','r09-last','EMPLOYEE','loc-1',false)");
 const captured=await readTimecardsWithInternalCapture(owner,period,f.db.executor);expect(captured.view.state).toBe('ready');
 if(captured.view.state!=='ready'||!captured.capture)throw Error('Expected complete301-card capture');
 expect(captured.view.cards).toHaveLength(301);expect(captured.view).toMatchObject({paging:{pageSize:300,totalRows:301,pageCounts:[300,1]}});
 expect(captured.view.cards.some(c=>c.card.employeeId==='R09-LAST')).toBe(true);
 expect(()=>prepareTimecardActionRows(captured.capture!)).not.toThrow();
 await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,active)
  SELECT 'R09-LARGE-'||lpad(n::text,4,'0'),'Retained','Fictional large '||n,'r09-large-'||n,'EMPLOYEE','loc-1',n%2=0 FROM generate_series(1,300) n`);
 const started=performance.now(),threePages=await readTimecardsWithInternalCapture(owner,period,f.db.executor),elapsedMs=Math.round(performance.now()-started);
 expect(threePages.view.state).toBe('ready');if(threePages.view.state!=='ready'||!threePages.capture)throw Error('Expected complete601-card capture');
 expect(threePages.view.cards).toHaveLength(601);expect(threePages.view).toMatchObject({paging:{pageSize:300,totalRows:601,pageCounts:[300,300,1]}});
 expect(threePages.view.cards.some(c=>c.card.employeeId==='R09-LARGE-0001')).toBe(true);expect(()=>prepareTimecardActionRows(threePages.capture!)).not.toThrow();
 console.log('R09_MEASUREMENT',JSON.stringify({source:'timecards-with-private-capture',totalRows:601,pages:3,elapsedMs,publicDtoBytes:Buffer.byteLength(JSON.stringify(threePages.view))}));
 const self=await readTimecards(employee,period,f.db.executor);expect(self.state).toBe('ready');if(self.state==='ready')expect(self.cards.map(c=>c.card.employeeId)).toEqual(['c34-a']);
 expect(await readTimecardsWithInternalCapture(owner,period,incompleteCapture(f.db.executor,'nevora_timecard_source','internalCurrentSources'))).toMatchObject({view:{state:'unavailable'},capture:null});
 for(const mode of ['missing','repeated'] as const){const corrupted=corruptPage(f.db.executor,'nevora_timecard_source',mode);
  expect((await readTimecards(owner,period,corrupted.executor)).state).toBe('unavailable');expect(corrupted.injected()).toBe(true);
  expect((await readActionCenter(owner,'2026-09-21',corrupted.executor,async()=>[])).state).toBe('unavailable');}
 const actions=await readActionCenter(owner,'2026-09-21',f.db.executor,async()=>[]);expect(actions.state).toBe('ready');
 expect(await readTimecards(owner,period,revokeAfterRead(f.db.executor,'nevora_timecard_source'))).toEqual({state:'unavailable',reason:'access_denied'});
 await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('a',64),'c34-owner',clock_timestamp()+interval '1 day')");
 await f.q("UPDATE employees SET active=false WHERE id='c34-owner'");
 expect(await readTimecards(owner,period,f.db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
});
it('returns every pending correction at100,101and201 and keeps the complete ActionCenter available',async()=>{
 await f.q(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version)
  SELECT 'R09-ENTRY-'||n,'c34-a','loc-1',$1,'2026-09-22T08:00Z'::timestamptz+n*interval '6 minutes','2026-09-22T08:05Z'::timestamptz+n*interval '6 minutes','CLOCKED_OUT',1 FROM generate_series(0,200) n`,[f.devices[0].device.id]);
 const ids:string[]=[];
 for(let n=0;n<201;n++){
  const start=new Date(Date.parse('2026-09-22T08:01:00Z')+n*6*60000).toISOString(),end=new Date(Date.parse('2026-09-22T08:04:00Z')+n*6*60000).toISOString();
  const result=await submitTimeCorrection(employee,{operationId:randomUUID(),kind:'ENTRY_BOUNDARY',timeEntryId:'R09-ENTRY-'+n,proposedStartAt:start,proposedEndAt:end,reason:'Fictional capacity review'},f.db.executor);
  expect(result.status).toBe('pending');if(result.status!=='pending')throw Error('Expected fictional pending request');ids.push(result.requestId);
  if(n===99||n===100){const queue=await readManagerTimeCorrections(owner,f.db.executor);expect(queue.state).toBe('ready');if(queue.state!=='ready')throw Error('Expected complete pending queue');expect(queue.requests.map(r=>r.id).sort()).toEqual([...ids].sort());}
 }
 await f.q("UPDATE employees SET active=false WHERE id='c34-a'");
 const started=performance.now(),captured=await readManagerTimeCorrectionsWithInternalCapture(owner,f.db.executor),elapsedMs=Math.round(performance.now()-started);
 expect(captured.view.state).toBe('ready');if(captured.view.state!=='ready')throw Error('Expected all201 requests');
 expect(captured.view.requests.map(r=>r.id).sort()).toEqual([...ids].sort());expect(captured.capture).not.toBeNull();
 expect(captured.view).toMatchObject({paging:{pageSize:100,totalRows:201,pageCounts:[100,100,1]}});
 console.log('R09_MEASUREMENT',JSON.stringify({source:'corrections-with-private-capture',totalRows:201,pages:3,elapsedMs,publicDtoBytes:Buffer.byteLength(JSON.stringify(captured.view))}));
 expect(await readManagerTimeCorrectionsWithInternalCapture(owner,incompleteCapture(f.db.executor,'nevora_pending_time_corrections','internalCapture'))).toMatchObject({view:{state:'unavailable'},capture:null});
 for(const mode of ['missing','repeated'] as const){const corrupted=corruptPage(f.db.executor,'nevora_pending_time_corrections',mode);
  expect((await readManagerTimeCorrections(owner,corrupted.executor)).state).toBe('unavailable');expect(corrupted.injected()).toBe(true);
  expect((await readActionCenter(owner,'2026-09-21',corrupted.executor,async()=>[])).state).toBe('unavailable');}
 const actions=await readActionCenter(owner,'2026-09-21',f.db.executor,async()=>[]);expect(actions.state).toBe('ready');
 if(actions.state==='ready')expect(actions.items.filter(i=>i.type==='TIME_CORRECTION').map(i=>i.id).sort()).toEqual(ids.map(id=>'TIME_CORRECTION:'+id).sort());
 expect(await readManagerTimeCorrections(owner,revokeAfterRead(f.db.executor,'nevora_pending_time_corrections'))).toEqual({state:'unavailable',reason:'access_denied'});
 expect(await readManagerTimeCorrections(owner,f.db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
});
