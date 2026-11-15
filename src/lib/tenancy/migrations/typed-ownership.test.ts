import {describe,it,expect,vi} from 'vitest';
import { canonicalOwnershipJson,getOwnershipRegistry,ownershipDigest } from './ownership';
import {decodeTypedMigrationWireValue} from './typed-wire';
import {traverseTypedMigrationWireValue} from './typed-lineage';
import {inspectTypedMigrationSnapshot,type InspectedTypedSnapshot} from './typed-snapshot';
import {getTypedReferenceColumnContract,validateTypedMigrationCellReferences,type TypedReferenceClassificationInput,type TypedReferenceLiteral} from './typed-reference';
import type {TypedMigrationCaptureFacts,TypedMigrationRowCapture} from './capture.server';
import {validateTypedSnapshotOwnership,isIssuedTypedOwnershipSourceObservations,type TypedOwnershipAssignments} from './typed-ownership';

const sha=(v:string)=>v.repeat(64);
const registry=getOwnershipRegistry();
type Raw=Record<string,string|null>;
/** Exact fictional wires; no database or semantic namespace evidence. */
function fixture(complete=true,changes:Record<string,Raw>={},omit:string[]=[],extraRows:Record<string,Raw[]>={}){
 const defaults:Record<string,string>={text:'fixture-id',date:'2026-10-09',time:'08:00:00',smallint:'1',timestamptz:'2026-10-09 08:00:00.123456+00',integer:'1',jsonb:'{}',boolean:'f',uuid:'00000000-0000-4000-8000-000000000001','text[]':'{}','char(64)':sha('b'),'numeric(5,2)':'1.00',bigint:'9223372036854775807',timestamp:'2026-10-09 08:00:00.123456','char(32)':'x'.repeat(32)};
 const raw=new Map<string,Raw>();
 if(complete)for(const rule of registry.tables)if(!omit.includes(rule.table))raw.set(rule.table,Object.fromEntries(rule.columns.map(c=>[c.name,c.nullable?null:defaults[c.type]])));
 if(complete&&raw.has('clocker_pin_limits'))Object.assign(raw.get('clocker_pin_limits')!,{scope:'DEVICE',scope_id:'fixture-id'});
 // Fill declared physical reference components from known fictional targets,
 // including nullable references. Iteration handles the declared composite cycles.
 for(let pass=0;pass<30;pass++)for(const rule of registry.tables){const row=raw.get(rule.table);if(!row)continue;for(const ref of rule.references){const parent=raw.get(ref.target);if(parent)ref.columns.forEach((c,i)=>{row[c]=parent[ref.targetColumns[i]];});}}
 if(complete&&raw.has('clocker_devices'))Object.assign(raw.get('clocker_devices')!,{credential_hash:'fixture-id',credential_version:'1'});
 for(const [table,override] of Object.entries(changes)){
  if(!raw.has(table)){const rule=registry.tables.find(t=>t.table===table)!;raw.set(table,Object.fromEntries(rule.columns.map(c=>[c.name,c.nullable?null:defaults[c.type]])));}
  Object.assign(raw.get(table)!,override);
 }
 const tables=registry.tables.map(rule=>{
  const rows:TypedMigrationRowCapture[]=[];const base=Object.fromEntries(rule.columns.map(c=>[c.name,c.nullable?null:defaults[c.type]]));
  const sources=[...(raw.has(rule.table)?[raw.get(rule.table)!]:[]),...(extraRows[rule.table]??[]).map(r=>({...base,...r}))];
  for(const source of sources){const columns=rule.columns.map(c=>{const wire=source[c.name];const d=decodeTypedMigrationWireValue(c.type,wire);if(d.status!=='DECODED')throw Error('Fictional wire '+rule.table+'.'+c.name);return {name:c.name,type:c.type,wire,value:d.value};});
   const key=rule.primaryKey.map(n=>{const c=columns.find(c=>c.name===n)!;if(c.wire===null)throw Error('Null fictional key');return c.type==='integer'||c.type==='smallint'?Number(c.wire):c.type==='boolean'?c.wire==='t':c.wire;});
   rows.push({columns,key,originalChecksum:ownershipDigest({format:'TYPED_SQL_WIRE_V1',columns})});}
  rows.sort((a,b)=>{const x=canonicalOwnershipJson(a.key),y=canonicalOwnershipJson(b.key);return x<y?-1:x>y?1:0;});
  return {table:rule.table,rows,expectedCount:rows.length,expectedChecksum:ownershipDigest(rows.map(r=>({key:r.key,checksum:r.originalChecksum})))};
 });
 const catalog={relations:[],columns:[],constraints:[]},currentSchemaDigest=ownershipDigest(catalog);
 const ns={binding:{registryDigest:registry.digest,sourceDigest:sha('a'),schemaDigest:currentSchemaDigest,snapshotId:'12:19:',rowSetChecksum:ownershipDigest(tables.map(t=>({table:t.table,count:t.expectedCount,checksum:t.expectedChecksum})))},catalogs:[],rows:[],captureChecksum:''};
 ns.captureChecksum=ownershipDigest({binding:ns.binding,catalogs:ns.catalogs,rows:ns.rows});
 const wireRows=tables.flatMap(t=>t.rows.map(r=>{const values=r.columns.map(c=>c.wire);return {table:t.table,key:r.key,values,originalChecksum:r.originalChecksum,wireChecksum:ownershipDigest(values)};}));
 // Inspector requires code-unit ordering, not locale-dependent semantics.
 wireRows.sort((a,b)=>{const x=canonicalOwnershipJson([a.table,a.key]),y=canonicalOwnershipJson([b.table,b.key]);return x<y?-1:x>y?1:0;});
 const body={format:'TYPED_SQL_WIRE_V1' as const,sourceDigest:sha('a'),registryDigest:registry.digest,currentSchemaDigest,snapshot:{id:'12:19:',isolation:'SERIALIZABLE' as const,includesInactive:true as const,includesHistory:true as const},tables,namespaceComparators:ns,wireRows,fence:{phase:'FENCED' as const,generation:'1',actor:null,manifest:null},catalog,verification:'OWNED_LOCAL_TYPED_DATABASE_FACTS_NOT_BACKFILL_AUTHORITY' as const};
 const facts:TypedMigrationCaptureFacts={...body,factsDigest:ownershipDigest(body)};
 const inspected=inspectTypedMigrationSnapshot(facts,{sourceDigest:facts.sourceDigest,currentSchemaDigest,snapshotId:facts.snapshot.id,fenceGeneration:facts.fence.generation,factsDigest:facts.factsDigest});
 if(inspected.status!=='INSPECTED')throw Error('Fictional snapshot '+inspected.code);
 const snapshot=inspected.snapshot;
 const assignments:TypedOwnershipAssignments={boundary:{registryDigest:snapshot.registryDigest,sourceDigest:snapshot.sourceDigest,currentSchemaDigest:snapshot.currentSchemaDigest,snapshotId:snapshot.snapshotId,fenceGeneration:snapshot.fenceGeneration,factsDigest:snapshot.factsDigest},mappings:[],historicalReferences:[],installation:null,columns:[]};
 function history(table:string,row:InspectedTypedSnapshot['tables'][number]['rows'][number],target:string,targetColumns:readonly string[],key:readonly TypedReferenceLiteral[]){
  const h={target,targetColumns:[...targetColumns],key:[...key],workspaceId:'fixture-id',sourceRowChecksum:row.originalChecksum,evidenceDigest:sha('e')};
  if(!assignments.historicalReferences.some(x=>canonicalOwnershipJson(x)===canonicalOwnershipJson(h)))assignments.historicalReferences.push(h);
  void table;
 }
 for(const table of snapshot.tables)for(const row of table.rows){
  const rule=registry.tables.find(t=>t.table===table.table)!;
  if(rule.anchor.kind==='CAPTURED_IMMUTABLE')assignments.mappings.push({table:table.table,key:[...row.key],workspaceId:'fixture-id',rowChecksum:row.originalChecksum,evidenceDigest:sha('d')});
  if(rule.anchor.kind==='INSTALLATION_PROVENANCE'){
   assignments.installation??={workspaceId:'fixture-id',evidenceDigest:sha('f'),coveredRows:[]};assignments.installation.coveredRows.push({table:table.table,key:[...row.key],rowChecksum:row.originalChecksum});
  }
  for(const ref of rule.references)if(ref.historical){const cells=ref.columns.map(c=>row.columns.find(x=>x.name===c)!);if(cells.every(c=>c.wire!==null))history(table.table,row,ref.target,ref.targetColumns,cells.map(c=>({kind:'TEXT',text:c.wire!})));}
  for(const column of new Set([...rule.payloads.map(p=>p.column),...rule.typedFields])){
   const cell=row.columns.find(c=>c.name===column)!;const got=getTypedReferenceColumnContract(table.table,column);if(got.status!=='CONTRACT')throw Error('Fictional contract');const contract=got.contract;
   const classifications:TypedReferenceClassificationInput[]=cell.lineage.nodes.filter(n=>!((n.value.kind==='JSON_ARRAY'&&n.value.length>0)||(n.value.kind==='JSON_OBJECT'&&n.value.memberCount>0)||(n.value.kind==='SQL_ARRAY'&&n.value.elementCount>0))).map(n=>{
    const last=n.address[n.address.length-1];
    // Only explicitly known fixture identities receive reference classifications.
    let target:string|undefined,text:string|undefined;
    if(n.value.kind==='SQL_ARRAY_TEXT'&&table.table==='calendar_subscriptions'){target='locations';text=n.value.text;}
    if(n.value.kind==='SQL_SCALAR'&&rule.typedFields.includes(column)){target=column==='request_id'?'shift_exchanges':'shifts';text=n.value.text;}
    if(last?.kind==='JSON_MEMBER'&&last.name==='employeeId'&&n.value.kind==='JSON_STRING'){target='employees';text=n.value.text;}
    if(column==='participants'&&n.address[0]?.kind==='JSON_MEMBER'&&n.address[0].name==='decisionVersions'&&n.address[1]?.kind==='JSON_MEMBER'){target='employees';text=n.address[1].name;}
    if(target&&text!==undefined)return {address:n.address,kind:'REFERENCE',target,targetColumns:['id'],key:[{kind:'TEXT',text}],historical:false};
    return {address:n.address,kind:n.value.kind==='SQL_NULL'||n.value.kind==='JSON_NULL'||n.value.kind==='SQL_ARRAY_NULL'?'ABSENCE':'DATA'};
   });
   const r=validateTypedMigrationCellReferences(cell.lineage,{binding:{schemaCommit:contract.source.schemaCommit,schemaTree:contract.source.schemaTree,schemaDigest:contract.source.schemaDigest,registryDigest:contract.source.registryDigest,table:table.table,column,contractChecksum:contract.checksum,sourceChecksum:cell.lineage.source.checksum},reviewEvidenceDigest:sha('c'),classifications,unresolvedAddresses:[]});
   if(r.status!=='VALIDATED')throw Error('Fictional review '+table.table+'.'+column+':'+r.code);
   assignments.columns.push({table:table.table,key:[...row.key],rowChecksum:row.originalChecksum,column,classification:r.classification});
   for(const ref of r.classification.references)if(ref.historicalRequired||ref.historicalRequested)history(table.table,row,ref.target,ref.targetColumns,ref.key);
  }
 }
 return {snapshot,assignments,raw};
}
function resolved(f:ReturnType<typeof fixture>){const r=validateTypedSnapshotOwnership(f.snapshot,f.assignments);expect(r.status,r.status==='BLOCKED'?r.code:undefined).toBe('RESOLVED_SOURCE_OBSERVATIONS');if(r.status!=='RESOLVED_SOURCE_OBSERVATIONS')throw Error(r.code);return r.observations;}
function blocked(f:ReturnType<typeof fixture>,code?:string){const r=validateTypedSnapshotOwnership(f.snapshot,f.assignments);expect(r.status).toBe('BLOCKED');if(code)expect(r).toEqual({status:'BLOCKED',code});expect(r).not.toHaveProperty('observations');}

