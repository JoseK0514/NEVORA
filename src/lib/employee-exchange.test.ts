import {expect,it} from 'vitest';
import {exchangeSummary,exchangeSlot,employeeHistory,parseEmployeeExchange} from './employee-exchange';
import type {ExchangeRecord} from './data/exchanges';
const row={id:'request-1',kind:'SWAP',status:'EMPLOYEE_PENDING',requestRevision:1,requestedByEmployeeId:'peer',requestedByName:'Blair Casey',targetEmployeeId:'self',targetEmployeeName:'Alex Rivera',createdAt:'2026-10-27T12:00:00Z',sourceShift:{id:'shift-1',employeeId:'peer',employeeName:'Blair Casey',scheduleId:'schedule-1',weekStart:'2026-11-02',date:'2026-11-03',startTime:'22:00',endTime:'06:00',locationId:'private-location',locationName:'Location private-location',positionId:'private-position'}} as ExchangeRecord;
it('projects only a participant and never serializes raw identities or internal location placeholders',()=>{
 expect(exchangeSummary(row,'foreign')).toBeNull();
 expect(exchangeSummary(row,'self')).toMatchObject({viewer:'recipient',counterparty:'Blair C.'});
 const json=JSON.stringify([exchangeSummary(row,'self'),exchangeSlot(row.sourceShift)]);
 expect(json).not.toMatch(/private-location|private-position|employeeId|sourceShift|requestedByEmployeeId/);
 expect(exchangeSlot(row.sourceShift)?.location).toBe('Original location');
});
it('immutable history omits participant/absence/policy values and keeps unknown facts unknown',()=>{
 const history=employeeHistory([{request_revision:2,event_kind:'ACCEPT',created_at:'2026-10-27T12:00:00Z',source_terms:{date:'2026-11-03',startTime:'22:00',endTime:'06:00',locationId:'SECRET'},target_terms:{},participants:{employeeId:'peer'},callout_reason_note:'PRIVATE',outcome_mode:'MANAGER_REVIEW'}]);
 expect(history[0]).toMatchObject({revision:2,requested:null,offered:{date:'2026-11-03',startTime:'22:00',endTime:'06:00'}});
 expect(JSON.stringify(history)).not.toMatch(/SECRET|PRIVATE|employeeId|MANAGER_REVIEW/);
});
it('rejects raw or malformed private transport instead of displaying unchecked detail/actions',()=>{
 expect(parseEmployeeExchange({state:'ready',employeeId:'peer'})).toEqual({state:'unavailable',reason:'read_failed'});
 expect(parseEmployeeExchange({state:'unavailable',reason:'access_denied'})).toEqual({state:'unavailable',reason:'access_denied'});
});
it('an enabled Accept requires a known planner outcome and never accepts a management control',()=>{
 const value={state:'ready',kind:'exchange',authority:'a'.repeat(64),observedAt:'2026-10-27T12:00:00Z',validForMs:45000,timeZone:'America/Puerto_Rico',enabled:true,selection:row.id,incoming:null,activity:null,detail:{summary:exchangeSummary(row,'self'),offered:exchangeSlot(row.sourceShift),requested:null,history:[],checks:[{kind:'ACCEPT',allowed:true,notice:null,outcome:'completed'}],notice:null,reason:null}};
 expect(parseEmployeeExchange(value).state).toBe('ready');
 for(const check of [{kind:'ACCEPT',allowed:true,notice:null,outcome:null},{kind:'MANAGER_APPROVE',allowed:true,notice:null,outcome:'completed'}]){
  expect(parseEmployeeExchange({...value,detail:{...value.detail,checks:[check]}})).toEqual({state:'unavailable',reason:'read_failed'});
 }
});
