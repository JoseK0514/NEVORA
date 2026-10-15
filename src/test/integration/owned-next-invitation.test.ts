import {afterEach,expect,it,vi} from 'vitest';
import {randomBytes} from 'node:crypto';
import {createOwnedNextApp,ownedMailEnvironment} from './owned-next-app';
import {fakeInvitationSmtp} from './company-access-smtp.test-support';
vi.mock('server-only',()=>({}));
import {invitationDelivery} from '../../lib/auth/invitations/delivery.server';
const origin='http://127.0.0.1:32123';
afterEach(()=>vi.unstubAllEnvs());
it('owned mail stays invitation-disabled without an explicit port and ignores ambient provider configuration',()=>{
 vi.stubEnv('NEVORA_INVITATION_DELIVERY_ENABLED','true');vi.stubEnv('NEVORA_RECOVERY_SMTP_HOST','smtp.example.invalid');vi.stubEnv('NEVORA_RECOVERY_SMTP_PORT','465');
 const env=ownedMailEnvironment(origin);expect(env).toEqual({NEVORA_INVITATION_DELIVERY_ENABLED:'false'});expect(invitationDelivery(env)).toBeNull();
});
it('explicit invitation port configures only loopback SMTP and the minted owned origin',()=>{
 expect(ownedMailEnvironment(origin,{invitationSmtpPort:32124})).toEqual({NEVORA_INVITATION_DELIVERY_ENABLED:'true',FUEL_PORTAL_ORIGIN:origin,NEVORA_RECOVERY_SMTP_HOST:'127.0.0.1',NEVORA_RECOVERY_SMTP_PORT:'32124',NEVORA_RECOVERY_FROM:'invitation@example.invalid'});
});
it('legacy recovery-only mail configuration keeps invitations disabled and two explicit uses must share their owned transport',()=>{
 expect(ownedMailEnvironment(origin,{recoverySmtpPort:32124})).toEqual({NEVORA_INVITATION_DELIVERY_ENABLED:'false',FUEL_PORTAL_ORIGIN:origin,NEVORA_RECOVERY_SMTP_HOST:'127.0.0.1',NEVORA_RECOVERY_SMTP_PORT:'32124',NEVORA_RECOVERY_FROM:'recovery@example.invalid'});
 expect(ownedMailEnvironment(origin,{recoverySmtpPort:32124,invitationSmtpPort:32124})).toMatchObject({NEVORA_INVITATION_DELIVERY_ENABLED:'true',NEVORA_RECOVERY_SMTP_PORT:'32124'});
 expect(()=>ownedMailEnvironment(origin,{recoverySmtpPort:32124,invitationSmtpPort:32125})).toThrow('same owned transport');
});
it.each([0,-1,65536,1.5,NaN,Infinity])('invalid invitation port %s is rejected before any application/database allocation',async port=>{
 expect(()=>ownedMailEnvironment(origin,{invitationSmtpPort:port})).toThrow('Owned SMTP port');
 await expect(createOwnedNextApp('/private/tmp/never-allocated-invitation-evidence',{invitationSmtpPort:port})).rejects.toThrow('Owned SMTP port');
});
it.each(['https://127.0.0.1:32123','http://outside.example.invalid:32123','http://localhost:32123','http://user:password@127.0.0.1:32123','http://127.0.0.1:32123/path','http://127.0.0.1:32123?query=1','http://127.0.0.1:32123#fragment'])('explicit owned invitation mail refuses a non-owned origin %s',url=>{
 expect(()=>ownedMailEnvironment(url,{invitationSmtpPort:32124})).toThrow('Owned mail origin');
});
it('owned invitation environment drives the real validated adapter through ephemeral fake SMTP',async()=>{
 const smtp=await fakeInvitationSmtp();try{
  const port=Number(smtp.env.NEVORA_RECOVERY_SMTP_PORT),env=ownedMailEnvironment(origin,{invitationSmtpPort:port});
  const delivery=invitationDelivery({...env,NODE_ENV:'test'});expect(delivery).not.toBeNull();const proof=randomBytes(32).toString('base64url');
  expect(await delivery!.send({registeredEmail:'owned-recipient@example.invalid',proof,expiresAt:new Date(Date.now()+900000).toISOString()})).toEqual({providerAccepted:true});
  expect(smtp.messages).toHaveLength(1);const mail=smtp.messages[0].replace(/=\r\n/g,'').replace(/=3D/g,'=');expect(mail).toContain('To: owned-recipient@example.invalid');expect(mail).toContain(origin+'/activate#proof='+proof);expect(mail).not.toContain('/activate?');
 }finally{await smtp.close();}
});
