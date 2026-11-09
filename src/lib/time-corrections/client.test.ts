import { afterEach, describe, expect, it, vi } from 'vitest';
import { reviewManagerTimeCorrection, submitEmployeeTimeCorrection } from './client';

const operationId='11111111-1111-4111-8111-111111111111';
const request={operationId,kind:'ENTRY_BOUNDARY' as const,timeEntryId:'recorded-entry',proposedStartAt:'2020-10-07T12:00:00Z',proposedEndAt:'2020-10-07T13:00:00Z',reason:'Review this recorded interval.'};
const review={operationId,requestId:'22222222-2222-4222-8222-222222222222',expectedRevision:1,decision:'APPROVE' as const};
afterEach(()=>vi.unstubAllGlobals());

describe('D2 same-operation response recovery',()=>{
  for(const [name,send] of [
    ['Employee',()=>submitEmployeeTimeCorrection(request)],
    ['Manager',()=>reviewManagerTimeCorrection(review)],
  ] as const){
    it(`${name} preserves an uncertain operation when delivery fails`,async()=>{
      vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Response delivery lost')));
      await expect(send()).resolves.toEqual({state:'outcome_unknown',operationId});
    });
    it(`${name} preserves an uncertain operation when the response body is unreadable`,async()=>{
      vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{', {status:200})));
      await expect(send()).resolves.toEqual({state:'outcome_unknown',operationId});
    });
    it(`${name} preserves an uncertain operation for an unrecognized response`,async()=>{
      vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({unexpected:true})));
      await expect(send()).resolves.toEqual({state:'outcome_unknown',operationId});
    });
    it.each([401,403])(`${name} treats authority denial %i as definitive`,async(status)=>{
      vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('',{status})));
      await expect(send()).resolves.toEqual({state:'unavailable',httpStatus:status});
    });
    it(`${name} retains a definitive validation response`,async()=>{
      vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({state:'invalid'},{status:400})));
      await expect(send()).resolves.toEqual({state:'invalid'});
    });
  }
  it('does not accept a receipt for a different operation',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({state:'pending',operationId:review.requestId,requestId:review.requestId,revision:1})));
    await expect(submitEmployeeTimeCorrection(request)).resolves.toEqual({state:'outcome_unknown',operationId});
  });
});
