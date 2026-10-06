import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { createDisposableFoundationDatabase } from './local-postgres';

it('extends punch persistence without rewriting historical entries or breaks',async()=>{
 const db=await createDisposableFoundationDatabase({mode:'phase-c-base'});
 const q=(text:string,values:unknown[]=[])=>db.executor.query<Record<string,unknown>>({text,values});
 try{
  await q(await readFile('db/migrations/0011_clocker_devices.sql','utf8'));
  await q(await readFile('db/migrations/0012_clocker_pins.sql','utf8'));
  await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('c34-legacy','Legacy','QA','555','EMPLOYEE','loc-1');
   INSERT INTO clocker_devices(id,location_id,name) VALUES('c34-old-tablet','loc-1','Historical tablet');
   INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status)
    VALUES('c34-old-entry','c34-legacy','loc-1','c34-old-tablet','2020-01-01T22:00Z','2020-01-02T06:00Z','CLOCKED_OUT');
   INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at)
    VALUES('c34-old-break','c34-old-entry','2020-01-02T01:00Z','2020-01-02T01:15Z');`);
  const entries=await q('SELECT * FROM time_entries'),breaks=await q('SELECT * FROM break_entries');
  expect(existsSync('db/migrations/0013_clocker_punches.sql'),'0013 punch migration must exist').toBe(true);
  await q(await readFile('db/migrations/0013_clocker_punches.sql','utf8'));
  expect((await q('SELECT * FROM time_entries')).map(({version:_,...row})=>row)).toEqual(entries);
  expect((await q('SELECT * FROM break_entries')).map(({version:_,...row})=>row)).toEqual(breaks);
  expect(await q('SELECT version FROM time_entries')).toEqual([{version:1}]);
  expect(await q('SELECT version FROM break_entries')).toEqual([{version:1}]);
  expect(await q('SELECT * FROM clocker_command_ledger')).toEqual([]);
  expect(await q('SELECT * FROM clocker_employee_clock_state')).toEqual([]);
  expect((await q("SELECT clocker_punch_snapshot('c34-legacy') AS snapshot"))[0].snapshot).toEqual({revision:0,entry:null,break:null});
 }finally{await db.dispose();}
});
