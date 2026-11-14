import {afterEach,expect,it,vi} from 'vitest';
import nodemailer from 'nodemailer';
import {validatedMailTransport} from './mail-transport.server';
import {verificationDelivery} from '../onboarding/verification-delivery.server';
import {onboardingTestConfig} from '@/test/integration/onboarding-test-config';

const env={NODE_ENV:'test',NEVORA_RECOVERY_SMTP_HOST:'127.0.0.1',NEVORA_RECOVERY_SMTP_PORT:'23232',NEVORA_RECOVERY_FROM:'sender@example.invalid',FUEL_PORTAL_ORIGIN:'https://signup.example.invalid'};

// Replace only the remote SMTP boundary. Validation and delivery classification
// remain real; no provider, mailbox, credential or database is used.
function deferredSmtp(){
 let accept:()=>void=()=>{};
 const response=new Promise<{accepted:string[]}>(resolve=>{accept=()=>resolve({accepted:['owner@example.invalid']});});
 const sendMail=vi.fn(()=>response);
 vi.spyOn(nodemailer,'createTransport').mockReturnValue({sendMail} as unknown as ReturnType<typeof nodemailer.createTransport>);
 return {accept,sendMail};
}

afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});

it('bounds the whole account-mail wait and keeps late SMTP acceptance uncertain without resending',async()=>{
 vi.useFakeTimers();
 const smtp=deferredSmtp();
 let outcome:unknown;
 const pending=validatedMailTransport(env)!.sendRegistered('owner@example.invalid','Fictional subject','Fictional body')
  .then(()=>{outcome={state:'accepted'};},error=>{outcome={state:'unknown',code:error.code};});
 try{
  await vi.advanceTimersByTimeAsync(14999);
  expect(outcome).toBeUndefined();
  await vi.advanceTimersByTimeAsync(1);
  expect(outcome).toEqual({state:'unknown',code:'smtp_deadline_exceeded'});
  smtp.accept();
  await pending;
  expect(outcome).toEqual({state:'unknown',code:'smtp_deadline_exceeded'});
  expect(smtp.sendMail).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
 }finally{smtp.accept();await pending;}
});

it('clears the whole-send deadline after an early SMTP acceptance',async()=>{
 vi.useFakeTimers();
 const smtp=deferredSmtp();
 const pending=validatedMailTransport(env)!.sendRegistered('owner@example.invalid','Fictional subject','Fictional body');
 smtp.accept();
 await expect(pending).resolves.toMatchObject({accepted:['owner@example.invalid']});
 expect(vi.getTimerCount()).toBe(0);
});

it.each(['en','es'] as const)('keeps a %s verification timeout UNKNOWN when SMTP later accepts',async locale=>{
 vi.useFakeTimers();
 const smtp=deferredSmtp();
 const delivery=verificationDelivery({...env,NEVORA_ONBOARDING_EMAIL_ENABLED:'true'},onboardingTestConfig())!;
 let outcome:unknown;
 const pending=delivery.send({email:'owner@example.invalid',proof:Buffer.alloc(32,1).toString('base64url'),locale,expiresAt:new Date(Date.now()+1800000).toISOString()})
  .then(()=>{outcome={state:'accepted'};},error=>{outcome={state:error.deliveryState};});
 try{
  await vi.advanceTimersByTimeAsync(15000);
  expect(outcome).toEqual({state:'UNKNOWN'});
  smtp.accept();
  await pending;
  expect(outcome).toEqual({state:'UNKNOWN'});
  expect(smtp.sendMail).toHaveBeenCalledTimes(1);
 }finally{smtp.accept();await pending;}
});
