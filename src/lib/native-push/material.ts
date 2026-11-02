import 'server-only';
import {createCipheriv, createDecipheriv, hkdfSync, randomBytes} from 'node:crypto';
import {nativeTokenDigest, parseNativeMaterialBinding} from './protocol';
import type {NativeMaterialBinding} from './types';

const maxBytes = 12 + 16 + 4096;
function invalid(): never { throw new Error('Invalid native notification material'); }
function protectionKey(key: Uint8Array): Buffer {
  if (!(key instanceof Uint8Array) || key.byteLength !== 32) return invalid();
  return Buffer.from(hkdfSync('sha256', key, Buffer.alloc(0), 'nevora:native-push:token:v1', 32));
}
function context(b: NativeMaterialBinding): Buffer {
  return Buffer.from('NEVORA_NATIVE_TOKEN_V1\n' + JSON.stringify([
    b.origin, b.environment, b.platform, b.appId, b.provider, b.keyFingerprint, b.generation,
  ]), 'utf8');
}

/** Server-side storage only. The binding must come from current authorized
 * repository state, not directly from caller-selected metadata. */
export function sealNativeToken(token: unknown, key: Uint8Array, binding: unknown): string {
  try {
    const b = parseNativeMaterialBinding(binding);
    nativeTokenDigest(b.platform, token);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', protectionKey(key), iv, {authTagLength: 16});
    cipher.setAAD(context(b));
    const encrypted = Buffer.concat([cipher.update(token as string, 'utf8'), cipher.final()]);
    return 'v1.' + Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
  } catch { return invalid(); }
}

export function openNativeToken(value: unknown, key: Uint8Array, binding: unknown): string {
  try {
    const b = parseNativeMaterialBinding(binding);
    if (typeof value !== 'string' || value.length > 3 + Math.ceil(maxBytes * 4 / 3) || !/^v1\.[A-Za-z0-9_-]+$/.test(value)) return invalid();
    const encoded = value.slice(3), bytes = Buffer.from(encoded, 'base64url');
    if (bytes.length < 29 || bytes.length > maxBytes || bytes.toString('base64url') !== encoded) return invalid();
    const decipher = createDecipheriv('aes-256-gcm', protectionKey(key), bytes.subarray(0, 12), {authTagLength: 16});
    decipher.setAAD(context(b));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const token = Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
    nativeTokenDigest(b.platform, token);
    return token;
  } catch { return invalid(); }
}
