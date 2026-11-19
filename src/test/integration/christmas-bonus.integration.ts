import {randomUUID} from 'node:crypto';
import {afterEach,beforeEach,expect,it,rs} from '@rstest/core';
import {createPunchFixture} from './clocker-punch-fixture';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
rs.mock('server-only',()=>({}));
import {readTimecards,mutateTimecard} from '../../lib/timecards/service';
import {readChristmasBonusReport} from '../../lib/reports/christmas-bonus.server';
import {bonusYear} from '../../lib/reports/christmas-bonus';

// Fictional people in a disposable database; the workspace zone is America/Puerto_Rico (UTC-4, no DST).
const proof=(id:string,role:'OWNER'|'MANAGER'|'EMPLOYEE'|'LEAD',hash:string):SessionMutationProof=>({sessionTokenHash:hash.repeat(64),employee:{id,role,firstName:'QA',lastName:'Fictional',primaryLocationId:'loc-1'}});
const owner=proof('c34-owner','OWNER','a');
const HOUR=BigInt(3_600_000_000_000);
let f:Awaited<ReturnType<typeof createPunchFixture>>;
async function entry(id:string,employeeId:string,clockIn:string,clockOut:string){
 await f.q(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,$2,'loc-1',$3,$4,$5,'CLOCKED_OUT',1)`,[id,employeeId,f.devices[0].device.id,clockIn,clockOut]);
}
async function finalize(employeeId:string,startDate:string,endDate:string){
 for(const action of ['APPROVE','FINALIZE'] as const){
  const read=await readTimecards(owner,{startDate,endDate},f.db.executor);if(read.state!=='ready')throw Error('timecards');
  const card=read.cards.find(c=>c.source.employeeId===employeeId)!;
  const result=await mutateTimecard(owner,{operationId:randomUUID(),employeeId,startDate,endDate,expectedRevision:card.revision,expectedSourceHash:card.sourceHash,action},f.db.executor);
  if(!['approved','finalized'].includes(result.status))throw Error(`timecard ${action}: ${JSON.stringify(result)}`);
 }
}
beforeEach(async()=>{f=await createPunchFixture({companyAccess:true});});
afterEach(async()=>{await f?.db.dispose();});

it('counts finalized time inside the Puerto Rico bonus year, lists unfinalized days, and leaves Owners out',async()=>{
 await f.q("UPDATE employees SET hire_date='2017-01-25',birth_date='1999-03-03' WHERE id='c34-a'");
 // c34-a: 8 h in a finalized week; a shift from Sep 30 19:00 to Oct 1 01:00 local (5 h before the year ends) in a
 // finalized period that runs into October; 4 h on Aug 10 that no finalized timecard covers.
 await entry('BONUS-1','c34-a','2026-09-22T12:00:00Z','2026-09-22T20:00:00Z');
 await entry('BONUS-2','c34-a','2026-09-30T23:00:00Z','2026-10-01T05:00:00Z');
 await entry('BONUS-3','c34-a','2026-08-10T12:00:00Z','2026-08-10T16:00:00Z');
 // c34-b: no hire date, 8 h recorded but never finalized. The Owner also has time and must not be listed.
 await entry('BONUS-4','c34-b','2026-09-23T12:00:00Z','2026-09-23T20:00:00Z');
 await entry('BONUS-5','c34-owner','2026-09-23T12:00:00Z','2026-09-23T20:00:00Z');
 await finalize('c34-a','2026-09-21','2026-09-27');
 await finalize('c34-a','2026-09-28','2026-10-04');
 const result=await readChristmasBonusReport(owner,bonusYear(2026),f.db.executor);
 expect(result.state).toBe('ready');if(result.state!=='ready')throw Error('report');
 const rows=Object.fromEntries(result.report.rows.map(row=>[row.employeeId,row]));
 expect(Object.keys(rows).sort()).toEqual(['c34-a','c34-b']);
 expect(BigInt(rows['c34-a'].recordedNanoseconds)).toBe(BigInt(13)*HOUR);
 expect(rows['c34-a']).toMatchObject({hireDate:'2017-01-25',thresholdHours:700,unfinalizedDays:1,status:'NOT_CONFIRMED'});
 expect(rows['c34-b']).toMatchObject({hireDate:null,thresholdHours:null,recordedNanoseconds:'0',unfinalizedDays:1,status:'NEEDS_HIRE_DATE'});
 expect(JSON.stringify(result.report)).not.toContain('1999-03-03');
 // The following bonus year gets the 1 h after midnight on Oct 1 from the same finalized period.
 const next=await readChristmasBonusReport(owner,bonusYear(2027),f.db.executor);
 if(next.state!=='ready')throw Error('next year');
 expect(BigInt(next.report.rows.find(row=>row.employeeId==='c34-a')!.recordedNanoseconds)).toBe(HOUR);
});

it('refuses Leads and Employees, and an Owner without a current session',async()=>{
 await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'c34-a',now()+interval '1 day')");
 for(const role of ['EMPLOYEE','LEAD'] as const)expect(await readChristmasBonusReport(proof('c34-a',role,'d'),bonusYear(2026),f.db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
 await f.q("DELETE FROM employee_sessions WHERE employee_id='c34-owner'");
 expect(await readChristmasBonusReport(owner,bonusYear(2026),f.db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
});
