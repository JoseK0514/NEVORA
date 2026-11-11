import {expect,it} from 'vitest';
import {parseEmployeeRequests} from './employee-requests';
const ready=()=>({state:'ready',kind:'requests',authority:'a'.repeat(64),observedAt:'2026-10-27T12:00:00Z',validForMs:45000,timeZone:'America/Puerto_Rico',modules:{timeOff:true,marketplace:true},open:[],recent:[],incoming:0});
it('accepts a finite own Requests projection and rejects unknown private fields and malformed terms',()=>{
 expect(parseEmployeeRequests(ready()).state).toBe('ready');
 for(const value of [{...ready(),reason:'private'}, {...ready(),validForMs:45001},{...ready(),open:[{id:'x',revision:1,date:'2026-11-03',startTime:'09:00',endTime:'17:00',location:'Main',position:null,check:'eligible',notice:null,outcome:null}]},{...ready(),open:[{employeeId:'foreign'}]}])
  expect(parseEmployeeRequests(value)).toEqual({state:'unavailable',reason:'read_failed'});
});
it('cannot release module-owned rows when the module is off, or confuse an unknown read with no shifts',()=>{
 expect(parseEmployeeRequests({...ready(),open:null}).state).toBe('ready');
 expect(parseEmployeeRequests({...ready(),modules:{marketplace:false,timeOff:true},incoming:1})).toEqual({state:'unavailable',reason:'read_failed'});
});
it('carries a time-off request’s last day and part-day hours, and nothing of the kind on shift rows (Codex A1)',()=>{
 const row=(over:Record<string,unknown>)=>({id:'r1',kind:'timeOff',status:'PENDING',date:'2026-11-11',endDate:'2026-11-12',startTime:null,endTime:null,createdAt:'2026-10-27T12:00:00Z',...over});
 for(const ok of [row({}),row({endDate:'2026-11-11',startTime:'09:00',endTime:'13:00'}),row({kind:'shift',endDate:null}),row({kind:'callout',endDate:null})])
  expect(parseEmployeeRequests({...ready(),recent:[ok]}).state).toBe('ready');
 for(const bad of [row({endDate:'2026-11-10'}),row({endDate:null}),row({startTime:'09:00'}),row({startTime:'9am',endTime:'13:00'}),row({kind:'shift'}),row({kind:'callout',endDate:null,startTime:'09:00',endTime:'13:00'}),{...row({}),endDate:undefined}])
  expect(parseEmployeeRequests({...ready(),recent:[bad]})).toEqual({state:'unavailable',reason:'read_failed'});
});
it('accepts independent shared exchange counts without fabricating failed sources',()=>{
 expect(parseEmployeeRequests({...ready(),exchangeCounts:{open:null,forYou:2}})).toMatchObject({exchangeCounts:{open:null,forYou:2}});
 expect(parseEmployeeRequests({...ready(),exchangeCounts:{open:0,forYou:-1}})).toEqual({state:'unavailable',reason:'read_failed'});
});

it('accepts an unknown device state separately from workplace alert capability',()=>{
 expect(parseEmployeeRequests({...ready(),deviceAlerts:null,deviceAlertsAvailable:true})).toMatchObject({state:'ready',deviceAlerts:null,deviceAlertsAvailable:true});
 expect(parseEmployeeRequests({...ready(),deviceAlerts:'on',deviceAlertsAvailable:true})).toEqual({state:'unavailable',reason:'read_failed'});
});
it('does not admit nonzero shared counts when marketplace is disabled',()=>{
 expect(parseEmployeeRequests({...ready(),modules:{timeOff:true,marketplace:false},exchangeCounts:{open:0,forYou:2}})).toEqual({state:'unavailable',reason:'read_failed'});
});
