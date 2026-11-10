import {beforeAll,expect,it,vi} from 'vitest';
import {generateKeyPairSync} from 'node:crypto';
import {readWorkerRoutingConfig,readWorkspaceRoutingConfig} from '../workspace-routing/config.server';
import {resolveWorkspaceBinding} from '../workspace-routing/resolver.server';
import {parseManagedHostConfig,managedChildEnvironment} from './managed-host';
import {managedDestinations} from './managed-destinations';
import {workerRecipientFingerprint} from './worker-enrollment';

let privateKey:string,otherPrivate:string,publicKey:string;
const scope='11111111-1111-4111-8111-111111111111',otherScope='44444444-4444-4444-8444-444444444444',sha='a'.repeat(40),enrollmentId='22222222-2222-4222-8222-222222222222';
beforeAll(()=>{const make=()=>generateKeyPairSync('rsa',{modulusLength:3072,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}}),a=make();privateKey=a.privateKey;publicKey=a.publicKey;otherPrivate=make().privateKey;});
function env(id=scope,key=privateKey){return {NEVORA_WORKSPACE_MODE:'isolated',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_PORTAL_BASE_DOMAIN:managedDestinations.test.portalBaseDomain,NEVORA_CONTROL_DATABASE_URL:`postgresql://nv_control_worker_t_${id.replaceAll('-','')}:fictional@${managedDestinations.test.controlHostname}/${managedDestinations.test.controlDatabase}?sslmode=verify-full`,NEVORA_WORKER_ENROLLMENT_ID:enrollmentId,NEVORA_WORKER_RECIPIENT_PRIVATE_KEY:key};}
function profile(id=scope,key=privateKey){const e=env(id,key);return {scopeId:id,environment:'test',commands:['payroll'],origin:`https://fictional-${id.slice(0,4)}.${e.NEVORA_PORTAL_BASE_DOMAIN}`,portalBaseDomain:e.NEVORA_PORTAL_BASE_DOMAIN,env:{NEVORA_CONTROL_DATABASE_URL:e.NEVORA_CONTROL_DATABASE_URL,NEVORA_WORKER_ENROLLMENT_ID:enrollmentId,NEVORA_WORKER_RECIPIENT_PRIVATE_KEY:key,NEVORA_COMMERCE_API_ORIGIN:managedDestinations.test.commerceOrigin,NEVORA_COMMERCE_ENABLED:'true',NEVORA_PAYROLL_ENABLED:'true'}};}
function host(profiles:unknown[]){return {NEVORA_WORKFORCE_ENABLED:'true',NEVORA_WORKFORCE_SOURCE_SHA:sha,NEVORA_WORKFORCE_HEALTH_KEY:Buffer.alloc(32,14).toString('base64url'),NEVORA_WORKFORCE_STATE_DIR:'/owned/worker-state',NEVORA_WORKFORCE_PROFILES:JSON.stringify(profiles)};}
it('admits an explicit enrolled WORKER config with no shared root or browser capability',()=>{
 const c=readWorkerRoutingConfig(env());expect(c.secretScope).toBe('WORKER_ENROLLED');expect(c).toMatchObject({enrollmentId,recipientPrivateKey:privateKey,recipientFingerprint:workerRecipientFingerprint(privateKey)});
 expect(c).not.toHaveProperty('encryptionKey');expect(c).not.toHaveProperty('tokenKey');expect(()=>readWorkspaceRoutingConfig(env())).toThrow('Workspace is unavailable');
});
it.each(['NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY','NEVORA_WORKSPACE_TOKEN_SECRET','NEVORA_COMMERCE_BINDING_KEY','NEVORA_COMMERCE_WORKER_BINDING_KEY'])('refuses mixed or present-but-empty %s custody',field=>{
 for(const value of ['',Buffer.alloc(32,2).toString('base64url')])expect(()=>readWorkerRoutingConfig({...env(),[field]:value})).toThrow('Workspace is unavailable');
});
it('refuses incomplete enrollment, public keys, malformed IDs and production',()=>{
 for(const patch of [{NEVORA_WORKER_ENROLLMENT_ID:undefined},{NEVORA_WORKER_RECIPIENT_PRIVATE_KEY:undefined},{NEVORA_WORKER_RECIPIENT_PRIVATE_KEY:publicKey},{NEVORA_WORKER_ENROLLMENT_ID:'invalid'},{NEVORA_ONBOARDING_ENVIRONMENT:'production'}])expect(()=>readWorkerRoutingConfig({...env(),...patch})).toThrow('Workspace is unavailable');
});
it('rejects APP and BOOTSTRAP before looking up any protected source',async()=>{
 const query=vi.fn(async()=>({rows:[],rowCount:0})),transaction=vi.fn(async()=>{throw Error('must_not_read');}),store={query,transaction},c=readWorkerRoutingConfig(env());
 for(const purpose of ['APP','BOOTSTRAP'] as const)await expect(resolveWorkspaceBinding({origin:profile().origin},store,c,purpose)).rejects.toThrow('Workspace is unavailable');expect(query).not.toHaveBeenCalled();expect(transaction).not.toHaveBeenCalled();
});
it('curates enrolled host profiles without synthesizing or passing shared roots',()=>{
 const config=parseManagedHostConfig(host([profile()]),sha,managedDestinations),child=managedChildEnvironment(config.profiles[0],{PATH:'/owned/bin',NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY:'ambient-root',NEVORA_COMMERCE_WORKER_BINDING_KEY:'ambient-worker-root'});
 expect(child.NEVORA_WORKER_ENROLLMENT_ID).toBe(enrollmentId);expect(child.NEVORA_WORKER_RECIPIENT_PRIVATE_KEY).toBe(privateKey);
 expect(child).not.toHaveProperty('NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY');expect(child).not.toHaveProperty('NEVORA_COMMERCE_WORKER_BINDING_KEY');
 expect(parseManagedHostConfig(host([profile(),profile(otherScope,otherPrivate)]),sha,managedDestinations).profiles).toHaveLength(2);
 expect(()=>parseManagedHostConfig(host([profile(),profile(otherScope)]),sha,managedDestinations)).toThrow('managed_configuration_invalid');
});
