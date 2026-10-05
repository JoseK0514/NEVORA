import 'server-only';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import { neonNotificationExecutor } from '../data/notification-transactions';
import { getWorkspace, workspaceReadGuard } from '../data/workspaces';

/** Server-derived portal proof, never an actor ID supplied by a form. */
export type ClockerOwnerProof = { employeeId: string; sessionTokenHash: string };
export type ClockerDeviceRecord = {
  id: string; locationId: string; workspaceId: string; name: string; active: boolean;
  version: number; credentialVersion: number; lastSeenAt: string | null;
  enrollmentExpiresAt: string | null; enrolledAt: string | null; revokedAt: string | null;
  state: 'UNREGISTERED' | 'PENDING' | 'EXPIRED' | 'ACTIVE' | 'REVOKED';
};
/** Internal capability; never serialize this hash/proof into client props or JSON. */
export type ClockerDeviceWriteProof = {
  deviceId: string; locationId: string; workspaceId: string;
  credentialHash: string; credentialVersion: number;
};
type DeviceMutation = { deviceId: string; expectedVersion: number };
type PendingDevice = { device: ClockerDeviceRecord; enrollmentToken: string };
type ErrorCode = 'OWNER_REQUIRED' | 'LOCATION_INVALID' | 'STALE' | 'ENROLLMENT_INVALID' | 'DEVICE_INVALID' | 'INPUT_INVALID' | 'UNAVAILABLE';
export class ClockerDeviceError extends Error {
  constructor(public readonly code: ErrorCode, message: string) { super(message); this.name = 'ClockerDeviceError'; }
}
const errors = {
  clocker_owner_denied: ['OWNER_REQUIRED', 'Only an active Owner with a current session may manage Clocker devices.'],
  clocker_location_invalid: ['LOCATION_INVALID', 'Choose an active location in this workspace.'],
  clocker_device_stale: ['STALE', 'This device changed. Reload its current details and try again.'],
  clocker_enrollment_invalid: ['ENROLLMENT_INVALID', 'This Clocker enrollment is unavailable. Request a new setup link.'],
  clocker_device_denied: ['DEVICE_INVALID', 'This Clocker device is not authorized.'],
} as const;
function normalize(error: unknown): never {
  if (error instanceof ClockerDeviceError) throw error;
  const message = error instanceof Error ? error.message : '';
  for (const [marker, [code, text]] of Object.entries(errors)) {
    if (message.includes(marker)) throw new ClockerDeviceError(code, text);
  }
  // Do not expose SQL, credential hashes, parameters, or internal errors to callers.
  throw new ClockerDeviceError('UNAVAILABLE', 'Clocker device data is unavailable. Please try again.');
}
async function transaction(executor: SqlExecutor, statements: SqlStatement[]) {
  try { return await executor.transaction(statements); } catch (error) { return normalize(error); }
}
function id(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) {
    throw new ClockerDeviceError('INPUT_INVALID', 'Choose a valid device or location.');
  }
}
function deviceName(value: unknown) {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new ClockerDeviceError('INPUT_INVALID', 'Device name must contain 1–80 printable characters.');
  }
  const name = value.trim();
  if (!name || [...name].length > 80) throw new ClockerDeviceError('INPUT_INVALID', 'Device name must contain 1–80 printable characters.');
  return name;
}
function validateMutation(input: DeviceMutation) {
  id(input?.deviceId);
  if (!Number.isSafeInteger(input?.expectedVersion) || input.expectedVersion < 1) {
    throw new ClockerDeviceError('INPUT_INVALID', 'A current device version is required.');
  }
}
function validLocationKey(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 64 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
function token(kind: 'enrollment' | 'device') {
  return `${kind === 'enrollment' ? 'nev_enr_' : 'nev_dev_'}${randomBytes(32).toString('hex')}`;
}
function tokenHash(value: unknown, kind: 'enrollment' | 'device'): string | null {
  const prefix = kind === 'enrollment' ? 'nev_enr_' : 'nev_dev_';
  if (typeof value !== 'string' || !new RegExp(`^${prefix}[a-f0-9]{64}$`).test(value)) return null;
  return createHash('sha256').update('nevora-clocker-v1\0').update(value).digest('hex');
}
function assertion(condition: string, values: unknown[], marker: keyof typeof errors): SqlStatement {
  return { text: `SELECT (CASE WHEN ${condition} THEN '1' ELSE '${marker}' END)::integer`, values };
}
function ownerLocks(proof: ClockerOwnerProof): SqlStatement[] {
  if (!proof || typeof proof.employeeId !== 'string' || !/^[a-f0-9]{64}$/.test(proof.sessionTokenHash ?? '')) {
    throw new ClockerDeviceError('OWNER_REQUIRED', errors.clocker_owner_denied[1]);
  }
  return [
    { text: 'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE', values: [proof.employeeId] },
    { text: 'SELECT token_hash FROM employee_sessions WHERE token_hash=$1 AND employee_id=$2 FOR SHARE', values: [proof.sessionTokenHash, proof.employeeId] },
  ];
}
function ownerAssertion(proof: ClockerOwnerProof) {
  return assertion(`EXISTS(SELECT 1 FROM employees e JOIN employee_sessions s ON s.employee_id=e.id
    WHERE e.id=$1 AND e.active AND e.role='OWNER' AND s.token_hash=$2 AND s.expires_at>clock_timestamp())`,
  [proof.employeeId, proof.sessionTokenHash], 'clocker_owner_denied');
}
function locationLock(locationId: string): SqlStatement {
  return { text: 'SELECT id FROM locations WHERE id=$1 ORDER BY id FOR SHARE', values: [locationId] };
}
function deviceLocks(deviceId: string): SqlStatement[] {
  return [
    { text: 'SELECT id FROM locations WHERE id=(SELECT location_id FROM clocker_devices WHERE id=$1) ORDER BY id FOR SHARE', values: [deviceId] },
    { text: 'SELECT id FROM clocker_devices WHERE id=$1 ORDER BY id FOR UPDATE', values: [deviceId] },
  ];
}
function activeLocation(locationId: string, workspaceId: string) {
  return assertion('EXISTS(SELECT 1 FROM locations WHERE id=$1 AND workspace_id=$2 AND active)', [locationId, workspaceId], 'clocker_location_invalid');
}
const projection = `SELECT d.id,d.location_id AS "locationId",l.workspace_id AS "workspaceId",d.name,d.active,
  d.version,d.credential_version AS "credentialVersion",d.last_seen_at::text AS "lastSeenAt",
  d.enrollment_expires_at::text AS "enrollmentExpiresAt",d.enrolled_at::text AS "enrolledAt",d.revoked_at::text AS "revokedAt",
  CASE WHEN NOT d.active OR d.revoked_at IS NOT NULL THEN 'REVOKED'
    WHEN d.credential_hash IS NOT NULL THEN 'ACTIVE'
    WHEN d.enrollment_hash IS NOT NULL AND d.enrollment_expires_at<=clock_timestamp() THEN 'EXPIRED'
    WHEN d.enrollment_hash IS NOT NULL THEN 'PENDING' ELSE 'UNREGISTERED' END AS state
  FROM clocker_devices d JOIN locations l ON l.id=d.location_id`;
function readDevice(deviceId: string): SqlStatement { return { text: `${projection} WHERE d.id=$1`, values: [deviceId] }; }
function one(results: unknown[][]): ClockerDeviceRecord {
  const rows = results.at(-1);
  if (rows?.length !== 1) throw new ClockerDeviceError('UNAVAILABLE', 'Clocker device data is unavailable. Please try again.');
  return rows[0] as ClockerDeviceRecord;
}
function event(deviceId: string, actorId: string, kind: 'REGISTERED' | 'ENROLLED' | 'RENAMED' | 'ROTATION_REQUESTED' | 'REVOKED'): SqlStatement {
  return { text: `INSERT INTO clocker_device_events(id,device_id,actor_employee_id,kind,device_version)
    SELECT $1,id,$2,$3,version FROM clocker_devices WHERE id=$4`, values: [randomUUID(), actorId, kind, deviceId] };
}
function currentDevice(workspaceId: string, input: DeviceMutation) {
  return assertion(`EXISTS(SELECT 1 FROM clocker_devices d JOIN locations l ON l.id=d.location_id
    WHERE d.id=$1 AND d.version=$2 AND l.workspace_id=$3)`, [input.deviceId, input.expectedVersion, workspaceId], 'clocker_device_stale');
}

export async function registerClockerDevice(
  proof: ClockerOwnerProof, input: { name: string; locationId: string }, executor: SqlExecutor = neonNotificationExecutor(),
): Promise<PendingDevice> {
  const name = deviceName(input?.name); id(input?.locationId);
  const locks = ownerLocks(proof);
  const workspace = await getWorkspace(executor);
  const deviceId = randomUUID(), enrollmentToken = token('enrollment');
  const results = await transaction(executor, [
    ...workspaceReadGuard(workspace), ...locks, locationLock(input.locationId),
    ownerAssertion(proof), activeLocation(input.locationId, workspace.id),
    { text: `INSERT INTO clocker_devices(id,location_id,name,enrollment_hash,enrollment_expires_at,enrollment_owner_id,enrollment_session_hash)
      VALUES($1,$2,$3,$4,clock_timestamp()+interval '10 minutes',$5,$6)`,
      values: [deviceId,input.locationId,name,tokenHash(enrollmentToken,'enrollment'),proof.employeeId,proof.sessionTokenHash] },
    event(deviceId,proof.employeeId,'REGISTERED'), readDevice(deviceId),
  ]);
  return { device: one(results), enrollmentToken };
}

export async function listClockerDevices(proof: ClockerOwnerProof, executor: SqlExecutor = neonNotificationExecutor()): Promise<ClockerDeviceRecord[]> {
  const locks = ownerLocks(proof), workspace = await getWorkspace(executor);
  const result = await transaction(executor, [
    ...workspaceReadGuard(workspace), ...locks, ownerAssertion(proof),
    { text: `${projection} WHERE l.workspace_id=$1 ORDER BY d.created_at,d.id`, values: [workspace.id] },
  ]);
  return result.at(-1) as ClockerDeviceRecord[];
}

async function mutate(
  proof: ClockerOwnerProof, input: DeviceMutation, kind: 'RENAMED' | 'ROTATION_REQUESTED' | 'REVOKED',
  update: SqlStatement, executor: SqlExecutor,
): Promise<ClockerDeviceRecord> {
  validateMutation(input);
  const locks = ownerLocks(proof), workspace = await getWorkspace(executor);
  const statements = [
    ...workspaceReadGuard(workspace), ...locks, ...deviceLocks(input.deviceId),
    // Recheck session expiry AFTER every potentially blocking lock.
    ownerAssertion(proof), currentDevice(workspace.id,input),
  ];
  if (kind === 'ROTATION_REQUESTED') statements.push(assertion(`EXISTS(SELECT 1 FROM clocker_devices d
    JOIN locations l ON l.id=d.location_id WHERE d.id=$1 AND l.active AND l.workspace_id=$2)`,
    [input.deviceId,workspace.id], 'clocker_location_invalid'));
  const results = await transaction(executor, [...statements,update,event(input.deviceId,proof.employeeId,kind),readDevice(input.deviceId)]);
  return one(results);
}
export async function renameClockerDevice(proof: ClockerOwnerProof, input: DeviceMutation & { name: string }, executor: SqlExecutor = neonNotificationExecutor()) {
  const name = deviceName(input?.name);
  return mutate(proof,input,'RENAMED',{
    text: 'UPDATE clocker_devices SET name=$2,version=version+1,updated_at=clock_timestamp() WHERE id=$1', values: [input.deviceId,name],
  },executor);
}
export async function revokeClockerDevice(proof: ClockerOwnerProof, input: DeviceMutation, executor: SqlExecutor = neonNotificationExecutor()) {
  return mutate(proof,input,'REVOKED',{
    text: `UPDATE clocker_devices SET active=false,credential_hash=NULL,enrollment_hash=NULL,enrollment_expires_at=NULL,
      enrollment_owner_id=NULL,enrollment_session_hash=NULL,revoked_at=clock_timestamp(),version=version+1,updated_at=clock_timestamp() WHERE id=$1`,
    values: [input.deviceId],
  },executor);
}
export async function rotateClockerDevice(proof: ClockerOwnerProof, input: DeviceMutation, executor: SqlExecutor = neonNotificationExecutor()): Promise<PendingDevice> {
  const enrollmentToken = token('enrollment');
  const device = await mutate(proof,input,'ROTATION_REQUESTED',{
    text: `UPDATE clocker_devices SET active=true,credential_hash=NULL,enrolled_at=NULL,revoked_at=NULL,
      enrollment_hash=$2,enrollment_expires_at=clock_timestamp()+interval '10 minutes',enrollment_owner_id=$3,enrollment_session_hash=$4,
      version=version+1,updated_at=clock_timestamp() WHERE id=$1`,
    values: [input.deviceId,tokenHash(enrollmentToken,'enrollment'),proof.employeeId,proof.sessionTokenHash],
  },executor);
  return { device,enrollmentToken };
}

/** Trusted server transport must put credential in an HttpOnly cookie, NOT JSON. */
export async function redeemClockerEnrollment(
  input: { enrollmentToken: string; locationKey: string; preparedCredential?: string }, executor: SqlExecutor = neonNotificationExecutor(),
): Promise<{ device: ClockerDeviceRecord; credential: string }> {
  const hash = tokenHash(input?.enrollmentToken,'enrollment');
  if (!hash || !validLocationKey(input?.locationKey) || (input.preparedCredential !== undefined && !tokenHash(input.preparedCredential,'device'))) throw new ClockerDeviceError('ENROLLMENT_INVALID',errors.clocker_enrollment_invalid[1]);
  const workspace = await getWorkspace(executor);
  const [pending] = await executor.query<{ id: string; employeeId: string; sessionTokenHash: string }>({
    text: `SELECT id,enrollment_owner_id AS "employeeId",enrollment_session_hash AS "sessionTokenHash"
      FROM clocker_devices WHERE enrollment_hash=$1`, values: [hash],
  });
  if (!pending) throw new ClockerDeviceError('ENROLLMENT_INVALID',errors.clocker_enrollment_invalid[1]);
  // Supplied only by trusted transport from its previously established HttpOnly cookie.
  const credential = input.preparedCredential ?? token('device');
  const results = await transaction(executor,[
    ...workspaceReadGuard(workspace),...ownerLocks(pending),...deviceLocks(pending.id),ownerAssertion(pending),
    assertion(`EXISTS(SELECT 1 FROM clocker_devices d JOIN locations l ON l.id=d.location_id
      WHERE d.id=$1 AND d.active AND d.revoked_at IS NULL AND d.enrollment_hash=$2
      AND d.enrollment_expires_at>clock_timestamp() AND d.enrollment_owner_id=$3 AND d.enrollment_session_hash=$4
      AND l.active AND l.workspace_id=$5 AND l.clocker_key=$6)`,
    [pending.id,hash,pending.employeeId,pending.sessionTokenHash,workspace.id,input.locationKey],'clocker_enrollment_invalid'),
    assertion('NOT EXISTS(SELECT 1 FROM clocker_device_credentials WHERE credential_hash=$1)',
      [tokenHash(credential,'device')],'clocker_enrollment_invalid'),
    { text: `INSERT INTO clocker_device_credentials(credential_hash,device_id,credential_version)
        SELECT $2,id,credential_version+1 FROM clocker_devices WHERE id=$1`, values: [pending.id,tokenHash(credential,'device')] },
    { text: `UPDATE clocker_devices SET credential_hash=$2,credential_version=credential_version+1,
      enrollment_hash=NULL,enrollment_expires_at=NULL,enrollment_owner_id=NULL,enrollment_session_hash=NULL,
      enrolled_at=clock_timestamp(),version=version+1,updated_at=clock_timestamp() WHERE id=$1`, values: [pending.id,tokenHash(credential,'device')] },
    event(pending.id,pending.employeeId,'ENROLLED'),readDevice(pending.id),
  ]);
  return { device: one(results),credential };
}

/** Reuse INSIDE every future punch transaction, after its workspace/employee locks.
 * A prior authentication result is never sufficient final-write authority. */
export function clockerDeviceWriteGuards(proof: ClockerDeviceWriteProof): SqlStatement[] {
  return [
    { text: 'SELECT id FROM workspaces WHERE id=$1 ORDER BY id FOR SHARE', values: [proof.workspaceId] },
    ...deviceLocks(proof.deviceId),
    assertion(`EXISTS(SELECT 1 FROM clocker_devices d JOIN locations l ON l.id=d.location_id
      JOIN workspaces w ON w.id=l.workspace_id WHERE d.id=$1 AND d.location_id=$2 AND w.id=$3 AND w.singleton AND w.active
      AND l.active AND d.active AND d.revoked_at IS NULL AND d.credential_hash=$4 AND d.credential_version=$5)`,
    [proof.deviceId,proof.locationId,proof.workspaceId,proof.credentialHash,proof.credentialVersion],'clocker_device_denied'),
  ];
}
export async function authenticateClockerDevice(
  input: { credential: string; locationKey: string }, executor: SqlExecutor = neonNotificationExecutor(),
): Promise<{ device: ClockerDeviceRecord; proof: ClockerDeviceWriteProof } | null> {
  const hash = tokenHash(input?.credential,'device');
  if (!hash || !validLocationKey(input?.locationKey)) return null;
  const workspace = await getWorkspace(executor);
  const [record] = await executor.query<{ deviceId: string; locationId: string; credentialVersion: number }>({
    text: 'SELECT id AS "deviceId",location_id AS "locationId",credential_version AS "credentialVersion" FROM clocker_devices WHERE credential_hash=$1', values: [hash],
  });
  if (!record) return null;
  const proof = { ...record,workspaceId:workspace.id,credentialHash:hash };
  try {
    const results = await transaction(executor,[
      ...workspaceReadGuard(workspace),...clockerDeviceWriteGuards(proof),
      assertion('EXISTS(SELECT 1 FROM locations WHERE id=$1 AND clocker_key=$2)',[record.locationId,input.locationKey],'clocker_device_denied'),
      { text: 'UPDATE clocker_devices SET last_seen_at=clock_timestamp() WHERE id=$1',values:[record.deviceId] },
      readDevice(record.deviceId),
    ]);
    return { device: one(results),proof };
  } catch(error) {
    if (error instanceof ClockerDeviceError && error.code==='DEVICE_INVALID') return null;
    throw error;
  }
}

/** Never recycle a previously issued cookie when preparing a replacement. */
export async function clockerCredentialWasIssued(credential: string, executor: SqlExecutor): Promise<boolean> {
  const hash = tokenHash(credential, 'device');
  if (!hash) return false;
  const rows = await executor.query({ text: 'SELECT 1 FROM clocker_device_credentials WHERE credential_hash=$1', values: [hash] });
  return rows.length > 0;
}
