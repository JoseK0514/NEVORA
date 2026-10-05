import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { createDisposableFoundationDatabase } from './local-postgres';

export const draftPath = 'db/phase-c/clocker-devices.sql';
it('adds device credentials without changing legacy devices or punch history', async () => {
  const db = await createDisposableFoundationDatabase({ mode: 'current-runtime' });
  const q = (text: string, values: unknown[] = []) => db.executor.query<Record<string, unknown>>({ text, values });
  try {
    await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id)
      VALUES('c1-legacy','Test','Employee','555','EMPLOYEE','loc-1');
      INSERT INTO clocker_devices(id,location_id,name) VALUES('legacy-tablet','loc-1','Existing tablet');
      INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status)
      VALUES('legacy-entry','c1-legacy','loc-1','legacy-tablet','2030-10-07T12:00Z','ON_BREAK');
      INSERT INTO break_entries(id,time_entry_id,break_start_at)
      VALUES('legacy-break','legacy-entry','2030-10-07T13:00Z');`);
    const entries = await q('SELECT * FROM time_entries');
    const breaks = await q('SELECT * FROM break_entries');
    const legacy = await q('SELECT id,location_id,name,active,last_seen_at FROM clocker_devices');
    expect(existsSync(draftPath), 'Phase C device schema draft must exist').toBe(true);
    await q(await readFile(draftPath, 'utf8'));
    expect(await q('SELECT * FROM time_entries')).toEqual(entries);
    expect(await q('SELECT * FROM break_entries')).toEqual(breaks);
    expect(await q('SELECT id,location_id,name,active,last_seen_at FROM clocker_devices')).toEqual(legacy);
    expect(await q('SELECT credential_hash,enrollment_hash,credential_version,version FROM clocker_devices'))
      .toEqual([{ credential_hash: null, enrollment_hash: null, credential_version: 0, version: 1 }]);
    await expect(q("UPDATE clocker_devices SET credential_hash='plaintext'"))
      .rejects.toMatchObject({ code: '23514' });
    await expect(q("UPDATE clocker_devices SET enrollment_hash=repeat('a',64)"))
      .rejects.toMatchObject({ code: '23514' });
    await expect(q("DELETE FROM clocker_devices WHERE id='legacy-tablet'"))
      .rejects.toMatchObject({ code: '23503' });
    expect(await q('SELECT * FROM clocker_device_events')).toEqual([]);
  } finally { await db.dispose(); }
});
