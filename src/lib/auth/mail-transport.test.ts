import {it,expect} from 'vitest';
import {validatedMailTransport} from './mail-transport.server';
it('admits HTTPS links with a development loopback SMTP transport while remote SMTP still requires credentials and HTTPS',()=>{
 const env={NODE_ENV:'test',NEVORA_RECOVERY_SMTP_HOST:'127.0.0.1',NEVORA_RECOVERY_SMTP_PORT:'23232',NEVORA_RECOVERY_FROM:'fictional@example.invalid',FUEL_PORTAL_ORIGIN:'https://alpha.portal.example.invalid'};
 expect(validatedMailTransport(env)?.origin).toBe(env.FUEL_PORTAL_ORIGIN);expect(validatedMailTransport({...env,NEVORA_RECOVERY_SMTP_HOST:'smtp.example.invalid'})).toBeNull();expect(validatedMailTransport({...env,NODE_ENV:'production'})).toBeNull();expect(validatedMailTransport({...env,FUEL_PORTAL_ORIGIN:'ftp://alpha.portal.example.invalid'})).toBeNull();
});

it('the installed mailer preserves the approved envelope recipient through nested address comments',async()=>{
 const nodemailer=(await import('nodemailer')).default;
 const transport=nodemailer.createTransport({streamTransport:true,buffer:true});
 const result=await transport.sendMail({from:'sender@example.invalid',to:'Approved (outer(inner) <other@example.invalid>) <approved@example.invalid>',subject:'Fictional dependency regression',text:'Fictional verification content'});
 expect(result.envelope.to).toEqual(['approved@example.invalid']);
});


it.each([undefined,'','invalid','first@example.invalid,second@example.invalid'])('refuses remote test-environment mail without one approved recipient: %s',recipient=>{
 const env={NODE_ENV:'production',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_RECOVERY_SMTP_HOST:'smtp.example.invalid',NEVORA_RECOVERY_SMTP_PORT:'465',NEVORA_RECOVERY_FROM:'sender@example.invalid',FUEL_PORTAL_ORIGIN:'https://signup-staging.example.invalid',NEVORA_RECOVERY_SMTP_USER:'fictional',NEVORA_RECOVERY_SMTP_PASSWORD:'fictional',...(recipient===undefined?{}:{NEVORA_STAGING_EMAIL_RECIPIENT:recipient})};
 expect(validatedMailTransport(env)).toBeNull();
});

it('blocks an unapproved staging recipient before SMTP while admitting the approved mailbox',async()=>{
 const {fakeInvitationSmtp}=await import('@/test/integration/company-access-smtp.test-support');const smtp=await fakeInvitationSmtp();
 try{
  const mail=validatedMailTransport({...smtp.env,NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_STAGING_EMAIL_RECIPIENT:'approved@example.invalid'})!;
  await expect(mail.sendRegistered('other@example.invalid','Fictional test','Fictional body')).rejects.toMatchObject({code:'staging_recipient_denied'});
  expect(smtp.connections).toBe(0);expect(smtp.messages.length).toBe(0);
  await mail.sendRegistered('approved@example.invalid','Fictional test','Fictional body');
  expect(smtp.connections).toBe(1);expect(smtp.messages.length).toBe(1);expect(smtp.messages[0]).toContain('To: approved@example.invalid');
 }finally{await smtp.close();}
});

it('preserves production mail configuration when the optional staging mailbox setting is empty',()=>{
 expect(validatedMailTransport({NODE_ENV:'production',NEVORA_ONBOARDING_ENVIRONMENT:'production',NEVORA_STAGING_EMAIL_RECIPIENT:'',NEVORA_RECOVERY_SMTP_HOST:'smtp.example.invalid',NEVORA_RECOVERY_SMTP_PORT:'465',NEVORA_RECOVERY_FROM:'sender@example.invalid',FUEL_PORTAL_ORIGIN:'https://portal.example.invalid',NEVORA_RECOVERY_SMTP_USER:'fictional',NEVORA_RECOVERY_SMTP_PASSWORD:'fictional'})).not.toBeNull();
});

it.each(['send','notifyReset'] as const)('blocks recovery %s for an unapproved staging recipient before SMTP',async action=>{
 const {fakeInvitationSmtp}=await import('@/test/integration/company-access-smtp.test-support');const {recoveryDelivery}=await import('./recovery-delivery.server');const smtp=await fakeInvitationSmtp();
 try{
  const delivery=recoveryDelivery({...smtp.env,NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_STAGING_EMAIL_RECIPIENT:'approved@example.invalid'})!;
  const pending=action==='send'?delivery.send('other@example.invalid','a'.repeat(43)):delivery.notifyReset!('other@example.invalid');
  await expect(pending).rejects.toMatchObject({code:'staging_recipient_denied'});expect(smtp.connections).toBe(0);expect(smtp.messages.length).toBe(0);
 }finally{await smtp.close();}
});
