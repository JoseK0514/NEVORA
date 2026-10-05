import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { createDisposableFoundationDatabase } from './local-postgres';
it('adds punch revisions and immutable receipts without rewriting legacy time or breaks',async()=>{
 const db=await createDisposableFoundationDatabase({mode:'current-runtime'});
 const q=(text:string,values:unknown[]=[])=>db.executor.query<Record<string,unknown>>({text,values});
 try{
  await q(await readFile('db/phase-c/clocker-devices.sql','utf8'));
  await q(await readFile('db/phase-c/clocker-pins.sql','utf8'));
  await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('legacy','Test','Legacy','555','EMPLOYEE','loc-1');
   INSERT INTO clocker_devices(id,location_id,name) VALUES('legacy-device','loc-1','Legacy');
   INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('legacy-time','legacy','loc-1','legacy-device','2020-01-01T12:00:00Z','ON_BREAK');
   INSERT INTO break_entries(id,time_entry_id,break_start_at) VALUES('legacy-break','legacy-time','2020-01-01T13:00:00Z');`);
  const entries=await q('SELECT * FROM time_entries'),breaks=await q('SELECT * FROM break_entries');
  expect(existsSync('db/phase-c/clocker-punches.sql'),'draft punch schema exists').toBe(true);
  await q(await readFile('db/phase-c/clocker-punches.sql','utf8'));
  expect((await q('SELECT * FROM time_entries')).map(({version:_v,...row})=>row)).toEqual(entries);
  expect((await q('SELECT * FROM break_entries')).map(({version:_v,...row})=>row)).toEqual(breaks);
  expect(await q('SELECT version FROM time_entries')).toEqual([{version:1}]);
  expect(await q('SELECT * FROM clocker_command_ledger')).toEqual([]);
  expect(await q('SELECT * FROM clocker_employee_clock_state')).toEqual([]);
  await expect(q('UPDATE time_entries SET version=0')).rejects.toMatchObject({code:'23514'});
  await expect(q('UPDATE break_entries SET version=0')).rejects.toMatchObject({code:'23514'});
 }finally{await db.dispose();}
});
