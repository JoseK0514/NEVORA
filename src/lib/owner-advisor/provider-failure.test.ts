import {expect,it,vi} from 'vitest';
import {AdvisorProviderFailure,rejectedProviderResponse,logProviderFailure} from './provider-failure.server';

it.each([
 [401,{},'authentication'],[403,{},'authentication'],[429,{},'rate_limit'],[503,{},'upstream'],
 [400,{error:{code:'content_filter',message:'private source body'}},'safety_filter'],
 [400,{error:{message:'max_output_tokens limit exceeded secret-key'}},'token_budget'],
 [400,{error:{message:'invalid JSON generated secret-key'}},'structured_output'],
 [400,{error:{message:'secret-key private-payroll'}},'unknown'],
] as const)('retains only status/label for HTTP %i',async(status,body,hint)=>{
 const error=await rejectedProviderResponse(Response.json(body,{status}),new AbortController().signal);
 expect(error).toMatchObject({code:'provider_failed',providerStatus:status,providerHint:hint});
 expect(JSON.stringify(error)).not.toMatch(/private|secret-key|message|cause/);
});

it('abandons a stalled rejected body within the diagnostic deadline',async()=>{
 const cancel=vi.fn();
 const start=performance.now();
 const error=await rejectedProviderResponse(new Response(new ReadableStream({cancel}),{status:400}),new AbortController().signal);
 expect(error).toMatchObject({providerStatus:400,providerHint:'unknown'});
 expect(performance.now()-start).toBeLessThan(1500);
 expect(cancel).toHaveBeenCalledTimes(1);
});

it('retains no raw error fields and logs only fixed diagnostics',()=>{
 const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
 try{
  const error=new AdvisorProviderFailure(400,'secret-key' as never);
  Object.assign(error,{providerHint:'private source',providerStatus:999,upstream:'secret-key'});
  logProviderFailure(error);
  expect(warn).toHaveBeenCalledWith('owner_advisor_provider_failure',{code:'provider_failed',providerStatus:undefined,providerHint:'unknown'});
  expect(JSON.stringify(warn.mock.calls)).not.toMatch(/private|secret-key/);
 }finally{warn.mockRestore();}
});
