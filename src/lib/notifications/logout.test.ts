import { createHash } from 'node:crypto';
import { afterEach, expect, it, vi } from 'vitest';
import { createInstallationProof, sealInstallationProof, openCleanupReceipt, INSTALLATION_COOKIE, CLEANUP_COOKIE, sealCleanupReceipt } from './installation';
import { readNotificationConfig } from './config';
import type { InstallationProof, SubscriptionRepository } from './types';
async function api() { const m = await import('./logout').catch(() => ({})); expect(m).toHaveProperty('terminatePortalSession'); return m as typeof import('./logout'); }
const now = new Date('2026-10-02T12:00:00Z');
const key = Buffer.alloc(32, 9);
const sessionHash = createHash('sha256').update('old-session').digest('hex');
function setup() {
    const proof = createInstallationProof('test');
    const values = new Map([['fuel_session', 'old-session'], [INSTALLATION_COOKIE, sealInstallationProof(proof, key)]]);
    const cookies = { get: (name: string) => values.has(name) ? { value: values.get(name)! } : undefined, set: (name: string, value: string) => { values.set(name, value); }, delete: (name: string) => { values.delete(name); } };
    const config = readNotificationConfig({ PUSH_ENVIRONMENT: 'test', FUEL_PORTAL_ORIGIN: 'https://fuel.example', PUSH_SUBSCRIPTION_ENCRYPTION_KEY: key.toString('base64url') });
    const revoked = new Set<string>();
    const active = new Set([proof.generation, 'other-device']);
    const repo = { detach: async (input: InstallationProof) => { active.delete(input.generation); return { state: 'complete' as const }; }, reconcile: async (input: InstallationProof) => { active.delete(input.generation); return { state: 'complete' as const }; }, findInstallation: async () => null } as unknown as SubscriptionRepository;
    const deps = { clock: () => now, revokeSession: async (hash: string, _signal: AbortSignal) => { revoked.add(hash); }, subscriptions: (_signal: AbortSignal) => repo, sealReceipt: (receipt: Parameters<typeof sealCleanupReceipt>[0]) => sealCleanupReceipt(receipt, key), secureCookies: true, openReceipt: (value: string) => openCleanupReceipt(value, key, now) };
    return { proof, values, cookies, config, repo, deps, revoked, active };
}
afterEach(() => vi.useRealTimers());
it('successful_cleanup_affects_only_this_installation', async () => { const m = await api(); const s = setup(); expect(await m.terminatePortalSession({ sessionToken: 'old-session', installation: s.proof, cookies: s.cookies, deps: s.deps })).toEqual({ state: 'complete' }); expect(s.revoked.has(sessionHash)).toBe(true); expect(s.active).toEqual(new Set(['other-device'])); expect(s.values.has('fuel_session')).toBe(false); });
it('cleanup_rejection_does_not_block_signout', async () => { const m = await api(); const s = setup(); s.repo.detach = async () => { throw new Error('storage failure'); }; expect(await m.terminatePortalSession({ sessionToken: 'old-session', installation: s.proof, cookies: s.cookies, deps: s.deps })).toEqual({ state: 'pending' }); expect(s.values.has('fuel_session')).toBe(false); expect(s.revoked.has(sessionHash)).toBe(true); expect(openCleanupReceipt(s.values.get(CLEANUP_COOKIE)!, key, now)?.sessionHash).toBe(sessionHash); });
it('cleanup_timeout_does_not_block_signout', async () => { const m = await api(); const s = setup(); vi.useFakeTimers(); const signals: AbortSignal[] = []; s.deps.revokeSession = async (_hash, signal) => { signals.push(signal); return new Promise(() => { }); }; s.deps.subscriptions = (signal) => { signals.push(signal); return s.repo; }; s.repo.detach = async () => new Promise(() => { }); const done = m.terminatePortalSession({ sessionToken: 'old-session', installation: s.proof, cookies: s.cookies, deps: s.deps }); await vi.advanceTimersByTimeAsync(1000); expect(await done).toEqual({ state: 'pending' }); expect(s.values.has('fuel_session')).toBe(false); expect(signals).toHaveLength(2); expect(signals.every(signal => signal.aborted)).toBe(true); });
it('session_revocation_survives_push_transaction_failure', async () => { const m = await api(); const s = setup(); s.repo.detach = async () => { throw new Error('transaction rolled back'); }; await m.terminatePortalSession({ sessionToken: 'old-session', installation: s.proof, cookies: s.cookies, deps: s.deps }); expect(s.revoked.has(sessionHash)).toBe(true); expect(s.active.has(s.proof.generation)).toBe(true); });
it('session_delete_rejection_and_complete_storage_outage_remain_pending', async () => { const m = await api(); const s = setup(); s.deps.revokeSession = async () => { throw new Error('unavailable'); }; s.repo.detach = async () => { throw new Error('unavailable'); }; expect(await m.terminatePortalSession({ sessionToken: 'old-session', installation: s.proof, cookies: s.cookies, deps: s.deps })).toEqual({ state: 'pending' }); expect(s.values.has('fuel_session')).toBe(false); expect(s.revoked.size).toBe(0); expect(s.active.has(s.proof.generation)).toBe(true); });
it('signing_misconfiguration_retains_existing_opaque_proof', async () => { const m = await api(); const s = setup(); s.repo.detach = async () => { throw new Error('outage'); }; s.deps.sealReceipt = () => { throw new Error('missing key'); }; const opaque = s.values.get(INSTALLATION_COOKIE); expect(await m.terminatePortalSession({ sessionToken: 'old-session', cookies: s.cookies, deps: s.deps })).toEqual({ state: 'pending' }); expect(s.values.get(INSTALLATION_COOKIE)).toBe(opaque); expect(s.values.get(CLEANUP_COOKIE)).toBe(opaque); expect(s.values.has('fuel_session')).toBe(false); });
it('outage_receipt_cannot_transfer_ownership', async () => { const m = await api(); const s = setup(); s.repo.detach = async () => { throw new Error('outage'); }; await m.terminatePortalSession({ sessionToken: 'old-session', installation: s.proof, cookies: s.cookies, deps: s.deps }); s.repo.reconcile = async () => { throw new Error('outage'); }; expect(await m.reconcilePendingInstallation(s.cookies, s.config, s.deps)).toEqual({ state: 'pending' }); expect(s.values.has(CLEANUP_COOKIE)).toBe(true); expect(s.active.has(s.proof.generation)).toBe(true); });
it('verified_recovery_retries_session_revocation_and_detach_idempotently', async () => { const m = await api(); const s = setup(); s.values.set(CLEANUP_COOKIE, sealCleanupReceipt({ ...s.proof, sessionHash, revokeSession: true, issuedAt: now.toISOString(), expiresAt: '2026-10-03T12:00:00Z' }, key)); expect(await m.reconcilePendingInstallation(s.cookies, s.config, s.deps)).toEqual({ state: 'complete' }); expect(s.revoked.has(sessionHash)).toBe(true); expect(s.active).toEqual(new Set(['other-device'])); expect(await m.reconcilePendingInstallation(s.cookies, s.config, s.deps)).toEqual({ state: 'complete' }); });
it.each(['forged', 'expired', 'new_generation', 'wrong_environment'])('invalid_%s_receipt_cannot_detach', async (kind) => { const m = await api(); const s = setup(); const receipt = { ...s.proof, sessionHash, revokeSession: true, issuedAt: now.toISOString(), expiresAt: '2026-10-03T12:00:00Z' }; if (kind === 'expired') {
    receipt.issuedAt = '2026-09-30T12:00:00Z';
    receipt.expiresAt = '2026-10-01T12:00:00Z';
} if (kind === 'new_generation')
    receipt.generation = createInstallationProof().generation; if (kind === 'wrong_environment')
    receipt.environment = 'production'; s.values.set(CLEANUP_COOKIE, kind === 'forged' ? 'forged' : sealCleanupReceipt(receipt, key)); expect(await m.reconcilePendingInstallation(s.cookies, s.config, s.deps)).toEqual({ state: 'pending' }); expect(s.active.has(s.proof.generation)).toBe(true); expect(s.revoked.size).toBe(0); });
