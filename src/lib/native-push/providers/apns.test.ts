import {afterEach, expect, it, vi} from 'vitest';
import {generateKeyPairSync, verify} from 'node:crypto';
import type {NativeTransportResponse} from './transport';
const forbidden = vi.hoisted(() => vi.fn(() => {throw Error('Real network forbidden in native provider tests');}));
vi.mock('node:https', () => ({request: forbidden}));
vi.mock('node:http2', () => ({connect: forbidden}));
async function api() {
  const m = await import('./apns').catch(() => ({})); expect(m).toHaveProperty('createApnsSender');
  return m as typeof import('./apns');
}
const pair = generateKeyPairSync('ec', {namedCurve: 'prime256v1'});
const now = new Date('2030-01-01T12:00:00.000Z'), generation = '00000000-0000-4000-8000-000000000001';
const config = {origin: 'https://nevora.example', environment: 'test' as const, appId: 'com.velani.nevora.development', provider: 'apns-sandbox' as const,
  teamId: 'FAKETEAM01', keyId: 'FAKEKEY001', privateKey: pair.privateKey, clock: () => new Date(now)};
const input = () => ({installation: {origin: config.origin, environment: 'test' as const, platform: 'ios' as const, provider: 'apns-sandbox' as const, appId: config.appId, keyFingerprint: '0'.repeat(64), generation, token: 'a1b2'},
  payload: {notificationId: 'fictional-notice', generation}, ttlSeconds: 60, urgency: 'normal' as const, signal: new AbortController().signal, beforeHandoff: async (): Promise<number | null> => 60});
