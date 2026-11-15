import {normalizePhoneNumber} from '../phone';
import {isClosedRecord,readableText,type FieldError} from './contracts';
import {parseScopeSelection} from '../company-access/scope-selection';
import type {CreateEmployeeWithAccessCommand,ScopeSelection} from '../company-access/model';

export const ROSTER_MAX_ROWS=50;
export const ROSTER_MAX_BYTES=65536;
export type RosterPerson=Omit<CreateEmployeeWithAccessCommand,'operationId'>;
export type RosterRow={rowNumber:number;values:Record<string,string>;person:RosterPerson|null;fieldErrors:FieldError[]};
export type RosterTableResult={state:'ready';valid:boolean;rows:RosterRow[];ignoredColumns:string[]}|{state:'invalid';fieldErrors:FieldError[]};
type Defaults={primaryLocationId?:string;eligibleLocationIds?:string[];positionIds?:string[];initialManagerScope?:ScopeSelection};
const invalid=(code:string):RosterTableResult=>({state:'invalid',fieldErrors:[{field:'text',code}]});
const headerKey=(s:string)=>s.trim().normalize('NFD').replace(/\p{M}/gu,'').replace(/[\s_-]/g,'').toLowerCase();
const aliases:Record<string,string>={id:'id',employeeid:'id',idempleado:'id',firstname:'firstName',nombre:'firstName',lastname:'lastName',apellido:'lastName',phone:'phone',telefono:'phone',email:'email',correo:'email',role:'role',roldeacceso:'role',primarylocationid:'primaryLocationId',eligiblelocationids:'eligibleLocationIds',positionids:'positionIds'};
const ids=(v:unknown):v is string[]=>Array.isArray(v)&&v.length<=100&&v.every(id=>readableText(id,200));
function readDefaults(v:unknown):Defaults|null{
 if(v===undefined)return {};
 if(!isClosedRecord(v,[],['primaryLocationId','eligibleLocationIds','positionIds','initialManagerScope']))return null;
 if(v.primaryLocationId!==undefined&&!readableText(v.primaryLocationId,200)||v.eligibleLocationIds!==undefined&&!ids(v.eligibleLocationIds)||v.positionIds!==undefined&&!ids(v.positionIds))return null;
 const scope=v.initialManagerScope===undefined?undefined:parseScopeSelection(v.initialManagerScope);if(scope===null)return null;
 return {...(v.primaryLocationId?{primaryLocationId:v.primaryLocationId as string}:{}),...(v.eligibleLocationIds?{eligibleLocationIds:v.eligibleLocationIds as string[]}:{}),...(v.positionIds?{positionIds:v.positionIds as string[]}:{}),...(scope?{initialManagerScope:scope}:{})};
}
/** Finite CSV/TSV parser. Cells are always text; files/formulas are never executed. */
function cells(text:string,delimiter:string):string[][]|null{
 const table:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
 const endCell=()=>{row.push(cell);cell='';closed=false;};
 const endRow=()=>{endCell();table.push(row);row=[];};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c===delimiter){endCell();if(row.length>20)return null;continue;}
  if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;endRow();continue;}
  if(c==='"'){if(cell.length||closed)return null;quoted=true;continue;}
  if(closed){if(c===' '||c==='\t'&&delimiter!== '\t')continue;return null;}
  cell+=c;
 }
 if(quoted)return null;
 if(cell.length||row.length||closed)endRow();
 return table;
}
export function parseRosterTable(value:unknown):RosterTableResult{
 if(!isClosedRecord(value,['format','text'],['defaults'])||!['csv','tsv'].includes(String(value.format))||typeof value.text!=='string')return invalid('INVALID_TABLE');
 if(new TextEncoder().encode(value.text).byteLength>ROSTER_MAX_BYTES)return invalid('TABLE_TOO_LARGE');
 const defaults=readDefaults(value.defaults);if(!defaults)return invalid('INVALID_DEFAULTS');
 const table=cells(value.text.replace(/^\ufeff/,''),value.format==='csv'?',':'\t');if(!table||!table.length||table[0].length>20)return invalid('MALFORMED_TABLE');
 const headers=table[0].map(h=>aliases[headerKey(h)]??null),known=headers.filter((h):h is string=>h!==null);
 if(new Set(known).size!==known.length)return invalid('DUPLICATE_COLUMNS');
 if(!['id','firstName','lastName','phone'].every(key=>known.includes(key)))return invalid('REQUIRED_COLUMNS');
 const records=table.slice(1).map((row,i)=>({row,rowNumber:i+2})).filter(({row})=>row.some(c=>c.trim()));
 if(!records.length||records.length>ROSTER_MAX_ROWS)return invalid('ROW_COUNT');
 const seenIds=new Set<string>(),seenEmails=new Set<string>();
 const rows:RosterRow[]=records.map(({row,rowNumber})=>{
  const values:Record<string,string>={};headers.forEach((h,i)=>{if(h)values[h]=(row[i]??'').trim();});
  const fieldErrors:FieldError[]=[];const issue=(field:string,code:string)=>fieldErrors.push({field,code});
  if(row.length!==headers.length)issue('row','COLUMN_COUNT');
  const id=values.id.toUpperCase(),firstName=values.firstName,lastName=values.lastName,phone=normalizePhoneNumber(values.phone),email=values.email||null;
  for(const [field,v,max] of [['id',id,128],['firstName',firstName,160],['lastName',lastName,160]] as const)if(!readableText(v,max))issue(field,v?'INVALID_TEXT':'REQUIRED');
  if(!phone)issue('phone','INVALID_PHONE');
  if(email&&(!readableText(email,254)||/\s/.test(email)||!/^[^@]+@[^@]+$/.test(email)))issue('email','INVALID_EMAIL');
  if(id&&seenIds.has(id))issue('id','DUPLICATE_ID');seenIds.add(id);
  if(email&&seenEmails.has(email.toLowerCase()))issue('email','DUPLICATE_EMAIL');if(email)seenEmails.add(email.toLowerCase());
  const role=(values.role||'EMPLOYEE').toUpperCase();
  if(role==='OWNER')issue('role','OWNER_NOT_IMPORTABLE');else if(!['EMPLOYEE','LEAD','MANAGER'].includes(role))issue('role','INVALID_ROLE');
  if(role==='MANAGER'&&!defaults.initialManagerScope)issue('initialManagerScope','MANAGER_SCOPE_REQUIRED');
  const primaryLocationId=values.primaryLocationId||defaults.primaryLocationId||'';
  const split=(key:string,fallback:string[])=>values[key]?values[key].split(';').map(s=>s.trim()).filter(Boolean):fallback;
  const eligibleLocationIds=[...new Set([primaryLocationId,...split('eligibleLocationIds',defaults.eligibleLocationIds??[])])].filter(Boolean).sort();
  const positionIds=[...new Set(split('positionIds',defaults.positionIds??[]))].sort();
  if(!readableText(primaryLocationId,200))issue('primaryLocationId','LOCATION_REQUIRED');
  if(!ids(eligibleLocationIds))issue('eligibleLocationIds','INVALID_LOCATIONS');if(!ids(positionIds))issue('positionIds','INVALID_POSITIONS');
  const person:RosterPerson|null=fieldErrors.length?null:{employee:{id,firstName,lastName,phone:phone!,email,role:role as 'EMPLOYEE'|'LEAD'|'MANAGER',primaryLocationId,eligibleLocationIds,positionIds},...(role==='MANAGER'&&defaults.initialManagerScope?{initialManagerScope:defaults.initialManagerScope}:{})};
  return {rowNumber,values,person,fieldErrors};
 });
 return {state:'ready',valid:rows.every(r=>r.fieldErrors.length===0),rows,ignoredColumns:table[0].filter((_,i)=>!headers[i])};
}
