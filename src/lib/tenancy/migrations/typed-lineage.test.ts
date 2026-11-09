import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decodeTypedMigrationWireValue, TYPED_MIGRATION_SOURCE_TYPES, projectTypedMigrationWireValueToLegacy, type TypedMigrationWireValue } from './typed-wire';
import { parseLosslessJsonWire } from './lossless-json';
import { parseLosslessTextArrayWire } from './lossless-array';
import { isIssuedTypedMigrationCellLineage, traverseTypedMigrationWireValue, type TypedMigrationCellLineage } from './typed-lineage';

function decoded(type:string,raw:string|null):TypedMigrationWireValue {
 const result=decodeTypedMigrationWireValue(type,raw);
 expect(result.status).toBe('DECODED');
 if(result.status!=='DECODED')throw new Error('Expected genuine typed fixture');
 return result.value;
}
function traversed(type:string,raw:string|null):TypedMigrationCellLineage {
 const result=traverseTypedMigrationWireValue(decoded(type,raw));
 expect(result.status).toBe('TRAVERSED');
 if(result.status!=='TRAVERSED')throw new Error('Expected complete pure traversal');
 return result.lineage;
}
const member=(entryIndex:number,name:string,nameLexeme=JSON.stringify(name))=>({kind:'JSON_MEMBER',entryIndex,name,nameLexeme});
const index=(value:number)=>({kind:'JSON_INDEX',index:value});

