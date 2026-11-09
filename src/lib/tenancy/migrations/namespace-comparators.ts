import {canonicalOwnershipJson,ownershipDigest,getOwnershipRegistry,verifyOwnershipSource,type JsonValue,type MigrationSource,type OwnershipDiagnostic,type TableOwnership} from './ownership';
import type {DatabaseNamespaceComparators,DatabaseCollationCapture,DatabaseComparatorRow} from './backfill';
import {isIssuedInspectedTypedSnapshot} from './typed-snapshot';
export type NamespaceCaptureContext={registryDigest:string;sourceDigest:string;currentSchemaDigest:string;snapshot:{id:string};tables:readonly {table:string;expectedCount:number;expectedChecksum:string}[];migrations:MigrationSource[];namespaceComparators:DatabaseNamespaceComparators};
export type NamespaceRowObservation={rule:TableOwnership;row:{values:Record<string,JsonValue>;originalChecksum:string};key:JsonValue[]};
const SHA=/^[a-f0-9]{64}$/;
const same=(a:unknown,b:unknown)=>canonicalOwnershipJson(a)===canonicalOwnershipJson(b);
function problem(code:string,detail:string,node?:NamespaceRowObservation,field?:string):OwnershipDiagnostic{return {code,detail,...(node?{table:node.rule.table,key:node.key}:{}),...(field?{field}:{})};}
// Closed source contracts supplement (and do not change) the ownership registry.
// pg_get_expr/pg_get_indexdef spellings below require exact catalog capture;
// a different catalog/engine contract needs explicit reviewed reconciliation.
export const DATABASE_NAMESPACES=Object.freeze(([
 {contractId:'employees.email_ci',table:'employees',column:'email',label:'email_ci',source:{path:'db/migrations/0001_initial.sql',line:31},expression:'lower(email)',predicate:'(email IS NOT NULL)',indexDefinition:'CREATE UNIQUE INDEX employees_email_unique ON public.employees USING btree (lower(email)) WHERE (email IS NOT NULL)'},
 {contractId:'positions.name_ci',table:'positions',column:'name',label:'name_ci',source:{path:'db/migrations/0008_workspace_positions.sql',line:42},expression:'lower(name)',predicate:null,indexDefinition:'CREATE UNIQUE INDEX positions_workspace_name_unique ON public.positions USING btree (workspace_id, lower(name))'},
 {contractId:'clocker_break_types.name_ci',table:'clocker_break_types',column:'name',label:'name_ci',source:{path:'db/migrations/0014_clocker_breaks.sql',line:16},expression:'lower(name)',predicate:null,indexDefinition:'CREATE UNIQUE INDEX clocker_break_type_name ON public.clocker_break_types USING btree (workspace_id, lower(name))'},
 {contractId:'schedule_templates.active_name_ci',table:'schedule_templates',column:'name',label:'active_name_ci',source:{path:'db/migrations/0003_schedule_assistance.sql',line:91},expression:'lower(name)',predicate:'(active = true)',indexDefinition:'CREATE UNIQUE INDEX schedule_templates_name_unique ON public.schedule_templates USING btree (lower(name)) WHERE (active = true)'},
] as const).map(contract=>Object.freeze({...contract,source:Object.freeze({...contract.source})})));
function namespaceRowSetChecksum(capture:NamespaceCaptureContext):string{
 return ownershipDigest([...capture.tables].sort((a,b)=>a.table<b.table?-1:1).map(t=>({table:t.table,count:t.expectedCount,checksum:t.expectedChecksum})));
}
function safeSame(a:unknown,b:unknown):boolean{try{return same(a,b);}catch{return false;}}
export function databaseComparatorValue(witness:DatabaseNamespaceComparators){
 return {binding:witness.binding,catalogs:[...witness.catalogs].sort((a,b)=>a.contractId<b.contractId?-1:a.contractId>b.contractId?1:0),rows:[...witness.rows].sort((a,b)=>{const x=canonicalOwnershipJson([a.contractId,a.key]),y=canonicalOwnershipJson([b.contractId,b.key]);return x<y?-1:x>y?1:0;})};
}
export function validCollation(value:unknown):value is DatabaseCollationCapture{
 if(!value||typeof value!=='object')return false;
 const v=value as Record<string,unknown>;
 return same(Object.keys(v).sort(),['oid','schema','name','provider','deterministic','encoding','lcCollate','lcCtype','locale','version','actualVersion'].sort())&&
  typeof v.oid==='string'&&/^[0-9]+$/.test(v.oid)&&['schema','name','provider'].every(k=>typeof v[k]==='string'&&v[k]!=='')&&typeof v.deterministic==='boolean'&&Number.isSafeInteger(v.encoding)&&
  ['lcCollate','lcCtype','locale','version','actualVersion'].every(k=>v[k]===null||typeof v[k]==='string');
}
export function validateDatabaseComparators(capture:NamespaceCaptureContext,nodes:NamespaceRowObservation[],diagnostics:OwnershipDiagnostic[]):Map<string,DatabaseComparatorRow>{
 const result=new Map<string,DatabaseComparatorRow>(),witness=capture.namespaceComparators;
 if(!witness||typeof witness!=='object'||!safeSame(Object.keys(witness).sort(),['binding','catalogs','rows','captureChecksum'].sort())){diagnostics.push(problem('DATABASE_COMPARATOR_REQUIRED','Actual DB namespace expression, collation and equality results must be captured; no JS lower-case fallback.'));return result;}
 const expectedBinding={registryDigest:capture.registryDigest,sourceDigest:capture.sourceDigest,schemaDigest:capture.currentSchemaDigest,snapshotId:capture.snapshot.id,rowSetChecksum:namespaceRowSetChecksum(capture)};
 if(!safeSame(witness.binding,expectedBinding))diagnostics.push(problem('DATABASE_COMPARATOR_BINDING_DRIFT','DB comparator capture differs from the exact registry/source/schema/snapshot/full-row boundary.'));
 if(!Array.isArray(witness.catalogs)||!Array.isArray(witness.rows)){
  diagnostics.push(problem('DATABASE_COMPARATOR_REQUIRED','Closed catalog and per-row result arrays are required.'));return result;
 }
 const catalogSeen=new Set<string>(),rowSeen=new Set<string>(),expressionClasses=new Map<string,string>();
 for(const catalog of witness.catalogs){
  if(!catalog||typeof catalog!=='object'){diagnostics.push(problem('DATABASE_COMPARATOR_CATALOG_DRIFT','Malformed catalog record.'));continue;}
  const contract=DATABASE_NAMESPACES.find(c=>c.contractId===catalog.contractId);
  if(!contract){diagnostics.push(problem('DATABASE_COMPARATOR_UNUSED','Unknown comparator catalog.'));continue;}
  if(catalogSeen.has(catalog.contractId))diagnostics.push(problem('DATABASE_COMPARATOR_DUPLICATE','Duplicate comparator catalog.'));catalogSeen.add(catalog.contractId);
  const {checksum,...catalogValue}=catalog,definition=catalog.definition;
  const source=capture.migrations.find(m=>m.path===contract.source.path)?.text.split('\n').slice(contract.source.line-1).join('\n').split(';')[0]+';';
  if(!safeSame(Object.keys(catalog).sort(),['contractId','source','sourceStatementChecksum','definition','checksum'].sort())||!safeSame(catalog.source,contract.source)||catalog.sourceStatementChecksum!==ownershipDigest(source)||!SHA.test(checksum)||checksum!==ownershipDigest(catalogValue)||
   !definition||!safeSame(Object.keys(definition).sort(),['indexDefinition','expression','predicate','expressionCollation','indexCollation','serverVersion','serverEncoding'].sort())||definition.indexDefinition!==contract.indexDefinition||definition.expression!==contract.expression||definition.predicate!==contract.predicate||
   !validCollation(definition.expressionCollation)||!validCollation(definition.indexCollation)||typeof definition.serverVersion!=='string'||!definition.serverVersion||typeof definition.serverEncoding!=='string'||!definition.serverEncoding)
   diagnostics.push(problem('DATABASE_COMPARATOR_CATALOG_DRIFT','Exact source statement, index expression/predicate, engine and both collations must match the checksum-bound catalog evidence.'));
 }
 for(const contract of DATABASE_NAMESPACES)if(!catalogSeen.has(contract.contractId))diagnostics.push(problem('DATABASE_COMPARATOR_CATALOG_REQUIRED',contract.contractId));
 for(const row of witness.rows){
  if(!row||typeof row!=='object'){diagnostics.push(problem('DATABASE_COMPARATOR_ROW_DRIFT','Malformed comparator row.'));continue;}
  const contract=DATABASE_NAMESPACES.find(c=>c.contractId===row.contractId),node=contract&&nodes.find(n=>n.rule.table===contract.table&&safeSame(n.key,row.key));
  if(!contract||!node){diagnostics.push(problem('DATABASE_COMPARATOR_UNUSED','Comparator result does not belong to an exact captured row.'));continue;}
  const id=canonicalOwnershipJson([row.contractId,row.key]);
  if(rowSeen.has(id))diagnostics.push(problem('DATABASE_COMPARATOR_DUPLICATE','Duplicate comparator row result.',node));rowSeen.add(id);
  const included=contract.table==='employees'?node.row.values.email!==null:contract.table==='schedule_templates'?node.row.values.active===true:true;
  const input=node.row.values[contract.column];
  if(!same(Object.keys(row).sort(),['contractId','key','rowChecksum','included','expressionValue','comparisonClass'].sort())||row.rowChecksum!==node.row.originalChecksum||row.included!==included||
   (input===null?row.expressionValue!==null:typeof row.expressionValue!=='string')||(included?typeof row.comparisonClass!=='string':row.comparisonClass!==null))
   diagnostics.push(problem('DATABASE_COMPARATOR_ROW_DRIFT','Every expression result, predicate and DB equality class must bind the complete original row, including inactive/excluded rows.',node,contract.label));
  else{
   if(row.included){
    const expression=canonicalOwnershipJson([contract.contractId,row.expressionValue]),prior=expressionClasses.get(expression);
    if(prior!==undefined&&prior!==row.comparisonClass)diagnostics.push(problem('DATABASE_COMPARATOR_ROW_DRIFT','Identical DB expression output cannot belong to different equality classes.',node,contract.label));
    expressionClasses.set(expression,row.comparisonClass!);
   }
   result.set(canonicalOwnershipJson([contract.contractId,node.key]),row);
  }
 }
 for(const node of nodes)for(const contract of DATABASE_NAMESPACES)if(contract.table===node.rule.table&&!rowSeen.has(canonicalOwnershipJson([contract.contractId,node.key])))
  diagnostics.push(problem('DATABASE_COMPARATOR_ROW_REQUIRED','Missing actual DB expression/equality result for the complete original row.',node,contract.label));
 if(diagnostics.length)return result;
 const value=databaseComparatorValue(witness);
 if(!SHA.test(witness.captureChecksum)||ownershipDigest(value)!==witness.captureChecksum)diagnostics.push(problem('DATABASE_COMPARATOR_CAPTURE_DRIFT','Captured DB comparator manifest/checksum differs.'));
 return result;
}

