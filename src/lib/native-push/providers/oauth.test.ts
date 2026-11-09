import {afterEach, expect, it, vi} from 'vitest';
import {generateKeyPairSync, verify} from 'node:crypto';
import type {NativeTransportRequest} from './transport';
const forbidden = vi.hoisted(() => vi.fn(() => {throw Error('Real network forbidden in native OAuth tests');}));
vi.mock('node:https', () => ({request: forbidden}));
vi.mock('node:http2', () => ({connect: forbidden}));
async function api() {const m = await import('./oauth').catch(() => ({})); expect(m).toHaveProperty('createGoogleAccessTokenSupplier'); return m as typeof import('./oauth');}
const pair = generateKeyPairSync('rsa', {modulusLength: 2048});
const now = new Date('2030-01-01T12:00:00.000Z');
const config = {clientEmail: 'native-qa@fictional-test.iam.gserviceaccount.com', keyId: 'a'.repeat(40), privateKey: pair.privateKey, clock: () => new Date(now)};
afterEach(() => {vi.useRealTimers(); expect(forbidden).not.toHaveBeenCalled();});
it('mints a real RS256 scoped JWT only to the fixed OAuth endpoint and caches the short-lived token', async () => {
  const m = await api(), requests: NativeTransportRequest[] = []; let elapsed = 0;
  const accessToken = m.createGoogleAccessTokenSupplier({...config, clock: () => new Date(now.getTime() + elapsed)}, async request => {
    requests.push(request); return {statusCode: 200, body: Buffer.from(JSON.stringify({access_token: 'fictional-opaque-token', token_type: 'Bearer', expires_in: 3600}))};
  });
  expect(await accessToken(new AbortController().signal)).toBe('fictional-opaque-token');
  expect(requests[0].endpoint).toBe('https://oauth2.googleapis.com/token');
  expect(requests[0].headers).toEqual({'content-type': 'application/x-www-form-urlencoded'});
  const form = new URLSearchParams(requests[0].body.toString());
  expect([...form.keys()]).toEqual(['grant_type', 'assertion']); expect(form.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
  const [header, claims, signature] = form.get('assertion')!.split('.');
  expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({alg: 'RS256', typ: 'JWT', kid: config.keyId});
  expect(JSON.parse(Buffer.from(claims, 'base64url').toString())).toEqual({iss: config.clientEmail, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now.getTime() / 1000, exp: now.getTime() / 1000 + 3600});
  expect(verify('RSA-SHA256', Buffer.from(header + '.' + claims), pair.publicKey, Buffer.from(signature, 'base64url'))).toBe(true);
  elapsed = 58 * 60000; await accessToken(new AbortController().signal); expect(requests).toHaveLength(1);
  elapsed = 59 * 60000; await accessToken(new AbortController().signal); expect(requests).toHaveLength(2);
});
it.each([null, {...config, privateKey: pair.publicKey}, {...config, clientEmail: 'person@foreign.example'}, {...config, keyId: 'bad'}])('rejects missing or malformed service-account configuration before IO', async cfg => {
  const transport = vi.fn(); await expect((await api()).createGoogleAccessTokenSupplier(cfg, transport)(new AbortController().signal)).rejects.toThrow('provider_configuration');
  expect(transport).not.toHaveBeenCalled();
});
it.each([
  {access_token: 'fictional-token', token_type: 'Bearer', expires_in: 0},
  {access_token: 'fictional-token', token_type: 'Bearer', expires_in: 3601},
  {access_token: 'fictional-token', token_type: 'Bearer', expires_in: '3600'},
  {access_token: 'bad\r\nfictional', token_type: 'Bearer', expires_in: 3600},
  {access_token: 'fictional-token', token_type: 'Other', expires_in: 3600},
])('rejects malformed successful OAuth responses without caching them', async body => {
  const transport = vi.fn(async () => ({statusCode: 200, body: Buffer.from(JSON.stringify(body))}));
  const supplier = (await api()).createGoogleAccessTokenSupplier(config, transport);
  await expect(supplier(new AbortController().signal)).rejects.toThrow('provider_response');
  await expect(supplier(new AbortController().signal)).rejects.toThrow('provider_response'); expect(transport).toHaveBeenCalledTimes(2);
});
it('classifies auth failures separately from unavailable providers without echoing diagnostics', async () => {
  const m = await api();
  for (const statusCode of [400, 401, 403]) await expect(m.createGoogleAccessTokenSupplier(config, async () => ({statusCode, body: Buffer.from('{"error":"fictional private credential"}')}))(new AbortController().signal)).rejects.toThrow('provider_configuration');
  await expect(m.createGoogleAccessTokenSupplier(config, async () => ({statusCode: 503, retryAfter: '120', body: Buffer.alloc(0)}))(new AbortController().signal)).rejects.toMatchObject({kind: 'retry', code: 'provider_unavailable', retryAfterSeconds: 120});
});
it('does not let raw transport or credential diagnostics escape the token-supplier boundary', async () => {
  const supplier = (await api()).createGoogleAccessTokenSupplier(config, async () => {throw Error('fictional private host/key/token');});
  await expect(supplier(new AbortController().signal)).rejects.toThrow(/^transport_error$/);
});
it('bounds a stalled token exchange and refuses to cache its late result', async () => {
  const m = await api(); let resolve!: (value: {statusCode: number; body: Buffer}) => void;
  const transport = vi.fn<import('./transport').NativeTransport>()
    .mockImplementationOnce(() => new Promise<{statusCode: number; body: Buffer}>(yes => {resolve = yes;}))
    .mockResolvedValueOnce({statusCode: 200, body: Buffer.from('{"access_token":"fictional-fresh-token","token_type":"Bearer","expires_in":3600}')});
  const supplier = m.createGoogleAccessTokenSupplier(config, transport); vi.useFakeTimers();
  const pending = supplier(new AbortController().signal), assertion = expect(pending).rejects.toThrow('transport_timeout');
  await vi.advanceTimersByTimeAsync(8001); await assertion;
  resolve({statusCode: 200, body: Buffer.from('{"access_token":"fictional-late-token","token_type":"Bearer","expires_in":3600}')});
  await vi.advanceTimersByTimeAsync(0);
  const controller = new AbortController(); controller.abort(); await expect(supplier(controller.signal)).rejects.toThrow('transport_timeout');
  expect(transport).toHaveBeenCalledOnce();
  expect(await supplier(new AbortController().signal)).toBe('fictional-fresh-token');
  expect(transport).toHaveBeenCalledTimes(2);
});
