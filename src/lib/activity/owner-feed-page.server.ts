import 'server-only';
import {Temporal} from '@js-temporal/polyfill';

type Cursor = [occurredAt: string, id: string];
export type OwnerActivityPageRequest = { limit: number; before: Cursor | null };

export function parseOwnerActivityPage(value: unknown): OwnerActivityPageRequest | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  if (Object.keys(value).some(key => key !== 'limit' && key !== 'cursor')) return null;
  const {limit = 25, cursor = null} = value as {limit?: unknown; cursor?: unknown};
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 100) return null;
  if (cursor === null) return {limit, before: null};
  if (typeof cursor !== 'string' || !/^[A-Za-z0-9_-]{1,2048}$/.test(cursor)) return null;
  try {
    const before = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown;
    if (!Array.isArray(before) || before.length !== 2) return null;
    const [at, id] = before;
    if (typeof at !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(at)
      || typeof id !== 'string' || !id || id.length > 512 || /[\p{Cc}\p{Cf}]/u.test(id)) return null;
    if (at.startsWith('0000') || Temporal.Instant.from(at).toString({fractionalSecondDigits: 6}) !== at) return null;
    return {limit, before: [at, id]};
  } catch {
    return null;
  }
}

export function ownerActivityCursor(occurredAt: string, id: string): string {
  return Buffer.from(JSON.stringify([occurredAt, id])).toString('base64url');
}
