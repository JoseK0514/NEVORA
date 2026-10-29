import {expect,it} from 'vitest';
import {shiftRequestStatus,timeOffStatus} from './request-status';
import {requestStatus} from './exchange-view';
import type {RequestSummary} from '@/lib/employee-exchange';

// M-3: a request reads the same in the Requests list and on its own page.
it('names a withdrawn time-off request the same way everywhere',()=>{
 expect(timeOffStatus.CANCELLED).toBe('Withdrawn');expect(timeOffStatus.PENDING).toBe('Waiting for approval');
});
it('gives an own shift request in the list the words its detail page uses',()=>{
 const own=(status:string,kind:RequestSummary['kind']='swap'):RequestSummary=>({id:'r',kind,viewer:'requester',status,date:'2026-11-03',createdAt:'2026-10-27T12:00:00Z',counterparty:null,revision:1,releaseApplies:null} as unknown as RequestSummary);
 for(const status of ['EMPLOYEE_PENDING','MANAGER_PENDING','PENDING','OPEN','APPROVED','DENIED','CANCELLED','EXPIRED'])
  expect(shiftRequestStatus(status)).toBe(requestStatus(own(status)));
 expect(shiftRequestStatus('APPROVED')).toBe('Completed');expect(shiftRequestStatus('EMPLOYEE_PENDING')).toBe('Waiting for a teammate');
});
it('names an approved Unable-to-work report by its release only when that is known',()=>{
 expect(shiftRequestStatus('APPROVED',{callout:true,releaseApplies:true})).toBe('Released assignment');
 expect(shiftRequestStatus('APPROVED',{callout:true,releaseApplies:false})).toBe('Previous approval');
 expect(shiftRequestStatus('APPROVED',{callout:true})).toBe('Approved');
 expect(shiftRequestStatus('EMPLOYEE_PENDING',{recipient:true})).toBe('Needs your answer');
});
