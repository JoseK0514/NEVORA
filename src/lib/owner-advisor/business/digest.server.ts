import 'server-only';
import { createHash } from 'node:crypto';
function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (typeof value === 'object' && value !== null) return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k])).join(',') + '}';
  throw Error('INVALID_DIGEST_INPUT');
}
export function businessDigest(value: unknown): string { return createHash('sha256').update('nevora-business-evidence-v1\0').update(canonical(value)).digest('hex'); }
