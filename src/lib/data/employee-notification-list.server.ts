import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {NotificationIntent,SqlExecutor,SqlStatement} from '../notifications/types';
import {parseEmployeeView,type EmployeeNotificationItem,type EmployeeViewSnapshot} from '../employee-view';
import {safeNotificationOpenPath,safeReturnTo} from '../notifications/destinations';
import {notificationReadSql,sqlNotificationStateRepository} from './notification-state';
import {timeOffReadSql} from './requests';
import {exchangeReadSql} from './exchanges';
import {calloutReadSql} from './callouts';
import {maintenanceReadSql} from './shift-change-maintenance';
import {neonNotificationExecutor,notificationWeekReadSql} from './notification-transactions';
import {workspaceReadSql} from './workspaces';
import {assertEmployeeViewProof,employeeViewGuards,readEmployeeWorkspace,employeeReadLimits} from './employee-profile.server';
import {isManagementAuthorizationError} from './management-session';

const LIMIT=25,MAX_READS=64,MAX_BYTES=1_000_000,BUDGET_MS=8000;
const supported=['SCHEDULE','TIME_OFF','EXCHANGE','CALLOUT','AVAILABILITY','SELF_TEST'] as const;
const labels:Record<typeof supported[number],string>={SCHEDULE:'Schedule update',TIME_OFF:'Time off update',EXCHANGE:'Shift request update',CALLOUT:'Callout update',AVAILABILITY:'Availability update',SELF_TEST:'Device notification test'};
const candidateSql=(actor='$1')=>`SELECT id FROM notifications WHERE employee_id=${actor} ORDER BY created_at DESC,id DESC LIMIT 26`;
type Template={name:string;args:number;sql:(args:string[])=>string;clockField?:'observed_at'|'observedAt'};
/** Finite canonical SELECT templates only. No SQL rewriting, arbitrary query
 * acceptance, mutation statements, or network/executor fallback during replay. */
const templates:Template[]=[
 {name:'workspace',args:0,sql:()=>workspaceReadSql()},
 {name:'intent',args:1,sql:p=>notificationReadSql.intent(p[0])},
 {name:'recipient',args:1,sql:p=>notificationReadSql.recipient(p[0])},
 {name:'timeOff',args:1,sql:p=>timeOffReadSql(p[0])},
 {name:'exchange',args:1,sql:p=>exchangeReadSql(p[0]),clockField:'observed_at'},
 {name:'exchangeTerms',args:1,sql:p=>notificationReadSql.exchangeTerms(p[0])},
 {name:'callout',args:1,sql:p=>calloutReadSql(p[0])},
 {name:'calloutTerms',args:1,sql:p=>notificationReadSql.calloutTerms(p[0])},
 {name:'maintenance',args:0,sql:()=>maintenanceReadSql(),clockField:'observedAt'},
 {name:'schedule',args:1,sql:p=>notificationWeekReadSql(p[0])},
 {name:'availability',args:1,sql:p=>notificationReadSql.availability(p[0])},
 {name:'locations',args:1,sql:p=>notificationReadSql.locations(p[0])},
 {name:'selfTest',args:2,sql:p=>notificationReadSql.selfTest(p[0],p[1])},
];
type Entry={key:string;template:Template;values:readonly unknown[]};
export function notificationReadManifest(){
 const entries=new Map<string,Entry>();
 return {entries,identify(statement:SqlStatement){
  const template=templates.find(t=>statement.text===t.sql(Array.from({length:t.args},(_,i)=>`$${i+1}`)));
  if(!template||statement.values.length!==template.args)throw Error('Unsupported notification read');
  const values=structuredClone(statement.values);
  for(const value of values){
   if(typeof value==='string'&&value.length<=256)continue;
   if(Array.isArray(value)&&value.length<=500&&value.every(v=>typeof v==='string'&&v.length<=256))continue;
   throw Error('Invalid notification read parameter');
  }
  const key=JSON.stringify([template.name,values]);
  if(!entries.has(key)){if(entries.size>=MAX_READS)throw Error('Notification read budget');entries.set(key,{key,template,values});}
  return entries.get(key)!;
 }};
}
const jsonRows=(sql:string)=>`(SELECT COALESCE(jsonb_agg(to_jsonb(r)),'[]'::jsonb) FROM (${sql}) r)`;
function requireRows(value:unknown):Record<string,unknown>[]{if(!Array.isArray(value)||value.some(r=>!r||typeof r!=='object'||Array.isArray(r)))throw Error('Missing notification observation');return value;}

/** Real cookie-derived proof, independent explicit source environment. Discovery
 * only enumerates canonical queries. No discovery data authorizes output. The
 * last protected SELECT returns fresh candidate membership and all source facts
 * in one MVCC observation, then canonical policy replays exclusively in memory.
 * An adaptive cache miss/source insertion fails unavailable until a new read. */
