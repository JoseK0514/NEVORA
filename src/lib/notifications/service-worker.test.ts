import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { buildPushEnvelope, PUSH_KINDS } from './payloads';
import type { NotificationIntent } from './types';

const workerPath = 'public/fuel-portal-sw.js';
const origin = 'https://portal.example';
const generation = 'owner-generation-a';
const envelope = { notificationId: '11111111-1111-4111-8111-111111111111', kind: 'SCHEDULE_CHANGED', ownershipGeneration: generation, expiresAt: '2099-01-01T00:00:00.000Z', tag: `fuel-${'a'.repeat(32)}`, title: 'Your NEVORA Schedule Changed', body: 'Open NEVORA to review your schedule.' };
const assets = ['/fuel-portal-offline.html', '/images/nevora-wordmark.png', '/icons/fuel-192.png', '/icons/fuel-512.png', '/icons/fuel-maskable-192.png', '/icons/fuel-maskable-512.png', '/icons/fuel-apple-180.png'];

// Browser boundary doubles: actual worker source owns routing, validation and writes.
function storage() {
  const data = new Map<string, unknown>();
  let unavailable = false;
  return {
    data,
    fail() { unavailable = true; },
    recover() { unavailable = false; },
    open() {
      const request = { result: undefined as unknown, onupgradeneeded: () => {}, onsuccess: () => {}, onerror: () => {}, error: new Error('storage unavailable') };
      queueMicrotask(() => {
        if (unavailable) return request.onerror();
        request.result = {
          createObjectStore() {}, close() {},
          transaction() {
            const transaction = { oncomplete: () => {}, onerror: () => {}, onabort: () => {}, objectStore: () => ({
              get(key: string) {
                const result = { result: undefined as unknown, onsuccess: () => {} };
                queueMicrotask(() => { result.result = structuredClone(data.get(key)); result.onsuccess(); queueMicrotask(() => transaction.oncomplete()); });
                return result;
              },
              put(value: unknown, key: string) { data.set(key, structuredClone(value)); },
            }) };
            return transaction;
          },
        };
        request.onupgradeneeded(); request.onsuccess();
      });
      return request;
    },
  };
}
type Client = { id: string; url: string; type: string; focus: ReturnType<typeof vi.fn>; navigate: ReturnType<typeof vi.fn>; postMessage: ReturnType<typeof vi.fn> };
function client(path: string, id = path): Client { return { id, url: new URL(path, origin).href, type: 'window', focus: vi.fn(async () => {}), navigate: vi.fn(async () => {}), postMessage: vi.fn() }; }
function harness(db = storage(), retire = false) {
  const handlers = new Map<string, (event: Record<string, unknown>) => void>();
  const stores = new Map<string, Map<string, Response>>();
  const writes: string[] = [];
  const windows: Client[] = [client('/app', 'portal')];
  const notices: { title: string; data: typeof envelope; close: ReturnType<typeof vi.fn> }[] = [];
  const network = vi.fn(async (_request: Request | string) => new Response('online'));
  const self = {
    location: { origin },
    addEventListener: (name: string, fn: (event: Record<string, unknown>) => void) => handlers.set(name, fn),
    skipWaiting: vi.fn(),
    clients: { get: vi.fn(async (id: string) => windows.find(c => c.id === id)), matchAll: vi.fn(async () => windows), claim: vi.fn(), openWindow: vi.fn(async (_url: string) => {}) },
    registration: { scope: `${origin}/app`, unregister: vi.fn(async () => true), getNotifications: vi.fn(async () => notices.filter(n => !n.close.mock.calls.length)), showNotification: vi.fn(async (title: string, options: { data: typeof envelope }) => { notices.push({ title, data: options.data, close: vi.fn() }); }) },
  };
  const caches = {
    keys: async () => [...stores.keys()],
    delete: vi.fn(async (name: string) => stores.delete(name)),
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      return {
        put: async (request: Request | string, response: Response) => { const url = typeof request === 'string' ? request : request.url; writes.push(url); stores.get(name)!.set(url, response.clone()); },
        match: async (request: Request | string) => stores.get(name)!.get(typeof request === 'string' ? request : request.url)?.clone(),
      };
    },
  };
  if (existsSync(workerPath)) {
    const source = readFileSync(workerPath, 'utf8');
    runInNewContext(retire ? source.replace('const RETIRE = false;', 'const RETIRE = true;') : source, { self, caches, indexedDB: db, fetch: network, URL, Request, Response, Date, Promise, Set, console });
  }
  async function dispatch(type: string, fields: Record<string, unknown> = {}) {
    let response: Promise<Response> | undefined;
    const work: Promise<unknown>[] = [];
    handlers.get(type)?.({ ...fields, waitUntil: (p: Promise<unknown>) => work.push(p), respondWith: (p: Promise<Response>) => { response = p; } });
    await Promise.all(work);
    return response ? await response : undefined;
  }
  const message = (type: string, gen = generation, source = windows[0], extra = {}) => dispatch('message', { source, data: { version: 1, type, generation: gen, ...extra } });
  const push = (value: unknown = envelope) => dispatch('push', { data: { json: () => value } });
  const fetchRequest = (path: string, method = 'GET', mode = 'navigate', headers = {}) => dispatch('fetch', { request: { url: new URL(path, origin).href, method, mode, headers: new Headers(headers) } });
  return { self, stores, writes, windows, network, notices, db, dispatch, message, push, fetchRequest };
}

