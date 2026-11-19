import * as rstestOriginal0 from "./service.server" with { rstest: 'importActual' };
import { afterEach, beforeEach, expect, it, rs } from '@rstest/core';
const state = rs.hoisted(() => ({ session: rs.fn(), proof: rs.fn(), service: rs.fn(), version: rs.fn(), executor: { query: rs.fn(), transaction: rs.fn() } }));
rs.mock('@/lib/auth/session', () => ({ getSession: state.session, requireSessionMutationProof: state.proof }));
rs.mock('@/lib/data/sql-executor', () => ({ neonNotificationExecutor: () => state.executor }));
rs.mock('./service.server',  () => ({ ...rstestOriginal0, businessSourceService: state.service, readBusinessVersion: state.version }));
import { businessHttp } from './http.server';
import { AdvisorError } from '../contracts';
import { BusinessValidationError } from './service.server';
import { BUSINESS_ERROR_CODES, isBusinessErrorResult } from './contracts';
const url = 'http://localhost/api/owner/advisor/business';
const headers = () => new Headers({ 'x-nevora-business-evidence': '1', origin: 'http://localhost', 'content-type': 'application/json' });
const request = (body: BodyInit = '{}', overrides: Record<string, string> = {}) => new Request(url, { method: 'POST', headers: { ...Object.fromEntries(headers()), ...overrides }, body });
beforeEach(() => {
  rs.resetAllMocks();
  state.session.mockResolvedValue({ id: 'owner', role: 'OWNER' });
  state.proof.mockResolvedValue({ employee: { id: 'owner', role: 'OWNER' }, sessionTokenHash: 'a'.repeat(64) });
  state.service.mockResolvedValue({ state: 'ready', validForMs: 15000 });
});
afterEach(() => { rs.restoreAllMocks(); });

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
  const cancel = rs.fn(), body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(524289).fill(32)); }, cancel });
  const h = headers(); if (length) h.set('content-length', length);
  const response = await businessHttp(new Request(url, { method: 'POST', headers: h, body, duplex: 'half' } as RequestInit));
  expect(response.status).toBe(400); expect(cancel).toHaveBeenCalled(); expect(state.service).not.toHaveBeenCalled();
});

it.each(['request', 'deadline'])('cancels an open body promptly on %s abort', async kind => {
  const controller = new AbortController(); if (kind === 'deadline') rs.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
  const cancel = rs.fn(), body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode('{')); }, cancel });
  const pending = businessHttp(new Request(url, { method: 'POST', headers: headers(), body, signal: kind === 'request' ? controller.signal : undefined, duplex: 'half' } as RequestInit));
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); controller.abort();
  const result = await pending; expect(result.status).toBe(503); expect(await result.json()).toEqual({ state: 'error', code: 'cancelled' });
  expect(cancel).toHaveBeenCalled(); expect(state.service).not.toHaveBeenCalled();
});

it('uses one entry deadline across pending authentication and ignores its late result', async () => {
  const controller = new AbortController(); rs.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
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

it('does not expose non-business adviser error codes through the business HTTP contract', async () => {
  state.service.mockRejectedValue(new AdvisorError('provider_failed'));
  const result = await businessHttp(request());
  expect(result.status).toBe(503);
  expect(await result.json()).toEqual({ state: 'error', code: 'unavailable' });
});

it.each(BUSINESS_ERROR_CODES)('returns the closed %s error envelope with its expected status', async code => {
  state.service.mockRejectedValue(new AdvisorError(code));
  const response = await businessHttp(request()), result = await response.json();
  const status = code === 'forbidden' ? 403 : code === 'invalid' ? 400 : code === 'conflict' ? 409 : code === 'limit' ? 429 : 503;
  expect(response.status).toBe(status);
  expect(isBusinessErrorResult(result)).toBe(true);
  expect(result).toEqual({ state: 'error', code });
});
it('preserves only the safe validation detail envelope for field and row feedback', async () => {
  const detail = { code: 'INVALID_INPUT', field: 'duplicate_record', row: 2, line: null } as const;
  state.service.mockRejectedValue(new BusinessValidationError(detail));
  const response = await businessHttp(request()), result = await response.json();
  expect(response.status).toBe(400);
  expect(isBusinessErrorResult(result)).toBe(true);
  expect(result).toEqual({ state: 'error', code: 'invalid', detail });
});
