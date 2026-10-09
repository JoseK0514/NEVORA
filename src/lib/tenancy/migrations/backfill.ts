import { getOwnershipRegistry, verifyOwnershipSource, canonicalOwnershipJson, ownershipDigest, type JsonValue, type MigrationSource, type OwnershipDiagnostic, type TableOwnership } from './ownership';
export type LegacyRow = { values: Record<string, JsonValue>; originalChecksum: string };
export type TableCapture = { table: string; rows: LegacyRow[]; expectedCount: number; expectedChecksum: string };
export type ImmutableMapping = { table: string; key: JsonValue[]; workspaceId: string; rowChecksum: string; evidenceDigest: string };
export type HistoricalReference = { target: string; targetColumns: string[]; key: JsonValue[]; workspaceId: string; evidenceDigest: string; sourceRowChecksum?: string };
export type LeafBinding = { path: string[]; kind: 'DATA' | 'GLOBAL_FENCE' | 'REFERENCE'; target?: string; targetColumns?: string[]; key?: JsonValue[]; historical?: boolean };
export type PayloadCapture = { table: string; key: JsonValue[]; column: string; contractId: string; valueDigest: string; bindings: LeafBinding[]; unresolvedPaths: string[][]; reviewEvidenceDigest: string };
export type WriteFence = { mode: 'EXCLUSIVE_FENCED' | 'DUAL_WRITE'; sourceDigest: string; schemaDigest: string; databaseFenceToken: string; allWritersCovered: boolean; immutableOwnershipEnabled: boolean; registeredWriterDigest: string; newWriteJournalDigest: string; newWritesReconciled: boolean };
export type BackfillCapture = { migrations: MigrationSource[]; registryDigest: string; sourceDigest: string; currentSchemaDigest: string; snapshot: { id: string; isolation: 'SERIALIZABLE'; includesInactive: boolean; includesHistory: boolean }; tables: TableCapture[]; mappings: ImmutableMapping[]; historicalReferences: HistoricalReference[]; payloadCaptures: PayloadCapture[]; installation?: { workspaceId: string; evidenceDigest: string; coveredRows: { table: string; key: JsonValue[]; rowChecksum: string }[] }; writeFence: WriteFence; chunkSize: number };
export type BackfillEntry = { table: string; key: JsonValue[]; workspaceId: string | null; storage: TableOwnership['storage']; sidecar: string | null; sourceChecksum: string; mirroredIdentity: Record<string, JsonValue>; mirroredIdentityChecksum: string; evidenceDigests: string[] };
export type BackfillChunk = { id: string; table: string; entries: BackfillEntry[]; count: number; sourceChecksum: string; targetChecksum: string };
export type BackfillPlan = { status: 'READY_FOR_GUARDED_EXECUTION' | 'BLOCKED'; digest: string; registryDigest: string; sourceDigest: string; schemaDigest: string; snapshotId: string; manifest: JsonValue | null; chunks: BackfillChunk[]; entries: BackfillEntry[]; diagnostics: OwnershipDiagnostic[]; preservesAllOriginalColumns: true; verification: 'PURE_PREFLIGHT_NOT_DATABASE_VERIFICATION' };
export type OwnershipRecord = { table: string; key: JsonValue[]; workspaceId: string | null; sourceChecksum: string; mirroredIdentityChecksum: string };
export type CompletedChunk = { id: string; planDigest: string; state: 'STARTED' | 'COMPLETE'; count: number; sourceChecksum: string; targetChecksum: string };
export type ResumeOutcome = { status: 'READY' | 'BLOCKED'; pending: BackfillEntry[]; diagnostics: OwnershipDiagnostic[] };
export type NewWriteRequest = { workspaceId: string; values: Record<string, JsonValue>; parentOwnership: HistoricalReference[]; payloadCaptures: PayloadCapture[]; existingOwnership?: OwnershipRecord };
export type NewWritePlan = { status: 'READY_FOR_ATOMIC_INSERT' | 'BLOCKED'; diagnostics: OwnershipDiagnostic[]; tenantGateFirst: true; immutableOwnership: true; sourceKey: JsonValue[]; metadata: BackfillEntry | null; steps: string[]; verification: 'TRANSACTION_SPECIFICATION_NOT_EXECUTED' };

