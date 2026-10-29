import {it,expect} from 'vitest';
import {Client} from 'pg';
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
