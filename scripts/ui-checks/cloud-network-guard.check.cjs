'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { install } = require('./cloud-network-guard.cjs');

async function boundary(origin) {
  let intercept;
  let socketIntercept;
  const context = { route: async (_, handler) => { intercept = handler; }, routeWebSocket: async (_, handler) => { socketIntercept = handler; } };
  const browser = { newContext: async options => { assert.equal(options.serviceWorkers, 'block'); return context; } };
  const playwright = { chromium: { launch: async () => browser }, webkit: { launch: async () => browser } };
  install(playwright, origin);
  await (await playwright.chromium.launch()).newContext({ serviceWorkers: 'allow' });
  return {
    request: url => intercept({ request: () => ({ url: () => url }), continue: () => 'allowed', abort: () => 'blocked' }),
    socket: url => { let outcome; socketIntercept({ url: () => url, connectToServer: () => { outcome = 'allowed'; }, close: () => { outcome = 'blocked'; } }); return outcome; },
  };
}

test('requests stay on the exact preview origin, including redirect destinations', async () => {
  const guard = await boundary('http://127.0.0.1:12345');
  assert.equal(guard.request('http://127.0.0.1:12345/app'), 'allowed');
  for (const url of ['https://example.invalid/', 'http://localhost:12345/', 'http://127.0.0.1:12346/', 'file:///etc/passwd']) assert.equal(guard.request(url), 'blocked');
  assert.equal(guard.socket('ws://127.0.0.1:12345/_next/webpack-hmr'), 'allowed');
  assert.equal(guard.socket('wss://example.invalid/'), 'blocked');
});

test('bootstrap binds only to a loopback login, never an external first request', async () => {
  const guard = await boundary();
  assert.equal(guard.request('https://example.invalid/login'), 'blocked');
  assert.equal(guard.request('http://127.0.0.1:12345/api/private'), 'blocked');
  assert.equal(guard.request('http://127.0.0.1:12345/login'), 'allowed');
  assert.equal(guard.request('http://127.0.0.1:12345/app'), 'allowed');
  assert.equal(guard.request('http://127.0.0.1:54321/login'), 'blocked');
});