const SHA=/^[a-f0-9]{64}$/;
type RowNode={rule:TableOwnership;row:LegacyRow;key:JsonValue[];identity:string};
function identity(table:string,key:JsonValue[]):string{return canonicalOwnershipJson([table,key]);}
function same(a:unknown,b:unknown):boolean{return canonicalOwnershipJson(a)===canonicalOwnershipJson(b);}
function problem(code:string,detail:string,node?:RowNode,field?:string):OwnershipDiagnostic{return {code,detail,...(node?{table:node.rule.table,key:node.key}:{}),...(field?{field}:{})};}
function sorted<T>(items:T[]):T[]{return [...items].sort((a,b)=>{const x=canonicalOwnershipJson(a),y=canonicalOwnershipJson(b);return x<y?-1:x>y?1:0;});}
function rowKey(rule:TableOwnership,values:Record<string,JsonValue>):JsonValue[]{return rule.primaryKey.map(c=>values[c]);}
function shapeDiagnostics(rule:TableOwnership,values:Record<string,JsonValue>):OwnershipDiagnostic[]{
 const fields=Object.keys(values).sort(),expected=rule.columns.map(c=>c.name).sort();
 if(!same(fields,expected))return [{code:'ROW_SHAPE_DRIFT',table:rule.table,detail:'Original-column capture must match the exact pinned column set.'}];
 if(rule.columns.some(c=>!c.nullable&&values[c.name]===null))return [{code:'REQUIRED_ORIGINAL_COLUMN_NULL',table:rule.table,detail:'A nonnullable original source column is null.'}];
 if(rule.columns.some(c=>/^(smallint|integer|bigint)/.test(c.type)&&typeof values[c.name]==='number'&&!Number.isSafeInteger(values[c.name])))return [{code:'LOSSLESS_CAPTURE_REQUIRED',table:rule.table,detail:'Integer/bigint counters and identifiers must retain exact values; serialize out-of-range bigint as decimal strings.'}];
 if(rule.primaryKey.some(c=>values[c]==null||typeof values[c]==='object'))return [{code:'INVALID_ROW_KEY',table:rule.table,detail:'Actual typed primary-key components are required.'}];
 try{canonicalOwnershipJson(values);}catch{return [{code:'UNSUPPORTED_ROW_VALUE',table:rule.table,detail:'Capture values must be finite, lossless JSON primitives/objects/arrays; database adapters must serialize bigint/timestamps explicitly.'}];}
 return [];
}
function leafEntries(value:JsonValue,path:string[]=[]):{path:string[];value:JsonValue}[]{
 if(value!==null&&typeof value==='object'){
  const keys=Object.keys(value);
  if(!keys.length)return [{path,value}];
  return keys.flatMap(k=>leafEntries((value as Record<string,JsonValue>)[k],[...path,k]));
 }
 return [{path,value}];
}
/** Migration captures are privileged source adapters, never request payloads or trusted tenant proofs.
 * Complete leaf review binds the exact value and contract. It cannot substitute for the later
 * database capture, catalog/trigger review, foreign-key validation, or actual runtime-role tests. */

/** Closed source aliases below are validation requirements, never name-based ownership inference.
 * Ambiguous result IDs still need reviewed complete leaf captures and explicit typed targets. */
function declaredPayloadIdentity(node:RowNode,column:string,path:string[]):{target?:string;column?:string;literal:JsonValue}|null{
 const last=path[path.length-1], value=node.row.values[column];
 let literal:JsonValue=value;
 for(const part of path)literal=(literal as Record<string,JsonValue>)[part];
 if(literal===null)return null;
 if(column==='participants'&&path[0]==='decisionVersions'&&path.length>=2)return {target:'employees',column:'id',literal:path[1]};
 const aliases:Record<string,[string,string]>={
  employeeId:['employees','id'],employee_id:['employees','id'],requesterEmployeeId:['employees','id'],targetEmployeeId:['employees','id'],
  actorEmployeeId:['employees','id'],reviewedBy:['employees','id'],createdBy:['employees','id'],locationId:['locations','id'],location_id:['locations','id'],
  workspaceId:['workspaces','id'],workspace_id:['workspaces','id'],positionId:['positions','id'],position_id:['positions','id'],
  scheduleId:['schedules','id'],schedule_id:['schedules','id'],shiftId:['shifts','id'],shift_id:['shifts','id'],sourceShiftId:['shifts','id'],
  source_shift_id:['shifts','id'],publishedShiftId:['schedule_publication_revision_shifts','id'],revisionId:['schedule_publication_revisions','id'],
  timeEntryId:['time_entries','id'],breakEntryId:['break_entries','id'],deviceId:['clocker_devices','id'],breakTypeId:['clocker_break_types','id'],
  requestId:['time_correction_requests','id'],targetRequestId:['time_correction_requests','id'],adjustmentId:['time_correction_adjustments','id'],
  targetAdjustmentId:['time_correction_adjustments','id'],finalizationOperationId:['timecard_revisions','operation_id'],
 };
 if(last==='positionId'&&(column==='generated_claims'||column==='claims'))return {target:'positions',column:'id',literal};
 if(last==='reviewedBy'&&(column==='operational_rule_profile'||column==='shift_change_policy'))return {target:'employees',column:'id',literal};
 if(column==='break_type_snapshot'&&last==='id')return {target:'clocker_break_types',column:'id',literal};
 if(aliases[last])return {target:aliases[last][0],column:aliases[last][1],literal};
 if(last==='id')return {literal};
 if(node.rule.typedFields.includes(column))return {literal};
 return null;
}

