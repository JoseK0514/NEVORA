import { describe,expect,it,vi } from 'vitest';
import { beforeAll,afterAll } from 'vitest';
import { readFileSync,writeFileSync,realpathSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { Client } from 'pg';
import { decodeMigrationWireValue,captureTenantMigrationFacts,captureTypedTenantMigrationFacts,observeMigrationCatalog,type MigrationCaptureRequest,type TypedMigrationCaptureFacts } from './capture.server';
import { getOwnershipRegistry,OWNERSHIP_SOURCE,ownershipDigest,canonicalOwnershipJson } from './ownership';
import { preflightTenantBackfill } from './backfill';
import { parseLosslessTextArrayWire,isIssuedLosslessTextArrayEnvelope } from './lossless-array';
import { traverseTypedMigrationWireValue,isIssuedTypedMigrationCellLineage } from './typed-lineage';
import {inspectTypedMigrationSnapshot,isIssuedInspectedTypedSnapshot} from './typed-snapshot';

describe('privileged migration capture wire decoding',()=>{
 it('keeps signed bigint and fixed-scale numeric without Number conversion',()=>{
  expect(decodeMigrationWireValue('bigint','9223372036854775807')).toBe('9223372036854775807');
  expect(decodeMigrationWireValue('numeric(5,2)','99.10')).toBe('99.10');
 });
 it('keeps microseconds, SQL NULL, text and padded char distinct',()=>{
  expect(decodeMigrationWireValue('timestamptz','2026-10-09 01:02:03.123456+00')).toBe('2026-10-09 01:02:03.123456+00');
  expect(decodeMigrationWireValue('timestamp','2026-10-09 01:02:03.000001')).toBe('2026-10-09 01:02:03.000001');
  expect(decodeMigrationWireValue('text',null)).toBeNull();
  expect(decodeMigrationWireValue('char(32)','value   ')).toBe('value   ');
 });
 it('decodes known safe scalar and nested JSON values with no key coercion',()=>{
  expect(decodeMigrationWireValue('smallint','-32768')).toBe(-32768);
  expect(decodeMigrationWireValue('integer','2147483647')).toBe(2147483647);
  expect(decodeMigrationWireValue('boolean','f')).toBe(false);
  expect(decodeMigrationWireValue('jsonb','{"x":[1,0.5,"9007199254740993",null],"__proto__":3}')).toEqual(JSON.parse('{"x":[1,0.5,"9007199254740993",null],"__proto__":3}'));
 });
 it('blocks unsafe JSON numbers instead of rounding or converting them to strings',()=>{
  for(const raw of ['{"id":9007199254740993}','[0.123456789012345678901]','1e400','1.00','-0'])expect(()=>decodeMigrationWireValue('jsonb',raw)).toThrow('LOSSLESS_JSON_NUMBER_UNSUPPORTED');
 });
 it('rejects invalid scalar formats and unknown source types',()=>{
  for(const [type,raw]of [['integer','2147483648'],['smallint','-32769'],['boolean','true'],['bigint','9223372036854775808'],['numeric(5,2)','NaN'],['text[]','[1]'],['citext','a']])expect(()=>decodeMigrationWireValue(type,raw)).toThrow();
 });
 it('keeps empty arrays, SQL NULL arrays and JSON literal NULL distinguishable in the wire witness',()=>{
  expect(decodeMigrationWireValue('text[]','[]')).toEqual([]);
  expect(decodeMigrationWireValue('text[]','["a,b","\\\"x\\\"",null]')).toEqual(['a,b','"x"',null]);
  expect(decodeMigrationWireValue('jsonb','null')).toBeNull();
 });
});

// This opt-in suite neither starts a cluster nor reads application credentials.
// Every invocation creates/marks/drops only its own database on the explicit
// separate fictional loopback lease, checking PID/start/system ID and marker.
const leasePath=process.env.F_CAPTURE_OWNED_LEASE;
describe.skipIf(!leasePath)('owned PostgreSQL privileged migration capture',()=>{
 let admin:Client,client:Client,other:Client;
 let db:{name:string;oid:string;marker:string};
 let request:MigrationCaptureRequest;
 let lease:{closed:boolean;root:string;data:string;port:number;pid:number;pidStart:string;credentialFile:string;user:string;database:string;databaseOid:number;systemIdentifier:string;marker:string};
 const quote=(v:string)=>'"'+v.replace(/"/g,'""')+'"';
 const registry=getOwnershipRegistry();
 function inspectedTypedCapture(facts:TypedMigrationCaptureFacts,sourceRequest:MigrationCaptureRequest=request){
  const result=inspectTypedMigrationSnapshot(facts,{sourceDigest:sourceRequest.sourceDigest,currentSchemaDigest:sourceRequest.catalogBaseline.catalogDigest,snapshotId:facts.snapshot.id,fenceGeneration:facts.fence.generation,factsDigest:facts.factsDigest});
  expect(result.status,JSON.stringify(result)).toBe('INSPECTED');if(result.status!=='INSPECTED')throw Error('Expected complete owned typed snapshot integrity');
  expect(result.snapshot.tables.map(t=>[t.table,t.expectedCount,t.expectedChecksum])).toEqual(facts.tables.map(t=>[t.table,t.expectedCount,t.expectedChecksum]));
  expect(isIssuedInspectedTypedSnapshot(result.snapshot)).toBe(true);expect(result.snapshot.verification).toContain('NOT_OWNERSHIP_NAMESPACE_SEMANTICS_OPERATOR_OR_DATABASE_AUTHORITY');
  expect(Object.isFrozen(result.snapshot)).toBe(true);return result.snapshot;
 }
 let initialRows:unknown;
 const connect=(database:string)=>new Client({host:'127.0.0.1',port:lease.port,user:lease.user,password:readFileSync(lease.credentialFile,'utf8'),database,connectionTimeoutMillis:3000,statement_timeout:15000});
 async function catalog(){
  await client.query('SET search_path=pg_catalog');
  try{return await observeMigrationCatalog(client);}finally{await client.query('SET search_path=public');}
 }
 async function allOriginalRows(){
  const values:Record<string,unknown>={};
  for(const table of registry.tables){
   const columns=table.columns.map(c=>quote(c.name)).join(',');
   values[table.table]=(await client.query('SELECT to_jsonb(r)::text row FROM (SELECT '+columns+' FROM public.'+quote(table.table)+') r ORDER BY to_jsonb(r)::text COLLATE "C"')).rows;
  }
  return values;
 }
 async function resetFence(){
  await client.query('ROLLBACK');
  await client.query("UPDATE nevora_tenancy.expansion_protocol SET phase='EXPANDED_LEGACY',backfill_actor=NULL,capture_manifest_sha256=NULL,fence_generation=0");
 }
 async function capture(){
  return captureTenantMigrationFacts(client,request);
 }
 async function ready(){
  const outcome=await capture();
  expect(outcome.status,JSON.stringify(outcome)).toBe('CAPTURED');
  if(outcome.status!=='CAPTURED')throw new Error('Expected owned capture facts');
  return outcome.facts;
 }
 beforeAll(async()=>{
  expect(process.env.DATABASE_URL).toBeUndefined();expect(process.env.FUEL_TEST_DATABASE_URL).toBeUndefined();
  expect(process.env.F_CAPTURE_RUN_DIR).toBeTruthy();
  lease=JSON.parse(readFileSync(leasePath!,'utf8'));
  expect(lease.closed).toBe(false);expect(realpathSync(lease.data)).toBe(join(realpathSync(lease.root),'data'));
  const pid=readFileSync(join(lease.data,'postmaster.pid'),'utf8').split('\n');
  expect(Number(pid[0])).toBe(lease.pid);expect(pid[2]).toBe(lease.pidStart);expect(Number(pid[3])).toBe(lease.port);expect(realpathSync(pid[1])).toBe(lease.data);
  admin=connect(lease.database);await admin.connect();
  const identity=(await admin.query("SELECT current_setting('data_directory') data,(SELECT system_identifier::text FROM pg_control_system()) system_identifier,(SELECT oid FROM pg_database WHERE datname=current_database()) oid,shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database') marker")).rows[0];
  expect(realpathSync(identity.data)).toBe(lease.data);expect(identity.system_identifier).toBe(lease.systemIdentifier);expect(identity.oid).toBe(lease.databaseOid);expect(identity.marker).toBe(lease.marker);
  const name=lease.database+'_run_'+randomBytes(4).toString('hex'),marker=lease.marker+':run:'+name;
  expect((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rowCount).toBe(0);
  await admin.query('CREATE DATABASE '+quote(name));
  const oid=(await admin.query('SELECT oid::text oid FROM pg_database WHERE datname=$1',[name])).rows[0].oid;
  db={name,oid,marker};
  await admin.query('COMMENT ON DATABASE '+quote(name)+" IS '"+marker+"'");
  writeFileSync(join(process.env.F_CAPTURE_RUN_DIR!,'database-custody.json'),JSON.stringify({systemIdentifier:lease.systemIdentifier,...db,createdByThisInvocation:true,closed:false},null,2),{flag:'wx'});
  client=connect(name);other=connect(name);await client.connect();await other.connect();
  const migrations=OWNERSHIP_SOURCE.map(s=>({path:s.path,text:readFileSync(resolve(s.path),'utf8')}));
  for(const source of migrations)await client.query(source.text);
  await client.query("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,active,email,created_at) VALUES('capture-owner','Fictional','Owner','000','OWNER','loc-1',false,'Capture@Example.invalid','2026-10-09 01:02:03.123456+00'),('capture-empty','Fictional','Empty','000','EMPLOYEE','loc-1',false,'','2026-10-09 01:02:03.000001+00'),('capture-null','Fictional','Null','000','EMPLOYEE','loc-1',false,NULL,'2026-10-09 01:02:03.000002+00')");
  await client.query("INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours) VALUES('capture-owner',39.10)");
  await client.query("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES('fictional-padded','capture-owner','2026-10-09 09:00:00.123456+00')");
  await client.query("INSERT INTO calendar_subscriptions(id,workspace_id,employee_id,digest,generation,allowed_location_ids,revoked_at,revocation_reason) VALUES('00000000-0000-4000-8000-000000000002','workspace-fuel','capture-owner',$1,'00000000-0000-4000-8000-000000000003',ARRAY['loc-1','historical,Ω','quoted\"value'],clock_timestamp(),'fictional-history')",['e'.repeat(64)]);
  await client.query("INSERT INTO schedule_templates(id,name,created_by,active) VALUES('capture-t-active','Shared Ω','capture-owner',true),('capture-t-inactive','SHARED Ω','capture-owner',false)");
  await client.query("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,source_id,created_by) VALUES('capture-revision','2026-10-05',1,'MANAGER_MUTATION','deleted-source','capture-owner')");
  await client.query("INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,notes) VALUES('capture-history','capture-revision','deleted-source','deleted-schedule','retired-location','retired-employee','2026-10-06','08:00:00.123456','09:00:00.123456','Historical literal Ω')");
  await client.query("INSERT INTO clocker_pin_events(id,employee_id,actor_employee_id,pin_version) VALUES('capture-pin','capture-owner','capture-owner',1)");
  await client.query("INSERT INTO password_recovery_limits(scope,bucket,attempts) VALUES('global',9223372036854775807,7)");
  await client.query("INSERT INTO calendar_operations(workspace_id,actor_employee_id,operation_id,authority,payload_hash,result) VALUES('workspace-fuel','capture-owner','00000000-0000-4000-8000-000000000001',$1,$1,'{\"number\":0.5,\"nested\":{\"id\":\"9007199254740993\"}}')",['a'.repeat(64)]);
  await client.query(readFileSync(resolve('db/migrations/0026_tenant_ownership_expand.sql'),'utf8'));
  const observed=await catalog();
  const manifest=JSON.parse(readFileSync(join(process.env.F_CAPTURE_RUN_DIR!,'pre-invocation-source.json'),'utf8'));
  request={identity:{database:name,databaseOid:oid,marker,systemIdentifier:lease.systemIdentifier,dataDirectory:lease.data,role:lease.user,port:lease.port},migrations,sourceDigest:manifest.sourceDigest,catalogBaseline:{sourceDigest:manifest.sourceDigest,expansionSha256:'fb5fd364f2e355c059a501422dd016d4284f9bac0287fb3d69548d52caaf43cb',registryDigest:registry.digest,catalogDigest:observed.digest},expectedFenceGeneration:'0'};
  initialRows=await allOriginalRows();
  writeFileSync(join(process.env.F_CAPTURE_RUN_DIR!,'source-generated-catalog.json'),JSON.stringify({...observed,binding:request.catalogBaseline},null,2),{flag:'wx'});
 },30000);
 afterAll(async()=>{
  if(!client)return;
  await client.query('ROLLBACK');await other?.query('ROLLBACK');
  writeFileSync(join(process.env.F_CAPTURE_RUN_DIR!,'final-original-rows.json'),JSON.stringify(await allOriginalRows(),null,2),{flag:'wx'});
  await client.end();await other?.end();
  if(admin&&db){
   const actual=(await admin.query("SELECT oid::text oid,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=$1",[db.name])).rows[0];
   expect(actual).toEqual({oid:db.oid,marker:db.marker});
   await admin.query('DROP DATABASE '+quote(db.name));
   writeFileSync(join(process.env.F_CAPTURE_RUN_DIR!,'database-closed.json'),JSON.stringify({...db,closed:true},null,2),{flag:'wx'});
   await admin.end();
  }
 });
 it('captures every original field and all inactive/history rows, lossless bigint/numeric/time and wire values',async()=>{
  const facts=await ready();
  expect(facts.tables.map(t=>t.table)).toEqual(registry.tables.map(t=>t.table));
  for(const table of registry.tables){
   const captured=facts.tables.find(t=>t.table===table.table)!;
   expect(captured.expectedCount).toBe((await client.query('SELECT count(*)::int n FROM public.'+quote(table.table))).rows[0].n);
   expect(captured.rows).toHaveLength(captured.expectedCount);
   for(const row of captured.rows)expect(Object.keys(row.values)).toEqual(table.columns.map(c=>c.name));
  }
  const owner=facts.tables.find(t=>t.table==='employees')!.rows.find(r=>r.values.id==='capture-owner')!;
  expect(owner.values.active).toBe(false);expect(facts.tables.find(t=>t.table==='employee_scheduling_settings')!.rows[0].values.maximum_weekly_hours).toBe('39.10');expect(owner.values.created_at).toBe('2026-10-09 01:02:03.123456+00');
  expect(facts.tables.find(t=>t.table==='password_recovery_limits')!.rows[0].values.bucket).toBe('9223372036854775807');
  expect(facts.tables.find(t=>t.table==='employee_sessions')!.rows[0].values.token_hash).toBe('fictional-padded'.padEnd(64,' '));
  expect(facts.tables.find(t=>t.table==='calendar_subscriptions')!.rows[0].values.allowed_location_ids).toEqual(['loc-1','historical,Ω','quoted"value']);
  expect(facts.tables.find(t=>t.table==='schedule_publication_revision_shifts')!.rows[0].values.employee_id).toBe('retired-employee');
  expect(facts.tables.find(t=>t.table==='schedule_publication_revision_shifts')!.rows[0].values.start_time).toBe('08:00:00.123456');
  expect(facts.fence).toEqual({phase:'FENCED',generation:'1',actor:null,manifest:null});
  expect(await allOriginalRows()).toEqual(initialRows);
  expect((await client.query('SELECT phase,backfill_actor,capture_manifest_sha256 FROM nevora_tenancy.expansion_protocol')).rows[0]).toEqual({phase:'FENCED',backfill_actor:null,capture_manifest_sha256:null});
  writeFileSync(join(process.env.F_CAPTURE_RUN_DIR!,'captured-facts.json'),JSON.stringify(facts,null,2),{flag:'wx'});
 });
 it('captures all four real catalogs/collations and every included/excluded database result, with exact binding hashes',async()=>{
  await resetFence();const facts=await ready(),w=facts.namespaceComparators;
  expect(w.catalogs.map(c=>c.contractId)).toEqual(['clocker_break_types.name_ci','employees.email_ci','positions.name_ci','schedule_templates.active_name_ci']);
  for(const c of w.catalogs){expect(c.definition.serverVersion).toMatch(/^18\./);expect(c.definition.serverEncoding).toBe('UTF8');expect(c.definition.indexCollation.oid).toMatch(/^[1-9][0-9]*$/);const{checksum,...rest}=c;expect(checksum).toBe(ownershipDigest(rest));}
  const find=(key:string)=>w.rows.find(r=>r.contractId==='employees.email_ci'&&r.key[0]===key)!;
  expect(find('capture-empty').included).toBe(true);expect(find('capture-empty').expressionValue).toBe('');
  expect(find('capture-null')).toMatchObject({included:false,expressionValue:null,comparisonClass:null});
  const inactive=w.rows.find(r=>r.contractId==='schedule_templates.active_name_ci'&&r.key[0]==='capture-t-inactive')!;
  expect(inactive).toMatchObject({included:false,comparisonClass:null});expect(inactive.expressionValue).toBeTruthy();
  expect(w.binding.rowSetChecksum).toBe(ownershipDigest(facts.tables.map(t=>({table:t.table,count:t.expectedCount,checksum:t.expectedChecksum}))));
  expect(w.captureChecksum).toBe(ownershipDigest({binding:w.binding,catalogs:w.catalogs,rows:w.rows}));
  const plan=preflightTenantBackfill({...facts,migrations:request.migrations,mappings:[],historicalReferences:[],payloadCaptures:[],chunkSize:100,writeFence:{mode:'EXCLUSIVE_FENCED',sourceDigest:facts.sourceDigest,schemaDigest:facts.currentSchemaDigest,databaseFenceToken:'fixture-capture-only',allWritersCovered:true,immutableOwnershipEnabled:true,registeredWriterDigest:'a'.repeat(64),newWriteJournalDigest:'b'.repeat(64),newWritesReconciled:true}});
  expect(plan.status).toBe('BLOCKED');expect(plan.diagnostics.some(d=>d.code.startsWith('DATABASE_COMPARATOR'))).toBe(false);
 });
 it('reads catalogs on empty comparator tables while retaining all other captured rows',async()=>{
  await resetFence();
  expect((await client.query('SELECT count(*)::int n FROM positions')).rows[0].n).toBe(0);
  expect((await client.query('SELECT count(*)::int n FROM clocker_break_types')).rows[0].n).toBe(0);
  const facts=await ready();
  for(const id of ['positions.name_ci','clocker_break_types.name_ci']){
   expect(facts.namespaceComparators.catalogs.find(c=>c.contractId===id)).toBeTruthy();
   expect(facts.namespaceComparators.rows.filter(r=>r.contractId===id)).toEqual([]);
  }
 });
 it('rejects a caller transaction without rolling it back or leaking SQL/error data',async()=>{
  await resetFence();await client.query('BEGIN');await client.query("UPDATE employees SET phone='caller-owned' WHERE id='capture-owner'");
  expect(await capture()).toEqual({status:'BLOCKED',code:'CLIENT_NOT_IDLE'});expect(client.getTransactionStatus()).toBe('T');
  expect((await client.query("SELECT phone FROM employees WHERE id='capture-owner'")).rows[0].phone).toBe('caller-owned');
  await client.query('ROLLBACK');
 });
 it('blocks source, identity, catalog and fence-generation drift without altering source rows',async()=>{
  await resetFence();
  const cases=[
   {...request,sourceDigest:'b'.repeat(64)},
   {...request,identity:{...request.identity,marker:'wrong'}},
   {...request,catalogBaseline:{...request.catalogBaseline,catalogDigest:'b'.repeat(64)}},
   {...request,expectedFenceGeneration:'999'},
  ];
  for(const r of cases)expect((await captureTenantMigrationFacts(client,r)).status).toBe('BLOCKED');
  expect(await allOriginalRows()).toEqual(initialRows);
  expect((await client.query('SELECT phase,fence_generation::text generation FROM nevora_tenancy.expansion_protocol')).rows[0]).toEqual({phase:'EXPANDED_LEGACY',generation:'0'});
 });
 it('rejects disabled existing immutable guards and actual column/catalog drift',async()=>{
  await resetFence();
  await client.query('ALTER TABLE employees DISABLE TRIGGER f10_identity_guard');
  expect(await capture()).toEqual({status:'BLOCKED',code:'SOURCE_FENCE_DRIFT'});
  await client.query('ALTER TABLE employees ENABLE TRIGGER f10_identity_guard');
  await client.query('ALTER TABLE clocker_pin_events DISABLE TRIGGER clocker_pin_event_append_only');
  expect(await capture()).toEqual({status:'BLOCKED',code:'CATALOG_BASELINE_DRIFT'});
  await client.query('ALTER TABLE clocker_pin_events ENABLE TRIGGER clocker_pin_event_append_only');
  await client.query('ALTER TABLE employees ALTER COLUMN first_name TYPE varchar');
  expect(await capture()).toEqual({status:'BLOCKED',code:'SOURCE_COLUMN_DRIFT'});
  await client.query('ALTER TABLE employees ALTER COLUMN first_name TYPE text');
  await client.query('ALTER TABLE employees ADD COLUMN fixture_unknown text');
  expect(await capture()).toEqual({status:'BLOCKED',code:'CATALOG_BASELINE_DRIFT'});
  await client.query('ALTER TABLE employees DROP COLUMN fixture_unknown');
  // DROP leaves a physical attnum hole, outside original-column projection.
  expect((await catalog()).digest).toBe(request.catalogBaseline.catalogDigest);
 });
 it('returns a closed code for malformed/accessor inputs and transport errors without private diagnostics',async()=>{
  await resetFence();
  let called=false;
  const malformed={...request};
  Object.defineProperty(malformed,'sourceDigest',{enumerable:true,get(){called=true;throw new Error('private-capture-data');}});
  expect(await captureTenantMigrationFacts(client,malformed)).toEqual({status:'BLOCKED',code:'CAPTURE_FAILED'});expect(called).toBe(false);
  const spy=vi.spyOn(client,'query').mockRejectedValueOnce(new Error('private-query-password-capture'));
  expect(await capture()).toEqual({status:'BLOCKED',code:'CAPTURE_FAILED'});
  spy.mockRestore();
  expect(client.getTransactionStatus()).toBe('I');
 });
 it('fails unsafe JSON capture without returning rounded data and rolls the fence transition back',async()=>{
  await resetFence();
  await client.query("UPDATE employee_scheduling_settings SET operational_rule_profile='{\"id\":9007199254740993}' WHERE employee_id='capture-owner'");
  expect(await capture()).toEqual({status:'BLOCKED',code:'LOSSLESS_JSON_NUMBER_UNSUPPORTED'});
  expect((await client.query('SELECT phase,fence_generation::text generation FROM nevora_tenancy.expansion_protocol')).rows[0]).toEqual({phase:'EXPANDED_LEGACY',generation:'0'});
  await client.query("UPDATE employee_scheduling_settings SET operational_rule_profile=NULL WHERE employee_id='capture-owner'");
 });
 it('captures every source column in a distinct typed wire format without claiming legacy backfill compatibility',async()=>{
  await resetFence();
  const before=await allOriginalRows();
  const result=await captureTypedTenantMigrationFacts(client,request);
  expect(result.status,JSON.stringify(result)).toBe('CAPTURED');
  if(result.status!=='CAPTURED')throw new Error('Expected typed capture');
  inspectedTypedCapture(result.facts);
  expect(result.facts.format).toBe('TYPED_SQL_WIRE_V1');
  expect(result.facts.verification).toBe('OWNED_LOCAL_TYPED_DATABASE_FACTS_NOT_BACKFILL_AUTHORITY');
  expect(result.facts.tables.map(t=>t.table)).toEqual(registry.tables.map(t=>t.table));
  for(const rule of registry.tables){
   const table=result.facts.tables.find(t=>t.table===rule.table)!;
   expect(table.expectedCount).toBe((await client.query('SELECT count(*)::int n FROM public.'+quote(rule.table))).rows[0].n);
   for(const row of table.rows){
    expect(row.columns.map(c=>[c.name,c.type])).toEqual(rule.columns.map(c=>[c.name,c.type]));
    expect(row.originalChecksum).toBe(ownershipDigest({format:'TYPED_SQL_WIRE_V1',columns:row.columns}));
    for(const column of row.columns){
     const traced=traverseTypedMigrationWireValue(column.value);
     expect(traced.status,rule.table+'.'+column.name).toBe('TRAVERSED');
     if(traced.status!=='TRAVERSED')throw Error('Expected complete captured cell lineage');
     expect(traced.lineage.source.type).toBe(column.type);
     expect(traced.lineage.source.kind).toBe(column.value.kind);
     expect(traced.lineage.source.wire?.text??null).toBe(column.wire);
     expect(traced.lineage.nodes.length).toBeGreaterThan(0);
     expect(isIssuedTypedMigrationCellLineage(traced.lineage)).toBe(true);
     expect(traced.lineage.verification).toBe('PURE_TYPED_CELL_LINEAGE_NOT_DATABASE_REFERENCE_OR_OWNERSHIP_VERIFICATION');
    }
   }
  }
  expect(await allOriginalRows()).toEqual(before);
  expect(result.facts.fence).toMatchObject({phase:'FENCED',actor:null,manifest:null});
 });
 it('preserves arbitrary-precision JSON numeric wire during typed capture while the legacy capture still refuses it',async()=>{
  await resetFence();
  await client.query("UPDATE employee_scheduling_settings SET operational_rule_profile='{\"number\":9007199254740993,\"fraction\":0.123456789012345678901,\"scale\":1.00}'::jsonb WHERE employee_id='capture-owner'");
  try{
   expect(await capture()).toEqual({status:'BLOCKED',code:'LOSSLESS_JSON_NUMBER_UNSUPPORTED'});
   const before=await allOriginalRows();
   const actual=(await client.query("SELECT operational_rule_profile::text raw FROM employee_scheduling_settings WHERE employee_id='capture-owner'")).rows[0].raw;
   const result=await captureTypedTenantMigrationFacts(client,request);
   expect(result.status,JSON.stringify(result)).toBe('CAPTURED');
   if(result.status!=='CAPTURED')throw new Error('Expected typed JSON capture');
  inspectedTypedCapture(result.facts);
   const row=result.facts.tables.find(t=>t.table==='employee_scheduling_settings')!.rows.find(r=>r.key[0]==='capture-owner')!;
   const column=row.columns.find(c=>c.name==='operational_rule_profile')!;
   expect(column.wire).toBe(actual);
   expect(JSON.stringify(column.value)).toContain('9007199254740993');
   expect(JSON.stringify(column.value)).toContain('0.123456789012345678901');
   expect(JSON.stringify(column.value)).toContain('1.00');
   const traced=traverseTypedMigrationWireValue(column.value);
   expect(traced.status).toBe('TRAVERSED');if(traced.status!=='TRAVERSED')throw Error('Expected exact captured JSON lineage');
   expect(traced.lineage.nodes.filter(n=>n.value.kind==='JSON_NUMBER').map(n=>n.value)).toEqual(expect.arrayContaining([
    {kind:'JSON_NUMBER',lexeme:'9007199254740993'},{kind:'JSON_NUMBER',lexeme:'0.123456789012345678901'},{kind:'JSON_NUMBER',lexeme:'1.00'}
   ]));
   expect(await allOriginalRows()).toEqual(before);
  }finally{
   await resetFence();await client.query("UPDATE employee_scheduling_settings SET operational_rule_profile=NULL WHERE employee_id='capture-owner'");
  }
 });
 it('does not claim rollback when typed-capture COMMIT actually completed but its acknowledgement is lost',async()=>{
  await resetFence();
  const before=await allOriginalRows(),original=client.query.bind(client);
  let rollbackCalls=0;
  const spy=vi.spyOn(client,'query').mockImplementation((async(...args:Parameters<Client['query']>)=>{
   if(args[0]==='ROLLBACK')rollbackCalls++;
   const result=await Reflect.apply(original,client,args);
   if(args[0]==='COMMIT')throw new Error('fictional lost COMMIT acknowledgement PRIVATE_CAPTURE_PAYLOAD');
   return result;
  }) as Client['query']);
  try{
   expect(await captureTypedTenantMigrationFacts(client,request)).toEqual({status:'UNCERTAIN',code:'CAPTURE_COMMIT_OUTCOME_UNKNOWN',reconciliation:'FRESH_OWNED_CLIENT_ORIGINAL_REQUEST_REQUIRED'});
   expect(rollbackCalls).toBe(0);
   expect(client.getTransactionStatus()).toBe('I');
   expect((await other.query('SELECT phase,fence_generation::text generation FROM nevora_tenancy.expansion_protocol')).rows[0]).toEqual({phase:'FENCED',generation:'1'});
   expect(await allOriginalRows()).toEqual(before);
  }finally{spy.mockRestore();await resetFence();}
 });
 it('rolls back only its own attempted BEGIN when the server entered the transaction but its acknowledgement is lost',async()=>{
  await resetFence();
  const original=client.query.bind(client);let rollbackCalls=0;
  const spy=vi.spyOn(client,'query').mockImplementation((async(...args:Parameters<Client['query']>)=>{
   if(args[0]==='ROLLBACK')rollbackCalls++;
   const result=await Reflect.apply(original,client,args);
   if(args[0]==='BEGIN ISOLATION LEVEL SERIALIZABLE')throw new Error('fictional lost BEGIN acknowledgement PRIVATE_CAPTURE_PAYLOAD');
   return result;
  }) as Client['query']);
  try{
   expect(await captureTypedTenantMigrationFacts(client,request)).toEqual({status:'BLOCKED',code:'CAPTURE_FAILED'});
   expect(rollbackCalls).toBe(1);
   expect(client.getTransactionStatus()).toBe('I');
   expect((await other.query('SELECT phase,fence_generation::text generation FROM nevora_tenancy.expansion_protocol')).rows[0]).toEqual({phase:'EXPANDED_LEGACY',generation:'0'});
  }finally{spy.mockRestore();await client.query('ROLLBACK');}
 });
 it('reports unconfirmed rollback as uncertain without exposing raw failures or claiming the fence was restored',async()=>{
  await resetFence();const original=client.query.bind(client);
  const spy=vi.spyOn(client,'query').mockImplementation((async(...args:Parameters<Client['query']>)=>{
   const result=await Reflect.apply(original,client,args);
   const text=typeof args[0]==='string'?args[0]:(args[0] as {text?:string}).text;
   if(text==='SELECT pg_current_snapshot()::text'||text==='ROLLBACK')throw new Error('fictional lost rollback acknowledgement PRIVATE_CAPTURE_PAYLOAD');
   return result;
  }) as Client['query']);
  try{
   expect(await captureTypedTenantMigrationFacts(client,request)).toEqual({status:'UNCERTAIN',code:'CAPTURE_ROLLBACK_UNCONFIRMED',reconciliation:'FRESH_OWNED_CLIENT_ORIGINAL_REQUEST_REQUIRED'});
   expect(client.getTransactionStatus()).toBe('I');
   expect((await other.query('SELECT phase,fence_generation::text generation FROM nevora_tenancy.expansion_protocol')).rows[0]).toEqual({phase:'EXPANDED_LEGACY',generation:'0'});
  }finally{spy.mockRestore();await client.query('ROLLBACK');}
 });
 it('detaches the exact typed-capture request before an awaited identity observation',async()=>{
  await resetFence();
  const supplied=JSON.parse(canonicalOwnershipJson(request)) as MigrationCaptureRequest,original=client.query.bind(client);
  let altered=false;
  const spy=vi.spyOn(client,'query').mockImplementation((async(...args:Parameters<Client['query']>)=>{
   const result=await Reflect.apply(original,client,args);
   const text=typeof args[0]==='string'?args[0]:(args[0] as {text?:string}).text;
   if(!altered&&text?.startsWith('SELECT current_database()')){
    altered=true;supplied.sourceDigest='b'.repeat(64);supplied.catalogBaseline.sourceDigest=supplied.sourceDigest;supplied.expectedFenceGeneration='999';
   }
   return result;
  }) as Client['query']);
  try{
   const result=await captureTypedTenantMigrationFacts(client,supplied);
   expect(altered).toBe(true);expect(result.status,JSON.stringify(result)).toBe('CAPTURED');
   if(result.status==='CAPTURED'){expect(result.facts.sourceDigest).toBe(request.sourceDigest);expect(result.facts.fence.generation).toBe('1');}
  }finally{spy.mockRestore();await resetFence();}
 });
 it('waits for an already-open legacy writer BEFORE protocol locking and sees its committed row',async()=>{
  await resetFence();await other.query('BEGIN');await other.query("UPDATE employees SET phone='writer-before-capture' WHERE id='capture-owner'");
  const backend=(await client.query('SELECT pg_backend_pid() pid')).rows[0].pid;
  let completed=false;
  const pending=capture().then(o=>{completed=true;return o;});
  // Observe the actual lock wait rather than infer it from elapsed sleep.
  let waiting=false;
  for(let n=0;n<100;n++){
   const locks=(await other.query("SELECT EXISTS(SELECT 1 FROM pg_locks WHERE pid=$1 AND NOT granted) waiting",[backend])).rows[0];
   if(locks.waiting){waiting=true;break;}
   await new Promise(r=>setTimeout(r,10));
  }
  const hadCompleted=completed;
  await other.query('COMMIT');
  expect(waiting).toBe(true);expect(hadCompleted).toBe(false);
  const result=await pending;expect(result.status,JSON.stringify(result)).toBe('CAPTURED');
  if(result.status==='CAPTURED')expect(result.facts.tables.find(t=>t.table==='employees')!.rows.find(r=>r.values.id==='capture-owner')!.values.phone).toBe('writer-before-capture');
  await resetFence();await client.query("UPDATE employees SET phone='000' WHERE id='capture-owner'");
 },15000);
 it('includes inactive position/break namespaces and uses the actual DB comparison rank over every row',async()=>{
  await resetFence();
  await client.query("INSERT INTO positions(id,workspace_id,name,active) VALUES('capture-position','workspace-fuel','Ω Inactive',false)");
  await client.query("INSERT INTO clocker_break_types(id,workspace_id,name,category,active,created_by,updated_by) VALUES('capture-break','workspace-fuel','Ω Inactive','REST',false,'capture-owner','capture-owner')");
  const facts=await ready();
  for(const [id,table]of [['positions.name_ci','positions'],['clocker_break_types.name_ci','clocker_break_types']]){
   const actual=facts.namespaceComparators.rows.filter(r=>r.contractId===id);
   expect(actual).toHaveLength(1);expect(actual[0].included).toBe(true);
   const c=facts.namespaceComparators.catalogs.find(c=>c.contractId===id)!.definition.indexCollation;
   const expected=(await client.query('SELECT lower(name) expression,dense_rank() OVER(ORDER BY lower(name) COLLATE '+quote(c.schema)+'.'+quote(c.name)+')::text class FROM public.'+quote(table))).rows[0];
   expect(actual[0].expressionValue).toBe(expected.expression);expect(actual[0].comparisonClass).toBe(expected.class);
  }
  await resetFence();
  await client.query("DELETE FROM positions WHERE id='capture-position'");
  await client.query("DELETE FROM clocker_break_types WHERE id='capture-break'");
  expect(await allOriginalRows()).toEqual(initialRows);
 });
 it('rejects a new legacy writer after committed FENCED capture and grants no metadata attribution',async()=>{
  await resetFence();await ready();
  await expect(other.query("UPDATE employees SET phone='writer-after-fence' WHERE id='capture-owner'")).rejects.toMatchObject({code:'55000'});
  await expect(other.query("UPDATE employees SET workspace_id='workspace-fuel' WHERE id='capture-owner'")).rejects.toMatchObject({code:'55000'});
  expect(await allOriginalRows()).toEqual(initialRows);
  expect(canonicalOwnershipJson(request).includes(readFileSync(lease.credentialFile,'utf8'))).toBe(false);
 });
 it('blocks a writer starting AFTER source locks, then rejects it under the committed protocol without a lock cycle',async()=>{
  await resetFence();
  const backend=(await client.query('SELECT pg_backend_pid() pid')).rows[0].pid;
  const otherBackend=(await other.query('SELECT pg_backend_pid() pid')).rows[0].pid;
  const original=client.query.bind(client);
  let signal:()=>void=()=>{},release:()=>void=()=>{};
  const acquired=new Promise<void>(r=>{signal=r;}),hold=new Promise<void>(r=>{release=r;});
  const spy=vi.spyOn(client,'query').mockImplementation((async(...args:Parameters<Client['query']>)=>{
   const result=await Reflect.apply(original,client,args);
   if(typeof args[0]==='string'&&args[0].startsWith('LOCK TABLE public.')){signal();await hold;}
   return result;
  }) as Client['query']);
  let waiting=false,result;
  const pending=capture();
  await acquired;
  const writer=other.query("UPDATE employees SET phone='writer-during-capture' WHERE id='capture-owner'").then(()=>({code:'UNEXPECTED_WRITE'}),e=>({code:e.code as string}));
  try{
   for(let n=0;n<100;n++){
    const state=(await admin.query("SELECT EXISTS(SELECT 1 FROM pg_locks WHERE pid=$1 AND NOT granted) waiting,pg_blocking_pids($1) blockers",[otherBackend])).rows[0];
    if(state.waiting&&state.blockers.includes(backend)){waiting=true;break;}
    await new Promise(r=>setTimeout(r,10));
   }
  }finally{release();result=await pending;spy.mockRestore();}
  expect(waiting).toBe(true);expect(result.status,JSON.stringify(result)).toBe('CAPTURED');expect(await writer).toEqual({code:'55000'});
  expect(await allOriginalRows()).toEqual(initialRows);
 },15000);
 it('rejects noncanonical array bounds instead of flattening source identity',async()=>{
  await resetFence();
  await client.query("INSERT INTO calendar_subscriptions(id,workspace_id,employee_id,digest,generation,allowed_location_ids,revoked_at,revocation_reason) VALUES('00000000-0000-4000-8000-000000000004','workspace-fuel','capture-null',$1,'00000000-0000-4000-8000-000000000005','[0:0]={loc-1}'::text[],clock_timestamp(),'fictional-boundary')",['d'.repeat(64)]);
  expect(await capture()).toEqual({status:'BLOCKED',code:'UNSUPPORTED_ARRAY_DIMENSIONS'});
  expect((await client.query('SELECT phase FROM nevora_tenancy.expansion_protocol')).rows[0].phase).toBe('EXPANDED_LEGACY');
 });

 it('preserves actual native SQL array bounds without claiming a parsed or legacy array projection',async()=>{
  await resetFence();
  const before=await allOriginalRows();
  const result=await captureTypedTenantMigrationFacts(client,request);
  expect(result.status,JSON.stringify(result)).toBe('CAPTURED');
  if(result.status!=='CAPTURED')throw new Error('Expected typed array capture');
  inspectedTypedCapture(result.facts);
  const row=result.facts.tables.find(t=>t.table==='calendar_subscriptions')!.rows.find(r=>r.key[0]==='00000000-0000-4000-8000-000000000004')!;
  const column=row.columns.find(c=>c.name==='allowed_location_ids')!;
  expect(column.wire).toBe('[0:0]={loc-1}');
  expect(JSON.stringify(column.value)).toContain('[0:0]={loc-1}');
  const parsed=parseLosslessTextArrayWire(column.wire);
  expect(parsed.status).toBe('PARSED');
  if(parsed.status!=='PARSED')throw new Error('Expected exact captured native array parsing');
  expect(parsed.envelope.dimensions).toEqual([{lowerBound:0,length:1}]);
  expect(parsed.envelope.elements).toEqual(['loc-1']);
  expect(parsed.envelope.wire.text).toBe(column.wire);
  expect(isIssuedLosslessTextArrayEnvelope(parsed.envelope)).toBe(true);
  expect(parsed.envelope.verification).toBe('PURE_ARRAY_PARSE_NOT_DATABASE_VERIFICATION');
  const traced=traverseTypedMigrationWireValue(column.value);
  expect(traced.status).toBe('TRAVERSED');if(traced.status!=='TRAVERSED')throw Error('Expected exact captured native-array lineage');
  expect(traced.lineage.nodes).toEqual([
   {address:[],value:{kind:'SQL_ARRAY',dimensions:[{lowerBound:0,length:1}],elementCount:1}},
   {address:[{kind:'SQL_ARRAY_ELEMENT',ordinal:0,subscripts:[0]}],value:{kind:'SQL_ARRAY_TEXT',text:'loc-1'}}
  ]);
  expect(await allOriginalRows()).toEqual(before);
 });
 it('blocks a JSON literal null that the existing manifest cannot distinguish from SQL NULL',async()=>{
  const name=db.name+'_null',marker=db.marker+':null';
  await admin.query('CREATE DATABASE '+quote(name));
  const oid=(await admin.query('SELECT oid::text oid FROM pg_database WHERE datname=$1',[name])).rows[0].oid;
  await admin.query('COMMENT ON DATABASE '+quote(name)+" IS '"+marker+"'");
  writeFileSync(join(process.env.F_CAPTURE_RUN_DIR!,'null-database-custody.json'),JSON.stringify({name,oid,marker,createdByThisInvocation:true,closed:false},null,2),{flag:'wx'});
  const isolated=connect(name);await isolated.connect();
  try{
   for(const source of request.migrations)await isolated.query(source.text);
   await isolated.query("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('null-owner','Fictional','Null','000','OWNER','loc-1')");
   await isolated.query("INSERT INTO calendar_operations(workspace_id,actor_employee_id,operation_id,authority,payload_hash,result) VALUES('workspace-fuel','null-owner','00000000-0000-4000-8000-000000000006',$1,$1,'null'::jsonb)",['a'.repeat(64)]);
   await isolated.query(readFileSync(resolve('db/migrations/0026_tenant_ownership_expand.sql'),'utf8'));
   await isolated.query('SET search_path=pg_catalog');
   const baseline=await observeMigrationCatalog(isolated);
   const local={...request,identity:{...request.identity,database:name,databaseOid:oid,marker},catalogBaseline:{...request.catalogBaseline,catalogDigest:baseline.digest}};
   expect(await captureTenantMigrationFacts(isolated,local)).toEqual({status:'BLOCKED',code:'SQL_JSON_NULL_REPRESENTATION_UNSUPPORTED'});
   expect((await isolated.query('SELECT phase,fence_generation::text generation FROM nevora_tenancy.expansion_protocol')).rows[0]).toEqual({phase:'EXPANDED_LEGACY',generation:'0'});
   const originals=(await isolated.query("SELECT result::text raw,authority FROM public.calendar_operations WHERE operation_id='00000000-0000-4000-8000-000000000006'")).rows;
   const typed=await captureTypedTenantMigrationFacts(isolated,local);
   expect(typed.status,JSON.stringify(typed)).toBe('CAPTURED');
   if(typed.status!=='CAPTURED')throw new Error('Expected distinct JSON null capture');
   inspectedTypedCapture(typed.facts,local);
   const operation=typed.facts.tables.find(t=>t.table==='calendar_operations')!.rows[0];
   expect(operation.columns.find(c=>c.name==='result')!.wire).toBe('null');
   const employee=typed.facts.tables.find(t=>t.table==='employees')!.rows.find(r=>r.key[0]==='null-owner')!;
   expect(employee.columns.find(c=>c.name==='email')!.wire).toBeNull();
   expect(operation.columns.find(c=>c.name==='result')!.value).not.toEqual(employee.columns.find(c=>c.name==='email')!.value);
   for(const [column,expected] of [[operation.columns.find(c=>c.name==='result')!,'JSON_NULL'],[employee.columns.find(c=>c.name==='email')!,'SQL_NULL']] as const){
    const traced=traverseTypedMigrationWireValue(column.value);
    expect(traced.status).toBe('TRAVERSED');if(traced.status!=='TRAVERSED')throw Error('Expected captured null lineage');
    expect(traced.lineage.nodes).toEqual([{address:[],value:{kind:expected}}]);
   }
   expect((await isolated.query("SELECT result::text raw,authority FROM public.calendar_operations WHERE operation_id='00000000-0000-4000-8000-000000000006'")).rows).toEqual(originals);

  }finally{
   await isolated.end();
   expect((await admin.query("SELECT oid::text oid,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=$1",[name])).rows[0]).toEqual({oid,marker});
   await admin.query('DROP DATABASE '+quote(name));
   writeFileSync(join(process.env.F_CAPTURE_RUN_DIR!,'null-database-closed.json'),JSON.stringify({name,oid,marker,closed:true},null,2),{flag:'wx'});
  }
 },30000);

});
