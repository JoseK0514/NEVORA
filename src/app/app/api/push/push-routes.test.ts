import { expect, it, vi } from 'vitest';
import { createECDH } from 'node:crypto';
import type { PushRuntimeConfig, PushSubscriptionRecord, SubscriptionRepository, InstallationProof } from '../../../../lib/notifications/types';
// P-256 scalars have a 32-byte wire representation even when Node's minimal
// integer export drops leading zeros (the maintained web-push generator pads too).
function canonicalPrivateKey(curve: ReturnType<typeof createECDH>) {
    const key = curve.getPrivateKey();
    return Buffer.concat([Buffer.alloc(32 - key.length), key]).toString('base64url');
}
async function setup(privateScalar?: Buffer) { const m = await import('../../../../lib/notifications/subscription-service').catch(() => ({})); expect(m).toHaveProperty('createPushHandlers'); const api = m as typeof import('../../../../lib/notifications/subscription-service'); const installation = await import('../../../../lib/notifications/installation'); const configModule = await import('../../../../lib/notifications/config'); const e = createECDH('prime256v1'); if (privateScalar) e.setPrivateKey(privateScalar); else e.generateKeys(); const key = Buffer.alloc(32, 7); const config: PushRuntimeConfig = configModule.readNotificationConfig({ FUEL_PORTAL_ORIGIN: 'https://fuel.example', PUSH_ENVIRONMENT: 'test', PUSH_FEATURE_ENABLED: 'true', PUSH_DELIVERY_ENABLED: 'true', PUSH_TEST_DELIVERY_ENABLED: 'true', PUSH_TEST_ACCOUNT_IDS: 'employee', PUSH_SUBSCRIPTION_ENCRYPTION_KEY: key.toString('base64url'), PUSH_VAPID_PUBLIC_KEY: e.getPublicKey().toString('base64url'), PUSH_VAPID_PRIVATE_KEY: canonicalPrivateKey(e), PUSH_VAPID_SUBJECT: 'mailto:test@example.com', NOTIFICATION_WORKER_SECRET: 'x'.repeat(32) }); const proof = installation.createInstallationProof('test'); const cookieValues = new Map([['fuel_push_installation', installation.sealInstallationProof(proof, key)], ['fuel_session', 'fictional-session']]); const cookies = { get: (name: string) => cookieValues.has(name) ? { value: cookieValues.get(name)! } : undefined, set: vi.fn((name: string, value: string) => { cookieValues.set(name, value); }), delete: vi.fn((name: string) => { cookieValues.delete(name); }) }; let current: PushSubscriptionRecord | null = null; let employee = { id: 'employee', firstName: 'F', lastName: 'T', role: 'EMPLOYEE' as const, primaryLocationId: '2' }; const enroll = vi.fn(async (input) => { current = { ...input, id: 'subscription', status: 'active', consentAt: '2026-10-02T12:00:00Z', updatedAt: '2026-10-02T12:00:00Z', lastTestAt: null }; return { state: 'active' as const, generation: input.generation }; }); const queueSelfTest = vi.fn(async (_input: unknown) => true); const repo = { enroll, findInstallation: vi.fn(async (hash: string, environment: string) => current?.installationHash === hash && current.environment === environment ? current : null), detach: vi.fn(async () => ({ state: 'complete' as const })), reconcile: vi.fn(async () => ({ state: 'complete' as const })), queueSelfTest } as unknown as SubscriptionRepository; const repository = vi.fn(() => repo); const session = vi.fn(async () => employee); const handlers = api.createPushHandlers({ config, cookies: async () => cookies, session, subscriptions: repository, cleanupDeps: {clock:()=>new Date('2026-10-02T12:00:00Z'), secureCookies:true, subscriptions:()=>repo, revokeSession:async()=>{}, sealReceipt:receipt=>installation.sealCleanupReceipt(receipt,key), openReceipt:value=>installation.openCleanupReceipt(value,key,new Date('2026-10-02T12:00:00Z'))}, clock: () => new Date('2026-10-02T12:00:00Z') }); const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/fictional', expirationTime: null, keys: { p256dh: e.getPublicKey().toString('base64url'), auth: Buffer.alloc(16, 1).toString('base64url') } }; const request = (body: unknown, headers: Record<string, string> = {}, method = 'POST') => new Request('https://fuel.example/app/api/push/subscribe', { method, headers: { Origin: 'https://fuel.example', 'Content-Type': 'application/json', ...headers }, body: method === 'GET' ? undefined : JSON.stringify(body) }); return { handlers, request, sub, config, repo, repository, cookies, cookieValues, proof, enroll, session, queueSelfTest, setCurrent: (value: PushSubscriptionRecord | null) => { current = value; }, getCurrent: () => current, setEmployee: (id: string) => { employee = { ...employee, id }; }, installation, key }; }
it('keeps a legacy installation and writes new enrollment under the active key ID',async()=>{
 const s=await setup();Object.assign(s.config,{subscriptionEncryptionKey:Buffer.alloc(32,47).toString('base64url'),subscriptionEncryptionKeyId:'new-key',subscriptionPreviousEncryptionKey:s.key.toString('base64url'),subscriptionPreviousEncryptionKeyId:'old-key',subscriptionLegacyEncryptionKeyId:'old-key'});
 const response=await s.handlers.mutation(s.request({subscription:s.sub}),'subscribe');expect(response.status).toBe(200);
 expect(s.getCurrent()?.encryptedMaterial).toMatch(/^v2\.new-key\./);
 expect(s.getCurrent()?.installationHash).toBe(s.proof.installationHash);
 const {subscriptionProtection}=await import('../../../../lib/notifications/keyring');
 expect(s.installation.readInstallationProof(s.cookies,subscriptionProtection(s.config)!,'test')?.installationHash).toBe(s.proof.installationHash);
 expect(s.cookieValues.get('fuel_push_installation')).toMatch(/^v2\.new-key\./);
});
it('forged_identity_is_rejected', async () => { const s = await setup(); for (const field of ['employeeId', 'installationHash', 'sessionHash']) {
    const r = await s.handlers.mutation(s.request({ subscription: s.sub, [field]: 'foreign' }), 'subscribe');
    expect(r.status).toBe(400);
} expect(s.enroll).not.toHaveBeenCalled(); });
it('a device page bound to another session cannot read status or enroll',async()=>{
 const s=await setup();
 const headers={'X-Nevora-Device-Authority':'foreign-session'};
 expect((await s.handlers.status(new Request('https://fuel.example/app/api/push/status',{headers}))).status).toBe(401);
 expect((await s.handlers.mutation(s.request({subscription:s.sub},headers),'subscribe')).status).toBe(401);
 expect(s.enroll).not.toHaveBeenCalled();
});
it('bound device status retires at the current session budget and unbound status keeps its contract',async()=>{
 const s=await setup(),{employeeViewAuthority}=await import('../../../../lib/employee-view-authority.server'),{createHash}=await import('node:crypto');
 const employee=await s.session(),hash=createHash('sha256').update('fictional-session').digest('hex');
 const authority=employeeViewAuthority({employee,sessionTokenHash:hash},'notifications');
 const request=new Request('https://fuel.example/app/api/push/status',{headers:{'X-Nevora-Device-Authority':authority}});
 const legacy=await (await s.handlers.status()).json();expect(legacy).not.toHaveProperty('authority');expect(legacy).not.toHaveProperty('validForMs');
 const api=await import('../../../../lib/notifications/subscription-service');let budget=1200;
 const handlers=api.createPushHandlers({config:s.config,cookies:async()=>s.cookies,session:s.session,subscriptions:()=>s.repo,clock:()=>new Date(),sessionBudget:async()=>budget});
 const result=await (await handlers.status(request)).json();expect(result.authority).toBe(authority);expect(result.validForMs).toBeGreaterThan(0);expect(result.validForMs).toBeLessThanOrEqual(1200);
 budget=0;expect((await handlers.status(request)).status).toBe(401);
 s.cookieValues.set('fuel_session','a-different-session');expect((await handlers.status(request)).status).toBe(401);
});
it('a delayed bound status emits no unchanged installation cookie that could overwrite a newer enrollment',async()=>{
 const s=await setup(),{employeeViewAuthority}=await import('../../../../lib/employee-view-authority.server'),{createHash}=await import('node:crypto');
 const authority=employeeViewAuthority({employee:await s.session(),sessionTokenHash:createHash('sha256').update('fictional-session').digest('hex')},'notifications');
 const headers={'X-Nevora-Device-Authority':authority},request=new Request('https://fuel.example/app/api/push/status',{headers});
 s.cookies.set.mockClear();expect((await s.handlers.status(request)).status).toBe(200);
 const oldHeaders=s.cookies.set.mock.calls.filter(call=>call[0]==='fuel_push_installation').map(call=>call[1]);
 expect((await s.handlers.mutation(s.request({subscription:s.sub},headers),'subscribe')).status).toBe(200);const active=s.getCurrent()!;
 for(const cookie of oldHeaders)s.cookieValues.set('fuel_push_installation',cookie);
 expect((await (await s.handlers.status(request)).json()).enabled).toBe(true);
 expect((await s.handlers.mutation(s.request({ownershipGeneration:active.generation},headers),'unsubscribe')).status).toBe(200);
});
it('authenticated_same_origin_bounded_json_only', async () => { const s = await setup(); for (const headers of ([{ Origin: 'https://evil.test' }, { Origin: 'null' }, { 'Content-Type': 'text/plain' }, { 'Content-Length': '8193' }] as Record<string, string>[]))
    expect((await s.handlers.mutation(s.request({ subscription: s.sub }, headers), 'subscribe')).status).toBeGreaterThanOrEqual(400); expect((await s.handlers.mutation(s.request({ subscription: s.sub }, {}, 'GET'), 'subscribe')).status).toBe(405); expect((await s.handlers.mutation(s.request({ padding: 'x'.repeat(8193) }), 'subscribe')).status).toBe(413); s.session.mockResolvedValueOnce(null as never); expect((await s.handlers.mutation(s.request({ subscription: s.sub }), 'subscribe')).status).toBe(401); });
it('same_owner_enrollment_is_idempotent', async () => { const s = await setup(); const a = await s.handlers.mutation(s.request({ subscription: s.sub }), 'subscribe'); expect(a.status).toBe(200); const current = s.getCurrent()!; const b = await s.handlers.mutation(s.request({ subscription: s.sub, ownershipGeneration: current.generation }), 'subscribe'); expect(b.status).toBe(200); expect(s.enroll.mock.calls[1][0].generation).toBe(current.generation); expect(s.enroll.mock.calls[1][0].expectedGeneration).toBe(current.generation); const plain = JSON.stringify(await b.json()); expect(plain).not.toContain('fictional'); expect(plain).not.toContain('encrypted'); });
it('foreign_endpoint_cannot_be_rebound', async () => { const s = await setup(); await s.handlers.mutation(s.request({ subscription: s.sub }), 'subscribe'); s.setEmployee('foreign'); expect((await s.handlers.mutation(s.request({ subscription: s.sub }), 'subscribe')).status).toBe(409); expect(s.enroll).toHaveBeenCalledTimes(1); s.setCurrent(null); s.enroll.mockResolvedValueOnce({ state: 'conflict' } as never); expect((await s.handlers.mutation(s.request({ subscription: s.sub }), 'subscribe')).status).toBe(409); });
it('stale_generation_is_rejected_and_tombstones_rotate_only_after_explicit_opt_in', async () => { const s = await setup(); await s.handlers.mutation(s.request({ subscription: s.sub }), 'subscribe'); const current = s.getCurrent()!; expect((await s.handlers.mutation(s.request({ subscription: s.sub, ownershipGeneration: 'stale' }), 'subscribe')).status).toBe(409); expect((await s.handlers.mutation(s.request({ ownershipGeneration: 'stale' }), 'unsubscribe')).status).toBe(409); s.setCurrent({ ...current, status: 'detached' } as never); expect((await s.handlers.mutation(s.request({ subscription: s.sub, ownershipGeneration: current.generation }), 'subscribe')).status).toBe(409); expect((await s.handlers.mutation(s.request({ subscription: s.sub }), 'subscribe')).status).toBe(200); expect(s.enroll.mock.calls[1][0].installationHash).not.toBe(current.installationHash); });
it('endpoint_changes_rotate_generation_and_pending_or_foreign_receipts_fail_closed', async () => { const s = await setup(); await s.handlers.mutation(s.request({ subscription: s.sub }), 'subscribe'); const current = s.getCurrent()!; expect((await s.handlers.mutation(s.request({ subscription: { ...s.sub, endpoint: s.sub.endpoint + '2' }, ownershipGeneration: current.generation }), 'subscribe')).status).toBe(200); expect(s.enroll.mock.calls[1][0].generation).not.toBe(current.generation); s.cookieValues.set('fuel_push_cleanup', 'invalid'); expect((await s.handlers.mutation(s.request({ subscription: s.sub }), 'subscribe')).status).toBe(409); });
it('self_test_is_current_device_only_and_durably_throttled', async () => { const s = await setup(); await s.handlers.mutation(s.request({ subscription: s.sub }), 'subscribe'); const current = s.getCurrent()!; const r = await s.handlers.mutation(s.request({ ownershipGeneration: current.generation }), 'test'); expect(r.status).toBe(202); const input = s.queueSelfTest.mock.calls[0][0] as unknown as {
    intent: {
        source: unknown;
        purpose: string;
    };
}; expect(input.intent.source).toEqual({ kind: 'SELF_TEST', id: 'subscription', version: current.generation }); expect(input.intent.purpose).toBe('TEST'); s.queueSelfTest.mockResolvedValueOnce(false); expect((await s.handlers.mutation(s.request({ ownershipGeneration: current.generation }), 'test')).status).toBe(429); s.config.environment = 'production'; expect((await s.handlers.mutation(s.request({ ownershipGeneration: current.generation }), 'test')).status).toBe(403); });
it('disabled_status_needs_no_push_storage_or_credentials_and_storage_errors_are_sanitized', async () => { const s = await setup(); s.config.featureEnabled = false; s.config.subscriptionEncryptionKey = undefined; const r = await s.handlers.status(); expect(r.status).toBe(200); expect(await r.json()).toMatchObject({ enabled: false, configurationAvailable: false, testAllowed: false }); expect(s.repository).not.toHaveBeenCalled(); s.config.featureEnabled = true; s.config.subscriptionEncryptionKey = s.key.toString('base64url'); s.enroll.mockRejectedValueOnce(new Error('secret endpoint https://private')); const failed = await s.handlers.mutation(s.request({ subscription: s.sub }), 'subscribe'); expect(failed.status).toBe(503); expect(JSON.stringify(await failed.json())).not.toContain('secret'); expect(failed.headers.get('Cache-Control')).toBe('no-store'); });
it('status_issues_durable_opaque_account_installation_dismissal_scope_before_opt_in', async () => {
    const s = await setup();
    s.cookieValues.delete('fuel_push_installation');
    const first = await s.handlers.status();
    const a = await first.json();
    expect(a.enabled).toBe(false);
    expect(a.dismissalScope).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(s.cookies.set).toHaveBeenCalledWith('fuel_push_installation', expect.any(String), expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 365 * 86400 }));
    const b = await (await s.handlers.status()).json();
    expect(b.dismissalScope).toBe(a.dismissalScope);
    s.setEmployee('foreign');
    const c = await (await s.handlers.status()).json();
    expect(c.dismissalScope).not.toBe(a.dismissalScope);
    expect(JSON.stringify(c)).not.toContain('foreign');
});
it('cleanup_outage_keeps_receipt_and_fails_closed_until_verified_reconciliation', async () => {
    const s = await setup();
    await s.handlers.mutation(s.request({ subscription: s.sub }), 'subscribe');
    const current = s.getCurrent()!;
    vi.mocked(s.repo.detach).mockRejectedValueOnce(new Error('storage secret'));
    const pending = await s.handlers.mutation(s.request({ ownershipGeneration: current.generation }), 'unsubscribe');
    expect(pending.status).toBe(503);
    expect(await pending.json()).toEqual({ status: 'pending', generation: current.generation });
    const receipt = s.installation.openCleanupReceipt(s.cookieValues.get('fuel_push_cleanup')!, s.key, new Date('2026-10-02T12:00:00Z'));
    expect(receipt?.generation).toBe(current.generation);
    vi.mocked(s.repo.reconcile).mockRejectedValueOnce(new Error('outage'));
    expect((await s.handlers.mutation(s.request({ subscription: s.sub, ownershipGeneration: current.generation }), 'subscribe')).status).toBe(409);
    expect(s.cookieValues.has('fuel_push_cleanup')).toBe(true);
    s.setCurrent({ ...current, status: 'detached' } as never);
    expect((await s.handlers.mutation(s.request({ subscription: s.sub }), 'subscribe')).status).toBe(200);
    expect(s.cookieValues.has('fuel_push_cleanup')).toBe(false);
    expect(s.enroll.mock.calls[1][0].installationHash).not.toBe(current.installationHash);
});
it('cleanup_timeout_reports_pending_without_waiting_forever', async () => {
    const s = await setup();
    await s.handlers.mutation(s.request({ subscription: s.sub }), 'subscribe');
    const current = s.getCurrent()!;
    vi.useFakeTimers();
    try {
        vi.mocked(s.repo.detach).mockImplementationOnce(() => new Promise(() => { }));
        const result = s.handlers.mutation(s.request({ ownershipGeneration: current.generation }), 'unsubscribe');
        await vi.waitFor(() => expect(s.repo.detach).toHaveBeenCalled());
        await vi.advanceTimersByTimeAsync(3000);
        expect(await (await result).json()).toEqual({ status: 'pending', generation: current.generation });
    }
    finally {
        vi.useRealTimers();
    }
});
it('status_and_tests_do_not_expose_or_inherit_foreign_environment_or_device_state', async () => {
    const s = await setup();
    await s.handlers.mutation(s.request({ subscription: s.sub }), 'subscribe');
    const current = s.getCurrent()!;
    s.setCurrent({ ...current, id: 'another-device', installationHash: 'another-installation' });
    expect((await s.handlers.mutation(s.request({ ownershipGeneration: current.generation }), 'test')).status).toBe(409);
});
it('session_renewal_keeps_consent_but_does_not_advertise_rejected_self_test', async () => {
    const s = await setup();
    await s.handlers.mutation(s.request({ subscription: s.sub }), 'subscribe');
    const current = s.getCurrent()!;
    s.cookieValues.set('fuel_session', 'renewed-fictional-session');
    const status = await (await s.handlers.status()).json();
    expect(status.enabled).toBe(true);
    expect(status.testAllowed).toBe(false);
    expect((await s.handlers.mutation(s.request({ ownershipGeneration: current.generation }), 'test')).status).toBe(403);
});
it('signed_in_new_account_rotates_only_after_outage_receipt_recovers', async () => {
    const s = await setup();
    await s.handlers.mutation(s.request({ subscription: s.sub }), 'subscribe');
    const current = s.getCurrent()!;
    const proof = s.installation.readInstallationProof(s.cookies, s.key)!;
    const { createHash } = await import('node:crypto');
    s.cookieValues.set('fuel_push_cleanup', s.installation.sealCleanupReceipt({ ...proof, sessionHash: createHash('sha256').update('fictional-session').digest('hex'), revokeSession: true, issuedAt: '2026-10-02T12:00:00Z', expiresAt: '2026-10-03T12:00:00Z' }, s.key));
    s.setEmployee('foreign');
    s.cookieValues.set('fuel_session', 'new-account-session');
    vi.mocked(s.repo.reconcile).mockRejectedValueOnce(new Error('outage'));
    expect((await s.handlers.status()).status).toBe(409);
    expect(s.installation.readInstallationProof(s.cookies, s.key)).toEqual(proof);
    vi.mocked(s.repo.reconcile).mockImplementationOnce(async () => { s.setCurrent({ ...current, status: 'detached' } as never); return { state: 'complete' }; });
    const healthy = await s.handlers.status();
    expect(healthy.status).toBe(200);
    expect((await healthy.json()).enabled).toBe(false);
    expect(s.installation.readInstallationProof(s.cookies, s.key)?.installationHash).not.toBe(proof.installationHash);
    expect(s.cookieValues.has('fuel_push_cleanup')).toBe(false);
});

it('valid_leading_zero_private_scalars_keep_the_test_fixture_delivery_configuration_enabled', async () => {
    // Node omits leading zero bytes when exporting this valid P-256 scalar.
    const scalar = Buffer.alloc(32, 1);
    scalar[0] = 0;
    const probe = createECDH('prime256v1');
    probe.setPrivateKey(scalar);
    expect(probe.getPrivateKey()).toHaveLength(31);

    const s = await setup(scalar);
    expect((await s.handlers.mutation(s.request({ subscription: s.sub }), 'subscribe')).status).toBe(200);
    const current = s.getCurrent()!;
    s.setCurrent({ ...current, id: 'another-device', installationHash: 'another-installation' });
    const response = await s.handlers.mutation(s.request({ ownershipGeneration: current.generation }), 'test');
    expect({ testDeliveryEnabled: s.config.testDeliveryEnabled, status: response.status }).toEqual({ testDeliveryEnabled: true, status: 409 });
});
