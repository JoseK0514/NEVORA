
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDisposableFoundationDatabase } from './local-postgres';
import {
  registerClockerDevice, redeemClockerEnrollment, authenticateClockerDevice,
  renameClockerDevice, rotateClockerDevice, revokeClockerDevice, listClockerDevices,
  clockerDeviceWriteGuards,
} from '../../lib/clocker/devices.server';

let db: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const owner = { employeeId: 'c1-owner', sessionTokenHash: 'a'.repeat(64) };
const manager = { employeeId: 'c1-manager', sessionTokenHash: 'b'.repeat(64) };
const q = <T = Record<string, unknown>>(text: string, values: unknown[] = []) => db.executor.query<T>({ text, values });
beforeEach(async () => {
  db = await createDisposableFoundationDatabase({ mode: 'current-runtime' });
  await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id)
    VALUES('c1-owner','Test','Owner','555','OWNER','loc-1'),('c1-manager','Test','Manager','556','MANAGER','loc-1');
    INSERT INTO employee_sessions(token_hash,employee_id,expires_at)
    VALUES(repeat('a',64),'c1-owner',now()+interval '1 day'),(repeat('b',64),'c1-manager',now()+interval '1 day');`);
});
afterEach(async () => { if (db) await db.dispose(); });
const register = () => registerClockerDevice(owner, { name: ' Front tablet ', locationId: 'loc-1' }, db.executor);
async function enrolled() {
  const pending = await register();
  const active = await redeemClockerEnrollment({ enrollmentToken: pending.enrollmentToken, locationKey: '2' }, db.executor);
  return { pending, active };
}

it('registers a pending location-bound device and stores no plaintext enrollment secret', async () => {
  const result = await register();
  expect(result.device).toMatchObject({ name: 'Front tablet', locationId: 'loc-1', workspaceId: 'workspace-fuel', state: 'PENDING', version: 1 });
  expect(result.enrollmentToken).toMatch(/^nev_enr_[a-f0-9]{64}$/);
  const [stored] = await q('SELECT * FROM clocker_devices');
  expect(stored.enrollment_hash).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(stored)).not.toContain(result.enrollmentToken);
  expect(stored.credential_hash).toBeNull();
  expect(await q('SELECT kind FROM clocker_device_events')).toEqual([{ kind: 'REGISTERED' }]);
});
it.each(['manager', 'forged-session', 'expired-session', 'inactive-owner'] as const)('rejects %s registration without any device/audit write', async kind => {
  let proof = owner;
  if (kind === 'manager') proof = manager;
  if (kind === 'forged-session') proof = { ...owner, sessionTokenHash: 'f'.repeat(64) };
  if (kind === 'expired-session') await q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second'");
  if (kind === 'inactive-owner') await q("UPDATE employees SET active=false WHERE id='c1-owner'");
  await expect(registerClockerDevice(proof, { name: 'Denied', locationId: 'loc-1' }, db.executor)).rejects.toThrow(/Owner/);
  expect(await q('SELECT id FROM clocker_devices')).toEqual([]);
  expect(await q('SELECT id FROM clocker_device_events')).toEqual([]);
});
it('rejects inactive locations and validates names without echoing malicious input', async () => {
  await q("UPDATE locations SET active=false WHERE id='loc-1'");
  await expect(register()).rejects.toThrow(/location/i);
  await expect(registerClockerDevice(owner, { name: 'bad\u0000name', locationId: 'loc-2' }, db.executor)).rejects.toThrow(/name/i);
  await expect(registerClockerDevice(owner, { name: 'x'.repeat(81), locationId: 'loc-2' }, db.executor)).rejects.toThrow(/name/i);
  expect(await q('SELECT id FROM clocker_devices')).toEqual([]);
});
it('redeems once, authenticates only the bound route, and records last seen on the server', async () => {
  const { pending, active } = await enrolled();
  expect(active.device).toMatchObject({ state: 'ACTIVE', version: 2, credentialVersion: 1 });
  expect(active.credential).toMatch(/^nev_dev_[a-f0-9]{64}$/);
  await expect(redeemClockerEnrollment({ enrollmentToken: pending.enrollmentToken, locationKey: '2' }, db.executor)).rejects.toThrow(/enrollment/i);
  const grant = await authenticateClockerDevice({ credential: active.credential, locationKey: '2' }, db.executor);
  expect(grant?.device.id).toBe(active.device.id);
  expect(grant?.device.lastSeenAt).toBeTruthy();
  expect(await authenticateClockerDevice({ credential: active.credential, locationKey: '110' }, db.executor)).toBeNull();
  expect(await authenticateClockerDevice({ credential: pending.enrollmentToken, locationKey: '2' }, db.executor)).toBeNull();
  const stored = await q('SELECT * FROM clocker_devices');
  expect(JSON.stringify(stored)).not.toContain(active.credential);
  expect(stored[0].enrollment_hash).toBeNull();
});
it.each(['expired-link','owner-demoted','owner-logout','location-inactive'] as const)('fails enrollment closed after %s', async kind => {
  const pending = await register();
  if (kind === 'expired-link') await q("UPDATE clocker_devices SET enrollment_expires_at=clock_timestamp()-interval '1 second'");
  if (kind === 'owner-demoted') await q("UPDATE employees SET role='MANAGER' WHERE id='c1-owner'");
  if (kind === 'owner-logout') await q("DELETE FROM employee_sessions WHERE employee_id='c1-owner'");
  if (kind === 'location-inactive') await q("UPDATE locations SET active=false WHERE id='loc-1'");
  await expect(redeemClockerEnrollment({ enrollmentToken: pending.enrollmentToken, locationKey: '2' }, db.executor)).rejects.toThrow();
  expect(await q('SELECT credential_hash FROM clocker_devices')).toEqual([{ credential_hash: null }]);
  expect(await q("SELECT id FROM clocker_device_events WHERE kind='ENROLLED'")).toEqual([]);
});
it('rejects a wrong-location enrollment without consuming it', async () => {
  const pending = await register();
  await expect(redeemClockerEnrollment({ enrollmentToken: pending.enrollmentToken, locationKey: '110' }, db.executor)).rejects.toThrow();
  const active = await redeemClockerEnrollment({ enrollmentToken: pending.enrollmentToken, locationKey: '2' }, db.executor);
  expect(active.device.state).toBe('ACTIVE');
});
it('allows exactly one of two simultaneous enrollment redemptions', async () => {
  const pending = await register();
  const results = await Promise.allSettled([1,2].map(() => redeemClockerEnrollment({ enrollmentToken: pending.enrollmentToken, locationKey: '2' }, db.executor)));
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(await q("SELECT kind FROM clocker_device_events WHERE kind='ENROLLED'")).toEqual([{ kind: 'ENROLLED' }]);
});
it('renames with stale-write protection and leaves credentials intact', async () => {
  const { active } = await enrolled();
  const renamed = await renameClockerDevice(owner, { deviceId: active.device.id, expectedVersion: 2, name: 'Rear tablet' }, db.executor);
  expect(renamed).toMatchObject({ name: 'Rear tablet', version: 3 });
  await expect(renameClockerDevice(owner, { deviceId: active.device.id, expectedVersion: 2, name: 'Stale' }, db.executor)).rejects.toThrow(/changed/i);
  expect((await authenticateClockerDevice({ credential: active.credential, locationKey: '2' }, db.executor))?.device.name).toBe('Rear tablet');
});
it('revokes a device without deleting open punch history or audit records', async () => {
  const { active } = await enrolled();
  await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('c1-open','c1-owner','loc-1',$1,clock_timestamp(),'CLOCKED_IN')", [active.device.id]);
  const revoked = await revokeClockerDevice(owner, { deviceId: active.device.id, expectedVersion: 2 }, db.executor);
  expect(revoked.state).toBe('REVOKED');
  expect(await authenticateClockerDevice({ credential: active.credential, locationKey: '2' }, db.executor)).toBeNull();
  expect(await q("SELECT status FROM time_entries WHERE id='c1-open'")).toEqual([{ status: 'CLOCKED_IN' }]);
  await expect(q('DELETE FROM clocker_device_events')).rejects.toMatchObject({ code: '23514' });
});
it('rotates by invalidating the old tablet immediately, while preserving device identity', async () => {
  const { active } = await enrolled();
  const pending = await rotateClockerDevice(owner, { deviceId: active.device.id, expectedVersion: 2 }, db.executor);
  expect(pending.device).toMatchObject({ id: active.device.id, state: 'PENDING', version: 3 });
  expect(await authenticateClockerDevice({ credential: active.credential, locationKey: '2' }, db.executor)).toBeNull();
  const replacement = await redeemClockerEnrollment({ enrollmentToken: pending.enrollmentToken, locationKey: '2' }, db.executor);
  expect(replacement.device).toMatchObject({ id: active.device.id, credentialVersion: 2, version: 4 });
  expect(replacement.credential).not.toBe(active.credential);
  expect(await authenticateClockerDevice({ credential: active.credential, locationKey: '2' }, db.executor)).toBeNull();
  expect((await authenticateClockerDevice({ credential: replacement.credential, locationKey: '2' }, db.executor))?.device.id).toBe(active.device.id);
});
it('invalidates a previous setup link when a replacement link is issued', async () => {
  const first = await register();
  const next = await rotateClockerDevice(owner, { deviceId: first.device.id, expectedVersion: 1 }, db.executor);
  await expect(redeemClockerEnrollment({ enrollmentToken: first.enrollmentToken, locationKey: '2' }, db.executor)).rejects.toThrow();
  expect((await redeemClockerEnrollment({ enrollmentToken: next.enrollmentToken, locationKey: '2' }, db.executor)).device.state).toBe('ACTIVE');
});
it('checks device authority again inside the final write transaction', async () => {
  const { active } = await enrolled();
  const grant = await authenticateClockerDevice({ credential: active.credential, locationKey: '2' }, db.executor);
  expect(grant).not.toBeNull();
  await revokeClockerDevice(owner, { deviceId: active.device.id, expectedVersion: 2 }, db.executor);
  await expect(db.executor.transaction([
    ...clockerDeviceWriteGuards(grant!.proof),
    { text: "INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('forbidden','c1-owner','loc-1',$1,clock_timestamp(),'CLOCKED_IN')", values: [active.device.id] },
  ])).rejects.toThrow();
  expect(await q('SELECT id FROM time_entries')).toEqual([]);
});
it('lists health and lifecycle metadata only to a current Owner without secret fields', async () => {
  const { active } = await enrolled();
  const records = await listClockerDevices(owner, db.executor);
  expect(records).toHaveLength(1);
  expect(records[0].id).toBe(active.device.id);
  expect(JSON.stringify(records)).not.toMatch(/credentialHash|credential_hash|enrollmentToken|enrollment_hash|sessionHash/);
  await expect(listClockerDevices(manager, db.executor)).rejects.toThrow(/Owner/);
});
it('denies a device when its workspace is inactive and never permits location reassignment', async () => {
  const { active } = await enrolled();
  await expect(q("UPDATE clocker_devices SET location_id='loc-2' WHERE id=$1", [active.device.id])).rejects.toMatchObject({ code: '23514' });
  await q('UPDATE workspaces SET active=false');
  await expect(authenticateClockerDevice({ credential: active.credential, locationKey: '2' }, db.executor)).rejects.toThrow();
});

import { Client } from 'pg';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';

it.each(['owner-demotion','session-revocation','device-revocation','location-deactivation'] as const)(
  'rechecks authority after a real PostgreSQL lock wait: %s', async kind => {
    const { active } = await enrolled();
    const blocker = new Client({ connectionString: db.connectionString });
    const worker = new Client({ connectionString: db.connectionString });
    await blocker.connect(); await worker.connect();
    const workerPid = (await worker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    const executor: SqlExecutor = {
      query: async <T>(s: SqlStatement) => (await worker.query(s.text,[...s.values])).rows as T[],
      transaction: async statements => {
        await worker.query('BEGIN');
        try {
          const results: unknown[][] = [];
          for (const s of statements) results.push((await worker.query(s.text,[...s.values])).rows);
          await worker.query('COMMIT'); return results;
        } catch(error) { await worker.query('ROLLBACK'); throw error; }
      },
    };
    let pending: Promise<unknown> | undefined;
    try {
      await blocker.query('BEGIN');
      if (kind === 'owner-demotion') await blocker.query("SELECT id FROM employees WHERE id='c1-owner' FOR UPDATE");
      if (kind === 'session-revocation') await blocker.query("SELECT token_hash FROM employee_sessions WHERE token_hash=repeat('a',64) FOR UPDATE");
      if (kind === 'device-revocation') await blocker.query('SELECT id FROM clocker_devices WHERE id=$1 FOR UPDATE',[active.device.id]);
      if (kind === 'location-deactivation') await blocker.query("SELECT id FROM locations WHERE id='loc-1' FOR UPDATE");
      const operation = kind === 'owner-demotion' || kind === 'session-revocation'
        ? rotateClockerDevice(owner,{deviceId:active.device.id,expectedVersion:2},executor)
        : authenticateClockerDevice({credential:active.credential,locationKey:'2'},executor);
      const outcome = operation.then(value => ({value}), error => ({error})); pending = outcome;
      let observedBlocked = false;
      for (let i=0;i<200;i++) {
        const [row] = await q<{blocked:boolean}>('SELECT cardinality(pg_blocking_pids($1))>0 AS blocked',[workerPid]);
        if (row.blocked) { observedBlocked=true; break; }
        await new Promise(resolve => setTimeout(resolve,10));
      }
      expect(observedBlocked,'the competing operation must reach the held database lock').toBe(true);
      if (kind === 'owner-demotion') await blocker.query("UPDATE employees SET role='MANAGER' WHERE id='c1-owner'");
      if (kind === 'session-revocation') await blocker.query("DELETE FROM employee_sessions WHERE token_hash=repeat('a',64)");
      if (kind === 'device-revocation') await blocker.query('UPDATE clocker_devices SET active=false,credential_hash=NULL,revoked_at=clock_timestamp(),version=version+1 WHERE id=$1',[active.device.id]);
      if (kind === 'location-deactivation') await blocker.query("UPDATE locations SET active=false WHERE id='loc-1'");
      await blocker.query('COMMIT');
      const settled = await outcome;
      if (kind === 'owner-demotion' || kind === 'session-revocation') {
        expect('error' in settled).toBe(true);
        if ('error' in settled) expect(settled.error).toMatchObject({code:'OWNER_REQUIRED'});
        expect(await q("SELECT kind FROM clocker_device_events WHERE kind='ROTATION_REQUESTED'")).toEqual([]);
      } else {
        expect(settled).toEqual({value:null});
        expect(await q('SELECT last_seen_at FROM clocker_devices')).toEqual([{last_seen_at:null}]);
      }
    } finally {
      await blocker.query('ROLLBACK');
      await pending;
      await blocker.end(); await worker.end();
    }
  },
);

it('rejects malformed public route keys before performing database work', async () => {
  const { active } = await enrolled();
  const denied: SqlExecutor = {
    query: async () => { throw new Error('unexpected database read'); },
    transaction: async () => { throw new Error('unexpected database write'); },
  };
  for (const locationKey of ['', '../2', '2\u0000', 'a'.repeat(65)]) {
    expect(await authenticateClockerDevice({credential:active.credential,locationKey},denied)).toBeNull();
  }
});

it.each(['rename','rotate','revoke'] as const)('denies Manager device %s operations', async kind => {
  const {active}=await enrolled();
  const input={deviceId:active.device.id,expectedVersion:2};
  const attempt=kind==='rename' ? renameClockerDevice(manager,{...input,name:'Denied'},db.executor)
    : kind==='rotate' ? rotateClockerDevice(manager,input,db.executor) : revokeClockerDevice(manager,input,db.executor);
  await expect(attempt).rejects.toMatchObject({code:'OWNER_REQUIRED'});
  expect((await listClockerDevices(owner,db.executor))[0]).toMatchObject({version:2,state:'ACTIVE',name:'Front tablet'});
});
it('rejects an Owner identity paired with someone else’s valid session', async () => {
  await expect(registerClockerDevice({...owner,sessionTokenHash:manager.sessionTokenHash},
    {name:'Spoofed',locationId:'loc-1'},db.executor)).rejects.toMatchObject({code:'OWNER_REQUIRED'});
  expect(await q('SELECT id FROM clocker_devices')).toEqual([]);
});
it('rolls back device creation when the audit insert fails after the device insert', async () => {
  await q(`CREATE FUNCTION c1_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'injected audit failure'; END; $$;
    CREATE TRIGGER c1_fail_audit BEFORE INSERT ON clocker_device_events FOR EACH ROW EXECUTE FUNCTION c1_fail_audit();`);
  await expect(register()).rejects.toMatchObject({code:'UNAVAILABLE'});
  expect(await q('SELECT id FROM clocker_devices')).toEqual([]);
  expect(await q('SELECT id FROM clocker_device_events')).toEqual([]);
});
it('requires fresh enrollment when replacing a revoked device', async () => {
  const {active}=await enrolled();
  const revoked=await revokeClockerDevice(owner,{deviceId:active.device.id,expectedVersion:2},db.executor);
  const pending=await rotateClockerDevice(owner,{deviceId:active.device.id,expectedVersion:revoked.version},db.executor);
  expect(await authenticateClockerDevice({credential:active.credential,locationKey:'2'},db.executor)).toBeNull();
  const replacement=await redeemClockerEnrollment({enrollmentToken:pending.enrollmentToken,locationKey:'2'},db.executor);
  expect(replacement.device.id).toBe(active.device.id);
  expect(replacement.device.credentialVersion).toBe(2);
});

it('binds the pre-established HttpOnly setup credential for lost-response recovery', async () => {
  const pending = await register();
  const preparedCredential = 'nev_dev_' + 'e'.repeat(64);
  const result = await redeemClockerEnrollment({ enrollmentToken: pending.enrollmentToken, locationKey: '2', preparedCredential }, db.executor);
  expect(result.credential).toBe(preparedCredential);
  expect((await authenticateClockerDevice({ credential: preparedCredential, locationKey: '2' }, db.executor))?.device.id).toBe(pending.device.id);
});
it('rejects malformed prepared credentials without consuming the setup code', async () => {
  const pending = await register();
  await expect(redeemClockerEnrollment({ enrollmentToken: pending.enrollmentToken, locationKey: '2', preparedCredential: 'forged' }, db.executor)).rejects.toMatchObject({ code: 'ENROLLMENT_INVALID' });
  expect((await listClockerDevices(owner, db.executor))[0].state).toBe('PENDING');
});

it('never reissues a retired device credential during replacement enrollment',async()=>{
 const {active}=await enrolled();
 const pending=await rotateClockerDevice(owner,{deviceId:active.device.id,expectedVersion:2},db.executor);
 await expect(redeemClockerEnrollment({enrollmentToken:pending.enrollmentToken,locationKey:'2',preparedCredential:active.credential},db.executor)).rejects.toMatchObject({code:'ENROLLMENT_INVALID'});
 expect(await authenticateClockerDevice({credential:active.credential,locationKey:'2'},db.executor)).toBeNull();
 expect((await listClockerDevices(owner,db.executor))[0].state).toBe('PENDING');
});
