import { afterEach, expect, it, rs } from '@rstest/core';
rs.mock('@/lib/auth/session', () => ({ getSession: async () => ({ id: 'owner', role: 'OWNER' }), requireSessionMutationProof: async () => ({ employee: { id: 'owner', role: 'OWNER' } }) }));
rs.mock('@/lib/data/sql-executor', () => ({ neonNotificationExecutor: () => ({}) }));
import { knowledgeHttp } from './company-knowledge-http.server';
afterEach(() => rs.restoreAllMocks());
function openRequest(signal?: AbortSignal) {
  const cancel = rs.fn();
  const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode('{')); }, cancel });
  return { cancel, request: new Request('http://localhost/api/owner/advisor/knowledge', { method: 'POST', headers: { 'x-nevora-company-knowledge': '1', origin: 'http://localhost', 'content-type': 'application/json' }, body, signal, duplex: 'half' } as RequestInit) };
}
it.each(['request', 'deadline'])('cancels an open text body on %s before any service action', async kind => {
  const controller = new AbortController();
  if (kind === 'deadline') rs.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
  const f = openRequest(kind === 'request' ? controller.signal : undefined), action = rs.fn(async () => Response.json({ state: 'ready' }));
  const pending = knowledgeHttp(f.request, action, { write: true });
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  controller.abort();
  const r = await pending;
  expect(r.status).toBe(503);
  expect(await r.json()).toEqual({ state: 'error', code: 'cancelled' });
  expect(action).not.toHaveBeenCalled();
  expect(f.cancel).toHaveBeenCalled();
});
it('rejects invalid UTF-8 rather than replacing corrupted source bytes', async () => {
  const action = rs.fn(async () => Response.json({}));
  // Replacement decoding would turn this into valid JSON and call the action.
  const bytes = new Uint8Array([...new TextEncoder().encode('{"body":"'), 0xc3, 0x28, ...new TextEncoder().encode('"}')]);
  const request = new Request('http://localhost/api/owner/advisor/knowledge', { method: 'POST', headers: { 'x-nevora-company-knowledge': '1', origin: 'http://localhost', 'content-type': 'application/json' }, body: bytes });
  expect((await knowledgeHttp(request, action, { write: true })).status).toBe(400);
  expect(action).not.toHaveBeenCalled();
});
