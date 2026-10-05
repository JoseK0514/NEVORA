import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDisposableFoundationDatabase } from './local-postgres';

let db: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
beforeEach(async () => {
  db = await createDisposableFoundationDatabase({ mode: 'current-runtime' });
});
afterEach(async () => {
  if (db) await db.dispose();
});

it('adds nullable context columns without inventing schedule matches for existing history', async () => {
  const q = <T = Record<string, unknown>>(text: string, values: unknown[] = []) =>
    db.executor.query<T>({ text, values });

  await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id)
    VALUES('c6-history','Historical','Employee','5550000010','EMPLOYEE','loc-1')`);
  await q(`INSERT INTO clocker_devices(id,location_id,name,active) VALUES('c6-history-device','loc-1','Historical tablet',true)`);
  await q(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status)
    VALUES('c6-history-entry','c6-history','loc-1','c6-history-device','2030-10-07T13:00:00Z','CLOCKED_IN')`);

  await q(await readFile('db/phase-c/clocker-schedule-context.sql', 'utf8'));

  expect(await q(`SELECT schedule_context FROM time_entries WHERE id='c6-history-entry'`)).toEqual([
    { schedule_context: null },
  ]);
});
