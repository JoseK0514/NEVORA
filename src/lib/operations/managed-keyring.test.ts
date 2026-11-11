import {beforeAll,expect,it} from 'vitest';
import {createECDH,generateKeyPairSync} from 'node:crypto';
import {parseManagedHostConfig,managedChildEnvironment} from './managed-host';
import {managedDestinations} from './managed-destinations';
import type {WorkerCommand} from './supervisor';
import {readNotificationConfig} from '../notifications/config';
import {subscriptionProtection} from '../notifications/keyring';
import {createInstallationProof,sealInstallationProof,readInstallationProof,sealCleanupReceipt,encryptSubscriptionMaterial,decryptSubscriptionMaterial} from '../notifications/installation';
import {createLogoutDeps} from '../notifications/logout';

const source='a'.repeat(40),scope='11111111-1111-4111-8111-111111111111';
const previous=Buffer.alloc(32,31),active=Buffer.alloc(32,47);
let recipient:string;
beforeAll(()=>{recipient=generateKeyPairSync('rsa',{modulusLength:3072,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}}).privateKey;});
function push(){const pair=createECDH('prime256v1');pair.setPrivateKey(Buffer.alloc(32,1));return {
 PUSH_FEATURE_ENABLED:'true',PUSH_DELIVERY_ENABLED:'true',PUSH_TEST_DELIVERY_ENABLED:'true',PUSH_TEST_ACCOUNT_IDS:'FICTIONAL-1',NOTIFICATION_WORKER_SECRET:'fictional-'.repeat(5),
 PUSH_SUBSCRIPTION_ENCRYPTION_KEY:active.toString('base64url'),PUSH_VAPID_PUBLIC_KEY:pair.getPublicKey().toString('base64url'),PUSH_VAPID_PRIVATE_KEY:pair.getPrivateKey().toString('base64url'),PUSH_VAPID_SUBJECT:'mailto:fictional@example.test',
};}
function rotation(){return {PUSH_SUBSCRIPTION_ENCRYPTION_KEY_ID:'active-key',PUSH_SUBSCRIPTION_PREVIOUS_KEY:previous.toString('base64url'),PUSH_SUBSCRIPTION_PREVIOUS_KEY_ID:'previous-key',PUSH_SUBSCRIPTION_LEGACY_KEY_ID:'previous-key'};}
function profile(commands:WorkerCommand[]=['notifications-dispatch'],withRotation=true){return {
 scopeId:scope,environment:'test',commands,origin:`https://fictional.${managedDestinations.test.portalBaseDomain}`,portalBaseDomain:managedDestinations.test.portalBaseDomain,
 env:{NEVORA_CONTROL_DATABASE_URL:`postgresql://nv_control_worker_t_${scope.replaceAll('-','')}:fictional@${managedDestinations.test.controlHostname}/${managedDestinations.test.controlDatabase}?sslmode=verify-full`,
  NEVORA_WORKER_ENROLLMENT_ID:'22222222-2222-4222-8222-222222222222',NEVORA_WORKER_RECIPIENT_PRIVATE_KEY:recipient,
  NEVORA_COMMERCE_API_ORIGIN:managedDestinations.test.commerceOrigin,NEVORA_COMMERCE_ENABLED:'true',NEVORA_PAYROLL_ENABLED:'true',...push(),...(withRotation?rotation():{})} as Record<string,string>,
};}
function host(p=profile()){return {NEVORA_WORKFORCE_ENABLED:'true',NEVORA_WORKFORCE_SOURCE_SHA:source,NEVORA_WORKFORCE_STATE_DIR:'/owned/fictional-worker-state',NEVORA_WORKFORCE_HEALTH_KEY:Buffer.alloc(32,14).toString('base64url'),NEVORA_WORKFORCE_PROFILES:JSON.stringify([p])};}
function parsed(p=profile()){return parseManagedHostConfig(host(p),source,managedDestinations).profiles[0];}
it.each(['notifications-dispatch','notifications-reminders'] as const)('propagates the scoped rotation ring through the real %s child and recovery config',command=>{
 const child=managedChildEnvironment(parsed(profile([command])),{PATH:'/owned/bin',PUSH_SUBSCRIPTION_PREVIOUS_KEY:'untrusted-ambient',PUSH_UNRELATED_SECRET:'untrusted-ambient'},command);
 expect(child).not.toHaveProperty('PUSH_UNRELATED_SECRET');
 const runtime=readNotificationConfig(child);expect(runtime.featureEnabled&&runtime.deliveryEnabled&&runtime.testDeliveryEnabled).toBe(true);
 const protection=subscriptionProtection(runtime);expect(protection!==null).toBe(true);
 const proof=createInstallationProof('test'),material={endpoint:'https://fcm.googleapis.com/fcm/send/fictional',expirationTime:null,keys:{p256dh:'fictional',auth:'fictional'}};
 const legacy=encryptSubscriptionMaterial(material,previous,proof);
 expect(decryptSubscriptionMaterial(legacy,protection!,proof)).toEqual(material);
 expect(encryptSubscriptionMaterial(material,protection!,proof).startsWith('v2.active-key.')).toBe(true);
 expect(readInstallationProof({get:()=>({value:sealInstallationProof(proof,previous)})},protection!,'test')).toEqual(proof);
 // Actual recovery factory: constructs lazy storage adapters but performs no IO.
 const recovery=createLogoutDeps(runtime),now=new Date(),receipt={...proof,sessionHash:'a'.repeat(64),issuedAt:now.toISOString(),expiresAt:new Date(now.getTime()+60000).toISOString(),revokeSession:true};
 expect(recovery.openReceipt(sealCleanupReceipt(receipt,previous))).toEqual(receipt);
 expect(recovery.sealReceipt(receipt)?.startsWith('v2.active-key.')).toBe(true);
});
it('keeps push custody out of the payroll command of an otherwise valid mixed legacy profile',()=>{
 const p=parsed(profile(['payroll','notifications-dispatch'],false));
 const child=managedChildEnvironment(p,{PATH:'/owned/bin',PUSH_SUBSCRIPTION_ENCRYPTION_KEY:'ambient',NOTIFICATION_WORKER_SECRET:'ambient'},'payroll');
 expect(Object.keys(child).filter(k=>k.startsWith('PUSH_')||k==='NOTIFICATION_WORKER_SECRET')).toEqual([]);
});
it('keeps the labelled ring only in notification children of a mixed profile',()=>{
 const p=parsed(profile(['payroll','notifications-dispatch','notifications-reminders']));
 const payroll=managedChildEnvironment(p,{},'payroll');expect(Object.keys(payroll).some(k=>k.startsWith('PUSH_')||k==='NOTIFICATION_WORKER_SECRET')).toBe(false);
 for(const command of ['notifications-dispatch','notifications-reminders'] as const)expect(readNotificationConfig(managedChildEnvironment(p,{},command)).deliveryEnabled).toBe(true);
 expect(()=>managedChildEnvironment(p,{})).toThrow('managed_configuration_invalid');
});
it('preserves explicit key retirement without borrowing an old key from the ambient host',()=>{
 const p=profile();delete p.env.PUSH_SUBSCRIPTION_PREVIOUS_KEY;delete p.env.PUSH_SUBSCRIPTION_PREVIOUS_KEY_ID;delete p.env.PUSH_SUBSCRIPTION_LEGACY_KEY_ID;
 const child=managedChildEnvironment(parsed(p),rotation(),'notifications-dispatch');
 const protection=subscriptionProtection(readNotificationConfig(child));expect(protection!==null).toBe(true);
 const proof=createInstallationProof('test'),legacy=encryptSubscriptionMaterial({fictional:true},previous,proof);
 expect(()=>decryptSubscriptionMaterial(legacy,protection!,proof)).toThrow();
 expect(child).not.toHaveProperty('PUSH_SUBSCRIPTION_PREVIOUS_KEY');
});
it('rejects notification credentials attached to a payroll-only profile and an unadmitted command selector',()=>{
 expect(()=>parsed(profile(['payroll'],false))).toThrow('managed_configuration_invalid');
 const p=profile(['payroll'],false);for(const k of Object.keys(p.env))if(k.startsWith('PUSH_')||k==='NOTIFICATION_WORKER_SECRET')delete p.env[k];
 const payroll=parsed(p);expect(()=>managedChildEnvironment(payroll,{},'notifications-dispatch')).toThrow('managed_configuration_invalid');
 expect(managedChildEnvironment(payroll,{PUSH_SUBSCRIPTION_PREVIOUS_KEY:'ambient'},'payroll')).not.toHaveProperty('PUSH_SUBSCRIPTION_PREVIOUS_KEY');
});
const invalidRings:[string,Record<string,string|undefined>][]=[
 ['missing previous key',{PUSH_SUBSCRIPTION_PREVIOUS_KEY:undefined}],['missing previous ID',{PUSH_SUBSCRIPTION_PREVIOUS_KEY_ID:undefined}],
 ['malformed previous key',{PUSH_SUBSCRIPTION_PREVIOUS_KEY:'invalid'}],['same IDs',{PUSH_SUBSCRIPTION_PREVIOUS_KEY_ID:'active-key'}],
 ['same material',{PUSH_SUBSCRIPTION_PREVIOUS_KEY:active.toString('base64url')}],['unknown legacy ID',{PUSH_SUBSCRIPTION_LEGACY_KEY_ID:'unknown'}],
 ['missing active ID',{PUSH_SUBSCRIPTION_ENCRYPTION_KEY_ID:undefined}],['empty active ID',{PUSH_SUBSCRIPTION_ENCRYPTION_KEY_ID:''}],
];
it.each(invalidRings)('refuses an incomplete or invalid managed ring: %s',(_name,patch)=>{
 const p=profile();for(const [k,v] of Object.entries(patch)){if(v===undefined)delete p.env[k];else p.env[k]=v;}
 expect(()=>parsed(p)).toThrow('managed_configuration_invalid');
});
it.each(['PUSH_SUBSCRIPTION_ENCRYPTION_KEY_ID','PUSH_SUBSCRIPTION_PREVIOUS_KEY','PUSH_SUBSCRIPTION_PREVIOUS_KEY_ID','PUSH_SUBSCRIPTION_LEGACY_KEY_ID'])('does not admit top-level %s on an enrolled host',field=>{
 const e=host(profile(['notifications-dispatch'],false));expect(()=>parseManagedHostConfig({...e,[field]:'untrusted-ambient'},source,managedDestinations)).toThrow('managed_configuration_invalid');
});
