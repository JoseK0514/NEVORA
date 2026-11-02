import 'server-only';
import {createHash, createPublicKey, verify, type KeyObject} from 'node:crypto';
import {types as nodeTypes} from 'node:util';
import type {NativeBinding, NativeChallenge, NativeMaterialBinding, NativePlatform} from './types';

const bindingFields = ['origin', 'environment', 'platform', 'appId', 'provider', 'keyFingerprint'] as const;
const challengeFields = [...bindingFields, 'version', 'operation', 'challengeId', 'nonce', 'expectedGeneration', 'issuedAt', 'expiresAt'];
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

function invalid(): never { throw new Error('Invalid native notification protocol'); }
function closed(value: unknown, fields: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || nodeTypes.isProxy(value) || Array.isArray(value)) return invalid();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.length !== fields.length || keys.some(key => typeof key !== 'string' || !fields.includes(key))) return invalid();
  const result: Record<string, unknown> = Object.create(null);
  for (const key of fields) {
    const property = descriptors[key];
    if (!property || !Object.hasOwn(property, 'value') || !property.enumerable) return invalid();
    result[key] = property.value;
  }
  return result;
}
function member<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) return invalid();
  return value as T;
}
function matched(value: unknown, pattern: RegExp, max: number): string {
  if (typeof value !== 'string' || value.length > max || !pattern.test(value)) return invalid();
  return value;
}
function binary(value: unknown, max: number): Buffer {
  const encoded = matched(value, /^[A-Za-z0-9_-]+$/, Math.ceil(max * 4 / 3));
  const bytes = Buffer.from(encoded, 'base64url');
  if (bytes.length < 1 || bytes.length > max || bytes.toString('base64url') !== encoded) return invalid();
  return bytes;
}
function origin(value: unknown): string {
  if (typeof value !== 'string' || value.length > 512) return invalid();
  try {
    const url = new URL(value);
    const loopback = ['localhost', '127.0.0.1', '10.0.2.2', '[::1]'].includes(url.hostname);
    if (url.origin !== value || url.username || url.password || url.port === '0' || url.hostname.endsWith('.')
      || !(url.protocol === 'https:' || url.protocol === 'http:' && loopback)) return invalid();
    return value;
  } catch { return invalid(); }
}
function binding(record: Record<string, unknown>): NativeBinding {
  const platform = member(record.platform, ['ios', 'android']);
  const provider = member(record.provider, ['apns-sandbox', 'apns-production', 'fcm']);
  if ((platform === 'android') !== (provider === 'fcm')) return invalid();
  return {
    origin: origin(record.origin), environment: member(record.environment, ['test', 'production']),
    platform, provider,
    appId: matched(record.appId, /^[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*){1,9}$/, 200),
    keyFingerprint: matched(record.keyFingerprint, /^[a-f0-9]{64}$/, 64),
  };
}
function instant(value: unknown): string {
  const text = matched(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, 24);
  const date = new Date(text);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== text) return invalid();
  return text;
}

/** Validate/detach metadata only. Durable challenges must come from the server's
 * own repository; a caller constructing these fields receives no authority. */
export function parseNativeChallenge(value: unknown): NativeChallenge {
  const record = closed(value, challengeFields);
  if (record.version !== 1 || binary(record.nonce, 32).length !== 32) return invalid();
  const operation = member(record.operation, ['enroll', 'rotate', 'detach']);
  const expectedGeneration = record.expectedGeneration === null ? null : matched(record.expectedGeneration, uuid, 36);
  if (operation !== 'enroll' && expectedGeneration === null) return invalid();
  const issuedAt = instant(record.issuedAt), expiresAt = instant(record.expiresAt);
  if (Date.parse(expiresAt) - Date.parse(issuedAt) !== 120_000) return invalid();
  return Object.freeze({...binding(record), version: 1, operation,
    challengeId: matched(record.challengeId, uuid, 36), nonce: record.nonce as string,
    expectedGeneration, issuedAt, expiresAt});
}

/** Same context rules for stored ciphertext; unknown fields are never ignored. */
export function parseNativeMaterialBinding(value: unknown): NativeMaterialBinding {
  const record = closed(value, [...bindingFields, 'generation']);
  return Object.freeze({...binding(record), generation: matched(record.generation, uuid, 36)});
}

/** Return only a canonical P-256 public key; no private key import/serialization. */
export function parseNativePublicKey(value: unknown): {publicKey: KeyObject; keyFingerprint: string; spki: string} {
  try {
    const der = binary(value, 512);
    const imported = createPublicKey({key: der, type: 'spki', format: 'der'});
    if (imported.asymmetricKeyType !== 'ec' || imported.asymmetricKeyDetails?.namedCurve !== 'prime256v1') return invalid();
    const jwk = imported.export({format: 'jwk'});
    if (typeof jwk.x !== 'string' || typeof jwk.y !== 'string') return invalid();
    const publicKey = createPublicKey({key: {kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y}, format: 'jwk'});
    const canonical = publicKey.export({type: 'spki', format: 'der'});
    if (!der.equals(canonical)) return invalid();
    return {publicKey, keyFingerprint: createHash('sha256').update(canonical).digest('hex'), spki: canonical.toString('base64url')};
  } catch { return invalid(); }
}

/** Provider tokens are opaque confidential values. Bound size/format without
 * trimming, case folding, URL interpretation or reflecting input in errors. */
export function nativeTokenDigest(platform: unknown, token: unknown): string {
  const selected: NativePlatform = member(platform, ['ios', 'android']);
  if (selected === 'ios') {
    const text = matched(token, /^[a-f0-9]+$/, 2048);
    if (text.length % 2 !== 0) return invalid();
  } else matched(token, /^[\x21-\x7e]+$/, 4096);
  return createHash('sha256').update(token as string, 'utf8').digest('hex');
}

export function nativeProofBytes(value: unknown, token: unknown): Buffer {
  const c = parseNativeChallenge(value);
  let digest: string | null;
  if (c.operation === 'detach') {
    if (token !== null) return invalid();
    digest = null;
  } else digest = nativeTokenDigest(c.platform, token);
  return Buffer.from('NEVORA_NATIVE_REGISTRATION_V1\n' + JSON.stringify([
    1, c.operation, c.challengeId, c.nonce, c.origin, c.environment, c.platform,
    c.appId, c.provider, c.keyFingerprint, c.expectedGeneration, c.issuedAt, c.expiresAt, digest,
  ]), 'utf8');
}

/** Signature/lifetime only. This deliberately performs no enrollment, session,
 * replay, ownership or generation authorization; completion must check those
 * atomically against the stored challenge and current database authority. */
export function verifyNativeProof(input: {challenge: unknown; spki: unknown; token: unknown; signature: unknown; now: Date}): boolean {
  try {
    const c = parseNativeChallenge(input.challenge), key = parseNativePublicKey(input.spki);
    const now = input.now.getTime();
    if (!Number.isFinite(now) || Date.parse(c.issuedAt) > now || now >= Date.parse(c.expiresAt) || c.keyFingerprint !== key.keyFingerprint) return false;
    const signature = binary(input.signature, 72);
    return signature.length >= 8 && verify('sha256', nativeProofBytes(c, input.token), {key: key.publicKey, dsaEncoding: 'der'}, signature);
  } catch { return false; }
}