describe('pure issued typed cell lineage',()=>{
 it.each(TYPED_MIGRATION_SOURCE_TYPES)('retains SQL NULL type %s',type=>{
  const lineage=traversed(type,null);
  expect(lineage.source).toMatchObject({type,kind:'SQL_NULL',wire:null});
  expect(lineage.nodes).toEqual([{address:[],value:{kind:'SQL_NULL'}}]);
 });
 it.each([
  ['text','  José é \t'],['char(64)',' padded  '],['char(32)','0'.repeat(32)],
  ['date','2026-10-09'],['time','02:03:04.123456'],
  ['timestamp','2026-10-09 02:03:04.123456'],['timestamptz','2026-10-09 02:03:04.123456+00'],
  ['smallint','-32768'],['integer','2147483647'],['bigint','9223372036854775807'],
  ['bigint','-9223372036854775808'],['numeric(5,2)','001.00'],
  ['boolean','t'],['boolean','f'],['uuid','11111111-1111-4111-8111-111111111111'],
 ] as const)('preserves scalar %s original text', (type,raw)=>{
  const input=decoded(type,raw),result=traverseTypedMigrationWireValue(input);
  expect(result.status).toBe('TRAVERSED');
  if(result.status!=='TRAVERSED')throw new Error('Expected scalar traversal');
  expect(result.lineage.source).toMatchObject({type,kind:'SCALAR',wire:input.wire});
  expect(result.lineage.nodes).toEqual([{address:[],value:{kind:'SQL_SCALAR',text:raw}}]);
  expect(result.lineage.source.wire).toBe(input.wire);
 });
 it.each(['9007199254740993','0.123456789012345678901','1.00','1e+03','-0','-1.000E-50'])('retains unsafe JSON numeric lexeme %s',lexeme=>{
  const input=decoded('jsonb',lexeme),result=traverseTypedMigrationWireValue(input);
  expect(result.status).toBe('TRAVERSED');
  if(result.status!=='TRAVERSED')throw new Error('Expected numeric traversal');
  expect(result.lineage.nodes).toEqual([{address:[],value:{kind:'JSON_NUMBER',lexeme}}]);
  expect(result.lineage.source.wire?.text).toBe(lexeme);
  expect(projectTypedMigrationWireValueToLegacy(input).status).toBe('BLOCKED');
 });
 it('distinguishes SQL NULL, JSON null, native NULL and literal null text',()=>{
  const inputs=[traversed('jsonb',null),traversed('jsonb','null'),traversed('text','null'),traversed('text[]','{NULL,"NULL","null"}')];
  expect(inputs[0].nodes[0].value).toEqual({kind:'SQL_NULL'});
  expect(inputs[1].nodes[0].value).toEqual({kind:'JSON_NULL'});
  expect(inputs[2].nodes[0].value).toEqual({kind:'SQL_SCALAR',text:'null'});
  expect(inputs[3].nodes.slice(1).map(n=>n.value)).toEqual([{kind:'SQL_ARRAY_NULL'},{kind:'SQL_ARRAY_TEXT',text:'NULL'},{kind:'SQL_ARRAY_TEXT',text:'null'}]);
  expect(new Set(inputs.map(v=>v.source.checksum)).size).toBe(4);
 });
 it.each([
  ['"José"','José'],['"\\u0041"','A'],['"\\ud83d\\ude00"','😀'],
  ['"line\\nnext"','line\nnext'],['"é"','é'],
 ] as const)('retains JSON string token %s',(lexeme,text)=>{
  expect(traversed('jsonb',lexeme).nodes).toEqual([{address:[],value:{kind:'JSON_STRING',text,lexeme}}]);
 });
 it('keeps lexical member order and occurrence indices without Object key reordering',()=>{
  const raw='{"2":null,"1":1.00,"\\u0061":{"a":[true,false,"x"]},"__proto__":[],"constructor":{}}';
  const lineage=traversed('jsonb',raw);
  expect(lineage.nodes).toEqual([
   {address:[],value:{kind:'JSON_OBJECT',memberCount:5}},
   {address:[member(0,'2')],value:{kind:'JSON_NULL'}},
   {address:[member(1,'1')],value:{kind:'JSON_NUMBER',lexeme:'1.00'}},
   {address:[member(2,'a','"\\u0061"')],value:{kind:'JSON_OBJECT',memberCount:1}},
   {address:[member(2,'a','"\\u0061"'),member(0,'a')],value:{kind:'JSON_ARRAY',length:3}},
   {address:[member(2,'a','"\\u0061"'),member(0,'a'),index(0)],value:{kind:'JSON_BOOLEAN',value:true}},
   {address:[member(2,'a','"\\u0061"'),member(0,'a'),index(1)],value:{kind:'JSON_BOOLEAN',value:false}},
   {address:[member(2,'a','"\\u0061"'),member(0,'a'),index(2)],value:{kind:'JSON_STRING',text:'x',lexeme:'"x"'}},
   {address:[member(3,'__proto__')],value:{kind:'JSON_ARRAY',length:0}},
   {address:[member(4,'constructor')],value:{kind:'JSON_OBJECT',memberCount:0}},
  ]);
  expect(new Set(lineage.nodes.map(n=>JSON.stringify(n.address))).size).toBe(lineage.nodes.length);
  expect(lineage.source.wire?.text).toBe(raw);
 });
 it('addresses same member names in different objects separately',()=>{
  const lineage=traversed('jsonb','[{"id":"same"},{"id":"same"}]');
  expect(lineage.nodes.filter(n=>n.value.kind==='JSON_STRING').map(n=>n.address)).toEqual([
   [index(0),member(0,'id')],[index(1),member(0,'id')],
  ]);
 });
 it.each(['{"x":1,"x":2}','{"a":1,"\\u0061":2}'])('retains approved duplicate-member rejection for %s',raw=>{
  const result=decodeTypedMigrationWireValue('jsonb',raw);
  expect(result).toEqual({status:'BLOCKED',code:'DUPLICATE_PROPERTY_NAME'});
  expect(traverseTypedMigrationWireValue(result)).toEqual({status:'BLOCKED',code:'UNISSUED_TYPED_WIRE_VALUE'});
 });
 it.each(['[]','{}','[[],{}]'])('includes all empty JSON containers %s',raw=>{
  const result=traversed('jsonb',raw);
  expect(result.nodes.length).toBe(raw==='[[],{}]'?3:1);
  expect(result.nodes.every(n=>n.value.kind==='JSON_ARRAY'||n.value.kind==='JSON_OBJECT')).toBe(true);
 });
 it('traverses deeply nested issued JSON iteratively',()=>{
  const depth=512,raw='['.repeat(depth)+'null'+']'.repeat(depth);
  const lineage=traversed('jsonb',raw);
  expect(lineage.nodes.length).toBe(depth+1);
  expect(lineage.nodes.at(-1)).toEqual({address:Array.from({length:depth},()=>index(0)),value:{kind:'JSON_NULL'}});
 });
 it.each([
  ['{}',[],[]],
  ['{{},{}}',[],[]],
  ['[0:1]={a,NULL}',[{lowerBound:0,length:2}],['a',null]],
  ['[-2:-1][3:4]={{"a,b",NULL},{"NULL",""}}',[{lowerBound:-2,length:2},{lowerBound:3,length:2}],['a,b',null,'NULL','']],
  ['{{{a,b},{c,d}},{{e,f},{g,h}}}',[{lowerBound:1,length:2},{lowerBound:1,length:2},{lowerBound:1,length:2}],['a','b','c','d','e','f','g','h']],
  ['{{{{{{x}}}}}}',Array.from({length:6},()=>({lowerBound:1,length:1})),['x']],
  ['[-2147483648:-2147483647]={a,b}',[{lowerBound:-2147483648,length:2}],['a','b']],
  ['[2147483645:2147483646]={a,b}',[{lowerBound:2147483645,length:2}],['a','b']],
 ] as const)('preserves native dimensions and row-major cells %s',(raw,dimensions,elements)=>{
  const lineage=traversed('text[]',raw);
  expect(lineage.nodes[0]).toEqual({address:[],value:{kind:'SQL_ARRAY',dimensions,elementCount:elements.length}});
  expect(lineage.nodes.slice(1).map(n=>n.value)).toEqual(elements.map(text=>text===null?{kind:'SQL_ARRAY_NULL'}:{kind:'SQL_ARRAY_TEXT',text}));
  expect(lineage.source).toMatchObject({type:'text[]',kind:'RAW_SQL_ARRAY'});
  expect(lineage.source.wire?.text).toBe(raw);
 });
 it('retains native lower bounds in exact occurrence subscripts',()=>{
  const nodes=traversed('text[]','[-2:-1][3:4]={{a,b},{c,d}}').nodes;
  expect(nodes.slice(1).map(n=>n.address)).toEqual([
   [{kind:'SQL_ARRAY_ELEMENT',ordinal:0,subscripts:[-2,3]}],
   [{kind:'SQL_ARRAY_ELEMENT',ordinal:1,subscripts:[-2,4]}],
   [{kind:'SQL_ARRAY_ELEMENT',ordinal:2,subscripts:[-1,3]}],
   [{kind:'SQL_ARRAY_ELEMENT',ordinal:3,subscripts:[-1,4]}],
  ]);
 });
 it.each(['not-array','{a,}','{{a},{b,c}}','[0:2]={a,b}','{{{{{{{a}}}}}}}'])('blocks issued but unparsed invalid native array %s',raw=>{
  const input=decoded('text[]',raw);
  expect(input.kind).toBe('RAW_SQL_ARRAY');
  const result=traverseTypedMigrationWireValue(input);
  expect(result.status).toBe('BLOCKED');
  if(result.status!=='BLOCKED')throw new Error('Expected native grammar block');
  expect(result.code).toBe(raw==='{{{{{{{a}}}}}}}'?'ARRAY_DIMENSION_LIMIT':'INVALID_ARRAY_WIRE');
 });
 it('binds the complete root wire and source type without claiming DB authority',()=>{
  const raw=' {"n":1.00,"s":"José"} \n',first=traversed('jsonb',raw),again=traversed('jsonb',raw);
  const bytes=Buffer.from(raw,'utf8');
  expect(first.source.wire).toEqual({encoding:'UTF8',text:raw,bytesBase64:bytes.toString('base64'),byteLength:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  expect(first.source.checksum).toMatch(/^[a-f0-9]{64}$/);
  expect(first.source.checksum).toBe(again.source.checksum);
  expect(traversed('jsonb','{"n":1.00,"s":"José"}').source.checksum).not.toBe(first.source.checksum);
  expect(traversed('text','1').source.checksum).not.toBe(traversed('integer','1').source.checksum);
  expect(first.verification).toBe('PURE_TYPED_CELL_LINEAGE_NOT_DATABASE_REFERENCE_OR_OWNERSHIP_VERIFICATION');
 });
 it('preserves literal IDs without deciding references or tenant ownership',()=>{
  const lineage=traversed('jsonb','{"employeeId":"same","workspaceId":"Fuel","kind":"REFERENCE","key":null}');
  expect(lineage.nodes.slice(1).map(n=>n.value)).toEqual([
   {kind:'JSON_STRING',text:'same',lexeme:'"same"'},{kind:'JSON_STRING',text:'Fuel',lexeme:'"Fuel"'},
   {kind:'JSON_STRING',text:'REFERENCE',lexeme:'"REFERENCE"'},{kind:'JSON_NULL'},
  ]);
  expect(JSON.stringify(lineage)).not.toContain('"workspaceId":"Fuel"');
  expect(Object.keys(lineage)).toEqual(['source','nodes','verification']);
 });
 it('rejects other parser envelopes and typed serialized/spread clones',()=>{
  const typed=decoded('jsonb','{"n":9007199254740993}'),json=parseLosslessJsonWire('{"n":9007199254740993}'),array=parseLosslessTextArrayWire('{a}');
  expect(json.status).toBe('PARSED');expect(array.status).toBe('PARSED');
  const foreign=[JSON.parse(JSON.stringify(typed)),{...typed},json.status==='PARSED'?json.envelope:json,array.status==='PARSED'?array.envelope:array,new Proxy(typed,{})];
  for(const input of foreign)expect(traverseTypedMigrationWireValue(input)).toEqual({status:'BLOCKED',code:'UNISSUED_TYPED_WIRE_VALUE'});
 });
 it('does not inspect hostile objects, accessors or revoked proxies',()=>{
  let invoked=0;
  const accessors=Object.defineProperty({},'kind',{get(){invoked++;throw new Error('private raw');}});
  const proxy=new Proxy({}, {get(){invoked++;throw new Error('private raw');},getPrototypeOf(){invoked++;throw new Error('private raw');},ownKeys(){invoked++;throw new Error('private raw');}});
  const revoked=Proxy.revocable({},{});revoked.revoke();
  for(const input of [null,undefined,true,3,BigInt(3),'wire',Symbol('x'),{},[],()=>{},accessors,proxy,revoked.proxy]){
   expect(traverseTypedMigrationWireValue(input)).toEqual({status:'BLOCKED',code:'UNISSUED_TYPED_WIRE_VALUE'});
   expect(isIssuedTypedMigrationCellLineage(input)).toBe(false);
  }
  expect(invoked).toBe(0);
 });
 it('issues deeply immutable data descriptors, never reissues serialized capabilities',()=>{
  const result=traverseTypedMigrationWireValue(decoded('jsonb','{"a":[1.00]}'));
  expect(result.status).toBe('TRAVERSED');
  if(result.status!=='TRAVERSED')throw new Error('Expected issued lineage');
  const lineage=result.lineage;
  expect(isIssuedTypedMigrationCellLineage(lineage)).toBe(true);
  const pending:unknown[]=[result,lineage];
  while(pending.length){
   const value=pending.pop();
   if(value&&typeof value==='object'){
    expect(Object.isFrozen(value)).toBe(true);
    pending.push(...Object.values(value));
   }
  }
  expect(JSON.parse(JSON.stringify(lineage))).toEqual(lineage);
  expect(isIssuedTypedMigrationCellLineage(JSON.parse(JSON.stringify(lineage)))).toBe(false);
  expect(isIssuedTypedMigrationCellLineage({...lineage})).toBe(false);
  expect(isIssuedTypedMigrationCellLineage(new Proxy(lineage,{}))).toBe(false);
  expect(()=>{(lineage.nodes as unknown[]).push({});}).toThrow();
  expect(traverseTypedMigrationWireValue(lineage)).toEqual({status:'BLOCKED',code:'UNISSUED_TYPED_WIRE_VALUE'});
 });
 it('freezes native dimensions and subscript vectors too',()=>{
  const lineage=traversed('text[]','[0:0][2:2]={{"x"}}');
  const root=lineage.nodes[0].value,segment=lineage.nodes[1].address[0];
  expect(root.kind).toBe('SQL_ARRAY');expect(segment.kind).toBe('SQL_ARRAY_ELEMENT');
  if(root.kind!=='SQL_ARRAY'||segment.kind!=='SQL_ARRAY_ELEMENT')throw new Error('Expected native descriptors');
  expect(Object.isFrozen(root.dimensions)).toBe(true);expect(Object.isFrozen(root.dimensions[0])).toBe(true);
  expect(Object.isFrozen(segment)).toBe(true);expect(Object.isFrozen(segment.subscripts)).toBe(true);
 });
});
