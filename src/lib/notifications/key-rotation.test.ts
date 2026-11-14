import {expect,it} from 'vitest';
import {createECDH} from 'node:crypto';
import * as protection from './installation';
import {parseNotificationRuntimeConfig} from './runtime-config';

const oldKey=Buffer.alloc(32,31),newKey=Buffer.alloc(32,47);
// Existing APIs gain a bounded keyring while retaining their raw-key v1 contract.
const keyring={active:{id:'new-key',key:newKey},previous:{id:'old-key',key:oldKey},legacyKeyId:'old-key'};
const ring=keyring;
const proof=protection.createInstallationProof('test'),now=new Date('2026-11-10T12:00:00Z');
const material={endpoint:'https://fcm.googleapis.com/fcm/send/fictional-rotation',expirationTime:null,keys:{p256dh:'fictional',auth:'fictional'}};
const receipt={...proof,sessionHash:'a'.repeat(64),issuedAt:now.toISOString(),expiresAt:'2026-11-11T12:00:00Z',revokeSession:true};

it('encrypts new subscription, installation and signed cleanup material with authenticated active key ID',()=>{
 const cipher=protection.encryptSubscriptionMaterial(material,ring,proof);expect(cipher).toMatch(/^v2\.new-key\./);
 expect(protection.decryptSubscriptionMaterial(cipher,ring,proof)).toEqual(material);
 const cookie=protection.sealInstallationProof(proof,ring);expect(cookie).toMatch(/^v2\.new-key\./);
 expect(protection.readInstallationProof({get:()=>({value:cookie})},ring,'test')).toEqual(proof);
 const cleanup=protection.sealCleanupReceipt(receipt,ring);expect(cleanup).toMatch(/^v2\.new-key\./);
 expect(protection.openCleanupReceipt(cleanup,ring,now)).toEqual(receipt);
});
it('continues legacy v1 subscription, installation and cleanup reads through one explicit legacy key',()=>{
 expect(protection.decryptSubscriptionMaterial(protection.encryptSubscriptionMaterial(material,oldKey,proof),ring,proof)).toEqual(material);
 const cookie=protection.sealInstallationProof(proof,oldKey);
 expect(protection.readInstallationProof({get:()=>({value:cookie})},ring,'test')).toEqual(proof);
 expect(protection.openCleanupReceipt(protection.sealCleanupReceipt(receipt,oldKey),ring,now)).toEqual(receipt);
});
it('reads prior v2 material and rejects key-ID substitution, context and purpose swaps',()=>{
 const oldRing={active:{id:'old-key',key:oldKey}};
 const cipher=protection.encryptSubscriptionMaterial(material,oldRing,proof);
 expect(protection.decryptSubscriptionMaterial(cipher,ring,proof)).toEqual(material);
 expect(()=>protection.decryptSubscriptionMaterial(cipher.replace('.old-key.','.new-key.'),ring,proof)).toThrow();
 expect(()=>protection.decryptSubscriptionMaterial(cipher,ring,{...proof,environment:'production'})).toThrow();
 expect(protection.readInstallationProof({get:()=>({value:cipher})},ring)).toBeNull();
});
it('rewraps legacy ciphertext with unchanged ownership/data then refuses old material after explicit retirement',()=>{
 const legacy=protection.encryptSubscriptionMaterial(material,oldKey,proof);
 const migrated=protection.encryptSubscriptionMaterial(protection.decryptSubscriptionMaterial(legacy,ring,proof),ring,proof);
 const retired={active:keyring.active};
 expect(protection.decryptSubscriptionMaterial(migrated,retired,proof)).toEqual(material);
 expect(()=>protection.decryptSubscriptionMaterial(legacy,retired,proof)).toThrow();
 expect(protection.openCleanupReceipt(protection.sealCleanupReceipt(receipt,oldKey),retired,now)).toBeNull();
 expect(protection.readInstallationProof({get:()=>({value:protection.sealInstallationProof(proof,oldKey)})},retired)).toBeNull();
 expect(()=>protection.decryptSubscriptionMaterial(protection.encryptSubscriptionMaterial(material,{active:keyring.previous},proof),retired,proof)).toThrow();
});
it('refuses tampered or expired v2 cleanup without exposing or completing the obligation',()=>{
 const sealed=protection.sealCleanupReceipt(receipt,ring);
 expect(protection.openCleanupReceipt(sealed.replace('.new-key.','.old-key.'),ring,now)).toBeNull();
 expect(protection.openCleanupReceipt(sealed+'x',ring,now)).toBeNull();
 expect(protection.openCleanupReceipt(sealed,ring,new Date(receipt.expiresAt))).toBeNull();
});
function env(){const ec=createECDH('prime256v1');ec.setPrivateKey(Buffer.alloc(32,1));return {
 PUSH_ENVIRONMENT:'test',FUEL_PORTAL_ORIGIN:'https://fixture.example',PUSH_FEATURE_ENABLED:'true',
 PUSH_SUBSCRIPTION_ENCRYPTION_KEY:newKey.toString('base64url'),PUSH_VAPID_PUBLIC_KEY:ec.getPublicKey().toString('base64url'),
 PUSH_SUBSCRIPTION_ENCRYPTION_KEY_ID:'new-key',PUSH_SUBSCRIPTION_PREVIOUS_KEY:oldKey.toString('base64url'),PUSH_SUBSCRIPTION_PREVIOUS_KEY_ID:'old-key',PUSH_SUBSCRIPTION_LEGACY_KEY_ID:'old-key',
};}
it.each([
 {PUSH_SUBSCRIPTION_ENCRYPTION_KEY_ID:''}, {PUSH_SUBSCRIPTION_PREVIOUS_KEY:'invalid'},
 {PUSH_SUBSCRIPTION_PREVIOUS_KEY_ID:'new-key'}, {PUSH_SUBSCRIPTION_LEGACY_KEY_ID:'unknown'},
 {PUSH_SUBSCRIPTION_PREVIOUS_KEY:newKey.toString('base64url')},
])('disables features for ambiguous or partial key rotation configuration %j',patch=>{
 expect(parseNotificationRuntimeConfig({...env(),...patch}).featureEnabled).toBe(false);
});
