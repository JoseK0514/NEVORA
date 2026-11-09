import {describe,expect,it} from 'vitest';
import {digestOnboardingProof,sealOnboardingValue,openOnboardingValue,newOnboardingToken} from './crypto.server';
import {verificationDelivery} from './verification-delivery.server';
import {fakeInvitationSmtp} from '@/test/integration/company-access-smtp.test-support';
import {onboardingTestConfig} from '@/test/integration/onboarding-test-config';

describe('private signup proof and encrypted delivery custody',()=>{
 const key=Buffer.alloc(32,7).toString('base64url');
 it('creates canonical 256-bit proofs with different values each time',()=>{const a=newOnboardingToken(),b=newOnboardingToken();expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);expect(a===b).toBe(false);});
 it('separates verification and session proof digests',()=>{const raw=newOnboardingToken();expect(digestOnboardingProof('verification',raw,key)===digestOnboardingProof('signup-session',raw,key)).toBe(false);expect(digestOnboardingProof('verification',raw,key)).toHaveLength(64);});
 it('encrypts private delivery data and binds it to its exact operation',()=>{const s=sealOnboardingValue('private@example.invalid','delivery:operation-a',key);expect(s.includes('private@example.invalid')).toBe(false);expect(openOnboardingValue(s,'delivery:operation-a',key)).toBe('private@example.invalid');expect(openOnboardingValue(s,'delivery:operation-b',key)).toBeNull();});
 it('refuses altered ciphertext or another key without exposing data',()=>{const s=sealOnboardingValue('private','purpose',key);const parts=s.split('.');parts[2]=Buffer.from('altered').toString('base64url');expect(openOnboardingValue(parts.join('.'),'purpose',key)).toBeNull();expect(openOnboardingValue(s,'purpose',Buffer.alloc(32,8).toString('base64url'))).toBeNull();});
 it.each(['','v0.a.b.c','v1.!.b.c','v1.a.b.c.d'])('refuses malformed encrypted custody %s',s=>expect(openOnboardingValue(s,'purpose',key)).toBeNull());
});
describe('verification delivery uses the actual registered channel',()=>{
 it('is off unless explicitly configured and never constructs an unsafe origin',()=>{const c=onboardingTestConfig();expect(verificationDelivery({},c)).toBeNull();expect(verificationDelivery({NEVORA_ONBOARDING_EMAIL_ENABLED:'true',FUEL_PORTAL_ORIGIN:'https://foreign.invalid'},c)).toBeNull();});
 it.each(['en','es'] as const)('sends %s verification with its language in the URL and proof only in a fragment through owned SMTP',async locale=>{const smtp=await fakeInvitationSmtp();try{const c=onboardingTestConfig({NEVORA_SIGNUP_ORIGIN:smtp.env.FUEL_PORTAL_ORIGIN});const sender=verificationDelivery({...smtp.env,NEVORA_ONBOARDING_EMAIL_ENABLED:'true'},c);expect(sender).not.toBeNull();await sender!.send({email:'owner@example.invalid',proof:newOnboardingToken(),locale,expiresAt:new Date(Date.now()+1800000).toISOString()});expect(smtp.messages.length).toBe(1);const body=smtp.messages[0].replace(/=\r\n/g,'').replace(/=3D/g,'=');const link=body.match(/http:\/\/127\.0\.0\.1:\d+\/onboarding\/verify[^\s]+/)?.[0];expect(!!link).toBe(true);const u=new URL(link!);expect(u.search).toBe('?lang='+locale);expect(u.hash.startsWith('#proof=')).toBe(true);expect(body.includes(locale==='es'?'Verifica':'Verify')).toBe(true);}finally{await smtp.close();}});
 it.each([['reject_before_data','FAILED'],['drop_after_data','UNKNOWN']] as const)('retains truthful %s SMTP outcome',async(mode,state)=>{const smtp=await fakeInvitationSmtp(mode);try{const c=onboardingTestConfig({NEVORA_SIGNUP_ORIGIN:smtp.env.FUEL_PORTAL_ORIGIN});const sender=verificationDelivery({...smtp.env,NEVORA_ONBOARDING_EMAIL_ENABLED:'true'},c)!;await expect(sender.send({email:'owner@example.invalid',proof:newOnboardingToken(),locale:'en',expiresAt:new Date(Date.now()+1800000).toISOString()})).rejects.toMatchObject({deliveryState:state});}finally{await smtp.close();}});
});

it('classifies a staging verification recipient refusal as definite without SMTP',async()=>{
 const smtp=await fakeInvitationSmtp();try{
  const c=onboardingTestConfig({NEVORA_SIGNUP_ORIGIN:smtp.env.FUEL_PORTAL_ORIGIN});
  const sender=verificationDelivery({...smtp.env,NEVORA_ONBOARDING_EMAIL_ENABLED:'true',NEVORA_STAGING_EMAIL_RECIPIENT:'approved@example.invalid'},c)!;
  await expect(sender.send({email:'other@example.invalid',proof:newOnboardingToken(),locale:'en',expiresAt:new Date(Date.now()+900000).toISOString()})).rejects.toMatchObject({deliveryState:'FAILED'});
  expect(smtp.connections).toBe(0);expect(smtp.messages.length).toBe(0);
 }finally{await smtp.close();}
});