it('unsubscribe_recovery_preserves_session_and_logout_recovery_revokes_only_old_session', async () => { const m = await api(); const s = setup(); const newerHash = createHash('sha256').update('new-session').digest('hex'); const receipt = { ...s.proof, sessionHash, issuedAt: now.toISOString(), expiresAt: '2026-10-03T12:00:00Z' }; s.values.set(CLEANUP_COOKIE, sealCleanupReceipt(receipt, key)); expect(await m.reconcilePendingInstallation(s.cookies, s.config, s.deps)).toEqual({ state: 'complete' }); expect(s.revoked.size).toBe(0); s.values.set(CLEANUP_COOKIE, sealCleanupReceipt({ ...receipt, revokeSession: true }, key)); expect(await m.reconcilePendingInstallation(s.cookies, s.config, s.deps)).toEqual({ state: 'complete' }); expect(s.revoked).toEqual(new Set([sessionHash])); expect(s.revoked.has(newerHash)).toBe(false); expect(s.values.get('fuel_session')).toBe('old-session'); });
it('opaque_fallback_verifies_active_record_before_deriving_old_session', async () => { const m = await api(); const s = setup(); s.values.set(CLEANUP_COOKIE, s.values.get(INSTALLATION_COOKIE)!); s.repo.findInstallation = async () => ({ id: 'old-device', employeeId: 'old-account', ...s.proof, endpointFingerprint: 'fictional', sessionHash, expiresAt: null, lastTestAt: null, status: 'active' }); expect(await m.reconcilePendingInstallation(s.cookies, s.config, s.deps)).toEqual({ state: 'complete' }); expect(s.revoked.has(sessionHash)).toBe(true); expect(s.active.has(s.proof.generation)).toBe(false); });
it.each(['other_installation', 'new_generation', 'other_environment', 'detached', 'invalid', 'absent'])('opaque_fallback_%s_fails_closed', async (kind) => { const m = await api(); const s = setup(); s.values.set(CLEANUP_COOKIE, s.values.get(INSTALLATION_COOKIE)!); const record = { id: 'device', employeeId: 'old', ...s.proof, endpointFingerprint: 'fictional', sessionHash, expiresAt: null, lastTestAt: null, status: 'active' as 'active' | 'detached' | 'invalid' }; if (kind === 'other_installation')
    record.installationHash = createInstallationProof().installationHash; if (kind === 'new_generation')
    record.generation = createInstallationProof().generation; if (kind === 'other_environment')
    record.environment = 'production'; if (kind === 'detached' || kind === 'invalid')
    record.status = kind; s.repo.findInstallation = async () => kind === 'absent' ? null : record; expect(await m.reconcilePendingInstallation(s.cookies, s.config, s.deps)).toEqual({ state: 'pending' }); expect(s.revoked.size).toBe(0); expect(s.active.has(s.proof.generation)).toBe(true); });
