import { createHash } from 'node:crypto';
import { parseLosslessJsonWire,toExistingJsonValue,type LosslessJsonEnvelope,type LosslessJsonNode } from './lossless-json';
import type { JsonValue } from './ownership';

export const TYPED_MIGRATION_SOURCE_TYPES=Object.freeze(['text','date','time','smallint','timestamptz','integer','jsonb','boolean','uuid','text[]','char(64)','numeric(5,2)','bigint','timestamp','char(32)'] as const);
export type TypedMigrationSourceType=typeof TYPED_MIGRATION_SOURCE_TYPES[number];
export type MigrationUtf8Wire=Readonly<{encoding:'UTF8';text:string;bytesBase64:string;byteLength:number;sha256:string}>;
export type TypedMigrationWireValue=
 | Readonly<{kind:'SQL_NULL';sourceType:TypedMigrationSourceType;wire:null}>
 | Readonly<{kind:'SCALAR';sourceType:Exclude<TypedMigrationSourceType,'jsonb'|'text[]'>;wire:MigrationUtf8Wire}>
 | Readonly<{kind:'JSON';sourceType:'jsonb';wire:MigrationUtf8Wire;value:LosslessJsonNode}>
 | Readonly<{kind:'RAW_SQL_ARRAY';sourceType:'text[]';wire:MigrationUtf8Wire;semantics:'UNPARSED'}>;
export type TypedMigrationWireOutcome=Readonly<{status:'DECODED';value:TypedMigrationWireValue}>|Readonly<{status:'BLOCKED';code:string}>;
export type TypedMigrationLegacyOutcome=Readonly<{status:'CONVERTED';value:JsonValue;origin:'SQL_NULL'|'JSON'|'SCALAR'}>|Readonly<{status:'BLOCKED';code:string}>;

// Local parser provenance only. A serialized descriptor, clone or proxy cannot
// become issued. Issuance NEVER authenticates a database, operator or tenant.
const issued=new WeakMap<object,LosslessJsonEnvelope|null>();
/** Trap-free local cell-parser provenance for lossless traversal. Does not
 * certify array syntax, database observations, references, operator authority
 * or tenant/runtime capabilities. Clones and proxies cannot become issued.
 */
