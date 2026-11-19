import * as rstestOriginal0 from "./request-notifications" with { rstest: 'importActual' };
import { beforeEach, expect, it, rs } from '@rstest/core';
import { managementProof } from '../../test/fixtures/management';
import { createTimeOffRequest,getTimeOffRequest } from './requests';
import type {SqlExecutor} from '../notifications/types';
import { commitRequestTransition } from './request-notifications';
rs.mock('./notification-transactions',()=>({neonNotificationExecutor:()=>({})}));
rs.mock('./request-notifications', ()=>({...rstestOriginal0,commitRequestTransition:rs.fn(async()=>true)}));
beforeEach(()=>{ rs.clearAllMocks(); });
it('never turns malformed creation timestamps into a valid pending request',async()=>{
 const row={id:'r',employee_id:'e',employee_name:'Fictional',start_date:'2030-10-07',end_date:'2030-10-07',status:'PENDING',created_at:'2030-02-30T12:00:00Z'};
 const executor={query:async()=>[row]} as unknown as SqlExecutor;
 await expect(getTimeOffRequest('r',executor)).rejects.toThrow();
 row.created_at='2030-10-07T12:00:00-04:00';
 expect(await getTimeOffRequest('r',executor)).toMatchObject({createdAt:'2030-10-07T16:00:00Z'});
});
it("keeps the form's unique request ID and session actor on repeated protected transaction attempts",async()=>{
 const request={proof:managementProof('FC-9004','EMPLOYEE'),requestId:'dc6b44c9-6e3f-4f0e-890c-328067ebfe9e',employeeId:'FC-9004',startDate:'2026-11-18',endDate:'2026-11-18'};
 await createTimeOffRequest(request);await createTimeOffRequest(request);
 expect(commitRequestTransition).toHaveBeenCalledTimes(2);
 for(const [attempt] of rs.mocked(commitRequestTransition).mock.calls){
  expect(attempt.actorEmployeeId).toBe(request.employeeId);
  expect(attempt.after.record.id).toBe(request.requestId);
  expect(attempt.mutation.values[0]).toBe(request.requestId);
 }
});
