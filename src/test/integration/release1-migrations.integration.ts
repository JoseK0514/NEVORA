import {it,expect} from '@rstest/core';
import {Client} from 'pg';
import {randomUUID,createHash} from 'node:crypto';
import {BASE_MIGRATIONS,FINAL_MIGRATIONS} from '../../../db/migrations/order';
import {missingMigrationFiles} from '../../lib/migration-order';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import baseline from '../../../scripts/rehearsal/2026-11-18-development-baseline.json';
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

it.each([
 ['release 1 indexes', ['0038_read_path_indexes.sql','0039_native_payroll_setup_records.sql']],
 ['Development through 0078', ['0079_timecard_missing_shift_disposition.sql','0080_time_off_decline_note.sql']],
 ['current Development through 0071', ['0072_delegated_time_off.sql','0073_pto_timecard_accrual.sql','0074_puerto_rico_pto.sql','0075_manager_open_shifts.sql','0076_location_addresses.sql']],
 ['published 30-day Development through 0069', ['0070_scheduling_authority_pto.sql','0071_user_language_preferences.sql','0072_delegated_time_off.sql','0073_pto_timecard_accrual.sql','0074_puerto_rico_pto.sql','0075_manager_open_shifts.sql','0076_location_addresses.sql']],
 ['Development through 0067', ['0068_employee_employment_dates.sql','0069_clocker_early_grace.sql','0070_scheduling_authority_pto.sql','0071_user_language_preferences.sql','0072_delegated_time_off.sql','0073_pto_timecard_accrual.sql','0074_puerto_rico_pto.sql','0075_manager_open_shifts.sql','0076_location_addresses.sql']],
 ['workforce installed before the 30-day work', ['0068_employee_employment_dates.sql','0069_clocker_early_grace.sql','0072_delegated_time_off.sql','0073_pto_timecard_accrual.sql','0074_puerto_rico_pto.sql','0075_manager_open_shifts.sql','0076_location_addresses.sql']],
] as const)('upgrades %s by exact filename, preserves rows and keeps setup records immutable',async(_label,additions)=>{
 const database=await createDisposableFoundationDatabase({mode:'empty'}),client=new Client({connectionString:database.connectionString});
 try{
  await client.connect();
  const legacy=BASE_MIGRATIONS.filter(file=>!additions.some(missing=>missing===file));
  for(const file of legacy)await client.query(await readFile('db/migrations/'+file,'utf8'));
  await client.query("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('R1-OWNER','Fictional','Upgrade','2025550141','OWNER','loc-1')");
  for(const file of FINAL_MIGRATIONS)await client.query(await readFile('db/migrations/'+file,'utf8'));
  const before=(await client.query('SELECT id,name FROM workspaces ORDER BY id')).rows;
  const applied=[...legacy,...FINAL_MIGRATIONS];const missing=missingMigrationFiles([...BASE_MIGRATIONS,...FINAL_MIGRATIONS],applied);expect(missing).toEqual(additions);
  for(const file of missing){await client.query(await readFile('db/migrations/'+file,'utf8'));applied.push(file as typeof applied[number]);}
  expect(missingMigrationFiles([...BASE_MIGRATIONS,...FINAL_MIGRATIONS],applied)).toEqual([]);
  expect((await client.query("SELECT to_regclass('schedule_revision_shifts_employee_date_idx')::text AS idx")).rows)
    .toEqual([{idx:'schedule_revision_shifts_employee_date_idx'}]);
  expect((await client.query('SELECT id,name FROM workspaces ORDER BY id')).rows).toEqual(before);
  expect((await client.query("SELECT address FROM locations WHERE id='loc-1'")).rows).toEqual([{address:null}]);
  expect((await client.query("SELECT active,hire_date,termination_date,birth_date FROM employees WHERE id='R1-OWNER'")).rows).toEqual([{active:true,hire_date:null,termination_date:null,birth_date:null}]);
  expect((await client.query("SELECT count(*)::int AS count FROM clocker_schedule_match_policy")).rows).toEqual([{count:0}]);
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

it('upgrades the recorded Development schema and restores both its rollback backup and the final schema', async()=>{
 const database=await createDisposableFoundationDatabase({mode:'empty'}),client=new Client({connectionString:database.connectionString});
 const directory=await mkdtemp(join(tmpdir(),'nevora-schema-restore-'));
 let sourceDisposed=false;
 const tool=(name:string,args:string[])=>{
  const bin=process.env.NEVORA_TEST_PG_BIN;if(!bin)throw Error('Owned PostgreSQL binaries required');
  const result=spawnSync(join(bin,name),args,{encoding:'utf8',timeout:20000});
  if(result.error||result.status!==0)throw Error(`Owned ${name} failed: ${result.error?.message??result.stderr}`);
 };
 const state=async(c:Client)=>({
  employees:(await c.query("SELECT id,first_name,active FROM employees WHERE id='R1-RESTORE'")).rows,
  ledger:(await c.query('SELECT revision,payload FROM native_payroll_setup_records ORDER BY revision')).rows,
  operations:(await c.query('SELECT request_id,command_hash,state,receipt FROM owner_advisor_business_operations ORDER BY request_id')).rows,
 });
 const restore=async(file:string)=>{
  const target=await createDisposableFoundationDatabase({mode:'empty'});
  const restored=new Client({connectionString:target.connectionString});
  try{tool('pg_restore',['--exit-on-error','--no-owner','--dbname',target.connectionString,file]);await restored.connect();return {restored,target};}
  catch(error){await restored.end();await target.dispose();throw error;}
 };
 try{
  await client.connect();
  expect(baseline.sourceSha).toBe('22107a24272f2347bbb59a3da1f54319632772a5');
  expect(BASE_MIGRATIONS.slice(0,baseline.base.length)).toEqual(baseline.base.map(f=>f.name));
  expect(FINAL_MIGRATIONS).toEqual(baseline.postCompany.map(f=>f.name));
  for(const file of [...baseline.base,...baseline.postCompany])expect(createHash('sha256').update(await readFile('db/migrations/'+file.name)).digest('hex'),file.name).toBe(file.sha256);
  for(const file of baseline.base)await client.query(await readFile('db/migrations/'+file.name,'utf8'));
  await client.query("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('R1-RESTORE','Fictional','Restore','2025550198','OWNER','loc-1')");
  for(const file of baseline.postCompany)await client.query(await readFile('db/migrations/'+file.name,'utf8'));
  await client.query("INSERT INTO native_payroll_setup_records(workspace_id,kind,subject_id,revision,operation_id,actor_employee_id,facts_sha256,payload) VALUES('workspace-fuel','COMPANY_DEFAULTS','COMPANY',1,$1,'R1-RESTORE',repeat('a',64),$2)",[randomUUID(),JSON.stringify({factsSha256:'a'.repeat(64),revision:1,kind:'COMPANY_DEFAULTS',subjectId:'COMPANY'})]);
  const operationId=randomUUID();
  await client.query("INSERT INTO owner_advisor_business_operations(workspace_id,owner_id,request_id,command_kind,command_hash,state,receipt) VALUES('workspace-fuel','R1-RESTORE',$1,'stage_source_version',repeat('b',64),'completed',$2)",[operationId,JSON.stringify({operationId,action:'stage_source_version',revision:1})]);
  const before=await state(client),oldBackup=join(directory,'development.dump');
  tool('pg_dump',['--format=custom','--no-owner','--file',oldBackup,'--dbname',database.connectionString]);
  const additions=BASE_MIGRATIONS.slice(baseline.base.length);
  expect(additions).toEqual([
   '0068_employee_employment_dates.sql','0069_clocker_early_grace.sql',
   '0070_scheduling_authority_pto.sql','0071_user_language_preferences.sql',
   '0072_delegated_time_off.sql','0073_pto_timecard_accrual.sql',
   '0074_puerto_rico_pto.sql','0075_manager_open_shifts.sql','0076_location_addresses.sql',
   '0077_clocker_face_verification.sql','0078_clocker_picker.sql','0079_timecard_missing_shift_disposition.sql',
  '0080_time_off_decline_note.sql',
  ]);
  for(const file of additions)await client.query(await readFile('db/migrations/'+file,'utf8'));
  expect(await state(client)).toEqual(before);
  expect((await client.query("SELECT hire_date,termination_date,birth_date FROM employees WHERE id='R1-RESTORE'")).rows).toEqual([{hire_date:null,termination_date:null,birth_date:null}]);
  expect((await client.query('SELECT count(*)::int n FROM clocker_schedule_match_policy')).rows).toEqual([{n:0}]);
  await client.query("UPDATE employees SET hire_date='2016-01-01',birth_date='1990-01-01' WHERE id='R1-RESTORE'");
  await client.query("INSERT INTO clocker_schedule_match_policy(workspace_id,version,early_clock_in_grace_minutes,updated_by) VALUES('workspace-fuel',1,10,'R1-RESTORE')");
  await client.query("INSERT INTO user_language_preferences(employee_id,language) VALUES('R1-RESTORE','es')");
  await client.query("INSERT INTO workforce_permission_revisions(workspace_id,employee_id,location_id,permission,revision,role_generation,granted,actor_employee_id) VALUES('workspace-fuel','R1-RESTORE','loc-1','PUBLISH_SCHEDULE',1,1,true,'R1-RESTORE')");
  const finalBackup=join(directory,'final.dump');tool('pg_dump',['--format=custom','--no-owner','--file',finalBackup,'--dbname',database.connectionString]);
  await client.end();await database.dispose();sourceDisposed=true;
  const {restored:old,target:oldTarget}=await restore(oldBackup);
  try{
   expect(await state(old)).toEqual(before);
   expect((await old.query("SELECT to_regclass('clocker_schedule_match_policy') AS policy")).rows).toEqual([{policy:null}]);
   expect((await old.query("SELECT to_regclass('schedule_revision_shifts_employee_date_idx') AS idx")).rows).toEqual([{idx:null}]);
  }finally{await old.end();await oldTarget.dispose();}
  const {restored:final,target:finalTarget}=await restore(finalBackup);
  try{
   expect(await state(final)).toEqual(before);
   expect((await final.query("SELECT to_regclass('schedule_revision_shifts_employee_date_idx')::text AS idx")).rows)
     .toEqual([{idx:'schedule_revision_shifts_employee_date_idx'}]);
   expect((await final.query("SELECT language FROM user_language_preferences WHERE employee_id='R1-RESTORE'")).rows).toEqual([{language:'es'}]);
   expect((await final.query("SELECT permission,revision,granted FROM workforce_permission_revisions WHERE workspace_id='workspace-fuel' AND employee_id='R1-RESTORE' AND location_id='loc-1'")).rows).toEqual([{permission:'PUBLISH_SCHEDULE',revision:1,granted:true}]);
   expect((await final.query("SELECT hire_date::text,birth_date::text FROM employees WHERE id='R1-RESTORE'")).rows).toEqual([{hire_date:'2016-01-01',birth_date:'1990-01-01'}]);
   expect((await final.query('SELECT version,previous_grace_minutes,early_clock_in_grace_minutes FROM clocker_schedule_match_policy_revisions')).rows).toEqual([{version:1,previous_grace_minutes:0,early_clock_in_grace_minutes:10}]);
   await expect(final.query('DELETE FROM native_payroll_setup_records')).rejects.toThrow('immutable ledger');
   await expect(final.query('DELETE FROM owner_advisor_business_operations')).rejects.toThrow('advisor_business_immutable');
   await expect(final.query('DELETE FROM clocker_schedule_match_policy_revisions')).rejects.toThrow('append_only');
  }finally{await final.end();await finalTarget.dispose();}
 }finally{
  try{if(!sourceDisposed){await client.end();await database.dispose();}}finally{await rm(directory,{recursive:true,force:true});}
 }
});
