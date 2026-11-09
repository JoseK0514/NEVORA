import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeConfig } from '../config/policy.mjs';

test('default install uses packaged fictional content without a remote server', () => {
  const config = nativeConfig({});
  assert.equal(config.server, undefined);
  assert.equal(config.appId, 'com.nevora.spike');
  assert.equal(config.android.allowMixedContent, false);
});
test('local runtime mode permits only explicit debug origins and paths', () => {
  for (const host of ['localhost', '127.0.0.1', '10.0.2.2']) {
    const config = nativeConfig({ NEVORA_NATIVE_URL: `http://${host}:3000/app` });
    assert.equal(config.server.cleartext, true);
    assert.equal(config.server.url, `http://${host}:3000`);
    assert.equal(config.server.appStartPath, '/app');
    assert.deepEqual(config.server.allowNavigation, []);
  }
});
test('fictional preview route stays separate from the native bridge origin', () => {
  const { server } = nativeConfig({ NEVORA_NATIVE_URL: 'http://localhost:3000/ui-preview/home' });
  assert.equal(server.url, 'http://localhost:3000');
  assert.equal(server.appStartPath, '/ui-preview/home');
});
test('a mistyped or remote target cannot receive the native bridge', () => {
  for (const url of [
    'https://nevora.example/app', 'http://localhost.evil.example/app',
    'http://127.0.0.1.evil.example/app', 'http://localhost@evil.example/app',
    'http://u:p@localhost:3000/app', 'http://localhost:3000/app?token=secret',
    'http://localhost:3000/app#secret', 'http://localhost:3000/clocker',
    'javascript:alert(1)', 'file:///app', 'http://192.168.1.1/app',
    'http://localhost:3000/app/../../admin'
  ]) assert.throws(() => nativeConfig({ NEVORA_NATIVE_URL: url }), undefined, url);
});
