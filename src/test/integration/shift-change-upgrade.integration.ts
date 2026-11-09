import { expect,it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createDisposableExchangeDatabase } from './local-postgres';
it('aborts contradictory legacy cross-column participation without deleting history or partially migrating',async()=>{
 const db=await createDisposableExchangeDatabase({mode:'historical-9'});
 const q=(text:string)=>db.executor.query<Record<string,unknown>>({text,values:[]});
 try {
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES ('a','Test','A','0','OWNER','loc-1'),('b','Test','B','1','EMPLOYEE','loc-1')");
  await q("INSERT INTO schedules(id,location_id,week_start,created_by) VALUES ('s','loc-1','2026-10-05','a')");
  await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES ('one','s','a','2026-10-06','10:00','18:00'),('two','s','b','2026-10-07','10:00','18:00')");
  await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,status) VALUES ('offer','COVERAGE','one','a','OPEN')");
  await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,target_shift_id,requested_by_employee_id,target_employee_id,status) VALUES ('cross','SWAP','two','one','b','a','EMPLOYEE_PENDING')");
  await expect(q(await readFile('db/migrations/0010_shift_coverage_automation.sql','utf8'))).rejects.toThrow('shift_change_legacy_participation_conflict');
  expect(await q('SELECT count(*)::integer AS count FROM shift_exchanges')).toEqual([{count:2}]);
  expect(await q("SELECT column_name FROM information_schema.columns WHERE table_name='workspaces' AND column_name='shift_change_policy'")).toEqual([]);
 } finally {await db.dispose();}
});
it('retains both legacy swap location/week terms after live schedules are deleted',async()=>{
 const db=await createDisposableExchangeDatabase({mode:'historical-9'});
 const q=(text:string)=>db.executor.query<Record<string,unknown>>({text,values:[]});
 try {
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES ('a','Test','A','0','OWNER','loc-1'),('b','Test','B','1','EMPLOYEE','loc-2')");
  await q("INSERT INTO schedules(id,location_id,week_start,created_by) VALUES ('source-schedule','loc-1','2026-10-05','a'),('target-schedule','loc-2','2026-10-12','a')");
  await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES ('source','source-schedule','a','2026-10-06','10:00','18:00'),('target','target-schedule','b','2026-10-13','11:00','19:00')");
  await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,target_shift_id,requested_by_employee_id,target_employee_id,status) VALUES ('legacy-swap','SWAP','source','target','a','b','APPROVED')");
  await q(await readFile('db/migrations/0010_shift_coverage_automation.sql','utf8'));
  await q("DELETE FROM schedules WHERE id='source-schedule'");
  await q("DELETE FROM schedules WHERE id='target-schedule'");
  expect(await q('SELECT id FROM shifts')).toEqual([]);
  expect(await q('SELECT id FROM schedules')).toEqual([]);
  expect(await q("SELECT source_terms,target_terms FROM shift_change_events WHERE request_id='legacy-swap'")).toMatchObject([{
   source_terms:{id:'source',employee_id:'a',date:'2026-10-06',start_time:'10:00:00',end_time:'18:00:00',locationId:'loc-1',weekStart:'2026-10-05',consentStatus:'UNKNOWN'},
   target_terms:{id:'target',employee_id:'b',date:'2026-10-13',start_time:'11:00:00',end_time:'19:00:00',locationId:'loc-2',weekStart:'2026-10-12',consentStatus:'UNKNOWN'},
  }]);
 } finally {await db.dispose();}
});

it('H06 historical-9 upgrade preserves immutable source/target times, position and Lead in presentation',async()=>{
 const db=await createDisposableExchangeDatabase({mode:'historical-9'});
 const q=(text:string)=>db.executor.query<Record<string,unknown>>({text,values:[]});
 try {
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES ('a','Test','A','0','OWNER','loc-1'),('b','Test','B','1','EMPLOYEE','loc-1')");
  await q("INSERT INTO positions(id,workspace_id,name) VALUES ('legacy-position','workspace-fuel','Legacy'); INSERT INTO schedules(id,location_id,week_start,created_by) VALUES ('s','loc-1','2035-10-01','a')");
  await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES ('one','s','a','2035-10-02','10:00','18:00','legacy-position',true),('two','s','b','2035-10-03','11:00','19:00',NULL,false)");
  await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,target_shift_id,requested_by_employee_id,target_employee_id,status) VALUES ('legacy','SWAP','one','two','a','b','APPROVED'); INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code,status) VALUES ('legacy-callout','one','a','OTHER','APPROVED')");
  await q(await readFile('db/migrations/0010_shift_coverage_automation.sql','utf8'));
  // Preserve the original historical-9 ->0010 assertions/source; the current
  // Owner presentation requires an explicit access sidecar, not a missing-schema fallback.
  // This overlay is not a supported production migration-chain claim.
  for(const file of ['0024_schedule_copy_receipts.sql','0032_company_access_invitations.sql'])await q(await readFile('db/migrations/'+file,'utf8'));
  const {fixtureProof}=await import('./shift-change-api');const proof=await fixtureProof(db.executor,'a');
  const {readShiftChangeHistoryView}=await import('../../lib/data/shift-change-views');
  await q("DELETE FROM schedules WHERE id='s'");
  const exchange=await readShiftChangeHistoryView(proof,'legacy',db.executor);
  expect(exchange[0].source).toContain('10:00 – 18:00');expect(exchange[0].source).toContain('Position legacy-position · Designated lead');expect(exchange[0].target).toContain('11:00 – 19:00');expect(exchange[0].target).toContain('No assigned position · No designated lead');
  expect((await readShiftChangeHistoryView(proof,'legacy-callout',db.executor))[0].source).toBe(exchange[0].source);
 } finally {await db.dispose();}
});
