import { createHash } from 'node:crypto';
import { describe,expect,it } from 'vitest';
import { canonicalOwnershipJson,getOwnershipRegistry } from './ownership';
import { decodeTypedMigrationWireValue,projectTypedMigrationWireValueToLegacy,TYPED_MIGRATION_SOURCE_TYPES,type TypedMigrationWireValue } from './typed-wire';

function decoded(type:unknown,raw:unknown):TypedMigrationWireValue{
 const result=decodeTypedMigrationWireValue(type,raw);
 expect(result.status).toBe('DECODED');
 if(result.status!=='DECODED')throw new Error('Expected decoded fictional wire');
 return result.value;
}
function wire(text:string){
 const bytes=Buffer.from(text,'utf8');
 return {encoding:'UTF8',text,bytesBase64:bytes.toString('base64'),byteLength:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
}
const samples:Record<string,string>={
 text:' exact Ω é 😀 ',date:'2026-10-09',time:'08:00:00.123456',
 smallint:'-32768',timestamptz:'2026-10-09 01:02:03.123456+00',integer:'2147483647',
 jsonb:'{"id":9007199254740993}',boolean:'f',uuid:'12345678-1234-1234-1234-123456789abc',
 'text[]':'[0:1]={"historical,Ω","quoted\\"value"}','char(64)':'padded   ',
 'numeric(5,2)':'99.10',bigint:'9223372036854775807',
 timestamp:'2026-10-09 01:02:03.000001','char(32)':'value   ',
};
describe('pure exact typed migration wire descriptors',()=>{
 it('covers exactly every source registry type with source-bound representative values',()=>{
  const actual=[...new Set(getOwnershipRegistry().tables.flatMap(t=>t.columns.map(c=>c.type)))].sort();
  expect([...TYPED_MIGRATION_SOURCE_TYPES].sort()).toEqual(actual);
  expect(Object.keys(samples).sort()).toEqual(actual);
  for(const type of actual){
   const value=decoded(type,samples[type]);
   expect(value.sourceType).toBe(type);
   expect(value.wire).toEqual(wire(samples[type]));
   expect(Object.isFrozen(value)).toBe(true);
  }
 });
 it.each(TYPED_MIGRATION_SOURCE_TYPES)('distinguishes SQL NULL for source type %s',type=>{
  const value=decoded(type,null);
  expect(value).toEqual({kind:'SQL_NULL',sourceType:type,wire:null});
  expect(projectTypedMigrationWireValueToLegacy(value)).toEqual({status:'CONVERTED',origin:'SQL_NULL',value:null});
 });
 it('keeps JSON null separate from SQL NULL and blocks its ambiguous legacy projection',()=>{
  const value=decoded('jsonb','null');
  expect(value).toEqual({kind:'JSON',sourceType:'jsonb',wire:wire('null'),value:{kind:'JSON_NULL'}});
  expect(projectTypedMigrationWireValueToLegacy(value)).toEqual({status:'BLOCKED',code:'SQL_JSON_NULL_AMBIGUITY'});
  expect(canonicalOwnershipJson(value)).not.toBe(canonicalOwnershipJson(decoded('jsonb',null)));
 });
 it.each(['9007199254740993','-9223372036854775808','0.123456789012345678901234567890','1.00','-0','1e400','1.230E-5','0e+0003'])('keeps arbitrary exact JSON numeric lexeme %s while blocking lossy legacy output',raw=>{
  const value=decoded('jsonb',raw);
  expect(value).toEqual({kind:'JSON',sourceType:'jsonb',wire:wire(raw),value:{kind:'NUMBER',lexeme:raw}});
  expect(projectTypedMigrationWireValueToLegacy(value)).toEqual({status:'BLOCKED',code:'NUMBER_NOT_EXACT_IN_EXISTING_JSON'});
 });
 it('keeps raw JSON whitespace, strings/property names and AST tokens without tag collisions',()=>{
  const raw=' \r\n{"kind":"SQL_NULL","wire":null,"n":1.00,"é":"\\u00E9","e\\u0301":true}\t';
  const value=decoded('jsonb',raw);
  if(value.kind!=='JSON')throw new Error('Expected JSON');
  expect(value.wire).toEqual(wire(raw));
  expect(value.value.kind).toBe('OBJECT');
  if(value.value.kind!=='OBJECT')throw new Error('Expected object');
  expect(value.value.entries.map(e=>e.name)).toEqual(['kind','wire','n','é','é']);
  expect(value.value.entries[2].value).toEqual({kind:'NUMBER',lexeme:'1.00'});
  expect(value.value.entries[3]).toEqual({name:'é',nameLexeme:'"é"',value:{kind:'STRING',value:'é',lexeme:'"\\u00E9"'}});
  expect(projectTypedMigrationWireValueToLegacy(value).status).toBe('BLOCKED');
 });
 it('projects only exact existing-format JSON and preserves prototype-shaped literal properties',()=>{
  const raw='{"__proto__":{"polluted":true},"x":[0,0.5,9007199254740991,null],"kind":"RAW_SQL_ARRAY"}';
  const result=projectTypedMigrationWireValueToLegacy(decoded('jsonb',raw));
  expect(result).toEqual({status:'CONVERTED',origin:'JSON',value:JSON.parse(raw)});
  expect(({} as {polluted?:boolean}).polluted).toBeUndefined();
  if(result.status!=='CONVERTED')throw new Error('Expected conversion');
  expect(Object.prototype.hasOwnProperty.call(result.value,'__proto__')).toBe(true);
 });
 it.each(['[0:1]={"NULL",NULL}','[2:3][4:5]={{a,b},{c,d}}','{}','{"a,b","quoted\\"value","Ω"}','not-proved-array-syntax'])('preserves native SQL array wire literally, with no dimension/bounds/element proof: %s',raw=>{
  const value=decoded('text[]',raw);
  expect(value).toEqual({kind:'RAW_SQL_ARRAY',sourceType:'text[]',wire:wire(raw),semantics:'UNPARSED'});
  expect(projectTypedMigrationWireValueToLegacy(value)).toEqual({status:'BLOCKED',code:'RAW_SQL_ARRAY_PROJECTION_UNSUPPORTED'});
  expect('dimensions' in value).toBe(false);expect('bounds' in value).toBe(false);expect('elements' in value).toBe(false);
 });
 it.each([
  ['text',' exact Ω é 😀 '],['char(32)','value   '],['char(64)','padded   '],
  ['time','08:00:00.123456'],['timestamp','2026-10-09 01:02:03.000001'],
  ['timestamptz','2026-10-09 01:02:03.123456+00'],['date','infinity'],
  ['uuid','12345678-1234-1234-1234-123456789abc'],
 ])('preserves %s wire without trimming/Date conversion/semantic normalization',(type,raw)=>{
  expect(decoded(type,raw)).toEqual({kind:'SCALAR',sourceType:type,wire:wire(raw)});
  expect(projectTypedMigrationWireValueToLegacy(decoded(type,raw))).toEqual({status:'CONVERTED',origin:'SCALAR',value:raw});
 });
 it.each([['smallint','-32768',-32768],['smallint','32767',32767],['integer','-2147483648',-2147483648],['integer','2147483647',2147483647]] as const)('projects bounded exact SQL integer %s/%s',(type,raw,expected)=>{
  expect(decoded(type,raw)).toEqual({kind:'SCALAR',sourceType:type,wire:wire(raw)});
  expect(projectTypedMigrationWireValueToLegacy(decoded(type,raw))).toEqual({status:'CONVERTED',origin:'SCALAR',value:expected});
 });
 it.each(['9223372036854775807','-9223372036854775808','0'])('preserves signed bigint %s as exact text',raw=>{
  expect(projectTypedMigrationWireValueToLegacy(decoded('bigint',raw))).toEqual({status:'CONVERTED',origin:'SCALAR',value:raw});
 });
 it.each(['99.10','-0.00','000.10'])('preserves the existing fixed-scale SQL numeric string contract: %s',raw=>{
  expect(projectTypedMigrationWireValueToLegacy(decoded('numeric(5,2)',raw))).toEqual({status:'CONVERTED',origin:'SCALAR',value:raw});
 });
 it.each([['t',true],['f',false]])('projects actual boolean wire %s explicitly',(raw,expected)=>{
  expect(projectTypedMigrationWireValueToLegacy(decoded('boolean',raw))).toEqual({status:'CONVERTED',origin:'SCALAR',value:expected});
 });
 it.each([
  ['smallint','32768','INVALID_INTEGER_WIRE'],['smallint','-32769','INVALID_INTEGER_WIRE'],
  ['integer','2147483648','INVALID_INTEGER_WIRE'],['integer','-2147483649','INVALID_INTEGER_WIRE'],
  ['integer','01','INVALID_INTEGER_WIRE'],['integer','1e0','INVALID_INTEGER_WIRE'],
  ['integer',' 1','INVALID_INTEGER_WIRE'],['integer','+1','INVALID_INTEGER_WIRE'],
  ['bigint','9223372036854775808','INVALID_BIGINT_WIRE'],['bigint','-9223372036854775809','INVALID_BIGINT_WIRE'],
  ['bigint','-0','INVALID_BIGINT_WIRE'],['bigint','01','INVALID_BIGINT_WIRE'],
  ['numeric(5,2)','NaN','UNSUPPORTED_NUMERIC_WIRE'],['numeric(5,2)','1.0','UNSUPPORTED_NUMERIC_WIRE'],
  ['numeric(5,2)','1e0','UNSUPPORTED_NUMERIC_WIRE'],['boolean','true','INVALID_BOOLEAN_WIRE'],
  ['boolean','0','INVALID_BOOLEAN_WIRE'],
 ])('rejects unsupported scalar wire %s/%s with a sanitized code',(type,raw,code)=>{
  expect(decodeTypedMigrationWireValue(type,raw)).toEqual({status:'BLOCKED',code});
 });
 it.each(['citext','TEXT',' text','numeric','timestamp with time zone','text[][]',''])('rejects unsupported source-type aliases instead of guessing: %s',type=>{
  expect(decodeTypedMigrationWireValue(type,'x')).toEqual({status:'BLOCKED',code:'UNSUPPORTED_SOURCE_TYPE'});
  expect(decodeTypedMigrationWireValue(type,null)).toEqual({status:'BLOCKED',code:'UNSUPPORTED_SOURCE_TYPE'});
 });
 it('rejects unknown types/raw values/accessors/proxies without invoking application code',()=>{
  let calls=0;
  const accessor=Object.defineProperty({},'toString',{get(){calls++;throw new Error('fictional_private');}});
  const proxy=new Proxy({}, {get(){calls++;throw new Error('fictional_private');},getPrototypeOf(){calls++;throw new Error('fictional_private');},ownKeys(){calls++;throw new Error('fictional_private');}});
  const revoked=Proxy.revocable({},{});revoked.revoke();
  for(const unknown of [undefined,1,true,BigInt(1),Symbol('fictional'),()=>{},accessor,proxy,revoked.proxy,[],new String('x'),new Date(),Buffer.from('x')]){
   expect(decodeTypedMigrationWireValue(unknown,null)).toEqual({status:'BLOCKED',code:'UNSUPPORTED_SOURCE_TYPE'});
   expect(decodeTypedMigrationWireValue('text',unknown)).toEqual({status:'BLOCKED',code:'INVALID_WIRE_TYPE'});
  }
  expect(calls).toBe(0);
 });
 it.each(['\ud800','\udc00','\ud800x','x\udc00'])('rejects invalid UTF16/UTF8 input instead of replacing it',raw=>{
  for(const type of ['text','text[]','jsonb'])expect(decodeTypedMigrationWireValue(type,raw)).toEqual({status:'BLOCKED',code:'INVALID_UNICODE'});
 });
 it('rejects NUL and reuses JSON syntax/duplicate/Unicode rejection with no raw diagnostic echo',()=>{
  expect(decodeTypedMigrationWireValue('text','fictional\u0000private')).toEqual({status:'BLOCKED',code:'SQL_NUL_UNSUPPORTED'});
  expect(decodeTypedMigrationWireValue('jsonb','{"a":1,"\\u0061":2}')).toEqual({status:'BLOCKED',code:'DUPLICATE_PROPERTY_NAME'});
  expect(decodeTypedMigrationWireValue('jsonb','"\\u0000"')).toEqual({status:'BLOCKED',code:'JSONB_NUL_UNSUPPORTED'});
  expect(decodeTypedMigrationWireValue('jsonb','{} fictional_private')).toEqual({status:'BLOCKED',code:'TRAILING_JSON'});
 });
 it('provides deeply immutable data-only descriptors serializable by current evidence format',()=>{
  const value=decoded('jsonb','{"x":[1.00,null]}');
  expect(Object.isFrozen(value)).toBe(true);
  if(value.kind!=='JSON'||value.value.kind!=='OBJECT')throw new Error('Expected JSON object');
  expect(Object.isFrozen(value.wire)).toBe(true);
  expect(Object.isFrozen(value.value)).toBe(true);
  expect(Object.isFrozen(value.value.entries)).toBe(true);
  expect(Object.isFrozen(value.value.entries[0])).toBe(true);
  expect(Object.isFrozen(value.value.entries[0].value)).toBe(true);
  expect(Reflect.set(value.wire,'text','changed')).toBe(false);
  expect(JSON.parse(canonicalOwnershipJson(value))).toEqual(JSON.parse(JSON.stringify(value)));
  for(const descriptor of TYPED_MIGRATION_SOURCE_TYPES.map(type=>decoded(type,samples[type]))){
   expect(JSON.parse(canonicalOwnershipJson(descriptor))).toEqual(JSON.parse(JSON.stringify(descriptor)));
  }
 });
 it('requires genuine local issued identity for projection; clones/DTOs/proxies cannot gain issuance',()=>{
  const value=decoded('text',' exact ');
  let calls=0;
  const getter=Object.defineProperty({},'kind',{get(){calls++;throw new Error('fictional_private');}});
  const proxy=new Proxy(value,{get(){calls++;throw new Error('fictional_private');},ownKeys(){calls++;throw new Error('fictional_private');}});
  const revoked=Proxy.revocable(value,{});revoked.revoke();
  for(const unknown of [null,undefined,1,'text',getter,{...value},JSON.parse(JSON.stringify(value)),proxy,revoked.proxy]){
   expect(projectTypedMigrationWireValueToLegacy(unknown)).toEqual({status:'BLOCKED',code:'UNISSUED_TYPED_WIRE_VALUE'});
  }
  expect(calls).toBe(0);
  expect(projectTypedMigrationWireValueToLegacy(value)).toEqual({status:'CONVERTED',origin:'SCALAR',value:' exact '});
 });
 it('preserves deeply nested JSON through the frozen iterative parser and explicit projector',()=>{
  const raw='['.repeat(3000)+'true'+']'.repeat(3000);
  const value=decoded('jsonb',raw);
  expect(value.wire).toEqual(wire(raw));
  expect(projectTypedMigrationWireValueToLegacy(value).status).toBe('CONVERTED');
 });
});
