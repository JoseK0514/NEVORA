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
  assertOwnedInvitationMessages(smtp.messages,origin,proof);
 }finally{await smtp.close();}
});

function assertOwnedInvitationMessages(messages:string[],expectedOrigin:string,proof:string){
 // Vitest receives only numbers/booleans, including every failing path. Exact
 // whole-line equality verifies recipient, origin, path and proof boundaries.
 expect(messages.length).toBe(1);
 const lines=messages[0].replace(/=\r\n/g,'').replace(/=3D/g,'=').split(/\r?\n/);
 expect(lines.some(line=>line==='To: owned-recipient@example.invalid')).toBe(true);
 expect(lines.some(line=>line===expectedOrigin+'/activate#proof='+proof)).toBe(true);
 expect(lines.some(line=>line.includes('/activate?'))).toBe(false);
}
// This is a clearly non-live local assertion sentinel, never an issued proof or
// SMTP message. Capture formatter fields in memory; assert only sanitized facts.
const nonLiveProof='NONLIVE_ASSERTION_SENTINEL_DO_NOT_ACTIVATE_000';
const nonLiveMail=(url:string,to='owned-recipient@example.invalid')=>'NONLIVE_MAIL_BODY\r\nTo: '+to+'\r\n\r\n'+url;
const diagnosticCases=[
 {label:'message count',messages:[nonLiveMail(origin+'/activate#proof='+nonLiveProof),nonLiveMail(origin+'/activate#proof='+nonLiveProof)]},
 {label:'registered recipient',messages:[nonLiveMail(origin+'/activate#proof='+nonLiveProof,'wrong@example.invalid')]},
 {label:'owned origin',messages:[nonLiveMail('http://127.0.0.1:32124/activate#proof='+nonLiveProof)]},
 {label:'activation path',messages:[nonLiveMail(origin+'/other#proof='+nonLiveProof)]},
 {label:'proof fragment key',messages:[nonLiveMail(origin+'/activate#token='+nonLiveProof)]},
 {label:'exact generated proof',messages:[nonLiveMail(origin+'/activate#proof=NONLIVE_WRONG_PROOF')]},
 {label:'query privacy',messages:[nonLiveMail(origin+'/activate?unexpected=1#proof='+nonLiveProof)]},
 {label:'exact fragment boundary',messages:[nonLiveMail(origin+'/activate#proof='+nonLiveProof+'&unexpected=1')]},
];
it.each(diagnosticCases)('mail assertion diagnostics hide all mail/proof fields for $label failure',test=>{
 let error:unknown;try{assertOwnedInvitationMessages(test.messages,origin,nonLiveProof);}catch(caught){error=caught;}
 expect(error instanceof Error).toBe(true);
 const diagnostics=String(error)+'\n'+JSON.stringify(error,Object.getOwnPropertyNames(error));
 expect(diagnostics.includes(nonLiveProof)).toBe(false);
 expect(diagnostics.includes('NONLIVE_MAIL_BODY')).toBe(false);
});
