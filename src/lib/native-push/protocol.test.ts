import {createHash, createPublicKey, generateKeyPairSync, sign} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect, it} from 'vitest';

// Catch missing verification/binding/schema checks. Expected bytes are written
// independently of the production serializer; signing uses real ephemeral keys.
async function api() {
  const result = await import('./protocol').catch(() => ({}));
  expect(result).toHaveProperty('parseNativeChallenge');
  return result as typeof import('./protocol');
}
const keys = generateKeyPairSync('ec', {namedCurve: 'prime256v1'});
const der = keys.publicKey.export({format: 'der', type: 'spki'});
const spki = der.toString('base64url');
const fingerprint = createHash('sha256').update(der).digest('hex');
const token = 'a1b2';
const challenge = {
  version: 1, operation: 'enroll', challengeId: '22222222-2222-4222-8222-222222222222',
  nonce: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', origin: 'https://nevora.example',
  environment: 'test', platform: 'ios', appId: 'com.velani.nevora.development', provider: 'apns-sandbox',
  keyFingerprint: fingerprint, expectedGeneration: null,
  issuedAt: '2026-11-02T12:00:00.000Z', expiresAt: '2026-11-02T12:02:00.000Z',
} as const;
const expectedBytes = 'NEVORA_NATIVE_REGISTRATION_V1\n[1,"enroll","22222222-2222-4222-8222-222222222222","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","https://nevora.example","test","ios","com.velani.nevora.development","apns-sandbox","'
  + fingerprint + '",null,"2026-11-02T12:00:00.000Z","2026-11-02T12:02:00.000Z","85337816d263d362acb23a4255a636191075c2a90c47f2ee6db3362f7df11203"]';
const signature = sign('sha256', Buffer.from(expectedBytes), {key: keys.privateKey, dsaEncoding: 'der'}).toString('base64url');
const now = new Date('2026-11-02T12:01:00.000Z');

it('verifies a native signature over the independently specified wire bytes', async () => {
  const m = await api();
  expect(m.nativeProofBytes(challenge, token).toString('utf8')).toBe(expectedBytes);
  expect(m.verifyNativeProof({challenge, spki, token, signature, now})).toBe(true);
  expect(m.parseNativeChallenge(challenge)).toEqual(challenge);
  expect(m.parseNativePublicKey(spki).keyFingerprint).toBe(fingerprint);
});

