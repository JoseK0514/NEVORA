import { describe, expect, it } from 'vitest';
import { loadPinnedMigrations } from '../inventory/source';
import { getOwnershipRegistry, OWNERSHIP_SCHEMA_COMMIT, OWNERSHIP_SCHEMA_TREE, ownershipDigest, canonicalOwnershipJson, type JsonValue } from './ownership';
import { preflightTenantBackfill, resumeTenantBackfill, planNewOwnershipWrite, type BackfillCapture, type LegacyRow, type TableCapture, type OwnershipRecord, type HistoricalReference } from './backfill';
const digest='a'.repeat(64);
const registry=()=>getOwnershipRegistry();
const rule=(name:string)=>registry().tables.find(t=>t.table===name)!;
const key=(name:string,row:LegacyRow)=>rule(name).primaryKey.map(c=>row.values[c]);
const row=(table:string,values:Record<string,JsonValue>):LegacyRow=>{
 const r={values:Object.fromEntries(rule(table).columns.map(c=>[c.name,c.nullable?null:c.type==='boolean'?false:/^(integer|bigint|numeric)/.test(c.type)?1:c.type==='jsonb'?{}:c.type.endsWith('[]')?[]:/^(date|time|timestamp)/.test(c.type)?'2030-01-01T00:00:00Z':'fixture'])) as Record<string,JsonValue>,originalChecksum:''};
 Object.assign(r.values,values);r.originalChecksum=ownershipDigest(r.values);return r;
};
// These are fictional captured DB results, not JavaScript casing or a DB adapter.
const comparatorSources=[
 {contractId:'employees.email_ci',table:'employees',column:'email',index:'employees_email_unique',line:31,path:'db/migrations/0001_initial.sql',statement:'CREATE UNIQUE INDEX IF NOT EXISTS employees_email_unique\n  ON employees (lower(email))\n  WHERE email IS NOT NULL;',expression:'lower(email)',predicate:'(email IS NOT NULL)',indexDefinition:'CREATE UNIQUE INDEX employees_email_unique ON public.employees USING btree (lower(email)) WHERE (email IS NOT NULL)'},
 {contractId:'positions.name_ci',table:'positions',column:'name',index:'positions_workspace_name_unique',line:42,path:'db/migrations/0008_workspace_positions.sql',statement:'CREATE UNIQUE INDEX positions_workspace_name_unique ON positions (workspace_id, lower(name));',expression:'lower(name)',predicate:null,indexDefinition:'CREATE UNIQUE INDEX positions_workspace_name_unique ON public.positions USING btree (workspace_id, lower(name))'},
 {contractId:'clocker_break_types.name_ci',table:'clocker_break_types',column:'name',index:'clocker_break_type_name',line:16,path:'db/migrations/0014_clocker_breaks.sql',statement:'CREATE UNIQUE INDEX clocker_break_type_name ON clocker_break_types(workspace_id,lower(name));',expression:'lower(name)',predicate:null,indexDefinition:'CREATE UNIQUE INDEX clocker_break_type_name ON public.clocker_break_types USING btree (workspace_id, lower(name))'},
 {contractId:'schedule_templates.active_name_ci',table:'schedule_templates',column:'name',index:'schedule_templates_name_unique',line:91,path:'db/migrations/0003_schedule_assistance.sql',statement:'CREATE UNIQUE INDEX IF NOT EXISTS schedule_templates_name_unique\n  ON schedule_templates (lower(name))\n  WHERE active = true;',expression:'lower(name)',predicate:'(active = true)',indexDefinition:'CREATE UNIQUE INDEX schedule_templates_name_unique ON public.schedule_templates USING btree (lower(name)) WHERE (active = true)'},
];
const collation=()=>({oid:'100',schema:'pg_catalog',name:'default',provider:'d',deterministic:true,encoding:-1,lcCollate:'C',lcCtype:'C',locale:null,version:null,actualVersion:null});
type BaseCapture=Omit<BackfillCapture,'namespaceComparators'>;
function fictionalComparators(c:BaseCapture){
 const binding={registryDigest:c.registryDigest,sourceDigest:c.sourceDigest,schemaDigest:c.currentSchemaDigest,snapshotId:c.snapshot.id,rowSetChecksum:ownershipDigest([...c.tables].sort((a,b)=>a.table<b.table?-1:1).map(t=>({table:t.table,count:t.expectedCount,checksum:t.expectedChecksum})))};
 const catalogs=comparatorSources.map(s=>{
  const value={contractId:s.contractId,source:{path:s.path,line:s.line},sourceStatementChecksum:ownershipDigest(s.statement),definition:{indexDefinition:s.indexDefinition,expression:s.expression,predicate:s.predicate,expressionCollation:collation(),indexCollation:collation(),serverVersion:'18.4 fictional',serverEncoding:'UTF8'}};
  return {...value,checksum:ownershipDigest(value)};
 });
 const rows=comparatorSources.flatMap(s=>c.tables.find(t=>t.table===s.table)!.rows.map(r=>{
  const included=s.table==='employees'?r.values.email!==null:s.table==='schedule_templates'?r.values.active===true:true;
  const expressionValue=r.values[s.column] as string|null;
  return {contractId:s.contractId,key:key(s.table,r),rowChecksum:r.originalChecksum,included,expressionValue,comparisonClass:included?expressionValue:null};
 }));
 const value={binding,catalogs,rows};return {...value,captureChecksum:ownershipDigest(value)};
}
type ComparatorCapture=ReturnType<typeof fictionalComparators>;
type FixtureCapture=BackfillCapture&{namespaceComparators:ComparatorCapture};
function resealComparators(c:FixtureCapture){
 const {binding,catalogs,rows}=c.namespaceComparators;
 c.namespaceComparators.captureChecksum=ownershipDigest({binding,catalogs:[...catalogs].sort((a,b)=>a.contractId<b.contractId?-1:1),rows:[...rows].sort((a,b)=>canonicalOwnershipJson([a.contractId,a.key])<canonicalOwnershipJson([b.contractId,b.key])?-1:1)});
}
function seal(c:BaseCapture):FixtureCapture {
 for(const t of c.tables){for(const r of t.rows)r.originalChecksum=ownershipDigest(r.values);t.expectedCount=t.rows.length;t.expectedChecksum=ownershipDigest(t.rows.map(r=>({key:key(t.table,r),checksum:r.originalChecksum})).sort((a,b)=>canonicalOwnershipJson(a.key).localeCompare(canonicalOwnershipJson(b.key))));}
 for(const m of c.mappings){const r=c.tables.find(t=>t.table===m.table)?.rows.find(r=>canonicalOwnershipJson(key(m.table,r))===canonicalOwnershipJson(m.key));if(r)m.rowChecksum=r.originalChecksum;}
 (c as FixtureCapture).namespaceComparators=fictionalComparators(c);resealComparators(c as FixtureCapture);return c as FixtureCapture;
}
function fixture():FixtureCapture {
 const r=registry(),c:BaseCapture={migrations:loadPinnedMigrations({repo:process.cwd(),source:OWNERSHIP_SCHEMA_COMMIT,tree:OWNERSHIP_SCHEMA_TREE}).migrations,registryDigest:r.digest,sourceDigest:digest,currentSchemaDigest:r.schemaDigest,snapshot:{id:'owned-fictional-snapshot-1',isolation:'SERIALIZABLE',includesInactive:true,includesHistory:true},tables:r.tables.map(t=>({table:t.table,rows:[],expectedCount:0,expectedChecksum:''})),mappings:[],historicalReferences:[],payloadCaptures:[],writeFence:{mode:'EXCLUSIVE_FENCED',sourceDigest:digest,schemaDigest:r.schemaDigest,databaseFenceToken:'owned-fixture-fence',allWritersCovered:true,immutableOwnershipEnabled:true,registeredWriterDigest:digest,newWriteJournalDigest:digest,newWritesReconciled:true},chunkSize:2};
 add(c,'workspaces',{id:'A',active:false});add(c,'locations',{id:'LA',workspace_id:'A',clocker_key:'2',active:false});
 add(c,'employees',{id:'007',primary_location_id:'LA',active:false});
 c.mappings.push({table:'employees',key:['007'],workspaceId:'A',rowChecksum:'',evidenceDigest:digest});
 return seal(c);
}
function add(c:BaseCapture,t:string,v:Record<string,JsonValue>){c.tables.find(x=>x.table===t)!.rows.push(row(t,v));}
const codes=(c:BackfillCapture)=>preflightTenantBackfill(c).diagnostics.map(x=>x.code);
const historic=(target:string,key:JsonValue[],sourceRowChecksum:string,workspaceId='A'):HistoricalReference=>({target,targetColumns:rule(target).primaryKey,key,workspaceId,evidenceDigest:digest,sourceRowChecksum});
describe('complete-row migration preflight without SQL or rewritten history',()=>{
 it('plans inactive/historical rows with stable legacy IDs and full original-column checksums',()=>{
  const c=fixture(),before=canonicalOwnershipJson(c),p=preflightTenantBackfill(c);
  expect(p.status).toBe('READY_FOR_GUARDED_EXECUTION');expect(p.entries.find(x=>x.table==='employees')).toMatchObject({key:['007'],workspaceId:'A',sourceChecksum:c.tables.find(t=>t.table==='employees')!.rows[0].originalChecksum});
  expect(p.preservesAllOriginalColumns).toBe(true);expect(p.verification).toBe('PURE_PREFLIGHT_NOT_DATABASE_VERIFICATION');expect(canonicalOwnershipJson(c)).toBe(before);
 });
 it('refuses missing employee mapping even when current primary location resolves',()=>{const c=fixture();c.mappings=[];expect(codes(c)).toContain('MAPPING_REQUIRED');});
 it('rejects conflicting direct/actor/location ancestry rather than defaulting to Fuel',()=>{const c=fixture();add(c,'workspaces',{id:'B'});c.mappings[0].workspaceId='B';seal(c);expect(codes(c)).toContain('ANCESTRY_CONFLICT');});
 it('requires a complete capture of every classified table, even empty ones',()=>{const c=fixture();c.tables=c.tables.filter(t=>t.table!=='timecard_revisions');expect(codes(c)).toContain('TABLE_CAPTURE_REQUIRED');});
 it('rejects duplicate PKs, row count drift and checksum drift',()=>{const c=fixture();c.tables.find(t=>t.table==='employees')!.expectedCount=2;expect(codes(c)).toContain('COUNT_DRIFT');const b=fixture();b.tables.find(t=>t.table==='employees')!.rows[0].values.first_name='changed';expect(codes(b)).toContain('ROW_CHECKSUM_DRIFT');const d=fixture();d.tables.find(t=>t.table==='employees')!.rows.push(d.tables.find(t=>t.table==='employees')!.rows[0]);seal(d);expect(codes(d)).toContain('DUPLICATE_ROW_KEY');});
 it('rejects source or original-column shape drift and emits no partial executable plan',()=>{const c=fixture();c.migrations[0].text+='\n';expect(codes(c)).toContain('SOURCE_DRIFT');const d=fixture();d.tables.find(t=>t.table==='employees')!.rows[0].values.workspace_id='A';seal(d);const p=preflightTenantBackfill(d);expect(p.diagnostics.map(x=>x.code)).toContain('ROW_SHAPE_DRIFT');expect(p.entries).toEqual([]);expect(p.chunks).toEqual([]);});
 it('rejects an orphan immutable parent',()=>{const c=fixture();add(c,'employee_credentials',{employee_id:'missing'});seal(c);expect(codes(c)).toContain('ORPHAN_REFERENCE');});
 it('does not accept current-active-only or unfenced snapshot capture',()=>{const c=fixture();c.snapshot.includesInactive=false;expect(codes(c)).toContain('INCOMPLETE_SNAPSHOT');const d=fixture();d.writeFence.allWritersCovered=false;expect(codes(d)).toContain('UNFENCED_WRITER');});
 it('does not accept unreconciled new writes or schema/source mismatched writer protocol',()=>{const c=fixture();c.writeFence.mode='DUAL_WRITE';c.writeFence.newWritesReconciled=false;expect(codes(c)).toContain('NEW_WRITES_UNRECONCILED');const d=fixture();d.writeFence.sourceDigest='b'.repeat(64);expect(codes(d)).toContain('WRITE_FENCE_DRIFT');});
 it('preserves global hashed recovery scopes without hash inversion or guessed tenant',()=>{const c=fixture();add(c,'password_recovery_limits',{scope:digest,bucket:2103840,attempts:2});seal(c);expect(preflightTenantBackfill(c).entries.find(e=>e.table==='password_recovery_limits')).toMatchObject({workspaceId:null,storage:'GLOBAL_SECURITY_CONTROL'});});
 it('discriminates DEVICE versus WORKSPACE PIN limiter ancestry',()=>{const c=fixture();add(c,'clocker_devices',{id:'D',location_id:'LA'});add(c,'clocker_pin_limits',{scope:'DEVICE',scope_id:'D'});seal(c);expect(preflightTenantBackfill(c).entries.find(e=>e.table==='clocker_pin_limits')?.workspaceId).toBe('A');const d=fixture();add(d,'clocker_pin_limits',{scope:'DEVICE',scope_id:'A'});seal(d);expect(codes(d)).toContain('ORPHAN_REFERENCE');});
 it('retains PERSON limiter rows with exact employee ancestry and rejects orphan identities',()=>{
  const c=fixture();add(c,'clocker_pin_limits',{scope:'PERSON',scope_id:'007'});seal(c);
  expect(preflightTenantBackfill(c).entries.find(e=>e.table==='clocker_pin_limits')).toMatchObject({workspaceId:'A',key:['PERSON','007']});
  const missing=fixture();add(missing,'clocker_pin_limits',{scope:'PERSON',scope_id:'A'});seal(missing);expect(codes(missing)).toContain('ORPHAN_REFERENCE');
 });
 it('requires row-specific installation evidence while retaining calendar serial/time and original singleton key',()=>{const c=fixture();add(c,'calendar_clock',{singleton:true,serial:187,modified_at:'2030-01-01T00:00:00Z'});seal(c);expect(codes(c)).toContain('INSTALLATION_PROVENANCE_REQUIRED');const t=c.tables.find(t=>t.table==='calendar_clock')!.rows[0];c.installation={workspaceId:'A',evidenceDigest:digest,coveredRows:[{table:'calendar_clock',key:[true],rowChecksum:t.originalChecksum}]};expect(preflightTenantBackfill(c).entries.find(e=>e.table==='calendar_clock')).toMatchObject({key:[true],workspaceId:'A',sourceChecksum:t.originalChecksum});});
 it('detects normalized tenant-local legacy number collisions without changing either ID or excluding inactive employees',()=>{const c=fixture();add(c,'employees',{id:' 007 ',primary_location_id:'LA',active:false});c.mappings.push({table:'employees',key:[' 007 '],workspaceId:'A',rowChecksum:'',evidenceDigest:digest});seal(c);expect(codes(c)).toContain('NAMESPACE_COLLISION');});
 it('requires historical captured lineage even if a deleted source ID has been reused by a different live tenant',()=>{const c=fixture();add(c,'schedule_publication_revisions',{id:'R',created_by:'007',week_start:'2030-01-07',revision_number:1});add(c,'schedule_publication_revision_shifts',{id:'H',revision_id:'R',source_shift_id:'erased',schedule_id:'erased-schedule',location_id:'LA',employee_id:'007'});seal(c);expect(codes(c)).toContain('HISTORY_EVIDENCE_REQUIRED');const h=c.tables.find(t=>t.table==='schedule_publication_revision_shifts')!.rows[0];for(const [target,id] of [['shifts','erased'],['schedules','erased-schedule'],['locations','LA'],['employees','007']])c.historicalReferences.push(historic(target,[id],h.originalChecksum));expect(preflightTenantBackfill(c).status).toBe('READY_FOR_GUARDED_EXECUTION');});
 it('blocks absent/incomplete JSON or array lineage capture and validates each literal reference',()=>{const c=fixture();add(c,'calendar_subscriptions',{id:'C',workspace_id:'A',employee_id:'007',allowed_location_ids:['LA']});seal(c);expect(codes(c)).toContain('PAYLOAD_LINEAGE_REQUIRED');const contract=rule('calendar_subscriptions').payloads.find(p=>p.column==='allowed_location_ids')!;c.payloadCaptures.push({table:'calendar_subscriptions',key:['C'],column:'allowed_location_ids',contractId:contract.contractId,valueDigest:ownershipDigest(['LA']),bindings:[],unresolvedPaths:[],reviewEvidenceDigest:digest});expect(codes(c)).toContain('PAYLOAD_COVERAGE_GAP');c.payloadCaptures[0].bindings=[{path:['0'],kind:'REFERENCE',target:'locations',targetColumns:['id'],key:['LA'],historical:false}];expect(preflightTenantBackfill(c).status).toBe('READY_FOR_GUARDED_EXECUTION');c.payloadCaptures[0].bindings[0].key=['foreign'];expect(codes(c)).toContain('PAYLOAD_LITERAL_DRIFT');});
 it('refuses array identity leaves mislabeled as nonidentity data',()=>{const c=fixture();add(c,'calendar_subscriptions',{id:'C',workspace_id:'A',employee_id:'007',allowed_location_ids:['LA']});seal(c);const contract=rule('calendar_subscriptions').payloads.find(p=>p.column==='allowed_location_ids')!;c.payloadCaptures.push({table:'calendar_subscriptions',key:['C'],column:'allowed_location_ids',contractId:contract.contractId,valueDigest:ownershipDigest(['LA']),bindings:[{path:['0'],kind:'DATA'}],unresolvedPaths:[],reviewEvidenceDigest:digest});expect(codes(c)).toContain('PAYLOAD_CLASSIFICATION_CONFLICT');});
 it('uses a typed metadata sidecar whose identity mirror cannot alter historical actors',()=>{const c=fixture();add(c,'clocker_pin_events',{id:'PIN-E',employee_id:'007',actor_employee_id:'007',pin_version:4,occurred_at:'2029-03-01T00:00:00Z'});seal(c);const e=preflightTenantBackfill(c).entries.find(e=>e.table==='clocker_pin_events')!;expect(e.sidecar).toBe('clocker_pin_events_tenant_ownership');expect(e.mirroredIdentity).toMatchObject({id:'PIN-E',employee_id:'007',actor_employee_id:'007'});});

 it('requires declared JSON identity literals to be references and fails closed for unresolved captured leaves',()=>{
  const c=fixture();add(c,'shifts',{id:'S',schedule_id:'SCH',employee_id:'007',generated_claims:{version:1,claims:[{positionId:'P'}]}});
  add(c,'schedules',{id:'SCH',location_id:'LA',created_by:'007'});
  add(c,'positions',{id:'P',workspace_id:'A'});seal(c);
  const contract=rule('shifts').payloads.find(p=>p.column==='generated_claims')!,value=c.tables.find(t=>t.table==='shifts')!.rows[0].values.generated_claims;
  c.payloadCaptures.push({table:'shifts',key:['S'],column:'generated_claims',contractId:contract.contractId,valueDigest:ownershipDigest(value),bindings:[{path:['version'],kind:'DATA'},{path:['claims','0','positionId'],kind:'DATA'}],unresolvedPaths:[],reviewEvidenceDigest:digest});
  expect(codes(c)).toContain('PAYLOAD_CLASSIFICATION_CONFLICT');
  c.payloadCaptures[0].bindings[1]={path:['claims','0','positionId'],kind:'REFERENCE',target:'positions',targetColumns:['id'],key:['P']};
  expect(preflightTenantBackfill(c).status).toBe('READY_FOR_GUARDED_EXECUTION');
  c.payloadCaptures[0].unresolvedPaths=[['claims','0','positionId']];expect(codes(c)).toContain('PAYLOAD_UNRESOLVED');
 });
 it('blocks historical witness row/source mismatch and conflicting tenant ancestry without inspecting a current replacement row',()=>{
  const c=fixture();add(c,'schedule_generation_exclusions',{id:'G',workspace_id:'A',location_id:'LA',created_by:'007',deleted_source_shift_id:'old-shift',claims:{version:1,claims:[]}});
  seal(c);const r=c.tables.find(t=>t.table==='schedule_generation_exclusions')!.rows[0],contract=rule('schedule_generation_exclusions').payloads.find(p=>p.column==='claims')!;
  c.payloadCaptures.push({table:'schedule_generation_exclusions',key:['G'],column:'claims',contractId:contract.contractId,valueDigest:ownershipDigest(r.values.claims),bindings:[{path:['version'],kind:'DATA'},{path:['claims'],kind:'DATA'}],unresolvedPaths:[],reviewEvidenceDigest:digest});
  c.historicalReferences=[historic('shifts',['old-shift'],'b'.repeat(64))];expect(codes(c)).toContain('HISTORY_EVIDENCE_REQUIRED');
  c.historicalReferences=[historic('shifts',['old-shift'],r.originalChecksum,'B')];expect(codes(c)).toContain('ANCESTRY_CONFLICT');
 });

 it('rejects source capture precision loss in retained bigint security counters',()=>{
  const c=fixture();add(c,'password_recovery_limits',{scope:digest,bucket:Number.MAX_SAFE_INTEGER+1,attempts:2});seal(c);
  expect(codes(c)).toContain('LOSSLESS_CAPTURE_REQUIRED');
 });
 it('checks current device credential lineage against the preserved global retired-hash ledger',()=>{
  const c=fixture();add(c,'clocker_devices',{id:'D',location_id:'LA',credential_hash:digest,credential_version:3});seal(c);
  expect(codes(c)).toContain('GLOBAL_SECURITY_FENCE_CONFLICT');
  add(c,'clocker_device_credentials',{credential_hash:digest,device_id:'D',credential_version:3});seal(c);
  expect(preflightTenantBackfill(c).status).toBe('READY_FOR_GUARDED_EXECUTION');
  c.tables.find(t=>t.table==='clocker_device_credentials')!.rows[0].values.credential_version=2;seal(c);
  expect(codes(c)).toContain('GLOBAL_SECURITY_FENCE_CONFLICT');
 });
 it('validates participant employee identities encoded as JSON object keys without hash inversion',()=>{
  const c=fixture();add(c,'shift_change_events',{id:'H',workspace_id:'A',request_kind:'EXCHANGE',request_id:'OLD-E',participants:{decisionVersions:{'007':1}}});seal(c);
  const h=c.tables.find(t=>t.table==='shift_change_events')!.rows[0],contract=rule('shift_change_events').payloads.find(p=>p.column==='participants')!;
  c.payloadCaptures.push({table:'shift_change_events',key:['H'],column:'participants',contractId:contract.contractId,valueDigest:ownershipDigest(h.values.participants),bindings:[{path:['decisionVersions','007'],kind:'REFERENCE',target:'employees',targetColumns:['id'],key:['007']}],unresolvedPaths:[],reviewEvidenceDigest:digest});
  c.payloadCaptures.push({table:'shift_change_events',key:['H'],column:'request_id',contractId:'shift_change_events.request_id:typed-source-v1',valueDigest:ownershipDigest('OLD-E'),bindings:[{path:[],kind:'REFERENCE',target:'shift_exchanges',targetColumns:['id'],key:['OLD-E']}],unresolvedPaths:[],reviewEvidenceDigest:digest});
  c.historicalReferences.push(historic('employees',['007'],h.originalChecksum),historic('shift_exchanges',['OLD-E'],h.originalChecksum));
  expect(preflightTenantBackfill(c).status).toBe('READY_FOR_GUARDED_EXECUTION');
  c.payloadCaptures[0].bindings[0].kind='DATA';expect(codes(c)).toContain('PAYLOAD_CLASSIFICATION_CONFLICT');
 });
 it('produces the same plan/chunks after input row/table/mapping enumeration changes',()=>{const c=fixture(),a=preflightTenantBackfill(c);c.tables.reverse();c.mappings.reverse();for(const t of c.tables)t.rows.reverse();expect(preflightTenantBackfill(c)).toEqual(a);});
});
describe('interruption/resume and atomic new immutable-row protocol',()=>{
 it('requires a locked exact employee parent from the same tenant for each new PERSON limiter row',()=>{
  const t=rule('clocker_pin_limits'),r=row(t.table,{scope:'PERSON',scope_id:'007'});
  const request={workspaceId:'A',values:r.values,parentOwnership:[historic('employees',['007'],r.originalChecksum,'A')],payloadCaptures:[]};
  expect(planNewOwnershipWrite(t,request).status).toBe('READY_FOR_ATOMIC_INSERT');
  expect(planNewOwnershipWrite(t,{...request,parentOwnership:[historic('employees',['007'],r.originalChecksum,'B')]}).diagnostics.map(x=>x.code)).toContain('ANCESTRY_CONFLICT');
  expect(planNewOwnershipWrite(t,{...request,parentOwnership:[]}).diagnostics.map(x=>x.code)).toContain('ORPHAN_REFERENCE');
 });
 const records=(p:ReturnType<typeof preflightTenantBackfill>):OwnershipRecord[]=>p.entries.map(e=>({table:e.table,key:e.key,workspaceId:e.workspaceId,sourceChecksum:e.sourceChecksum,mirroredIdentityChecksum:e.mirroredIdentityChecksum}));
 it('treats identical metadata retry as no-op and resumes only absent source keys',()=>{const p=preflightTenantBackfill(fixture()),r=records(p);expect(resumeTenantBackfill(p,[],r).pending).toEqual([]);expect(resumeTenantBackfill(p,[],r.slice(1)).pending).toHaveLength(1);});
 it('rejects changed ownership/history checksum and changed plan receipts',()=>{const p=preflightTenantBackfill(fixture()),r=records(p);r[0].workspaceId='B';expect(resumeTenantBackfill(p,[],r).diagnostics.map(x=>x.code)).toContain('EXISTING_OWNERSHIP_CONFLICT');const c=p.chunks[0];expect(resumeTenantBackfill(p,[{id:c.id,planDigest:'b'.repeat(64),state:'STARTED',count:c.count,sourceChecksum:c.sourceChecksum,targetChecksum:c.targetChecksum}],[]).diagnostics.map(x=>x.code)).toContain('RESUME_MANIFEST_DRIFT');});
 it('does not trust a COMPLETE journal receipt if matching metadata is missing',()=>{const p=preflightTenantBackfill(fixture()),c=p.chunks[0];expect(resumeTenantBackfill(p,[{id:c.id,planDigest:p.digest,state:'COMPLETE',count:c.count,sourceChecksum:c.sourceChecksum,targetChecksum:c.targetChecksum}],[]).diagnostics.map(x=>x.code)).toContain('INCOMPLETE_CHUNK_METADATA');});
 it('orders tenant gate and parent checks before deferred typed sidecar/source insertion without bypassing append-only history guards',()=>{const t=rule('clocker_pin_events'),r=row(t.table,{id:'E',employee_id:'007',actor_employee_id:'007',pin_version:1});const parents=[historic('employees',['007'],r.originalChecksum)];const p=planNewOwnershipWrite(t,{workspaceId:'A',values:r.values,parentOwnership:parents,payloadCaptures:[]});expect(p.status).toBe('READY_FOR_ATOMIC_INSERT');expect(p.steps).toEqual(['BEGIN','TENANT_GATE','LOCK_AND_VALIDATE_IMMUTABLE_PARENTS','INSERT_TYPED_SIDECAR_WITH_DEFERRED_SOURCE_FK','INSERT_SOURCE_WITH_TENANT_CHECK','VALIDATE_SOURCE_SIDECAR_IDENTITY','COMMIT']);expect(p.metadata?.mirroredIdentity.actor_employee_id).toBe('007');});
 it('rejects a foreign actor, missing current parent and ownership reattribution for new rows',()=>{const t=rule('clocker_pin_events'),r=row(t.table,{id:'E',employee_id:'007',actor_employee_id:'foreign',pin_version:1});const p=planNewOwnershipWrite(t,{workspaceId:'A',values:r.values,parentOwnership:[historic('employees',['007'],r.originalChecksum),historic('employees',['foreign'],r.originalChecksum,'B')],payloadCaptures:[]});expect(p.diagnostics.map(x=>x.code)).toContain('ANCESTRY_CONFLICT');const m=planNewOwnershipWrite(t,{workspaceId:'A',values:r.values,parentOwnership:[],payloadCaptures:[]});expect(m.diagnostics.map(x=>x.code)).toContain('ORPHAN_REFERENCE');});
 it('rejects metadata outside the complete captured row set instead of hiding a conflicting leftover row',()=>{
  const p=preflightTenantBackfill(fixture()),r=records(p);r.push({table:'employees',key:['ghost'],workspaceId:'foreign',sourceChecksum:digest,mirroredIdentityChecksum:digest});
  expect(resumeTenantBackfill(p,[],r).diagnostics.map(x=>x.code)).toContain('UNEXPECTED_EXISTING_OWNERSHIP');
 });
 it('rejects a saved plan whose typed owner or chunk changed after its digest was captured',()=>{
  const p=preflightTenantBackfill(fixture());p.entries[0].workspaceId='foreign';
  expect(resumeTenantBackfill(p,[],[]).diagnostics.map(x=>x.code)).toContain('PLAN_MANIFEST_DRIFT');
  const q=preflightTenantBackfill(fixture());q.chunks[0].sourceChecksum='b'.repeat(64);
  expect(resumeTenantBackfill(q,[],[]).diagnostics.map(x=>x.code)).toContain('PLAN_MANIFEST_DRIFT');
 });
 it('rejects changed immutable history or actor mirrors even when both employees remain in the same tenant',()=>{
  const t=rule('clocker_pin_events'),prior=row(t.table,{id:'E',employee_id:'007',actor_employee_id:'007',pin_version:1});
  const old=planNewOwnershipWrite(t,{workspaceId:'A',values:prior.values,parentOwnership:[historic('employees',['007'],prior.originalChecksum)],payloadCaptures:[]}).metadata!;
  const next=row(t.table,{...prior.values,actor_employee_id:'008'});
  const request={workspaceId:'A',values:next.values,parentOwnership:[historic('employees',['007'],next.originalChecksum),historic('employees',['008'],next.originalChecksum)],payloadCaptures:[],existingOwnership:{table:t.table,key:['E'],workspaceId:'A',sourceChecksum:old.sourceChecksum,mirroredIdentityChecksum:old.mirroredIdentityChecksum}};
  expect(planNewOwnershipWrite(t,request).diagnostics.map(x=>x.code)).toContain('EXISTING_OWNERSHIP_CONFLICT');
 });
 it('returns an explicit blocked diagnostic for incomplete new-write row shape rather than throwing while traversing references',()=>{
  const t=rule('clocker_pin_events');expect(()=>planNewOwnershipWrite(t,{workspaceId:'A',values:{id:'E'},parentOwnership:[],payloadCaptures:[]})).not.toThrow();
  expect(planNewOwnershipWrite(t,{workspaceId:'A',values:{id:'E'},parentOwnership:[],payloadCaptures:[]}).diagnostics.map(x=>x.code)).toContain('ROW_SHAPE_DRIFT');
 });

});


