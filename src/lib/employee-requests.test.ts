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
