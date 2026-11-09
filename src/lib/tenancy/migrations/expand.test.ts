import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getOwnershipRegistry, OWNERSHIP_SOURCE, verifyOwnershipSource } from './ownership';
import { lexSql } from '../inventory/sql-lexer';

const sql = readFileSync(resolve('db/migrations/0026_tenant_ownership_expand.sql'), 'utf8');
const registry = getOwnershipRegistry();
const body = () => {
 const journal = lexSql(sql);
 expect(journal.diagnostics).toEqual([]);
 return journal.parts.filter(p => p.kind === 'statement' && p.leadingKeyword !== 'BEGIN' && p.leadingKeyword !== 'COMMIT').map(p => p.text).join('\n');
};

describe('F10 ownership expand source contract', () => {
 it('retains the exact original 25 migration bytes', () => {
  expect(verifyOwnershipSource(OWNERSHIP_SOURCE.map(s => ({path:s.path,text:readFileSync(resolve(s.path),'utf8')})))).toEqual([]);
 });
 it('declares both exact typed historical sidecars without generic polymorphic ownership', () => {
  for (const t of registry.tables.filter(t => t.sidecar)) expect(sql).toContain('CREATE TABLE public.' + t.sidecar);
  expect(sql).not.toMatch(/record_key|record_kind/);
 });
 it('carries a source-bound catalog precondition and unverified legacy-write protocol', () => {
  expect(body()).toContain('f10_expand_source_catalog_drift');
  expect(sql).toContain(registry.digest);
  expect(sql).toContain('EXPANDED_LEGACY');
  expect(sql).toContain('FENCED');
  expect(sql).toContain('capture_manifest_sha256');
 });
 it('keeps the explanatory header as real comment lines', () => {
  const header=sql.slice(0,sql.indexOf('BEGIN;'));
  expect(header).not.toContain('\\n');
 });
 it('does not cut over, infer a tenant, modify source data, disable guards or enable RLS', () => {
  const statements=lexSql(sql).parts.filter(p=>p.kind==='statement');
  expect(statements.filter(p=>['UPDATE','DELETE','TRUNCATE','DROP'].includes(p.leadingKeyword ?? ''))).toEqual([]);
  expect(sql).not.toMatch(/ENABLE ROW LEVEL SECURITY|FORCE ROW LEVEL SECURITY|DISABLE TRIGGER|session_replication_role|DEFAULT\s+'workspace-fuel'/i);
 });
});