describe('source/schema/snapshot/row-bound database namespace witnesses',()=>{
 const employeePair=(first:string|null,second:string|null)=>{
  const c=fixture();c.tables.find(t=>t.table==='employees')!.rows[0].values.email=first;
  add(c,'employees',{id:'008',primary_location_id:'LA',active:false,email:second});c.mappings.push({table:'employees',key:['008'],workspaceId:'A',rowChecksum:'',evidenceDigest:digest});return seal(c);
 };
 it('includes empty email in the retained IS NOT NULL namespace and excludes NULL',()=>{
  expect(codes(employeePair('',''))).toContain('NAMESPACE_COLLISION');expect(preflightTenantBackfill(employeePair(null,null)).status).toBe('READY_FOR_GUARDED_EXECUTION');
 });
 it('uses captured DB casing instead of guessing JavaScript lower-case equality',()=>{
  const c=employeePair('I','i');const rows=c.namespaceComparators.rows;
  rows[0].expressionValue='ı';rows[0].comparisonClass='db-class-1';rows[1].expressionValue='i';rows[1].comparisonClass='db-class-2';resealComparators(c);
  expect(preflightTenantBackfill(c).status).toBe('READY_FOR_GUARDED_EXECUTION');
 });
 it('uses actual DB collation equality classes even when lower-result bytes differ',()=>{
  const c=employeePair('resume','résumé');for(const r of c.namespaceComparators.rows)r.comparisonClass='db-equivalent';resealComparators(c);
  expect(codes(c)).toContain('NAMESPACE_COLLISION');
 });
 it.each(['positions','clocker_break_types','schedule_templates'])('uses DB result witnesses for %s names and its original predicate',table=>{
  const c=fixture();const extra:Record<string,JsonValue>=table==='clocker_break_types'?{workspace_id:'A',created_by:'007',updated_by:'007'}:table==='schedule_templates'?{created_by:'007'}:{workspace_id:'A'};
  add(c,table,{id:'N1',name:'I',active:true,...extra});add(c,table,{id:'N2',name:'i',active:true,...extra});seal(c);
  const rows=c.namespaceComparators.rows.filter(r=>r.contractId.startsWith(table+'.'));rows[0].expressionValue='ı';rows[0].comparisonClass='one';rows[1].expressionValue='i';rows[1].comparisonClass='two';resealComparators(c);
  expect(preflightTenantBackfill(c).status).toBe('READY_FOR_GUARDED_EXECUTION');rows[1].comparisonClass='one';resealComparators(c);expect(codes(c)).toContain('NAMESPACE_COLLISION');
 });
 it('requires every closed catalog even for empty tables and rejects absent result witnesses',()=>{
  const c=fixture();delete (c as Partial<FixtureCapture>).namespaceComparators;expect(codes(c)).toContain('DATABASE_COMPARATOR_REQUIRED');
  const d=fixture();d.namespaceComparators.catalogs.pop();resealComparators(d);expect(codes(d)).toContain('DATABASE_COMPARATOR_CATALOG_REQUIRED');
  const e=fixture();e.namespaceComparators.rows=[];resealComparators(e);expect(codes(e)).toContain('DATABASE_COMPARATOR_ROW_REQUIRED');
 });
 it.each(['sourceDigest','schemaDigest','snapshotId','rowSetChecksum'] as const)('rejects %s drift at the capture boundary',field=>{
  const c=fixture();c.namespaceComparators.binding[field]='different';resealComparators(c);expect(codes(c)).toContain('DATABASE_COMPARATOR_BINDING_DRIFT');
 });
 it('rejects whole-row witness drift even after source row and table checksums are refreshed',()=>{
  const c=fixture(),old=c.namespaceComparators;c.tables.find(t=>t.table==='employees')!.rows[0].values.first_name='changed';seal(c);c.namespaceComparators=old;expect(codes(c)).toContain('DATABASE_COMPARATOR_BINDING_DRIFT');
  c.namespaceComparators.binding.rowSetChecksum=fictionalComparators(c).binding.rowSetChecksum;resealComparators(c);expect(codes(c)).toContain('DATABASE_COMPARATOR_ROW_DRIFT');
 });
 it('rejects changed catalog expression, predicate, source evidence and collation checksum',()=>{
  for(const field of ['expression','predicate','indexDefinition'] as const){const c=fixture();const catalog=c.namespaceComparators.catalogs[0];catalog.definition[field]='tampered';const value={contractId:catalog.contractId,source:catalog.source,sourceStatementChecksum:catalog.sourceStatementChecksum,definition:catalog.definition};catalog.checksum=ownershipDigest(value);resealComparators(c);expect(codes(c)).toContain('DATABASE_COMPARATOR_CATALOG_DRIFT');}
  const c=fixture();c.namespaceComparators.catalogs[0].source.line++;resealComparators(c);expect(codes(c)).toContain('DATABASE_COMPARATOR_CATALOG_DRIFT');
  const d=fixture();d.namespaceComparators.catalogs[0].definition.expressionCollation.lcCtype='tampered';resealComparators(d);expect(codes(d)).toContain('DATABASE_COMPARATOR_CATALOG_DRIFT');
 });
 it('rejects omitted collation metadata, predicate mismatch, duplicate and unused witness records',()=>{
  const a=fixture();delete (a.namespaceComparators.catalogs[0].definition as Partial<ComparatorCapture['catalogs'][number]['definition']>).indexCollation;resealComparators(a);expect(codes(a)).toContain('DATABASE_COMPARATOR_CATALOG_DRIFT');
  const b=fixture();b.namespaceComparators.rows[0].included=true;b.namespaceComparators.rows[0].comparisonClass='null-is-included';resealComparators(b);expect(codes(b)).toContain('DATABASE_COMPARATOR_ROW_DRIFT');
  const c=fixture();c.namespaceComparators.rows.push({...c.namespaceComparators.rows[0],key:['absent']});resealComparators(c);expect(codes(c)).toContain('DATABASE_COMPARATOR_UNUSED');
  const d=fixture();d.namespaceComparators.rows.push({...d.namespaceComparators.rows[0]});resealComparators(d);expect(codes(d)).toContain('DATABASE_COMPARATOR_DUPLICATE');
 });
 it('binds witnessed DB results into the saved plan and stays independent of capture order',()=>{
  const c=fixture(),p=preflightTenantBackfill(c);expect((p.manifest as Record<string,JsonValue>).namespaceComparators).toBeDefined();
  c.namespaceComparators.catalogs.reverse();c.namespaceComparators.rows.reverse();expect(preflightTenantBackfill(c).digest).toBe(p.digest);
  const saved=JSON.parse(JSON.stringify(p));delete saved.manifest.namespaceComparators;expect(resumeTenantBackfill(saved,[],[]).status).toBe('BLOCKED');
 });
});


