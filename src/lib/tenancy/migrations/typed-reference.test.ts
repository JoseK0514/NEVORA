import { describe,expect,it } from 'vitest';
import { decodeTypedMigrationWireValue } from './typed-wire';
import { traverseTypedMigrationWireValue,type TypedMigrationCellLineage,type TypedMigrationLineageNode } from './typed-lineage';
import { getOwnershipRegistry } from './ownership';
import { getTypedReferenceColumnContract,validateTypedMigrationCellReferences,isIssuedTypedMigrationCellReferences,type TypedReferenceReview,type TypedReferenceClassificationInput,type TypedMigrationCellReferences } from './typed-reference';

const digest='a'.repeat(64);
function lineage(type:string,raw:string|null):TypedMigrationCellLineage {
 const decoded=decodeTypedMigrationWireValue(type,raw);
 if(decoded.status!=='DECODED')throw new Error('Invalid fictional typed fixture: '+decoded.code);
 const visited=traverseTypedMigrationWireValue(decoded.value);
 if(visited.status!=='TRAVERSED')throw new Error('Invalid fictional lineage fixture: '+visited.code);
 return visited.lineage;
}
function leaves(value:TypedMigrationCellLineage):TypedMigrationLineageNode[] {
 return value.nodes.filter(n=>n.value.kind==='JSON_ARRAY'?n.value.length===0:n.value.kind==='JSON_OBJECT'?n.value.memberCount===0:n.value.kind==='SQL_ARRAY'?n.value.elementCount===0:true);
}
function review(table:string,column:string,value:TypedMigrationCellLineage,classifications:TypedReferenceClassificationInput[]):TypedReferenceReview {
 const registry=getOwnershipRegistry();
 const contract=getTypedReferenceColumnContract(table,column);
 // RED is about validation behavior, not a missing helper or import.
 const contractChecksum=contract.status==='CONTRACT'?contract.contract.checksum:'b'.repeat(64);
 return {binding:{schemaCommit:registry.schemaCommit,schemaTree:registry.schemaTree,schemaDigest:registry.schemaDigest,registryDigest:registry.digest,table,column,contractChecksum,sourceChecksum:value.source.checksum},reviewEvidenceDigest:digest,classifications,unresolvedAddresses:[]};
}
function data(value:TypedMigrationCellLineage):TypedReferenceClassificationInput[] {
 return leaves(value).map(n=>({address:n.address,kind:n.value.kind==='SQL_NULL'||n.value.kind==='JSON_NULL'||n.value.kind==='SQL_ARRAY_NULL'?'ABSENCE':'DATA'}));
}
const ref=(node:TypedMigrationLineageNode,target:string,column:string,text:string,historical=false):TypedReferenceClassificationInput=>({address:node.address,kind:'REFERENCE',target,targetColumns:[column],key:[{kind:'TEXT',text}],historical});
function validated(value:TypedMigrationCellLineage,request:unknown):TypedMigrationCellReferences {
 const result=validateTypedMigrationCellReferences(value,request);
 expect(result.status).toBe('VALIDATED');
 if(result.status!=='VALIDATED')throw new Error('Expected complete explicit review');
 return result.classification;
}
function block(value:unknown,request:unknown,code:string) {
 expect(validateTypedMigrationCellReferences(value,request)).toEqual({status:'BLOCKED',code});
}

