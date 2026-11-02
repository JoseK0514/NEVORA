import {afterEach, expect, it, vi} from 'vitest';
import type {NativeTransportRequest, NativeTransportResponse} from './transport';
const forbidden = vi.hoisted(() => vi.fn(() => {throw Error('Real network forbidden in native provider tests');}));
vi.mock('node:https', () => ({request: forbidden}));
vi.mock('node:http2', () => ({connect: forbidden}));
async function api() {
  const m = await import('./fcm').catch(() => ({})); expect(m).toHaveProperty('createFcmSender');
  return m as typeof import('./fcm');
}
const generation = '00000000-0000-4000-8000-000000000001', now = new Date('2030-01-01T12:00:00.000Z');
const scope = {origin: 'https://nevora.example', environment: 'test' as const, appId: 'com.velani.nevora.development'};
const input = () => ({installation: {...scope, platform: 'android' as const, provider: 'fcm' as const, keyFingerprint: '0'.repeat(64), generation, token: 'fictional-token:opaque-1'},
  payload: {notificationId: 'fictional-notice', generation}, ttlSeconds: 60, urgency: 'normal' as const, signal: new AbortController().signal});
const response = (statusCode = 200, body: unknown = {name: 'projects/fictional-test/messages/opaque-notice'}, retryAfter?: string): NativeTransportResponse => ({statusCode, body: Buffer.from(JSON.stringify(body)), ...(retryAfter ? {retryAfter} : {})});
const config = () => ({...scope, projectId: 'fictional-test', accessToken: vi.fn(async () => 'fictional-access-token'), clock: () => new Date(now)});
afterEach(() => {vi.useRealTimers(); expect(forbidden).not.toHaveBeenCalled();});
it('sends exact HTTPv1 generic notification/data with package, priority and TTL restrictions', async () => {
  const m = await api(), cfg = config(), requests: NativeTransportRequest[] = [];
  const sender = m.createFcmSender(cfg, async request => {requests.push(request); return response();});
  expect(await sender.send(input())).toEqual({kind: 'accepted'});
  expect(cfg.accessToken).toHaveBeenCalledWith(expect.any(AbortSignal));
  expect(requests[0].endpoint).toBe('https://fcm.googleapis.com/v1/projects/fictional-test/messages:send');
  expect(requests[0].headers).toEqual({'content-type': 'application/json', authorization: 'Bearer fictional-access-token'});
  expect(JSON.parse(requests[0].body.toString())).toEqual({message: {token: 'fictional-token:opaque-1',
    notification: {title: 'NEVORA', body: 'Open NEVORA.'}, data: {nevoraProtocol: '1', notificationId: 'fictional-notice', generation},
    android: {restricted_package_name: scope.appId, priority: 'NORMAL', ttl: '60s', notification: {channel_id: 'nevora_notifications', visibility: 'PRIVATE'}}}});
  expect(await sender.send({...input(), urgency: 'high'})).toEqual({kind: 'accepted'});
  expect(JSON.parse(requests[1].body.toString()).message.android.priority).toBe('HIGH');
});
it.each([
  [404, {error: {code: 404, status: 'NOT_FOUND', details: [{'@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'UNREGISTERED'}]}}, undefined, {kind: 'invalid_registration'}],
  [400, {error: {code: 400, status: 'INVALID_ARGUMENT', details: [{'@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'INVALID_ARGUMENT'}]}}, undefined, {kind: 'failed', errorClass: 'provider_rejected'}],
  [404, {error: {code: 404, status: 'NOT_FOUND', message: 'UNREGISTERED fictional private token'}}, undefined, {kind: 'failed', errorClass: 'provider_rejected'}],
  [401, {error: {message: 'fictional private credential'}}, undefined, {kind: 'failed', errorClass: 'provider_configuration'}],
  [403, {error: {status: 'PERMISSION_DENIED'}}, undefined, {kind: 'failed', errorClass: 'provider_configuration'}],
  [429, {error: {status: 'QUOTA_EXCEEDED'}}, '1', {kind: 'retry', errorClass: 'provider_throttled', retryAfterSeconds: 60}],
  [503, {error: {status: 'UNAVAILABLE'}}, '120', {kind: 'retry', errorClass: 'provider_unavailable', retryAfterSeconds: 120}],
  [500, null, undefined, {kind: 'retry', errorClass: 'provider_unavailable', retryAfterSeconds: 60}],
  [302, {location: 'https://foreign.example'}, undefined, {kind: 'failed', errorClass: 'provider_rejected'}],
  [200, {name: 'projects/foreign/messages/id'}, undefined, {kind: 'retry', errorClass: 'provider_response'}],
] as const)('classifies FCM %s without treating a general invalid argument as token revocation', async (status, body, retryAfter, outcome) => {
  expect(await (await api()).createFcmSender(config(), async () => response(status, body, retryAfter)).send(input())).toEqual(outcome);
});
it('rejects foreign app/environment, malformed configuration/token/TTL and private payload fields before IO', async () => {
  const m = await api(), transport = vi.fn(async () => response()), cfg = config(), sender = m.createFcmSender(cfg, transport);
  expect(await m.createFcmSender(null, transport).send(input())).toEqual({kind: 'failed', errorClass: 'provider_configuration'});
  expect(await m.createFcmSender({...cfg, projectId: '../foreign'}, transport).send(input())).toEqual({kind: 'failed', errorClass: 'provider_configuration'});
  expect((await sender.send({...input(), installation: {...input().installation, environment: 'production'}})).kind).toBe('failed');
  expect((await sender.send({...input(), ttlSeconds: 0})).kind).toBe('failed');
  const privateInput = {...input(), payload: {...input().payload, body: 'Fictional private payroll'}};
  expect((await sender.send(privateInput)).kind).toBe('failed');
  expect(transport).not.toHaveBeenCalled(); expect(cfg.accessToken).not.toHaveBeenCalled();
  expect((await m.createFcmSender({...cfg, accessToken: async () => 'bad\r\ncredential'}, transport).send(input())).kind).toBe('failed');
  expect(transport).not.toHaveBeenCalled();
});
it('bounds credential waits and forbids a late credential callback from starting a send after cancellation', async () => {
  const m = await api(), transport = vi.fn(async () => response()); let resolve!: (value: string) => void;
  const accessToken = vi.fn(() => new Promise<string>(yes => {resolve = yes;}));
  vi.useFakeTimers(); const pending = m.createFcmSender({...config(), accessToken}, transport).send(input());
  await vi.advanceTimersByTimeAsync(8001); expect(await pending).toEqual({kind: 'retry', errorClass: 'transport_timeout'});
  resolve('fictional-late-token'); await vi.advanceTimersByTimeAsync(0); expect(transport).not.toHaveBeenCalled();
});
it('detaches mutable token/payload input before awaiting credentials', async () => {
  const m = await api(), requests: NativeTransportRequest[] = []; let resolve!: (value: string) => void;
  const accessToken = () => new Promise<string>(yes => {resolve = yes;});
  const value = input(), pending = m.createFcmSender({...config(), accessToken}, async request => {requests.push(request); return response();}).send(value);
  value.installation.token = 'substituted-token'; value.payload.notificationId = 'substituted-notice';
  resolve('fictional-valid-token'); expect(await pending).toEqual({kind: 'accepted'});
  const message = JSON.parse(requests[0].body.toString()).message;
  expect(message.token).toBe('fictional-token:opaque-1'); expect(message.data.notificationId).toBe('fictional-notice');
});
it('fails closed on invalid UTF8/oversized response bodies and redacts unknown exceptions', async () => {
  const m = await api();
  expect(await m.createFcmSender(config(), async () => ({statusCode: 200, body: Buffer.from([0xff])})).send(input())).toEqual({kind: 'retry', errorClass: 'provider_response'});
  expect(await m.createFcmSender(config(), async () => ({statusCode: 200, body: Buffer.alloc(8193)})).send(input())).toEqual({kind: 'failed', errorClass: 'provider_response'});
  expect(await m.createFcmSender(config(), async () => {throw Error('fictional private account/token');}).send(input())).toEqual({kind: 'retry', errorClass: 'transport_error'});
});