describe('malformed comparator capture rejection without executing data accessors',()=>{
 it.each(['null-catalog','null-row','missing-definition','missing-binding'])('blocks %s deterministically without throwing',kind=>{
  const c=fixture();const raw=c.namespaceComparators as unknown as {catalogs:unknown[];rows:unknown[];binding?:unknown};
  if(kind==='null-catalog')raw.catalogs[0]=null;
  if(kind==='null-row')raw.rows[0]=null;
  if(kind==='missing-definition')delete (raw.catalogs[0] as {definition?:unknown}).definition;
  if(kind==='missing-binding')delete raw.binding;
  expect(()=>preflightTenantBackfill(c)).not.toThrow();expect(preflightTenantBackfill(c).status).toBe('BLOCKED');
 });
 it('does not execute an accessor or serialize a mutated sparse original payload',()=>{
  const c=fixture();let reads=0;Object.defineProperty(c.tables[0],'rows',{get:()=>{reads++;return [];},enumerable:true});
  expect(preflightTenantBackfill(c).status).toBe('BLOCKED');expect(reads).toBe(0);
  const d=fixture();add(d,'calendar_subscriptions',{id:'C',workspace_id:'A',employee_id:'007',allowed_location_ids:['LA']});seal(d);
  const values=d.tables.find(t=>t.table==='calendar_subscriptions')!.rows[0].values.allowed_location_ids as JsonValue[];delete values[0];
  expect(()=>preflightTenantBackfill(d)).not.toThrow();expect(codes(d)).toContain('UNSUPPORTED_CAPTURE_VALUE');
 });
 it('retains inactive template rows but excludes them from the exact active name predicate',()=>{
  const c=fixture();add(c,'schedule_templates',{id:'T1',created_by:'007',name:'fixture',active:false});add(c,'schedule_templates',{id:'T2',created_by:'007',name:'fixture',active:false});seal(c);
  const plan=preflightTenantBackfill(c);expect(plan.status).toBe('READY_FOR_GUARDED_EXECUTION');expect(plan.entries.filter(e=>e.table==='schedule_templates')).toHaveLength(2);
 });
});


