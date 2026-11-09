import {it,expect} from 'vitest';
import {Client} from 'pg';
import {randomUUID} from 'node:crypto';
import {BASE_MIGRATIONS,FINAL_MIGRATIONS} from '../../../db/migrations/order';
import {missingMigrationFiles} from '../../lib/migration-order';
import {readFile} from 'node:fs/promises';
import {createDisposableFoundationDatabase} from './local-postgres';
const indexSql=()=>readFile('db/migrations/0038_read_path_indexes.sql','utf8');
type Database=Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
async function owned<T>(run:(client:Client,database:Database)=>Promise<T>){const database=await createDisposableFoundationDatabase({mode:'current-runtime'}),client=new Client({connectionString:database.connectionString});try{await client.connect();return await run(client,database);}finally{await client.end();await database.dispose();}}
it('rejects a same-name index with a different definition before skipping it',()=>owned(async client=>{
 await client.query('DROP INDEX time_entries_clock_out_idx; CREATE INDEX time_entries_clock_out_idx ON time_entries(clock_in_at)');
 await expect(client.query(await indexSql())).rejects.toThrow('release1_read_index_definition_mismatch');
 const result=await client.query("SELECT pg_get_indexdef('time_entries_clock_out_idx'::regclass) AS definition");expect(result.rows[0].definition).toContain('(clock_in_at)');
}));
it('honors the five-second lock budget and leaves both indexes absent after a failed file',()=>owned(async(client,database)=>{
 const blocker=new Client({connectionString:database.connectionString});try{
  await blocker.connect();await client.query('DROP INDEX schedule_revision_shifts_source_idx; DROP INDEX time_entries_clock_out_idx');
  await blocker.query('BEGIN; LOCK TABLE schedule_publication_revision_shifts IN ROW EXCLUSIVE MODE');
  await client.query("SET lock_timeout='5s'; SET statement_timeout='60s'");const started=performance.now();
  await expect(client.query(await indexSql())).rejects.toMatchObject({code:'55P03'});const elapsed=performance.now()-started;expect(elapsed).toBeGreaterThanOrEqual(4500);expect(elapsed).toBeLessThan(8000);
  expect((await client.query("SELECT to_regclass('schedule_revision_shifts_source_idx') AS a,to_regclass('time_entries_clock_out_idx') AS b")).rows).toEqual([{a:null,b:null}]);
  await blocker.query('ROLLBACK');await client.query(await indexSql());
  const rows=(await client.query("SELECT i.indisvalid,i.indisready FROM pg_index i WHERE i.indexrelid IN ('schedule_revision_shifts_source_idx'::regclass,'time_entries_clock_out_idx'::regclass)")).rows;expect(rows).toEqual([{indisvalid:true,indisready:true},{indisvalid:true,indisready:true}]);
 }finally{await blocker.query('ROLLBACK').catch(()=>{});await blocker.end();}
}));
it('refuses an actual interrupted concurrent index without silently dropping or repairing it',()=>owned(async(client,database)=>{
 const blocker=new Client({connectionString:database.connectionString}),builder=new Client({connectionString:database.connectionString});try{
  await blocker.connect();await builder.connect();await client.query('DROP INDEX schedule_revision_shifts_source_idx');await blocker.query('BEGIN; LOCK TABLE schedule_publication_revision_shifts IN ROW EXCLUSIVE MODE');
  const {pid}=(await builder.query('SELECT pg_backend_pid() AS pid')).rows[0];const build=builder.query('CREATE INDEX CONCURRENTLY schedule_revision_shifts_source_idx ON schedule_publication_revision_shifts(source_shift_id)').then(()=>null,error=>error);
  await expect.poll(async()=>Number((await client.query("SELECT count(*) AS n FROM pg_index WHERE indexrelid=to_regclass('schedule_revision_shifts_source_idx') AND NOT indisvalid")).rows[0].n),{timeout:5000,interval:25}).toBe(1);
  expect((await client.query('SELECT pg_cancel_backend($1) AS canceled',[pid])).rows).toEqual([{canceled:true}]);expect(await build).toMatchObject({code:'57014'});await blocker.query('ROLLBACK');
  await expect(client.query(await indexSql())).rejects.toThrow('release1_read_index_invalid');
  expect((await client.query("SELECT indisvalid FROM pg_index WHERE indexrelid='schedule_revision_shifts_source_idx'::regclass")).rows).toEqual([{indisvalid:false}]);
 }finally{await blocker.query('ROLLBACK').catch(()=>{});await blocker.end();await builder.end();}
}));

