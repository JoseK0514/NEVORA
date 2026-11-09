import { createHash } from 'node:crypto';
import { types as utilTypes } from 'node:util';
import type { JsonValue } from './ownership';

export type LosslessJsonNode =
 | Readonly<{kind:'JSON_NULL'}>
 | Readonly<{kind:'BOOLEAN';value:boolean}>
 | Readonly<{kind:'NUMBER';lexeme:string}>
 | Readonly<{kind:'STRING';value:string;lexeme:string}>
 | Readonly<{kind:'ARRAY';items:readonly LosslessJsonNode[]}>
 | Readonly<{kind:'OBJECT';entries:readonly Readonly<{name:string;nameLexeme:string;value:LosslessJsonNode}>[]}>;
export type LosslessJsonEnvelope = Readonly<{kind:'SQL_NULL';wire:null}> | Readonly<{kind:'JSON';wire:Readonly<{encoding:'UTF8';text:string;bytesBase64:string;byteLength:number;sha256:string}>;value:LosslessJsonNode}>;
export type LosslessJsonPathSegment = Readonly<{kind:'PROPERTY';name:string}> | Readonly<{kind:'INDEX';index:number}>;
export type LosslessJsonLeaf = Readonly<{path:readonly LosslessJsonPathSegment[];value:LosslessJsonNode}>;
export type LosslessParseOutcome = {status:'PARSED';envelope:LosslessJsonEnvelope} | {status:'BLOCKED';code:string};
export type LosslessLookupOutcome = {status:'FOUND';value:LosslessJsonNode} | {status:'MISSING'} | {status:'BLOCKED';code:string};
export type LosslessLeafOutcome = {status:'LEAVES';leaves:readonly LosslessJsonLeaf[]} | {status:'BLOCKED';code:string};
export type ExistingJsonOutcome = {status:'CONVERTED';value:JsonValue;origin:'SQL_NULL'|'JSON'} | {status:'BLOCKED';code:string};

type Entry={name:string;nameLexeme:string;value:LosslessJsonNode};
type Frame={kind:'ARRAY';items:LosslessJsonNode[];stage:'FIRST'|'VALUE'|'AFTER'}
 | {kind:'OBJECT';entries:Entry[];names:Set<string>;stage:'FIRST'|'KEY'|'VALUE'|'AFTER';pending?:{name:string;nameLexeme:string}};
class ParseFailure extends Error {constructor(readonly code:string){super(code);}}
const reject=(code:string):never=>{throw new ParseFailure(code);};
const issued=new WeakSet<object>();
const digit=(c:string|undefined)=>c!==undefined&&c>='0'&&c<='9';
const high=(c:number)=>c>=0xd800&&c<=0xdbff;
const low=(c:number)=>c>=0xdc00&&c<=0xdfff;

/** Only primitive pg text-protocol strings (UTF8) or SQL NULL are input. Unknown
 * objects are not coerced, so accessors/proxies cannot run. A valid UTF16 string
 * re-encodes to its exact UTF8 bytes; unpaired surrogates are never replaced.
 *
 * This preserves OBSERVED wire, not pre-jsonb lexical input or DB provenance.
 * JSONB output has already removed duplicate keys/whitespace and renders
 * numeric exponents as decimal. Supplied JSON numeric spelling is retained
 * verbatim; numeric/database range validation is not claimed by this pure seam.
 * Duplicate decoded keys are ambiguous wire evidence and fail closed rather
 * than applying jsonb input's last-key-wins rule. Unicode/NUL checks follow
 * UTF8 jsonb, not the less strict json type. No depth/size policy is selected.
 * Sources: RFC8259 §§4–8; postgresql.org/docs/18/datatype-json.html §8.14.
 */
