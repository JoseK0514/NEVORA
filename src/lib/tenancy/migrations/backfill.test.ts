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
function seal(c:BackfillCapture):BackfillCapture {
 for(const t of c.tables){for(const r of t.rows)r.originalChecksum=ownershipDigest(r.values);t.expectedCount=t.rows.length;t.expectedChecksum=ownershipDigest(t.rows.map(r=>({key:key(t.table,r),checksum:r.originalChecksum})).sort((a,b)=>canonicalOwnershipJson(a.key).localeCompare(canonicalOwnershipJson(b.key))));}
 for(const m of c.mappings){const r=c.tables.find(t=>t.table===m.table)?.rows.find(r=>canonicalOwnershipJson(key(m.table,r))===canonicalOwnershipJson(m.key));if(r)m.rowChecksum=r.originalChecksum;}
 return c;
}
function fixture():BackfillCapture {
 const r=registry(),c:BackfillCapture={migrations:loadPinnedMigrations({repo:process.cwd(),source:OWNERSHIP_SCHEMA_COMMIT,tree:OWNERSHIP_SCHEMA_TREE}).migrations,registryDigest:r.digest,sourceDigest:digest,currentSchemaDigest:r.schemaDigest,snapshot:{id:'owned-fictional-snapshot-1',isolation:'SERIALIZABLE',includesInactive:true,includesHistory:true},tables:r.tables.map(t=>({table:t.table,rows:[],expectedCount:0,expectedChecksum:''})),mappings:[],historicalReferences:[],payloadCaptures:[],writeFence:{mode:'EXCLUSIVE_FENCED',sourceDigest:digest,schemaDigest:r.schemaDigest,databaseFenceToken:'owned-fixture-fence',allWritersCovered:true,immutableOwnershipEnabled:true,registeredWriterDigest:digest,newWriteJournalDigest:digest,newWritesReconciled:true},chunkSize:2};
 add(c,'workspaces',{id:'A',active:false});add(c,'locations',{id:'LA',workspace_id:'A',clocker_key:'2',active:false});
 add(c,'employees',{id:'007',primary_location_id:'LA',active:false});
 c.mappings.push({table:'employees',key:['007'],workspaceId:'A',rowChecksum:'',evidenceDigest:digest});
 return seal(c);
}
function add(c:BackfillCapture,t:string,v:Record<string,JsonValue>){c.tables.find(x=>x.table===t)!.rows.push(row(t,v));}
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
