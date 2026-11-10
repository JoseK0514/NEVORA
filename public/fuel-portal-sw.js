/* NEVORA portal only. Register /fuel-portal-sw.js with scope: '/app'.
 * Scope matching is prefix-based; each operational handler also checks paths.
 * To retire: serve this same script/scope with RETIRE=true, disable enrollment
 * and delivery on the server, and let the normal waiting lifecycle complete.
 * Never force an unsaved tab to reload. Retain opaque suppression on rollback.
 */
const RETIRE = false;
const CACHE_PREFIX = 'fuel-portal-public-';
const CACHE_NAME = `${CACHE_PREFIX}v5`; // v5 (Oct 31): corporate offline page and the NEVORA wordmark icons.
const OFFLINE = '/fuel-portal-offline.html';
const PUBLIC_ASSETS = [OFFLINE, '/images/nevora-wordmark.png', '/icons/fuel-192.png', '/icons/fuel-512.png', '/icons/fuel-maskable-192.png', '/icons/fuel-maskable-512.png', '/icons/fuel-apple-180.png'];
const GENERATION = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_SUPPRESSED = 128;
// Separate from public assets: opaque tombstones survive upgrades/retirement.
const SUPPRESSION_CACHE = 'fuel-portal-owner-suppression-v1';
const suppressionKey = generation => new URL('/fuel-portal-owner-state/' + (generation ? 'generation/' + generation : 'blocked'), self.location.origin).href;
async function cachedSuppression(generation) {
  const cache = await caches.open(SUPPRESSION_CACHE);
  if (await cache.match(suppressionKey(null))) return 'blocked';
  return await cache.match(suppressionKey(generation)) ? 'suppressed' : 'clear';
}
async function cacheSuppression(generation) {
  const cache = await caches.open(SUPPRESSION_CACHE);
  if (await cache.match(suppressionKey(null)) || await cache.match(suppressionKey(generation))) return;
  const saturated = (await cache.keys()).length >= MAX_SUPPRESSED;
  await cache.put(suppressionKey(saturated ? null : generation), new Response('1', { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } }));
}
let work = Promise.resolve();
let ownerStorageFailed = false;
// Receipt order is preserved even when source lookup or storage is asynchronous.
function enqueue(operation) {
  const result = work.then(operation);
  work = result.catch(() => {});
  return result;
}
function portalUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === self.location.origin && (url.pathname === '/app' || url.pathname.startsWith('/app/')) ? url : null;
  } catch { return null; }
}
function validGeneration(value) { return typeof value === 'string' && GENERATION.test(value); }
function exactKeys(value, keys) {
  return value && typeof value === 'object' && Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
}

// IndexedDB contains only opaque generation state, never application data or
// subscription material. Tombstones are not evicted: saturation disables local
// display until deliberate site-data reset and fresh server-side enrollment.
function ownerState(change) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fuel-portal-owner', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('owner');
    request.onerror = () => reject(new Error('Owner storage unavailable'));
    request.onblocked = () => reject(new Error('Owner storage blocked'));
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('owner', change ? 'readwrite' : 'readonly');
      const store = tx.objectStore('owner');
      const read = store.get('state');
      let state;
      read.onsuccess = () => {
        state = read.result || { current: null, suppressed: [], blocked: false };
        if (change) { change(state); store.put(state, 'state'); }
      };
      tx.oncomplete = () => { db.close(); resolve(state); };
      tx.onerror = tx.onabort = () => { db.close(); reject(new Error('Owner storage unavailable')); };
    };
  });
}
function suppress(state, generation) {
  if (!state.suppressed.includes(generation)) {
    if (state.suppressed.length >= MAX_SUPPRESSED) { state.blocked = true; state.current = null; }
    else state.suppressed.push(generation);
  }
  if (state.current === generation) state.current = null;
}
async function closeGeneration(generation) {
  const notifications = await self.registration.getNotifications();
  for (const notice of notifications) if (notice.data?.ownershipGeneration === generation) notice.close();
}

