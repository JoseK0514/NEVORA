import {describe,expect,it} from 'vitest';
import {projectClockMonitor,parseClockMonitor,formatMonitorDuration} from './clock-monitor';
const row=()=>({id:'entry',employee_id:'worker',employee_name:'Sam Cruz',location_id:'loc-1',location_name:'Main Office',device_id:'tablet',clock_in_at:'2030-10-06T23:00:00.123456Z',status:'CLOCKED_IN',break_start_at:null,open_break_count:0,history_valid:true,schedule_context:null});
const source=()=>({observedAt:'2030-10-07T03:30:00.123456Z',expiresAt:'2030-10-08T00:00:00Z',timeZone:'America/Puerto_Rico',rows:[row()]});
const captured=()=>({version:1,status:'MATCHED',timeZone:'America/Puerto_Rico',capturedAt:row().clock_in_at,candidateCount:1,reviewedRevisionIds:['revision'],reason:null,match:{revisionId:'revision',revisionNumber:1,publishedShiftId:'published',sourceShiftId:'shift',scheduleId:'schedule',positionId:'position',positionName:'Recorded position'}});
describe('persisted live clock projection',()=>{
 it('uses database time and real overnight punches, not a scheduled shift',()=>{
  expect(projectClockMonitor(source())).toMatchObject({state:'ready',observedAt:source().observedAt,validForMs:45000,employees:[{employeeName:'Sam Cruz',state:'ON_FLOOR',clockInAt:row().clock_in_at,elapsedMinutes:270,breakElapsedMinutes:null,positionName:null,scheduleMatch:null}]});
 });
 it('counts open breaks separately and measures elapsed break time',()=>{
  const s=source();Object.assign(s.rows[0],{status:'ON_BREAK',break_start_at:'2030-10-07T03:20:00.123456Z',open_break_count:1});
  expect(projectClockMonitor(s)).toMatchObject({employees:[{state:'ON_BREAK',elapsedMinutes:270,breakElapsedMinutes:10}]});
 });
 it('reports zero only from a valid empty snapshot',()=>{const s=source();s.rows=[];expect(projectClockMonitor(s)).toMatchObject({state:'ready',employees:[]});});
 it('displays the captured position and drops revision identifiers and private fields',()=>{
  const s=source();Object.assign(s.rows[0],{schedule_context:captured(),phone:'private',pin:'0123'});
  const v=projectClockMonitor(s);expect(v).toMatchObject({employees:[{positionName:'Recorded position',scheduleMatch:'MATCHED'}]});
  expect(JSON.stringify(v)).not.toMatch(/revision|publishedShiftId|private|0123/);
 });
 it.each(['UNMATCHED','AMBIGUOUS'])('never invents a position for %s',status=>{
  const s=source();Object.assign(s.rows[0],{schedule_context:{...captured(),status,match:null,reason:status==='UNMATCHED'?'NO_MATCH':'OVERLAPPING_SHIFTS',candidateCount:status==='UNMATCHED'?0:2}});
  expect(projectClockMonitor(s)).toMatchObject({employees:[{positionName:null,scheduleMatch:status}]});
 });
 it('supports a positionless matched shift without inferring an access role',()=>{
  const c=captured();Object.assign(c.match,{positionId:null,positionName:null});const s=source();Object.assign(s.rows[0],{schedule_context:c});
  expect(projectClockMonitor(s)).toMatchObject({employees:[{positionName:null,scheduleMatch:'MATCHED'}]});
 });
 it('limits display freshness to the remaining authorization lifetime',()=>{const s=source();s.expiresAt='2030-10-07T03:30:02.123456Z';expect(projectClockMonitor(s)).toMatchObject({validForMs:2000});});
 it.each([
  {status:'ON_BREAK'}, {open_break_count:2}, {history_valid:false}, {status:'CLOCKED_OUT'},
  {clock_in_at:'bad'}, {clock_in_at:'2030-10-07T04:00:00Z'},
  {status:'ON_BREAK',open_break_count:1,break_start_at:'2030-10-06T22:00:00Z'},
  {status:'ON_BREAK',open_break_count:1,break_start_at:'2030-10-07T04:00:00Z'},
  {schedule_context:{}}, {schedule_context:{...captured(),capturedAt:'2030-10-07T00:00:00Z'}},
 ])('rejects inconsistent persisted data %# rather than showing healthy or zero activity',patch=>{
  const s=source();Object.assign(s.rows[0],patch);expect(()=>projectClockMonitor(s)).toThrow();
 });
 it('rejects duplicate active entries for one employee',()=>{const s=source();s.rows.push({...row(),id:'another'});expect(()=>projectClockMonitor(s)).toThrow();});
 it('rejects expired observation authority',()=>{const s=source();s.expiresAt=s.observedAt;expect(()=>projectClockMonitor(s)).toThrow();});
 it('retains actual location and name without business-specific labels',()=>{const s=source();s.rows[0].location_name='Remote Operations';expect(projectClockMonitor(s)).toMatchObject({employees:[{locationName:'Remote Operations'}]});});
});
describe('live monitor public boundary',()=>{
 it('accepts only validated minimal monitor output',()=>{const valid=projectClockMonitor(source());expect(parseClockMonitor(valid)).toEqual(valid);});
 it.each([null,{}, {state:'ready',employees:[]},{state:'ready',employees:[{}]}, {state:'unavailable',reason:'raw SQL'}])('rejects malformed responses %#',v=>expect(()=>parseClockMonitor(v)).toThrow());
 it('preserves unavailable instead of converting it into zero rows',()=>expect(parseClockMonitor({state:'unavailable',reason:'read_failed'})).toEqual({state:'unavailable',reason:'read_failed'}));
 it('rejects impossible durations in otherwise plausible responses',()=>{const v=projectClockMonitor(source());if(v.state!=='ready')throw Error();v.employees[0].elapsedMinutes=-1;expect(()=>parseClockMonitor(v)).toThrow();});
 it('formats elapsed time without rounding up or claiming payroll hours',()=>{expect(formatMonitorDuration(7)).toBe('7m');expect(formatMonitorDuration(61)).toBe('1h 1m');expect(formatMonitorDuration(1500)).toBe('25h 0m');});
});
it('adds canonical Today lateness only for an unambiguous matching current punch',async()=>{
 const {withMonitorLateness}=await import('./clock-monitor');
 const monitor=projectClockMonitor(source());if(monitor.state!=='ready')throw Error('fixture');
 const shift={employeeId:'worker',locationId:'loc-1',status:'clocked_in',firstClockInAt:row().clock_in_at,late:true};
 const today={state:'ready',observedAt:source().observedAt,validForMs:45000,timeZone:'America/Puerto_Rico',shifts:[shift]} as never;
 expect(withMonitorLateness(monitor,today).employees[0].late).toBe(true);
 expect(withMonitorLateness(monitor,{...today as object,shifts:[{...shift,firstClockInAt:'2030-10-06T22:00:00Z'}]} as never).employees[0].late).toBeNull();
 expect(withMonitorLateness(monitor,{state:'unavailable',reason:'read_failed'}).employees[0].late).toBeNull();
 expect(parseClockMonitor(withMonitorLateness(monitor,today))).toMatchObject({employees:[{late:true}]});
});
