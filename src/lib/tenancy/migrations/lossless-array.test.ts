import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
 isIssuedLosslessTextArrayEnvelope,
 parseLosslessTextArrayWire,
 type LosslessTextArrayEnvelope,
} from './lossless-array';
import { decodeTypedMigrationWireValue, projectTypedMigrationWireValueToLegacy } from './typed-wire';

function parsed(raw: string): LosslessTextArrayEnvelope {
 const result = parseLosslessTextArrayWire(raw);
 expect(result.status).toBe('PARSED');
 if (result.status !== 'PARSED') throw new Error('Expected parsed fixture');
 return result.envelope;
}
const dims = (...lengths: number[]) => lengths.map(length => ({ lowerBound: 1, length }));

describe('lossless native PostgreSQL text[] wire', () => {
 it.each([
  ['{a,b}', ['a','b']],
  ['{1,-2,1.00,true,false}', ['1','-2','1.00','true','false']],
  ['{NULL,null,NuLl,"NULL","null",""}', [null,null,null,'NULL','null','']],
  ['{\\NULL,N\\ULL,"N\\ULL"}', ['NULL','NULL','NULL']],
  ['{"a,b","{x}","a\\"b","a\\\\b"}', ['a,b','{x}','a"b','a\\b']],
  ['{a\\,b,a\\{b,a\\}b,a\\"b,a\\\\b}', ['a,b','a{b','a}b','a"b','a\\b']],
  ['{"\\n","\\t","\\u0041"}', ['n','t','u0041']],
  ['{ José,東京,😀,é }', ['José','東京','😀','é']],
  ['{\\😀,"\\😀"}', ['😀','😀']],
  ['{"line\nbreak","line\r\nbreak"}', ['line\nbreak','line\r\nbreak']],
  [' \t\n\r\v\f{ \t a \t, b c \n } \r\n', ['a','b c']],
  ['{\u00a0a\u00a0,\u2003}', ['\u00a0a\u00a0','\u2003']],
  ['{\\ a\\ ,a\\  ,\\ }', [' a ','a ',' ']],
  ['{"  ","\t","\v"}', ['  ','\t','\v']],
  ['{nullish,NULLx}', ['nullish','NULLx']],
 ] as const)('preserves scalar text/null for %s', (raw, elements) => {
  const result = parsed(raw);
  expect(result.elements).toEqual(elements);
  expect(result.dimensions).toEqual(dims(elements.length));
 });
 it.each(['{}','{ }','{{}}','{{},{}}','{{{}}}',' \n{} \t'])('empty %s has zero dimensions', raw => {
  const result = parsed(raw);
  expect(result.elements).toEqual([]);
  expect(result.dimensions).toEqual([]);
  expect(result.wire.text).toBe(raw);
 });
 it.each([
  ['{{""}}', dims(1,1), ['']],
  ['{{NULL}}', dims(1,1), [null]],
  ['{{a,b},{c,d}}', dims(2,2), ['a','b','c','d']],
  ['{{{a}},{{b}}}', dims(2,1,1), ['a','b']],
  ['{{{a,b},{c,d}},{{e,f},{g,h}}}', dims(2,2,2), ['a','b','c','d','e','f','g','h']],
  ['{{{{{{x}}}}}}', dims(1,1,1,1,1,1), ['x']],
 ] as const)('retains rectangular row-major shape %s', (raw, dimensions, elements) => {
  const result = parsed(raw);
  expect(result.dimensions).toEqual(dimensions);
  expect(result.elements).toEqual(elements);
 });
 it.each([
  ['[0:1]={a,b}', [{lowerBound:0,length:2}]],
  ['[-2:-1]={a,b}', [{lowerBound:-2,length:2}]],
  ['[-2147483648:-2147483647]={a,b}', [{lowerBound:-2147483648,length:2}]],
  ['[2147483645:2147483646]={a,b}', [{lowerBound:2147483645,length:2}]],
  ['[2147483646:2147483646]={x}', [{lowerBound:2147483646,length:1}]],
  ['[-0002:-0001]={a,b}', [{lowerBound:-2,length:2}]],
  ['[+0:+1]={a,b}', [{lowerBound:0,length:2}]],
  ['[2]={a,b}', [{lowerBound:1,length:2}]],
  ['[+02]={a,b}', [{lowerBound:1,length:2}]],
  ['[-0:1]={a,b}', [{lowerBound:0,length:2}]],
  [' [-1:0] \n [3:4] \t = {{a,b},{c,d}} ', [{lowerBound:-1,length:2},{lowerBound:3,length:2}]],
 ] as const)('preserves native bounds %s', (raw, dimensions) => {
  expect(parsed(raw).dimensions).toEqual(dimensions);
 });
 it('keeps wire spelling separate from interpreted shape and text', () => {
  const raw = ' [+00:+01]={"José",N\\ULL} ';
  const result = parsed(raw);
  const bytes = Buffer.from(raw,'utf8');
  expect(result.kind).toBe('TEXT_ARRAY');
  expect(result.verification).toBe('PURE_ARRAY_PARSE_NOT_DATABASE_VERIFICATION');
  expect(result.wire).toEqual({
   encoding:'UTF8', text:raw, bytesBase64:bytes.toString('base64'),
   byteLength:bytes.length, sha256:createHash('sha256').update(bytes).digest('hex'),
  });
  expect(result.elements).toEqual(['José','NULL']);
  expect(result.dimensions).toEqual([{lowerBound:0,length:2}]);
  expect(parsed('{José,NULL}').wire.sha256).not.toBe(result.wire.sha256);
 });
 it.each([
  '', 'NULL', 'a', '{', '}', '{}{}', '{}x', '{,}', '{,a}', '{a,}', '{a,,b}',
  '{"a}', '{"a"b}', '{"a""b"}', '{"a" "b"}', '{a"b}', '{a{b}', '{a}{b}',
  '{a\\', '{"a\\', '{a', '{{a},{b,c}}', '{{a},b}', '{a,{b}}',
  '{{},{a}}', '{{},{{}}}', '{{{a}},{b}}', '{{a},{}}',
  '[1:1]={}', '[1:2]={a}', '[1:1][1:1]={a}', '[1:1]{{a}}', '[1:1]=x',
  '[]={a}', '[1:]= {a}', '[:1]={a}', '[ 1:1]={a}', '[1: 1]={a}',
  '[1 :1]={a}', '[1:1 ]={a}', '[1.0:1]={a}', '[1e0:1]={a}', '[--1:1]={a}',
  '[1:1]=={a}', '{}\u00a0',
 ] as const)('blocks malformed or mismatched native grammar %s', raw => {
  expect(parseLosslessTextArrayWire(raw)).toEqual({status:'BLOCKED',code:'INVALID_ARRAY_WIRE'});
 });
 it.each([
  '[2147483646:2147483647]={a,b}', '[2147483647:2147483647]={a}',
  '[2147483648:2147483648]={a}', '[-2147483649:-2147483649]={a}',
  '[-2147483648:-1]={a}', '[-2147483648:2147483646]={a}',
  '[999999999999999999999999:999999999999999999999999]={a}',
 ] as const)('blocks PostgreSQL signed32 bound/length overflow %s', raw => {
  expect(parseLosslessTextArrayWire(raw)).toEqual({status:'BLOCKED',code:'ARRAY_BOUND_LIMIT'});
 });
 it.each(['[1:0]={}','[5:4]={}','[0]={}'])('rejects nonpositive dimension %s', raw => {
  expect(parseLosslessTextArrayWire(raw)).toEqual({status:'BLOCKED',code:'INVALID_ARRAY_BOUNDS'});
 });
 it.each(['{{{{{{{a}}}}}}}','[1][1][1][1][1][1][1]={a}','{{{{{{{}}}}}}}'])('blocks source-derived seventh dimension %s', raw => {
  expect(parseLosslessTextArrayWire(raw)).toEqual({status:'BLOCKED',code:'ARRAY_DIMENSION_LIMIT'});
 });
 it.each(['{\u0000}','{"\u0000"}','{\ud800}','{\udc00}','{\ud800x}','{\udc00\ud800}'])('rejects unrepresentable PostgreSQL UTF8 text', raw => {
  expect(parseLosslessTextArrayWire(raw)).toEqual({status:'BLOCKED',code:raw.includes('\u0000')?'SQL_NUL_UNSUPPORTED':'INVALID_UNICODE'});
 });
 it('does not coerce or inspect nonprimitive input', () => {
  let invoked = 0;
  const accessor = Object.defineProperty({},'toString',{get(){invoked++;throw new Error('must not execute');}});
  const proxy = new Proxy({}, {get(){invoked++;throw new Error('must not execute');}, ownKeys(){invoked++;throw new Error('must not execute');}});
  const revoked = Proxy.revocable({},{}); revoked.revoke();
  for (const input of [null,undefined,1,BigInt(1),true,Symbol('x'),{},[],new String('{}'),accessor,proxy,revoked.proxy]) {
   expect(parseLosslessTextArrayWire(input)).toEqual({status:'BLOCKED',code:'INVALID_WIRE_TYPE'});
   expect(isIssuedLosslessTextArrayEnvelope(input)).toBe(false);
  }
  expect(invoked).toBe(0);
 });
 it('issues a deeply immutable data-only descriptor without authenticating clones', () => {
  const result = parseLosslessTextArrayWire('[0:1]={"a",NULL}');
  expect(result.status).toBe('PARSED');
  if(result.status !== 'PARSED') throw new Error('Expected parser fixture');
  const envelope = result.envelope;
  expect(isIssuedLosslessTextArrayEnvelope(envelope)).toBe(true);
  for(const part of [result,envelope,envelope.wire,envelope.dimensions,envelope.dimensions[0],envelope.elements]) expect(Object.isFrozen(part)).toBe(true);
  expect(JSON.parse(JSON.stringify(envelope))).toEqual(envelope);
  expect(isIssuedLosslessTextArrayEnvelope(JSON.parse(JSON.stringify(envelope)))).toBe(false);
  expect(isIssuedLosslessTextArrayEnvelope({...envelope})).toBe(false);
  expect(isIssuedLosslessTextArrayEnvelope(new Proxy(envelope,{}))).toBe(false);
  expect(()=>{(envelope.elements as (string|null)[]).push('x');}).toThrow();
  expect(()=>{(envelope.dimensions[0] as {lowerBound:number;length:number}).lowerBound=1;}).toThrow();
 });
 it('does not grant legacy array or database authority to typed descriptors', () => {
  const raw = '[0:0]={"x"}';
  const typed = decodeTypedMigrationWireValue('text[]',raw);
  expect(typed.status).toBe('DECODED');
  if(typed.status !== 'DECODED') throw new Error('Expected typed fixture');
  expect(typed.value.kind).toBe('RAW_SQL_ARRAY');
  expect(projectTypedMigrationWireValueToLegacy(typed.value)).toEqual({status:'BLOCKED',code:'RAW_SQL_ARRAY_PROJECTION_UNSUPPORTED'});
  const array = parsed(raw);
  expect(projectTypedMigrationWireValueToLegacy(array)).toEqual({status:'BLOCKED',code:'UNISSUED_TYPED_WIRE_VALUE'});
  expect(isIssuedLosslessTextArrayEnvelope(typed.value)).toBe(false);
  expect(parseLosslessTextArrayWire(null)).toEqual({status:'BLOCKED',code:'INVALID_WIRE_TYPE'});
 });
});
