import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import { createDisposableFoundationDatabase } from './local-postgres';

type Db = Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const owned: Db[] = [];
afterEach(async () => {
  while (owned.length) await owned.pop()!.dispose();
});
async function db(mode: 'phase-c-base' | 'current-runtime') {
  const value = await createDisposableFoundationDatabase({ mode });
  owned.push(value);
  return value;
}
const q = <T = Record<string, unknown>>(database: Db, text: string, values: unknown[] = []) =>
  database.executor.query<T>({ text, values });

const phaseCMigrations = [
  '0011_clocker_devices.sql',
  '0012_clocker_pins.sql',
  '0013_clocker_punches.sql',
  '0014_clocker_breaks.sql',
  '0015_clocker_schedule_context.sql',
] as const;

async function phaseCObjects(database: Db) {
  const [row] = await q<{
    deviceCredentials: string | null;
    employeePins: string | null;
    commandLedger: string | null;
    breakTypes: string | null;
    scheduleContext: boolean;
    deviceCredentialHash: boolean;
  }>(database, `
    SELECT
      to_regclass('clocker_device_credentials')::text AS "deviceCredentials",
      to_regclass('employee_clocker_pins')::text AS "employeePins",
      to_regclass('clocker_command_ledger')::text AS "commandLedger",
      to_regclass('clocker_break_types')::text AS "breakTypes",
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='time_entries' AND column_name='schedule_context') AS "scheduleContext",
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='clocker_devices' AND column_name='credential_hash') AS "deviceCredentialHash"
  `);
  return row;
}

describe('Phase C numbered release migrations', () => {
  it('fresh current-runtime installs every Phase C object without seeding operational data', async () => {
    const database = await db('current-runtime');
    expect(await phaseCObjects(database)).toEqual({
      deviceCredentials: 'clocker_device_credentials',
      employeePins: 'employee_clocker_pins',
      commandLedger: 'clocker_command_ledger',
      breakTypes: 'clocker_break_types',
      scheduleContext: true,
      deviceCredentialHash: true,
    });
    expect(await q(database, `
      SELECT
        (SELECT count(*)::int FROM clocker_device_credentials) AS device_credentials,
        (SELECT count(*)::int FROM employee_clocker_pins) AS employee_pins,
        (SELECT count(*)::int FROM clocker_command_ledger) AS command_ledger,
        (SELECT count(*)::int FROM clocker_break_types) AS break_types
    `)).toEqual([{ device_credentials: 0, employee_pins: 0, command_ledger: 0, break_types: 0 }]);
  });

  it('upgrades exact 0010 history through 0011-0015 without rewriting recorded time', async () => {
    const database = await db('phase-c-base');
    await q(database, `
      INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id)
      VALUES('release-legacy','Legacy','Employee','5550001199','EMPLOYEE','loc-1');
      INSERT INTO clocker_devices(id,location_id,name,active,last_seen_at)
      VALUES('release-device','loc-1','Legacy tablet',true,'2030-10-07T11:00:00Z');
      INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status,created_at,updated_at)
      VALUES('release-entry','release-legacy','loc-1','release-device','2030-10-07T12:00:00Z','ON_BREAK','2030-10-07T12:00:00Z','2030-10-07T12:00:00Z');
      INSERT INTO break_entries(id,time_entry_id,break_start_at)
      VALUES('release-break','release-entry','2030-10-07T13:00:00Z');
    `);
    const before = {
      device: await q(database, `SELECT id,location_id,name,active,last_seen_at::text FROM clocker_devices WHERE id='release-device'`),
      entry: await q(database, `SELECT id,employee_id,location_id,device_id,clock_in_at::text,clock_out_at::text,status,created_at::text,updated_at::text FROM time_entries WHERE id='release-entry'`),
      break: await q(database, `SELECT id,time_entry_id,break_start_at::text,break_end_at::text FROM break_entries WHERE id='release-break'`),
    };

    expect(await phaseCObjects(database)).toEqual({
      deviceCredentials: null,
      employeePins: null,
      commandLedger: null,
      breakTypes: null,
      scheduleContext: false,
      deviceCredentialHash: false,
    });

    for (const file of phaseCMigrations) {
      await q(database, await readFile(`db/migrations/${file}`, 'utf8'));
    }

    expect(await phaseCObjects(database)).toEqual({
      deviceCredentials: 'clocker_device_credentials',
      employeePins: 'employee_clocker_pins',
      commandLedger: 'clocker_command_ledger',
      breakTypes: 'clocker_break_types',
      scheduleContext: true,
      deviceCredentialHash: true,
    });
    expect(await q(database, `SELECT id,location_id,name,active,last_seen_at::text FROM clocker_devices WHERE id='release-device'`)).toEqual(before.device);
    expect(await q(database, `SELECT id,employee_id,location_id,device_id,clock_in_at::text,clock_out_at::text,status,created_at::text,updated_at::text FROM time_entries WHERE id='release-entry'`)).toEqual(before.entry);
    expect(await q(database, `SELECT id,time_entry_id,break_start_at::text,break_end_at::text FROM break_entries WHERE id='release-break'`)).toEqual(before.break);
    expect(await q(database, `SELECT credential_hash,enrollment_hash,credential_version,version FROM clocker_devices WHERE id='release-device'`))
      .toEqual([{ credential_hash: null, enrollment_hash: null, credential_version: 0, version: 1 }]);
    expect(await q(database, `SELECT version,schedule_context FROM time_entries WHERE id='release-entry'`))
      .toEqual([{ version: 1, schedule_context: null }]);
    expect(await q(database, `SELECT version,break_type_id,break_type_snapshot FROM break_entries WHERE id='release-break'`))
      .toEqual([{ version: 1, break_type_id: null, break_type_snapshot: null }]);
  });
});
