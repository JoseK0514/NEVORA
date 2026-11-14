import {describe,it,expect,vi} from 'vitest';
import {readSignupAdmission,signupAdmissionAllows} from './admission.server';
import {registrationHttpHandlers} from './registration-http.server';
import {onboardingTestConfig} from '@/test/integration/onboarding-test-config';

describe('production registration admission',()=>{
 it('defaults production to closed while leaving the existing nonproduction profile available',()=>{
  expect(readSignupAdmission({NEVORA_ONBOARDING_ENVIRONMENT:'production'})).toEqual({mode:'closed'});
  expect(readSignupAdmission({NEVORA_ONBOARDING_ENVIRONMENT:'test'})).toEqual({mode:'open'});
 });
 it('allows only the approved inbox for backend acceptance without advertising public signup',()=>{
  const admission=readSignupAdmission({NEVORA_ONBOARDING_ENVIRONMENT:'production',NEVORA_ONBOARDING_ADMISSION_MODE:'approved_recipient',NEVORA_STAGING_EMAIL_RECIPIENT:'Support@example.invalid'});
  expect(admission.mode).toBe('approved_recipient');
  expect(signupAdmissionAllows(admission,'support@example.invalid')).toBe(true);
  expect(signupAdmissionAllows(admission,'visitor@example.invalid')).toBe(false);
  expect(signupAdmissionAllows(admission,null)).toBe(false);
 });
 it.each([{NEVORA_ONBOARDING_ADMISSION_MODE:'typo'},{NEVORA_ONBOARDING_ADMISSION_MODE:'approved_recipient'},{NEVORA_ONBOARDING_ADMISSION_MODE:'approved_recipient',NEVORA_STAGING_EMAIL_RECIPIENT:'invalid'},{NEVORA_ONBOARDING_ADMISSION_MODE:'open',NEVORA_STAGING_EMAIL_RECIPIENT:'support@example.invalid'},{NEVORA_ONBOARDING_ADMISSION_MODE:'open',NEVORA_STAGING_EMAIL_RECIPIENT:'invalid'}])('fails closed for an incomplete or mixed admission policy %j',patch=>{
  expect(readSignupAdmission({NEVORA_ONBOARDING_ENVIRONMENT:'production',...patch})).toEqual({mode:'closed'});
 });
 it('opens production only explicitly, after the inbox fence has been removed',()=>{
  const a=readSignupAdmission({NEVORA_ONBOARDING_ENVIRONMENT:'production',NEVORA_ONBOARDING_ADMISSION_MODE:'open'});
  expect(a.mode).toBe('open');expect(signupAdmissionAllows(a,'visitor@example.invalid')).toBe(true);
 });
 it.each([{mode:'closed'} as const,{mode:'approved_recipient',email:'support@example.invalid'} as const])('denies an unapproved registration before accessing a control store',async admission=>{
  const query=vi.fn(),transaction=vi.fn(),send=vi.fn();
  const request=new Request('https://signup.example.invalid/api/onboarding/registration',{method:'POST',headers:{origin:'https://signup.example.invalid','content-type':'application/json'},body:JSON.stringify({schemaVersion:1,operationId:'5944698c-641f-4272-a25b-8dbfa6fb3518',email:'visitor@example.invalid',locale:'en',termsVersion:'terms-1',privacyVersion:'privacy-1'})});
  const handlers=registrationHttpHandlers({config:onboardingTestConfig(),admission,store:{query,transaction},delivery:{send}});
  const response=await handlers.request(request);
  expect(response.status).toBe(503);expect(await response.json()).toEqual({state:'unavailable',reasonCode:'ONBOARDING_DISABLED'});
  expect(query).not.toHaveBeenCalled();expect(transaction).not.toHaveBeenCalled();expect(send).not.toHaveBeenCalled();
 });
 it('passes the approved inbox to the normal registration availability checks',async()=>{
  const request=new Request('https://signup.example.invalid/api/onboarding/registrations',{method:'POST',headers:{origin:'https://signup.example.invalid','content-type':'application/json'},body:JSON.stringify({email:' Support@example.invalid '})});
  const response=await registrationHttpHandlers({config:onboardingTestConfig(),admission:{mode:'approved_recipient',email:'support@example.invalid'}}).request(request);
  expect(response.status).toBe(503);expect(await response.json()).toEqual({state:'unavailable',reasonCode:'SOURCE_UNAVAILABLE'});
 });
 it('also closes a production handler constructed without an admission policy',async()=>{
  const request=new Request('https://signup.example.invalid/api/onboarding/registrations',{method:'POST',headers:{origin:'https://signup.example.invalid','content-type':'application/json'},body:'{}'});
  const response=await registrationHttpHandlers({config:{...onboardingTestConfig(),environment:'production'}}).request(request);
  expect(await response.json()).toEqual({state:'unavailable',reasonCode:'ONBOARDING_DISABLED'});
 });
});