export type TypedDatabaseNamespaceObservations=Readonly<{format:'TYPED_NAMESPACE_OBSERVATIONS_V1';factsDigest:string;fenceGeneration:string;binding:Readonly<DatabaseNamespaceComparators['binding']>;catalogs:readonly DatabaseNamespaceComparators['catalogs'][number][];rows:readonly Readonly<DatabaseComparatorRow>[];captureChecksum:string;digest:string;verification:'PURE_SUPPLIED_DATABASE_COMPARATORS_NOT_DATABASE_OPERATOR_OR_TENANT_VERIFICATION'}>;
export type TypedNamespaceOutcome=Readonly<{status:'VALIDATED';observations:TypedDatabaseNamespaceObservations}>|Readonly<{status:'BLOCKED';diagnostics:readonly OwnershipDiagnostic[]}>;
const issuedTypedNamespaces=new WeakSet<object>();
function freezeData<T>(value:T):T{
 if(value&&typeof value==='object'){for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))if('value' in descriptor)freezeData(descriptor.value);Object.freeze(value);}return value;
}
function blockedNamespace(code:string,detail:string):TypedNamespaceOutcome{
 return Object.freeze({status:'BLOCKED',diagnostics:Object.freeze([Object.freeze({code,detail})])});
}
/** Same pinned validator as legacy preflight, on scalar comparison-column
 * observations from a genuinely inspected typed snapshot. Payload JSON and
 * native arrays never become LegacyRow values; only text email/name and boolean
 * active source columns needed by the closed SQL expression contracts are read.
 *
 * Supplied actual-database results must retain complete rows, excluded/null and
 * inactive predicates, both index/expression collations, source SQL/index
 * definitions and opaque DB equality classes. No JavaScript lower-case fallback
 * or ownership/uniqueness/operator/DB authority is issued. Hashes never approve
 * catalog sources, authenticate observations or prove an engine/runtime call.
 */
