import {types as utilTypes} from 'node:util';
import {isIssuedInspectedTypedSnapshot,type InspectedTypedSnapshotColumn,type InspectedTypedSnapshotRow} from './typed-snapshot';
import {canonicalOwnershipJson,getOwnershipRegistry,ownershipDigest,type JsonValue,type TableOwnership} from './ownership';
import {getTypedReferenceColumnContract,isIssuedTypedMigrationCellReferences,type TypedMigrationCellReferences,type TypedReferenceLiteral} from './typed-reference';
export type TypedOwnershipBoundary={registryDigest:string;sourceDigest:string;currentSchemaDigest:string;snapshotId:string;fenceGeneration:string;factsDigest:string};
export type TypedOwnershipMapping={table:string;key:JsonValue[];workspaceId:string;rowChecksum:string;evidenceDigest:string};
export type TypedOwnershipHistory={target:string;targetColumns:string[];key:TypedReferenceLiteral[];workspaceId:string;sourceRowChecksum:string;evidenceDigest:string};
export type TypedOwnershipColumnReview={table:string;key:JsonValue[];rowChecksum:string;column:string;classification:TypedMigrationCellReferences};
export type TypedOwnershipAssignments={boundary:TypedOwnershipBoundary;mappings:TypedOwnershipMapping[];historicalReferences:TypedOwnershipHistory[];installation:null|{workspaceId:string;evidenceDigest:string;coveredRows:{table:string;key:JsonValue[];rowChecksum:string}[]};columns:TypedOwnershipColumnReview[]};
export type TypedOwnedReferenceObservation=Readonly<{source:'PHYSICAL_REFERENCE'|'COLUMN_REVIEW'|'TYPED_SCOPE';field:string;target:string;targetColumns:readonly string[];key:readonly TypedReferenceLiteral[];historical:boolean;targetRowChecksum:string|null;evidenceDigest:string|null}>;
export type TypedAssignedSourceRow=Readonly<{table:string;key:readonly JsonValue[];rowChecksum:string;workspaceId:string|null;storage:string;sidecar:string|null;globalFences:readonly string[];columns:readonly InspectedTypedSnapshotColumn[];columnReviews:readonly TypedMigrationCellReferences[];references:readonly TypedOwnedReferenceObservation[];evidenceDigests:readonly string[]}>;
export type TypedOwnershipSourceObservations=Readonly<{format:'TYPED_OWNERSHIP_SOURCE_OBSERVATIONS_V1';boundary:Readonly<TypedOwnershipBoundary>;namespaceCaptureChecksum:string;tables:readonly Readonly<{table:string;count:number;checksum:string}>[];rows:readonly TypedAssignedSourceRow[];assignmentEvidenceDigest:string;digest:string;verification:'PURE_NOT_DB_OPERATOR_TENANT_AUTHORITY';remainingGates:readonly string[]}>;
export type TypedOwnershipOutcome=Readonly<{status:'RESOLVED_SOURCE_OBSERVATIONS';observations:TypedOwnershipSourceObservations}>|Readonly<{status:'BLOCKED';code:string}>;
const SHA=/^[a-f0-9]{64}$/;
const registry=getOwnershipRegistry();
const issued=new WeakSet<object>();
const rules=new Map(registry.tables.map(rule=>[rule.table,rule]));
const TEXT_KEY_TYPES=new Set(['text','uuid','char(32)','char(64)']);
class OwnershipFailure extends Error{constructor(readonly code:string){super(code);}}
function fail(code:string):never{throw new OwnershipFailure(code);}
const blocked=(code:string):TypedOwnershipOutcome=>Object.freeze({status:'BLOCKED',code});
const same=(a:unknown,b:unknown)=>canonicalOwnershipJson(a)===canonicalOwnershipJson(b);
function exact(value:unknown,fields:string[]):value is Record<string,unknown>{return typeof value==='object'&&value!==null&&!Array.isArray(value)&&Object.keys(value).length===fields.length&&fields.every(k=>Object.hasOwn(value,k));}
function text(value:unknown):value is string{return typeof value==='string'&&value.length>0;}
function digest(value:unknown):value is string{return typeof value==='string'&&SHA.test(value);}
function key(value:unknown):value is JsonValue[]{return Array.isArray(value)&&value.length>0&&value.every(v=>typeof v==='string'||typeof v==='boolean'||(typeof v==='number'&&Number.isSafeInteger(v)&&!Object.is(v,-0)));}
function literal(value:unknown):value is TypedReferenceLiteral{
 if(exact(value,['kind','text']))return value.kind==='TEXT'&&typeof value.text==='string';
 if(exact(value,['kind','value']))return value.kind==='JSON_BOOLEAN'&&typeof value.value==='boolean';
 if(exact(value,['kind','lexeme']))return value.kind==='JSON_NUMBER'&&typeof value.lexeme==='string'&&/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/.test(value.lexeme);
 return false;
}
/** Preserve genuine opaque reviews. All other input is detached ordinary own
 * data, with proxies rejected before reflection and accessors before reads. */
