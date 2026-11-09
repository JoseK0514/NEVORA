import { afterAll,beforeAll,expect,it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createDisposableExchangeDatabase } from './local-postgres';
import type { SqlExecutor } from '../../lib/notifications/types';
let db: Awaited<ReturnType<typeof createDisposableExchangeDatabase>>;
let sql: SqlExecutor;
const q = (text:string,values:readonly unknown[]=[]) => sql.query<Record<string,unknown>>({text,values});
beforeAll(async()=>{db=await createDisposableExchangeDatabase({mode:'historical-9'});sql=db.executor;
 await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES ('owner','Test','Owner','0','OWNER','loc-1'),('a','Test','A','1','EMPLOYEE','loc-1'),('b','Test','B','2','EMPLOYEE','loc-1'),('manager','Test','Manager','3','MANAGER','loc-1')`);
 await q(`INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES ('s','loc-1','2026-10-05','PUBLISHED','owner')`);
 await q(`INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES ('one','s','a','2026-10-06','10:00','18:00'),('two','s','b','2026-10-07','10:00','18:00'),('three','s','b','2026-10-08','10:00','18:00')`);
 await q(`INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,status) VALUES ('legacy','COVERAGE','one','a','MANAGER_PENDING')`);
 await q("INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code,reason_note,status) VALUES ('legacy-absence','three','b','ILLNESS','Private fictional note','APPROVED')");
});
afterAll(async()=>{await db?.dispose();});
it('upgrade preserves legacy consent as unknown and leaves policy unselected',async()=>{
 const migration=await readFile('db/migrations/0010_shift_coverage_automation.sql','utf8');
 await q(migration);
 const columns=await q("SELECT column_name FROM information_schema.columns WHERE table_name='shift_exchanges'");
 expect(columns.map(c=>c.column_name)).toContain('request_revision');
 expect(await q("SELECT legacy_manual,request_revision,requester_consent FROM shift_exchanges WHERE id='legacy'")).toEqual([{legacy_manual:true,request_revision:1,requester_consent:null}]);
 expect(await q('SELECT shift_change_policy FROM workspaces')).toEqual([{shift_change_policy:null}]);
});
it('server episodes change for return-to-original owner and deletion/recreation but not notes',async()=>{
 const first=(await q("SELECT assignment_episode_id FROM shifts WHERE id='three'"))[0].assignment_episode_id;
 await q("UPDATE shifts SET notes='display note' WHERE id='three'");
 expect((await q("SELECT assignment_episode_id FROM shifts WHERE id='three'"))[0].assignment_episode_id).toBe(first);
 await q("UPDATE shifts SET employee_id='a' WHERE id='three'");
 await q("UPDATE shifts SET employee_id='b' WHERE id='three'");
 const returning=(await q("SELECT assignment_episode_id FROM shifts WHERE id='three'"))[0].assignment_episode_id;
 expect(returning).not.toBe(first);
 await q("UPDATE shifts SET start_time='11:00' WHERE id='three'");
 expect((await q("SELECT assignment_episode_id FROM shifts WHERE id='three'"))[0].assignment_episode_id).toBe(returning);
 await q("DELETE FROM shifts WHERE id='three'");
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,assignment_episode_id) VALUES ('three','s','b','2026-10-08','10:00','18:00',$1)",[first]);
 expect((await q("SELECT assignment_episode_id FROM shifts WHERE id='three'"))[0].assignment_episode_id).not.toBe(first);
});
it('cross-source/target and callout reservations conflict and terminal outcomes release them',async()=>{
 await expect(q("INSERT INTO shift_exchanges(id,kind,source_shift_id,target_shift_id,requested_by_employee_id,target_employee_id,status) VALUES ('cross','SWAP','two','one','b','a','EMPLOYEE_PENDING')")).rejects.toMatchObject({code:'23505',constraint:'shift_change_participation_pkey'});
 await expect(q("INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code) VALUES ('compete','one','a','OTHER')")).rejects.toMatchObject({code:'23505',constraint:'shift_change_participation_pkey'});
 await q("UPDATE shift_exchanges SET status='CANCELLED' WHERE id='legacy'");
 await q("INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code,legacy_manual,assignment_episode_id,reviewed_terms_fingerprint) SELECT 'callout','one','a','OTHER',false,assignment_episode_id,'fingerprint' FROM shifts WHERE id='one'");
 await q("UPDATE shift_callouts SET status='APPROVED' WHERE id='callout'");
 await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,legacy_manual,linked_callout_id) VALUES ('need','COVERAGE','one','a',false,'callout')");
 expect(await q("SELECT exchange_id,callout_id FROM shift_change_participation WHERE shift_id='one'")).toEqual([{exchange_id:'need',callout_id:null}]);
 await q("UPDATE shift_exchanges SET status='APPROVED' WHERE id='need'");
 await q("UPDATE shifts SET employee_id='b' WHERE id='one'");
 await q("INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code,legacy_manual,assignment_episode_id,reviewed_terms_fingerprint) SELECT 'again','one','b','OTHER',false,assignment_episode_id,'newterms' FROM shifts WHERE id='one'");
 expect((await q("SELECT count(*)::int AS count FROM shift_callouts WHERE shift_id='one'"))[0].count).toBe(2);
});
it('immutable event history survives source deletion',async()=>{
 const before=await q("SELECT * FROM shift_change_events WHERE request_id='legacy'");expect(before.length).toBeGreaterThan(0);
 await expect(q("UPDATE shift_change_events SET outcome_reason='changed' WHERE request_id='legacy'")).rejects.toThrow();
 await q("DELETE FROM shifts WHERE id='one'");
 expect(await q("SELECT * FROM shift_change_events WHERE request_id='legacy'")).toEqual(before);
});

it('retains private original callout reason after source deletion',async()=>{
 const cols=await q("SELECT column_name FROM information_schema.columns WHERE table_name='shift_change_events'");
 expect(cols.map(c=>c.column_name)).toContain('callout_reason_note');
 expect(await q("SELECT callout_reason_code,callout_reason_note FROM shift_change_events WHERE request_id='legacy-absence'")).toEqual([{callout_reason_code:'ILLNESS',callout_reason_note:'Private fictional note'}]);
 expect(await q("SELECT id FROM shift_callouts WHERE id='legacy-absence'")).toEqual([]);
});
