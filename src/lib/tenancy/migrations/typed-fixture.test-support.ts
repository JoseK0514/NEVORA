import {getOwnershipRegistry,ownershipDigest,canonicalOwnershipJson,type JsonValue} from './ownership';
import {decodeTypedMigrationWireValue} from './typed-wire';
import type {TypedMigrationCaptureFacts,TypedMigrationColumnCapture,TypedMigrationRowCapture} from './capture.server';
import type {TypedSnapshotBoundary} from './typed-snapshot';
const sha=(v:string)=>v.repeat(64);
/** Fictional pure envelopes only; no database/capture/operator authority. */
export function createTypedSnapshotFixture(){
 const registry=getOwnershipRegistry();
 const tables=registry.tables.map(rule=>({table:rule.table,rows:[] as TypedMigrationRowCapture[],expectedCount:0,expectedChecksum:ownershipDigest([])}));
 const catalog={relations:[],columns:[],constraints:[]};
 const facts:TypedMigrationCaptureFacts={format:'TYPED_SQL_WIRE_V1',sourceDigest:sha('a'),registryDigest:registry.digest,currentSchemaDigest:ownershipDigest(catalog),snapshot:{id:'12:19:',isolation:'SERIALIZABLE',includesInactive:true,includesHistory:true},tables,
  namespaceComparators:{binding:{registryDigest:registry.digest,sourceDigest:sha('a'),schemaDigest:ownershipDigest(catalog),snapshotId:'12:19:',rowSetChecksum:''},catalogs:[],rows:[],captureChecksum:''},wireRows:[],fence:{phase:'FENCED',generation:'1',actor:null,manifest:null},catalog,factsDigest:'',verification:'OWNED_LOCAL_TYPED_DATABASE_FACTS_NOT_BACKFILL_AUTHORITY'};
 function seal(recomputeNamespace=true){
  facts.namespaceComparators.binding.rowSetChecksum=ownershipDigest(facts.tables.map(t=>({table:t.table,count:t.expectedCount,checksum:t.expectedChecksum})));
  const n=facts.namespaceComparators; if(recomputeNamespace)n.captureChecksum=ownershipDigest({binding:n.binding,catalogs:n.catalogs,rows:n.rows});
  const {factsDigest:omitted,...value}=facts;void omitted;facts.factsDigest=ownershipDigest(value);
  return {sourceDigest:facts.sourceDigest,currentSchemaDigest:facts.currentSchemaDigest,snapshotId:facts.snapshot.id,fenceGeneration:facts.fence.generation,factsDigest:facts.factsDigest} satisfies TypedSnapshotBoundary;
 }
 function row(table:string,overrides:Record<string,string|null>={}){
  const rule=registry.tables.find(t=>t.table===table)!;
  if(Object.keys(overrides).some(name=>!rule.columns.some(c=>c.name===name)))throw Error('Unknown root fixture override column');
  const defaults:Record<string,string>={text:'fixture-id',date:'2026-10-09',time:'08:00:00',smallint:'1',timestamptz:'2026-10-09 08:00:00.123456+00',integer:'1',jsonb:'{}',boolean:'f',uuid:'00000000-0000-4000-8000-000000000001','text[]':'{}','char(64)':sha('b'),'numeric(5,2)':'1.00',bigint:'9223372036854775807',timestamp:'2026-10-09 08:00:00.123456','char(32)':'x'.repeat(32)};
  const columns:TypedMigrationColumnCapture[]=rule.columns.map(c=>{
   const wire=Object.hasOwn(overrides,c.name)?overrides[c.name]:c.nullable?null:defaults[c.type];
   const decoded=decodeTypedMigrationWireValue(c.type,wire);if(decoded.status!=='DECODED')throw Error('Bad root fixture');
   return {name:c.name,type:c.type,wire,value:decoded.value};
  });
  const key=rule.primaryKey.map(k=>{const c=columns.find(c=>c.name===k)!;if(c.wire===null)throw Error('Null key fixture');return c.type==='integer'||c.type==='smallint'?Number(c.wire):c.type==='boolean'?c.wire==='t':c.wire;});
  const originalChecksum=ownershipDigest({format:'TYPED_SQL_WIRE_V1',columns});
  const row={key,columns,originalChecksum};const t=tables.find(t=>t.table===table)!;t.rows.push(row);t.rows.sort((a,b)=>canonicalOwnershipJson(a.key)<canonicalOwnershipJson(b.key)?-1:1);t.expectedCount=t.rows.length;t.expectedChecksum=ownershipDigest(t.rows.map(r=>({key:r.key,checksum:r.originalChecksum})));
  const values=columns.map(c=>c.wire);facts.wireRows.push({table,key,values,originalChecksum,wireChecksum:ownershipDigest(values)});facts.wireRows.sort((a,b)=>canonicalOwnershipJson([(a as Record<string,JsonValue>).table,(a as Record<string,JsonValue>).key])<canonicalOwnershipJson([(b as Record<string,JsonValue>).table,(b as Record<string,JsonValue>).key])?-1:1);
  return row;
 }
 return {facts,seal,row};
}
