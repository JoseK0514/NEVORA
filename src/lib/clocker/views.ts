import type { ClockerDeviceRecord } from './devices.server';

/** Explicit allow-list for browser-visible data. Never spread a database record. */
export type ClockerDeviceView = {
  id: string; name: string; locationId: string; version: number;
  state: ClockerDeviceRecord['state']; lastSeenAt: string | null; enrollmentExpiresAt: string | null;
};
export type ClockerLocationView = { id: string; name: string; clockerKey: string; active: boolean };
export type ClockerOwnerResult =
  | { ok: true; device: ClockerDeviceView; setup?: { code: string; expiresAt: string } }
  | { ok: false; error: string; refresh: boolean };

export function clockerDeviceView(record: ClockerDeviceRecord): ClockerDeviceView {
  // PostgreSQL text timestamps are normalized on the server, not parsed by Safari.
  const iso = (value: string | null) => value ? new Date(value).toISOString() : null;
  return {
    id: record.id, name: record.name, locationId: record.locationId, version: record.version,
    state: record.state, lastSeenAt: iso(record.lastSeenAt), enrollmentExpiresAt: iso(record.enrollmentExpiresAt),
  };
}