export function isIssuedTypedMigrationWireValue(input:unknown):input is TypedMigrationWireValue{
 return typeof input==='object'&&input!==null&&issued.has(input);
}
const blocked=(code:string)=>Object.freeze({status:'BLOCKED' as const,code});
function issue(value:TypedMigrationWireValue,json:LosslessJsonEnvelope|null=null):TypedMigrationWireOutcome{
 const frozen=Object.freeze(value);
 issued.set(frozen,json);
 return Object.freeze({status:'DECODED' as const,value:frozen});
}
function utf8Problem(text:string):string|null{
 for(let index=0;index<text.length;index++){
  const code=text.charCodeAt(index);
  if(code===0)return 'SQL_NUL_UNSUPPORTED';
  if(code>=0xd800&&code<=0xdbff){
   const next=text.charCodeAt(++index);
   if(!(next>=0xdc00&&next<=0xdfff))return 'INVALID_UNICODE';
  }else if(code>=0xdc00&&code<=0xdfff)return 'INVALID_UNICODE';
 }
 return null;
}
function utf8Wire(text:string):MigrationUtf8Wire{
 const bytes=Buffer.from(text,'utf8');
 return Object.freeze({encoding:'UTF8' as const,text,bytesBase64:bytes.toString('base64'),byteLength:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
function signedDecimalWithin(text:string,positive:string,negative:string,rejectNegativeZero=false):boolean{
 if(!/^-?(0|[1-9][0-9]*)$/.test(text)||(rejectNegativeZero&&text==='-0'))return false;
 const sign=text[0]==='-',digits=sign?text.slice(1):text,limit=sign?negative:positive;
 return digits.length<limit.length||(digits.length===limit.length&&digits<=limit);
}
/** Closed primitive text-protocol input only, never a default pg JSON/Date
 * value or an object to coerce. Exact source-type names match the frozen
 * registry; catalog aliases must be resolved by the capture owner, not guessed.
 *
 * UTF16 must re-encode to exact UTF8 without replacement. Raw wire text and its
 * bytes/digest remain separate from the JSON AST. The frozen lossless parser
 * retains JSON number spelling, property names and JSON null. Nothing here
 * establishes pre-jsonb lexical input, a DB observation, OID, source/catalog
 * binding, row nullability, lineage, ownership or operator authority.
 *
 * Scalar integer/bigint/boolean/numeric checks preserve the existing decoder's
 * contract. Numeric typmod, UUID and temporal semantics are not newly inferred;
 * temporal/text values stay exact strings (including microseconds/padding).
 * Native text[] is explicitly UNPARSED: its dimensions/bounds/element spelling
 * remain only in raw text. No SQL-array syntax or reference proof is issued.
 */
export function decodeTypedMigrationWireValue(type:unknown,raw:unknown):TypedMigrationWireOutcome{
 try{
  if(typeof type!=='string'||!TYPED_MIGRATION_SOURCE_TYPES.some(value=>value===type))return blocked('UNSUPPORTED_SOURCE_TYPE');
  const sourceType=type as TypedMigrationSourceType;
  if(raw===null)return issue({kind:'SQL_NULL',sourceType,wire:null});
  if(typeof raw!=='string')return blocked('INVALID_WIRE_TYPE');
  const problem=utf8Problem(raw);
  if(problem)return blocked(problem);
  if(sourceType==='jsonb'){
   const parsed=parseLosslessJsonWire(raw);
   if(parsed.status==='BLOCKED')return blocked(parsed.code);
   if(parsed.envelope.kind!=='JSON')return blocked('UNEXPECTED_JSON_ENVELOPE');
   return issue({kind:'JSON',sourceType,wire:parsed.envelope.wire,value:parsed.envelope.value},parsed.envelope);
  }
  if(sourceType==='text[]')return issue({kind:'RAW_SQL_ARRAY',sourceType,wire:utf8Wire(raw),semantics:'UNPARSED'});
  if(sourceType==='smallint'&&!signedDecimalWithin(raw,'32767','32768'))return blocked('INVALID_INTEGER_WIRE');
  if(sourceType==='integer'&&!signedDecimalWithin(raw,'2147483647','2147483648'))return blocked('INVALID_INTEGER_WIRE');
  if(sourceType==='bigint'&&!signedDecimalWithin(raw,'9223372036854775807','9223372036854775808',true))return blocked('INVALID_BIGINT_WIRE');
  if(sourceType==='numeric(5,2)'&&!/^-?[0-9]+\.[0-9]{2}$/.test(raw))return blocked('UNSUPPORTED_NUMERIC_WIRE');
  if(sourceType==='boolean'&&raw!=='t'&&raw!=='f')return blocked('INVALID_BOOLEAN_WIRE');
  return issue({kind:'SCALAR',sourceType,wire:utf8Wire(raw)});
 }catch{return blocked('TYPED_WIRE_DECODE_FAILED');}
}
/** Explicit bridge to the frozen legacy JsonValue representation. Identity
 * prevents callers from bypassing this module's input checks with a shape or
 * serialized DTO. It is parser provenance only, never a runtime capability.
 * JSON projection delegates to the genuine original parser-issued envelope;
 * unsafe numbers/scale/exponent and top-level JSON null remain blocked. Native
 * SQL arrays cannot silently become JSON arrays, even when empty or 1D-looking.
 */
export function projectTypedMigrationWireValueToLegacy(value:unknown):TypedMigrationLegacyOutcome{
 try{
  if(typeof value!=='object'||value===null||!issued.has(value))return blocked('UNISSUED_TYPED_WIRE_VALUE');
  const input=value as TypedMigrationWireValue;
  if(input.kind==='SQL_NULL')return Object.freeze({status:'CONVERTED' as const,origin:'SQL_NULL' as const,value:null});
  if(input.kind==='RAW_SQL_ARRAY')return blocked('RAW_SQL_ARRAY_PROJECTION_UNSUPPORTED');
  if(input.kind==='JSON'){
   const result=toExistingJsonValue(issued.get(input));
   return Object.freeze(result);
  }
  const text=input.wire.text;
  const projected=input.sourceType==='smallint'||input.sourceType==='integer'?Number(text):input.sourceType==='boolean'?text==='t':text;
  return Object.freeze({status:'CONVERTED' as const,origin:'SCALAR' as const,value:projected});
 }catch{return blocked('TYPED_WIRE_PROJECTION_FAILED');}
}