function payloadReferences(node:RowNode,captures:PayloadCapture[],diagnostics:OwnershipDiagnostic[]):{target:string;targetColumns:string[];key:JsonValue[];historical:boolean;field:string}[]{
 const references:{target:string;targetColumns:string[];key:JsonValue[];historical:boolean;field:string}[]=[];
 const fields=[...node.rule.payloads,...node.rule.typedFields.map(column=>({column,type:'JSON' as const,contractId:node.rule.table+'.'+column+':typed-source-v1',source:node.rule.source,treatment:'COMPLETE_TYPED_LEAF_CAPTURE' as const,historical:true}))];
 for(const contract of fields){
  const value=node.row.values[contract.column];if(value==null)continue;
  const matches=captures.filter(c=>c.table===node.rule.table&&same(c.key,node.key)&&c.column===contract.column);
  if(matches.length!==1){diagnostics.push(problem('PAYLOAD_LINEAGE_REQUIRED','Exactly one complete reviewed payload lineage capture is required.',node,contract.column));continue;}
  const capture=matches[0];
  if(capture.contractId!==contract.contractId||capture.valueDigest!==ownershipDigest(value)||!SHA.test(capture.reviewEvidenceDigest)){
   diagnostics.push(problem('PAYLOAD_CAPTURE_DRIFT','Source contract, exact payload digest, and review evidence must agree.',node,contract.column));continue;
  }
  if(capture.unresolvedPaths.length)diagnostics.push(problem('PAYLOAD_UNRESOLVED','Unresolved payload leaf ancestry blocks the entire migration.',node,contract.column));
  const leaves=leafEntries(value),paths=leaves.map(l=>canonicalOwnershipJson(l.path)),bindingPaths=capture.bindings.map(b=>canonicalOwnershipJson(b.path));
  if(new Set(bindingPaths).size!==bindingPaths.length||!same([...paths].sort(),[...bindingPaths].sort())){
   diagnostics.push(problem('PAYLOAD_COVERAGE_GAP','Every actual payload leaf, including empty containers, needs one explicit classification.',node,contract.column));continue;
  }
  for(const leaf of leaves){
   const binding=capture.bindings.find(b=>same(b.path,leaf.path))!;
   const declared=declaredPayloadIdentity(node,contract.column,leaf.path);
   if(declared&&(binding.kind!=='REFERENCE'||(declared.target&&binding.target!==declared.target)||(declared.column&&(!binding.targetColumns?.includes(declared.column)||!same(binding.key?.[binding.targetColumns.indexOf(declared.column)],declared.literal))))){diagnostics.push(problem('PAYLOAD_CLASSIFICATION_CONFLICT','A declared source identity literal cannot be omitted or relabeled as data/global fence.',node,contract.column));continue;}
   if(node.rule.table==='calendar_subscriptions'&&contract.column==='allowed_location_ids'&&
    (binding.kind!=='REFERENCE'||binding.target!=='locations'||!same(binding.targetColumns,['id'])||binding.historical===true)){
    diagnostics.push(problem('PAYLOAD_CLASSIFICATION_CONFLICT','Frozen calendar issuance locations must be literal same-tenant locations.',node,contract.column));continue;
   }
   if(binding.kind==='REFERENCE'){
    if(!binding.target||!binding.targetColumns?.length||!binding.key?.length||binding.targetColumns.length!==binding.key.length||
     !binding.key.some(k=>same(k,declared?.literal??leaf.value))){
     diagnostics.push(problem('PAYLOAD_LITERAL_DRIFT','Typed referenced key must bind the actual preserved literal and explicit target columns.',node,contract.column));continue;
    }
    references.push({target:binding.target,targetColumns:binding.targetColumns,key:binding.key,historical:contract.historical||binding.historical===true,field:contract.column+'/'+leaf.path.join('/')});
   }else if(binding.kind!=='DATA'&&binding.kind!=='GLOBAL_FENCE')diagnostics.push(problem('PAYLOAD_CLASSIFICATION_CONFLICT','Unsupported leaf classification.',node,contract.column));
  }
 }
 return references;
}
function makeEntry(node:RowNode,workspaceId:string|null,evidenceDigests:string[]):BackfillEntry{
 const mirroredIdentity=Object.fromEntries(node.rule.mirroredIdentityColumns.map(c=>[c,node.row.values[c]]));
 return {table:node.rule.table,key:node.key,workspaceId,storage:node.rule.storage,sidecar:node.rule.sidecar,sourceChecksum:node.row.originalChecksum,
  mirroredIdentity,mirroredIdentityChecksum:ownershipDigest(mirroredIdentity),evidenceDigests:[...new Set(evidenceDigests)].sort()};
}

