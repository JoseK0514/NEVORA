import {it,expect,vi} from 'vitest';
import {randomBytes} from 'node:crypto';
import {fakeInvitationSmtp} from '@/test/integration/company-access-smtp.test-support';
vi.mock('server-only',()=>({}));
import {invitationDelivery} from './delivery.server';

it('PB-022 sends bilingual HTML and plain text through real owned SMTP with company and issued expiry',async()=>{
 const smtp=await fakeInvitationSmtp();try{
  const expiresAt=new Date(Date.now()+7*86400000).toISOString();
  await invitationDelivery(smtp.env)!.send({registeredEmail:'target@example.invalid',employeeId:'FICTIONAL-EMPLOYEE',proof:randomBytes(32).toString('base64url'),expiresAt,companyName:'Harbor Studio',firstName:'Avery',timeZone:'America/Puerto_Rico'});
  expect(smtp.messages).toHaveLength(1);
  const mail=smtp.messages[0].replace(/=\r\n/g,'').replace(/=3D/g,'=');
  expect(mail).toContain('multipart/alternative');expect(mail).toContain('text/plain');expect(mail).toContain('text/html');
  expect(mail).toContain('Harbor Studio');expect(mail).toContain('lang="en"');expect(mail).toContain('lang="es"');
  expect(mail).toContain('FICTIONAL-EMPLOYEE');expect(mail).toContain('/activate#proof=');
  expect(mail).not.toContain('Your Owner invited');
 }finally{await smtp.close();}
});

it('actual configurable invitation transport sends only the registered recipient and a fragment proof through owned SMTP',async()=>{
 const smtp=await fakeInvitationSmtp();
 try {
  const proof=randomBytes(32).toString('base64url');
  const result=await invitationDelivery(smtp.env)!.send({registeredEmail:'target@example.invalid',proof,expiresAt:new Date(Date.now()+900000).toISOString()});
  expect(result).toEqual({providerAccepted:true});expect(smtp.messages.length).toBe(1);
  const mail=smtp.messages[0].replace(/=\r\n/g,'').replace(/=3D/g,'=');
  expect(mail.includes('/activate#proof='+proof)).toBe(true);
  expect(mail.includes('/activate?')).toBe(false);expect(mail.includes('To: target@example.invalid')).toBe(true);
 }finally{await smtp.close();}
});
it('invitation issuance stays disabled or unavailable without the explicit flag and complete validated configuration',async()=>{
 const smtp=await fakeInvitationSmtp();try{
  for(const env of [{...smtp.env,NEVORA_INVITATION_DELIVERY_ENABLED:undefined},{...smtp.env,NEVORA_INVITATION_DELIVERY_ENABLED:'false'},
   {...smtp.env,NEVORA_RECOVERY_FROM:''},{...smtp.env,FUEL_PORTAL_ORIGIN:'http://127.0.0.1:32123/path'},
   {...smtp.env,NODE_ENV:'production',NEVORA_RECOVERY_SMTP_HOST:'smtp.example.invalid'}])expect(invitationDelivery(env)).toBeNull();
  expect(smtp.messages.length).toBe(0);
 }finally{await smtp.close();}
});
it.each(['reject_before_data','drop_after_data'] as const)('transport distinguishes definite refusal from uncertain post-DATA outcome: %s',async mode=>{
 const smtp=await fakeInvitationSmtp(mode);try{
  await expect(invitationDelivery(smtp.env)!.send({registeredEmail:'target@example.invalid',proof:randomBytes(32).toString('base64url'),expiresAt:new Date(Date.now()+900000).toISOString()}))
   .rejects.toMatchObject({deliveryState:mode==='reject_before_data'?'FAILED':'UNKNOWN'});
 }finally{await smtp.close();}
});
it('rejects recipient header injection before connecting to SMTP',async()=>{
 const smtp=await fakeInvitationSmtp();try{
  await expect(invitationDelivery(smtp.env)!.send({registeredEmail:'target@example.invalid\r\nBcc: other@example.invalid',proof:randomBytes(32).toString('base64url'),expiresAt:new Date(Date.now()+900000).toISOString()})).rejects.toMatchObject({deliveryState:'FAILED'});
  expect(smtp.messages.length).toBe(0);
 }finally{await smtp.close();}
});

it('classifies a staging-recipient refusal as definitely failed without opening SMTP',async()=>{
 const smtp=await fakeInvitationSmtp();try{
  const sender=invitationDelivery({...smtp.env,NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_STAGING_EMAIL_RECIPIENT:'approved@example.invalid'})!;
  await expect(sender.send({registeredEmail:'other@example.invalid',proof:randomBytes(32).toString('base64url'),expiresAt:new Date(Date.now()+900000).toISOString()})).rejects.toMatchObject({deliveryState:'FAILED'});
  expect(smtp.connections).toBe(0);expect(smtp.messages.length).toBe(0);
 }finally{await smtp.close();}
});

it('classifies a rendering failure before SMTP as FAILED without opening a connection',async()=>{
 const smtp=await fakeInvitationSmtp();try{
  await expect(invitationDelivery(smtp.env)!.send({registeredEmail:'target@example.invalid',proof:randomBytes(32).toString('base64url'),expiresAt:new Date(Date.now()+900000).toISOString(),companyName:'Fictional Shop',timeZone:'Invalid/Zone'})).rejects.toMatchObject({deliveryState:'FAILED'});
  expect(smtp.connections).toBe(0);expect(smtp.messages).toHaveLength(0);
 }finally{await smtp.close();}
});
