import {createDecipheriv, hkdfSync} from 'node:crypto';
import {expect, it} from 'vitest';
import {encryptSubscriptionMaterial} from '../notifications/installation';

// Catch plaintext storage, unauthenticated/wrong-context decryption and purpose
// reuse. Independent Node primitives verify the published envelope contract.
async function api() {
  const result = await import('./material').catch(() => ({}));
  expect(result).toHaveProperty('sealNativeToken');
  return result as typeof import('./material');
}
const key = Buffer.alloc(32, 7);
const token = 'fictional:provider-token-confidential-123456789';
const binding = {
  origin: 'https://nevora.example', environment: 'test', platform: 'android',
  appId: 'com.velani.nevora.development', provider: 'fcm', keyFingerprint: 'a'.repeat(64),
  generation: '11111111-1111-4111-8111-111111111111',
} as const;

it('protects actual token bytes with randomized authenticated encryption', async () => {
  const m = await api();
  const a = m.sealNativeToken(token, key, binding), b = m.sealNativeToken(token, key, binding);
  expect(a).not.toBe(b);
  expect(m.openNativeToken(a, key, binding)).toBe(token);
  expect(m.openNativeToken(b, key, binding)).toBe(token);
  expect(Buffer.from(a.slice(3), 'base64url').includes(Buffer.from(token))).toBe(false);
});

it('interoperates with the literal v1 HKDF, AAD and IV/tag/ciphertext contract', async () => {
  const m = await api(); const envelope = m.sealNativeToken(token, key, binding);
  expect(envelope.startsWith('v1.')).toBe(true);
  const data = Buffer.from(envelope.slice(3), 'base64url');
  const derived = hkdfSync('sha256', key, Buffer.alloc(0), 'nevora:native-push:token:v1', 32);
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(derived), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  decipher.setAAD(Buffer.from('NEVORA_NATIVE_TOKEN_V1\n["https://nevora.example","test","android","com.velani.nevora.development","fcm","aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","11111111-1111-4111-8111-111111111111"]'));
  expect(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8')).toBe(token);
});

it.each([
  {origin: 'https://other.example'}, {environment: 'production'}, {platform: 'ios', provider: 'apns-production'},
  {appId: 'com.other.app'}, {keyFingerprint: 'b'.repeat(64)},
  {generation: '22222222-2222-4222-8222-222222222222'},
])('rejects a token replayed under different binding metadata %#', async changed => {
  const m = await api(); const envelope = m.sealNativeToken(token, key, binding);
  expect(() => m.openNativeToken(envelope, key, {...binding, ...changed})).toThrow(/^Invalid native notification material$/);
});

it.each([0, 12, 28])('rejects tampering at envelope byte %i', async at => {
  const m = await api(); const bytes = Buffer.from(m.sealNativeToken(token, key, binding).slice(3), 'base64url');
  bytes[at] ^= 1;
  expect(() => m.openNativeToken('v1.' + bytes.toString('base64url'), key, binding)).toThrow(/^Invalid native notification material$/);
});

it('rejects a different key and Web Push ciphertext even with the same root protection key', async () => {
  const m = await api(); const encrypted = m.sealNativeToken(token, key, binding);
  expect(() => m.openNativeToken(encrypted, Buffer.alloc(32, 8), binding)).toThrow(/^Invalid native notification material$/);
  const web = encryptSubscriptionMaterial(token, key, {environment: 'test', installationHash: binding.keyFingerprint, generation: binding.generation});
  expect(() => m.openNativeToken(web, key, binding)).toThrow(/^Invalid native notification material$/);
});

it.each([null, '', 'v2.abc', 'v1.', 'v1.AAAA', 'v1.' + 'a'.repeat(10000)])('rejects malformed or oversized protected material %#', async envelope => {
  const m = await api();
  expect(() => m.openNativeToken(envelope, key, binding)).toThrow(/^Invalid native notification material$/);
});

it('rejects noncanonical base64 encodings and invalid key sizes', async () => {
  const m = await api(); const encrypted = m.sealNativeToken(token, key, binding);
  expect(() => m.openNativeToken(encrypted + '=', key, binding)).toThrow(/^Invalid native notification material$/);
  for (const wrong of [Buffer.alloc(31), Buffer.alloc(33)]) {
    expect(() => m.sealNativeToken(token, wrong, binding)).toThrow(/^Invalid native notification material$/);
    expect(() => m.openNativeToken(encrypted, wrong, binding)).toThrow(/^Invalid native notification material$/);
  }
});

it.each([
  {...binding, unexpected: true}, {...binding, generation: null}, {...binding, generation: 'old'},
  {...binding, platform: 'ios'}, {...binding, origin: 'https://nevora.example/private'},
  {...binding, keyFingerprint: 'other-key'},
])('refuses malformed material binding before encrypting %#', async value => {
  const m = await api();
  expect(() => m.sealNativeToken(token, key, value)).toThrow(/^Invalid native notification material$/);
});

it('does not invoke a binding accessor or disclose invalid token input in errors', async () => {
  const m = await api(); let calls = 0;
  const value = {...binding}; Object.defineProperty(value, 'keyFingerprint', {enumerable: true, get() { calls++; return binding.keyFingerprint; }});
  expect(() => m.sealNativeToken(token, key, value)).toThrow(/^Invalid native notification material$/);
  expect(calls).toBe(0);
  expect(() => m.sealNativeToken('secret\ninvalid', key, binding)).toThrow(/^Invalid native notification material$/);
});
