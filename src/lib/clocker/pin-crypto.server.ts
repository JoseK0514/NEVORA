/**
 * PIN secrets use separate keyed lookup and employee-bound verification purposes.
 * Lookup supports workspace uniqueness; verification additionally uses random salt
 * and fixed-cost asynchronous scrypt. Neither fingerprint/hash is browser authority.
 */
import 'server-only';
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

export function readPinKey(env: { NEVORA_CLOCKER_PIN_KEY?: string } = { NEVORA_CLOCKER_PIN_KEY: process.env.NEVORA_CLOCKER_PIN_KEY }): Buffer {
  const value = env.NEVORA_CLOCKER_PIN_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) throw new Error('PIN security is not configured for this environment.');
  return Buffer.from(value, 'hex');
}
export function validatePin(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length !== 4 || !/^[0-9]{4}$/.test(value)) {
    throw new Error('Use exactly four digits for the Clocker PIN.');
  }
}
function keyed(purpose: string, parts: string[], key: Buffer) {
  if (key.length !== 32) throw new Error('PIN security is not configured for this environment.');
  return createHmac('sha256', key).update(JSON.stringify(['nevora-clocker-pin-v1', purpose, ...parts])).digest('hex');
}
export function pinKeyIdentity(key: Buffer) {
  return createHash('sha256').update('nevora-clocker-pin-key-v1\0').update(key).digest('hex');
}
export function pinFingerprint(pin: string, workspaceId: string, key: Buffer): string {
  validatePin(pin);
  return keyed('lookup', [workspaceId, pin], key);
}
function prehash(pin: string, workspaceId: string, employeeId: string, key: Buffer) {
  validatePin(pin);
  return keyed('verification', [workspaceId, employeeId, pin], key);
}
function derive(value: string, salt: string): Promise<Buffer> {
  // OWASP's 16 MiB / p=5 scrypt option; fixed bounded parameters, async native work.
  return new Promise((resolve, reject) => scrypt(value, Buffer.from(salt, 'hex'), 32,
    { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 },
    (error, hash) => error ? reject(error) : resolve(hash)));
}
export async function hashClockerPin(pin: string, workspaceId: string, employeeId: string, key: Buffer): Promise<string> {
  const value = prehash(pin, workspaceId, employeeId, key);
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(value, salt);
  return `scrypt-v1$${salt}$${hash.toString('hex')}`;
}
export async function verifyClockerPin(pin: string, workspaceId: string, employeeId: string, key: Buffer, stored: string): Promise<boolean> {
  const match = /^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{64})$/.exec(stored);
  if (!match) return false;
  const hash = await derive(prehash(pin, workspaceId, employeeId, key), match[1]);
  return timingSafeEqual(hash, Buffer.from(match[2], 'hex'));
}
/** Unknown PINs still pay the same fixed hashing work after the attempt budget. */
export async function burnUnknownPin(pin: string, workspaceId: string, key: Buffer): Promise<void> {
  await derive(prehash(pin, workspaceId, 'unknown-pin', key), '00'.repeat(16));
}