describe('complete pure typed ownership source observations',()=>{
 it('resolves every row across all68 declared anchors, composite/current/historical references and device ledger',()=>{const f=fixture(),o=resolved(f);expect(o.tables).toHaveLength(68);expect(o.rows).toHaveLength(68);expect(o.rows.find(r=>r.table==='password_recovery_limits')?.workspaceId).toBeNull();expect(o.rows.filter(r=>r.table!=='password_recovery_limits').every(r=>r.workspaceId==='fixture-id')).toBe(true);expect(o.verification).toBe('PURE_NOT_DB_OPERATOR_TENANT_AUTHORITY');expect(o).not.toHaveProperty('chunks');expect(o).not.toHaveProperty('effectsVerified');});
 it('accepts a complete empty snapshot with no unrelated evidence',()=>{const o=resolved(fixture(false));expect(o.rows).toEqual([]);expect(o.tables).toHaveLength(68);});
 it('preserves exact JSON numbers, JSONNULL/SQLNULL and native array bounds/subscripts',()=>{const f=fixture(true,{employee_scheduling_settings:{operational_rule_profile:'{"n":9007199254740993,"scale":1.00,"null":null,"empty":[],"obj":{}}'},calendar_subscriptions:{allowed_location_ids:'[0:1]={fixture-id,NULL}'}}),o=resolved(f),json=o.rows.find(r=>r.table==='employee_scheduling_settings')!.columns.find(c=>c.name==='operational_rule_profile')!,array=o.rows.find(r=>r.table==='calendar_subscriptions')!.columns.find(c=>c.name==='allowed_location_ids')!;expect(json.lineage.nodes.filter(n=>n.value.kind==='JSON_NUMBER').map(n=>n.value)).toEqual([{kind:'JSON_NUMBER',lexeme:'9007199254740993'},{kind:'JSON_NUMBER',lexeme:'1.00'}]);expect(array.lineage.nodes[1].address).toEqual([{kind:'SQL_ARRAY_ELEMENT',ordinal:0,subscripts:[0]}]);expect(array.lineage.nodes[2].value.kind).toBe('SQL_ARRAY_NULL');expect(o.rows.find(r=>r.table==='shift_change_events')!.columns.find(c=>c.name==='source_terms')!.lineage.nodes[0].value.kind).toBe('SQL_NULL');});
 it('detaches assignments, retains issued source lineage and freezes all output',()=>{const f=fixture(),before=canonicalOwnershipJson(f.snapshot),o=resolved(f),id=o.digest;f.assignments.mappings[0].workspaceId='changed';expect(o.digest).toBe(id);expect(canonicalOwnershipJson(f.snapshot)).toBe(before);expect(Object.isFrozen(o)).toBe(true);expect(Object.isFrozen(o.rows[0].columns)).toBe(true);expect(o.rows[0].columns[0].lineage).toBe(f.snapshot.tables[0].rows[0].columns[0].lineage);});
 it('binds all evidence and exact rows deterministically; caller record order is irrelevant',()=>{const f=fixture(),a=resolved(f);f.assignments.columns.reverse();f.assignments.mappings.reverse();f.assignments.historicalReferences.reverse();f.assignments.installation!.coveredRows.reverse();expect(resolved(f).digest).toBe(a.digest);f.assignments.mappings[0].evidenceDigest=sha('9');expect(resolved(f).digest).not.toBe(a.digest);});
 it('keeps original padded and long nonempty anchor IDs exactly',()=>{const workspace=' '+ 'w'.repeat(240)+' ',employee=' employee padded ',f=fixture(false,{workspaces:{id:workspace},locations:{workspace_id:workspace},employees:{id:employee}});f.assignments.mappings[0].workspaceId=workspace;const o=resolved(f);expect(o.rows.find(r=>r.table==='employees')!.key).toEqual([employee]);expect(o.rows.every(r=>r.workspaceId===workspace)).toBe(true);});
 it('blocks normalization of exact owner keys',()=>{const f=fixture();f.assignments.mappings[0].workspaceId=' fixture-id ';blocked(f,'OWNERSHIP_WORKSPACE_MISSING');});
 it('does not infer employee ownership from current mutable location',()=>{const f=fixture();f.assignments.mappings=[];blocked(f,'IMMUTABLE_MAPPING_REQUIRED');});
 it('requires retained witness even if the referenced current row exists',()=>{const f=fixture();f.assignments.historicalReferences=[];blocked(f,'RETAINED_HISTORY_REQUIRED');});
 it('accepts deleted historical literals only through exact retained row-checksum evidence',()=>{const f=fixture(true,{calendar_removals:{source_shift_id:'deleted original shift'}});expect(resolved(f).rows.find(r=>r.table==='calendar_removals')!.references.some(r=>r.key[0].kind==='TEXT'&&r.key[0].text==='deleted original shift'&&r.historical)).toBe(true);});
 it('retains a decisionVersions employee member key even when its version is JSONNULL',()=>{const f=fixture(true,{shift_change_events:{participants:'{"decisionVersions":{"fixture-id":null},"employeeId":null}'}}),o=resolved(f),row=o.rows.find(r=>r.table==='shift_change_events')!;expect(row.references.some(r=>r.source==='COLUMN_REVIEW'&&r.key[0].kind==='TEXT'&&r.key[0].text==='fixture-id'&&r.historical)).toBe(true);});
 it.each(['registryDigest','sourceDigest','currentSchemaDigest','factsDigest','snapshotId','fenceGeneration'] as const)('blocks independently retained boundary drift in%s',key=>{const f=fixture();f.assignments.boundary[key]=key==='snapshotId'?'other':key==='fenceGeneration'?'2':sha('9');blocked(f,'OWNERSHIP_BOUNDARY_DRIFT');});
 const mutators:{name:string;code:string;run:(f:ReturnType<typeof fixture>)=>void}[]=[
  {name:'mapping checksum',code:'IMMUTABLE_MAPPING_DRIFT',run:f=>{f.assignments.mappings[0].rowChecksum=sha('9');}},
  {name:'mapping duplicate',code:'DUPLICATE_MAPPING',run:f=>{f.assignments.mappings.push({...f.assignments.mappings[0]});}},
  {name:'unconsumed mapping',code:'UNCONSUMED_MAPPING',run:f=>{f.assignments.mappings.push({...f.assignments.mappings[0],table:'locations'});}},
  {name:'installation absent',code:'INSTALLATION_PROVENANCE_REQUIRED',run:f=>{f.assignments.installation=null;}},
  {name:'installation incomplete',code:'INSTALLATION_PROVENANCE_REQUIRED',run:f=>{f.assignments.installation!.coveredRows.pop();}},
  {name:'installation extra',code:'UNCONSUMED_INSTALLATION',run:f=>{f.assignments.installation!.coveredRows.push({...f.assignments.installation!.coveredRows[0],table:'locations'});}},
  {name:'installation duplicate',code:'DUPLICATE_INSTALLATION',run:f=>{f.assignments.installation!.coveredRows.push({...f.assignments.installation!.coveredRows[0]});}},
  {name:'installation checksum',code:'INSTALLATION_PROVENANCE_DRIFT',run:f=>{f.assignments.installation!.coveredRows[0].rowChecksum=sha('9');}},
  {name:'history checksum',code:'RETAINED_HISTORY_REQUIRED',run:f=>{f.assignments.historicalReferences[0].sourceRowChecksum=sha('9');}},
  {name:'history owner mismatch',code:'RETAINED_HISTORY_OWNER_CONFLICT',run:f=>{f.assignments.historicalReferences[0].workspaceId='other';}},
  {name:'history duplicate',code:'DUPLICATE_HISTORY',run:f=>{f.assignments.historicalReferences.push({...f.assignments.historicalReferences[0]});}},
  {name:'history unused',code:'UNCONSUMED_HISTORY',run:f=>{f.assignments.historicalReferences.push({...f.assignments.historicalReferences[0],sourceRowChecksum:sha('9')});}},
  {name:'classification absent',code:'COLUMN_REVIEW_REQUIRED',run:f=>{f.assignments.columns.pop();}},
  {name:'classification duplicate',code:'DUPLICATE_COLUMN_REVIEW',run:f=>{f.assignments.columns.push({...f.assignments.columns[0]});}},
  {name:'classification checksum',code:'COLUMN_REVIEW_SOURCE_DRIFT',run:f=>{f.assignments.columns[0].rowChecksum=sha('9');}},
  {name:'classification foreign column',code:'UNCONSUMED_COLUMN_REVIEW',run:f=>{f.assignments.columns.push({...f.assignments.columns[0],column:'created_at'});}},
  {name:'classification clone',code:'UNISSUED_COLUMN_REVIEW',run:f=>{f.assignments.columns[0].classification={...f.assignments.columns[0].classification};}},
  {name:'unknown top field',code:'INVALID_OWNERSHIP_ASSIGNMENTS',run:f=>{Object.assign(f.assignments,{extra:true});}},
  {name:'malformed evidence SHA',code:'INVALID_OWNERSHIP_ASSIGNMENTS',run:f=>{f.assignments.mappings[0].evidenceDigest='bad';}},
 ];
 it.each(mutators)('blocks $name with no partial assignment',x=>{const f=fixture();x.run(f);blocked(f,x.code);});
 it('requires reviews for nullable SQLNULL cells rather than silently skipping them',()=>{const f=fixture();const i=f.assignments.columns.findIndex(c=>c.table==='notifications'&&c.column==='source_id');expect(f.assignments.columns[i].classification.source.kind).toBe('SQL_NULL');f.assignments.columns.splice(i,1);blocked(f,'COLUMN_REVIEW_REQUIRED');});
 it('blocks a genuine review issued for another source wire',()=>{const a=fixture(),b=fixture(true,{workspaces:{shift_change_policy:'{"n":2}'}});a.assignments.columns.find(c=>c.table==='workspaces')!.classification=b.assignments.columns.find(c=>c.table==='workspaces')!.classification;blocked(a,'COLUMN_REVIEW_SOURCE_DRIFT');});
 it('blocks unresolved current parent instead of assigning a default workspace',()=>blocked(fixture(true,{shifts:{schedule_id:'missing'}}),'CURRENT_REFERENCE_MISSING_OR_AMBIGUOUS'));
 it('blocks current cross-owner subject/actor/location references even when both roots exist',()=>{const f=fixture(true,{positions:{workspace_id:'second-workspace'}},[],{workspaces:[{id:'second-workspace'}]});blocked(f,'CURRENT_REFERENCE_OWNER_CONFLICT');});
 it('blocks employee-location conflict instead of replacing immutable employment ownership',()=>{const f=fixture(true,{},[],{workspaces:[{id:'second-workspace'}]});f.assignments.mappings[0].workspaceId='second-workspace';blocked(f,'CURRENT_REFERENCE_OWNER_CONFLICT');});
 it('blocks cross-owner current native-array location review',()=>{const f=fixture(true,{calendar_subscriptions:{allowed_location_ids:'{other-location}'}},[],{workspaces:[{id:'second-workspace'}],locations:[{id:'other-location',workspace_id:'second-workspace'}]});blocked(f,'CURRENT_REFERENCE_OWNER_CONFLICT');});
 it('resolves explicit WORKSPACE scope and rejects padded scope IDs exactly',()=>{const f=fixture(true,{clocker_pin_limits:{scope:'WORKSPACE'}});expect(resolved(f).rows.find(r=>r.table==='clocker_pin_limits')!.workspaceId).toBe('fixture-id');blocked(fixture(true,{clocker_pin_limits:{scope:'WORKSPACE',scope_id:' fixture-id '}}),'CURRENT_REFERENCE_MISSING_OR_AMBIGUOUS');});
 it('resolves PERSON limiter ancestry from the exact retained employee identity',()=>{
  const row=resolved(fixture(true,{clocker_pin_limits:{scope:'PERSON'}})).rows.find(r=>r.table==='clocker_pin_limits')!;
  expect(row.workspaceId).toBe('fixture-id');expect(row.references).toContainEqual(expect.objectContaining({source:'TYPED_SCOPE',target:'employees',field:'scope_id'}));
  blocked(fixture(true,{clocker_pin_limits:{scope:'PERSON',scope_id:' fixture-id '}}),'CURRENT_REFERENCE_MISSING_OR_AMBIGUOUS');
 });
 it('does not use an unrelated installation record for an empty captured installation',()=>{const f=fixture(false);f.assignments.installation={workspaceId:'fixture-id',evidenceDigest:sha('f'),coveredRows:[]};blocked(f,'UNCONSUMED_INSTALLATION');});
 it('preserves empty text historical IDs without changing them to absence',()=>{const f=fixture(true,{calendar_removals:{source_shift_id:''}});expect(resolved(f).rows.find(r=>r.table==='calendar_removals')!.references.some(r=>r.key[0].kind==='TEXT'&&r.key[0].text==='')).toBe(true);});
 it('preserves a captured empty original workspace ID as a value instead of imposing new identity policy',()=>{const f=fixture(false,{workspaces:{id:''}});expect(resolved(f).rows[0].workspaceId).toBe('');});
 it('preserves exact empty captured mapping/installation owners only when their actual original root exists',()=>{const f=fixture(false,{workspaces:{id:''},locations:{workspace_id:''},employees:{id:''},calendar_clock:{}});f.assignments.mappings[0].workspaceId='';f.assignments.installation!.workspaceId='';expect(resolved(f).rows.every(r=>r.workspaceId==='')).toBe(true);});
 it('preserves empty retained history owner bound to an actual empty source workspace',()=>{const overrides:Record<string,Raw>=Object.fromEntries(registry.tables.filter(t=>t.columns.some(c=>c.name==='workspace_id')).map(t=>[t.table,{workspace_id:''}]));overrides.workspaces={id:''};const f=fixture(true,overrides);for(const m of f.assignments.mappings)m.workspaceId='';for(const h of f.assignments.historicalReferences)h.workspaceId='';f.assignments.installation!.workspaceId='';expect(resolved(f).rows.filter(r=>r.workspaceId!==null).every(r=>r.workspaceId==='')).toBe(true);});
 it('preserves the permanent ledger after a device has no current credential',()=>{const f=fixture(true,{clocker_devices:{credential_hash:null}});expect(resolved(f).rows.some(r=>r.table==='clocker_device_credentials')).toBe(true);});
 it('blocks a non-null current credential with missing retained ledger',()=>blocked(fixture(true,{},['clocker_device_credentials']),'GLOBAL_DEVICE_LEDGER_CONFLICT'));
 it('does not infer unique business namespaces from a resolved source',()=>{const f=fixture(true,{},[],{workspaces:[{id:'second-workspace'}]});expect(resolved(f).remainingGates).toContain('NAMESPACE_SEMANTICS');});
 it('blocks unknown typed scope without interpreting case or empty values',()=>blocked(fixture(true,{clocker_pin_limits:{scope:'device'}}),'UNSUPPORTED_TYPED_SCOPE'));
 it('blocks a source direct owner absent from the complete root snapshot',()=>blocked(fixture(true,{positions:{workspace_id:''}}),'OWNERSHIP_WORKSPACE_MISSING'));
 it('checks current device hash against the permanent exact version ledger',()=>blocked(fixture(true,{clocker_devices:{credential_version:'2'}}),'GLOBAL_DEVICE_LEDGER_CONFLICT'));
 it('checks ledger device identity separately from hash',()=>blocked(fixture(true,{clocker_device_credentials:{device_id:'missing'}}),'CURRENT_REFERENCE_MISSING_OR_AMBIGUOUS'));
 it('rejects unknown reference literal coercion even with a matching retained hash',()=>{
  const f=fixture(true,{workspaces:{shift_change_policy:'{"n":9007199254740993}'}}),attachment=f.assignments.columns.find(c=>c.table==='workspaces')!,cell=f.snapshot.tables.find(t=>t.table==='workspaces')!.rows[0].columns.find(c=>c.name==='shift_change_policy')!,contract=attachment.classification.contract,n=cell.lineage.nodes[1];
  const r=validateTypedMigrationCellReferences(cell.lineage,{binding:{schemaCommit:contract.source.schemaCommit,schemaTree:contract.source.schemaTree,schemaDigest:contract.source.schemaDigest,registryDigest:contract.source.registryDigest,table:'workspaces',column:'shift_change_policy',contractChecksum:contract.checksum,sourceChecksum:cell.lineage.source.checksum},reviewEvidenceDigest:sha('c'),classifications:[{address:n.address,kind:'REFERENCE',target:'employees',targetColumns:['id'],key:[{kind:'JSON_NUMBER',lexeme:'9007199254740993'}],historical:true}],unresolvedAddresses:[]});
  expect(r.status).toBe('VALIDATED');if(r.status!=='VALIDATED')return;attachment.classification=r.classification;f.assignments.historicalReferences.push({target:'employees',targetColumns:['id'],key:[{kind:'JSON_NUMBER',lexeme:'9007199254740993'}],workspaceId:'fixture-id',sourceRowChecksum:attachment.rowChecksum,evidenceDigest:sha('e')});blocked(f,'UNSUPPORTED_REFERENCE_COMPARATOR');
 });
 it('authenticates inspected provenance before touching either hostile input',()=>{const read=vi.fn(()=>{throw Error('must not read');}),p=new Proxy({},{get:read,ownKeys:read,getPrototypeOf:read});expect(validateTypedSnapshotOwnership(p,p)).toEqual({status:'BLOCKED',code:'UNISSUED_TYPED_SNAPSHOT'});expect(read).not.toHaveBeenCalled();});
 it('rejects serialized or cloned snapshots and revoked proxies',()=>{const f=fixture();for(const v of [JSON.parse(canonicalOwnershipJson(f.snapshot)),{...f.snapshot}])expect(validateTypedSnapshotOwnership(v,f.assignments)).toEqual({status:'BLOCKED',code:'UNISSUED_TYPED_SNAPSHOT'});const p=Proxy.revocable(f.snapshot,{});p.revoke();expect(validateTypedSnapshotOwnership(p.proxy,f.assignments).status).toBe('BLOCKED');});
 it('rejects hostile assignments and nested reviews without invoking accessors/proxy traps',()=>{const f=fixture(),get=vi.fn(()=>[]);Object.defineProperty(f.assignments,'columns',{enumerable:true,get});blocked(f,'UNSUPPORTED_OWNERSHIP_INPUT');expect(get).not.toHaveBeenCalled();const g=fixture(),trap=vi.fn(()=>{throw Error('must not trap');});g.assignments.columns[0].classification=new Proxy(g.assignments.columns[0].classification,{ownKeys:trap,get:trap,getPrototypeOf:trap});blocked(g,'UNSUPPORTED_OWNERSHIP_INPUT');expect(trap).not.toHaveBeenCalled();});
 it.each(['sparse','array-extra','symbol','prototype','nonenumerable','cycle','unsafe','negative-zero','undefined'] as const)('rejects unsupported assignment structure %s',kind=>{const f=fixture();if(kind==='sparse')delete f.assignments.columns[0];if(kind==='array-extra')Object.assign(f.assignments.columns,{extra:true});if(kind==='symbol')Object.assign(f.assignments,{[Symbol('x')]:true});if(kind==='prototype')Object.setPrototypeOf(f.assignments,{foreign:true});if(kind==='nonenumerable')Object.defineProperty(f.assignments,'hidden',{value:true});if(kind==='cycle')Object.assign(f.assignments,{cycle:f.assignments});if(kind==='unsafe')f.assignments.mappings[0].key=[Number.MAX_SAFE_INTEGER+1];if(kind==='negative-zero')f.assignments.mappings[0].key=[-0];if(kind==='undefined')Object.assign(f.assignments,{extra:undefined});blocked(f,'UNSUPPORTED_OWNERSHIP_INPUT');});
 it('accepts a genuine equivalent-source review issued before the inspector traversed its cell again',()=>{
  const f=fixture(),a=f.assignments.columns[0],old=a.classification,cell=f.snapshot.tables.find(t=>t.table===a.table)!.rows.find(r=>canonicalOwnershipJson(r.key)===canonicalOwnershipJson(a.key))!.columns.find(c=>c.name===a.column)!,decoded=decodeTypedMigrationWireValue(cell.type,cell.wire);
  if(decoded.status!=='DECODED')throw Error('Fixture decode');const traversal=traverseTypedMigrationWireValue(decoded.value);if(traversal.status!=='TRAVERSED')throw Error('Fixture traversal');expect(traversal.lineage.source).not.toBe(old.source);
  const c=old.contract,issued=validateTypedMigrationCellReferences(traversal.lineage,{binding:{schemaCommit:c.source.schemaCommit,schemaTree:c.source.schemaTree,schemaDigest:c.source.schemaDigest,registryDigest:c.source.registryDigest,table:a.table,column:a.column,contractChecksum:c.checksum,sourceChecksum:old.source.checksum},reviewEvidenceDigest:old.reviewEvidenceDigest,classifications:old.classifications.map(o=>o.classification),unresolvedAddresses:[]});
  expect(issued.status).toBe('VALIDATED');if(issued.status!=='VALIDATED')return;a.classification=issued.classification;resolved(f);
 });
 it('does not treat source observation hashes as reviewer approval, namespace uniqueness or execution authority',()=>{const o=resolved(fixture());expect(o.verification).toBe('PURE_NOT_DB_OPERATOR_TENANT_AUTHORITY');expect(o.remainingGates).toContain('NAMESPACE_SEMANTICS');expect(o.remainingGates).toContain('FRESH_DATABASE_SOURCE_FENCE_AND_OPERATOR_AUTHORITY');expect(o.digest).toMatch(/^[a-f0-9]{64}$/);});
 it('issues only genuine successful immutable source observations for downstream pure checks',()=>{const f=fixture(),o=resolved(f);expect(isIssuedTypedOwnershipSourceObservations(o)).toBe(true);expect(o.namespaceCaptureChecksum).toBe(f.snapshot.namespaceCaptureChecksum);expect(o.rows.find(r=>r.table==='clocker_devices')!.globalFences).toEqual(registry.tables.find(r=>r.table==='clocker_devices')!.globalFences);});
 it('never issues cloned/serialized/coherently rehashed observations or failed outcomes',()=>{const o=resolved(fixture()),body={...o};delete (body as Partial<typeof body>).digest;for(const x of [{...o},JSON.parse(canonicalOwnershipJson(o)),{...body,digest:ownershipDigest(body)},validateTypedSnapshotOwnership(null,null)])expect(isIssuedTypedOwnershipSourceObservations(x)).toBe(false);});
 it('rejects forged/null/hostile/revoked issuance candidates without reads or proxy traps',()=>{const o=resolved(fixture()),trap=vi.fn(()=>{throw Error('must not trap');}),p=new Proxy(o,{get:trap,ownKeys:trap,getPrototypeOf:trap}),revoked=Proxy.revocable(o,{});revoked.revoke();for(const x of [null,undefined,0,()=>o,{},p,revoked.proxy])expect(isIssuedTypedOwnershipSourceObservations(x)).toBe(false);expect(trap).not.toHaveBeenCalled();});
});
