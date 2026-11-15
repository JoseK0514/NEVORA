import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createTypedSnapshotFixture} from './typed-fixture.test-support';
import { inspectTypedMigrationSnapshot } from './typed-snapshot';
import {OWNERSHIP_SOURCE,ownershipDigest,canonicalOwnershipJson} from './ownership';
import {DATABASE_NAMESPACES,databaseComparatorValue,validateTypedDatabaseNamespaceComparators,isIssuedTypedDatabaseNamespaceObservations} from './namespace-comparators';
import type {DatabaseNamespaceComparators} from './backfill';
function fixture(){
 const f=createTypedSnapshotFixture();
 f.row('employees',{id:'employee-1',email:'Exact-Ω@Example.invalid'});f.row('employees',{id:'employee-2',email:null});f.row('employees',{id:'employee-3',email:'Another@Example.invalid'});
 f.row('schedule_templates',{id:'template-1',name:'Inactive Ω',active:'f'});f.row('schedule_templates',{id:'template-2',name:'Active Ω',active:'t'});
 const migrations=OWNERSHIP_SOURCE.map(s=>({path:s.path,text:readFileSync(resolve(s.path),'utf8')}));
 const collation={oid:'100',schema:'pg_catalog',name:'default',provider:'d',deterministic:true,encoding:-1,lcCollate:'C',lcCtype:'C',locale:null,version:null,actualVersion:null};
 const catalogs=DATABASE_NAMESPACES.map(c=>{
  const source=migrations.find(m=>m.path===c.source.path)!.text.split('\n').slice(c.source.line-1).join('\n').split(';')[0]+';';
  const value={contractId:c.contractId,source:c.source,sourceStatementChecksum:ownershipDigest(source),definition:{indexDefinition:c.indexDefinition,expression:c.expression,predicate:c.predicate,expressionCollation:collation,indexCollation:collation,serverVersion:'18.4 FICTIONAL_OBSERVATION',serverEncoding:'UTF8'}};return {...value,checksum:ownershipDigest(value)};
 });
 const rows=DATABASE_NAMESPACES.flatMap(c=>f.facts.tables.find(t=>t.table===c.table)!.rows.map(row=>{
  const wire=row.columns.find(x=>x.name===c.column)!.wire;
  const included=c.table==='employees'?wire!==null:c.table==='schedule_templates'?row.columns.find(x=>x.name==='active')!.wire==='t':true;
  return {contractId:c.contractId,key:row.key,rowChecksum:row.originalChecksum,included,expressionValue:wire===null?null:'FICTIONAL_DB_EXPRESSION_'+row.key[0],comparisonClass:included?'OPAQUE_FICTIONAL_DB_CLASS_'+row.key[0]:null};
 }));
 f.facts.namespaceComparators.catalogs=catalogs.sort((a,b)=>a.contractId<b.contractId?-1:1);f.facts.namespaceComparators.rows=rows.sort((a,b)=>canonicalOwnershipJson([a.contractId,a.key])<canonicalOwnershipJson([b.contractId,b.key])?-1:1);
 const boundary=f.seal();f.facts.namespaceComparators.captureChecksum=ownershipDigest(databaseComparatorValue(f.facts.namespaceComparators));const {factsDigest:omitted,...value}=f.facts;void omitted;f.facts.factsDigest=ownershipDigest(value);boundary.factsDigest=f.facts.factsDigest;
 const outcome=inspectTypedMigrationSnapshot(f.facts,boundary);if(outcome.status!=='INSPECTED')throw Error('Root namespace fixture invalid:'+outcome.code);
 return {snapshot:outcome.snapshot,namespace:JSON.parse(canonicalOwnershipJson(f.facts.namespaceComparators))as DatabaseNamespaceComparators,migrations};
}
function codes(snapshot:unknown,namespace:unknown,migrations:unknown){const r=validateTypedDatabaseNamespaceComparators(snapshot,namespace,migrations);expect(r.status).toBe('BLOCKED');return r.status==='BLOCKED'?r.diagnostics.map(d=>d.code):[];}
function reseal(n:DatabaseNamespaceComparators){n.captureChecksum=ownershipDigest(databaseComparatorValue(n));}
describe('shared pinned namespace comparator validation on typed source',()=>{
 it('validates complete original rows including excluded NULL emails and inactive names',()=>{const f=fixture(),before=canonicalOwnershipJson(f.namespace),r=validateTypedDatabaseNamespaceComparators(f.snapshot,f.namespace,f.migrations);expect(r.status).toBe('VALIDATED');if(r.status!=='VALIDATED')return;expect(r.observations.rows).toHaveLength(5);expect(r.observations.rows.find(x=>x.key[0]==='employee-2')).toMatchObject({included:false,expressionValue:null,comparisonClass:null});expect(r.observations.rows.find(x=>x.key[0]==='template-1')).toMatchObject({included:false,comparisonClass:null});expect(canonicalOwnershipJson(f.namespace)).toBe(before);expect(isIssuedTypedDatabaseNamespaceObservations(r.observations)).toBe(true);expect(Object.isFrozen(r.observations.rows)).toBe(true);});
 it('uses supplied exact database results without JavaScript casing or a namespace-uniqueness claim',()=>{const f=fixture(),r=validateTypedDatabaseNamespaceComparators(f.snapshot,f.namespace,f.migrations);expect(r.status).toBe('VALIDATED');if(r.status==='VALIDATED'){expect(r.observations.rows.find(x=>x.key[0]==='employee-1')!.expressionValue).toBe('FICTIONAL_DB_EXPRESSION_employee-1');expect(r.observations.verification).toContain('NOT_DATABASE_OPERATOR_OR_TENANT_VERIFICATION');}});
 it('retains the exact original namespace capture checksum in the issued typed snapshot',()=>{const f=fixture();expect(f.snapshot.namespaceCaptureChecksum).toBe(f.namespace.captureChecksum);});
 it('rejects alternate coherent expression/class results that are not the original capture',()=>{const f=fixture(),row=f.namespace.rows.find(r=>r.key[0]==='employee-1')!;row.expressionValue='ALTERNATE_COHERENT_DB_VALUE';row.comparisonClass='ALTERNATE_COHERENT_DB_CLASS';reseal(f.namespace);expect(codes(f.snapshot,f.namespace,f.migrations)).toContain('DATABASE_COMPARATOR_CAPTURE_BOUNDARY_DRIFT');});
 it('freezes exported source contracts including declaration fields',()=>{expect(Object.isFrozen(DATABASE_NAMESPACES)).toBe(true);for(const c of DATABASE_NAMESPACES){expect(Object.isFrozen(c)).toBe(true);expect(Object.isFrozen(c.source)).toBe(true);}});
 it('rejects snapshot clones before input accessors or coercion',()=>{const f=fixture(),get=vi.fn();expect(codes({...f.snapshot},{get binding(){return get();}},[])).toContain('UNISSUED_TYPED_SNAPSHOT');expect(get).not.toHaveBeenCalled();});
 it('rejects revoked snapshot proxies without traps',()=>{const f=fixture(),p=Proxy.revocable(f.snapshot,{});p.revoke();expect(codes(p.proxy,f.namespace,f.migrations)).toContain('UNISSUED_TYPED_SNAPSHOT');});
 it('blocks altered original migration bytes before namespace validation',()=>{const f=fixture();f.migrations[0].text+='--drift';expect(codes(f.snapshot,f.namespace,f.migrations)).toContain('SOURCE_DRIFT');});
 const mutations:[string,string,(n:DatabaseNamespaceComparators)=>void][]=[
  ['binding source','DATABASE_COMPARATOR_BINDING_DRIFT',n=>{n.binding.sourceDigest='b'.repeat(64);}],
  ['binding row boundary','DATABASE_COMPARATOR_BINDING_DRIFT',n=>{n.binding.rowSetChecksum='b'.repeat(64);}],
  ['missing catalog','DATABASE_COMPARATOR_CATALOG_REQUIRED',n=>{n.catalogs.pop();}],
  ['duplicate catalog','DATABASE_COMPARATOR_DUPLICATE',n=>{n.catalogs.push(n.catalogs[0]);}],
  ['unknown catalog','DATABASE_COMPARATOR_UNUSED',n=>{n.catalogs[0].contractId='foreign';}],
  ['index definition','DATABASE_COMPARATOR_CATALOG_DRIFT',n=>{n.catalogs[0].definition.indexDefinition='foreign';}],
  ['source statement','DATABASE_COMPARATOR_CATALOG_DRIFT',n=>{n.catalogs[0].sourceStatementChecksum='b'.repeat(64);}],
  ['index collation','DATABASE_COMPARATOR_CATALOG_DRIFT',n=>{Object.assign(n.catalogs[0].definition.indexCollation,{ignored:true});}],
  ['missing excluded row','DATABASE_COMPARATOR_ROW_REQUIRED',n=>{n.rows=n.rows.filter(x=>x.key[0]!=='template-1');}],
  ['duplicate row','DATABASE_COMPARATOR_DUPLICATE',n=>{n.rows.push(n.rows[0]);}],
  ['unknown row','DATABASE_COMPARATOR_UNUSED',n=>{n.rows[0].key=['unknown'];}],
  ['original row checksum','DATABASE_COMPARATOR_ROW_DRIFT',n=>{n.rows[0].rowChecksum='b'.repeat(64);}],
  ['predicate inclusion','DATABASE_COMPARATOR_ROW_DRIFT',n=>{n.rows.find(x=>x.key[0]==='template-1')!.included=true;}],
  ['excluded class','DATABASE_COMPARATOR_ROW_DRIFT',n=>{n.rows.find(x=>x.key[0]==='employee-2')!.comparisonClass='invented';}],
  ['expression NULL distinction','DATABASE_COMPARATOR_ROW_DRIFT',n=>{n.rows.find(x=>x.key[0]==='employee-2')!.expressionValue='invented';}],
 ];
 it.each(mutations)('blocks%s with a coherently rebound outer checksum',(name,code,mutate)=>{void name;const f=fixture();mutate(f.namespace);reseal(f.namespace);expect(codes(f.snapshot,f.namespace,f.migrations)).toContain(code);});
 it('blocks different classes for identical included expression outputs',()=>{const f=fixture();const included=f.namespace.rows.filter(r=>r.contractId==='employees.email_ci'&&r.included);included[1].expressionValue=included[0].expressionValue;included[1].comparisonClass='other';reseal(f.namespace);expect(codes(f.snapshot,f.namespace,f.migrations)).toContain('DATABASE_COMPARATOR_ROW_DRIFT');});
 it('blocks a changed checksum on otherwise coherent metadata',()=>{const f=fixture();f.namespace.captureChecksum='b'.repeat(64);expect(codes(f.snapshot,f.namespace,f.migrations)).toContain('DATABASE_COMPARATOR_CAPTURE_DRIFT');});
 it('rejects metadata accessors without calling them',()=>{const f=fixture(),get=vi.fn(()=>f.namespace.rows);Object.defineProperty(f.namespace,'rows',{get,enumerable:true});expect(codes(f.snapshot,f.namespace,f.migrations)).toContain('UNSUPPORTED_NAMESPACE_VALUE');expect(get).not.toHaveBeenCalled();});
 it('does not allow clones or revoked proxies to acquire observation provenance',()=>{const f=fixture(),r=validateTypedDatabaseNamespaceComparators(f.snapshot,f.namespace,f.migrations);expect(r.status).toBe('VALIDATED');if(r.status!=='VALIDATED')return;expect(isIssuedTypedDatabaseNamespaceObservations({...r.observations})).toBe(false);const p=Proxy.revocable(r.observations,{});p.revoke();expect(isIssuedTypedDatabaseNamespaceObservations(p.proxy)).toBe(false);});
});
