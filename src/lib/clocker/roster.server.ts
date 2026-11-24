import 'server-only';
import { createHmac } from 'node:crypto';
import type { SqlExecutor } from '../notifications/types';
import type { ClockerDeviceWriteProof } from './devices.server';
import { clockerLocationEligible } from './location-access.server';
import { statement } from './pin-authority.server';

type RosterRow = { employeeId: string | null; displayName: string | null; deviceVersion: number };

async function pickerRoster(device: ClockerDeviceWriteProof, executor: SqlExecutor) {
  // Check the live device, mode, and eligibility in the same read that admits names.
  // The left join distinguishes an enabled but empty picker from a disabled one.
  const rows = await executor.query<RosterRow>(statement(`
    SELECT d.version AS "deviceVersion", person.id AS "employeeId", person.name AS "displayName"
    FROM clocker_devices d JOIN locations l ON l.id=d.location_id
    JOIN workspaces w ON w.id=l.workspace_id
    LEFT JOIN LATERAL (
      SELECT e.id, trim(e.first_name) || ' ' || upper(left(trim(e.last_name),1)) || '.' AS name
      FROM employees e JOIN locations home ON home.id=e.primary_location_id
      JOIN employee_clocker_pins pin ON pin.employee_id=e.id AND pin.workspace_id=w.id
      WHERE e.active AND home.workspace_id=w.id AND trim(e.first_name)<>'' AND trim(e.last_name)<>''
        AND (${clockerLocationEligible(2)})
    ) person ON true
    WHERE d.id=$1 AND d.location_id=$2 AND w.id=$3 AND w.active AND w.singleton
      AND l.active AND d.active AND d.revoked_at IS NULL AND d.credential_hash=$4
      AND d.credential_version=$5 AND d.sign_in_mode='NAME_PICKER'
    ORDER BY person.name,person.id`,
  [device.deviceId, device.locationId, device.workspaceId, device.credentialHash, device.credentialVersion]));
  if (!rows.length) return null;
  const counts = new Map<string, number>();
  for (const { displayName } of rows) {
    if (displayName) {
      const name = normalizedName(displayName);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  // An ambiguous name uses the Employee ID route. Never risk picking a namesake.
  const entries = rows.flatMap(({ employeeId, displayName }) =>
    employeeId && displayName && counts.get(normalizedName(displayName)) === 1 ? [{ employeeId, displayName }] : []);
  return { version: rows[0].deviceVersion, entries };
}

function normalizedName(name: string): string {
  return name.normalize('NFC').replace(/\s+/gu, ' ').toLowerCase();
}

function selectionToken(device: ClockerDeviceWriteProof, version: number, employeeId: string, key: Buffer): string {
  return createHmac('sha256', key).update(JSON.stringify([
    'nevora-clocker-roster-v1', device.workspaceId, device.locationId, device.deviceId,
    device.credentialVersion, version, employeeId,
  ])).digest('hex');
}

export async function readClockerRoster(device: ClockerDeviceWriteProof, key: Buffer, executor: SqlExecutor) {
  const roster = await pickerRoster(device, executor);
  if (!roster) return { state: 'employee_id' as const };
  return {
    state: 'name_picker' as const,
    people: roster.entries.map(({ employeeId, displayName }) =>
      ({ displayName, selection: selectionToken(device, roster.version, employeeId, key) })),
  };
}

export async function resolveClockerRosterSelection(
  device: ClockerDeviceWriteProof, selection: string, key: Buffer, executor: SqlExecutor,
) {
  if (!/^[0-9a-f]{64}$/.test(selection)) return null;
  const roster = await pickerRoster(device, executor);
  if (!roster) return null;
  const entry = roster.entries.find(({ employeeId }) => selectionToken(device, roster.version, employeeId, key) === selection);
  return entry ? { employeeId: entry.employeeId, deviceVersion: roster.version } : null;
}