it.each([
  ['operation', 'rotate'], ['challengeId', '33333333-3333-4333-8333-333333333333'],
  ['nonce', 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE'],
  ['origin', 'https://other.example'], ['environment', 'production'],
  ['platform', 'android'], ['appId', 'com.other.app'], ['provider', 'apns-production'],
  ['keyFingerprint', '0'.repeat(64)], ['expectedGeneration', '11111111-1111-4111-8111-111111111111'],
  ['issuedAt', '2026-11-02T12:00:01.000Z'], ['expiresAt', '2026-11-02T12:02:01.000Z'],
])('rejects substitution of signed %s', async (field, value) => {
  const m = await api();
  expect(m.verifyNativeProof({challenge: {...challenge, [field]: value}, spki, token, signature, now})).toBe(false);
});

it('binds the actual token bytes and key, rejecting other signatures and protocols', async () => {
  const m = await api();
  expect(m.verifyNativeProof({challenge, spki, token: 'a1b3', signature, now})).toBe(false);
  const other = generateKeyPairSync('ec', {namedCurve: 'prime256v1'});
  expect(m.verifyNativeProof({challenge, spki: other.publicKey.export({format: 'der', type: 'spki'}).toString('base64url'), token, signature, now})).toBe(false);
  const foreign = sign('sha256', Buffer.from(expectedBytes.replace('NEVORA_NATIVE_REGISTRATION_V1', 'OTHER_PROTOCOL')), keys.privateKey).toString('base64url');
  expect(m.verifyNativeProof({challenge, spki, token, signature: foreign, now})).toBe(false);
  expect(m.verifyNativeProof({challenge, spki, token, signature: signature + '=', now})).toBe(false);
  expect(m.verifyNativeProof({challenge, spki, token, signature: 'a'.repeat(10000), now})).toBe(false);
});

it.each([
  {operation: 'rotate', expectedGeneration: '11111111-1111-4111-8111-111111111111'},
  {platform: 'android', provider: 'fcm'},
  {issuedAt: '2026-11-02T12:00:01.000Z', expiresAt: '2026-11-02T12:02:01.000Z'},
])('rejects cryptographic substitutions even when changed metadata remains syntactically valid %#', async changes => {
  const m = await api(); const changed = {...challenge, ...changes};
  expect(m.parseNativeChallenge(changed)).toEqual(changed);
  expect(m.verifyNativeProof({challenge: changed, spki, token, signature, now})).toBe(false);
});

it.each(['2026-11-02T11:59:59.999Z', '2026-11-02T12:02:00.000Z', '2026-11-02T12:03:00.000Z', 'invalid'])('rejects a proof outside its exact lifetime: %s', async value => {
  const m = await api();
  expect(m.verifyNativeProof({challenge, spki, token, signature, now: new Date(value)})).toBe(false);
});

it.each([
  null, [], 'challenge', {...challenge, version: '1'}, {...challenge, version: 2},
  {...challenge, nonce: 'a'.repeat(43)}, {...challenge, nonce: challenge.nonce + '='},
  {...challenge, issuedAt: '2026-11-02T12:00:00Z'}, {...challenge, expiresAt: '2026-11-02T12:03:00.000Z'},
  {...challenge, operation: 'execute'}, {...challenge, keyFingerprint: 'A'.repeat(64)},
  {...challenge, expectedGeneration: 'not-a-generation'}, {...challenge, sessionTokenHash: 'must-not-be-accepted'},
  {...challenge, platform: 'android'}, {...challenge, appId: 'com.app\nother'},
])('rejects malformed or expanded registration metadata %#', async value => {
  const m = await api();
  expect(() => m.parseNativeChallenge(value)).toThrow('Invalid native notification protocol');
});

it.each(['https://nevora.example/', 'https://user@nevora.example', 'https://nevora.example?x=1',
  'https://nevora.example/#x', 'https://NEVORA.example', 'https://nevora.example:443',
  'http://attacker.example', 'http://127.attacker.example', 'javascript:alert(1)'])('rejects noncanonical or unsafe signed origin %s', async origin => {
  const m = await api();
  expect(() => m.parseNativeChallenge({...challenge, origin})).toThrow('Invalid native notification protocol');
});

it.each(['http://127.0.0.1:12345', 'http://localhost:12345', 'http://10.0.2.2:12345', 'http://[::1]:12345'])('can serialize explicitly selected development origin %s without granting it authority', async origin => {
  const m = await api();
  expect(m.parseNativeChallenge({...challenge, origin}).origin).toBe(origin);
});

it('rejects accessors without invoking them and inherited/hidden schema fields', async () => {
  const m = await api(); let invoked = 0;
  const accessor = {...challenge}; Object.defineProperty(accessor, 'nonce', {enumerable: true, get() { invoked++; return challenge.nonce; }});
  expect(() => m.parseNativeChallenge(accessor)).toThrow('Invalid native notification protocol');
  expect(invoked).toBe(0);
  expect(() => m.parseNativeChallenge(Object.create(challenge))).toThrow('Invalid native notification protocol');
  const hidden = {...challenge}; Object.defineProperty(hidden, 'extra', {value: 'unexpected'});
  expect(() => m.parseNativeChallenge(hidden)).toThrow('Invalid native notification protocol');
});

it('rejects non-P256 keys, alternate encodings, trailing DER and malformed public material', async () => {
  const m = await api();
  for (const key of [generateKeyPairSync('ec', {namedCurve: 'secp384r1'}).publicKey, generateKeyPairSync('ed25519').publicKey]) {
    expect(() => m.parseNativePublicKey(key.export({format: 'der', type: 'spki'}).toString('base64url'))).toThrow('Invalid native notification protocol');
  }
  for (const value of [null, spki + '=', Buffer.concat([der, Buffer.of(0)]).toString('base64url'), 'a'.repeat(10000)]) {
    expect(() => m.parseNativePublicKey(value)).toThrow('Invalid native notification protocol');
  }
  expect(m.parseNativePublicKey(createPublicKey({key: keys.publicKey.export({format: 'jwk'}), format: 'jwk'}).export({format: 'der', type: 'spki'}).toString('base64url')).keyFingerprint).toBe(fingerprint);
});

it('keeps token formats bounded and exact, with no token in errors', async () => {
  const m = await api();
  expect(m.nativeTokenDigest('ios', token)).toBe('85337816d263d362acb23a4255a636191075c2a90c47f2ee6db3362f7df11203');
  const fcm = 'fictional:Case_sensitive-Token';
  expect(m.nativeTokenDigest('android', fcm)).toBe(createHash('sha256').update(fcm).digest('hex'));
  for (const value of ['', 'A1B2', 'abc', 'gg', 'a'.repeat(2050)]) expect(() => m.nativeTokenDigest('ios', value)).toThrow('Invalid native notification protocol');
  for (const value of ['', ' token', 'a\nb', '☃', 'x'.repeat(4097)]) expect(() => m.nativeTokenDigest('android', value)).toThrow('Invalid native notification protocol');
  expect(() => m.nativeTokenDigest('other', 'sensitive-token')).toThrow(/^Invalid native notification protocol$/);
});

it('signs detach without material and requires a current generation for maintenance', async () => {
  const m = await api();
  const detach = {...challenge, operation: 'detach', expectedGeneration: '11111111-1111-4111-8111-111111111111'};
  const literal = expectedBytes.replace('"enroll"', '"detach"').replace('",null,"2026', '","11111111-1111-4111-8111-111111111111","2026').replace('"85337816d263d362acb23a4255a636191075c2a90c47f2ee6db3362f7df11203"', 'null');
  expect(m.nativeProofBytes(detach, null).toString()).toBe(literal);
  const proof = sign('sha256', Buffer.from(literal), keys.privateKey).toString('base64url');
  expect(m.verifyNativeProof({challenge: detach, spki, token: null, signature: proof, now})).toBe(true);
  expect(() => m.nativeProofBytes(detach, token)).toThrow('Invalid native notification protocol');
  expect(() => m.parseNativeChallenge({...detach, expectedGeneration: null})).toThrow('Invalid native notification protocol');
  expect(() => m.parseNativeChallenge({...challenge, operation: 'rotate'})).toThrow('Invalid native notification protocol');
});

it('matches the independent public byte/digest vectors consumed by native implementations', async () => {
  const m = await api();
  let wire: {version: number; vectors: {challenge: unknown; utf8: string; sha256: string}[]} | null = null;
  try { wire = JSON.parse(readFileSync('native/contracts/registration-v1.json', 'utf8')); } catch { /* Assert the missing fixture as a behavior failure. */ }
  expect(wire).toMatchObject({version: 1, vectors: expect.any(Array)});
  expect(wire!.vectors).toHaveLength(2);
  for (const [index, vector] of wire!.vectors.entries()) {
    const bytes = m.nativeProofBytes(vector.challenge, index === 0 ? 'a1b2' : null);
    expect(bytes.toString('utf8')).toBe(vector.utf8);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(vector.sha256);
  }
});
