import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Client } from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getOwnershipRegistry, OWNERSHIP_SOURCE, verifyOwnershipSource } from './ownership';
import { lexSql } from '../inventory/sql-lexer';

const sqlPath='db/migrations/0027_tenant_ownership_validate.sql';
const sql=readFileSync(resolve(sqlPath),'utf8');
const expand=readFileSync(resolve('db/migrations/0026_tenant_ownership_expand.sql'),'utf8');
const registry=getOwnershipRegistry();
const hash=(value:string)=>createHash('sha256').update(value,'utf8').digest('hex');
const quote=(value:string)=>'"'+value.replace(/"/g,'""')+'"';
const direct=registry.tables.filter(t=>t.storage==='DIRECT_IMMUTABLE'&&t.anchor.kind!=='ROOT');
const historical=registry.tables.filter(t=>t.sidecar);

describe('F10 validation source custody',()=>{
 it('uses the exact accepted 25 original migration sources',()=>{
  expect(verifyOwnershipSource(OWNERSHIP_SOURCE.map(s=>({path:s.path,text:readFileSync(resolve(s.path),'utf8')})))).toEqual([]);
 });
 it('journals the complete transactional migration with no lexical diagnostics',()=>{
  const journal=lexSql(sql);
  expect(journal.diagnostics).toEqual([]);
  const statements=journal.parts.filter(p=>p.kind==='statement');
  expect(statements[0].leadingKeyword).toBe('BEGIN');
  expect(statements[statements.length-1].leadingKeyword).toBe('COMMIT');
 });
});

// Explicit opt-in owned loopback lease. No default application connection,
// cluster start, provider access or inferred legacy-row ownership occurs here.
// Each case clones a CLOSED source-generated fictional database, checks/marks
// its new OID, runs the full original migration text and drops that exact DB.
const leasePath=process.env.F_VALIDATE_OWNED_LEASE;
describe.skipIf(!leasePath)('F10 owned PostgreSQL validation behavior',()=>{
 type Lease={closed:boolean;root:string;data:string;port:number;pid:number;pidStart:string;credentialFile:string;user:string;database:string;databaseOid:number;systemIdentifier:string;marker:string};
 type OwnedDb={name:string;oid:string;marker:string};
 let lease:Lease,admin:Client,client:Client,base:OwnedDb,db:OwnedDb|undefined;
 let runDir:string,sequence=0,clientOpen=false;
 let baseOriginalRows:Record<string,unknown>;
 const databases:Array<OwnedDb & {closed:boolean}>=[];
 const manualManifest=hash('FICTIONAL_OWNED_VALIDATION_METADATA_ONLY_NOT_CAPTURE_OR_BACKFILL_AUTHORITY');
 // Exact manually owned fictional fixture rows. Unknown/nonempty nullable
 // owner rows abort setup; nothing is mapped by table scan/default Fuel.
 const mappings=[
  {table:'location_staffing_settings',keys:{location_id:'loc-1'},workspace:'workspace-fuel'},
  {table:'location_staffing_settings',keys:{location_id:'loc-2'},workspace:'workspace-fuel'},
  {table:'calendar_clock',keys:{singleton:true},workspace:'workspace-fuel'},
  {table:'employees',keys:{id:'validate-owner'},workspace:'workspace-fuel'},
  {table:'availability_windows',keys:{id:'validate-window'},workspace:'workspace-fuel'},
  {table:'employee_positions',keys:{employee_id:'validate-owner',position_id:'validate-position'},workspace:'workspace-fuel'},
  {table:'schedule_publication_revisions',keys:{id:'validate-revision'},workspace:'workspace-fuel'},
 ];
 const connect=(name:string)=>new Client({host:'127.0.0.1',port:lease.port,user:lease.user,password:readFileSync(lease.credentialFile,'utf8'),database:name,connectionTimeoutMillis:3000,statement_timeout:15000});
 function save(name:string,value:unknown){writeFileSync(join(runDir,name+'.json'),JSON.stringify(value,null,2),{flag:'wx'});}
 async function createDb(template?:string):Promise<OwnedDb>{
  const name=lease.database+'_v_'+randomBytes(5).toString('hex'),marker=lease.marker+':validation:'+name;
  expect((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rowCount).toBe(0);
  await admin.query('CREATE DATABASE '+quote(name)+(template?' TEMPLATE '+quote(template):''));
  await admin.query('COMMENT ON DATABASE '+quote(name)+" IS '"+marker+"'");
  const oid=(await admin.query('SELECT oid::text oid FROM pg_database WHERE datname=$1',[name])).rows[0].oid;
  const owned={name,oid,marker};databases.push({...owned,closed:false});
  save('database-custody-'+name,{...owned,systemIdentifier:lease.systemIdentifier,createdByThisInvocation:true,closed:false,template:template??null});
  return owned;
 }
 async function closeDb(owned:OwnedDb){
  const current=(await admin.query("SELECT oid::text oid,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=$1",[owned.name])).rows[0];
  expect(current).toEqual({oid:owned.oid,marker:owned.marker});
  expect((await admin.query('SELECT count(*)::int n FROM pg_stat_activity WHERE datname=$1',[owned.name])).rows[0].n).toBe(0);
  await admin.query('DROP DATABASE '+quote(owned.name));
  expect((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[owned.name])).rowCount).toBe(0);
  databases.find(d=>d.name===owned.name)!.closed=true;
  save('database-closed-'+owned.name,{...owned,systemIdentifier:lease.systemIdentifier,closed:true,oidAndMarkerVerified:true,connectionCountBeforeDrop:0});
 }
 async function originalRows(){
  const rows:Record<string,unknown>={};
  for(const t of registry.tables){
   const projection=t.columns.map(c=>quote(c.name)).join(',');
   // Database serializes original columns to text; pg does not round JSON
   // numbers or create JS Dates before row/preservation comparisons.
   rows[t.table]=(await client.query('SELECT to_jsonb(s)::text AS row FROM (SELECT '+projection+' FROM public.'+quote(t.table)+') s ORDER BY to_jsonb(s)::text COLLATE "C"')).rows;
  }
  return rows;
 }
 async function catalog(){
  const queries={
   tables:"SELECT n.nspname schema,c.relname name,c.relrowsecurity rls,c.relforcerowsecurity force_rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','nevora_tenancy') AND c.relkind='r' ORDER BY 1,2",
   columns:"SELECT n.nspname schema,c.relname table_name,a.attname name,a.attnum ordinal,format_type(a.atttypid,a.atttypmod) type,a.attnotnull not_null,pg_get_expr(d.adbin,d.adrelid) default_value FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname IN('public','nevora_tenancy') AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped ORDER BY 1,2,ordinal",
   constraints:"SELECT n.nspname schema,c.relname table_name,p.conname name,p.contype type,pg_get_constraintdef(p.oid,true) definition,p.convalidated validated,p.condeferrable deferrable,p.condeferred deferred,(to_jsonb(p)->>'conenforced')::boolean enforced FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','nevora_tenancy') ORDER BY 1,2,3",
   indexes:"SELECT schemaname schema,tablename table_name,indexname name,indexdef definition FROM pg_indexes WHERE schemaname IN('public','nevora_tenancy') ORDER BY 1,2,3",
   triggers:"SELECT n.nspname schema,c.relname table_name,t.tgname name,t.tgenabled enabled,t.tgisinternal internal,pg_get_triggerdef(t.oid,true) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','nevora_tenancy') ORDER BY 1,2,3",
   functions:"SELECT n.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) arguments,pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN('public','nevora_tenancy') ORDER BY 1,2,3",
   views:"SELECT schemaname schema,viewname name,definition FROM pg_views WHERE schemaname IN('public','nevora_tenancy') ORDER BY 1,2",
  };
  const result:Record<string,Record<string,unknown>[]>={};
  for(const[k,q]of Object.entries(queries))result[k]=(await client.query(q)).rows;
  return result;
 }
 async function state(){
  const sidecars:Record<string,unknown>={};
  for(const t of historical)sidecars[t.sidecar!]=(await client.query('SELECT to_jsonb(s)::text row FROM public.'+quote(t.sidecar!)+' s ORDER BY id COLLATE "C"')).rows;
  return {rows:await originalRows(),catalog:await catalog(),sidecars,protocol:(await client.query('SELECT to_jsonb(s)::text row FROM nevora_tenancy.expansion_protocol s')).rows,contracts:(await client.query('SELECT to_jsonb(s)::text row FROM nevora_tenancy.owned_table_contract s ORDER BY table_name')).rows,sources:(await client.query('SELECT to_jsonb(s)::text row FROM nevora_tenancy.source_migration_contract s ORDER BY path')).rows,references:(await client.query('SELECT to_jsonb(s)::text row FROM nevora_tenancy.composite_fk_specification s ORDER BY source_table,original_constraint')).rows};
 }
 async function prepareComplete(options:{skipOwner?:string;skipHistory?:string}={}){
  await client.query('BEGIN');
  try{
   await client.query("UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED',fence_generation=1,backfill_actor=session_user,capture_manifest_sha256=$1",[manualManifest]);
   for(const mapping of mappings){
    if(options.skipOwner===mapping.table)continue;
    const entries=Object.entries(mapping.keys),predicate=entries.map(([k],n)=>quote(k)+'=$'+(n+2)).join(' AND ');
    const result=await client.query('UPDATE public.'+quote(mapping.table)+' SET workspace_id=$1 WHERE workspace_id IS NULL AND '+predicate+' RETURNING workspace_id',[mapping.workspace,...entries.map(([,v])=>v)]);
    expect(result.rowCount,mapping.table+' exact fixture owner').toBe(1);
   }
   for(const t of direct){
    const result=(await client.query('SELECT count(*)::int n FROM public.'+quote(t.table)+' WHERE workspace_id IS NULL')).rows[0].n;
    expect(result,t.table+' contains no unidentified fictional row').toBe(options.skipOwner===t.table?1:0);
   }
   if(options.skipHistory!=='clocker_pin_events'){
    await client.query("INSERT INTO public.clocker_pin_events_tenant_ownership(id,workspace_id,employee_id,actor_employee_id,source_checksum_sha256,capture_manifest_sha256) SELECT id,$1,employee_id,actor_employee_id,encode(sha256(convert_to(to_jsonb(s)::text,'UTF8')),'hex'),$2 FROM public.clocker_pin_events s WHERE id='validate-pin'",['workspace-fuel',manualManifest]);
   }
   if(options.skipHistory!=='schedule_publication_revision_shifts'){
    await client.query("INSERT INTO public.schedule_publication_revision_shifts_tenant_ownership(id,workspace_id,revision_id,source_shift_id,schedule_id,location_id,employee_id,position_id,source_checksum_sha256,capture_manifest_sha256) SELECT id,$1,revision_id,source_shift_id,schedule_id,location_id,employee_id,position_id,encode(sha256(convert_to(to_jsonb(s)::text,'UTF8')),'hex'),$2 FROM public.schedule_publication_revision_shifts s WHERE id='validate-history'",['workspace-fuel',manualManifest]);
   }
   await client.query('UPDATE nevora_tenancy.expansion_protocol SET backfill_actor=NULL');
   await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}
  expect(await originalRows()).toEqual(baseOriginalRows);
 }
 async function rejection(reason:string){
  const before=await state();let error:{code?:string;message?:string}|undefined;
  try{await client.query(sql);}catch(caught){error=caught as typeof error;await client.query('ROLLBACK');}
  save('case-'+sequence+'-rejection',{sqlSha256:hash(sql),expected:reason,actual:error?{code:error.code,message:error.message}:null,rolledBackStateEqual:JSON.stringify(await state())===JSON.stringify(before)});
  expect(await state()).toEqual(before);
  expect(error?.code).toBe('55000');
  expect(error?.message).toContain(reason);
  expect((await client.query("SELECT to_regclass('nevora_tenancy.ownership_validation') object")).rows[0].object).toBeNull();
 }
 async function scoped(){
  return (await client.query("SELECT s.source_table,s.original_constraint,s.target_table,s.source_columns::text[] source_columns,s.target_columns::text[] target_columns,c.conname name,c.contype type,c.convalidated validated,c.conenforced enforced,c.confmatchtype match,c.confupdtype update_action,c.confdeltype delete_action,c.condeferrable deferrable,c.condeferred deferred,o.confupdtype original_update,o.confdeltype original_delete,o.condeferrable original_deferrable,o.condeferred original_deferred,ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(n,ord) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.n ORDER BY ord) actual_source_columns,ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(n,ord) JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.n ORDER BY ord) actual_target_columns,c.confrelid=format('public.%I',s.target_table)::regclass target_correct FROM nevora_tenancy.composite_fk_specification s JOIN pg_constraint o ON o.conrelid=format('public.%I',s.source_table)::regclass AND o.conname=s.original_constraint LEFT JOIN pg_constraint c ON c.conrelid=o.conrelid AND c.conname=('f10_scoped_'||substr(md5(s.source_table::text||'.'||s.original_constraint::text),1,16))::name ORDER BY s.source_table,s.original_constraint")).rows;
 }
 beforeAll(async()=>{
  expect(process.env.DATABASE_URL).toBeUndefined();expect(process.env.FUEL_TEST_DATABASE_URL).toBeUndefined();
  expect(process.env.F_VALIDATE_RUN_DIR).toBeTruthy();runDir=process.env.F_VALIDATE_RUN_DIR!;
  lease=JSON.parse(readFileSync(leasePath!,'utf8'));expect(lease.closed).toBe(false);
  expect(realpathSync(lease.data)).toBe(join(realpathSync(lease.root),'data'));
  expect(realpathSync(lease.credentialFile)).toBe(join(lease.root,'credentials.private'));
  const pid=readFileSync(join(lease.data,'postmaster.pid'),'utf8').split('\n');
  expect(Number(pid[0])).toBe(lease.pid);expect(pid[2]).toBe(lease.pidStart);expect(Number(pid[3])).toBe(lease.port);expect(realpathSync(pid[1])).toBe(lease.data);
  const manifest=JSON.parse(readFileSync(join(runDir,'pre-invocation-source.json'),'utf8'));
  expect(manifest.files.find((f:{path:string})=>f.path===sqlPath).sha256).toBe(hash(sql));
  expect(manifest.files.find((f:{path:string})=>f.path==='db/migrations/0026_tenant_ownership_expand.sql').sha256).toBe(hash(expand));
  admin=connect(lease.database);await admin.connect();
  const identity=(await admin.query("SELECT current_setting('data_directory') data,current_setting('server_version') version,current_setting('unix_socket_directories') sockets,(SELECT system_identifier::text FROM pg_control_system()) system_identifier,(SELECT oid FROM pg_database WHERE datname=current_database()) oid,shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database') marker")).rows[0];
  expect(realpathSync(identity.data)).toBe(lease.data);expect(identity.system_identifier).toBe(lease.systemIdentifier);expect(identity.oid).toBe(lease.databaseOid);expect(identity.marker).toBe(lease.marker);expect(identity.version).toMatch(/^18\./);expect(identity.sockets).toBe('');
  base=await createDb();client=connect(base.name);await client.connect();clientOpen=true;
  for(const source of OWNERSHIP_SOURCE)await client.query(readFileSync(resolve(source.path),'utf8'));
  // Fictional inactive owner, exact publication history including deleted
  // literals, and source-bound scalar edge cases are created BEFORE expansion.
  await client.query("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,active,created_at) VALUES('validate-owner','Fictional','Owner','000','OWNER','loc-1',false,'2026-10-09 01:02:03.123456+00')");
  await client.query("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('validate-window','validate-owner',1,'08:00:00.123456','09:00:00.123456')");
  await client.query("INSERT INTO positions(id,workspace_id,name) VALUES('validate-position','workspace-fuel','Fictional position')");
  await client.query("INSERT INTO employee_positions(employee_id,position_id) VALUES('validate-owner','validate-position')");
  await client.query("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,source_id,created_by) VALUES('validate-revision','2026-10-05',1,'MANAGER_MUTATION','retired-source','validate-owner')");
  await client.query("INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,notes,position_name) VALUES('validate-history','validate-revision','deleted-shift','deleted-schedule','retired-location','retired-employee','2026-10-06','08:00:00.123456','09:00:00.123456','Historical Ω literal','Retired title')");
  await client.query("INSERT INTO clocker_pin_events(id,employee_id,actor_employee_id,pin_version,occurred_at) VALUES('validate-pin','validate-owner','validate-owner',1,'2026-10-09 01:02:03.123456+00')");
  await client.query("INSERT INTO password_recovery_limits(scope,bucket,attempts) VALUES('global',9223372036854775807,7)");
  await client.query(expand);
  baseOriginalRows=await originalRows();
  save('fictional-preparation',{sourceDigest:manifest.sourceDigest,sourceHead:manifest.head,sqlSha256:hash(sql),expansionSha256:hash(expand),registryDigest:registry.digest,manualManifest,mappings,claims:'MANUAL_FICTIONAL_TEST_METADATA_ONLY_NOT_REAL_BACKFILL_PROVENANCE',originalRows:baseOriginalRows,expandedCatalog:await catalog()});
  await client.end();clientOpen=false;
 },30000);
 beforeEach(async()=>{
  sequence++;db=await createDb(base.name);client=connect(db.name);await client.connect();clientOpen=true;
  const current=(await client.query("SELECT oid::text oid,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()")).rows[0];
  expect(current).toEqual({oid:db.oid,marker:db.marker});
 },30000);
 afterEach(async()=>{
  if(clientOpen){await client.query('ROLLBACK');await client.end();clientOpen=false;}
  if(db){await closeDb(db);db=undefined;}
 });
 afterAll(async()=>{
  if(clientOpen){await client.query('ROLLBACK');await client.end();clientOpen=false;}
  if(admin){
   if(base)await closeDb(base);
   expect(databases.every(d=>d.closed)).toBe(true);save('database-cleanup',{databases,allClosed:true});
   await admin.end();
  }
 });
 it('validates every direct owner and all 89 exact physical references without changing original rows/catalog controls',async()=>{
  await prepareComplete();const before=await state();
  await client.query(sql);
  expect(await originalRows()).toEqual(baseOriginalRows);
  for(const t of direct){
   const field=(await client.query("SELECT attnotnull FROM pg_attribute WHERE attrelid=$1::regclass AND attname='workspace_id'",['public.'+t.table])).rows[0];
   expect(field.attnotnull,t.table).toBe(true);
  }
  const references=await scoped();expect(references).toHaveLength(89);
  for(const r of references){
   expect(r.type).toBe('f');expect(r.validated).toBe(true);expect(r.enforced).toBe(true);expect(r.match).toBe('s');
   expect(r.target_correct).toBe(true);expect(r.actual_source_columns).toEqual(r.source_columns);expect(r.actual_target_columns).toEqual(r.target_columns);
   expect(r.update_action).toBe(r.original_update);expect(r.delete_action).toBe(r.original_delete);
   expect(r.deferrable).toBe(r.original_deferrable);expect(r.deferred).toBe(r.original_deferred);
  }
  const after=await catalog();
  for(const k of ['tables','indexes','functions','views','triggers','constraints'])for(const original of before.catalog[k])expect(after[k],k).toContainEqual(original);
  for(const original of before.catalog.columns){
   const expected=original.schema==='public'&&original.name==='workspace_id'&&direct.some(t=>t.table===original.table_name)?{...original,not_null:true}:original;
   expect(after.columns).toContainEqual(expected);
  }
  const validation=(await client.query('SELECT migration_id,source_commit,registry_sha256,capture_manifest_sha256,fence_generation::text generation,scoped_references FROM nevora_tenancy.ownership_validation')).rows[0];
  expect(validation).toEqual({migration_id:27,source_commit:'7c628e374f03c9025b2c0cfd3568be033f07238d',registry_sha256:registry.digest,capture_manifest_sha256:manualManifest,generation:'1',scoped_references:89});
  expect((await client.query('SELECT phase,backfill_actor,capture_manifest_sha256 FROM nevora_tenancy.expansion_protocol')).rows[0]).toEqual({phase:'FENCED',backfill_actor:null,capture_manifest_sha256:manualManifest});
  save('case-'+sequence+'-positive',{before,after:await state(),references,validation,claims:'LOCAL_PG18_MANUAL_FIXTURE_VALIDATION_ONLY'});
 });
 it('retains both complete immutable historical sidecars and deleted literal identities',async()=>{
  await prepareComplete();const before=await state();await client.query(sql);
  expect((await state()).sidecars).toEqual(before.sidecars);
  for(const t of historical)expect((await client.query('SELECT count(*)::int n FROM public.'+quote(t.sidecar!))).rows[0].n).toBe(1);
  const sidecar=(await client.query("SELECT employee_id,location_id,schedule_id,source_shift_id,position_id FROM public.schedule_publication_revision_shifts_tenant_ownership WHERE id='validate-history'")).rows[0];
  expect(sidecar).toEqual({employee_id:'retired-employee',location_id:'retired-location',schedule_id:'deleted-schedule',source_shift_id:'deleted-shift',position_id:null});
  expect(await originalRows()).toEqual(baseOriginalRows);
 });
 it('keeps the FENCED write rejection and legacy singleton guard operative after validation',async()=>{
  await prepareComplete();await client.query(sql);
  await expect(client.query("UPDATE employees SET phone='forbidden' WHERE id='validate-owner'")).rejects.toMatchObject({code:'55000',message:'f10_legacy_writes_fenced'});
  // This targets only the owned DB and is rolled back. Opening legacy mode is
  // fictional test setup, not cutover: the original singleton stays in place.
  await client.query('BEGIN');await client.query("UPDATE nevora_tenancy.expansion_protocol SET phase='EXPANDED_LEGACY',capture_manifest_sha256=NULL");
  await expect(client.query("INSERT INTO workspaces(id,name,time_zone) VALUES('fictional-second','Second','UTC')")).rejects.toMatchObject({code:'23505'});
  await client.query('ROLLBACK');
  expect((await client.query('SELECT count(*)::int n FROM workspaces')).rows[0].n).toBe(1);
 });
 it('makes the validation receipt immutable and rolls duplicate application back',async()=>{
  await prepareComplete();await client.query(sql);
  await expect(client.query('UPDATE nevora_tenancy.ownership_validation SET scoped_references=89')).rejects.toMatchObject({code:'23514'});
  const before=await state();await expect(client.query(sql)).rejects.toBeTruthy();await client.query('ROLLBACK');
  expect(await state()).toEqual(before);
 });
 it.each([
  ['unfenced', "UPDATE nevora_tenancy.expansion_protocol SET phase='EXPANDED_LEGACY',capture_manifest_sha256=NULL"],
  ['zero_generation','UPDATE nevora_tenancy.expansion_protocol SET fence_generation=0'],
  ['active_actor','UPDATE nevora_tenancy.expansion_protocol SET backfill_actor=session_user'],
  ['missing_manifest','UPDATE nevora_tenancy.expansion_protocol SET capture_manifest_sha256=NULL'],
  ['wrong_source',"UPDATE nevora_tenancy.expansion_protocol SET schema_source_commit='"+'a'.repeat(40)+"'"],
  ['wrong_registry',"UPDATE nevora_tenancy.expansion_protocol SET registry_sha256='"+'b'.repeat(64)+"'"],
 ])('rejects protocol %s and rolls every catalog/row effect back',async(_,mutation)=>{
  await prepareComplete();await client.query(mutation);await rejection('f10_validate_complete_fenced_manifest_required');
 });
 it('rejects a missing protocol row and retains full source/catalog state',async()=>{
  await prepareComplete();await client.query('DELETE FROM nevora_tenancy.expansion_protocol');
  await rejection('f10_validate_complete_fenced_manifest_required');
 });
 it('rejects an incomplete direct-owner row without coercing/inserting metadata',async()=>{
  await prepareComplete({skipOwner:'employees'});await rejection('f10_validate_missing_direct_owner');
 });
 it.each(['clocker_pin_events','schedule_publication_revision_shifts'])('rejects incomplete historical ownership in %s',async(table)=>{
  await prepareComplete({skipHistory:table});await rejection('f10_validate_missing_historical_owner');
 });
 it.each(['f10_write_fence','f10_identity_guard'])('rejects disabled source guard %s',async(trigger)=>{
  await prepareComplete();await client.query('ALTER TABLE employees DISABLE TRIGGER '+quote(trigger));await rejection('f10_validate_source_guard_drift');
 });
 it('rejects a missing source identity guard',async()=>{
  await prepareComplete();await client.query('DROP TRIGGER f10_identity_guard ON employees');await rejection('f10_validate_source_guard_drift');
 });
 it('rejects disabled original append-only history guard without silently accepting its relaxed state',async()=>{
  await prepareComplete();await client.query('ALTER TABLE clocker_pin_events DISABLE TRIGGER clocker_pin_event_append_only');await rejection('f10_validate_source_guard_drift');
 });
 it('rejects missing sidecar pair guard even when mirrors currently match',async()=>{
  await prepareComplete();await client.query('DROP TRIGGER f10_historical_pair ON clocker_pin_events_tenant_ownership');await rejection('f10_validate_sidecar_contract');
 });
 it('rejects disabled sidecar immutability guard',async()=>{
  await prepareComplete();await client.query('ALTER TABLE clocker_pin_events_tenant_ownership DISABLE TRIGGER f10_sidecar_immutable');await rejection('f10_validate_sidecar_contract');
 });
 it('rejects changed original reference definition and its full rollback is observable',async()=>{
  await prepareComplete();await client.query('ALTER TABLE availability_windows DROP CONSTRAINT availability_windows_employee_id_fkey');
  await client.query('ALTER TABLE availability_windows ADD CONSTRAINT availability_windows_employee_id_fkey FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE RESTRICT');
  await rejection('f10_validate_reference_source_drift');
 });
 it('rejects unvalidated original reference state rather than claiming validation',async()=>{
  await prepareComplete();await client.query('ALTER TABLE availability_windows DROP CONSTRAINT availability_windows_employee_id_fkey');
  await client.query('ALTER TABLE availability_windows ADD CONSTRAINT availability_windows_employee_id_fkey FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE NOT VALID');
  await rejection('f10_validate_reference_source_drift');
 });
 it('rejects a changed scoped reference column contract',async()=>{
  await prepareComplete();await client.query("UPDATE nevora_tenancy.composite_fk_specification SET source_columns=ARRAY['workspace_id','id']::name[] WHERE source_table='availability_windows'");
  await rejection('f10_validate_reference_scope_drift');
 });
 it('rejects a missing scoped reference specification',async()=>{
  await prepareComplete();await client.query("DELETE FROM nevora_tenancy.composite_fk_specification WHERE source_table='availability_windows'");await rejection('f10_validate_complete_fenced_manifest_required');
 });
 it('rejects a tampered original source hash contract',async()=>{
  await prepareComplete();await client.query("UPDATE nevora_tenancy.source_migration_contract SET source_sha256='"+'c'.repeat(64)+"' WHERE path='db/migrations/0001_initial.sql'");await rejection('f10_validate_source_contract_drift');
 });
 it('rejects altered source-column metadata rather than trusting registry SHA alone',async()=>{
  await prepareComplete();await client.query("UPDATE nevora_tenancy.owned_table_contract SET original_columns=ARRAY['id']::name[] WHERE table_name='employees'");await rejection('f10_validate_source_contract_drift');
 });
 it('rejects missing original migration contract metadata',async()=>{
  await prepareComplete();await client.query("DELETE FROM nevora_tenancy.source_migration_contract WHERE path='db/migrations/0001_initial.sql'");await rejection('f10_validate_source_contract_drift');
 });
 it('rejects changed actual original column type while retaining exact original row values',async()=>{
  await prepareComplete();await client.query('ALTER TABLE employees ALTER COLUMN first_name TYPE varchar');await rejection('f10_validate_source_contract_drift');
 });
 it('rejects a changed source fence function even when trigger names and enablement match',async()=>{
  await prepareComplete();
  await client.query('CREATE OR REPLACE FUNCTION nevora_tenancy.source_write_fence() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,nevora_tenancy AS $$ BEGIN RETURN NULL; END $$');
  await rejection('f10_validate_source_guard_drift');
 });
 it('rejects missing typed-sidecar source reference',async()=>{
  await prepareComplete();await client.query('ALTER TABLE clocker_pin_events_tenant_ownership DROP CONSTRAINT clocker_pin_events_tenant_ownership_id_fkey');await rejection('f10_validate_sidecar_contract');
 });
 it('rejects a malformed historical sidecar mirror with enabled current guards',async()=>{
  await prepareComplete();
  // Deliberate negative catalog/data corruption in this disposable own DB:
  // only sidecar guards are temporarily disabled to construct the invalid
  // witness, then restored before executing validation. No original
  // source trigger/row is rewritten or disabled for a positive fixture.
  await client.query('ALTER TABLE clocker_pin_events_tenant_ownership DISABLE TRIGGER f10_sidecar_immutable');
  await client.query('ALTER TABLE clocker_pin_events_tenant_ownership DISABLE TRIGGER f10_historical_pair');
  await client.query("UPDATE nevora_tenancy.expansion_protocol SET backfill_actor=session_user");
  await client.query("UPDATE clocker_pin_events_tenant_ownership SET employee_id='tampered-historical-literal'");
  await client.query('UPDATE nevora_tenancy.expansion_protocol SET backfill_actor=NULL');
  await client.query('ALTER TABLE clocker_pin_events_tenant_ownership ENABLE TRIGGER f10_sidecar_immutable');
  await client.query('ALTER TABLE clocker_pin_events_tenant_ownership ENABLE TRIGGER f10_historical_pair');
  await rejection('f10_validate_sidecar_contract');
 });
 it('rejects metadata-controlled lock names before any such table is selected',async()=>{
  await prepareComplete();await client.query("UPDATE nevora_tenancy.owned_table_contract SET table_name='pg_authid' WHERE table_name='password_recovery_limits'");
  await rejection('f10_validate_source_contract_drift');
 });
 it('rejects restored public execution of the privileged source-fence function',async()=>{
  await prepareComplete();await client.query('GRANT EXECUTE ON FUNCTION nevora_tenancy.source_write_fence() TO PUBLIC');
  await rejection('f10_validate_source_guard_drift');
 });
 it('rejects changed source RLS flags before physical ownership validation',async()=>{
  await prepareComplete();await client.query('ALTER TABLE employees ENABLE ROW LEVEL SECURITY');
  await client.query('ALTER TABLE employees FORCE ROW LEVEL SECURITY');
  await rejection('f10_validate_source_contract_drift');
 });
 it('rejects a removed legacy namespace unique index rather than accepting relaxed protection',async()=>{
  await prepareComplete();await client.query('DROP INDEX public.employees_email_unique');
  await rejection('f10_validate_source_contract_drift');
 });
 it('rejects a sidecar manifest from a different completed capture',async()=>{
  await prepareComplete();
  await client.query('ALTER TABLE clocker_pin_events_tenant_ownership DISABLE TRIGGER f10_sidecar_immutable');
  await client.query('ALTER TABLE clocker_pin_events_tenant_ownership DISABLE TRIGGER f10_historical_pair');
  await client.query('UPDATE nevora_tenancy.expansion_protocol SET backfill_actor=session_user');
  await client.query("UPDATE clocker_pin_events_tenant_ownership SET capture_manifest_sha256='"+'d'.repeat(64)+"'");
  await client.query('UPDATE nevora_tenancy.expansion_protocol SET backfill_actor=NULL');
  await client.query('ALTER TABLE clocker_pin_events_tenant_ownership ENABLE TRIGGER f10_sidecar_immutable');
  await client.query('ALTER TABLE clocker_pin_events_tenant_ownership ENABLE TRIGGER f10_historical_pair');
  await rejection('f10_validate_sidecar_contract');
 });

});