describe('portal service worker source', () => {
  it('private_responses_never_enter_cache', async () => {
    const h = harness(); await h.dispatch('install');
    expect(h.writes.sort()).toEqual(assets.slice().sort());
    for (const path of ['/app', '/app/schedule?week=2026-10-05', '/app/my-time', '/app/requests']) {
      const response = await h.fetchRequest(path); expect(await response?.text()).toBe('online');
    }
    expect(h.writes.sort()).toEqual(assets.slice().sort());
  });
  it.each(['/application', '/app-other', '/clocker/2', '/clocker/110', '/login', '/activate', '/api/internal/notifications/dispatch', '/app/api/push/status', 'https://other.example/app'])('clocker_is_not_intercepted: %s', async path => {
    const h = harness(); h.network.mockRejectedValue(new TypeError('offline'));
    expect(await h.fetchRequest(path)).toBeUndefined(); expect(h.network).not.toHaveBeenCalled();
  });
  it.each(['/app', '/app/schedule'])('only connection failure receives public fallback: %s', async path => {
    const h = harness(); h.network.mockResolvedValue(new Response('public offline'));
    await h.dispatch('install'); h.network.mockRejectedValue(new TypeError('offline'));
    expect(await (await h.fetchRequest(path))?.text()).toBe('public offline');
  });
  it.each([401, 403, 404, 500, 503, 302])('preserves HTTP %s and redirects', async status => {
    const h = harness(); h.network.mockResolvedValue(new Response('server response', { status }));
    const response = await h.fetchRequest('/app'); expect(response?.status).toBe(status); expect(await response?.text()).toBe('server response'); expect(h.writes).toEqual([]);
  });
  it('POST approvals/punches, RSC, auth and API never get fallback', async () => {
    const h = harness(); h.network.mockRejectedValue(new TypeError('offline'));
    for (const path of ['/app', '/app/requests', '/clocker/2', '/clocker/110']) expect(await h.fetchRequest(path, 'POST')).toBeUndefined();
    expect(await h.fetchRequest('/app/schedule?_rsc=123')).toBeUndefined();
    expect(await h.fetchRequest('/app/schedule', 'GET', 'navigate', { RSC: '1' })).toBeUndefined();
    expect(await h.fetchRequest('/app/schedule', 'GET', 'navigate', { Accept: 'text/x-component' })).toBeUndefined();
    expect(await h.fetchRequest('/app/schedule', 'GET', 'cors')).toBeUndefined();
    expect(h.network).not.toHaveBeenCalled(); expect(h.writes).toEqual([]);
  });
  it('never caches failed or redirected public asset responses', async () => {
    const h = harness(); h.network.mockResolvedValue(new Response('error', { status: 500 }));
    await expect(h.dispatch('install')).rejects.toThrow(); expect(h.writes).toEqual([]);
    const other = harness(); other.network.mockResolvedValue(Object.defineProperty(new Response('login'), 'redirected', { value: true }));
    await expect(other.dispatch('install')).rejects.toThrow(); expect(other.writes).toEqual([]);
  });
  it('valid owner displays only the generic envelope with fixed icon and tag', async () => {
    const h = harness(); await h.message('SET_OWNER'); await h.push();
    expect(h.self.registration.showNotification).toHaveBeenCalledWith(envelope.title, expect.objectContaining({ body: envelope.body, tag: envelope.tag, icon: '/icons/fuel-192.png', data: envelope }));
  });
  // Every kind the server can send, read from the server's own list, so a new kind can't be dropped silently again.
  it.each([...PUSH_KINDS])('accepts actual Task1 payload projection for %s', async kind => {
    const intent: NotificationIntent = { id: envelope.notificationId, employeeId: 'fictional-person', type: kind, title: 'private title', body: 'private detail', actionHref: '/private', eventKey: 'event-key', environment: 'test', source: kind === 'COMMUNICATION' ? { kind: 'COMMUNICATION', id: 'update', version: 'v1' } : { kind: 'SCHEDULE', id: 'week', version: 'v1' }, effectiveVersion: 'v1', purpose: 'EVENT', urgency: 'normal', dueAt: '2098-01-01T00:00:00Z', expiresAt: envelope.expiresAt };
    const h = harness(); await h.message('SET_OWNER'); await h.push(buildPushEnvelope(intent, generation));
    expect(h.notices).toHaveLength(1); expect(JSON.stringify(h.notices[0].data)).not.toContain('private');
  });
  it.each([null, {}, { ...envelope, ownershipGeneration: 'other' }, { ...envelope, expiresAt: '2000-01-01' }, { ...envelope, expiresAt: 'invalid' }, { ...envelope, notificationId: '//evil.example' }, { ...envelope, kind: 'UNKNOWN' }, { ...envelope, title: 'Private medical details' }, { ...envelope, body: 'Private detail' }, { ...envelope, tag: 'unowned' }, { ...envelope, url: 'https://evil.example' }])('suppresses malformed, expired, private or wrong-generation push %#', async value => {
    const h = harness(); await h.message('SET_OWNER'); await h.push(value); expect(h.notices).toEqual([]);
  });
  it('no owner, JSON failure and storage outage fail closed', async () => {
    const h = harness(); await h.push(); expect(h.notices).toEqual([]);
    await h.dispatch('push', { data: { json: () => { throw new Error('invalid'); } } });
    await h.message('SET_OWNER'); h.db.fail(); await h.push(); expect(h.notices).toEqual([]);
  });
  it.each(['/clocker/2', '/clocker/110', '/application', 'https://other.example/app'])('rejects owner messages from %s', async path => {
    const h = harness(); const source = client(path); h.windows.push(source); await h.message('SET_OWNER', generation, source); await h.push(); expect(h.notices).toEqual([]);
  });
  it('rejects unknown clients, versions, extra secrets and invalid generation', async () => {
    const h = harness();
    await h.message('SET_OWNER', generation, client('/app', 'unknown'));
    await h.message('SET_OWNER', generation, h.windows[0], { version: 2 });
    await h.message('SET_OWNER', generation, h.windows[0], { employeeId: 'private' });
    await h.message('SET_OWNER', ''); await h.push(); expect(h.notices).toEqual([]);
  });
  it('detach closes matching notifications and cannot be undone by delayed SET across restart', async () => {
    const h = harness(); await h.message('SET_OWNER'); await h.push(); await h.message('SUPPRESS_OWNER');
    expect(h.notices[0].close).toHaveBeenCalledOnce();
    const restarted = harness(h.db); await restarted.message('SET_OWNER'); await restarted.push(); expect(restarted.notices).toEqual([]);
  });
  it('delayed old suppression and SET cannot clear or replace fresh generation', async () => {
    const h = harness(); await h.message('SET_OWNER'); await h.message('SET_OWNER', 'fresh');
    await h.message('SUPPRESS_OWNER'); await h.message('SET_OWNER');
    await h.push({ ...envelope, ownershipGeneration: 'fresh' }); expect(h.notices).toHaveLength(1);
    await h.push(); expect(h.notices).toHaveLength(1);
  });
  it('acknowledges durable active/suppressed ownership over the supplied MessageChannel only', async () => {
    const h = harness(); const port = { postMessage: vi.fn() };
    for (const [type, status] of [['SET_OWNER', 'active'], ['SUPPRESS_OWNER', 'suppressed'], ['SET_OWNER', 'suppressed']]) {
      await h.dispatch('message', { source: h.windows[0], data: { version: 1, type, generation }, ports: [port] });
      expect(port.postMessage).toHaveBeenLastCalledWith({ version: 1, type: 'OWNER_STATE', generation, status });
    }
  });
  it('unavailable storage acknowledges failure rather than successful local enrollment', async () => {
    const h = harness(); h.db.fail(); const port = { postMessage: vi.fn() };
    await h.dispatch('message', { source: h.windows[0], data: { version: 1, type: 'SET_OWNER', generation }, ports: [port] });
    expect(port.postMessage).toHaveBeenCalledWith({ version: 1, type: 'OWNER_STATE', generation, status: 'unavailable' });
  });
  it('saturated storage acknowledges unavailable and keeps oldest tombstone', async () => {
    const h = harness(); for (let i = 0; i < 129; i++) await h.message('SUPPRESS_OWNER', `old-${i}`);
    const port = { postMessage: vi.fn() };
    await h.dispatch('message', { source: h.windows[0], data: { version: 1, type: 'SET_OWNER', generation }, ports: [port] });
    expect(port.postMessage).toHaveBeenCalledWith({ version: 1, type: 'OWNER_STATE', generation, status: 'unavailable' });
    expect([...h.db.data.values()]).toEqual([expect.objectContaining({ current: null, blocked: true, suppressed: expect.arrayContaining(['old-0']) })]);
  });
  it('storage failure during detach keeps this worker suppressed after storage recovers', async () => {
    const h = harness(); await h.message('SET_OWNER'); h.db.fail(); await h.message('SUPPRESS_OWNER');
    h.db.recover(); await h.push(); expect(h.notices).toEqual([]);
  });
  it('accepted generation survives a worker restart without storing private details', async () => {
    const h = harness(); await h.message('SET_OWNER'); const restarted = harness(h.db); await restarted.push();
    expect(restarted.notices).toHaveLength(1);
    expect([...h.db.data.values()]).toEqual([{ current: generation, suppressed: [], blocked: false }]);
  });
  it('client moving from portal to Clocker during click lookup is not navigated', async () => {
    const h = harness(); await h.message('SET_OWNER');
    const clocker = client('/clocker/110', 'portal'); h.self.clients.get.mockResolvedValueOnce(clocker);
    await h.dispatch('notificationclick', { notification: { data: envelope, close: vi.fn() } });
    expect(clocker.navigate).not.toHaveBeenCalled(); expect(h.windows[0].navigate).not.toHaveBeenCalled(); expect(h.self.clients.openWindow).toHaveBeenCalledOnce();
  });
  it('suppression arriving before initial SET still fences that generation', async () => {
    const h = harness(); await h.message('SUPPRESS_OWNER'); await h.message('SET_OWNER'); await h.push(); expect(h.notices).toEqual([]);
  });
  it('generation tombstone saturation fails closed without evicting old suppression', async () => {
    const h = harness();
    for (let i = 0; i < 129; i++) await h.message('SUPPRESS_OWNER', `old-${i}`);
    await h.message('SET_OWNER', 'fresh'); await h.push({ ...envelope, ownershipGeneration: 'fresh' });
    await h.message('SET_OWNER', 'old-0'); await h.push({ ...envelope, ownershipGeneration: 'old-0' });
    expect(h.notices).toEqual([]); expect(JSON.stringify([...h.db.data.values()]).length).toBeLessThan(20000);
  });
  it('click uses a fixed portal URL and never reuses Clocker or lookalike windows', async () => {
    const h = harness(); await h.message('SET_OWNER');
    const clocker = client('/clocker/2'); const clocker110 = client('/clocker/110'); const lookalike = client('/application');
    h.windows.splice(0, 1, clocker, clocker110, lookalike);
    const close = vi.fn(); await h.dispatch('notificationclick', { notification: { data: envelope, close } });
    expect(close).toHaveBeenCalledOnce(); expect(h.self.clients.openWindow).toHaveBeenCalledWith(`${origin}/app/notifications/open?notificationId=${envelope.notificationId}`);
    for (const c of h.windows) { expect(c.navigate).not.toHaveBeenCalled(); expect(c.focus).not.toHaveBeenCalled(); }
  });
  it('click reuses only a current same-origin portal client', async () => {
    const h = harness(); await h.message('SET_OWNER'); await h.dispatch('notificationclick', { notification: { data: envelope, close: vi.fn() } });
    expect(h.windows[0].navigate).toHaveBeenCalledWith(`${origin}/app/notifications/open?notificationId=${envelope.notificationId}`); expect(h.windows[0].focus).toHaveBeenCalledOnce(); expect(h.self.clients.openWindow).not.toHaveBeenCalled();
  });
  it('suppressed, expired and forged click data cannot navigate', async () => {
    const h = harness(); await h.message('SET_OWNER');
    for (const data of [{ ...envelope, url: 'https://evil.example' }, { ...envelope, expiresAt: '2000-01-01' }]) await h.dispatch('notificationclick', { notification: { data, close: vi.fn() } });
    await h.message('SUPPRESS_OWNER'); await h.dispatch('notificationclick', { notification: { data: envelope, close: vi.fn() } });
    expect(h.windows[0].navigate).not.toHaveBeenCalled(); expect(h.self.clients.openWindow).not.toHaveBeenCalled();
  });
  it('updates retain the normal waiting lifecycle and clean only owned cache versions', async () => {
    const h = harness(); h.stores.set('fuel-portal-public-v0', new Map()); h.stores.set('fuel-portal-public-v1', new Map()); h.stores.set('fuel-portal-public-v2', new Map()); h.stores.set('fuel-portal-public-v3', new Map()); h.stores.set('another-app-v1', new Map());
    await h.dispatch('install'); await h.dispatch('activate'); await h.message('UPDATE_WAITING');
    expect(h.stores.has('fuel-portal-public-v0')).toBe(false); expect(h.stores.has('fuel-portal-public-v1')).toBe(false); expect(h.stores.has('fuel-portal-public-v2')).toBe(false); expect(h.stores.has('fuel-portal-public-v3')).toBe(false); expect(h.stores.has('fuel-portal-public-v4')).toBe(true); expect(h.stores.has('another-app-v1')).toBe(true);
    expect(h.self.skipWaiting).not.toHaveBeenCalled(); expect(h.self.clients.claim).not.toHaveBeenCalled(); expect(h.self.registration.unregister).not.toHaveBeenCalled(); expect(h.windows[0].navigate).not.toHaveBeenCalled();
    expect(h.windows[0].postMessage).toHaveBeenCalledWith({ version: 1, type: 'UPDATE_WAITING' });
  });
  it('retirement variant only removes owned caches and own registration', async () => {
    const h = harness(undefined, true); h.stores.set('fuel-portal-public-v0', new Map()); h.stores.set('fuel-portal-public-v1', new Map()); h.stores.set('fuel-portal-public-v2', new Map()); h.stores.set('another-app-v1', new Map());
    await h.dispatch('install'); await h.dispatch('activate');
    expect(h.self.registration.unregister).toHaveBeenCalledOnce(); expect([...h.stores.keys()]).toEqual(['another-app-v1']); expect(h.writes).toEqual([]); expect(await h.fetchRequest('/app')).toBeUndefined();
    expect(h.self.skipWaiting).not.toHaveBeenCalled(); expect(h.self.clients.claim).not.toHaveBeenCalled();
  });
});
