import {beforeAll,expect,it,vi} from 'vitest';
import {generateKeyPairSync} from 'node:crypto';
import {workerRecipientFingerprint} from './worker-enrollment';
import {parseWorkerEnrollmentRequest,processWorkerEnrollmentOnce,workerEnrollmentRequestHash,type WorkerEnrollmentRequest} from './worker-enrollment-store';
let request:WorkerEnrollmentRequest,privateKey:string;
beforeAll(()=>{
 const pair=generateKeyPairSync('rsa',{modulusLength:3072,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});privateKey=pair.privateKey;
 request={schemaVersion:1,enrollmentId:'22222222-2222-4222-8222-222222222222',workspaceId:'11111111-1111-4111-8111-111111111111',environment:'test',incarnation:'1',registryRevision:'1',sourceSecretRef:'33333333-3333-4333-8333-333333333333',loginRole:'nv_worker_aaaaaaaaaaaaaaaaaaaaaaaa',canonicalOrigin:'https://fictional.portal-staging.nevora.team',providerProjectId:'fictional-project',recipientFingerprint:workerRecipientFingerprint(pair.publicKey),recipientPublicKey:pair.publicKey,issuerSourceSha:'a'.repeat(40),requestExpiresAt:'2026-11-09T12:10:00.123Z',expiresAt:'2026-11-09T13:00:00.123Z'};
});
it('hashes a strict canonical public request independently of caller property order',()=>{
 expect(workerEnrollmentRequestHash(request)).toMatch(/^[a-f0-9]{64}$/);
 expect(workerEnrollmentRequestHash(Object.fromEntries(Object.entries(request).reverse()))).toBe(workerEnrollmentRequestHash(request));
 expect(workerEnrollmentRequestHash({...request,registryRevision:'2'})).not.toBe(workerEnrollmentRequestHash(request));
});
it.each(['not-a-date','2026-11-09T12:10:00Z','2026-11-10T13:00:00.123Z'])('redacts an invalid request deadline %s',requestExpiresAt=>{
 expect(()=>parseWorkerEnrollmentRequest({...request,requestExpiresAt})).toThrow(/^worker_enrollment_invalid$/);
});
it('never stores a private recipient key in the public request, and rejects extra fields',()=>{
 expect(()=>parseWorkerEnrollmentRequest({...request,recipientPublicKey:privateKey})).toThrow(/^worker_enrollment_invalid$/);
 expect(()=>parseWorkerEnrollmentRequest({...request,extra:'unexpected'})).toThrow(/^worker_enrollment_invalid$/);
 expect(()=>parseWorkerEnrollmentRequest({...request,registryRevision:'01'})).toThrow(/^worker_enrollment_invalid$/);
});
it('rejects empty, duplicate, excessive or unbound requests before opening a database connection',async()=>{
 const connect=vi.fn(async()=>{throw Error('must_not_connect');}),db={connect},binding={id:request.enrollmentId,requestHash:workerEnrollmentRequestHash(request)},root=Buffer.alloc(32,1).toString('base64url'),workerRoot=Buffer.alloc(32,2).toString('base64url');
 for(const selected of [[],[binding,binding],[binding,binding,binding],[{...binding,requestHash:'invalid'}]])await expect(processWorkerEnrollmentOnce(db,selected,request.issuerSourceSha,root,workerRoot,async()=>{throw Error('must_not_probe');})).rejects.toThrow(/^worker_enrollment_invalid$/);
 await expect(processWorkerEnrollmentOnce(db,[binding],request.issuerSourceSha,root,root,async()=>{throw Error('must_not_probe');})).rejects.toThrow(/^worker_enrollment_invalid$/);expect(connect).not.toHaveBeenCalled();
});