const response = (statusCode = 200, body: unknown = null, retryAfter?: string): NativeTransportResponse => ({statusCode, body: body === null ? Buffer.alloc(0) : Buffer.from(JSON.stringify(body)), ...(retryAfter ? {retryAfter} : {})});
afterEach(() => {vi.useRealTimers(); expect(forbidden).not.toHaveBeenCalled();});
it('sends only generic data to the exact sandbox topic with a real ES256 JOSE provider signature', async () => {
  const m = await api(), transport = vi.fn(async () => response());
  expect(await m.createApnsSender(config, transport).send(input())).toEqual({kind: 'accepted'});
  const [request] = transport.mock.calls[0] as unknown as [Parameters<import('./transport').NativeTransport>[0]];
  expect(request.endpoint).toBe('https://api.sandbox.push.apple.com/3/device/a1b2');
  expect(request.headers).toMatchObject({'apns-topic': config.appId, 'apns-push-type': 'alert', 'apns-priority': '5', 'apns-expiration': String(now.getTime() / 1000 + 60)});
  const jwt = request.headers.authorization.slice('bearer '.length), [header, claims, signature] = jwt.split('.');
  expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({alg: 'ES256', typ: 'JWT', kid: config.keyId});
  expect(JSON.parse(Buffer.from(claims, 'base64url').toString())).toEqual({iss: config.teamId, iat: now.getTime() / 1000});
  expect(Buffer.from(signature, 'base64url')).toHaveLength(64);
  expect(verify('sha256', Buffer.from(header + '.' + claims), {key: pair.publicKey, dsaEncoding: 'ieee-p1363'}, Buffer.from(signature, 'base64url'))).toBe(true);
  expect(JSON.parse(request.body.toString())).toEqual({aps: {alert: {title: 'NEVORA', body: 'Open NEVORA.'}}, nevora: {version: 1, notificationId: 'fictional-notice', generation}});
  expect(request.headers['apns-collapse-id']).toMatch(/^[a-f0-9]{64}$/);
});
it('keeps production provider/origin/app binding separate and rejects mismatched records before IO', async () => {
  const m = await api(), transport = vi.fn(async () => response());
  const production = {...config, environment: 'production' as const, provider: 'apns-production' as const};
  const value = input();
  expect(await m.createApnsSender(production, transport).send(value)).toEqual({kind: 'failed', errorClass: 'provider_configuration'});
  expect(transport).not.toHaveBeenCalled();
  expect(await m.createApnsSender(production, transport).send({...value, urgency: 'high', installation: {...value.installation, environment: 'production', provider: 'apns-production'}})).toEqual({kind: 'accepted'});
  const [request] = transport.mock.calls[0] as unknown as [Parameters<import('./transport').NativeTransport>[0]];
  expect(request.endpoint).toBe('https://api.push.apple.com/3/device/a1b2'); expect(request.headers['apns-priority']).toBe('10');
});
it('reuses the provider JWT and refreshes at fifty minutes without saving any private key', async () => {
  const m = await api(), requests: string[] = []; let elapsed = 0;
  const sender = m.createApnsSender({...config, clock: () => new Date(now.getTime() + elapsed)}, async request => {requests.push(request.headers.authorization); return response();});
  await sender.send(input()); elapsed = 49 * 60000; await sender.send(input()); elapsed = 50 * 60000; await sender.send(input());
  expect(requests[1]).toBe(requests[0]); expect(requests[2]).not.toBe(requests[0]);
});
it.each([
  [410, {reason: 'Unregistered', timestamp: now.getTime() - 1000}, undefined, {kind: 'invalid_registration', invalidatedAt: now.getTime() - 1000}],
  [400, {reason: 'BadDeviceToken'}, undefined, {kind: 'invalid_registration'}],
  [400, {reason: 'DeviceTokenNotForTopic'}, undefined, {kind: 'failed', errorClass: 'provider_configuration'}],
  [403, {reason: 'ExpiredProviderToken', private: 'fictional token'}, undefined, {kind: 'failed', errorClass: 'provider_configuration'}],
  [429, {reason: 'TooManyRequests'}, '120', {kind: 'retry', errorClass: 'provider_throttled', retryAfterSeconds: 120}],
  [429, {reason: 'TooManyProviderTokenUpdates'}, undefined, {kind: 'retry', errorClass: 'provider_throttled', retryAfterSeconds: 1200}],
  [503, {reason: 'Shutdown'}, '60', {kind: 'retry', errorClass: 'provider_unavailable', retryAfterSeconds: 900}],
  [500, null, '1200', {kind: 'retry', errorClass: 'provider_unavailable', retryAfterSeconds: 1200}],
  [302, {reason: 'fictional secret redirect'}, undefined, {kind: 'failed', errorClass: 'provider_rejected'}],
  [410, {reason: 'Unregistered', timestamp: 'bad'}, undefined, {kind: 'failed', errorClass: 'provider_response'}],
] as const)('classifies APNs %s without reflecting diagnostics', async (status, body, retryAfter, result) => {
  expect(await (await api()).createApnsSender(config, async () => response(status, body, retryAfter)).send(input())).toEqual(result);
});
it('honors a bounded HTTP-date Retry-After and refuses an unrepresentable retry window', async () => {
  const m = await api();
  expect(await m.createApnsSender(config, async () => response(503, null, new Date(now.getTime() + 1800000).toUTCString())).send(input())).toEqual({kind: 'retry', errorClass: 'provider_unavailable', retryAfterSeconds: 1800});
  expect(await m.createApnsSender(config, async () => response(503, null, '9'.repeat(100))).send(input())).toEqual({kind: 'failed', errorClass: 'provider_response'});
});
it('fails closed on missing/bad configuration, invalid TTL, stale payload generation and private fields', async () => {
  const m = await api(), transport = vi.fn(async () => response()), sender = m.createApnsSender(config, transport);
  expect(await m.createApnsSender(null, transport).send(input())).toEqual({kind: 'failed', errorClass: 'provider_configuration'});
  for (const bad of [{...config, privateKey: pair.publicKey}, {...config, teamId: 'bad'}, {...config, keyId: 'bad'},
    {...config, privateKey: generateKeyPairSync('ec', {namedCurve: 'secp384r1'}).privateKey}]) {
    expect(await m.createApnsSender(bad, transport).send(input())).toEqual({kind: 'failed', errorClass: 'provider_configuration'});
  }
  for (const ttlSeconds of [0, -1, 1.5, 7 * 86400 + 1]) expect((await sender.send({...input(), ttlSeconds})).kind).toBe('failed');
  expect((await sender.send({...input(), payload: {...input().payload, generation: '00000000-0000-4000-8000-000000000002'}})).kind).toBe('failed');
  const privateInput = {...input(), payload: {...input().payload, body: 'Private fictional payroll detail'}};
  expect((await sender.send(privateInput)).kind).toBe('failed');
  expect(transport).not.toHaveBeenCalled();
});
it('redacts unknown transport failures and bounds an injected transport that ignores cancellation', async () => {
  const m = await api();
  expect(await m.createApnsSender(config, async () => {throw Error('fictional private provider key/token');}).send(input())).toEqual({kind: 'retry', errorClass: 'transport_error'});
  vi.useFakeTimers(); const sender = m.createApnsSender(config, async () => await new Promise<never>(() => {}));
  const pending = sender.send(input()); await vi.advanceTimersByTimeAsync(8001);
  expect(await pending).toEqual({kind: 'retry', errorClass: 'transport_timeout'});
});
it('requires the attempt gate before APNs IO and uses its shorter current TTL', async () => {
  const m = await api(), requests: Parameters<import('./transport').NativeTransport>[0][] = [];
  const sender = m.createApnsSender(config, async request => {requests.push(request); return response();});
  const beforeHandoff = vi.fn(async () => 10), value = {...input(), beforeHandoff};
  expect(await sender.send(value)).toEqual({kind: 'accepted'});
  expect(beforeHandoff).toHaveBeenCalledOnce(); expect(requests[0].headers['apns-expiration']).toBe(String(now.getTime() / 1000 + 10));
  expect(await sender.send({...value, beforeHandoff: async () => null})).toEqual({kind: 'not_sent'});
  expect(requests).toHaveLength(1);
});