describe('complete explicit source-bound typed reference observations',()=>{
 it('returns exact declared source type and contract for a real column, blocks unknown columns',()=>{
  const result=getTypedReferenceColumnContract('calendar_subscriptions','allowed_location_ids');
  expect(result.status).toBe('CONTRACT');
  if(result.status!=='CONTRACT')throw new Error('Expected frozen source contract');
  expect(result.contract).toMatchObject({table:'calendar_subscriptions',column:'allowed_location_ids',sourceType:'text[]',nullable:false,typedField:false,payloadHistorical:false});
  expect(result.contract.source.declaration).toEqual({path:'db/migrations/0025_calendar_subscriptions.sql',line:38});
  expect(result.contract.checksum).toMatch(/^[a-f0-9]{64}$/);
  expect(getTypedReferenceColumnContract('missing','id')).toEqual({status:'BLOCKED',code:'UNKNOWN_SOURCE_COLUMN'});
  expect(getTypedReferenceColumnContract('employees','missing')).toEqual({status:'BLOCKED',code:'UNKNOWN_SOURCE_COLUMN'});
  expect(getTypedReferenceColumnContract(new Proxy({},{}),'id')).toEqual({status:'BLOCKED',code:'UNKNOWN_SOURCE_COLUMN'});
 });
 it('requires explicit coverage of every leaf and empty container with preserved exact values',()=>{
  const value=lineage('jsonb','{"amount":9007199254740993,"scale":1.00,"fraction":0.123456789012345678901,"ok":true,"nil":null,"empty":[],"object":{}}');
  const result=validated(value,review('shift_change_operations','result',value,data(value)));
  expect(result.source).toBe(value.source);
  expect(result.classifications.map(c=>c.value)).toEqual([
   {kind:'JSON_NUMBER',lexeme:'9007199254740993'},{kind:'JSON_NUMBER',lexeme:'1.00'},
   {kind:'JSON_NUMBER',lexeme:'0.123456789012345678901'},{kind:'JSON_BOOLEAN',value:true},
   {kind:'JSON_NULL'},{kind:'JSON_ARRAY',length:0},{kind:'JSON_OBJECT',memberCount:0},
  ]);
  expect(result.references).toEqual([]);
  expect(result.verification).toBe('PURE_EXPLICIT_REFERENCE_OBSERVATIONS_NOT_DATABASE_REVIEWER_OR_TENANT_VERIFICATION');
 });
 it.each(['missing','duplicate','unknown','nonleaf'] as const)('rejects %s classification coverage',change=>{
  const value=lineage('jsonb','{"a":1,"b":[]}'),bindings=data(value);
  if(change==='missing')bindings.pop();
  if(change==='duplicate')bindings.push(bindings[0]);
  if(change==='unknown')bindings[0]={kind:'DATA',address:[{kind:'JSON_INDEX',index:99}]};
  if(change==='nonleaf')bindings[0]={kind:'DATA',address:[]};
  block(value,review('shift_change_operations','result',value,bindings),change==='duplicate'?'DUPLICATE_OCCURRENCE':change==='missing'?'CLASSIFICATION_COVERAGE_GAP':'UNKNOWN_OCCURRENCE');
 });
 it('preserves exact escaped names, occurrence order and path indices',()=>{
  const value=lineage('jsonb','{"2":"x","1":"y","\\u0061":[{"v":"z"},{"v":"q"}]}'),bindings=data(value).reverse();
  const result=validated(value,review('shift_change_operations','result',value,bindings));
  expect(result.classifications.map(c=>c.address)).toEqual(leaves(value).map(n=>n.address));
  expect(result.classifications[2].address[0]).toEqual({kind:'JSON_MEMBER',entryIndex:2,name:'a',nameLexeme:'"\\u0061"'});
  const altered=data(value);altered[0]={kind:'DATA',address:[{kind:'JSON_MEMBER',entryIndex:0,name:'2',nameLexeme:'"wrong"'}]};
  block(value,review('shift_change_operations','result',value,altered),'UNKNOWN_OCCURRENCE');
 });
 it.each(['schemaCommit','schemaTree','schemaDigest','registryDigest','contractChecksum','sourceChecksum'] as const)('rejects changed binding %s',field=>{
  const value=lineage('jsonb','{}'),r=review('shift_change_operations','result',value,data(value));
  const changed={...r,binding:{...r.binding,[field]:'f'.repeat(field.endsWith('Commit')||field.endsWith('Tree')?40:64)}};
  block(value,changed,'SOURCE_CONTRACT_DRIFT');
 });
 it.each(['','not-sha','A'.repeat(64)])('requires explicit review evidence digest %s',reviewEvidenceDigest=>{
  const value=lineage('jsonb','{}'),r=review('shift_change_operations','result',value,data(value));
  block(value,{...r,reviewEvidenceDigest},'REVIEW_EVIDENCE_REQUIRED');
 });
 it('rejects a genuine lineage for the wrong actual source-column type',()=>{
  const value=lineage('text','raw'),r=review('shift_change_operations','result',value,data(value));
  block(value,r,'SOURCE_COLUMN_TYPE_DRIFT');
 });
 it('never resolves an unresolved claim by assigning DATA',()=>{
  const value=lineage('jsonb','1'),r=review('shift_change_operations','result',value,data(value));
  block(value,{...r,unresolvedAddresses:[[]]},'UNRESOLVED_CLASSIFICATION');
  block(value,{...r,classifications:[{address:[],kind:'UNRESOLVED',reason:'unknown'}]},'UNRESOLVED_CLASSIFICATION');
  block(value,{...r,classifications:[{address:[]}]},'INVALID_CLASSIFICATION');
 });
 const aliases=[
  ['employeeId','employees','id'],['employee_id','employees','id'],['requesterEmployeeId','employees','id'],['targetEmployeeId','employees','id'],
  ['actorEmployeeId','employees','id'],['reviewedBy','employees','id'],['createdBy','employees','id'],['locationId','locations','id'],['location_id','locations','id'],
  ['workspaceId','workspaces','id'],['workspace_id','workspaces','id'],['positionId','positions','id'],['position_id','positions','id'],
  ['scheduleId','schedules','id'],['schedule_id','schedules','id'],['shiftId','shifts','id'],['shift_id','shifts','id'],['sourceShiftId','shifts','id'],['source_shift_id','shifts','id'],
  ['publishedShiftId','schedule_publication_revision_shifts','id'],['revisionId','schedule_publication_revisions','id'],['timeEntryId','time_entries','id'],
  ['breakEntryId','break_entries','id'],['deviceId','clocker_devices','id'],['breakTypeId','clocker_break_types','id'],['requestId','time_correction_requests','id'],
  ['targetRequestId','time_correction_requests','id'],['adjustmentId','time_correction_adjustments','id'],['targetAdjustmentId','time_correction_adjustments','id'],
  ['finalizationOperationId','timecard_revisions','operation_id'],
 ] as const;
 it.each(aliases)('preserves declared %s target and literal',(name,target,column)=>{
  const value=lineage('jsonb',JSON.stringify({[name]:' 007 '})),node=leaves(value)[0];
  const result=validated(value,review('shift_change_operations','result',value,[ref(node,target,column,' 007 ')]));
  expect(result.references[0]).toMatchObject({target,targetColumns:[column],key:[{kind:'TEXT',text:' 007 '}],literal:{kind:'TEXT',text:' 007 '},literalOrigin:'VALUE',historicalRequired:true,historicalRequested:false,retainedHistoryVerification:'NOT_PERFORMED'});
  block(value,review('shift_change_operations','result',value,data(value)),'DECLARED_IDENTITY_CONFLICT');
  const wrong=ref(node,target,column,'007');
  block(value,review('shift_change_operations','result',value,[wrong]),'REFERENCE_LITERAL_DRIFT');
 });
 it('rejects wrong alias target and GLOBAL_FENCE relabeling',()=>{
  const value=lineage('jsonb','{"employeeId":"007"}'),node=leaves(value)[0];
  block(value,review('shift_change_operations','result',value,[ref(node,'locations','id','007')]),'DECLARED_IDENTITY_CONFLICT');
  block(value,review('shift_change_operations','result',value,[{address:node.address,kind:'GLOBAL_FENCE',fence:'operation_id'}]),'DECLARED_IDENTITY_CONFLICT');
 });
 it('requires explicit typed targets for ambiguous id and typed source fields',()=>{
  const value=lineage('jsonb','{"id":"deleted-original"}'),node=leaves(value)[0];
  block(value,review('shift_change_operations','result',value,data(value)),'DECLARED_IDENTITY_CONFLICT');
  const result=validated(value,review('shift_change_operations','result',value,[ref(node,'shifts','id','deleted-original',true)]));
  expect(result.references[0].historicalRequested).toBe(true);
  expect(result.references[0].retainedHistoryVerification).toBe('NOT_PERFORMED');
  const typed=lineage('text','immutable-source');
  block(typed,review('notifications','source_id',typed,data(typed)),'DECLARED_IDENTITY_CONFLICT');
  expect(validated(typed,review('notifications','source_id',typed,[ref(typed.nodes[0],'shifts','id','immutable-source')])).references[0].historicalRequired).toBe(true);
 });
 it('uses participants decisionVersions employee member key, not version numeric value',()=>{
  const value=lineage('jsonb','{"decisionVersions":{" 007 ":9007199254740993,"retired":{"v":1.00},"none":null}}'),nodes=leaves(value);
  const bindings=[ref(nodes[0],'employees','id',' 007 '),ref(nodes[1],'employees','id','retired'),ref(nodes[2],'employees','id','none')];
  const result=validated(value,review('shift_change_events','participants',value,bindings));
  expect(result.references.map(r=>[r.literal,r.literalOrigin])).toEqual([[{kind:'TEXT',text:' 007 '},'JSON_MEMBER_NAME'],[{kind:'TEXT',text:'retired'},'JSON_MEMBER_NAME'],[{kind:'TEXT',text:'none'},'JSON_MEMBER_NAME']]);
  expect(result.classifications[0].value).toEqual({kind:'JSON_NUMBER',lexeme:'9007199254740993'});
  block(value,review('shift_change_events','participants',value,data(value)),'DECLARED_IDENTITY_CONFLICT');
  block(value,review('shift_change_events','participants',value,[ref(nodes[0],'employees','id','9007199254740993'),bindings[1],bindings[2]]),'REFERENCE_LITERAL_DRIFT');
 });
 it('preserves calendar lower bounds and native NULL absence without fictitious IDs',()=>{
  const value=lineage('text[]','[-2:-1][3:4]={{" 007 ",NULL},{"NULL",""}}'),nodes=leaves(value);
  const bindings=[ref(nodes[0],'locations','id',' 007 '),{address:nodes[1].address,kind:'ABSENCE'} as const,ref(nodes[2],'locations','id','NULL'),ref(nodes[3],'locations','id','')];
  const result=validated(value,review('calendar_subscriptions','allowed_location_ids',value,bindings));
  expect(result.source.wire?.text).toBe('[-2:-1][3:4]={{" 007 ",NULL},{"NULL",""}}');
  expect(result.references.map(r=>r.key)).toEqual([[{kind:'TEXT',text:' 007 '}],[{kind:'TEXT',text:'NULL'}],[{kind:'TEXT',text:''}]]);
  expect(result.classifications[1].value).toEqual({kind:'SQL_ARRAY_NULL'});
  expect(result.references[0].address).toEqual([{kind:'SQL_ARRAY_ELEMENT',ordinal:0,subscripts:[-2,3]}]);
  block(value,review('calendar_subscriptions','allowed_location_ids',value,data(value)),'DECLARED_IDENTITY_CONFLICT');
  block(value,review('calendar_subscriptions','allowed_location_ids',value,[ref(nodes[0],'locations','id',' 007 ',true),...bindings.slice(1)]),'CALENDAR_HISTORY_CONFLICT');
 });
 it('covers empty native arrays explicitly without inventing a location',()=>{
  const value=lineage('text[]','{}');
  const result=validated(value,review('calendar_subscriptions','allowed_location_ids',value,data(value)));
  expect(result.references).toEqual([]);
  expect(result.classifications[0].value).toEqual({kind:'SQL_ARRAY',dimensions:[],elementCount:0});
 });
 it.each([['jsonb',null,'source_terms','SQL_NULL'],['jsonb','null','source_terms','JSON_NULL']] as const)('retains %s/%s absence kind',(type,raw,column,kind)=>{
  const value=lineage(type,raw),result=validated(value,review('shift_change_events',column,value,data(value)));
  expect(result.classifications[0].value.kind).toBe(kind);
  block(value,review('shift_change_events',column,value,[ref(value.nodes[0],'employees','id','fabricated')]),'NULL_REQUIRES_ABSENCE');
 });
 it('rejects absence on non-null values and SQL NULL for a nonnullable source column',()=>{
  const value=lineage('jsonb','false');
  block(value,review('shift_change_operations','result',value,[{address:[],kind:'ABSENCE'}]),'ABSENCE_LITERAL_CONFLICT');
  const invalid=lineage('jsonb',null);
  block(invalid,review('shift_change_operations','result',invalid,data(invalid)),'NONNULL_COLUMN_SQL_NULL');
 });
 it('preserves tagged numeric reference key lexemes rather than rounding or coercing',()=>{
  const value=lineage('jsonb','{"id":9007199254740993}'),node=leaves(value)[0];
  const binding:TypedReferenceClassificationInput={address:node.address,kind:'REFERENCE',target:'calendar_clock',targetColumns:['serial'],key:[{kind:'JSON_NUMBER',lexeme:'9007199254740993'}],historical:false};
  expect(validated(value,review('shift_change_operations','result',value,[binding])).references[0].literal).toEqual({kind:'JSON_NUMBER',lexeme:'9007199254740993'});
  block(value,review('shift_change_operations','result',value,[ref(node,'calendar_clock','serial','9007199254740993')]),'REFERENCE_LITERAL_DRIFT');
 });
 it.each(['unknown-table','unknown-column','duplicate-columns','mismatched-key','untyped-key'] as const)('rejects %s reference target claims',change=>{
  const value=lineage('jsonb','{"id":"x"}'),node=leaves(value)[0],binding=ref(node,'employees','id','x');
  if(binding.kind!=='REFERENCE')throw new Error('Reference fixture');
  let changed:unknown=binding;
  if(change==='unknown-table')changed={...binding,target:'missing'};
  if(change==='unknown-column')changed={...binding,targetColumns:['missing']};
  if(change==='duplicate-columns')changed={...binding,targetColumns:['id','id'],key:[{kind:'TEXT',text:'x'},{kind:'TEXT',text:'x'}]};
  if(change==='mismatched-key')changed={...binding,key:[]};
  if(change==='untyped-key')changed={...binding,key:['x']};
  const r=review('shift_change_operations','result',value,[]);
  block(value,{...r,classifications:[changed]},change==='untyped-key'?'INVALID_CLASSIFICATION':'REFERENCE_TARGET_INVALID');
 });
 it('binds GLOBAL_FENCE only to an actual declared exact column contract',()=>{
  const value=lineage('text','original-global-id');
  const r=review('employees','id',value,[{address:[],kind:'GLOBAL_FENCE',fence:'id'}]);
  expect(validated(value,r).classifications[0].classification).toEqual({address:[],kind:'GLOBAL_FENCE',fence:'id'});
  block(value,{...r,classifications:[{address:[],kind:'GLOBAL_FENCE',fence:'invented'}]},'GLOBAL_FENCE_CONTRACT_REQUIRED');
  const ambiguous=lineage('text','legacy');
  block(ambiguous,review('notifications','event_key',ambiguous,[{address:[],kind:'GLOBAL_FENCE',fence:'legacy event_key+environment'}]),'UNSUPPORTED_GLOBAL_FENCE_SCOPE');
 });
 it('requires actual declared physical source reference literal',()=>{
  const value=lineage('text','original-location'),r=review('employees','primary_location_id',value,data(value));
  block(value,r,'DECLARED_IDENTITY_CONFLICT');
  expect(validated(value,review('employees','primary_location_id',value,[ref(value.nodes[0],'locations','id','original-location')])).references[0].target).toBe('locations');
 });
 it('rejects unissued/serialized/spread/proxy lineage before reading review',()=>{
  const value=lineage('jsonb','{}');let invoked=0;
  const hostile=Object.defineProperty({},'binding',{get(){invoked++;throw new Error('private');}});
  const revoked=Proxy.revocable(value,{});revoked.revoke();
  for(const input of [null,{},JSON.parse(JSON.stringify(value)),{...value},new Proxy(value,{}),revoked.proxy]){
   block(input,hostile,'UNISSUED_TYPED_LINEAGE');
  }
  expect(invoked).toBe(0);
 });
 it('rejects accessor/proxy/sparse/cyclic/ignored review data without invoking getters or traps',()=>{
  const value=lineage('jsonb','{}'),r=review('shift_change_operations','result',value,data(value));let invoked=0;
  const getter=Object.defineProperty({...r},'reviewEvidenceDigest',{enumerable:true,get(){invoked++;throw new Error('private');}});
  const proxy=new Proxy(r,{get(){invoked++;throw new Error('private');},ownKeys(){invoked++;throw new Error('private');},getPrototypeOf(){invoked++;throw new Error('private');}});
  const revoked=Proxy.revocable(r,{});revoked.revoke();
  const sparse={...r,classifications:new Array(1)};
  const cyclic:Record<string,unknown>={...r};cyclic.extra=cyclic;
  const hidden=Object.defineProperty({...r},'extra',{value:'ignored',enumerable:false});
  const nested={...r,classifications:[new Proxy(r.classifications[0],{get(){invoked++;throw new Error('private');}})]};
  for(const request of [getter,proxy,revoked.proxy,sparse,cyclic,hidden,nested])block(value,request,'INVALID_REVIEW_STRUCTURE');
  expect(invoked).toBe(0);
 });
 it('rejects extra fields/invalid address metadata instead of ignoring them',()=>{
  const value=lineage('jsonb','{}'),r=review('shift_change_operations','result',value,data(value));
  block(value,{...r,approved:true},'INVALID_REVIEW_STRUCTURE');
  block(value,{...r,classifications:[{kind:'DATA',address:[],target:'employees'}]},'INVALID_CLASSIFICATION');
  block(value,{...r,classifications:[{kind:'DATA',address:[{kind:'JSON_INDEX',index:NaN}]}]},'INVALID_REVIEW_STRUCTURE');
 });
 it('detaches and freezes review claims, preserving source identity without granting clone authority',()=>{
  const value=lineage('jsonb','{"id":"history"}'),node=leaves(value)[0],r=review('shift_change_operations','result',value,[ref(node,'shifts','id','history',true)]);
  const result=validated(value,r),originalDigest=result.digest;
  expect(isIssuedTypedMigrationCellReferences(result)).toBe(true);
  (r.classifications[0] as {target:string}).target='employees';
  expect(result.references[0].target).toBe('shifts');
  expect(result.digest).toBe(originalDigest);expect(result.source).toBe(value.source);
  expect(result.reviewEvidenceDigest).toBe(digest);
  const stack:unknown[]=[result];
  while(stack.length){const next=stack.pop();if(next&&typeof next==='object'){expect(Object.isFrozen(next)).toBe(true);stack.push(...Object.values(next));}}
  expect(isIssuedTypedMigrationCellReferences(JSON.parse(JSON.stringify(result)))).toBe(false);
  expect(isIssuedTypedMigrationCellReferences({...result})).toBe(false);
  expect(isIssuedTypedMigrationCellReferences(new Proxy(result,{}))).toBe(false);
  const altered={...review('shift_change_operations','result',value,[ref(node,'shifts','id','history',true)]),reviewEvidenceDigest:'c'.repeat(64)};
  expect(validated(value,altered).digest).not.toBe(originalDigest);
 });
 it('compares occurrence and tagged-literal records independent of JSON property order',()=>{
  const value=lineage('jsonb','{"id":"exact"}'),node=leaves(value)[0],segment=node.address[0];
  if(segment.kind!=='JSON_MEMBER')throw new Error('Expected member fixture');
  const binding={historical:false,key:[{text:'exact',kind:'TEXT'}],targetColumns:['id'],target:'shifts',kind:'REFERENCE',address:[{nameLexeme:segment.nameLexeme,name:segment.name,entryIndex:segment.entryIndex,kind:'JSON_MEMBER'}]};
  const request={...review('shift_change_operations','result',value,[]),classifications:[binding]};
  expect(validated(value,request).references[0].key).toEqual([{kind:'TEXT',text:'exact'}]);
 });
 it('blocks unsupported decisionVersions array identity instead of using version as employee ID',()=>{
  const value=lineage('jsonb','{"decisionVersions":[9007199254740993]}'),node=leaves(value)[0];
  const claim={address:node.address,kind:'REFERENCE',target:'employees',targetColumns:['id'],key:[{kind:'JSON_NUMBER',lexeme:'9007199254740993'}],historical:false};
  block(value,{...review('shift_change_events','participants',value,[]),classifications:[claim]},'UNSUPPORTED_REFERENCE_LITERAL');
 });
 it.each(['{"employeeId":["original"]}','{"id":{"encoding":"original"}}'])('does not relabel unsupported identity container descendants as DATA: %s',raw=>{
  const value=lineage('jsonb',raw),node=leaves(value)[0];
  block(value,review('shift_change_operations','result',value,data(value)),'DECLARED_IDENTITY_CONFLICT');
  block(value,review('shift_change_operations','result',value,[ref(node,'employees','id','original')]),'UNSUPPORTED_REFERENCE_LITERAL');
 });
 it('retains nullable scalar alias JSON null absence without making an ID',()=>{
  const value=lineage('jsonb','{"employeeId":null}');
  const result=validated(value,review('shift_change_operations','result',value,data(value)));
  expect(result.references).toEqual([]);expect(result.classifications[0].value).toEqual({kind:'JSON_NULL'});
 });
 it('retains decisionVersions employee member-key reference independently of JSON null version',()=>{
  const value=lineage('jsonb','{"decisionVersions":{"employee-1":null}}'),node=leaves(value)[0];
  const result=validated(value,review('shift_change_events','participants',value,[ref(node,'employees','id','employee-1')]));
  expect(result.references[0]).toMatchObject({target:'employees',literal:{kind:'TEXT',text:'employee-1'},literalOrigin:'JSON_MEMBER_NAME',retainedHistoryVerification:'NOT_PERFORMED'});
  expect(result.classifications[0].value).toEqual({kind:'JSON_NULL'});
 });
 it('rejects ABSENCE that would erase decisionVersions employee member-key identity',()=>{
  const value=lineage('jsonb','{"decisionVersions":{"employee-1":null}}');
  block(value,review('shift_change_events','participants',value,data(value)),'DECLARED_IDENTITY_CONFLICT');
 });
 it('rejects all-null identity container descendants instead of treating the container as absent',()=>{
  const value=lineage('jsonb','{"employeeId":[null]}');
  block(value,review('shift_change_operations','result',value,data(value)),'DECLARED_IDENTITY_CONFLICT');
 });
 it.each(['{"decisionVersions":{"employee-1":{"employeeId":"employee-2"}}}','{"decisionVersions":{"employee-1":{"id":"other"}}}','{"decisionVersions":{"employee-1":{"employeeId":[null]}}}'])('blocks unsupported paired member-key and value identity claims: %s',raw=>{
  const value=lineage('jsonb',raw),node=leaves(value)[0];
  block(value,review('shift_change_events','participants',value,[ref(node,'employees','id','employee-1')]),'UNSUPPORTED_REFERENCE_LITERAL');
 });
 it('preserves member-key identity when a nested scalar alias value is truly absent',()=>{
  const value=lineage('jsonb','{"decisionVersions":{"employee-1":{"employeeId":null}}}'),node=leaves(value)[0];
  expect(validated(value,review('shift_change_events','participants',value,[ref(node,'employees','id','employee-1')])).references[0].literal).toEqual({kind:'TEXT',text:'employee-1'});
 });
});