export function validateTypedDatabaseNamespaceComparators(snapshot:unknown,input:unknown,migrations:unknown):TypedNamespaceOutcome{
 if(!isIssuedInspectedTypedSnapshot(snapshot))return blockedNamespace('UNISSUED_TYPED_SNAPSHOT','Only genuine local inspected snapshot observations may be checked.');
 let namespace:DatabaseNamespaceComparators,source:MigrationSource[];
 try{
  // Closed ordinary data is detached before subsequent reads. Accessors never
  // run; proxy reflection may run or throw and cannot supply inspected issuance.
  namespace=JSON.parse(canonicalOwnershipJson(input))as DatabaseNamespaceComparators;
  const detached=JSON.parse(canonicalOwnershipJson(migrations))as unknown;
  if(!Array.isArray(detached)||detached.some(value=>!value||typeof value!=='object'||Array.isArray(value)||!same(Object.keys(value).sort(),['path','text'])||typeof value.path!=='string'||typeof value.text!=='string'))return blockedNamespace('INVALID_NAMESPACE_SOURCE','Exact pinned migration text records are required.');
  source=detached as MigrationSource[];
 }catch{return blockedNamespace('UNSUPPORTED_NAMESPACE_VALUE','Unsupported metadata/source structure.');}
 try{
  const diagnostics:OwnershipDiagnostic[]=[...verifyOwnershipSource(source)];
  if(diagnostics.length)return Object.freeze({status:'BLOCKED',diagnostics:freezeData(diagnostics)});
  const registry=getOwnershipRegistry();
  if(snapshot.registryDigest!==registry.digest)return blockedNamespace('REGISTRY_DRIFT','Source registry differs from the complete typed snapshot.');
  const nodes:NamespaceRowObservation[]=[];
  for(const table of snapshot.tables){
   const rule=registry.tables.find(r=>r.table===table.table)!;
   const contract=DATABASE_NAMESPACES.find(c=>c.table===table.table);
   if(!contract)continue;
   for(const row of table.rows){
    const values:Record<string,JsonValue>={};
    const selected=[contract.column,...(table.table==='schedule_templates'?['active']:[])];
    for(const name of selected){
     const column=row.columns.find(c=>c.name===name);
     const value=column?.lineage.nodes[0]?.value;
     if(!column||!value)return blockedNamespace('NAMESPACE_SOURCE_COLUMN_DRIFT','Complete typed comparison columns are required.');
     if(value.kind==='SQL_NULL'){values[name]=null;continue;}
     if(value.kind!=='SQL_SCALAR'||!['text','boolean'].includes(column.type))return blockedNamespace('NAMESPACE_SOURCE_COLUMN_DRIFT','Comparison requires original SQL scalar text/boolean columns.');
     values[name]=column.type==='boolean'?value.text==='t':value.text;
    }
    nodes.push({rule,row:{values,originalChecksum:row.originalChecksum},key:[...row.key]});
   }
  }
  const capture:NamespaceCaptureContext={registryDigest:snapshot.registryDigest,sourceDigest:snapshot.sourceDigest,currentSchemaDigest:snapshot.currentSchemaDigest,snapshot:{id:snapshot.snapshotId},tables:snapshot.tables,migrations:source,namespaceComparators:namespace};
  const rows=validateDatabaseComparators(capture,nodes,diagnostics);
  if(diagnostics.length)return Object.freeze({status:'BLOCKED',diagnostics:freezeData(diagnostics)});
  if(namespace.captureChecksum!==snapshot.namespaceCaptureChecksum)return blockedNamespace('DATABASE_COMPARATOR_CAPTURE_BOUNDARY_DRIFT','Comparator metadata differs from the original exact typed snapshot capture.');
  const value={format:'TYPED_NAMESPACE_OBSERVATIONS_V1' as const,factsDigest:snapshot.factsDigest,fenceGeneration:snapshot.fenceGeneration,binding:namespace.binding,catalogs:databaseComparatorValue(namespace).catalogs,rows:[...rows.values()],captureChecksum:namespace.captureChecksum,
   verification:'PURE_SUPPLIED_DATABASE_COMPARATORS_NOT_DATABASE_OPERATOR_OR_TENANT_VERIFICATION' as const};
  const observations:TypedDatabaseNamespaceObservations=freezeData({...value,digest:ownershipDigest(value)});
  issuedTypedNamespaces.add(observations);return Object.freeze({status:'VALIDATED',observations});
 }catch{return blockedNamespace('INVALID_NAMESPACE_STRUCTURE','Metadata does not satisfy the complete namespace capture contract.');}
}
/** Trap-free local supplied-observation validation only, never DB authority. */
export function isIssuedTypedDatabaseNamespaceObservations(input:unknown):input is TypedDatabaseNamespaceObservations{
 return typeof input==='object'&&input!==null&&issuedTypedNamespaces.has(input);
}