it('upgrades the existing full chain by exact filename, preserves rows and keeps setup records immutable',async()=>{
 const database=await createDisposableFoundationDatabase({mode:'empty'}),client=new Client({connectionString:database.connectionString});
 try{
  await client.connect();const additions=['0038_read_path_indexes.sql','0039_native_payroll_setup_records.sql'];
  const legacy=BASE_MIGRATIONS.filter(file=>!additions.includes(file));
  for(const file of legacy)await client.query(await readFile('db/migrations/'+file,'utf8'));
  await client.query("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('R1-OWNER','Fictional','Upgrade','2025550141','OWNER','loc-1')");
  for(const file of FINAL_MIGRATIONS)await client.query(await readFile('db/migrations/'+file,'utf8'));
  const before=(await client.query('SELECT id,name FROM workspaces ORDER BY id')).rows;
  const applied=[...legacy,...FINAL_MIGRATIONS];const missing=missingMigrationFiles([...BASE_MIGRATIONS,...FINAL_MIGRATIONS],applied);expect(missing).toEqual(additions);
  for(const file of missing){await client.query(await readFile('db/migrations/'+file,'utf8'));applied.push(file as typeof applied[number]);}
  expect(missingMigrationFiles([...BASE_MIGRATIONS,...FINAL_MIGRATIONS],applied)).toEqual([]);
  expect((await client.query('SELECT id,name FROM workspaces ORDER BY id')).rows).toEqual(before);
  const hash='a'.repeat(64),payload={factsSha256:hash,revision:1,kind:'COMPANY_DEFAULTS',subjectId:'COMPANY'};
  await client.query("INSERT INTO native_payroll_setup_records(workspace_id,kind,subject_id,revision,operation_id,actor_employee_id,facts_sha256,payload) VALUES('workspace-fuel','COMPANY_DEFAULTS','COMPANY',1,$1,'R1-OWNER',$2,$3)",[randomUUID(),hash,JSON.stringify(payload)]);
  for(const sql of ["UPDATE native_payroll_setup_records SET revision=2","DELETE FROM native_payroll_setup_records","TRUNCATE native_payroll_setup_records"]){await expect(client.query(sql)).rejects.toThrow('immutable ledger');}
  expect((await client.query('SELECT revision,payload FROM native_payroll_setup_records_current')).rows).toEqual([{revision:1,payload}]);
  await client.query("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('R1-INVITEE','Fictional','Invitee','2025550142','EMPLOYEE','loc-1')");
  const insert="INSERT INTO company_invitations(workspace_id,id,employee_id,revision,target_version,email_fingerprint,issuer_employee_id,issuer_generation,issued_at,expires_at,retired_at,retired_reason) VALUES('workspace-fuel',$1,'R1-INVITEE',$2,'fictional-reviewed-version',$3,'R1-OWNER',1,'2026-10-29T12:00:00Z',$4,clock_timestamp(),'REVOKED')";
  await client.query(insert,[randomUUID(),1,hash,'2026-11-05T12:00:00Z']);
  await expect(client.query(insert,[randomUUID(),2,hash,'2026-11-05T12:00:01Z'])).rejects.toMatchObject({constraint:'company_invitations_lifetime'});
 }finally{await client.end();await database.dispose();}
});
