import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import type {SqlExecutor} from '../../lib/notifications/types';

export type NativeControlAction = 'reset' | 'revoke' | 'outage-on' | 'outage-off' | 'verify-employee' | 'verify-owner-android' | 'verify-owner-ios';
export function decodeNativeControl(input: {headers: Headers; method: string; path: string; body: string; ownerId: string}): NativeControlAction {
  const {headers, method, path, body, ownerId} = input;
  if (!/^[a-f0-9]{32}$/.test(ownerId) || headers.get('x-nevora-native-test-owner') !== ownerId || headers.has('origin') || headers.has('sec-fetch-site')
    || method !== 'POST' || path !== '/native-test' || headers.get('content-type') !== 'application/json' || Buffer.byteLength(body) > 256) throw Error('Denied native test control');
  const value: unknown = JSON.parse(body);
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).join(',') !== 'action') throw Error('Invalid test command');
  const action = (value as {action: unknown}).action;
  if (typeof action !== 'string' || !['reset','revoke','outage-on','outage-off','verify-employee','verify-owner-android','verify-owner-ios'].includes(action)) throw Error('Unknown test command');
  return action as NativeControlAction;
}

/** Private SDK-test control, separate from Next. Never a production app route. */
export async function createNativeDeviceControl(executor: SqlExecutor, ownerId: string) {
  assert.match(ownerId, /^[a-f0-9]{32}$/);
  const q = <T = Record<string,unknown>>(text: string, values: readonly unknown[] = []) => executor.query<T>({text, values});
  const [identity] = await q<{name: string; marker: string}>("SELECT current_database() AS name,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
  assert.match(identity.name, /^nevora_exchange_test_[a-z0-9_]+$/); assert.match(identity.marker, /^fuel-phase3-disposable:[a-f0-9-]{36}$/);
  let unavailable = false;
  const restore = async () => { if (unavailable) { await q('ALTER TABLE native_test_sessions_unavailable RENAME TO employee_sessions'); unavailable = false; } };
  async function execute(action: NativeControlAction) {
    if (action === 'outage-off') { await restore(); return; }
    if (action === 'outage-on') { if (!unavailable) { await q('ALTER TABLE employee_sessions RENAME TO native_test_sessions_unavailable'); unavailable = true; } return; }
    await restore();
    if (action === 'reset') {
      await executor.transaction([
        {text: "UPDATE workspaces SET name='QA' WHERE id='workspace-fuel'", values: []},
        {text: "DELETE FROM employee_sessions WHERE employee_id IN ('QAOWNER','QA-NATIVE-A','QA-NATIVE-B','QA-NATIVE-C','QA-NATIVE-JOIN')", values: []},
        {text: "DELETE FROM availability_windows WHERE employee_id='QA-NATIVE-A'", values: []},
        {text: "INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 'native-reset-'||n,'QA-NATIVE-A',n,'00:00','24:00' FROM generate_series(0,6) AS n", values: []},
      ]); return;
    }
    if (action === 'revoke') { await q("DELETE FROM employee_sessions WHERE employee_id IN ('QAOWNER','QA-NATIVE-A')"); return; }
    if (action === 'verify-employee') {
      const rows = await q<{day_of_week: number}>("SELECT day_of_week FROM availability_windows WHERE employee_id='QA-NATIVE-A' ORDER BY day_of_week");
      assert.deepEqual(rows.map(row => row.day_of_week), [0,2,3,4,5,6]); return;
    }
    const rows = await q<{name: string}>('SELECT name FROM workspaces');
    assert.equal(rows[0].name, action === 'verify-owner-android' ? 'Fictional Android Company' : 'Fictional iOS Company');
  }
  let queue = Promise.resolve();
  const server = createServer(async (request, response) => {
    const reply = (status: number, state: string) => { response.writeHead(status, {'Content-Type': 'application/json', 'Cache-Control': 'no-store, private'}); response.end(JSON.stringify({state})); };
    if (request.headers['x-nevora-native-test-owner'] !== ownerId || request.headers.origin || request.headers['sec-fetch-site']) { request.resume(); reply(403,'denied'); return; }
    try {
      let body = ''; for await (const chunk of request) { body += chunk; if (Buffer.byteLength(body) > 256) { reply(413,'denied'); return; } }
      const headers = new Headers(); for (const [key, value] of Object.entries(request.headers)) if (typeof value === 'string') headers.set(key,value);
      const action = decodeNativeControl({headers, method: request.method ?? '', path: request.url ?? '', body, ownerId});
      const pending = queue.then(() => execute(action)); queue = pending.catch(() => {}); await pending;
      reply(200,'passed');
    } catch { reply(503,'failed'); }
  });
  server.requestTimeout = 5000; server.headersTimeout = 3000;
  await new Promise<void>((ready, reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',ready); });
  const address = server.address(); assert(address && typeof address === 'object');
  return {origin: `http://127.0.0.1:${address.port}`, async close() {
    await new Promise<void>((ready, reject) => server.close(error => error ? reject(error) : ready()));
    await queue; await restore();
  }};
}
