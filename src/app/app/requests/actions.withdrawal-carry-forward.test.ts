import { beforeEach, expect, it, rs } from '@rstest/core';
import { requestTimeOffAction, reviewTimeOffAction, withdrawTimeOffAction } from './actions';
import { requireRoles, requireSelfService } from '@/lib/auth/permissions';
import { createTimeOffRequest, reviewTimeOffRequest, withdrawTimeOffRequest } from '@/lib/data/requests';
import {revalidatePath} from 'next/cache';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { managementProof } from '../../../test/fixtures/management';
rs.mock('@/lib/auth/session',()=>({requireSessionMutationProof:rs.fn(async()=>({employee:{id:'M',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)}))}));
rs.mock('@/lib/auth/permissions',()=>({ TIME_OFF_REVIEW_ROLES:['OWNER','MANAGER'],requireRoles:rs.fn(),requireSelfService:rs.fn() }));
rs.mock('@/lib/data/requests',()=>({ createTimeOffRequest:rs.fn(), reviewTimeOffRequest:rs.fn(), withdrawTimeOffRequest:rs.fn() }));
rs.mock('next/navigation',()=>({ redirect:(path:string)=>{throw new Error(`redirect:${path}`);} }));
rs.mock('next/cache',()=>({ revalidatePath:rs.fn() }));
beforeEach(()=>{rs.clearAllMocks();rs.mocked(requireRoles).mockResolvedValue({id:'M',role:'MANAGER',firstName:'Manager',lastName:'Test',primaryLocationId:'L'});rs.mocked(requireSelfService).mockResolvedValue({id:'E',role:'EMPLOYEE',firstName:'Employee',lastName:'Test',primaryLocationId:'L'});});
it('submits using session ownership, ignoring body identities',async()=>{
 rs.mocked(requireSessionMutationProof).mockResolvedValueOnce(managementProof('E','EMPLOYEE'));
 const data=new FormData();data.set('requestId','b032d773-4569-4c8e-b263-b47d2be62e65');data.set('employeeId','other');data.set('startDate','2030-10-11');data.set('endDate','2030-10-11');
 await expect(requestTimeOffAction(data)).rejects.toThrow('submitted=1');expect(createTimeOffRequest).toHaveBeenCalledWith(expect.objectContaining({employeeId:'E',proof:managementProof('E','EMPLOYEE')}));
});
it('time_off_decision_returns_without_provider_contact using session manager identity',async()=>{
 const provider=rs.fn(()=>new Promise(()=>{}));rs.stubGlobal('fetch',provider);rs.mocked(reviewTimeOffRequest).mockResolvedValue(true);
 const data=new FormData();data.set('requestId','r1');data.set('decision','APPROVED');data.set('managerId','other');
 try{await expect(reviewTimeOffAction(data)).rejects.toThrow('reviewed=1');expect(reviewTimeOffRequest).toHaveBeenCalledWith({requestId:'r1',managerId:'M',status:'APPROVED',proof:{employee:{id:'M',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)}});expect(requireRoles).toHaveBeenCalledWith(['OWNER','MANAGER']);expect(provider).not.toHaveBeenCalled();}finally{rs.unstubAllGlobals();}
});
it.each([false,'outbox failure'] as const)('failed_decision_has_no_success_intent: %s',async result=>{
 if(result===false)rs.mocked(reviewTimeOffRequest).mockResolvedValue(false);else rs.mocked(reviewTimeOffRequest).mockRejectedValue(new Error(result));
 const data=new FormData();data.set('requestId','r1');data.set('decision','APPROVED');await expect(reviewTimeOffAction(data)).rejects.toThrow(result===false?'error=review':result);
});
it('denies review before persistence when role authorization fails',async()=>{
 rs.mocked(requireRoles).mockRejectedValue(new Error('forbidden'));await expect(reviewTimeOffAction(new FormData())).rejects.toThrow('forbidden');expect(reviewTimeOffRequest).not.toHaveBeenCalled();
});
it.each([
 {requestId:'',startDate:'2030-10-11'},
 {requestId:'foreign-id',startDate:'2030-10-11'},
 {requestId:'b032d773-4569-4c8e-b263-b47d2be62e65',startDate:'2030-02-30'},
])('rejects malformed retry identifiers or impossible dates before persistence: %j',async input=>{
 const data=new FormData();data.set('requestId',input.requestId);data.set('startDate',input.startDate);data.set('endDate',input.startDate);
 await expect(requestTimeOffAction(data)).rejects.toThrow('error=invalid');expect(createTimeOffRequest).not.toHaveBeenCalled();
});

const withdrawalRequestId='dc6b44c9-6e3f-4f0e-890c-328067ebfe9e';
function withdrawalForm(){const data=new FormData();data.set('requestId',withdrawalRequestId);data.set('operationId',`TIME_OFF_WITHDRAW:${withdrawalRequestId}`);data.set('confirmed','yes');return data;}
it('requires explicit confirmation and rejects added or changed withdrawal command fields',async()=>{
 for(const mutate of [(d:FormData)=>d.delete('confirmed'),(d:FormData)=>d.set('employeeId','foreign'),(d:FormData)=>d.set('status','DENIED'),(d:FormData)=>d.set('operationId','changed'),(d:FormData)=>d.append('requestId',withdrawalRequestId)]){
  const form=withdrawalForm();mutate(form);expect(await withdrawTimeOffAction({outcome:'idle'},form)).toEqual({outcome:'invalid'});
 }expect(withdrawTimeOffRequest).not.toHaveBeenCalled();
});
it('returns first canonical cancellation receipt and refreshes employee and manager views',async()=>{
 rs.mocked(requireSessionMutationProof).mockResolvedValueOnce(managementProof('E','EMPLOYEE'));
 const receipt={requestId:withdrawalRequestId,operationId:`TIME_OFF_WITHDRAW:${withdrawalRequestId}`,status:'CANCELLED' as const,reviewedBy:'E',reviewedAt:'2030-01-01 00:00:00+00'};
 rs.mocked(withdrawTimeOffRequest).mockResolvedValueOnce(receipt);
 expect(await withdrawTimeOffAction({outcome:'idle'},withdrawalForm())).toEqual({outcome:'withdrawn',receipt});
 expect(revalidatePath).toHaveBeenCalledWith('/app/requests');
 expect(withdrawTimeOffRequest).toHaveBeenCalledWith({requestId:withdrawalRequestId,operationId:`TIME_OFF_WITHDRAW:${withdrawalRequestId}`,employeeId:'E',proof:managementProof('E','EMPLOYEE')});
});
it.each(['conflict','unavailable','denied'] as const)('keeps %s distinct from successful withdrawal',async outcome=>{
 if(outcome==='conflict')rs.mocked(withdrawTimeOffRequest).mockResolvedValueOnce(null);
 else rs.mocked(withdrawTimeOffRequest).mockRejectedValueOnce(outcome==='denied'?{code:'22P02',message:'invalid input syntax for type integer: "management_authorization"'}:Error('transport unknown'));
 expect(await withdrawTimeOffAction({outcome:'idle'},withdrawalForm())).toEqual({outcome});
});