// Explicitly supplied invocation lease only. This suite never creates a cluster,
// reads application connection strings, connects to a default port, or runs in
// the default unit suite without the separately owned local fixture.
const leasePath = process.env.F_EXPAND_OWNED_LEASE;
describe.skipIf(!leasePath)('F10 owned PostgreSQL expand behavior', () => {
 let client: Client;
 let admin: Client;
 let database: {name:string;oid:number;marker:string};
 let before: Record<string, unknown>;
 const originals = registry.tables.map(t=>t.table);
 const ident = (s:string) => '"' + s.replace(/"/g,'""') + '"';
 async function snapshot() {
  const data: Record<string,unknown> = {};
  for (const t of registry.tables) {
   const columns=t.columns.map(c=>ident(c.name)).join(',');
   data[t.table]=(await client.query('SELECT to_jsonb(s) AS row FROM (SELECT '+columns+' FROM public.'+ident(t.table)+') s ORDER BY to_jsonb(s)::text COLLATE "C"')).rows;
  }
  const query=readFileSync(join(process.env.F_EXPAND_RUN_DIR!, 'catalog-queries.json'),'utf8');
  const catalog: Record<string,unknown>={};
  for(const[k,q]of Object.entries(JSON.parse(query) as Record<string,string>))catalog[k]=(await client.query(q)).rows;
  return {data,catalog};
 }
 async function transaction(operation:()=>Promise<void>) {
  await client.query('BEGIN');
  try { await operation(); } finally { await client.query('ROLLBACK'); }
 }
 async function rejection(text:string,values:unknown[],code:string) {
  let caught: unknown;
  try {await client.query(text,values);}catch(error){caught=error;}
  expect((caught as {code?:string})?.code).toBe(code);
 }
 beforeAll(async()=>{
  expect(process.env.DATABASE_URL).toBeUndefined();expect(process.env.FUEL_TEST_DATABASE_URL).toBeUndefined();
  expect(process.env.F_EXPAND_RUN_DIR).toBeTruthy();
  const lease=JSON.parse(readFileSync(leasePath!,'utf8'));
  expect(lease.closed).toBe(false);
  expect(realpathSync(lease.data)).toBe(join(realpathSync(lease.root),'data'));
  const pid=readFileSync(join(lease.data,'postmaster.pid'),'utf8').split('\n');
  expect(Number(pid[0])).toBe(lease.pid);expect(pid[2]).toBe(lease.pidStart);expect(Number(pid[3])).toBe(lease.port);expect(realpathSync(pid[1])).toBe(lease.data);
  client=new Client({host:'127.0.0.1',port:lease.port,user:lease.user,password:readFileSync(lease.credentialFile,'utf8'),database:lease.database,connectionTimeoutMillis:3000,statement_timeout:15000});
  await client.connect();
  const a=(await client.query("SELECT current_setting('data_directory') data,current_setting('server_version') version,current_setting('unix_socket_directories') sockets,(SELECT system_identifier::text FROM pg_control_system()) system_identifier,(SELECT oid FROM pg_database WHERE datname=current_database()) oid,shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database') marker")).rows[0];
  expect(realpathSync(a.data)).toBe(lease.data);expect(a.system_identifier).toBe(lease.systemIdentifier);expect(a.oid).toBe(lease.databaseOid);expect(a.marker).toBe(lease.marker);expect(a.sockets).toBe('');expect(a.version).toMatch(/^18\./);
  admin=client;
  const name=lease.database+'_run_'+randomBytes(4).toString('hex'),marker=lease.marker+':run:'+name;
  expect((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rowCount).toBe(0);
  await admin.query('CREATE DATABASE '+ident(name));
  const oid=(await admin.query('SELECT oid FROM pg_database WHERE datname=$1',[name])).rows[0].oid;
  database={name,oid,marker};
  await admin.query('COMMENT ON DATABASE '+ident(name)+" IS '"+marker+"'");
  writeFileSync(join(process.env.F_EXPAND_RUN_DIR!,'database-custody.json'),JSON.stringify({clusterSystemIdentifier:lease.systemIdentifier,...database,createdByThisInvocation:true,closed:false},null,2),{flag:'wx'});
  client=new Client({host:'127.0.0.1',port:lease.port,user:lease.user,password:readFileSync(lease.credentialFile,'utf8'),database:name,connectionTimeoutMillis:3000,statement_timeout:15000});
  await client.connect();
  for(const source of OWNERSHIP_SOURCE)await client.query(readFileSync(resolve(source.path),'utf8'));
  // Fixture insertion only into this invocation's newly created cluster.
  await client.query("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,active) VALUES('f10-legacy-owner','Fictional','Owner','000','OWNER','loc-1',false) ON CONFLICT DO NOTHING");
  await client.query("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,source_id,created_by) VALUES('f10-legacy-revision','2026-10-05',1,'MANAGER_MUTATION','deleted-source','f10-legacy-owner') ON CONFLICT DO NOTHING");
  await client.query("INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,notes) VALUES('f10-legacy-snapshot','f10-legacy-revision','deleted-source','deleted-schedule','loc-1','f10-legacy-owner','2026-10-06','08:00','09:00','Historical literal \\n Ω') ON CONFLICT DO NOTHING");
  await client.query("INSERT INTO clocker_pin_events(id,employee_id,actor_employee_id,pin_version) VALUES('f10-legacy-pin','f10-legacy-owner','f10-legacy-owner',1) ON CONFLICT DO NOTHING");
  await client.query("INSERT INTO password_recovery_limits(scope,bucket,attempts) VALUES('global',1,7),($1,2,9) ON CONFLICT DO NOTHING",['c'.repeat(64)]);
  before=await snapshot();
  writeFileSync(join(process.env.F_EXPAND_RUN_DIR!,'before.json'),JSON.stringify(before,null,2),{flag:'wx'});
  try { await client.query(sql); } catch(error) { await client.query('ROLLBACK'); throw error; }
 },30000);
 afterAll(async()=>{
  if(!client)return;
  await client.query('ROLLBACK');
  const after=await snapshot();
  writeFileSync(join(process.env.F_EXPAND_RUN_DIR!,'after.json'),JSON.stringify(after,null,2),{flag:'wx'});
  writeFileSync(join(process.env.F_EXPAND_RUN_DIR!,'sql-capture.json'),JSON.stringify({sha256:createHash('sha256').update(sql).digest('hex'),registryDigest:registry.digest,transport:'owned loopback pg.Client',claims:'LOCAL_EXPAND_ONLY_NOT_F10_VERIFIED'},null,2),{flag:'wx'});
  await client.end();
  if(admin&&database){
   const current=(await admin.query("SELECT oid,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=$1",[database.name])).rows[0];
   expect(current).toEqual({oid:database.oid,marker:database.marker});
   await admin.query('DROP DATABASE '+ident(database.name));
   writeFileSync(join(process.env.F_EXPAND_RUN_DIR!,'database-closed.json'),JSON.stringify({...database,closed:true},null,2),{flag:'wx'});
   await admin.end();
  }
 });
 it('preserves every original row value, column, function, view, index, constraint and trigger',async()=>{
  const after=await snapshot();
  expect(after.data).toEqual(before.data);
  const b=before.catalog as Record<string,unknown[]>,a=after.catalog as Record<string,unknown[]>;
  for(const k of ['columns','constraints','indexes','triggers','functions','views'])for(const original of b[k])expect(a[k]).toContainEqual(original);
 });
 it('adds only nullable, default-free direct ownership and tenant identity keys',async()=>{
  for(const t of registry.tables.filter(t=>t.storage==='DIRECT_IMMUTABLE'&&t.anchor.kind!=='ROOT')){
   const c=(await client.query("SELECT a.attnotnull,pg_get_expr(d.adbin,d.adrelid) default_value FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=$1::regclass AND a.attname='workspace_id'",['public.'+t.table])).rows[0];
   expect(c, t.table).toBeTruthy();
   if(!t.columns.some(c=>c.name==='workspace_id')){expect(c.attnotnull).toBe(false);expect(c.default_value).toBeNull();}
   const expected=['workspace_id',...t.primaryKey.filter(k=>k!=='workspace_id')];
   const keys=(await client.query("SELECT ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(n,o) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.n ORDER BY k.o) cols FROM pg_constraint c WHERE c.conrelid=$1::regclass AND c.contype IN('p','u')",['public.'+t.table])).rows;
   expect(keys.map(k=>k.cols),t.table).toContainEqual(expected);
  }
  expect((await client.query('SELECT workspace_id FROM employees WHERE id=$1',['f10-legacy-owner'])).rows).toEqual([{workspace_id:null}]);
  expect((await client.query('SELECT workspace_id FROM calendar_clock')).rows).toEqual([{workspace_id:null}]);
 });
 it('does not claim captured ownership, enable RLS or alter global recovery control',async()=>{
  const state=(await client.query('SELECT phase,capture_manifest_sha256 FROM nevora_tenancy.expansion_protocol')).rows;
  expect(state).toEqual([{phase:'EXPANDED_LEGACY',capture_manifest_sha256:null}]);
  expect((await client.query("SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','nevora_tenancy') AND (c.relrowsecurity OR c.relforcerowsecurity)")).rows[0].n).toBe(0);
  expect((await client.query("SELECT 1 FROM pg_attribute WHERE attrelid='password_recovery_limits'::regclass AND attname='workspace_id'")).rowCount).toBe(0);
  for(const t of registry.tables.filter(t=>t.sidecar))expect((await client.query('SELECT * FROM public.'+ident(t.sidecar!))).rowCount).toBe(0);
 });
 it('permits legacy inserts but rejects an unproven owner fill',async()=>transaction(async()=>{
  await client.query("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('f10-new-legacy','Fictional','Legacy','000','EMPLOYEE','loc-1')");
  expect((await client.query('SELECT workspace_id FROM employees WHERE id=$1',['f10-new-legacy'])).rows).toEqual([{workspace_id:null}]);
  await rejection("UPDATE employees SET workspace_id='workspace-fuel' WHERE id='f10-new-legacy'",[],'23514');
 }));
 it('prepares exact composite FK specifications while preserving legacy writers and singleton fence',async()=>transaction(async()=>{
  const spec=(await client.query("SELECT source_columns::text[],target_columns::text[],installation_state FROM nevora_tenancy.composite_fk_specification WHERE source_table='availability_windows' AND target_table='employees'")).rows[0];
  expect(spec).toEqual({source_columns:['workspace_id','employee_id'],target_columns:['workspace_id','id'],installation_state:'NOT_INSTALLED'});
  await client.query("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('f10-legacy-window','f10-legacy-owner',1,'08:00','09:00')");
  await rejection("INSERT INTO workspaces(id,name,time_zone) VALUES('f10-other','Other Fictional','UTC')",[],'23505');
 }));
 it('makes assigned direct ownership immutable while leaving primary location as existing business data',async()=>transaction(async()=>{
  await client.query("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,workspace_id) VALUES('f10-assigned','Fictional','Assigned','000','EMPLOYEE','loc-1','workspace-fuel')");
  await client.query("UPDATE employees SET primary_location_id='loc-2' WHERE id='f10-assigned'");
  await client.query('SAVEPOINT owner_clear');
  await rejection("UPDATE employees SET workspace_id=NULL WHERE id='f10-assigned'",[],'23514');
  await client.query('ROLLBACK TO SAVEPOINT owner_clear');
  await rejection("UPDATE employees SET workspace_id='different-workspace' WHERE id='f10-assigned'",[],'23514');
 }));
 it('supports sidecar-before-source with deferred exact source identity and preserves historical literals',async()=>transaction(async()=>{
  await client.query("INSERT INTO schedule_publication_revision_shifts_tenant_ownership(id,workspace_id,revision_id,source_shift_id,schedule_id,location_id,employee_id,position_id,source_checksum_sha256,capture_manifest_sha256) VALUES('f10-new-snapshot','workspace-fuel','f10-legacy-revision','retired-shift','retired-schedule','retired-location','retired-employee',NULL,$1,$2)",['a'.repeat(64),'b'.repeat(64)]);
  await client.query("INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time) VALUES('f10-new-snapshot','f10-legacy-revision','retired-shift','retired-schedule','retired-location','retired-employee','2026-10-06','08:00','09:00')");
  await client.query('SET CONSTRAINTS ALL IMMEDIATE');
  const row=(await client.query("SELECT source_shift_id,employee_id FROM schedule_publication_revision_shifts_tenant_ownership WHERE id='f10-new-snapshot'")).rows[0];expect(row).toEqual({source_shift_id:'retired-shift',employee_id:'retired-employee'});
 }));
 it('rejects sidecar mirror mismatch atomically and retains append-only PIN history',async()=>transaction(async()=>{
  await client.query("INSERT INTO clocker_pin_events_tenant_ownership(id,workspace_id,employee_id,actor_employee_id,source_checksum_sha256,capture_manifest_sha256) VALUES('f10-legacy-pin','workspace-fuel','mismatch','f10-legacy-owner',$1,$2)",['a'.repeat(64),'b'.repeat(64)]);
  await rejection('SET CONSTRAINTS ALL IMMEDIATE',[],'23514');
 }));
 it('rejects later sidecar reassignment and original append-only modification',async()=>transaction(async()=>{
  await client.query("INSERT INTO clocker_pin_events_tenant_ownership(id,workspace_id,employee_id,actor_employee_id,source_checksum_sha256,capture_manifest_sha256) VALUES('f10-legacy-pin','workspace-fuel','f10-legacy-owner','f10-legacy-owner',$1,$2)",['a'.repeat(64),'b'.repeat(64)]);
  await client.query('SET CONSTRAINTS ALL IMMEDIATE');
  await rejection("UPDATE clocker_pin_events_tenant_ownership SET workspace_id='other' WHERE id='f10-legacy-pin'",[],'23514');
 }));
 it('fences every original table without request-GUC or default-tenant authority',async()=>{
  for(const table of originals){
   await transaction(async()=>{
    await client.query("UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED',capture_manifest_sha256=$1",['d'.repeat(64)]);
    // Use a DELETE matching the sentinel employee when possible. Statement-level
    // fence also rejects empty statements; append-only row guards need no bypass.
    await rejection('DELETE FROM public.'+ident(table)+' WHERE false',[],'55000');
   });
  }
 });
 it('preserves recovery and credential digest global uniqueness',async()=>transaction(async()=>{
  await rejection("INSERT INTO password_recovery_limits(scope,bucket,attempts) VALUES('global',1,999)",[],'23505');
 }));
 it('allows only a bound fenced operator to fill NULL metadata without changing original values',async()=>transaction(async()=>{
  const original=(await client.query("SELECT to_jsonb(e)-'workspace_id' original FROM employees e WHERE id='f10-legacy-owner'")).rows[0].original;
  await client.query("UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED',backfill_actor=session_user,capture_manifest_sha256=$1",['d'.repeat(64)]);
  await client.query("UPDATE employees SET workspace_id='workspace-fuel' WHERE id='f10-legacy-owner'");
  const changed=(await client.query("SELECT workspace_id,to_jsonb(e)-'workspace_id' original FROM employees e WHERE id='f10-legacy-owner'")).rows[0];
  expect(changed).toEqual({workspace_id:'workspace-fuel',original});
 }));
 it('rejects original content rewrites even by the explicitly bound backfill actor',async()=>transaction(async()=>{
  await client.query("UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED',backfill_actor=session_user,capture_manifest_sha256=$1",['d'.repeat(64)]);
  await rejection("UPDATE employees SET phone='rewritten' WHERE id='f10-legacy-owner'",[],'23514');
 }));
 it('rejects source TRUNCATE while fenced even for the bound operator',async()=>transaction(async()=>{
  await client.query("UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED',backfill_actor=session_user,capture_manifest_sha256=$1",['d'.repeat(64)]);
  await rejection('TRUNCATE password_recovery_limits',[],'55000');
 }));
 it('rejects an orphan sidecar at the deferred transaction boundary',async()=>transaction(async()=>{
  await client.query("INSERT INTO clocker_pin_events_tenant_ownership(id,workspace_id,employee_id,actor_employee_id,source_checksum_sha256,capture_manifest_sha256) VALUES('absent-source','workspace-fuel','f10-legacy-owner','f10-legacy-owner',$1,$2)",['a'.repeat(64),'b'.repeat(64)]);
  await rejection('SET CONSTRAINTS ALL IMMEDIATE',[],'23503');
 }));
 it('freezes every original historical literal once a typed sidecar exists',async()=>transaction(async()=>{
  await client.query("INSERT INTO schedule_publication_revision_shifts_tenant_ownership(id,workspace_id,revision_id,source_shift_id,schedule_id,location_id,employee_id,position_id,source_checksum_sha256,capture_manifest_sha256) SELECT id,'workspace-fuel',revision_id,source_shift_id,schedule_id,location_id,employee_id,position_id,$1,$2 FROM schedule_publication_revision_shifts WHERE id='f10-legacy-snapshot'",['a'.repeat(64),'b'.repeat(64)]);
  await client.query('SET CONSTRAINTS ALL IMMEDIATE');
  await rejection("UPDATE schedule_publication_revision_shifts SET notes='rewritten literal' WHERE id='f10-legacy-snapshot'",[],'23514');
 }));
 it('freezes parent identity for the globally keyed session without making primary location the owner',async()=>transaction(async()=>{
  await client.query("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('f10-another','Fictional','Another','000','EMPLOYEE','loc-1')");
  await client.query("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'f10-legacy-owner',clock_timestamp()+interval '1 hour')",['e'.repeat(64)]);
  await rejection("UPDATE employee_sessions SET employee_id='f10-another' WHERE token_hash=$1",['e'.repeat(64)],'23514');
 }));
 it('keeps protected protocol inaccessible to an ordinary role and ignores forged request context',async()=>{
  const lease=JSON.parse(readFileSync(leasePath!,'utf8')),role='f_expand_writer_'+randomBytes(4).toString('hex'),password=randomBytes(32).toString('hex');
  await client.query('CREATE ROLE '+ident(role)+" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '"+password+"'");
  let writer:Client|undefined;
  try{
   await client.query('GRANT CONNECT ON DATABASE '+ident(database.name)+' TO '+ident(role));
   await client.query('GRANT USAGE ON SCHEMA public TO '+ident(role));
   await client.query('GRANT SELECT,INSERT,UPDATE,DELETE ON employees TO '+ident(role));
   writer=new Client({host:'127.0.0.1',port:lease.port,user:role,password,database:database.name,connectionTimeoutMillis:3000});await writer.connect();
   expect((await writer.query('SELECT session_user,current_user')).rows[0]).toEqual({session_user:role,current_user:role});
   await writer.query("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('f10-role-legacy','Fictional','Writer','000','EMPLOYEE','loc-1')");
   await client.query("UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED',backfill_actor=session_user,capture_manifest_sha256=$1",['f'.repeat(64)]);
   await writer.query("SELECT set_config('nevora.workspace_id','workspace-fuel',false),set_config('nevora.backfill_actor',$1,false)",[lease.user]);
   let error:unknown;try{await writer.query('DELETE FROM employees WHERE false');}catch(e){error=e;}expect((error as {code?:string})?.code).toBe('55000');
   error=undefined;try{await writer.query('SELECT * FROM nevora_tenancy.expansion_protocol');}catch(e){error=e;}expect((error as {code?:string})?.code).toBe('42501');
  }finally{
   await writer?.end();
   await client.query("UPDATE nevora_tenancy.expansion_protocol SET phase='EXPANDED_LEGACY',backfill_actor=NULL,capture_manifest_sha256=NULL");
   await client.query("DELETE FROM employees WHERE id='f10-role-legacy'");
   await client.query('DROP OWNED BY '+ident(role));await client.query('DROP ROLE '+ident(role));
  }
 });
 it('serializes a fence transition after an already-open legacy writer transaction',async()=>{
  const lease=JSON.parse(readFileSync(leasePath!,'utf8'));
  const connection={host:'127.0.0.1',port:lease.port,user:lease.user,password:readFileSync(lease.credentialFile,'utf8'),database:database.name,connectionTimeoutMillis:3000,statement_timeout:3000};
  const writer=new Client(connection),gate=new Client(connection);
  let transition:Promise<unknown>|undefined;
  try{
   await writer.connect();await gate.connect();
   const pid=(await gate.query('SELECT pg_backend_pid() pid')).rows[0].pid;
   await writer.query('BEGIN');await writer.query('DELETE FROM employees WHERE false');
   let finished=false;
   transition=gate.query("UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED',capture_manifest_sha256=$1",['d'.repeat(64)]).then(result=>{finished=true;return result;});
   let waiting=false;const deadline=Date.now()+1500;
   while(Date.now()<deadline&&!waiting){
    waiting=(await client.query("SELECT wait_event_type='Lock' waiting FROM pg_stat_activity WHERE pid=$1",[pid])).rows[0]?.waiting===true;
    if(!waiting)await new Promise(r=>setTimeout(r,5));
   }
   expect(waiting).toBe(true);expect(finished).toBe(false);
   await writer.query('COMMIT');await transition;
   expect((await client.query('SELECT phase FROM nevora_tenancy.expansion_protocol')).rows).toEqual([{phase:'FENCED'}]);
   await rejection('DELETE FROM employees WHERE false',[],'55000');
  }finally{
   await writer.query('ROLLBACK').catch(()=>{});await transition?.catch(()=>{});await writer.end();await gate.end();
   await client.query("UPDATE nevora_tenancy.expansion_protocol SET phase='EXPANDED_LEGACY',backfill_actor=NULL,capture_manifest_sha256=NULL");
  }
 },5000);
 it('normalizes a PG17-equivalent projection on PG18 without claiming an actual PG17 run',async()=>{
  const lease=JSON.parse(readFileSync(leasePath!,'utf8'));
  const name=lease.database+'_projection',marker=lease.marker+':PG17_PROJECTION_ON_PG18';
  expect((await client.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rowCount).toBe(0);
  await client.query('CREATE DATABASE '+ident(name));
  const oid=(await client.query('SELECT oid FROM pg_database WHERE datname=$1',[name])).rows[0].oid;
  await client.query('COMMENT ON DATABASE '+ident(name)+" IS '"+marker+"'");
  const isolated=new Client({host:'127.0.0.1',port:lease.port,user:lease.user,password:readFileSync(lease.credentialFile,'utf8'),database:name});
  try{
   await isolated.connect();for(const source of OWNERSHIP_SOURCE)await isolated.query(readFileSync(resolve(source.path),'utf8'));
   const line=sql.split('\n').find(line=>line.includes("f10_expand_source_catalog_drift:constraints"));
   const match=/FROM \((SELECT.*)\) actual\) IS DISTINCT FROM '([a-f0-9]{64})'/.exec(line!);
   expect(match).toBeTruthy();
   const production=(await isolated.query(match![1])).rows;
   // Independent documented PG17 relation projection: n is absent from this
   // catalog; ENFORCED is mandatory and has no conenforced field in PG17.
   // pg_get_constraintdef text is still from this PG18 backend, explicitly not
   // evidence about PG17 rendering or transport compatibility.
   const projection=(await isolated.query("SELECT c.relname table_name,p.conname name,p.contype type,pg_get_constraintdef(p.oid,true) definition,p.convalidated validated,p.condeferrable deferrable,p.condeferred deferred,true enforced FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND p.contype<>'n' ORDER BY c.relname,p.conname")).rows;
   const representation=(await isolated.query("SELECT count(*)::int total,count(*) FILTER(WHERE p.contype='n')::int relation_not_null FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'")).rows[0];
   expect(representation).toEqual({total:896,relation_not_null:455});
   expect(projection).toHaveLength(441);
   expect(production).toEqual(projection);
   const pg17BranchQuery=match![1].replaceAll("current_setting('server_version_num')::int",'170000');
   const pg17Branch=(await isolated.query(pg17BranchQuery)).rows;
   expect(pg17Branch).toEqual(projection);
   const unknownBranch=(await isolated.query(match![1].replaceAll("current_setting('server_version_num')::int",'160000'))).rows;
   expect(unknownBranch.every(row=>row.enforced===null)).toBe(true);
   const normalizedHash=(await isolated.query("SELECT encode(sha256(convert_to($1::jsonb::text,'UTF8')),'hex') hash",[JSON.stringify(projection)])).rows[0].hash;
   expect(normalizedHash).toBe(match![2]);
   expect(production.every(row=>row.enforced===true)).toBe(true);
   const notNullLine=sql.split('\n').find(line=>line.includes("f10_expand_source_catalog_drift:not_null_state"));
   const notNullMatch=/FROM \((SELECT.*)\) actual\) IS DISTINCT FROM '([a-f0-9]{64})'/.exec(notNullLine!);
   expect(notNullMatch).toBeTruthy();
   const actualNotNull=(await isolated.query(notNullMatch![1])).rows;
   const projectedNotNull=(await isolated.query("SELECT c.relname table_name,a.attname column_name,true validated,true enforced,false deferrable,false deferred FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull ORDER BY c.relname,a.attnum")).rows;
   expect(actualNotNull).toEqual(projectedNotNull);expect(actualNotNull).toHaveLength(455);
   expect((await isolated.query(notNullMatch![1].replaceAll("current_setting('server_version_num')::int",'170000'))).rows).toEqual(projectedNotNull);
   const unknownNotNull=(await isolated.query(notNullMatch![1].replaceAll("current_setting('server_version_num')::int",'160000'))).rows;
   expect(unknownNotNull.every(row=>row.validated===null&&row.enforced===null&&row.deferrable===null&&row.deferred===null)).toBe(true);
   const notNullHash=(await isolated.query("SELECT encode(sha256(convert_to($1::jsonb::text,'UTF8')),'hex') hash",[JSON.stringify(projectedNotNull)])).rows[0].hash;
   expect(notNullHash).toBe(notNullMatch![2]);
   writeFileSync(join(process.env.F_EXPAND_RUN_DIR!,'pg17-projection-on-pg18.json'),JSON.stringify({label:'PG17_EQUIVALENT_NORMALIZED_PROJECTION_ON_OWNED_PG18_NOT_ACTUAL_PG17',backend:lease.version,representation,normalizedConstraints:production,notNullState:actualNotNull,normalizedHash,notNullHash,limits:'PG17 pg_get_* rendering and actual Neon HTTP/runtime-role remain unverified'},null,2),{flag:'wx'});
  }finally{
   await isolated.query('ROLLBACK').catch(()=>{});await isolated.end();
   expect((await client.query("SELECT oid,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=$1",[name])).rows[0]).toEqual({oid,marker});
   await client.query('DROP DATABASE '+ident(name));
  }
 },30000);
 it('rejects schema drift and proves transaction rollback in a second owned database',async()=>{
  const lease=JSON.parse(readFileSync(leasePath!,'utf8'));
  const name=lease.database+'_rollback';
  await client.query('CREATE DATABASE '+ident(name));
  const db=(await client.query('SELECT oid FROM pg_database WHERE datname=$1',[name])).rows[0];
  const marker=lease.marker+':rollback';
  await client.query('COMMENT ON DATABASE '+ident(name)+" IS '"+marker+"'");
  const isolated=new Client({host:'127.0.0.1',port:lease.port,user:lease.user,password:readFileSync(lease.credentialFile,'utf8'),database:name});
  try{
   await isolated.connect();
   for(const s of OWNERSHIP_SOURCE)await isolated.query(readFileSync(resolve(s.path),'utf8'));
   await isolated.query('BEGIN');
   await isolated.query(body());
   expect((await isolated.query("SELECT to_regclass('nevora_tenancy.expansion_protocol') name")).rows[0].name).toBeTruthy();
   await isolated.query('ROLLBACK');
   expect((await isolated.query("SELECT to_regclass('nevora_tenancy.expansion_protocol') name")).rows[0].name).toBeNull();
   const cases=[
    {id:'EXTRA_COLUMN',group:'columns',sql:'ALTER TABLE employees ADD COLUMN unexpected_source_drift text'},
    {id:'WRONG_FUNCTION_BODY',group:'functions',sql:'CREATE OR REPLACE FUNCTION public.communication_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$'},
    {id:'RELAXED_CONSTRAINT',group:'constraints',sql:'ALTER TABLE employees DROP CONSTRAINT employees_role_check; ALTER TABLE employees ADD CONSTRAINT employees_role_check CHECK(true)'},
    {id:'DISABLED_APPEND_ONLY_TRIGGER',group:'triggers',sql:'ALTER TABLE clocker_pin_events DISABLE TRIGGER clocker_pin_event_append_only'},
    {id:'UNENFORCED_CHECK',group:'constraints',sql:"ALTER TABLE employees DROP CONSTRAINT employees_role_check; ALTER TABLE employees ADD CONSTRAINT employees_role_check CHECK(role IN('OWNER','MANAGER','LEAD','EMPLOYEE')) NOT ENFORCED"},
    {id:'UNVALIDATED_NOT_NULL_WITH_ATTNOTNULL_TRUE',group:'not_null_state',sql:'ALTER TABLE employees DROP CONSTRAINT employees_phone_not_null; ALTER TABLE employees ADD CONSTRAINT employees_phone_not_null NOT NULL phone NOT VALID'},
    {id:'NULLABILITY_RELAXED',group:'columns',sql:'ALTER TABLE employees ALTER COLUMN phone DROP NOT NULL'},
    {id:'RLS_OPERATIVE_STATE_CHANGED',group:'tables',sql:'ALTER TABLE employees ENABLE ROW LEVEL SECURITY'},

   ];
   const receipt:{id:string;group:string;sqlstate:string;rollbackPreserved:boolean}[]=[];
   for(const item of cases){
    await isolated.query('BEGIN');await isolated.query(item.sql);
    let caught:unknown;try{await isolated.query(body());}catch(error){caught=error;}
    expect((caught as {message?:string})?.message,item.id).toContain('f10_expand_source_catalog_drift:'+item.group);
    expect((caught as {code?:string})?.code,item.id).toBe('55000');
    await isolated.query('ROLLBACK');
    expect((await isolated.query("SELECT 1 FROM pg_attribute WHERE attrelid='employees'::regclass AND attname='unexpected_source_drift'")).rowCount).toBe(0);
    expect((await isolated.query("SELECT to_regclass('nevora_tenancy.expansion_protocol') name")).rows[0].name).toBeNull();
    // Reapplying all guards in a rolled-back transaction verifies that neither
    // the wrong declaration nor disabled append-only state escaped rollback.
    await isolated.query('BEGIN');await isolated.query(body());await isolated.query('ROLLBACK');
    receipt.push({id:item.id,group:item.group,sqlstate:'55000',rollbackPreserved:true});
   }
   writeFileSync(join(process.env.F_EXPAND_RUN_DIR!,'drift-rejection-receipt.json'),JSON.stringify(receipt,null,2),{flag:'wx'});
  }finally{
   await isolated.query('ROLLBACK').catch(()=>{});await isolated.end();
   const current=(await client.query("SELECT oid,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=$1",[name])).rows[0];
   expect(current).toEqual({oid:db.oid,marker});await client.query('DROP DATABASE '+ident(name));
  }
 },30000);
});