function buildChunks(entries:BackfillEntry[],digest:string,chunkSize:number):BackfillChunk[]{
 const chunks:BackfillChunk[]=[];
 for(const table of [...new Set(entries.map(e=>e.table))].sort()){
  const rows=entries.filter(e=>e.table===table);
  for(let start=0;start<rows.length;start+=chunkSize){
   const part=rows.slice(start,start+chunkSize),sourceChecksum=ownershipDigest(part.map(e=>({key:e.key,checksum:e.sourceChecksum}))),targetChecksum=ownershipDigest(part);
   chunks.push({id:ownershipDigest([digest,table,part.map(e=>e.key)]),table,entries:part,count:part.length,sourceChecksum,targetChecksum});
  }
 }
 return chunks;
}

export function preflightTenantBackfill(capture:BackfillCapture):BackfillPlan{
 const registry=getOwnershipRegistry(),diagnostics:OwnershipDiagnostic[]=[...verifyOwnershipSource(capture.migrations)];
 const base={registryDigest:registry.digest,sourceDigest:capture.sourceDigest,schemaDigest:capture.currentSchemaDigest,snapshotId:capture.snapshot.id,
  preservesAllOriginalColumns:true as const,verification:'PURE_PREFLIGHT_NOT_DATABASE_VERIFICATION' as const};
 function blocked():BackfillPlan{return {...base,status:'BLOCKED',digest:ownershipDigest({base,diagnostics:sorted(diagnostics)}),manifest:null,entries:[],chunks:[],diagnostics:sorted(diagnostics)};}
 if(capture.registryDigest!==registry.digest)diagnostics.push(problem('REGISTRY_DRIFT','Capture requires the exact source-bound ownership contract.'));
 if(!SHA.test(capture.sourceDigest)||!SHA.test(capture.currentSchemaDigest))diagnostics.push(problem('SOURCE_BINDING_REQUIRED','Exact current application and expanded-schema fingerprints are required.'));
 if(!capture.snapshot.id||capture.snapshot.isolation!=='SERIALIZABLE'||!capture.snapshot.includesInactive||!capture.snapshot.includesHistory)
  diagnostics.push(problem('INCOMPLETE_SNAPSHOT','Capture must contain all retained inactive and historical rows at one guarded boundary.'));
 const fence=capture.writeFence;
 if(!fence.allWritersCovered||!fence.immutableOwnershipEnabled||!fence.databaseFenceToken||!SHA.test(fence.registeredWriterDigest))
  diagnostics.push(problem('UNFENCED_WRITER','All writers and immutable ownership must be guarded before snapshot/backfill.'));
 if(fence.sourceDigest!==capture.sourceDigest||fence.schemaDigest!==capture.currentSchemaDigest)diagnostics.push(problem('WRITE_FENCE_DRIFT','Writer protocol belongs to a different source/schema.'));
 if(!['EXCLUSIVE_FENCED','DUAL_WRITE'].includes(fence.mode)||!fence.newWritesReconciled||!SHA.test(fence.newWriteJournalDigest))
  diagnostics.push(problem('NEW_WRITES_UNRECONCILED','New-write protocol and complete through-boundary journal reconciliation are mandatory.'));
 if(!Number.isSafeInteger(capture.chunkSize)||capture.chunkSize<1||capture.chunkSize>1000)
  diagnostics.push(problem('INVALID_CHUNK_SIZE','Pure-plan chunks require 1–1000 rows; this does not select a database workload or SLA.'));
 const rules=new Map(registry.tables.map(t=>[t.table,t])),nodes:RowNode[]=[],seenTables=new Set<string>(),seenRows=new Set<string>();
 for(const table of capture.tables){
  const rule=rules.get(table.table);
  if(!rule){diagnostics.push(problem('UNCLASSIFIED_TABLE','Unexpected table in source capture: '+table.table));continue;}
  if(seenTables.has(table.table))diagnostics.push(problem('DUPLICATE_TABLE_CAPTURE',table.table));seenTables.add(table.table);
  if(table.expectedCount!==table.rows.length)diagnostics.push(problem('COUNT_DRIFT',table.table));
  const checksums:{key:JsonValue[];checksum:string}[]=[];
  for(const row of table.rows){
   const issues=shapeDiagnostics(rule,row.values);diagnostics.push(...issues);
   if(issues.length)continue;
   const key=rowKey(rule,row.values),id=identity(table.table,key),node={rule,row,key,identity:id};
   if(seenRows.has(id))diagnostics.push(problem('DUPLICATE_ROW_KEY','Duplicate original source primary key.',node));seenRows.add(id);
   if(!SHA.test(row.originalChecksum)||ownershipDigest(row.values)!==row.originalChecksum)diagnostics.push(problem('ROW_CHECKSUM_DRIFT','Full original-column checksum differs.',node));
   nodes.push(node);checksums.push({key,checksum:row.originalChecksum});
  }
  checksums.sort((a,b)=>{const x=canonicalOwnershipJson(a.key),y=canonicalOwnershipJson(b.key);return x<y?-1:x>y?1:0;});
  if(table.expectedChecksum!==ownershipDigest(checksums))diagnostics.push(problem('TABLE_CHECKSUM_DRIFT',table.table));
 }
 for(const name of rules.keys())if(!seenTables.has(name))diagnostics.push(problem('TABLE_CAPTURE_REQUIRED',name));
 if(diagnostics.length)return blocked();
 nodes.sort((a,b)=>a.identity<b.identity?-1:1);
 const owners=new Map<string,string|null>(),evidence=new Map<string,string[]>(),mappingSeen=new Set<ImmutableMapping>();
 const indexes=new Map<string,Map<string,RowNode[]>>();
 function find(target:string,columns:string[],key:JsonValue[]):RowNode[]{
  const targetRule=rules.get(target);if(!targetRule||columns.some(c=>!targetRule.columns.some(x=>x.name===c)))return [];
  const indexKey=canonicalOwnershipJson([target,columns]);let index=indexes.get(indexKey);
  if(!index){index=new Map();for(const n of nodes.filter(n=>n.rule.table===target)){
   const k=canonicalOwnershipJson(columns.map(c=>n.row.values[c]));index.set(k,[...(index.get(k)??[]),n]);
  }indexes.set(indexKey,index);}
  return index.get(canonicalOwnershipJson(key))??[];
 }
 const workspaceExists=(id:string)=>find('workspaces',['id'],[id]).length===1;
 for(const node of nodes){
  const a=node.rule.anchor,v=node.row.values;
  if(a.kind==='GLOBAL_SECURITY_CONTROL'){owners.set(node.identity,null);continue;}
  let owner:string|undefined;const origins:string[]=[];
  if(a.kind==='ROOT'||a.kind==='DIRECT'){if(typeof v[a.column]==='string')owner=v[a.column] as string;}
  if(a.kind==='CAPTURED_IMMUTABLE'){
   const found=capture.mappings.filter(m=>m.table===node.rule.table&&same(m.key,node.key));
   if(found.length!==1)diagnostics.push(problem('MAPPING_REQUIRED','Exactly one captured immutable row mapping is required; mutable location is not an ownership anchor.',node));
   else{
    const m=found[0];mappingSeen.add(m);
    if(m.rowChecksum!==node.row.originalChecksum||!SHA.test(m.evidenceDigest))diagnostics.push(problem('MAPPING_DRIFT','Row mapping/source checksum or evidence differs.',node));
    else{owner=m.workspaceId;origins.push(m.evidenceDigest);}
   }
  }
  if(a.kind==='INSTALLATION_PROVENANCE'){
   const i=capture.installation,coverage=i?.coveredRows.filter(r=>r.table===node.rule.table&&same(r.key,node.key)&&r.rowChecksum===node.row.originalChecksum);
   if(!i||!SHA.test(i.evidenceDigest)||coverage?.length!==1)diagnostics.push(problem('INSTALLATION_PROVENANCE_REQUIRED','Exact singleton-row source checksum and proved installation workspace are required.',node));
   else{owner=i.workspaceId;origins.push(i.evidenceDigest);}
  }
  if(owner!==undefined){
   if(!workspaceExists(owner))diagnostics.push(problem('ORPHAN_REFERENCE','Ownership workspace is absent from the same complete snapshot.',node));
   else{owners.set(node.identity,owner);evidence.set(node.identity,origins);}
  }
 }
 for(const m of capture.mappings)if(!mappingSeen.has(m))diagnostics.push(problem('UNUSED_MAPPING','Mappings may only bind actual captured immutable-anchor rows.',undefined,m.table));
 let progress=true;
 while(progress){
  progress=false;
  for(const n of nodes){
   if(owners.has(n.identity))continue;
   const a=n.rule.anchor;let target:string|undefined,columns:string[]|undefined,key:JsonValue[]|undefined;
   if(a.kind==='PARENT'){target=a.target;columns=a.targetColumns;key=a.columns.map(c=>n.row.values[c]);}
   if(a.kind==='TYPED_SCOPE'){
    const scope=n.row.values[a.discriminator];
    if(scope==='DEVICE'){target='clocker_devices';columns=['id'];key=[n.row.values[a.identifier]];}
    else if(scope==='WORKSPACE'){target='workspaces';columns=['id'];key=[n.row.values[a.identifier]];}
    else{diagnostics.push(problem('UNSUPPORTED_SCOPE','Unknown typed PIN scope.',n));continue;}
   }
   if(!target||!columns||!key)continue;
   const parent=find(target,columns,key);
   if(parent.length===1&&owners.has(parent[0].identity)&&owners.get(parent[0].identity)!==null){
    owners.set(n.identity,owners.get(parent[0].identity)!);evidence.set(n.identity,[]);progress=true;
   }
  }
 }
 for(const n of nodes)if(!owners.has(n.identity))diagnostics.push(problem('ORPHAN_REFERENCE','Missing or unresolved immutable ownership anchor.',n));
 function validateReference(n:RowNode,target:string,columns:string[],key:JsonValue[],historical:boolean,field:string){
  if(!rules.has(target)){diagnostics.push(problem('UNSUPPORTED_REFERENCE','Unclassified target table.',n,field));return;}
  const expected=owners.get(n.identity);
  if(historical){
   const witnesses=capture.historicalReferences.filter(h=>h.target===target&&same(h.targetColumns,columns)&&same(h.key,key)&&h.sourceRowChecksum===n.row.originalChecksum&&SHA.test(h.evidenceDigest));
   if(witnesses.length!==1){diagnostics.push(problem('HISTORY_EVIDENCE_REQUIRED','Historical literal needs row-checksum-bound preserved provenance; a current live row cannot replace it.',n,field));return;}
   if(witnesses[0].workspaceId!==expected)diagnostics.push(problem('ANCESTRY_CONFLICT','Historical source belongs to a different immutable workspace.',n,field));
   evidence.set(n.identity,[...(evidence.get(n.identity)??[]),witnesses[0].evidenceDigest]);return;
  }
  const targets=find(target,columns,key);
  if(targets.length!==1){diagnostics.push(problem('ORPHAN_REFERENCE','Exact current target key is missing or ambiguous.',n,field));return;}
  if(!owners.has(targets[0].identity)||owners.get(targets[0].identity)!==expected)
   diagnostics.push(problem('ANCESTRY_CONFLICT','All parent/actor/subject/location/source ownership must agree.',n,field));
 }
 for(const n of nodes){
  for(const ref of n.rule.references){
   const key=ref.columns.map(c=>n.row.values[c]);
   if(key.some(v=>v===null)){
    if(ref.columns.some((c,i)=>key[i]===null&&!n.rule.columns.find(x=>x.name===c)!.nullable))diagnostics.push(problem('ORPHAN_REFERENCE','Required reference is null.',n,ref.columns.join(',')));
    continue;
   }
   validateReference(n,ref.target,ref.targetColumns,key,ref.historical,ref.columns.join(','));
  }
  for(const ref of payloadReferences(n,capture.payloadCaptures,diagnostics))validateReference(n,ref.target,ref.targetColumns,ref.key,ref.historical,ref.field);
 }
 // Source devices.server.ts enrollment commits the hash/version to its permanent ledger before publishing the current credential.
 for(const device of nodes.filter(n=>n.rule.table==='clocker_devices'&&n.row.values.credential_hash!==null)){
  const ledger=find('clocker_device_credentials',['credential_hash'],[device.row.values.credential_hash]);
  if(ledger.length!==1||ledger[0].row.values.device_id!==device.row.values.id||ledger[0].row.values.credential_version!==device.row.values.credential_version)diagnostics.push(problem('GLOBAL_SECURITY_FENCE_CONFLICT','Current device credential must agree with its preserved globally fenced ledger identity/version.',device,'credential_hash'));
 }
 // Existing global keys stay global; proposed business namespaces include the resolved immutable workspace.
 const namespaces=new Map<string,RowNode>();
 function unique(n:RowNode,label:string,values:JsonValue[],global=false){
  if(values.some(v=>v===null)||!owners.has(n.identity))return;
  const namespace=canonicalOwnershipJson([n.rule.table,label,global?null:owners.get(n.identity),values]);
  const prior=namespaces.get(namespace);if(prior)diagnostics.push(problem('NAMESPACE_COLLISION','Preserved/candidate key collides with another retained row.',n,label));else namespaces.set(namespace,n);
 }
 for(const n of nodes){
  for(const k of n.rule.declaredKeys)if(k.kind==='UNIQUE')unique(n,k.name??canonicalOwnershipJson(k.columns),k.columns.map(c=>n.row.values[c]),true);
  const v=n.row.values;
  if(n.rule.table==='employees'){
   const number=typeof v.id==='string'?v.id.trim().toUpperCase():'';
   if(!number||/[\u0000-\u001f\u007f]/.test(number))diagnostics.push(problem('LEGACY_SELECTOR_UNREADABLE','Preserve the row; unreadable legacy selector requires explicit source reconciliation.',n));
   else unique(n,'normalized_number',[number]);
   if(typeof v.email==='string'&&v.email!=='')unique(n,'email_ci',[v.email.toLowerCase()]);
  }
  if(['positions','clocker_break_types'].includes(n.rule.table)&&typeof v.name==='string')unique(n,'name_ci',[v.name.toLowerCase()]);
  if(n.rule.table==='schedule_templates'&&v.active===true&&typeof v.name==='string')unique(n,'active_name_ci',[v.name.toLowerCase()]);
  if(n.rule.table==='locations')unique(n,'clocker_key',[v.clocker_key]);
  if(n.rule.table==='schedule_week_settings')unique(n,'week',[v.week_start]);
  if(n.rule.table==='schedule_publication_revisions')unique(n,'publication_number',[v.week_start,v.revision_number]);
  if(n.rule.table==='push_subscriptions'){
   unique(n,'installation_global',[v.installation_hash,v.environment],true);
   if(v.status==='active')unique(n,'active_endpoint_global',[v.endpoint_fingerprint,v.environment],true);
  }
 }
 if(diagnostics.length)return blocked();
 const entries=nodes.map(n=>makeEntry(n,owners.get(n.identity)!,evidence.get(n.identity)??[]));
 const binding={...base,registryDigest:registry.digest,entries,chunkSize:capture.chunkSize,writeFence:fence,
  historicalReferences:sorted(capture.historicalReferences),mappings:sorted(capture.mappings),payloadCaptures:sorted(capture.payloadCaptures),
  installation:capture.installation??null};
 const digest=ownershipDigest(binding),chunks=buildChunks(entries,digest,capture.chunkSize);
 return {...base,status:'READY_FOR_GUARDED_EXECUTION',digest,manifest:JSON.parse(canonicalOwnershipJson(binding)),entries,chunks,diagnostics:[]};
}
export function resumeTenantBackfill(plan:BackfillPlan,completed:CompletedChunk[],existing:OwnershipRecord[]):ResumeOutcome{
 const diagnostics:OwnershipDiagnostic[]=[],pending:BackfillEntry[]=[],seen=new Set<string>(),records=new Map<string,OwnershipRecord>();
 if(plan.status!=='READY_FOR_GUARDED_EXECUTION')return {status:'BLOCKED',pending:[],diagnostics:[problem('BLOCKED_PREFLIGHT','Cannot resume a blocked plan.')]};
 let coherent=false;
 try {
  const m=plan.manifest as Record<string,JsonValue>|null;
  coherent=!!m&&ownershipDigest(m)===plan.digest&&m.registryDigest===plan.registryDigest&&plan.registryDigest===getOwnershipRegistry().digest&&m.sourceDigest===plan.sourceDigest&&m.schemaDigest===plan.schemaDigest&&m.snapshotId===plan.snapshotId&&same(m.entries,plan.entries)&&typeof m.chunkSize==='number'&&Number.isSafeInteger(m.chunkSize)&&m.chunkSize>=1&&m.chunkSize<=1000&&same(buildChunks(plan.entries,plan.digest,m.chunkSize),plan.chunks);
 } catch {coherent=false;}
 if(!coherent)return {status:'BLOCKED',pending:[],diagnostics:[problem('PLAN_MANIFEST_DRIFT','Saved plan rows, chunks, source/registry/mapping manifest or digest changed.')]};
 const expectedIdentities=new Set(plan.entries.map(e=>identity(e.table,e.key)));
 for(const r of existing){
  if(!expectedIdentities.has(identity(r.table,r.key)))diagnostics.push(problem('UNEXPECTED_EXISTING_OWNERSHIP','Typed metadata outside the complete captured source set requires a fresh reconciled capture.'));
  const id=identity(r.table,r.key);if(records.has(id))diagnostics.push(problem('EXISTING_OWNERSHIP_CONFLICT','Duplicate typed metadata identity.'));records.set(id,r);
 }
 for(const entry of plan.entries){
  const r=records.get(identity(entry.table,entry.key));
  if(!r){pending.push(entry);continue;}
  if(r.workspaceId!==entry.workspaceId||r.sourceChecksum!==entry.sourceChecksum||r.mirroredIdentityChecksum!==entry.mirroredIdentityChecksum)
   diagnostics.push({code:'EXISTING_OWNERSHIP_CONFLICT',table:entry.table,key:entry.key,detail:'Retry cannot change ownership or original source/history checksums.'});
 }
 for(const receipt of completed){
  const chunk=plan.chunks.find(c=>c.id===receipt.id);
  if(seen.has(receipt.id))diagnostics.push(problem('RESUME_MANIFEST_DRIFT','Duplicate chunk receipt.'));seen.add(receipt.id);
  if(!chunk||receipt.planDigest!==plan.digest||receipt.count!==chunk.count||receipt.sourceChecksum!==chunk.sourceChecksum||receipt.targetChecksum!==chunk.targetChecksum||
   !['STARTED','COMPLETE'].includes(receipt.state)){diagnostics.push(problem('RESUME_MANIFEST_DRIFT','Chunk receipt/source/registry/mapping fingerprint differs.'));continue;}
  if(receipt.state==='COMPLETE'&&chunk.entries.some(e=>!records.has(identity(e.table,e.key))))diagnostics.push(problem('INCOMPLETE_CHUNK_METADATA','Completed journal requires matching typed metadata for every row.'));
 }
 return {status:diagnostics.length?'BLOCKED':'READY',pending:diagnostics.length?[]:pending,diagnostics:sorted(diagnostics)};
}
export function planNewOwnershipWrite(rule:TableOwnership,request:NewWriteRequest):NewWritePlan{
 const registry=getOwnershipRegistry(),diagnostics:OwnershipDiagnostic[]=[],base={tenantGateFirst:true as const,immutableOwnership:true as const,verification:'TRANSACTION_SPECIFICATION_NOT_EXECUTED' as const};
 const registered=registry.tables.find(t=>t.table===rule.table);
 if(!registered||!same(rule,registered))diagnostics.push(problem('REGISTRY_DRIFT','Only exact reviewed source contracts may plan writes.'));
 diagnostics.push(...shapeDiagnostics(rule,request.values));
 if(diagnostics.length)return {...base,status:'BLOCKED',sourceKey:[],metadata:null,steps:[],diagnostics:sorted(diagnostics)};
 const key=rule.primaryKey.map(c=>request.values[c]??null),node:RowNode={rule,key,row:{values:request.values,originalChecksum:ownershipDigest(request.values)},identity:identity(rule.table,key)};
 if(rule.storage==='GLOBAL_SECURITY_CONTROL')diagnostics.push(problem('GLOBAL_CONTROL_NOT_CUSTOMER_WRITE','Global controls require a separate narrow control-plane writer; tenant SQL cannot write them.'));
 if(!request.workspaceId)diagnostics.push(problem('MAPPING_REQUIRED','Current guarded immutable tenant is required.'));
 const a=rule.anchor;
 if((a.kind==='DIRECT'||a.kind==='ROOT')&&request.values[a.column]!==request.workspaceId)diagnostics.push(problem('ANCESTRY_CONFLICT','Direct immutable source owner differs from guarded tenant.',node));
 function check(target:string,columns:string[],key:JsonValue[],historical:boolean,field:string){
  const refs=request.parentOwnership.filter(p=>p.target===target&&same(p.targetColumns,columns)&&same(p.key,key)&&SHA.test(p.evidenceDigest)&&(!historical||p.sourceRowChecksum===node.row.originalChecksum));
  if(refs.length!==1){diagnostics.push(problem('ORPHAN_REFERENCE','Guarded parent ownership must be locked and validated in the same transaction.',node,field));return;}
  if(refs[0].workspaceId!==request.workspaceId)diagnostics.push(problem('ANCESTRY_CONFLICT','New source/actor/parent belongs to another immutable tenant.',node,field));
 }
 for(const ref of rule.references){
  const values=ref.columns.map(c=>request.values[c]);
  if(values.some(v=>v===null)){if(ref.columns.some((c,i)=>values[i]===null&&!rule.columns.find(x=>x.name===c)!.nullable))diagnostics.push(problem('ORPHAN_REFERENCE','Required source identity is null.',node));continue;}
  check(ref.target,ref.targetColumns,values,ref.historical,ref.columns.join(','));
 }
 if(a.kind==='TYPED_SCOPE'){
  if(request.values[a.discriminator]==='DEVICE')check('clocker_devices',['id'],[request.values[a.identifier]],false,a.identifier);
  else if(request.values[a.discriminator]==='WORKSPACE')check('workspaces',['id'],[request.values[a.identifier]],false,a.identifier);
  else diagnostics.push(problem('UNSUPPORTED_SCOPE','Unknown typed PIN limiter scope.',node));
 }
 for(const ref of payloadReferences(node,request.payloadCaptures,diagnostics))check(ref.target,ref.targetColumns,ref.key,ref.historical,ref.field);
 if(request.existingOwnership&&(request.existingOwnership.workspaceId!==request.workspaceId||!same(request.existingOwnership.key,key)||request.existingOwnership.table!==rule.table||request.existingOwnership.sourceChecksum!==node.row.originalChecksum||request.existingOwnership.mirroredIdentityChecksum!==makeEntry(node,request.workspaceId,[]).mirroredIdentityChecksum))
  diagnostics.push(problem('EXISTING_OWNERSHIP_CONFLICT','New-write protocol cannot reattribute an existing immutable identity.',node));
 const metadata=diagnostics.length?null:makeEntry(node,request.workspaceId,sorted(request.parentOwnership.map(p=>p.evidenceDigest)));
 const steps=diagnostics.length?[]:request.existingOwnership?['BEGIN','TENANT_GATE','LOCK_AND_VALIDATE_IMMUTABLE_PARENTS','VERIFY_IDENTICAL_SOURCE_AND_OWNERSHIP','COMMIT']:['BEGIN','TENANT_GATE','LOCK_AND_VALIDATE_IMMUTABLE_PARENTS',
  ...(rule.storage==='TYPED_HISTORICAL_SIDECAR'?['INSERT_TYPED_SIDECAR_WITH_DEFERRED_SOURCE_FK']:[]),
  'INSERT_SOURCE_WITH_TENANT_CHECK',...(rule.storage==='TYPED_HISTORICAL_SIDECAR'?['VALIDATE_SOURCE_SIDECAR_IDENTITY']:[]),'COMMIT'];
 return {...base,status:diagnostics.length?'BLOCKED':'READY_FOR_ATOMIC_INSERT',sourceKey:key,metadata,steps,diagnostics:sorted(diagnostics)};
}
