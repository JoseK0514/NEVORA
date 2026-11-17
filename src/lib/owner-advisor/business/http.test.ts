import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ session: vi.fn(), proof: vi.fn(), service: vi.fn(), version: vi.fn(), executor: { query: vi.fn(), transaction: vi.fn() } }));
vi.mock('@/lib/auth/session', () => ({ getSession: state.session, requireSessionMutationProof: state.proof }));
vi.mock('@/lib/data/sql-executor', () => ({ neonNotificationExecutor: () => state.executor }));
vi.mock('./service.server', async original => ({ ...await original<typeof import('./service.server')>(), businessSourceService: state.service, readBusinessVersion: state.version }));
import { businessHttp } from './http.server';
const url = 'http://localhost/api/owner/advisor/business';
const headers = () => new Headers({ 'x-nevora-business-evidence': '1', origin: 'http://localhost', 'content-type': 'application/json' });
const request = (body: BodyInit = '{}', overrides: Record<string, string> = {}) => new Request(url, { method: 'POST', headers: { ...Object.fromEntries(headers()), ...overrides }, body });
beforeEach(() => {
  vi.resetAllMocks();
  state.session.mockResolvedValue({ id: 'owner', role: 'OWNER' });
  state.proof.mockResolvedValue({ employee: { id: 'owner', role: 'OWNER' }, sessionTokenHash: 'a'.repeat(64) });
  state.service.mockResolvedValue({ state: 'ready', validForMs: 15000 });
});
afterEach(() => vi.restoreAllMocks());

it.each([
  ['origin', '', 403], ['origin', 'https://evil.invalid', 403], ['sec-fetch-site', 'cross-site', 403],
  ['sec-fetch-site', 'same-site', 403], ['x-nevora-business-evidence', '', 403], ['x-nevora-business-evidence', 'true', 403],
  ['content-type', 'text/plain', 403], ['content-length', '524289', 400], ['content-length', '-1', 400],
] as const)('rejects invalid %s=%s before authentication or service work', async (key, value, status) => {
  const response = await businessHttp(request('{}', { [key]: value }));
  expect(response.status).toBe(status); expect(state.session).not.toHaveBeenCalled(); expect(state.service).not.toHaveBeenCalled();
});

it('rejects query parameters and unsupported methods', async () => {
  expect((await businessHttp(new Request(url + '?owner=other', { method: 'POST', headers: headers(), body: '{}' }))).status).toBe(400);
  expect((await businessHttp(new Request(url, { method: 'PUT', headers: headers() }))).status).toBe(405);
  expect(state.service).not.toHaveBeenCalled();
});

it.each(['missing', 'manager', 'employee', 'mismatched-proof'])('denies %s authentication without service work', async mode => {
  if (mode === 'missing') state.session.mockResolvedValue(null);
  else if (mode === 'mismatched-proof') state.proof.mockResolvedValue({ employee: { id: 'other', role: 'OWNER' } });
  else state.session.mockResolvedValue({ id: 'owner', role: mode.toUpperCase() });
  expect((await businessHttp(request())).status).toBe(mode === 'missing' ? 401 : 403);
  expect(state.service).not.toHaveBeenCalled();
});

it('rejects malformed JSON and fatal UTF-8 without invoking the service', async () => {
  expect((await businessHttp(request('{'))).status).toBe(400);
  const bytes = new Uint8Array([...new TextEncoder().encode('{"text":"'), 0xc3, 0x28, ...new TextEncoder().encode('"}')]);
  expect((await businessHttp(request(bytes))).status).toBe(400);
  expect(state.service).not.toHaveBeenCalled();
});

it.each([undefined, '1'])('bounds actual streamed bytes with Content-Length %s and cancels the body', async length => {
  const cancel = vi.fn(), body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(524289).fill(32)); }, cancel });
  const h = headers(); if (length) h.set('content-length', length);
  const response = await businessHttp(new Request(url, { method: 'POST', headers: h, body, duplex: 'half' } as RequestInit));
  expect(response.status).toBe(400); expect(cancel).toHaveBeenCalled(); expect(state.service).not.toHaveBeenCalled();
});

it.each(['request', 'deadline'])('cancels an open body promptly on %s abort', async kind => {
  const controller = new AbortController(); if (kind === 'deadline') vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
  const cancel = vi.fn(), body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode('{')); }, cancel });
  const pending = businessHttp(new Request(url, { method: 'POST', headers: headers(), body, signal: kind === 'request' ? controller.signal : undefined, duplex: 'half' } as RequestInit));
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); controller.abort();
  const result = await pending; expect(result.status).toBe(503); expect(await result.json()).toEqual({ state: 'error', code: 'cancelled' });
  expect(cancel).toHaveBeenCalled(); expect(state.service).not.toHaveBeenCalled();
});

it('uses one entry deadline across pending authentication and ignores its late result', async () => {
  const controller = new AbortController(); vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
  let release: ((value: unknown) => void) | undefined;
  state.session.mockImplementation(() => new Promise(resolve => { release = resolve; }));
  const pending = businessHttp(request()); controller.abort();
  expect((await pending).status).toBe(503);
  release?.({ id: 'owner', role: 'OWNER' }); await Promise.resolve(); await Promise.resolve();
  expect(state.proof).not.toHaveBeenCalled(); expect(state.service).not.toHaveBeenCalled();
});

it('returns private no-store JSON and does not expose raw upstream errors', async () => {
  const response = await businessHttp(request('{"op":"stage_source_version"}'));
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store, private');
  expect(response.headers.get('vary')).toBe('Cookie'); expect(response.headers.get('referrer-policy')).toBe('no-referrer'); expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  expect(state.service).toHaveBeenCalledWith(expect.objectContaining({ employee: { id: 'owner', role: 'OWNER' } }), expect.any(Object), expect.any(Object), expect.any(AbortSignal), { op: 'stage_source_version' });
  state.service.mockRejectedValue(Error('Private SQL and secret must stay internal'));
  const unavailable = await businessHttp(request()); expect(unavailable.status).toBe(503);
  expect(await unavailable.text()).toBe('{"state":"error","code":"unavailable"}');
});