it('account_switch_rotates_only_after_detach_and_keeps_other_devices', async () => { const m = await api(); const s = setup(); s.repo.findInstallation = async () => ({ id: 'device', employeeId: 'old-account', ...s.proof, endpointFingerprint: 'fictional', sessionHash, expiresAt: null, lastTestAt: null, status: 'active' }); expect(await m.prepareInstallationForAccount('new-account', s.cookies, s.config, s.deps)).toEqual({ state: 'complete' }); expect(s.active).toEqual(new Set(['other-device'])); expect(s.revoked.has(sessionHash)).toBe(true); expect(s.values.get(INSTALLATION_COOKIE)).not.toBe(sealInstallationProof(s.proof, key)); const installation = await import('./installation'); expect(installation.readInstallationProof(s.cookies, key)?.installationHash).not.toBe(s.proof.installationHash); });
it('account_switch_storage_outage_keeps_pending_and_old_proof', async () => { const m = await api(); const s = setup(); const opaque = s.values.get(INSTALLATION_COOKIE); s.repo.findInstallation = async () => ({ id: 'device', employeeId: 'old-account', ...s.proof, endpointFingerprint: 'fictional', sessionHash, expiresAt: null, lastTestAt: null, status: 'active' }); s.repo.detach = async () => { throw new Error('outage'); }; expect(await m.prepareInstallationForAccount('new-account', s.cookies, s.config, s.deps)).toEqual({ state: 'pending' }); expect(s.values.get(INSTALLATION_COOKIE)).toBe(opaque); expect(s.values.has(CLEANUP_COOKIE)).toBe(true); expect(s.active.has(s.proof.generation)).toBe(true); });
it('same_account_session_renewal_keeps_explicit_consent_and_generation', async () => { const m = await api(); const s = setup(); s.repo.findInstallation = async () => ({ id: 'device', employeeId: 'same-account', ...s.proof, endpointFingerprint: 'fictional', sessionHash, expiresAt: null, lastTestAt: null, status: 'active' });  expect(await m.prepareInstallationForAccount('same-account', s.cookies, s.config, s.deps)).toEqual({ state: 'complete' }); const {readInstallationProof} = await import('./installation'); expect(readInstallationProof(s.cookies,key)).toMatchObject({...s.proof,associatedSessionHash:sessionHash}); expect(s.active.has(s.proof.generation)).toBe(true); expect(s.revoked.size).toBe(0); });
it('opaque_partial_recovery_repeats_old_session_revocation_after_detach_advances_generation', async () => { const m = await api(); const s = setup(); s.values.set(CLEANUP_COOKIE, s.values.get(INSTALLATION_COOKIE)!); let record = { id: 'device', employeeId: 'old-account', ...s.proof, endpointFingerprint: 'fictional', sessionHash, expiresAt: null, lastTestAt: null, status: 'active' as 'active' | 'detached' }; s.repo.findInstallation = async () => record; s.repo.reconcile = async () => { record = { ...record, generation: createInstallationProof().generation, status: 'detached' }; s.active.delete(s.proof.generation); return { state: 'complete' }; }; s.deps.revokeSession = async () => { throw new Error('auth storage failure'); }; expect(await m.reconcilePendingInstallation(s.cookies, s.config, s.deps)).toEqual({ state: 'pending' }); expect(s.active.has(s.proof.generation)).toBe(false); expect(openCleanupReceipt(s.values.get(CLEANUP_COOKIE)!, key, now)).toMatchObject({ sessionHash, revokeSession: true, generation: s.proof.generation }); s.deps.revokeSession = async (hash) => { s.revoked.add(hash); }; expect(await m.reconcilePendingInstallation(s.cookies, s.config, s.deps)).toEqual({ state: 'complete' }); expect(s.revoked).toEqual(new Set([sessionHash])); });
it('pending_unsubscribe_then_failed_logout_preserves_session_revocation_obligation', async () => {
    const m = await api(); const s = setup();
    const sessions = new Set([sessionHash, 'unrelated-session']);
    s.values.set(CLEANUP_COOKIE, sealCleanupReceipt({ ...s.proof, sessionHash, issuedAt: now.toISOString(), expiresAt: '2026-10-03T12:00:00Z' }, key));
    s.deps.revokeSession = async () => { throw new Error('auth unavailable'); };
    expect(await m.terminatePortalSession({ sessionToken: 'old-session', installation: s.proof, cookies: s.cookies, deps: s.deps })).toEqual({ state: 'pending' });
    expect(s.values.has('fuel_session')).toBe(false);
    s.deps.revokeSession = async hash => { sessions.delete(hash); };
    expect(await m.reconcilePendingInstallation(s.cookies, s.config, s.deps)).toEqual({ state: 'complete' });
    expect(sessions).toEqual(new Set(['unrelated-session']));
    expect(s.active).toEqual(new Set(['other-device']));
});
it('pending_former_logout_then_newer_failed_logout_recovers_every_distinct_session', async () => {
    const m = await api(); const s = setup();
    const newerHash = createHash('sha256').update('new-session').digest('hex');
    const sessions = new Set([sessionHash, newerHash, 'unrelated-session']);
    s.values.set(CLEANUP_COOKIE, sealCleanupReceipt({ ...s.proof, sessionHash, revokeSession: true, issuedAt: now.toISOString(), expiresAt: '2026-10-03T12:00:00Z' }, key));
    s.values.set('fuel_session', 'new-session');
    s.deps.revokeSession = async () => { throw new Error('auth unavailable'); };
    await m.terminatePortalSession({ sessionToken: 'new-session', installation: s.proof, cookies: s.cookies, deps: s.deps });
    s.deps.revokeSession = async hash => { sessions.delete(hash); };
    expect(await m.reconcilePendingInstallation(s.cookies, s.config, s.deps)).toEqual({ state: 'complete' });
    expect(sessions).toEqual(new Set(['unrelated-session']));
    expect(await m.reconcilePendingInstallation(s.cookies, s.config, s.deps)).toEqual({ state: 'complete' });
});
it('renewal_then_detach_failure_excludes_old_generation_without_browser_recovery', async () => {
    const m = await api(); const s = setup();
    const record = { id: 'device', employeeId: 'same-account', ...s.proof, endpointFingerprint: 'fictional', sessionHash, expiresAt: null, lastTestAt: null, status: 'active' as const };
    const newerHash = createHash('sha256').update('new-session').digest('hex');
    const sessions = new Set([sessionHash, newerHash, 'other-device-session']);
    s.repo.findInstallation = async () => record;
    expect(await m.prepareInstallationForAccount('same-account', s.cookies, s.config, s.deps)).toEqual({ state: 'complete' });
    const { readInstallationProof } = await import('./installation');
    const verifiedProof = readInstallationProof(s.cookies, key)!;
    expect(verifiedProof.generation).toBe(s.proof.generation);
    s.repo.detach = async () => { throw new Error('push table outage'); };
    s.deps.revokeSession = async hash => { sessions.delete(hash); };
    expect(await m.terminatePortalSession({ sessionToken: 'new-session', installation: verifiedProof, cookies: s.cookies, deps: s.deps })).toEqual({ state: 'pending' });
    // This is the existing listActive/worker associated-session-exists predicate.
    // No browser reconciliation is invoked after explicit sign-out.
    expect(record.status === 'active' && sessions.has(record.sessionHash)).toBe(false);
    expect(sessions.has(newerHash)).toBe(false);
    expect(sessions.has('other-device-session')).toBe(true);
    expect(s.active.has('other-device')).toBe(true);
});
it('receipt_merge_preserves_original_lifetimes_and_partial_recovery_is_idempotent', async () => {
    const m = await api(); const s = setup();
    const newerHash = createHash('sha256').update('new-session').digest('hex');
    const sessions = new Set([sessionHash, newerHash, 'unrelated-session']);
    const original = { ...s.proof, sessionHash, revokeSession: true, issuedAt: now.toISOString(), expiresAt: '2026-10-03T12:00:00Z' };
    s.values.set(CLEANUP_COOKIE, sealCleanupReceipt(original, key));
    s.deps.revokeSession = async () => { throw new Error('outage'); };
    await m.terminatePortalSession({ sessionToken: 'new-session', installation: s.proof, cookies: s.cookies, deps: s.deps });
    const merged = openCleanupReceipt(s.values.get(CLEANUP_COOKIE)!, key, now)!;
    expect(merged.issuedAt).toBe(original.issuedAt); expect(merged.expiresAt).toBe(original.expiresAt);
    expect(merged.sessionRevocations).toEqual([{sessionHash:newerHash,issuedAt:'2026-10-02T12:00:00.000Z',expiresAt:'2026-10-16T12:00:00.000Z'}]);
    s.deps.revokeSession = async hash => { if(hash===newerHash)throw new Error('partial failure'); sessions.delete(hash); };
    expect(await m.reconcilePendingInstallation(s.cookies,s.config,s.deps)).toEqual({state:'pending'});
    expect(s.values.has(CLEANUP_COOKIE)).toBe(true); expect(sessions).toEqual(new Set([newerHash,'unrelated-session']));
    s.deps.revokeSession=async hash=>{sessions.delete(hash);};
    expect(await m.reconcilePendingInstallation(s.cookies,s.config,s.deps)).toEqual({state:'complete'});
    expect(await m.reconcilePendingInstallation(s.cookies,s.config,s.deps)).toEqual({state:'complete'});
    expect(sessions).toEqual(new Set(['unrelated-session']));
});
it('bounded_receipt_capacity_retains_all_prior_obligations_and_fails_closed', async()=>{
    const m=await api();const s=setup();
    const previous=Array.from({length:7},(_,i)=>({sessionHash:createHash('sha256').update(`session-${i}`).digest('hex'),issuedAt:now.toISOString(),expiresAt:'2026-10-03T12:00:00Z'}));
    s.values.set(CLEANUP_COOKIE,sealCleanupReceipt({...s.proof,sessionHash,revokeSession:true,issuedAt:now.toISOString(),expiresAt:'2026-10-03T12:00:00Z',sessionRevocations:previous},key));
    s.deps.revokeSession=async()=>{throw new Error('outage');};
    await m.terminatePortalSession({sessionToken:'overflow-session',installation:s.proof,cookies:s.cookies,deps:s.deps});
    const retained=s.values.get(CLEANUP_COOKIE)!;
    expect(Buffer.byteLength(retained,'utf8')).toBeLessThan(3072);
    expect(openCleanupReceipt(retained,key,now)).toMatchObject({sessionHash,recoveryBlocked:true,sessionRevocations:previous});
    s.deps.revokeSession=async hash=>{s.revoked.add(hash);};
    expect(await m.reconcilePendingInstallation(s.cookies,s.config,s.deps)).toEqual({state:'pending'});
    expect(s.values.get(CLEANUP_COOKIE)).toBe(retained);expect(s.revoked.size).toBe(0);expect(s.values.has('fuel_session')).toBe(false);
});
it('successful_later_session_delete_does_not_spend_pending_receipt_capacity',async()=>{
    const m=await api();const s=setup();
    const previous=Array.from({length:7},(_,i)=>({sessionHash:createHash('sha256').update(`session-${i}`).digest('hex'),issuedAt:now.toISOString(),expiresAt:'2026-10-03T12:00:00Z'}));
    s.values.set(CLEANUP_COOKIE,sealCleanupReceipt({...s.proof,sessionHash,revokeSession:true,issuedAt:now.toISOString(),expiresAt:'2026-10-03T12:00:00Z',sessionRevocations:previous},key));
    await m.terminatePortalSession({sessionToken:'already-revoked-newer-session',installation:s.proof,cookies:s.cookies,deps:s.deps});
    expect(openCleanupReceipt(s.values.get(CLEANUP_COOKIE)!,key,now)?.recoveryBlocked).not.toBe(true);
    expect(s.revoked.size).toBe(1);
});
it('multiple_session_recovery_keeps_shared_one_second_abort_budget',async()=>{
    const m=await api();const s=setup();const signals:AbortSignal[]=[];
    s.values.set(CLEANUP_COOKIE,sealCleanupReceipt({...s.proof,sessionHash,revokeSession:true,issuedAt:now.toISOString(),expiresAt:'2026-10-03T12:00:00Z',sessionRevocations:[{sessionHash:createHash('sha256').update('another').digest('hex'),issuedAt:now.toISOString(),expiresAt:'2026-10-03T12:00:00Z'}]},key));
    s.deps.revokeSession=async(_hash,signal)=>{signals.push(signal);return new Promise(()=>{});};s.deps.subscriptions=(signal)=>{signals.push(signal);return s.repo;};s.repo.reconcile=async()=>new Promise(()=>{});
    vi.useFakeTimers();const pending=m.reconcilePendingInstallation(s.cookies,s.config,s.deps);await vi.advanceTimersByTimeAsync(1000);expect(await pending).toEqual({state:'pending'});expect(signals).toHaveLength(3);expect(signals.every(signal=>signal.aborted)).toBe(true);expect(s.values.has(CLEANUP_COOKIE)).toBe(true);
});
it('confirmed_auth_success_retires_prior_obligation_during_push_only_outage', async () => {
    const m = await api(); const s = setup();
    s.values.set(CLEANUP_COOKIE, sealCleanupReceipt({ ...s.proof, sessionHash, revokeSession: true, issuedAt: now.toISOString(), expiresAt: '2026-10-03T12:00:00Z' }, key));
    s.repo.detach = async () => { throw new Error('push table outage'); };
    s.repo.reconcile = async () => { throw new Error('push table outage'); };
    expect(await m.terminatePortalSession({ sessionToken: 'old-session', installation: s.proof, cookies: s.cookies, deps: s.deps })).toEqual({ state: 'pending' });
    let retained = openCleanupReceipt(s.values.get(CLEANUP_COOKIE)!, key, now)!;
    expect(retained.revokeSession).toBe(false);
    expect(retained.issuedAt).toBe(now.toISOString());
    expect(retained.expiresAt).toBe('2026-10-03T12:00:00Z');
    for (let i = 0; i < 12; i++) {
        s.values.set('fuel_session', `renewed-${i}`);
        expect(await m.terminatePortalSession({ sessionToken: `renewed-${i}`, installation: s.proof, cookies: s.cookies, deps: s.deps })).toEqual({ state: 'pending' });
        retained = openCleanupReceipt(s.values.get(CLEANUP_COOKIE)!, key, now)!;
        expect(retained.revokeSession).toBe(false);
        expect(retained.sessionRevocations ?? []).toEqual([]);
        expect(retained.recoveryBlocked).not.toBe(true);
    }
    s.repo.reconcile = async () => ({ state: 'complete' });
    expect(await m.reconcilePendingInstallation(s.cookies, s.config, s.deps)).toEqual({ state: 'complete' });
    expect(s.active.has('other-device')).toBe(true);
});
it('partial_reconciliation_retires_only_confirmed_auth_operations_before_deadline', async () => {
    const m = await api(); const s = setup();
    const ambiguousHash = createHash('sha256').update('ambiguous-session').digest('hex');
    s.values.set(CLEANUP_COOKIE, sealCleanupReceipt({ ...s.proof, sessionHash, revokeSession: true, issuedAt: now.toISOString(), expiresAt: '2026-10-03T12:00:00Z', sessionRevocations: [{ sessionHash: ambiguousHash, issuedAt: now.toISOString(), expiresAt: '2026-10-03T12:00:00Z' }] }, key));
    let finishAmbiguous: (() => void) | undefined;
    s.deps.revokeSession = async (hash) => { if (hash === ambiguousHash) await new Promise<void>(resolve => { finishAmbiguous = resolve; }); else s.revoked.add(hash); };
    s.repo.reconcile = async () => { throw new Error('push table outage'); };
    vi.useFakeTimers();
    const result = m.reconcilePendingInstallation(s.cookies, s.config, s.deps);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await result).toEqual({ state: 'pending' });
    const retained = openCleanupReceipt(s.values.get(CLEANUP_COOKIE)!, key, now)!;
    expect(retained.revokeSession).toBe(false);
    expect(retained.sessionRevocations).toEqual([{ sessionHash: ambiguousHash, issuedAt: now.toISOString(), expiresAt: '2026-10-03T12:00:00Z' }]);
    finishAmbiguous!();
    await Promise.resolve(); await Promise.resolve();
    expect(openCleanupReceipt(s.values.get(CLEANUP_COOKIE)!, key, now)?.sessionRevocations).toEqual(retained.sessionRevocations);
    s.deps.revokeSession = async hash => { s.revoked.add(hash); };
    s.repo.reconcile = async () => ({ state: 'complete' });
    expect(await m.reconcilePendingInstallation(s.cookies, s.config, s.deps)).toEqual({ state: 'complete' });
    expect(s.revoked).toEqual(new Set([sessionHash, ambiguousHash]));
});

it('workspace outage does not prevent cookie termination or account-switch fencing',async()=>{
 const m=await api();const s=setup();
 // Workspace is deliberately unavailable; these runtime-only APIs must not read it.
 const workspace=await import('../data/workspaces');const lookup=vi.spyOn(workspace,'getWorkspace').mockRejectedValue(new Error('workspace unavailable'));
 try {
  s.repo.detach=async()=>{throw new Error('cleanup unavailable');};
  expect(await m.terminatePortalSession({sessionToken:'old-session',installation:s.proof,cookies:s.cookies,deps:s.deps})).toEqual({state:'pending'});
  expect(s.values.has('fuel_session')).toBe(false);
  s.repo.reconcile=async()=>{throw new Error('cleanup unavailable');};
  expect(await m.prepareInstallationForAccount('new-account',s.cookies,s.config,s.deps)).toEqual({state:'pending'});
  expect(s.values.has(CLEANUP_COOKIE)).toBe(true);expect(lookup).not.toHaveBeenCalled();
 } finally {lookup.mockRestore();}
});
