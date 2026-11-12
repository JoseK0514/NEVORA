import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {onboardingTestConfig} from '@/test/integration/onboarding-test-config';
import {registrationHttpHandlers} from './registration-http.server';

const calls=vi.hoisted(()=>({requestRegistration:vi.fn(),verifyRegistration:vi.fn()}));
vi.mock('./registration.server',()=>calls);

describe('registration HTTP network admission boundary',()=>{
 const config=onboardingTestConfig(),store={query:vi.fn(),transaction:vi.fn()},delivery={send:vi.fn()};
 const body={schemaVersion:1,operationId:'5944698c-641f-4272-a25b-8dbfa6fb3518',email:'owner@example.invalid',locale:'en',termsVersion:'terms-1',privacyVersion:'privacy-1'};
 beforeEach(()=>{vi.stubEnv('VERCEL','1');calls.requestRegistration.mockResolvedValue({schemaVersion:1,state:'verification_requested',resendAfterMs:60000});});
 afterEach(()=>{vi.clearAllMocks();vi.unstubAllEnvs();});
 async function request(headers:Record<string,string>){
  const response=await registrationHttpHandlers({config,store,delivery,admission:{mode:'open'}}).request(new Request(config.signupOrigin+'/api/onboarding/registrations',{method:'POST',headers:{origin:config.signupOrigin,'content-type':'application/json',...headers},body:JSON.stringify(body)}));
  expect(response.status).toBe(202);return response;
 }
 it('passes the trusted edge address into durable admission, ignoring forged generic hints',async()=>{
  const response=await request({'x-vercel-forwarded-for':'203.0.113.7','x-forwarded-for':'198.51.100.9','x-real-ip':'198.51.100.10'});
  expect(calls.requestRegistration).toHaveBeenCalledWith(body,store,delivery,config,'203.0.113.7');
  expect(await response.text()).not.toContain('203.0.113.7');
 });
 it('normalizes equivalent IPv6 addresses into one admission subject',async()=>{
  await request({'x-vercel-forwarded-for':'2001:0DB8:0000:0000:0000:0000:0000:0001'});
  expect(calls.requestRegistration.mock.calls[0]?.[4]).toBe('2001:db8::1');
 });
 it.each([undefined,'','not-an-ip','999.0.0.1','203.0.113.7, 198.51.100.9','fe80::1%lo0','[2001:db8::1]','203.0.113.7:443'])('uses the conservative fallback for missing or invalid trusted address %s',async value=>{
  await request({...value===undefined?{}:{'x-vercel-forwarded-for':value},'x-forwarded-for':'198.51.100.9'});
  expect(calls.requestRegistration.mock.calls[0]?.[4]).toBeNull();
 });
 it.each([undefined,'0','false'])('does not trust forwarding headers outside the Vercel runtime (%s)',async runtime=>{
  vi.stubEnv('VERCEL',runtime);await request({'x-vercel-forwarded-for':'203.0.113.7','x-forwarded-for':'198.51.100.9'});
  expect(calls.requestRegistration.mock.calls[0]?.[4]).toBeNull();
 });
});