function detach(input:unknown,ancestors=new Set<object>()):unknown{
 if(isIssuedTypedMigrationCellReferences(input))return input;
 if(input===null||typeof input==='string'||typeof input==='boolean')return input;
 if(typeof input==='number'&&Number.isSafeInteger(input)&&!Object.is(input,-0))return input;
 if(typeof input!=='object'||input===null||utilTypes.isProxy(input)||ancestors.has(input))fail('UNSUPPORTED_OWNERSHIP_INPUT');
 const array=Array.isArray(input);
 if(Object.getPrototypeOf(input)!==(array?Array.prototype:Object.prototype))fail('UNSUPPORTED_OWNERSHIP_INPUT');
 const keys=Reflect.ownKeys(input),descriptors=Object.getOwnPropertyDescriptors(input);
 if(keys.some(k=>typeof k!=='string'))fail('UNSUPPORTED_OWNERSHIP_INPUT');
 ancestors.add(input);
 try{
  if(array){
   const length=descriptors.length;
   if(!length||!('value'in length)||!Number.isSafeInteger(length.value)||length.value<0||keys.length!==length.value+1)fail('UNSUPPORTED_OWNERSHIP_INPUT');
   const result:unknown[]=[];
   for(let i=0;i<length.value;i++){const d=descriptors[String(i)];if(!d||!('value'in d)||!d.enumerable)fail('UNSUPPORTED_OWNERSHIP_INPUT');result.push(detach(d.value,ancestors));}
   return result;
  }
  const result:Record<string,unknown>={};
  for(const k of keys as string[]){const d=descriptors[k];if(!d||!('value'in d)||!d.enumerable)fail('UNSUPPORTED_OWNERSHIP_INPUT');Object.defineProperty(result,k,{value:detach(d.value,ancestors),enumerable:true});}
  return result;
 }finally{ancestors.delete(input);}
}
function freeze<T>(value:T):T{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const d of Object.values(Object.getOwnPropertyDescriptors(value)))if('value'in d)freeze(d.value);Object.freeze(value);}return value;
}
function shape(input:unknown):TypedOwnershipAssignments{
 if(!exact(input,['boundary','mappings','historicalReferences','installation','columns'])||!exact(input.boundary,['registryDigest','sourceDigest','currentSchemaDigest','snapshotId','fenceGeneration','factsDigest']))fail('INVALID_OWNERSHIP_ASSIGNMENTS');
 const b=input.boundary;
 if(![b.registryDigest,b.sourceDigest,b.currentSchemaDigest,b.factsDigest].every(digest)||!text(b.snapshotId)||typeof b.fenceGeneration!=='string'||!/^(0|[1-9][0-9]*)$/.test(b.fenceGeneration))fail('INVALID_OWNERSHIP_ASSIGNMENTS');
 if(!Array.isArray(input.mappings)||!input.mappings.every(m=>exact(m,['table','key','workspaceId','rowChecksum','evidenceDigest'])&&text(m.table)&&key(m.key)&&typeof m.workspaceId==='string'&&digest(m.rowChecksum)&&digest(m.evidenceDigest)))fail('INVALID_OWNERSHIP_ASSIGNMENTS');
 if(!Array.isArray(input.historicalReferences)||!input.historicalReferences.every(h=>exact(h,['target','targetColumns','key','workspaceId','sourceRowChecksum','evidenceDigest'])&&text(h.target)&&Array.isArray(h.targetColumns)&&h.targetColumns.length>0&&h.targetColumns.every(text)&&Array.isArray(h.key)&&h.key.length===h.targetColumns.length&&h.key.every(literal)&&typeof h.workspaceId==='string'&&digest(h.sourceRowChecksum)&&digest(h.evidenceDigest)))fail('INVALID_OWNERSHIP_ASSIGNMENTS');
 const i=input.installation;
 if(i!==null&&(!exact(i,['workspaceId','evidenceDigest','coveredRows'])||typeof i.workspaceId!=='string'||!digest(i.evidenceDigest)||!Array.isArray(i.coveredRows)||!i.coveredRows.every(c=>exact(c,['table','key','rowChecksum'])&&text(c.table)&&key(c.key)&&digest(c.rowChecksum))))fail('INVALID_OWNERSHIP_ASSIGNMENTS');
 if(!Array.isArray(input.columns)||!input.columns.every(c=>exact(c,['table','key','rowChecksum','column','classification'])&&text(c.table)&&key(c.key)&&digest(c.rowChecksum)&&text(c.column)))fail('INVALID_OWNERSHIP_ASSIGNMENTS');
 // Check issuance before any classification property read. Detached clones do
 // not gain the original review's private provenance.
 if(!input.columns.every(c=>isIssuedTypedMigrationCellReferences(c.classification)))fail('UNISSUED_COLUMN_REVIEW');
 return input as unknown as TypedOwnershipAssignments;
}
type Node={identity:string;rule:TableOwnership;row:InspectedTypedSnapshotRow;reviews:TypedMigrationCellReferences[];references:TypedOwnedReferenceObservation[];evidence:Set<string>};
const identity=(table:string,rowKey:readonly JsonValue[])=>canonicalOwnershipJson([table,rowKey]);
const historyIdentity=(h:Pick<TypedOwnershipHistory,'target'|'targetColumns'|'key'|'sourceRowChecksum'>)=>canonicalOwnershipJson([h.target,h.targetColumns,h.key,h.sourceRowChecksum]);
function indexed<T>(values:readonly T[],id:(value:T)=>string,code:string):Map<string,T>{const map=new Map<string,T>();for(const v of values){const k=id(v);if(map.has(k))fail(code);map.set(k,v);}return map;}
function cell(node:Node,column:string):InspectedTypedSnapshotColumn{const c=node.row.columns.find(c=>c.name===column);if(!c)fail('UNSUPPORTED_SOURCE_COLUMN');return c;}
function scalar(node:Node,column:string):string|null{
 const c=cell(node,column),v=c.lineage.nodes[0].value;
 if(v.kind==='SQL_NULL')return null;
 if(v.kind!=='SQL_SCALAR'||c.wire!==v.text)fail('UNSUPPORTED_REFERENCE_COMPARATOR');
 return v.text;
}
function physicalKey(node:Node,columns:readonly string[]):TypedReferenceLiteral[]{return columns.map(c=>{const v=scalar(node,c);if(v===null)fail('CURRENT_REFERENCE_MISSING_OR_AMBIGUOUS');return {kind:'TEXT',text:v};});}
function sorted<T>(values:readonly T[]):T[]{return [...values].sort((a,b)=>{const x=canonicalOwnershipJson(a),y=canonicalOwnershipJson(b);return x<y?-1:x>y?1:0;});}

