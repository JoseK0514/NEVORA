import { afterEach, expect, it, vi } from 'vitest';
import { createECDH } from 'node:crypto';
import { DEFAULT_NOTIFICATION_POLICY } from './policy';
import type { NotificationConfig, PushEnvelope } from './types';
const pair = createECDH('prime256v1');
pair.setPrivateKey(Buffer.alloc(32, 1));
const config: NotificationConfig = { featureEnabled: true, deliveryEnabled: true, testDeliveryEnabled: true, testAccountIds: ['employee'], environment: 'test', portalOrigin: 'https://example.test', policy: DEFAULT_NOTIFICATION_POLICY, vapidPublicKey: pair.getPublicKey().toString('base64url'), vapidPrivateKey: pair.getPrivateKey().toString('base64url'), vapidSubject: 'mailto:test@example.test' };
const input = { subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/fixture', expirationTime: null, keys: { p256dh: pair.getPublicKey().toString('base64url'), auth: Buffer.alloc(16, 2).toString('base64url') } }, payload: { notificationId: 'id', kind: 'SELF_TEST', ownershipGeneration: 'generation', expiresAt: '2030-01-02T00:00:00Z', tag: 'fuel-tag', title: 'NEVORA Request Update', body: 'Open NEVORA.' } satisfies PushEnvelope, ttlSeconds: 60, urgency: 'normal' as const, topic: 'fixture', signal: new AbortController().signal };
async function moduleUnderTest() { const m = await import('./provider').catch(() => ({})); expect(m).toHaveProperty('createPushSender'); return m as typeof import('./provider'); }
afterEach(() => vi.useRealTimers());
it('provider_acceptance_is_not_acknowledgement', async () => { const m = await moduleUnderTest(); const transport = vi.fn().mockResolvedValue({ statusCode: 201, headers: {} }); expect(await m.createPushSender(config, transport).send(input)).toEqual({ kind: 'accepted' }); const details = transport.mock.calls[0][0]; expect(details.headers.TTL).toBe(60); expect(details.headers['Content-Encoding']).toBe('aes128gcm'); expect(Buffer.isBuffer(details.body)).toBe(true); expect(details.body.toString()).not.toContain('NEVORA'); });
it('hung_transport_aborts_at_deadline', async () => { vi.useFakeTimers(); const m = await moduleUnderTest(); let signal: AbortSignal | undefined; const result = m.createPushSender(config, async (_d, s) => { signal = s; return new Promise(() => { }); }).send(input); await vi.advanceTimersByTimeAsync(7999); expect(signal?.aborted).toBe(false); await vi.advanceTimersByTimeAsync(1); expect(await result).toEqual({ kind: 'retry', errorClass: 'transport_timeout' }); expect(signal?.aborted).toBe(true); });
it.each([[408, 'retry'], [429, 'retry'], [500, 'retry'], [503, 'retry'], [404, 'invalid_subscription'], [410, 'invalid_subscription'], [400, 'failed'], [401, 'failed'], [403, 'failed'], [302, 'failed']])('classifies status %i safely', async (status, kind) => { const m = await moduleUnderTest(); expect(await m.createPushSender(config, async () => ({ statusCode: status as number, headers: { 'retry-after': '999999' } })).send(input)).toMatchObject({ kind }); });
it('bounds Retry-After and rejects endpoints/config before transport', async () => { const m = await moduleUnderTest(); const transport = vi.fn().mockResolvedValue({ statusCode: 429, headers: { 'retry-after': '999999' } }); expect(await m.createPushSender(config, transport).send(input)).toEqual({ kind: 'retry', errorClass: 'provider_throttled', retryAfterSeconds: 3600 }); await m.createPushSender(config, transport).send({ ...input, subscription: { ...input.subscription, endpoint: 'https://localhost/x' } }); await m.createPushSender({ ...config, vapidPrivateKey: undefined }, transport).send(input); expect(transport).toHaveBeenCalledTimes(1); });
it('network_errors_are_sanitized_and_preaborted_calls_do_not_send', async () => { const m = await moduleUnderTest(); const transport = vi.fn().mockRejectedValue(new Error('private endpoint/key')); expect(await m.createPushSender(config, transport).send(input)).toEqual({ kind: 'retry', errorClass: 'transport_error' }); const controller = new AbortController(); controller.abort(); await m.createPushSender(config, transport).send({ ...input, signal: controller.signal }); expect(transport).toHaveBeenCalledTimes(1); });
// Mock the socket boundary, exercising the production HTTPS transport without DNS/network.
async function socketFixture() {
    const { EventEmitter } = await import('node:events');
    const req = Object.assign(new EventEmitter(), { end: vi.fn(), destroy: vi.fn() });
    const res = Object.assign(new EventEmitter(), { headers: {} as Record<string, string>, statusCode: 201, complete: false, destroy: vi.fn() });
    let deliver: () => void = () => { };
    const request = vi.fn((_url: URL, _options: unknown, callback: (response: unknown) => void) => { deliver = () => callback(res); return req; });
    const details = { endpoint: input.subscription.endpoint, method: 'POST' as const, headers: {}, body: Buffer.from('encrypted') };
    return { req, res, request, details, deliver: () => deliver() };
}
it('https_transport_caps_total_streamed_response_and_never_follows_redirects', async () => {
    const m = await moduleUnderTest();
    const socket = await socketFixture();
    const result = m.nodeHttpsTransport(socket.details, input.signal, socket.request as unknown as Parameters<typeof m.nodeHttpsTransport>[2]);
    const rejected = expect(result).rejects.toThrow('response_too_large');
    socket.deliver();
    socket.res.emit('data', Buffer.alloc(32768));
    expect(socket.req.destroy).not.toHaveBeenCalled();
    socket.res.emit('data', Buffer.alloc(1));
    await rejected;
    expect(socket.req.destroy).toHaveBeenCalled();
    const redirect = await socketFixture();
    redirect.res.statusCode = 302;
    redirect.res.headers.location = 'https://private.example/secret';
    const returned = m.nodeHttpsTransport(redirect.details, input.signal, redirect.request as unknown as Parameters<typeof m.nodeHttpsTransport>[2]);
    redirect.deliver();
    redirect.res.complete = true;
    redirect.res.emit('end');
    expect((await returned).statusCode).toBe(302);
    expect(redirect.request).toHaveBeenCalledTimes(1);
});
it('https_transport_deadline_includes_hung_dns_and_slow_drip_body', async () => {
    vi.useFakeTimers();
    const m = await moduleUnderTest();
    for (const responseStarted of [false, true]) {
        const socket = await socketFixture();
        const result = m.nodeHttpsTransport(socket.details, input.signal, socket.request as unknown as Parameters<typeof m.nodeHttpsTransport>[2]);
        const rejected = expect(result).rejects.toThrow('transport_timeout');
        if (responseStarted)
            socket.deliver();
        for (let i = 0; i < 7; i++) {
            await vi.advanceTimersByTimeAsync(1000);
            if (responseStarted)
                socket.res.emit('data', Buffer.alloc(1));
        }
        expect(socket.req.destroy).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1000);
        await rejected;
        expect(socket.req.destroy).toHaveBeenCalled();
    }
});
it('https_transport_rejects_oversized_content_length_and_revalidates_endpoint', async () => { const m = await moduleUnderTest(); const socket = await socketFixture(); socket.res.headers['content-length'] = '32769'; const result = m.nodeHttpsTransport(socket.details, input.signal, socket.request as unknown as Parameters<typeof m.nodeHttpsTransport>[2]); const rejected = expect(result).rejects.toThrow('response_too_large'); socket.deliver(); await rejected; expect(() => m.nodeHttpsTransport({ ...socket.details, endpoint: 'http://127.0.0.1/x' }, input.signal, socket.request as unknown as Parameters<typeof m.nodeHttpsTransport>[2])).toThrow(); expect(socket.request).toHaveBeenCalledTimes(1); });
it('Retry_After_dates_are_bounded_and_per_call_VAPID_does_not_bleed', async () => { vi.useFakeTimers(); vi.setSystemTime(new Date('2030-01-01T00:00:00Z')); const m = await moduleUnderTest(); const transport = vi.fn().mockResolvedValue({ statusCode: 503, headers: { 'retry-after': 'Tue, 01 Jan 2030 00:10:00 GMT' } }); expect(await m.createPushSender(config, transport).send(input)).toMatchObject({ retryAfterSeconds: 600 }); const secondPair = createECDH('prime256v1'); secondPair.setPrivateKey(Buffer.alloc(32, 4)); await m.createPushSender({ ...config, vapidPublicKey: secondPair.getPublicKey().toString('base64url'), vapidPrivateKey: secondPair.getPrivateKey().toString('base64url') }, transport).send(input); expect(transport.mock.calls[0][0].headers.Authorization).not.toBe(transport.mock.calls[1][0].headers.Authorization); });
