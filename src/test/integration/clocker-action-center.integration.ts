import {beforeEach,afterEach,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createPunchFixture} from './clocker-punch-fixture';
import {readActionCenter} from '../../lib/action-center/service';
import {parseActionCenter} from '../../lib/action-center/project';
import {submitTimeCorrection} from '../../lib/time-corrections/service';
import {readTimecards,mutateTimecard} from '../../lib/timecards/service';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
let f:Awaited<ReturnType<typeof createPunchFixture>>;
const proof:SessionMutationProof={employee:{id:'c34-owner',role:'OWNER',firstName:'Owner',lastName:'QA',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
const action={id:'SETUP:DEADLINE',type:'DEADLINE_MISSING' as const,priority:'MISSING_INPUT' as const,title:'Availability deadline not set',detail:'Fictional deadline input required',href:'/app/schedule?week=2026-09-21'};
beforeEach(async()=>{f=await createPunchFixture({companyAccess:true});});afterEach(async()=>{await f?.db.dispose();});
const read=()=>readActionCenter(proof,'2026-09-21',f.db.executor,async()=>[action,action]);
it('D7 retains previous-week work with exact period links and excludes it after canonical finalization',async()=>{
 await f.q(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES
  ('previous-card','c34-a','loc-1',$1,'2026-09-15T12:00:00Z','2026-09-15T20:00:00Z','CLOCKED_OUT',1),
  ('current-card','c34-a','loc-1',$1,'2026-09-22T12:00:00Z','2026-09-22T20:00:00Z','CLOCKED_OUT',1)`,[f.devices[0].device.id]);
 const result=await read();expect(result.state).toBe('ready');if(result.state!=='ready')throw Error('Expected ready action center');
 expect(result.items.filter(row=>row.type==='TIMECARD').map(row=>row.id).sort()).toEqual([
  'TIMECARD:c34-a:2026-09-14:2026-09-20','TIMECARD:c34-a:2026-09-21:2026-09-27',
 ]);
 expect(result.items.find(row=>row.id==='TIMECARD:c34-a:2026-09-14:2026-09-20')?.href).toBe('/app/timecards?start=2026-09-14&end=2026-09-20#timecard-c34-a');
 const period={startDate:'2026-09-14',endDate:'2026-09-20'};
 for(const action of ['APPROVE','FINALIZE'] as const){
  const cards=await readTimecards(proof,period,f.db.executor);if(cards.state!=='ready')throw Error('Expected ready canonical cards');
  const card=cards.cards.find(row=>row.card.employeeId==='c34-a');if(!card)throw Error('Expected prior card');
  expect((await mutateTimecard(proof,{operationId:randomUUID(),employeeId:'c34-a',...period,expectedRevision:card.revision,expectedSourceHash:card.sourceHash,action},f.db.executor)).status).toBe(action==='APPROVE'?'approved':'finalized');
 }
 const after=await read();expect(after.state).toBe('ready');if(after.state!=='ready')throw Error('Expected ready action center');
 expect(after.items.filter(row=>row.type==='TIMECARD').map(row=>row.id)).toEqual(['TIMECARD:c34-a:2026-09-21:2026-09-27']);
});
it('D7 refuses the whole aggregate when the previous-period SQL read fails',async()=>{
 const executor:typeof f.db.executor={...f.db.executor,transaction:async(statements,signal)=>{
  if(statements.some(statement=>statement.text.includes('nevora_timecard_source')&&statement.values?.includes('2026-09-14')))throw Error('private previous-period failure');
  return f.db.executor.transaction(statements,signal);
 }};
 expect(await readActionCenter(proof,'2026-09-21',executor,async()=>[action])).toEqual({state:'unavailable',reason:'read_failed'});
});
it('D7 deduplicates scheduling records and combines actual canonical correction/timecard sources without private reasons',async()=>{
 await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'c34-a',clock_timestamp()+interval '1 day')");
 const employee:SessionMutationProof={employee:{...proof.employee,id:'c34-a',role:'EMPLOYEE'},sessionTokenHash:'d'.repeat(64)};
 expect((await submitTimeCorrection(employee,{operationId:randomUUID(),kind:'MISSING_ENTRY',locationId:'loc-1',proposedStartAt:'2026-09-22T12:00:00Z',proposedEndAt:'2026-09-22T13:00:00Z',reason:'PRIVATE CORRECTION REASON'},f.db.executor)).status).toBe('pending');
 const result=await read();expect(result.state).toBe('ready');if(result.state!=='ready')return;expect(parseActionCenter(result,'2026-09-21')).toEqual(result);expect(result.items.filter(i=>i.id===action.id)).toHaveLength(1);expect(result.items.some(i=>i.type==='TIME_CORRECTION')).toBe(true);expect(JSON.stringify(result)).not.toContain('PRIVATE CORRECTION REASON');expect(result.counts.total).toBe(result.items.length);expect(result.items.find(i=>i.type==='TIME_CORRECTION')?.href).toContain('#correction-');
});
it('D7 refuses any incomplete source rather than inventing empty counts',async()=>{const result=await readActionCenter(proof,'2026-09-21',f.db.executor,async()=>{throw Error('Scheduling unavailable');});expect(result).toEqual({state:'unavailable',reason:'read_failed'});});
it('D7 rejects current role loss and stale manager proof',async()=>{await f.q("UPDATE employees SET role='LEAD' WHERE id='c34-owner'");expect(await read()).toEqual({state:'unavailable',reason:'access_denied'});});
it('D7 logout after every protected source read prevents any returned actions',async()=>{const executor={...f.db.executor,query:async<T>(statement:Parameters<typeof f.db.executor.query>[0])=>{if(statement.text.includes('AS remaining')&&statement.text.includes('AS "observedAt"'))await f.q("DELETE FROM employee_sessions WHERE employee_id='c34-owner'");return f.db.executor.query<T>(statement);}};expect(await readActionCenter(proof,'2026-09-21',executor,async()=>[action])).toEqual({state:'unavailable',reason:'access_denied'});});
it('D7 bounds every action snapshot to current session expiry',async()=>{await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '10 seconds' WHERE employee_id='c34-owner'");const result=await read();expect(result.state).toBe('ready');if(result.state==='ready'){expect(result.validForMs).toBeGreaterThan(0);expect(result.validForMs).toBeLessThanOrEqual(10000);}});