export function parseLosslessJsonWire(input:unknown):LosslessParseOutcome {
 try{
  if(input===null){const envelope=Object.freeze({kind:'SQL_NULL' as const,wire:null});issued.add(envelope);return {status:'PARSED',envelope};}
  if(typeof input!=='string')return {status:'BLOCKED',code:'INVALID_WIRE_TYPE'};
  const text=input;
  for(let n=0;n<text.length;n++){
   const code=text.charCodeAt(n);
   if(high(code)){if(!low(text.charCodeAt(n+1)))reject('INVALID_UNICODE');n++;}
   else if(low(code))reject('INVALID_UNICODE');
  }
  let offset=0,root:LosslessJsonNode|undefined;
  const frames:Frame[]=[];
  const whitespace=()=>{while(offset<text.length&&[' ','\t','\n','\r'].includes(text[offset]))offset++;};
  function stringToken():{value:string;lexeme:string}{
   const start=offset++;
   let value='';
   while(offset<text.length){
    const character=text[offset++];
    if(character==='"')return {value,lexeme:text.slice(start,offset)};
    if(character==='\\'){
     const escape=text[offset++];
     const escapes:Record<string,string>={'"':'"','\\':'\\','/':'/',b:'\b',f:'\f',n:'\n',r:'\r',t:'\t'};
     if(Object.prototype.hasOwnProperty.call(escapes,escape)){value+=escapes[escape];continue;}
     if(escape!=='u')reject('INVALID_STRING_ESCAPE');
     const hex=text.slice(offset,offset+4);
     if(!/^[0-9a-fA-F]{4}$/.test(hex))reject('INVALID_STRING_ESCAPE');
     const point=parseInt(hex,16);offset+=4;
     if(point===0)reject('JSONB_NUL_UNSUPPORTED');
     if(high(point)){
      if(text.slice(offset,offset+2)!=='\\u')reject('INVALID_UNICODE');
      const next=text.slice(offset+2,offset+6);
      if(!/^[0-9a-fA-F]{4}$/.test(next))reject('INVALID_UNICODE');
      const second=parseInt(next,16);
      if(!low(second))reject('INVALID_UNICODE');
      offset+=6;value+=String.fromCharCode(point,second);
     }else{if(low(point))reject('INVALID_UNICODE');value+=String.fromCharCode(point);}
    }else{
     if(character.charCodeAt(0)<0x20)reject('UNESCAPED_CONTROL_CHARACTER');
     value+=character;
    }
   }
   return reject('UNTERMINATED_STRING');
  }
  function append(node:LosslessJsonNode){
   const frame=frames[frames.length-1];
   if(!frame){if(root)reject('TRAILING_JSON');root=node;return;}
   if(frame.kind==='ARRAY'){
    if(frame.stage!=='FIRST'&&frame.stage!=='VALUE')reject('INVALID_JSON');
    frame.items.push(node);frame.stage='AFTER';
   }else{
    if(frame.stage!=='VALUE'||!frame.pending)reject('INVALID_JSON');
    frame.entries.push(Object.freeze({...frame.pending!,value:node}));frame.pending=undefined;frame.stage='AFTER';
   }
  }
  function close(){
   const frame=frames.pop()!;
   offset++;
   append(frame.kind==='ARRAY'?Object.freeze({kind:'ARRAY' as const,items:Object.freeze(frame.items)}):Object.freeze({kind:'OBJECT' as const,entries:Object.freeze(frame.entries)}));
  }
  function readValue(){
   const c=text[offset];
   if(c==='['){offset++;frames.push({kind:'ARRAY',items:[],stage:'FIRST'});return;}
   if(c==='{'){offset++;frames.push({kind:'OBJECT',entries:[],names:new Set(),stage:'FIRST'});return;}
   if(c==='"'){const token=stringToken();append(Object.freeze({kind:'STRING',...token}));return;}
   if(text.startsWith('true',offset)){offset+=4;append(Object.freeze({kind:'BOOLEAN',value:true}));return;}
   if(text.startsWith('false',offset)){offset+=5;append(Object.freeze({kind:'BOOLEAN',value:false}));return;}
   if(text.startsWith('null',offset)){offset+=4;append(Object.freeze({kind:'JSON_NULL'}));return;}
   if(c==='-'||digit(c)){
    const start=offset;
    if(c==='-')offset++;
    if(text[offset]==='0')offset++;
    else{if(!digit(text[offset]))reject('INVALID_NUMBER');while(digit(text[offset]))offset++;}
    if(text[offset]==='.'){offset++;if(!digit(text[offset]))reject('INVALID_NUMBER');while(digit(text[offset]))offset++;}
    if(text[offset]==='e'||text[offset]==='E'){offset++;if(text[offset]==='+'||text[offset]==='-')offset++;if(!digit(text[offset]))reject('INVALID_NUMBER');while(digit(text[offset]))offset++;}
    append(Object.freeze({kind:'NUMBER',lexeme:text.slice(start,offset)}));return;
   }
   reject('INVALID_JSON');
  }
  while(true){
   whitespace();
   const frame=frames[frames.length-1];
   if(!frame){
    if(root){if(offset!==text.length)reject('TRAILING_JSON');break;}
    if(offset===text.length)reject('EMPTY_JSON');
    readValue();continue;
   }
   if(frame.kind==='ARRAY'){
    if(frame.stage==='FIRST'&&text[offset]===']'){close();continue;}
    if(frame.stage==='AFTER'){
     if(text[offset]===']'){close();continue;}
     if(text[offset]!==',')reject('INVALID_JSON');
     offset++;frame.stage='VALUE';continue;
    }
    readValue();continue;
   }
   if(frame.stage==='FIRST'&&text[offset]==='}'){close();continue;}
   if(frame.stage==='FIRST'||frame.stage==='KEY'){
    if(text[offset]!=='"')reject('INVALID_PROPERTY_NAME');
    const key=stringToken();
    if(frame.names.has(key.value))reject('DUPLICATE_PROPERTY_NAME');
    frame.names.add(key.value);whitespace();
    if(text[offset++]!==':')reject('INVALID_JSON');
    frame.pending={name:key.value,nameLexeme:key.lexeme};frame.stage='VALUE';continue;
   }
   if(frame.stage==='AFTER'){
    if(text[offset]==='}'){close();continue;}
    if(text[offset]!==',')reject('INVALID_JSON');
    offset++;frame.stage='KEY';continue;
   }
   readValue();
  }
  const bytes=Buffer.from(text,'utf8');
  const wire=Object.freeze({encoding:'UTF8' as const,text,bytesBase64:bytes.toString('base64'),byteLength:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  const envelope=Object.freeze({kind:'JSON' as const,wire,value:root!});
  issued.add(envelope);return {status:'PARSED',envelope};
 }catch(error){return {status:'BLOCKED',code:error instanceof ParseFailure?error.code:'JSON_PARSE_FAILED'};}
}
function trusted(input:unknown):input is LosslessJsonEnvelope{
 return typeof input==='object'&&input!==null&&issued.has(input);
}
function pathData(input:unknown):LosslessJsonPathSegment[] {
 if(typeof input!=='object'||input===null||utilTypes.isProxy(input)||!Array.isArray(input)||Object.getPrototypeOf(input)!==Array.prototype)return reject('INVALID_JSON_PATH');
 const d:Record<string,PropertyDescriptor>=Object.getOwnPropertyDescriptors(input as object),keys=Reflect.ownKeys(input),length=d.length;
 if(!length||!('value' in length)||!Number.isSafeInteger(length.value)||length.value<0||keys.length!==length.value+1)reject('INVALID_JSON_PATH');
 const result:LosslessJsonPathSegment[]=[];
 for(let n=0;n<length.value;n++){
  const item=d[String(n)];
  if(!item||!('value' in item)||!item.enumerable)reject('INVALID_JSON_PATH');
  const value=item.value as unknown;
  if(typeof value!=='object'||value===null||utilTypes.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)return reject('INVALID_JSON_PATH');
  const props=Object.getOwnPropertyDescriptors(value),names=Reflect.ownKeys(value);
  if(names.some(k=>typeof k!=='string')||names.some(k=>!('value' in props[k as string])||!props[k as string].enumerable))reject('INVALID_JSON_PATH');
  if(!names.includes('kind'))reject('INVALID_JSON_PATH');
  const kind=props.kind.value;
  if(kind==='PROPERTY'&&names.length===2&&names.includes('name')&&typeof props.name.value==='string')result.push(Object.freeze({kind,name:props.name.value}));
  else if(kind==='INDEX'&&names.length===2&&names.includes('index')&&Number.isSafeInteger(props.index.value)&&props.index.value>=0)result.push(Object.freeze({kind,index:props.index.value}));
  else reject('INVALID_JSON_PATH');
 }
 return result;
}
/** Parser-issued identity is provenance only, never a DB/operator/tenant proof. */
export function lookupLosslessJsonPath(input:unknown,path:unknown):LosslessLookupOutcome{
 try{
  if(!trusted(input))return {status:'BLOCKED',code:'UNISSUED_JSON_ENVELOPE'};
  const segments=pathData(path);
  if(input.kind==='SQL_NULL')return {status:'MISSING'};
  let node=input.value;
  for(const segment of segments){
   if(node.kind==='OBJECT'&&segment.kind==='PROPERTY'){
    const entry=node.entries.find(e=>e.name===segment.name);
    if(!entry)return {status:'MISSING'};node=entry.value;
   }else if(node.kind==='ARRAY'&&segment.kind==='INDEX'){
    if(segment.index>=node.items.length)return {status:'MISSING'};node=node.items[segment.index];
   }else return {status:'MISSING'};
  }
  return {status:'FOUND',value:node};
 }catch{return {status:'BLOCKED',code:'INVALID_JSON_PATH'};}
}
type PathLink={segment:LosslessJsonPathSegment;previous:PathLink|null};
/** Empty containers are structural leaves; SQL NULL has no JSON leaves. */
export function walkLosslessJsonLeaves(input:unknown):LosslessLeafOutcome{
 try{
  if(!trusted(input))return {status:'BLOCKED',code:'UNISSUED_JSON_ENVELOPE'};
  if(input.kind==='SQL_NULL')return {status:'LEAVES',leaves:Object.freeze([])};
  const leaves:LosslessJsonLeaf[]=[],pending=[{node:input.value,path:null as PathLink|null}];
  while(pending.length){
   const {node,path}=pending.pop()!;
   if(node.kind==='ARRAY'&&node.items.length){
    for(let n=node.items.length-1;n>=0;n--)pending.push({node:node.items[n],path:{segment:Object.freeze({kind:'INDEX',index:n}),previous:path}});
   }else if(node.kind==='OBJECT'&&node.entries.length){
    for(let n=node.entries.length-1;n>=0;n--){const e=node.entries[n];pending.push({node:e.value,path:{segment:Object.freeze({kind:'PROPERTY',name:e.name}),previous:path}});}
   }else{
    const segments:LosslessJsonPathSegment[]=[];
    for(let p=path;p;p=p.previous)segments.push(p.segment);
    segments.reverse();leaves.push(Object.freeze({path:Object.freeze(segments),value:node}));
   }
  }
  return {status:'LEAVES',leaves:Object.freeze(leaves)};
 }catch{return {status:'BLOCKED',code:'JSON_LEAF_WALK_FAILED'};}
}
/** Explicit legacy-format bridge only. Numeric conversion is attempted here,
 * never during parsing. Exact lexical Number→JSON serialization must round-trip,
 * and integers must be safe. This promises serialization, not decimal arithmetic.
 * Top-level JSON null blocks; SQL NULL and nested JSON null remain unambiguous.
 * No capture/preflight integration or completeness approval is implied. */
export function toExistingJsonValue(input:unknown):ExistingJsonOutcome{
 try{
  if(!trusted(input))return {status:'BLOCKED',code:'UNISSUED_JSON_ENVELOPE'};
  if(input.kind==='SQL_NULL')return {status:'CONVERTED',origin:'SQL_NULL',value:null};
  if(input.value.kind==='JSON_NULL')return {status:'BLOCKED',code:'SQL_JSON_NULL_AMBIGUITY'};
  const pieces:string[]=[],pending:Array<LosslessJsonNode|string>=[input.value];
  while(pending.length){
   const node=pending.pop()!;
   if(typeof node==='string'){pieces.push(node);continue;}
   if(node.kind==='NUMBER'){
    const number=Number(node.lexeme);
    if(!Number.isFinite(number)||JSON.stringify(number)!==node.lexeme||(Number.isInteger(number)&&!Number.isSafeInteger(number)))return {status:'BLOCKED',code:'NUMBER_NOT_EXACT_IN_EXISTING_JSON'};
    pieces.push(node.lexeme);
   }else if(node.kind==='STRING')pieces.push(JSON.stringify(node.value));
   else if(node.kind==='BOOLEAN')pieces.push(node.value?'true':'false');
   else if(node.kind==='JSON_NULL')pieces.push('null');
   else if(node.kind==='ARRAY'){
    pieces.push('[');pending.push(']');
    for(let n=node.items.length-1;n>=0;n--){pending.push(node.items[n]);if(n>0)pending.push(',');}
   }else{
    pieces.push('{');pending.push('}');
    for(let n=node.entries.length-1;n>=0;n--){const e=node.entries[n];pending.push(e.value);pending.push(JSON.stringify(e.name)+':');if(n>0)pending.push(',');}
   }
  }
  return {status:'CONVERTED',origin:'JSON',value:JSON.parse(pieces.join('')) as JsonValue};
 }catch{return {status:'BLOCKED',code:'EXISTING_JSON_CONVERSION_FAILED'};}
}
