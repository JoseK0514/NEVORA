import { expect, it } from 'vitest';
async function api() { const m = await import('./installation').catch(() => ({})); expect(m).toHaveProperty('createInstallationProof'); return m as typeof import('./installation'); }
const key = Buffer.alloc(32, 7);
const now = new Date('2026-10-02T12:00:00Z');
it('server_issued_installation_cookie_is_signed_and_environment_bound', async () => { const m = await api(); const a = m.createInstallationProof('test'); const b = m.createInstallationProof('test'); expect(a.installationHash).not.toBe(b.installationHash); const value = m.sealInstallationProof(a, key); const cookies = { get: () => ({ value }) }; expect(m.readInstallationProof(cookies, key, 'test')).toEqual(a); expect(m.readInstallationProof(cookies, key, 'production')).toBeNull(); expect(m.readInstallationProof({ get: () => ({ value: value + 'x' }) }, key, 'test')).toBeNull(); });
it('cleanup_receipts_are_bounded_tamper_resistant_and_purpose_separated', async () => { const m = await api(); const proof = m.createInstallationProof('test'); const receipt = { ...proof, sessionHash: 'a'.repeat(64), issuedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 3600000).toISOString() }; const value = m.sealCleanupReceipt(receipt, key); expect(value).not.toContain(proof.installationHash); expect(m.openCleanupReceipt(value, key, now)).toEqual(receipt); expect(m.openCleanupReceipt(value + 'x', key, now)).toBeNull(); expect(m.openCleanupReceipt(value, Buffer.alloc(32, 8), now)).toBeNull(); expect(m.openCleanupReceipt(value, key, new Date(receipt.expiresAt))).toBeNull(); expect(() => m.sealCleanupReceipt({ ...receipt, expiresAt: new Date(now.getTime() + 15 * 86400000).toISOString() }, key)).toThrow(); expect(m.openCleanupReceipt(m.sealInstallationProof(proof, key), key, now)).toBeNull(); });
it('subscription_encryption_roundtrips_and_rejects_tampering_and_context_swap', async () => { const m = await api(); const proof = m.createInstallationProof('test'); const material = { endpoint: 'https://fcm.googleapis.com/fcm/send/fictional', keys: { p256dh: 'fictional', auth: 'fictional' }, expirationTime: null }; const ciphertext = m.encryptSubscriptionMaterial(material, key, proof); expect(ciphertext).not.toContain('fictional'); expect(m.decryptSubscriptionMaterial(ciphertext, key, proof)).toEqual(material); expect(() => m.decryptSubscriptionMaterial(ciphertext + 'x', key, proof)).toThrow(); expect(() => m.decryptSubscriptionMaterial(ciphertext, key, { ...proof, environment: 'production' })).toThrow(); });
it('cleanup_session_revocation_purpose_is_authenticated_and_shape_validated', async () => {
    const m = await api();
    const receipt = { ...m.createInstallationProof('test'), sessionHash: 'a'.repeat(64), issuedAt: now.toISOString(), expiresAt: '2026-10-03T12:00:00Z', revokeSession: true };
    const sealed = m.sealCleanupReceipt(receipt, key);
    expect(m.openCleanupReceipt(sealed, key, now)?.revokeSession).toBe(true);
    expect(m.openCleanupReceipt(sealed.slice(0, -1) + (sealed.endsWith('x') ? 'y' : 'x'), key, now)).toBeNull();
    expect(() => m.sealCleanupReceipt({ ...receipt, revokeSession: 'true' as unknown as boolean }, key)).toThrow();
});
it('associated_session_and_bundle_revocations_are_shape_lifetime_and_capacity_bound',async()=>{
    const m=await api();const proof=m.createInstallationProof();
    expect(()=>m.sealInstallationProof({...proof,associatedSessionHash:'invalid'},key)).toThrow();
    const associated={...proof,associatedSessionHash:'a'.repeat(64)};
    const sealed=m.sealInstallationProof(associated,key);
    expect(m.readInstallationProof({get:()=>({value:sealed})},key)).toEqual(associated);
    const receipt={...associated,sessionHash:'a'.repeat(64),revokeSession:true,issuedAt:now.toISOString(),expiresAt:'2026-10-03T12:00:00Z'};
    const entries=Array.from({length:7},(_,i)=>({sessionHash:String(i+1).repeat(64),issuedAt:now.toISOString(),expiresAt:'2026-10-03T12:00:00Z'}));
    const bundle=m.sealCleanupReceipt({...receipt,sessionRevocations:entries},key);
    expect(Buffer.byteLength(bundle,'utf8')).toBeLessThan(3072);
    expect(m.openCleanupReceipt(bundle,key,now)?.sessionRevocations).toEqual(entries);
    expect(()=>m.sealCleanupReceipt({...receipt,sessionRevocations:[...entries,{sessionHash:'9'.repeat(64),issuedAt:now.toISOString(),expiresAt:'2026-10-03T12:00:00Z'}]},key)).toThrow();
    expect(()=>m.sealCleanupReceipt({...receipt,sessionRevocations:[{...entries[0],sessionHash:'invalid'}]},key)).toThrow();
    expect(()=>m.sealCleanupReceipt({...receipt,sessionRevocations:[{...entries[0],expiresAt:'2026-10-20T12:00:00Z'}]},key)).toThrow();
    expect(()=>m.sealCleanupReceipt({...receipt,sessionRevocations:[entries[0],entries[0]]},key)).toThrow();
});
it('protected_association_and_revocation_fields_reject_array_coercion', async () => {
    const m = await api(); const proof = m.createInstallationProof();
    expect(() => m.sealInstallationProof({ ...proof, associatedSessionHash: ['a'.repeat(64)] as unknown as string }, key)).toThrow();
    const receipt = { ...proof, sessionHash: 'a'.repeat(64), issuedAt: now.toISOString(), expiresAt: '2026-10-03T12:00:00Z' };
    expect(() => m.sealCleanupReceipt({ ...receipt, sessionRevocations: [{ sessionHash: ['b'.repeat(64)] as unknown as string, issuedAt: now.toISOString(), expiresAt: receipt.expiresAt }] }, key)).toThrow();
});
