import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {createPunchFixture} from './clocker-punch-fixture';
import {readReports} from '../../lib/reports/service';
import {mutateTimecard} from '../../lib/timecards/service';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {randomUUID} from 'node:crypto';
let f:Awaited<ReturnType<typeof createPunchFixture>>;
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
const owner:SessionMutationProof={employee:{id:'c34-owner',role:'OWNER',firstName:'Owner',lastName:'QA',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
beforeEach(async()=>{
 f=await createPunchFixture();
 await f.q(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version)
 VALUES('D4-T','c34-a','loc-1',$1,'2026-09-22T12:00:00Z','2026-09-22T20:00:00Z','CLOCKED_OUT',1)`,[f.devices[0].device.id]);
 await f.q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,reason,status) VALUES('D4-TO','c34-a','2026-09-23','2026-09-23','PRIVATE ABSENCE REASON','PENDING')");
});
afterEach(async()=>{await f?.db.dispose();});
async function report(){const result=await readReports(owner,period,f.db.executor);if(result.state!=='ready')throw new Error(JSON.stringify(result));return result;}
describe('D4 current-authorized report source',()=>{
 it('reports canonical time, historical observations and private-minimized requests',async()=>{
  const result=await report();expect(result.report.summary.recordedNanoseconds).toBe('28800000000000');expect(result.report.timeOff[0]).toMatchObject({id:'D4-TO',status:'PENDING',employeeId:'c34-a'});
  expect(JSON.stringify(result.source)).not.toContain('PRIVATE ABSENCE REASON');expect(result.report.attendance.limitations).toEqual([{entryId:'D4-T',breakId:null,reason:'schedule_not_captured'}]);expect(result.report.attendance.unavailableEmployeeIds).toEqual([]);expect(result.validForMs).toBeGreaterThan(0);
 });
 it('preserves finalized snapshots in reporting after an employee label changes',async()=>{
  const current=(await report()).report.cards.find(c=>c.source.employeeId==='c34-a')!;
  const command={employeeId:'c34-a',...period,expectedRevision:0,expectedSourceHash:current.sourceHash,action:'APPROVE' as const,operationId:randomUUID()};
  expect((await mutateTimecard(owner,command,f.db.executor)).status).toBe('approved');
  expect((await mutateTimecard(owner,{...command,operationId:randomUUID(),action:'FINALIZE',expectedRevision:1},f.db.executor)).status).toBe('finalized');
  await f.q("UPDATE employees SET first_name='Changed label' WHERE id='c34-a'");
  const final=(await report()).report.approvals.find(c=>c.employeeId==='c34-a')!;expect(final.state).toBe('FINALIZED');expect(final.employeeName).toBe('Avery QA');
 });
 it('requires current management authority and refuses a stale role proof',async()=>{
  await f.q("UPDATE employees SET role='LEAD' WHERE id='c34-owner'");expect(await readReports(owner,period,f.db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
 });
 it('refuses expired or revoked sessions',async()=>{
  await f.q("DELETE FROM employee_sessions WHERE employee_id='c34-owner'");expect(await readReports(owner,period,f.db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
 });
 it('does not expose a report to employee or Lead roles',async()=>{
  expect((await readReports({...owner,employee:{...owner.employee,role:'EMPLOYEE'}},period,f.db.executor)).state).toBe('unavailable');
  expect((await readReports({...owner,employee:{...owner.employee,role:'LEAD'}},period,f.db.executor)).state).toBe('unavailable');
 });
 it('rechecks authority after source projection and returns no source on late logout',async()=>{
  const executor={...f.db.executor,query:async<T>(statement:Parameters<typeof f.db.executor.query>[0])=>{if(statement.text.includes('clock_timestamp()::text AS at'))await f.q("DELETE FROM employee_sessions WHERE employee_id='c34-owner'");return f.db.executor.query<T>(statement);}};
  expect(await readReports(owner,period,executor)).toEqual({state:'unavailable',reason:'access_denied'});
 });
});
