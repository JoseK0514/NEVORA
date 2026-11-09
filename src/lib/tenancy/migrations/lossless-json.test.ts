import { createHash } from 'node:crypto';
import { describe,expect,it } from 'vitest';
import { canonicalOwnershipJson } from './ownership';
import { parseLosslessJsonWire,lookupLosslessJsonPath,walkLosslessJsonLeaves,toExistingJsonValue,type LosslessJsonEnvelope,type LosslessJsonNode } from './lossless-json';
function parsed(wire:unknown):LosslessJsonEnvelope{
 const result=parseLosslessJsonWire(wire);
 expect(result.status).toBe('PARSED');
 if(result.status!=='PARSED')throw new Error('Expected a parsed fictional wire');
 return result.envelope;
}
function value(wire:string):LosslessJsonNode{
 const envelope=parsed(wire);
 if(envelope.kind!=='JSON')throw new Error('Expected JSON');
 return envelope.value;
}
const property=(name:string)=>({kind:'PROPERTY' as const,name});
const index=(i:number)=>({kind:'INDEX' as const,index:i});
describe('lossless PostgreSQL UTF8 JSON wire parser',()=>{
 it('distinguishes SQL NULL, JSON null and literal discriminant-shaped objects',()=>{
  expect(parsed(null)).toEqual({kind:'SQL_NULL',wire:null});
  expect(value('null')).toEqual({kind:'JSON_NULL'});
  expect(value('{"kind":"SQL_NULL","wire":null}').kind).toBe('OBJECT');
  expect(value('{"kind":"NUMBER","lexeme":"9.00"}').kind).toBe('OBJECT');
 });
 it.each(['9007199254740993','-9223372036854775808','0.123456789012345678901234567890','1.00','-0','1e400','1.230E-5','0e+0003'])('retains exact numeric lexeme %s without numeric conversion',wire=>{
  expect(value(wire)).toEqual({kind:'NUMBER',lexeme:wire});
  expect(toExistingJsonValue(parsed(wire)).status).toBe('BLOCKED');
 });
 it('retains exact observed bytes independently of parsed strings/numeric tokens',()=>{
  const wire=' \r\n{"Ω":"\\u03A9","money":1.00}\t';
  const envelope=parsed(wire);
  if(envelope.kind!=='JSON')throw new Error('Expected JSON');
  expect(envelope.wire).toEqual({encoding:'UTF8',text:wire,bytesBase64:Buffer.from(wire,'utf8').toString('base64'),byteLength:Buffer.byteLength(wire,'utf8'),sha256:createHash('sha256').update(wire,'utf8').digest('hex')});
  expect(lookupLosslessJsonPath(envelope,[property('Ω')])).toEqual({status:'FOUND',value:{kind:'STRING',value:'Ω',lexeme:'"\\u03A9"'}});
 });
 it('decodes all valid string escapes and paired/literal Unicode without name normalization',()=>{
  expect(value(String.raw`"\"\\\/\b\f\n\r\t\uD834\uDD1E"`)).toEqual({kind:'STRING',value:'"\\/\b\f\n\r\t𝄞',lexeme:String.raw`"\"\\\/\b\f\n\r\t\uD834\uDD1E"`});
  const envelope=parsed('{"é":1,"e\\u0301":2,"𝄞":"😀","0":false,"":null}');
  expect(lookupLosslessJsonPath(envelope,[property('é')])).toEqual({status:'FOUND',value:{kind:'NUMBER',lexeme:'1'}});
  expect(lookupLosslessJsonPath(envelope,[property('é')])).toEqual({status:'FOUND',value:{kind:'NUMBER',lexeme:'2'}});
  expect(lookupLosslessJsonPath(envelope,[property('0')])).toEqual({status:'FOUND',value:{kind:'BOOLEAN',value:false}});
  expect(lookupLosslessJsonPath(envelope,[property('')])).toEqual({status:'FOUND',value:{kind:'JSON_NULL'}});
 });
 it('keeps exact object names and avoids prototype keys becoming parser control fields',()=>{
  const envelope=parsed('{"__proto__":{"polluted":true},"constructor":{"prototype":false},"kind":"NUMBER","lexeme":"1.00"}');
  expect(lookupLosslessJsonPath(envelope,[property('__proto__'),property('polluted')])).toEqual({status:'FOUND',value:{kind:'BOOLEAN',value:true}});
  expect(({} as {polluted?:boolean}).polluted).toBeUndefined();
  const converted=toExistingJsonValue(envelope);
  expect(converted.status).toBe('CONVERTED');
  if(converted.status==='CONVERTED'){
   expect(Object.getPrototypeOf(converted.value)).toBe(Object.prototype);
   expect(Object.prototype.hasOwnProperty.call(converted.value,'__proto__')).toBe(true);
   expect(canonicalOwnershipJson(converted.value)).toBe('{"__proto__":{"polluted":true},"constructor":{"prototype":false},"kind":"NUMBER","lexeme":"1.00"}');
  }
 });
 it('uses typed paths so property names never coerce to array indexes',()=>{
  const envelope=parsed('{"list":[{"0":"exact"},null],"0":[true]}');
  expect(lookupLosslessJsonPath(envelope,[property('list'),index(0),property('0')])).toMatchObject({status:'FOUND',value:{kind:'STRING',value:'exact'}});
  expect(lookupLosslessJsonPath(envelope,[property('list'),property('0')])).toEqual({status:'MISSING'});
  expect(lookupLosslessJsonPath(envelope,[index(0)])).toEqual({status:'MISSING'});
  expect(lookupLosslessJsonPath(envelope,[property('absent')])).toEqual({status:'MISSING'});
  expect(lookupLosslessJsonPath(envelope,[])).toMatchObject({status:'FOUND',value:{kind:'OBJECT'}});
 });
 it('walks complete primitive and empty-container leaves with stable typed paths',()=>{
  const envelope=parsed('{"a":[null,{"x":1.00},[]],"b":{},"flag":true,"s":"1.00"}');
  const leaves=walkLosslessJsonLeaves(envelope);
  expect(leaves).toEqual({status:'LEAVES',leaves:[
   {path:[property('a'),index(0)],value:{kind:'JSON_NULL'}},
   {path:[property('a'),index(1),property('x')],value:{kind:'NUMBER',lexeme:'1.00'}},
   {path:[property('a'),index(2)],value:{kind:'ARRAY',items:[]}},
   {path:[property('b')],value:{kind:'OBJECT',entries:[]}},
   {path:[property('flag')],value:{kind:'BOOLEAN',value:true}},
   {path:[property('s')],value:{kind:'STRING',value:'1.00',lexeme:'"1.00"'}},
  ]});
  expect(walkLosslessJsonLeaves(envelope)).toEqual(leaves);
 });
 it('converts only exact existing-format numeric serialization and keeps nested JSON null',()=>{
  expect(toExistingJsonValue(parsed('{"x":[0,0.5,0.1,9007199254740991,null],"y":false}'))).toEqual({status:'CONVERTED',origin:'JSON',value:{x:[0,0.5,0.1,9007199254740991,null],y:false}});
  expect(toExistingJsonValue(parsed(null))).toEqual({status:'CONVERTED',origin:'SQL_NULL',value:null});
  expect(toExistingJsonValue(parsed('null'))).toEqual({status:'BLOCKED',code:'SQL_JSON_NULL_AMBIGUITY'});
  expect(toExistingJsonValue(parsed('{"x":[1,1.00]}'))).toEqual({status:'BLOCKED',code:'NUMBER_NOT_EXACT_IN_EXISTING_JSON'});
 });
 it.each(['{"a":1,"a":2}','{"a":1,"\\u0061":2}','{"𝄞":1,"\\uD834\\uDD1E":2}'])('rejects duplicate decoded keys: %s',wire=>{
  expect(parseLosslessJsonWire(wire)).toEqual({status:'BLOCKED',code:'DUPLICATE_PROPERTY_NAME'});
 });
 it.each(['',' ', 'undefined','NaN','Infinity','-Infinity','TRUE','Null','+1','.1','1.','01','-01','1e','1e+','[1,]','[,1]','{"a":}','{"a" 1}','{a:1}','{"a":1,}','true false','{} trailing','/*c*/1','//c\n1','1\u00a0','\uFEFF{}','"\\x41"','"\\u12"','"\\uZZZZ"','"unterminated','"line\nbreak"'])('rejects non-JSON/trailing syntax: %s',wire=>{
  expect(parseLosslessJsonWire(wire).status).toBe('BLOCKED');
 });
 it.each([String.raw`"\u0000"`,String.raw`"\uD800"`,String.raw`"\uDC00"`,String.raw`"\uD800\u0041"`,String.raw`"\uD800\n\uDC00"`,'"'+String.fromCharCode(0xd800)+'"','"'+String.fromCharCode(0xdc00)+'"'])('rejects unsupported jsonb Unicode: %s',wire=>{
  expect(parseLosslessJsonWire(wire).status).toBe('BLOCKED');
 });
 it('rejects unknown objects, accessors and proxies without invoking application code',()=>{
  let invoked=false;
  const accessor=Object.defineProperty({},'toString',{get(){invoked=true;throw new Error('private');}});
  const proxy=new Proxy({}, {get(){invoked=true;throw new Error('private');},getPrototypeOf(){invoked=true;throw new Error('private');}});
  for(const input of [accessor,proxy,[],new String('{}'),new Date(),Buffer.from('{}'),undefined,1,()=>{}])expect(parseLosslessJsonWire(input)).toEqual({status:'BLOCKED',code:'INVALID_WIRE_TYPE'});
  expect(invoked).toBe(false);
 });
 it('returns immutable AST and wire with parser provenance that clones and literal data cannot impersonate',()=>{
  const envelope=parsed('{"x":[1]}');
  expect(Object.isFrozen(envelope)).toBe(true);
  if(envelope.kind!=='JSON')throw new Error('Expected JSON');
  expect(Object.isFrozen(envelope.wire)).toBe(true);expect(Object.isFrozen(envelope.value)).toBe(true);
  const node=envelope.value;
  if(node.kind!=='OBJECT')throw new Error('Expected object');
  expect(Object.isFrozen(node.entries)).toBe(true);expect(Object.isFrozen(node.entries[0])).toBe(true);expect(Object.isFrozen(node.entries[0].value)).toBe(true);
  for(const clone of [{...envelope},JSON.parse(JSON.stringify(envelope)),new Proxy(envelope,{})]){
   expect(toExistingJsonValue(clone)).toEqual({status:'BLOCKED',code:'UNISSUED_JSON_ENVELOPE'});
   expect(walkLosslessJsonLeaves(clone)).toEqual({status:'BLOCKED',code:'UNISSUED_JSON_ENVELOPE'});
   expect(lookupLosslessJsonPath(clone,[])).toEqual({status:'BLOCKED',code:'UNISSUED_JSON_ENVELOPE'});
  }
 });
 it('rejects malformed/accessor/sparse path data without executing accessors',()=>{
  const envelope=parsed('{"x":[1]}');
  let invoked=false;
  const getter=Object.defineProperty({kind:'PROPERTY'},'name',{enumerable:true,get(){invoked=true;throw new Error('private');}});
  const sparse=new Array(1);
  const proxy=new Proxy([property('x')],{get(){invoked=true;throw new Error('private');}});
  for(const path of [[getter],sparse,proxy,[{kind:'INDEX',index:-1}],[{kind:'INDEX',index:0.5}],[{kind:'PROPERTY',name:'x',ignored:true}],['x'],{}])expect(lookupLosslessJsonPath(envelope,path)).toEqual({status:'BLOCKED',code:'INVALID_JSON_PATH'});
  expect(invoked).toBe(false);
 });
 it('parses/walks/converts deep documents iteratively without selecting a depth cap',()=>{
  const depth=12000,envelope=parsed('['.repeat(depth)+'true'+']'.repeat(depth));
  const leaves=walkLosslessJsonLeaves(envelope);
  expect(leaves.status).toBe('LEAVES');
  if(leaves.status==='LEAVES'){expect(leaves.leaves).toHaveLength(1);expect(leaves.leaves[0].path).toHaveLength(depth);expect(leaves.leaves[0].value).toEqual({kind:'BOOLEAN',value:true});}
  expect(lookupLosslessJsonPath(envelope,Array.from({length:depth},()=>index(0)))).toEqual({status:'FOUND',value:{kind:'BOOLEAN',value:true}});
  expect(toExistingJsonValue(envelope).status).toBe('CONVERTED');
 });
});
