import { createECDH } from 'node:crypto';
import { expect, it } from 'vitest';
async function api() { const m = await import('./subscription-service').catch(() => ({})); expect(m).toHaveProperty('validatePushSubscription'); return m as typeof import('./subscription-service'); }
export function subscription(endpoint = 'https://fcm.googleapis.com/fcm/send/fictional') { const e = createECDH('prime256v1'); e.generateKeys(); return { endpoint, expirationTime: null, keys: { p256dh: e.getPublicKey().toString('base64url'), auth: Buffer.alloc(16, 1).toString('base64url') } }; }
it('strict_subscription_shapes_and_real_p256_key_lengths', async () => { const m = await api(); const value = subscription(); expect(m.validatePushSubscription(value)).toEqual(value); for (const bad of [{ ...value, employeeId: 'foreign' }, { ...value, installationHash: 'foreign' }, { ...value, keys: { ...value.keys, extra: true } }, { ...value, keys: { ...value.keys, p256dh: Buffer.alloc(65, 4).toString('base64url') } }, { ...value, keys: { ...value.keys, auth: 'abc=' } }, { ...value, expirationTime: Infinity }, { ...value, endpoint: 'x'.repeat(4097) }])
    expect(() => m.validatePushSubscription(bad)).toThrow(); });
it('endpoint_allowlist_rejects_ssrf_suffix_path_and_redirect_inputs_without_network', async () => { const m = await api(); for (const good of ['https://fcm.googleapis.com/fcm/send/token', 'https://updates.push.services.mozilla.com/wpush/v2/token', 'https://web.push.apple.com/Qtoken'])
    expect(m.validatePushEndpoint(good).href).toBe(good); for (const bad of ['http://fcm.googleapis.com/fcm/send/t', 'https://fcm.googleapis.com:444/fcm/send/t', 'https://u:p@fcm.googleapis.com/fcm/send/t', 'https://fcm.googleapis.com/fcm/send/t#x', 'https://127.0.0.1/fcm/send/t', 'https://localhost/fcm/send/t', 'https://192.168.1.1/fcm/send/t', 'https://fcm.googleapis.com.evil.test/fcm/send/t', 'https://evilpush.apple.com/Qtoken', 'https://fcm.googleapis.com/v1/projects/x/messages:send', 'https://fcm.googleapis.com/redirect?url=https://evil.test', 'https://updates.push.services.mozilla.com/wpush/v2/t?redirect=x', 'https://web.push.apple.com/', 'https://fcm.googleapis.com/fcm/send/%2e%2e/x'])
    expect(() => m.validatePushEndpoint(bad)).toThrow(); });
it('reviewed_production_webpush_paths_and_empty_fragments_are_checked', async () => {
    const m = await api();
    expect(m.validatePushEndpoint('https://fcm.googleapis.com/wp/token').href).toBe('https://fcm.googleapis.com/wp/token');
    expect(m.validatePushEndpoint('https://updates.push.services.mozilla.com/wpush/v1/token').href).toBe('https://updates.push.services.mozilla.com/wpush/v1/token');
    for (const endpoint of ['https://fcm.googleapis.com/fcm/send/token#', 'https://@fcm.googleapis.com/fcm/send/token', 'https://fcm.googleapis.com/preprod/wp/token'])
        expect(() => m.validatePushEndpoint(endpoint)).toThrow();
});