self.addEventListener('install', event => {
  if (RETIRE) return;
  event.waitUntil((async () => {
    // Fetch and validate the complete public set before writing any entry.
    const responses = await Promise.all(PUBLIC_ASSETS.map(path => fetch(path, { cache: 'no-store', credentials: 'omit', redirect: 'error' })));
    if (responses.some(response => !response.ok || response.redirected || response.type === 'opaque')) throw new Error('Public offline assets unavailable');
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(PUBLIC_ASSETS.map((path, index) => cache.put(path, responses[index])));
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && (RETIRE || key !== CACHE_NAME)).map(key => caches.delete(key)));
    if (RETIRE) await self.registration.unregister();
    // No claim/skipWaiting: existing pages keep their normal lifecycle.
  })());
});
self.addEventListener('fetch', event => {
  if (RETIRE) return;
  const request = event.request;
  const url = portalUrl(request.url);
  if (!url || request.method !== 'GET' || request.mode !== 'navigate' ||
      url.pathname === '/app/api' || url.pathname.startsWith('/app/api/') ||
      url.searchParams.has('_rsc') || request.headers.has('RSC') ||
      request.headers.get('Accept')?.includes('text/x-component')) return;
  event.respondWith((async () => {
    try { return await fetch(request); } // Preserve HTTP errors and auth redirects.
    catch {
      const cached = await (await caches.open(CACHE_NAME)).match(OFFLINE);
      return cached || new Response('NEVORA is offline. Reconnect to continue.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
  })());
});

self.addEventListener('message', event => {
  if (RETIRE) return;
  event.waitUntil(enqueue(async () => {
    const message = event.data;
    if (!exactKeys(message, ['version', 'type', 'generation']) || message.version !== 1 || !validGeneration(message.generation) ||
        !['SET_OWNER', 'SUPPRESS_OWNER', 'UPDATE_WAITING'].includes(message.type) ||
        !event.source?.id || !portalUrl(event.source.url)) return;
    const source = await self.clients.get(event.source.id);
    if (!source || source.type !== 'window' || !portalUrl(source.url)) return;
    if (message.type === 'UPDATE_WAITING') {
      source.postMessage({ version: 1, type: 'UPDATE_WAITING' });
      return;
    }
    let previous;
    let status = 'unavailable';
    try {
      if (message.type === 'SUPPRESS_OWNER') {
        // Independent writes: either durable store must survive a worker restart.
        const [fallback, primary] = await Promise.allSettled([
          cacheSuppression(message.generation),
          ownerState(state => suppress(state, message.generation)),
        ]);
        if (primary.status === 'rejected') ownerStorageFailed = true;
        if (fallback.status === 'fulfilled' || primary.status === 'fulfilled') status = 'suppressed';
        return;
      }
      const cached = await cachedSuppression(message.generation);
      if (cached === 'blocked') return;
      if (cached === 'suppressed') { status = 'suppressed'; return; }
      const state = await ownerState(state => {
        if (ownerStorageFailed || state.blocked || state.suppressed.includes(message.generation)) return;
        if (state.current && state.current !== message.generation) { previous = state.current; suppress(state, previous); }
        if (!state.blocked) state.current = message.generation;
      });
      if (!ownerStorageFailed && !state.blocked) status = state.current === message.generation ? 'active' : 'suppressed';
    } catch (error) {
      // A failed detach must not resume display if storage later recovers in
      // this worker. Client/server cleanup fencing also covers future restarts.
      ownerStorageFailed = true;
      throw error;
    } finally {
      // This acknowledges durable local state only, not delivery or OS recall.
      event.ports?.[0]?.postMessage({ version: 1, type: 'OWNER_STATE', generation: message.generation, status });
      // Best effort clearing remains useful when durable storage has failed.
      if (message.type === 'SUPPRESS_OWNER') await closeGeneration(message.generation);
      if (previous) {
        await cacheSuppression(previous).catch(() => {});
        await closeGeneration(previous);
      }
    }
  }).catch(() => {}));
});

function validEnvelope(value) {
  if (!exactKeys(value, ['notificationId', 'kind', 'ownershipGeneration', 'expiresAt', 'tag', 'title', 'body']) ||
      typeof value.notificationId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value.notificationId) ||
      !validGeneration(value.ownershipGeneration) || typeof value.expiresAt !== 'string' ||
      !Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= Date.now() ||
      typeof value.tag !== 'string' || !/^fuel-[a-f0-9]{32}$/.test(value.tag)) return false;
  let title, body;
  // Must cover every kind in PUSH_KINDS (src/lib/notifications/payloads.ts); an unlisted kind is dropped silently.
  if (value.kind === 'COMMUNICATION') {
    title = 'NEVORA update'; body = 'Open NEVORA to review an update.';
  } else if (['SCHEDULE_PUBLISHED', 'SCHEDULE_ACKNOWLEDGEMENT_REMINDER'].includes(value.kind)) {
    title = 'Your NEVORA Schedule Is Ready'; body = 'Open NEVORA to review your schedule.';
  } else if (value.kind === 'SCHEDULE_CHANGED') {
    title = 'Your NEVORA Schedule Changed'; body = 'Open NEVORA to review your schedule.';
  } else if (value.kind === 'COVERAGE_ATTENTION') {
    title = 'Coverage Needs Attention'; body = 'Open NEVORA to review coverage.';
  } else if (['TIME_OFF_APPROVED', 'TIME_OFF_DENIED', 'CALLOUT_APPROVED', 'CALLOUT_DENIED', 'SWAP_RESPONSE_REQUIRED', 'SWAP_APPROVED', 'SWAP_DENIED', 'COVERAGE_APPROVED', 'COVERAGE_DENIED', 'COVERAGE_INVITATION', 'COVERAGE_CANCELLED', 'COVERAGE_EXPIRED', 'SWAP_CANCELLED', 'SWAP_EXPIRED', 'AVAILABILITY_REMINDER', 'AVAILABILITY_SUMMARY', 'PAYROLL_PREPARATION', 'PAYROLL_STATEMENT', 'MANAGER_REVIEW', 'SELF_TEST'].includes(value.kind)) {
    title = 'NEVORA Request Update'; body = 'Open NEVORA to review your pending task.';
  } else return false;
  // Keep each legacy pair for workers receiving already-queued envelopes. New
  // copy is also exact and kind-bound; a title/body from different pairs fails.
  if (value.title === title && value.body === body) return true;
  if (value.kind === 'COMMUNICATION') {
    title = 'New team update'; body = 'Open NEVORA to read it.';
  } else if (['SCHEDULE_PUBLISHED', 'SCHEDULE_ACKNOWLEDGEMENT_REMINDER'].includes(value.kind)) {
    title = 'Your schedule is ready'; body = 'Open NEVORA to see it.';
  } else if (value.kind === 'SCHEDULE_CHANGED') {
    title = 'Your schedule changed'; body = 'Open NEVORA to see what changed.';
  } else if (value.kind === 'COVERAGE_ATTENTION') {
    title = 'A shift needs cover'; body = 'Open NEVORA to find cover.';
  } else if (/^(TIME_OFF|CALLOUT|SWAP|COVERAGE)_/.test(value.kind)) {
    title = 'Your request has an update'; body = 'Open NEVORA to see it.';
  } else return false;
  return value.title === title && value.body === body;
}
async function owns(envelope) {
  if (ownerStorageFailed || await cachedSuppression(envelope.ownershipGeneration) !== 'clear') return false;
  const state = await ownerState();
  return !state.blocked && state.current === envelope.ownershipGeneration && !state.suppressed.includes(envelope.ownershipGeneration);
}
self.addEventListener('push', event => {
  if (RETIRE) return;
  event.waitUntil(enqueue(async () => {
    const envelope = event.data?.json();
    if (!validEnvelope(envelope) || !await owns(envelope)) return;
    await self.registration.showNotification(envelope.title, { body: envelope.body, tag: envelope.tag, icon: '/icons/fuel-192.png', data: envelope });
  }).catch(() => {}));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (RETIRE) return;
  event.waitUntil(enqueue(async () => {
    const envelope = event.notification.data;
    if (!validEnvelope(envelope) || !await owns(envelope)) return;
    const target = new URL('/app/notifications/open', self.location.origin);
    target.searchParams.set('notificationId', envelope.notificationId);
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const candidate of windows) {
      if (!portalUrl(candidate.url)) continue;
      // Re-read after enumeration; never choose a tab now running Clocker.
      const current = await self.clients.get(candidate.id);
      if (!current || current.type !== 'window' || !portalUrl(current.url)) continue;
      await current.navigate(target.href);
      await current.focus();
      return;
    }
    await self.clients.openWindow(target.href);
  }).catch(() => {}));
});
