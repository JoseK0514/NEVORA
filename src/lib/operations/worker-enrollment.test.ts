import {beforeAll,expect,it} from 'vitest';
import {generateKeyPairSync} from 'node:crypto';
import {openWorkerEnrollment,sealWorkerEnrollment,workerRecipientFingerprint,type WorkerEnrollmentIdentity,type WorkerEnrollmentMaterial} from './worker-enrollment';

const now=Date.parse('2026-11-09T12:00:00.000Z');
let recipient:ReturnType<typeof rsa>,other:ReturnType<typeof rsa>,identity:WorkerEnrollmentIdentity;
function rsa(bits=3072){return generateKeyPairSync('rsa',{modulusLength:bits,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});}
const material:WorkerEnrollmentMaterial={databaseUrl:'postgresql://nv_worker_aaaaaaaaaaaaaaaaaaaaaaaa:fictional-private-password@ep-fictional.us-east-1.aws.neon.tech/nv_app_11111111111141118111111111111111?sslmode=verify-full',commerceWorkerSecret:Buffer.alloc(32,91).toString('base64url')};
beforeAll(()=>{
 recipient=rsa();other=rsa();
 identity={schemaVersion:1,enrollmentId:'22222222-2222-4222-8222-222222222222',workspaceId:'11111111-1111-4111-8111-111111111111',environment:'test',incarnation:'1',sourceSecretRef:'33333333-3333-4333-8333-333333333333',loginRole:'nv_worker_aaaaaaaaaaaaaaaaaaaaaaaa',canonicalOrigin:'https://fictional.portal-staging.nevora.team',providerProjectId:'fictional-project',recipientFingerprint:workerRecipientFingerprint(recipient.publicKey),issuerSourceSha:'a'.repeat(40),expiresAt:new Date(now+3600000).toISOString()};
});
it('round-trips the real company-only payload with fresh independent encryption randomness',()=>{
 const a=sealWorkerEnrollment(identity,material,recipient.publicKey),b=sealWorkerEnrollment(identity,material,recipient.publicKey);
 expect(openWorkerEnrollment(identity,a,recipient.privateKey,now)).toEqual(material);expect(openWorkerEnrollment(identity,b,recipient.privateKey,now)).toEqual(material);
 expect(a).not.toEqual(b);expect(a.schemaVersion).toBe(1);expect(Buffer.from(a.keyEnvelope,'base64url')).toHaveLength(384);
 const serialized=JSON.stringify(a);for(const secret of [material.databaseUrl,material.commerceWorkerSecret,recipient.privateKey,'fictional-private-password'])expect(serialized).not.toContain(secret);
});
it('binds the recipient fingerprint and refuses another real private key',()=>{
 expect(workerRecipientFingerprint(recipient.privateKey)).toBe(identity.recipientFingerprint);expect(workerRecipientFingerprint(other.publicKey)).not.toBe(identity.recipientFingerprint);
 const envelope=sealWorkerEnrollment(identity,material,recipient.publicKey);expect(openWorkerEnrollment(identity,envelope,other.privateKey,now)).toBeNull();
 expect(()=>sealWorkerEnrollment(identity,material,other.publicKey)).toThrow('worker_enrollment_invalid');
});
it.each([
 ['enrollmentId','44444444-4444-4444-8444-444444444444'],['workspaceId','44444444-4444-4444-8444-444444444444'],['environment','production'],['incarnation','2'],['sourceSecretRef','44444444-4444-4444-8444-444444444444'],['loginRole','nv_worker_bbbbbbbbbbbbbbbbbbbbbbbb'],['canonicalOrigin','https://other.portal-staging.nevora.team'],['providerProjectId','other-project'],['recipientFingerprint','b'.repeat(64)],['issuerSourceSha','b'.repeat(40)],['expiresAt',new Date(now+3600001).toISOString()],
])('authenticates identity field %s as encryption context',(field,value)=>{
 const envelope=sealWorkerEnrollment(identity,material,recipient.publicKey);
 expect(openWorkerEnrollment({...identity,[field]:value},envelope,recipient.privateKey,now)).toBeNull();
});
it('rejects tampered ciphertext, key envelopes, unknown fields and unsupported schema versions',()=>{
 const envelope=sealWorkerEnrollment(identity,material,recipient.publicKey),flip=(s:string)=>(s[0]==='A'?'B':'A')+s.slice(1);
 expect(openWorkerEnrollment(identity,{...envelope,keyEnvelope:flip(envelope.keyEnvelope)},recipient.privateKey,now)).toBeNull();
 const parts=envelope.ciphertext.split('.');parts[2]=flip(parts[2]);expect(openWorkerEnrollment(identity,{...envelope,ciphertext:parts.join('.')},recipient.privateKey,now)).toBeNull();
 for(const bad of [{...envelope,extra:'unexpected'},{...envelope,schemaVersion:2},{...envelope,keyEnvelope:envelope.keyEnvelope+'='},[],null])expect(openWorkerEnrollment(identity,bad,recipient.privateKey,now)).toBeNull();
 const badIdentity={...identity,extra:'unexpected'},badMaterial={...material,extra:'unexpected'};
 expect(()=>sealWorkerEnrollment(badIdentity,material,recipient.publicKey)).toThrow('worker_enrollment_invalid');expect(()=>sealWorkerEnrollment(identity,badMaterial,recipient.publicKey)).toThrow('worker_enrollment_invalid');
});
it('enforces runtime expiry at the exact boundary and rejects invalid clocks',()=>{
 const envelope=sealWorkerEnrollment(identity,material,recipient.publicKey),expiry=Date.parse(identity.expiresAt);
 expect(openWorkerEnrollment(identity,envelope,recipient.privateKey,expiry-1)).toEqual(material);expect(openWorkerEnrollment(identity,envelope,recipient.privateKey,expiry)).toBeNull();
 for(const t of [NaN,Infinity,-1])expect(openWorkerEnrollment(identity,envelope,recipient.privateKey,t)).toBeNull();
});
it.each([
 'http://nv_worker_aaaaaaaaaaaaaaaaaaaaaaaa:secret@ep-fictional.neon.tech/nv_app_11111111111141118111111111111111?sslmode=verify-full',
 material.databaseUrl.replace('sslmode=verify-full','sslmode=require'),
 material.databaseUrl+'&options=-c%20role%3Downer',
 material.databaseUrl+'&sslmode=disable',
 material.databaseUrl.replace('nv_worker_aaaaaaaaaaaaaaaaaaaaaaaa','nv_app_aaaaaaaaaaaaaaaaaaaaaaaa'),
 material.databaseUrl.replace('ep-fictional.us-east-1.aws.neon.tech','other.invalid'),
 material.databaseUrl.replace('nv_app_11111111111141118111111111111111','nv_app_44444444444444448444444444444444'),
 material.databaseUrl.replace(':fictional-private-password@','@'),
 material.databaseUrl+'#private',
])('rejects an unqualified database credential without echoing it',databaseUrl=>{
 expect(()=>sealWorkerEnrollment(identity,{...material,databaseUrl},recipient.publicKey)).toThrow(/^worker_enrollment_invalid$/);
});
it('rejects malformed, noncanonical or oversized identity and secret material',()=>{
 for(const patch of [{incarnation:'0'},{workspaceId:identity.workspaceId.toUpperCase()},{expiresAt:'2026-11-09T13:00:00Z'},{providerProjectId:'x'.repeat(129)},{schemaVersion:2},{enrollmentId:'not-an-id'}]){
  // The all-digit fixture UUID is already canonical; use a lettered UUID here.
  const changed=patch.workspaceId?{workspaceId:'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'}:patch;
  expect(()=>sealWorkerEnrollment({...identity,...changed},material,recipient.publicKey)).toThrow(/^worker_enrollment_invalid$/);
 }
 for(const secret of ['',Buffer.alloc(31).toString('base64url'),material.commerceWorkerSecret+'='])expect(()=>sealWorkerEnrollment(identity,{...material,commerceWorkerSecret:secret},recipient.publicKey)).toThrow(/^worker_enrollment_invalid$/);
 expect(()=>sealWorkerEnrollment(identity,{...material,databaseUrl:'x'.repeat(9000)},recipient.publicKey)).toThrow(/^worker_enrollment_invalid$/);
});
it('requires canonical RSA3072 recipient keys and redacts key parsing errors',()=>{
 const small=rsa(2048),ed=generateKeyPairSync('ed25519',{publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
 for(const key of [small.publicKey,ed.publicKey,recipient.publicKey+recipient.publicKey,'fictional-key-secret', 'x'.repeat(9000)])expect(()=>workerRecipientFingerprint(key)).toThrow(/^worker_enrollment_invalid$/);
 const envelope=sealWorkerEnrollment(identity,material,recipient.publicKey);expect(openWorkerEnrollment(identity,envelope,recipient.publicKey,now)).toBeNull();expect(openWorkerEnrollment(identity,envelope,recipient.privateKey+'\n',now)).toBeNull();
});
