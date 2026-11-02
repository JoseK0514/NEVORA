import {afterEach, expect, it, vi} from 'vitest';
import {createHash, generateKeyPairSync, randomUUID} from 'node:crypto';
import type {SessionMutationProof} from '../shift-changes/types';
async function api() {
  const m = await import('./http').catch(() => ({}));
  expect(m).toHaveProperty('createNativeRegistrationHandlers');
  return m as typeof import('./http');
}
const pair = generateKeyPairSync('ec', {namedCurve: 'prime256v1'});
const bytes = pair.publicKey.export({format: 'der', type: 'spki'});
const spki = bytes.toString('base64url');
const keyFingerprint = createHash('sha256').update(bytes).digest('hex');
const origin = 'https://nevora.example', appId = 'com.velani.nevora.development';
const proof: SessionMutationProof = {employee: {id: 'fictional', firstName: 'Fictional', lastName: 'Owner', role: 'OWNER', primaryLocationId: 'loc-1'}, sessionTokenHash: 'a'.repeat(64)};
const config = {origin, environment: 'test' as const, encryptionKey: Buffer.alloc(32, 5), applications: {
  ios: {appId, provider: 'apns-sandbox' as const}, android: {appId, provider: 'fcm' as const},
}};
const generation = randomUUID();
const enrollment = () => ({operation: 'enroll', platform: 'ios', spki, operationId: randomUUID(), expectedGeneration: null});
const completion = () => ({challengeId: randomUUID(), nonce: 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE', token: 'a1b2', signature: 'MAA'});
function request(action: string, body: unknown, headers: Record<string, string> = {origin, 'sec-fetch-site': 'same-origin'}) {
  return new Request(origin + '/api/mobile/v1/notifications/' + action, {method: 'POST', headers: {'content-type': 'application/json', ...headers}, body: typeof body === 'string' ? body : JSON.stringify(body)});
}
async function setup() {
  const repository = {issueEnrollment: vi.fn(async () => ({state: 'challenge' as const, challenge: {public: true}})),
    issueMaintenance: vi.fn(async () => ({state: 'conflict' as const})), complete: vi.fn(async () => ({state: 'active' as const, generation})),
    status: vi.fn(async () => ({state: 'active' as const, generation})), cleanupRevoked: vi.fn()};
  const session = vi.fn(async (): Promise<SessionMutationProof | null> => proof);
  const factory = vi.fn(() => repository);
  // Fake repository has the exact boundary responses relevant here; actual
  // challenge shapes and persistence are exercised by real PostgreSQL tests.
  const make = (value: typeof config | null = config) => (api()).then(m => m.createNativeRegistrationHandlers({config: value, session, repository: factory as unknown as Parameters<typeof m.createNativeRegistrationHandlers>[0]['repository']}));
  return {repository, session, factory, make, handlers: await make()};
}
afterEach(() => vi.useRealTimers());
it('uses the actual browser proof and configured binding without accepting account or environment selectors', async () => {
  const f = await setup(), body = enrollment();
  const response = await f.handlers.challenge(request('challenge', body));
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toContain('no-store');
  expect(f.repository.issueEnrollment).toHaveBeenCalledWith({proof, spki, operationId: body.operationId, expectedGeneration: null,
    binding: {origin, environment: 'test', platform: 'ios', appId, provider: 'apns-sandbox', keyFingerprint}});
  expect(JSON.stringify(await response.json())).not.toContain(proof.sessionTokenHash);
  for (const field of ['employeeId', 'sessionHash', 'origin', 'environment', 'provider', 'appId', 'keyFingerprint']) {
    expect((await f.handlers.challenge(request('challenge', {...body, [field]: 'foreign'}))).status).toBe(400);
  }
  expect(f.repository.issueEnrollment).toHaveBeenCalledTimes(1);
});
it('denies absent, Manager and Lead browser authority before creating a repository', async () => {
  const f = await setup();
  for (const role of [null, 'MANAGER', 'LEAD'] as const) {
    f.session.mockResolvedValueOnce(role ? {...proof, employee: {...proof.employee, role}} : null);
    expect((await f.handlers.challenge(request('challenge', enrollment()))).status).toBe(403);
  }
  expect(f.factory).not.toHaveBeenCalled();
});
it.each(['https://foreign.example', 'null', '', 'https://nevora.example.evil'])('rejects browser Origin %s before session/database work', async candidate => {
  const f = await setup();
  expect((await f.handlers.challenge(request('challenge', enrollment(), {origin: candidate}))).status).toBe(403);
  expect((await f.handlers.status(request('status', {keyFingerprint}, {origin: candidate}))).status).toBe(403);
  expect(f.session).not.toHaveBeenCalled(); expect(f.factory).not.toHaveBeenCalled();
});
it('permits cookie-free native completion and maintenance without reading a browser session', async () => {
  const f = await setup(), body = completion();
  const response = await f.handlers.complete(request('complete', body, {}));
  expect(await response.json()).toEqual({state: 'active', generation});
  expect(f.repository.complete).toHaveBeenCalledWith(body);
  expect((await f.handlers.challenge(request('challenge', {operation: 'rotate', keyFingerprint, expectedGeneration: generation, operationId: randomUUID()}, {}))).status).toBe(409);
  expect(f.repository.issueMaintenance).toHaveBeenCalledOnce(); expect(f.session).not.toHaveBeenCalled();
});
it('rejects cross-site, foreign origin, cookies, method/query/path and disabled runtime before writes', async () => {
  const f = await setup();
  const rejectedHeaders: Record<string, string>[] = [{'sec-fetch-site': 'cross-site'}, {origin: 'https://foreign.example'}, {cookie: 'fictional=opaque'}];
  for (const headers of rejectedHeaders) {
    expect((await f.handlers.complete(request('complete', completion(), headers))).status).toBe(403);
  }
  expect((await f.handlers.status(new Request(origin + '/api/mobile/v1/notifications/status?key=1', {method: 'POST'}))).status).toBe(400);
  expect((await f.handlers.status(new Request(origin + '/api/mobile/v1/notifications/status'))).status).toBe(405);
  expect((await f.handlers.complete(new Request('https://foreign.example/api/mobile/v1/notifications/complete', {method: 'POST'}))).status).toBe(403);
  expect((await f.handlers.complete(new Request(origin + '/wrong', {method: 'POST'}))).status).toBe(400);
  expect((await (await f.make(null)).complete(request('complete', completion(), {}))).status).toBe(503);
  expect(f.factory).not.toHaveBeenCalled();
});
it.each(['{"keyFingerprint":"a","keyFingerprint":"b"}', '{"keyFingerprint":"a","key\\u0046ingerprint":"b"}', '{"keyFingerprint":{}}', '[]', 'null', '{"unknown":"a"}', '{"keyFingerprint":1}'])('rejects ambiguous or non-flat JSON %s', async body => {
  const f = await setup(); expect((await f.handlers.status(request('status', body))).status).toBe(400);
  expect(f.factory).not.toHaveBeenCalled();
});
it('bounds actual streamed UTF8 bytes independently of Content-Length and cancels rejected input', async () => {
  const f = await setup(), cancelled = vi.fn(); let emitted = false;
  const body = new ReadableStream({pull(controller) {if (!emitted) {emitted = true; controller.enqueue(new Uint8Array(16385));}}, cancel: cancelled});
  const req = new Request(origin + '/api/mobile/v1/notifications/complete', {method: 'POST', headers: {'content-type': 'application/json', 'content-length': '1'}, body, duplex: 'half'} as RequestInit);
  expect((await f.handlers.complete(req)).status).toBe(413); expect(cancelled).toHaveBeenCalledOnce();
  expect(f.factory).not.toHaveBeenCalled();
});
it('rejects oversized declared lengths, invalid UTF8, wrong content type and aborted bodies', async () => {
  const f = await setup();
  expect((await f.handlers.complete(request('complete', '{}', {'content-length': '99999'}))).status).toBe(413);
  expect((await f.handlers.complete(new Request(origin + '/api/mobile/v1/notifications/complete', {method: 'POST', headers: {'content-type': 'application/json'}, body: new Uint8Array([0xff])}))).status).toBe(400);
  expect((await f.handlers.complete(new Request(origin + '/api/mobile/v1/notifications/complete', {method: 'POST', body: '{}'}))).status).toBe(415);
  const controller = new AbortController(); controller.abort();
  expect((await f.handlers.complete(new Request(origin + '/api/mobile/v1/notifications/complete', {method: 'POST', signal: controller.signal, headers: {'content-type': 'application/json'}, body: '{}'}))).status).toBe(400);
  expect(f.factory).not.toHaveBeenCalled();
});
it('times out a stalled body and cancels its stream without repository work', async () => {
  const f = await setup(); vi.useFakeTimers(); const cancel = vi.fn();
  const req = new Request(origin + '/api/mobile/v1/notifications/complete', {method: 'POST', headers: {'content-type': 'application/json'}, body: new ReadableStream({cancel}), duplex: 'half'} as RequestInit);
  const pending = f.handlers.complete(req); await vi.advanceTimersByTimeAsync(2001);
  expect((await pending).status).toBe(400); expect(cancel).toHaveBeenCalledOnce(); expect(f.factory).not.toHaveBeenCalled();
});
it('returns status without identity/material and sanitizes uncertain database failures', async () => {
  const f = await setup();
  const response = await f.handlers.status(request('status', {keyFingerprint}));
  expect(await response.json()).toEqual({state: 'active', generation});
  f.repository.complete.mockRejectedValueOnce(Error('fictional DB host / token / session secret'));
  const failed = await f.handlers.complete(request('complete', completion(), {}));
  expect(failed.status).toBe(503); expect(await failed.json()).toEqual({state: 'unavailable'});
});
