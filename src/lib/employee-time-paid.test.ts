import {expect,it} from 'vitest';
import {projectEmployeeTime,parseEmployeeTime} from './employee-time';
// Fictional My time snapshot; mirrors employee-time.test.ts fixtures.
const entry=(extra:Record<string,unknown>={})=>({id:'e1',employee_id:'worker',location_name:'Main Office',clock_in_at:'2030-10-07T12:00:00Z',clock_out_at:null,status:'CLOCKED_IN',history_valid:true,breaks:[],...extra});
const source=(entries:unknown[]=[])=>({observedAt:'2030-10-07T16:00:00Z',expiresAt:'2030-10-08T16:00:00Z',timeZone:'America/Puerto_Rico',recentCount:0,entries});
const meal={id:'meal',break_start_at:'2030-10-07T13:00:00Z',break_end_at:'2030-10-07T14:00:00Z',break_type_id:null,break_type_snapshot:null};

it('paid time subtracts only server-classified unpaid breaks and survives the network check',()=>{
 const unknown=projectEmployeeTime(source([entry({breaks:[meal]})]),'worker');
 expect(unknown.today).toMatchObject({recordedSeconds:14400,breakSeconds:3600,paidSeconds:null,unpaidBreakSeconds:null});
 const paid=projectEmployeeTime(source([entry({breaks:[meal]})]),'worker',{meal:{pay:'UNPAID',kind:'MEAL',mealMinimumMinutes:60}});
 expect(paid.today).toMatchObject({paidSeconds:10800,unpaidBreakSeconds:3600});
 expect(paid.current?.breaks[0].pay).toBe('UNPAID');
 expect(parseEmployeeTime(paid)).toEqual(paid);
 expect(()=>parseEmployeeTime({...paid,today:{...paid.today,paidSeconds:14400}})).toThrow();
});
it('without breaks paid time equals elapsed time, and corrected entries are marked',()=>{
 const r=projectEmployeeTime(source([entry({corrected:true})]),'worker');
 expect(r.today.paidSeconds).toBe(14400);expect(r.current?.corrected).toBe(true);expect(parseEmployeeTime(r)).toEqual(r);
});
it('an overnight entry that started yesterday is not paid time today (it counts on its start day)',()=>{
 expect(projectEmployeeTime(source([entry({clock_in_at:'2030-10-07T02:00:00Z'})]),'worker').today).toMatchObject({recordedSeconds:43200,paidSeconds:0});
});
it('rejects break pay for breaks that are not in the snapshot',()=>{
 expect(()=>projectEmployeeTime(source([entry()]),'worker',{ghost:{pay:'PAID'}})).toThrow();
 expect(()=>projectEmployeeTime(source([entry({breaks:[meal]})]),'worker',{meal:'UNPAID'})).toThrow();
});
