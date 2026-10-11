import { beforeEach, expect, it, vi } from 'vitest';
import { managementProof } from '../../test/fixtures/management';
import { createTimeOffRequest } from './requests';
import { commitRequestTransition } from './request-notifications';
vi.mock('./notification-transactions',()=>({neonNotificationExecutor:()=>({})}));
vi.mock('./request-notifications',async original=>({...await original<typeof import('./request-notifications')>(),commitRequestTransition:vi.fn(async()=>true)}));
beforeEach(()=>vi.clearAllMocks());
it("keeps the form's unique request ID and session actor on repeated protected transaction attempts",async()=>{
 const request={proof:managementProof('FC-9004','EMPLOYEE'),requestId:'dc6b44c9-6e3f-4f0e-890c-328067ebfe9e',employeeId:'FC-9004',startDate:'2026-11-18',endDate:'2026-11-18'};
 await createTimeOffRequest(request);await createTimeOffRequest(request);
 expect(commitRequestTransition).toHaveBeenCalledTimes(2);
 for(const [attempt] of vi.mocked(commitRequestTransition).mock.calls){
  expect(attempt.actorEmployeeId).toBe(request.employeeId);
  expect(attempt.after.record.id).toBe(request.requestId);
  expect(attempt.mutation.values[0]).toBe(request.requestId);
 }
});