describe('internal consistency of captured DB comparison classes',()=>{
 it('rejects different equality classes for identical DB expression output',()=>{
  const c=fixture();c.tables.find(t=>t.table==='employees')!.rows[0].values.email='same';add(c,'employees',{id:'008',primary_location_id:'LA',email:'same'});c.mappings.push({table:'employees',key:['008'],workspaceId:'A',rowChecksum:'',evidenceDigest:digest});seal(c);
  c.namespaceComparators.rows[0].comparisonClass='one';c.namespaceComparators.rows[1].comparisonClass='two';resealComparators(c);
  expect(codes(c)).toContain('DATABASE_COMPARATOR_ROW_DRIFT');
 });
});


describe('saved comparator manifest obligations',()=>{
 it.each(['omit','checksum'])('blocks %s witnesses in a rehashed empty-work saved plan',kind=>{
  const c=fixture();for(const t of c.tables)t.rows=[];c.mappings=[];seal(c);const plan=preflightTenantBackfill(c);
  expect(plan.status).toBe('READY_FOR_GUARDED_EXECUTION');expect(plan.entries).toEqual([]);
  const m=plan.manifest as Record<string,JsonValue>;
  if(kind==='omit')delete m.namespaceComparators;else (m.namespaceComparators as Record<string,JsonValue>).captureChecksum='f'.repeat(64);
  plan.digest=ownershipDigest(m);expect(resumeTenantBackfill(plan,[],[]).status).toBe('BLOCKED');
 });
});

// Runtime capture deserialization can produce JSON that violates the TypeScript
// shape. It must stop before any executable entries or chunks are returned.
describe('root capture ingestion regression',()=>{
 it.each([null,[],{}, {migrations:[]}])('blocks malformed top-level JSON without throwing (%j)',value=>{
  const result=preflightTenantBackfill(value as unknown as BackfillCapture);
  expect(result.status).toBe('BLOCKED');
  expect(result.diagnostics.map(d=>d.code)).toContain('INVALID_CAPTURE_STRUCTURE');
  expect(result.manifest).toBeNull();expect(result.entries).toEqual([]);expect(result.chunks).toEqual([]);
 });
 it.each(['snapshot','tables','mappings','historicalReferences','payloadCaptures','writeFence'] as const)('blocks a null %s capture component without throwing',field=>{
  const value={...fixture(),[field]:null};
  const result=preflightTenantBackfill(value as unknown as BackfillCapture);
  expect(result.status).toBe('BLOCKED');
  expect(result.diagnostics.map(d=>d.code)).toContain('INVALID_CAPTURE_STRUCTURE');
  expect(result.manifest).toBeNull();expect(result.entries).toEqual([]);expect(result.chunks).toEqual([]);
 });
});
