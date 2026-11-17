import 'server-only';
import { createHash } from 'node:crypto';

/** Stable JSON custody, independent of object insertion order. Callers pass
 * validated commands/server observations, never executable serialized objects. */
function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  throw Error('Invalid weekly digest value');
}
export function weeklyDigest(value: unknown): string {
  return createHash('sha256').update(canonical(value)).digest('hex');
}