export async function readEmployeeNotificationList(proof:SessionMutationProof,environment:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<EmployeeViewSnapshot>{
 try{assertEmployeeViewProof(proof);}catch{return {state:'unavailable',reason:'access_denied'};}
 if(environment!=='test'&&environment!=='production')return {state:'unavailable',reason:'read_failed'};
 const signal=AbortSignal.timeout(BUDGET_MS),started=performance.now();
 const budget=()=>{signal.throwIfAborted();if(performance.now()-started>=BUDGET_MS)throw Error('Notification read budget');};
 const limits=employeeReadLimits;
 try{
  const workspace=await readEmployeeWorkspace(executor,signal);budget();
  // Inbox history does not require a still-active operational location. Each
  // source's canonical open policy owns location eligibility, including history.
  const guards=employeeViewGuards(proof,workspace,false);
  const discovery=await executor.transaction([...limits,...guards,{text:candidateSql(),values:[proof.employee.id]}],signal);
  const initial=requireRows(discovery[limits.length+guards.length]);
  const manifest=notificationReadManifest(),cache=new Map<string,Promise<Record<string,unknown>[]>>();
  const collecting:SqlExecutor={transaction:async()=>{throw Error('Unexpected notification transaction');},query:async<T>(statement:SqlStatement)=>{
   budget();const entry=manifest.identify(statement);
   if(!cache.has(entry.key))cache.set(entry.key,(async()=>{
    const results=await executor.transaction([...limits,{text:`SELECT ${jsonRows(statement.text)} AS rows`,values:entry.values}],signal);
    const rows=requireRows((results[limits.length]?.[0] as {rows:unknown})?.rows);
    if(Buffer.byteLength(JSON.stringify(rows))>MAX_BYTES)throw Error('Notification observation too large');budget();return rows;
   })());
   return structuredClone(await cache.get(entry.key)!) as T[];
  }};
  async function project(db:SqlExecutor,candidates:Record<string,unknown>[],now:Date){
   const state=sqlNotificationStateRepository(db,workspace),items:EmployeeNotificationItem[]=[];
   let partial=candidates.length>LIMIT,expires=Infinity;
   for(const candidate of candidates.slice(0,LIMIT)){
    budget();if(typeof candidate.id!=='string')throw Error('Invalid notification candidate');
    const intent:NotificationIntent|null=await state.findIntent(candidate.id);
    if(!intent){partial=true;continue;}
    if(intent.employeeId!==proof.employee.id||intent.environment!==environment||Date.parse(intent.expiresAt)<=now.getTime()||Date.parse(intent.dueAt)>now.getTime())continue;
    if(!supported.includes(intent.source.kind as typeof supported[number])){partial=true;continue;}
    const check=await state.check(intent,proof.employee.id,now,'open');
    if(check.reason==='workspace_unavailable')throw Error('Notification source unavailable');
    if(!check.deliverable||check.effectiveVersion!==intent.effectiveVersion||Date.parse(check.expiresAt)<=now.getTime()||!safeReturnTo(check.destination))continue;
    const href=safeNotificationOpenPath(intent.id);if(!href){partial=true;continue;}
    expires=Math.min(expires,Date.parse(check.expiresAt));
    items.push({id:intent.id,label:labels[intent.source.kind as typeof supported[number]],at:intent.dueAt,href});
   }
   return {items,coverage:partial?'partial' as const:'complete' as const,expires};
  }
  await project(collecting,initial,new Date());budget();
  const entries=[...manifest.entries.values()],values:unknown[]=[proof.employee.id,proof.sessionTokenHash,proof.employee.role,workspace.id];
  const observations=entries.map(entry=>{
   const args=entry.values.map(value=>{values.push(value);return `$${values.length}`;});
   return jsonRows(entry.template.sql(args));
  });
  // facts materializes before at. Both Exchange projectors replay their explicit
  // clock field with this final DB time; source snapshots themselves are intact.
  const finalSql=`WITH facts AS MATERIALIZED (SELECT ${jsonRows(candidateSql('$1'))} AS candidates,
    jsonb_build_array(${observations.join(',')}) AS reads), observed AS MATERIALIZED (SELECT facts.*,clock_timestamp() AS at FROM facts)
   SELECT candidates,reads,to_jsonb(at) AS "observedAt",
    (SELECT LEAST(45000,FLOOR(EXTRACT(EPOCH FROM (s.expires_at-at))*1000)) FROM employee_sessions s JOIN employees e ON e.id=s.employee_id
      WHERE s.token_hash=$2 AND e.id=$1 AND e.active AND e.role=$3 AND s.expires_at>at) AS "validForMs",
    (SELECT active FROM workspaces WHERE id=$4 AND singleton=true) AS active FROM observed`;
  const results=await executor.transaction([...limits,...guards,{text:finalSql,values}],signal);budget();
  const final=results[limits.length+guards.length]?.[0] as {candidates:unknown;reads:unknown;observedAt:string;validForMs:number|null;active:boolean}|undefined;
  if(!final||!final.active||!final.validForMs)throw Error('Notification final authority unavailable');
  if(Buffer.byteLength(JSON.stringify(final))>MAX_BYTES)throw Error('Notification observation too large');
  const candidates=requireRows(final.candidates);
  if(!Array.isArray(final.reads)||final.reads.length!==entries.length||!Number.isFinite(Date.parse(final.observedAt)))throw Error('Invalid notification observation');
  const fresh=new Map(entries.map((entry,i)=>[entry.key,requireRows((final.reads as unknown[])[i])]));
  const replay:SqlExecutor={transaction:async()=>{throw Error('Unexpected notification replay transaction');},query:async<T>(statement:SqlStatement)=>{
   budget();const entry=manifest.identify(statement),rows=fresh.get(entry.key);if(!rows)throw Error('Notification observation missing');
   // This is the two canonical projectors' explicit observation-time input,
   // never an ignored source field or a frozen discovery eligibility result.
   return rows.map(row=>entry.template.clockField?{...structuredClone(row),[entry.template.clockField]:final.observedAt}:structuredClone(row)) as T[];
  }};
  const projected=await project(replay,candidates,new Date(final.observedAt));budget();
  const validForMs=Math.min(Number(final.validForMs),projected.expires-Date.parse(final.observedAt));
  return parseEmployeeView({state:'ready',kind:'notifications',observedAt:final.observedAt,validForMs,coverage:projected.coverage,items:projected.items},'notifications');
 }catch(error){return {state:'unavailable',reason:isManagementAuthorizationError(error)?'access_denied':'read_failed'};}
}