/** Complete source-specific ancestry observations only. A genuine inspected
 * snapshot and genuine complete cell reviews are mandatory. Their hashes bind
 * supplied evidence; they do not approve a reviewer or authenticate an operator,
 * database, current fence, retained-history store, or tenant principal. No
 * namespace uniqueness/comparison approval, executable plan or effects claim
 * is produced. No code, SQL, filesystem, network or DB operation runs here.
 *
 * SQL scalar physical references compare exact source types and original wire.
 * Typed TEXT keys support only string key source types. Numeric/boolean JSON to
 * SQL key conversion is deliberately unsupported until a separately proven
 * comparator/mapping contract exists. SQLNULL physical MATCH SIMPLE absence is
 * distinct from JSONNULL and retained JSON member-name identity.
 */
export function validateTypedSnapshotOwnership(snapshot:unknown,observedAssignments:unknown):TypedOwnershipOutcome{
 if(!isIssuedInspectedTypedSnapshot(snapshot))return blocked('UNISSUED_TYPED_SNAPSHOT');
 try{
  const assignments=shape(detach(observedAssignments));
  const boundary:TypedOwnershipBoundary={registryDigest:snapshot.registryDigest,sourceDigest:snapshot.sourceDigest,currentSchemaDigest:snapshot.currentSchemaDigest,snapshotId:snapshot.snapshotId,fenceGeneration:snapshot.fenceGeneration,factsDigest:snapshot.factsDigest};
  if(!same(boundary,assignments.boundary))fail('OWNERSHIP_BOUNDARY_DRIFT');
  const nodes:Node[]=snapshot.tables.flatMap(t=>t.rows.map(row=>({identity:identity(t.table,row.key),rule:rules.get(t.table)!,row,reviews:[],references:[],evidence:new Set<string>()})));
  const byTable=new Map(registry.tables.map(rule=>[rule.table,nodes.filter(n=>n.rule.table===rule.table)]));
  const mappings=indexed(assignments.mappings,m=>identity(m.table,m.key),'DUPLICATE_MAPPING');
  const histories=indexed(assignments.historicalReferences,historyIdentity,'DUPLICATE_HISTORY');
  const coverage=indexed(assignments.installation?.coveredRows??[],c=>identity(c.table,c.key),'DUPLICATE_INSTALLATION');
  const reviews=indexed(assignments.columns,c=>canonicalOwnershipJson([c.table,c.key,c.column]),'DUPLICATE_COLUMN_REVIEW');
  const usedMappings=new Set<string>(),usedHistory=new Set<string>(),usedCoverage=new Set<string>(),usedReviews=new Set<string>();
  const owners=new Map<string,string|null>();
  function checkComparator(target:string,columns:readonly string[],refKey:readonly TypedReferenceLiteral[],sourceTypes?:readonly string[]){
   const rule=rules.get(target);
   if(!rule||columns.length!==refKey.length||!columns.length||new Set(columns).size!==columns.length)fail('UNSUPPORTED_REFERENCE_COMPARATOR');
   for(let i=0;i<columns.length;i++){
    const type=rule.columns.find(c=>c.name===columns[i])?.type;
    if(!type||!TEXT_KEY_TYPES.has(type)||refKey[i].kind!=='TEXT'||(sourceTypes&&sourceTypes[i]!==type))fail('UNSUPPORTED_REFERENCE_COMPARATOR');
   }
  }
  function find(target:string,columns:readonly string[],refKey:readonly TypedReferenceLiteral[],sourceTypes?:readonly string[]):Node[]{
   checkComparator(target,columns,refKey,sourceTypes);
   return byTable.get(target)!.filter(n=>columns.every((c,i)=>scalar(n,c)===(refKey[i] as Extract<TypedReferenceLiteral,{kind:'TEXT'}>).text));
  }
  function workspaceExists(owner:string):boolean{return find('workspaces',['id'],[{kind:'TEXT',text:owner}]).length===1;}
  // Every declared payload/typed field is independently reviewed, including
  // SQLNULL. Physical reference columns are not double-counted as reviews.
  for(const n of nodes)for(const column of new Set([...n.rule.payloads.map(p=>p.column),...n.rule.typedFields])){
   const id=canonicalOwnershipJson([n.rule.table,n.row.key,column]),a=reviews.get(id);
   if(!a)fail('COLUMN_REVIEW_REQUIRED');
   const c=cell(n,column),contract=getTypedReferenceColumnContract(n.rule.table,column);
   if(a.rowChecksum!==n.row.originalChecksum||contract.status!=='CONTRACT'||a.classification.contract.checksum!==contract.contract.checksum||a.classification.contract.table!==n.rule.table||a.classification.contract.column!==column||!same(a.classification.source,c.lineage.source))fail('COLUMN_REVIEW_SOURCE_DRIFT');
   usedReviews.add(id);n.reviews.push(a.classification);n.evidence.add(a.classification.reviewEvidenceDigest);
  }
  if(usedReviews.size!==reviews.size)fail('UNCONSUMED_COLUMN_REVIEW');
  // Seed only declared immutable/root/global/installation anchors.
  for(const n of nodes){
   const a=n.rule.anchor;let owner:string|undefined;
   if(a.kind==='GLOBAL_SECURITY_CONTROL'){owners.set(n.identity,null);continue;}
   if(a.kind==='ROOT'||a.kind==='DIRECT'){const v=scalar(n,a.column);if(v===null)fail('OWNERSHIP_WORKSPACE_MISSING');owner=v;}
   if(a.kind==='CAPTURED_IMMUTABLE'){
    const m=mappings.get(n.identity);if(!m)fail('IMMUTABLE_MAPPING_REQUIRED');
    if(m.rowChecksum!==n.row.originalChecksum)fail('IMMUTABLE_MAPPING_DRIFT');usedMappings.add(n.identity);owner=m.workspaceId;n.evidence.add(m.evidenceDigest);
   }
   if(a.kind==='INSTALLATION_PROVENANCE'){
    const c=coverage.get(n.identity),i=assignments.installation;
    if(!c||!i)fail('INSTALLATION_PROVENANCE_REQUIRED');
    if(c.rowChecksum!==n.row.originalChecksum)fail('INSTALLATION_PROVENANCE_DRIFT');usedCoverage.add(n.identity);owner=i.workspaceId;n.evidence.add(i.evidenceDigest);
   }
   if(owner!==undefined){if(!workspaceExists(owner))fail('OWNERSHIP_WORKSPACE_MISSING');owners.set(n.identity,owner);}
  }
  if(usedMappings.size!==mappings.size)fail('UNCONSUMED_MAPPING');
  if(usedCoverage.size!==coverage.size||(assignments.installation!==null&&usedCoverage.size===0))fail('UNCONSUMED_INSTALLATION');
  let progress=true;
  while(progress){
   progress=false;
   for(const n of nodes){
    if(owners.has(n.identity))continue;
    const a=n.rule.anchor;let target:string,columns:readonly string[],refKey:TypedReferenceLiteral[],types:string[];
    if(a.kind==='PARENT'){target=a.target;columns=a.targetColumns;refKey=physicalKey(n,a.columns);types=a.columns.map(c=>cell(n,c).type);}
    else if(a.kind==='TYPED_SCOPE'){
     const scope=scalar(n,a.discriminator);
     if(scope!=='DEVICE'&&scope!=='WORKSPACE'&&scope!=='PERSON')fail('UNSUPPORTED_TYPED_SCOPE');
     target=scope==='DEVICE'?'clocker_devices':scope==='PERSON'?'employees':'workspaces';columns=['id'];refKey=physicalKey(n,[a.identifier]);types=[cell(n,a.identifier).type];
    }else continue;
    const parents=find(target,columns,refKey,types);
    if(parents.length!==1)fail('CURRENT_REFERENCE_MISSING_OR_AMBIGUOUS');
    const parent=parents[0];
    if(owners.has(parent.identity)&&owners.get(parent.identity)!==null){owners.set(n.identity,owners.get(parent.identity)!);progress=true;
     if(a.kind==='TYPED_SCOPE')n.references.push({source:'TYPED_SCOPE',field:a.identifier,target,targetColumns:columns,key:refKey,historical:false,targetRowChecksum:parent.row.originalChecksum,evidenceDigest:null});
    }
   }
  }
  if(nodes.some(n=>!owners.has(n.identity)))fail('UNRESOLVED_OWNERSHIP_ANCHOR');
  function reference(n:Node,source:TypedOwnedReferenceObservation['source'],field:string,target:string,columns:readonly string[],refKey:readonly TypedReferenceLiteral[],historical:boolean,sourceTypes?:readonly string[]){
   checkComparator(target,columns,refKey,sourceTypes);
   let targetRowChecksum:string|null=null,evidenceDigest:string|null=null;
   if(historical){
    const id=historyIdentity({target,targetColumns:[...columns],key:[...refKey],sourceRowChecksum:n.row.originalChecksum}),h=histories.get(id);
    if(!h)fail('RETAINED_HISTORY_REQUIRED');
    if(h.workspaceId!==owners.get(n.identity))fail('RETAINED_HISTORY_OWNER_CONFLICT');usedHistory.add(id);n.evidence.add(h.evidenceDigest);evidenceDigest=h.evidenceDigest;
   }else{
    const targets=find(target,columns,refKey,sourceTypes);
    if(targets.length!==1)fail('CURRENT_REFERENCE_MISSING_OR_AMBIGUOUS');
    const parent=targets[0];if(owners.get(parent.identity)!==owners.get(n.identity))fail('CURRENT_REFERENCE_OWNER_CONFLICT');targetRowChecksum=parent.row.originalChecksum;
   }
   n.references.push({source,field,target,targetColumns:[...columns],key:[...refKey],historical,targetRowChecksum,evidenceDigest});
  }
  for(const n of nodes){
   for(const r of n.rule.references){
    // Declared MATCH SIMPLE: any SQLNULL component means physical absence.
    // This never removes a separately required typed/payload column review.
    if(r.columns.some(c=>scalar(n,c)===null))continue;
    reference(n,'PHYSICAL_REFERENCE',r.columns.join(','),r.target,r.targetColumns,physicalKey(n,r.columns),r.historical,r.columns.map(c=>cell(n,c).type));
   }
   for(const c of n.reviews)for(const r of c.references)reference(n,'COLUMN_REVIEW',c.contract.column+'/'+canonicalOwnershipJson(r.address),r.target,r.targetColumns,r.key,r.historicalRequired||r.historicalRequested);
  }
  if(usedHistory.size!==histories.size)fail('UNCONSUMED_HISTORY');
  // Permanent globally fenced credential hashes retain exact current identity
  // and version linkage; this is not a global uniqueness/index proof.
  for(const n of byTable.get('clocker_devices')!){
   const hash=scalar(n,'credential_hash');if(hash===null)continue;
   const ledger=find('clocker_device_credentials',['credential_hash'],[{kind:'TEXT',text:hash}],['text']);
   if(ledger.length!==1||scalar(ledger[0],'device_id')!==scalar(n,'id')||scalar(ledger[0],'credential_version')!==scalar(n,'credential_version'))fail('GLOBAL_DEVICE_LEDGER_CONFLICT');
  }
  const canonicalAssignments={boundary,mappings:sorted(assignments.mappings),historicalReferences:sorted(assignments.historicalReferences),installation:assignments.installation===null?null:{workspaceId:assignments.installation.workspaceId,evidenceDigest:assignments.installation.evidenceDigest,coveredRows:sorted(assignments.installation.coveredRows)},columns:sorted(assignments.columns.map(c=>({table:c.table,key:c.key,rowChecksum:c.rowChecksum,column:c.column,classificationDigest:c.classification.digest})))};
  const body={format:'TYPED_OWNERSHIP_SOURCE_OBSERVATIONS_V1' as const,boundary,namespaceCaptureChecksum:snapshot.namespaceCaptureChecksum,tables:snapshot.tables.map(t=>({table:t.table,count:t.expectedCount,checksum:t.expectedChecksum})),rows:nodes.map(n=>({table:n.rule.table,key:n.row.key,rowChecksum:n.row.originalChecksum,workspaceId:owners.get(n.identity)!,storage:n.rule.storage,sidecar:n.rule.sidecar,globalFences:[...n.rule.globalFences],columns:n.row.columns,columnReviews:sorted(n.reviews),references:sorted(n.references),evidenceDigests:[...n.evidence].sort()})),assignmentEvidenceDigest:ownershipDigest(canonicalAssignments),verification:'PURE_NOT_DB_OPERATOR_TENANT_AUTHORITY' as const,remainingGates:['NAMESPACE_SEMANTICS','REVIEWER_AND_RETAINED_HISTORY_EVIDENCE_APPROVAL','FRESH_DATABASE_SOURCE_FENCE_AND_OPERATOR_AUTHORITY','TYPED_EXECUTABLE_PLAN_AND_ATOMIC_EFFECT_VERIFICATION']};
  const observations:TypedOwnershipSourceObservations=freeze({...body,digest:ownershipDigest(body)});
  issued.add(observations);return Object.freeze({status:'RESOLVED_SOURCE_OBSERVATIONS',observations});
 }catch(error){return blocked(error instanceof OwnershipFailure?error.code:'INVALID_OWNERSHIP_STRUCTURE');}
}
/** Trap-free local source-observation issuance, never DB/operator/tenant authority. */
export function isIssuedTypedOwnershipSourceObservations(input:unknown):input is TypedOwnershipSourceObservations{return typeof input==='object'&&input!==null&&issued.has(input);}
