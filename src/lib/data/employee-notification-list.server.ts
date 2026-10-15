import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {NotificationIntent,SqlExecutor,SqlStatement,SourceSnapshot} from '../notifications/types';
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
import {payrollNoticeReadSql} from '../payroll/notices';
import {attentionSourceVersion} from './employee-attention-receipts.server';

const LIMIT=25,MAX_READS=64,MAX_BYTES=1_000_000,BUDGET_MS=8000;
const supported=['SCHEDULE','TIME_OFF','EXCHANGE','CALLOUT','AVAILABILITY','SELF_TEST','COMMUNICATION','PAYROLL_STATEMENT'] as const;
const labels:Record<typeof supported[number],string>={SCHEDULE:'Schedule update',TIME_OFF:'Time off update',EXCHANGE:'Shift request update',CALLOUT:'Callout update',AVAILABILITY:'Availability update',SELF_TEST:'Device notification test',COMMUNICATION:'Team update',PAYROLL_STATEMENT:'Pay statement update'};
const candidateSql=(actor='$1')=>`SELECT id,read_at::text AS read FROM notifications WHERE employee_id=${actor} ORDER BY created_at DESC,id DESC LIMIT 26`;
const ownReceiptSql=(p:string[])=>`SELECT source_kind,source_id,source_version FROM employee_attention_receipts WHERE workspace_id=${p[0]} AND employee_id=${p[1]}
 AND (source_kind,source_id,source_version) IN (SELECT * FROM unnest(${p[2]}::text[],${p[3]}::text[],${p[4]}::text[]))`;
const ownCommunicationStatusSql=(p:string[])=>`SELECT r.id::text AS version,r.acknowledgement AS requirement,
 EXISTS(SELECT 1 FROM communication_receipts cr WHERE cr.workspace_id=c.workspace_id AND cr.communication_id=c.id AND cr.revision_id=r.id AND cr.employee_id=${p[1]}) AS acknowledged
 FROM communications c JOIN communication_revisions r ON r.id=c.head_revision_id WHERE c.workspace_id=${p[0]} AND c.id::text=${p[2]} AND c.state='PUBLISHED'`;
// Match the canonical attention detail's explicit null/time projection before
// its shared hash function. Notification TIME_OFF status versions are different.
const ownTimeOffDetailSql=(p:string[])=>`SELECT jsonb_build_object('id',id,'status',status,'startDate',start_date::text,'endDate',end_date::text,
 'startTime',start_time::text,'endTime',end_time::text,'reason',reason) AS detail FROM time_off_requests WHERE employee_id=${p[1]} AND id=ANY(${p[2]}::text[]) AND EXISTS(SELECT 1 FROM workspaces WHERE id=${p[0]} AND active)`;
type CommunicationStatus={version:string;requirement:string;acknowledged:boolean};
export function projectNotificationDisplayState(source:SourceSnapshot,employeeId:string,read:boolean|null,communication:CommunicationStatus|null):Pick<EmployeeNotificationItem,'reviewState'|'actionState'>{
 const reviewState=read===null?'unavailable':read?'read':'unread';
 if(source.kind==='SCHEDULE'){
  const ack=source.employeePublications?.[employeeId]?.acknowledgement;
  return !ack?{reviewState,actionState:'unavailable'}:ack.acknowledged?{reviewState:'confirmed',actionState:'complete'}:{reviewState,actionState:ack.needsAcknowledgement?'required':'none'};
 }
 if(source.kind==='COMMUNICATION'){
  if(!communication||communication.version!==source.source.version||!['NONE','OPTIONAL','REQUIRED'].includes(communication.requirement))return {reviewState:'unavailable',actionState:'unavailable'};
  return communication.acknowledged?{reviewState:'confirmed',actionState:'complete'}:{reviewState,actionState:communication.requirement==='REQUIRED'?'required':communication.requirement==='OPTIONAL'&&!read?'available':'none'};
 }
 if(source.kind==='EXCHANGE'){
  const responds=source.record.status==='OPEN'&&source.record.requestedByEmployeeId!==employeeId||source.record.status==='EMPLOYEE_PENDING'&&source.record.targetEmployeeId===employeeId;
  return {reviewState,actionState:responds&&source.record.actionable?'available':['APPROVED','DENIED','CANCELLED','EXPIRED'].includes(source.record.status)?'complete':'none'};
 }
 if(source.kind==='AVAILABILITY')return {reviewState,actionState:source.submissions.some(s=>s.employeeId===employeeId&&s.submitted)?'complete':'required'};
 return {reviewState,actionState:'none'};
}
type Template={name:string;args:number;sql:(args:string[])=>string;clockField?:'observed_at'|'observedAt'};
/** Finite canonical SELECT templates only. No SQL rewriting, arbitrary query
 * acceptance, mutation statements, or network/executor fallback during replay. */
const templates:Template[]=[
 {name:'ownReceipt',args:5,sql:ownReceiptSql},
 {name:'ownCommunicationStatus',args:3,sql:ownCommunicationStatusSql},
 {name:'ownTimeOffDetail',args:3,sql:ownTimeOffDetailSql},
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
 {name:'communication',args:1,sql:p=>notificationReadSql.communication(p[0])},
 {name:'selfTest',args:2,sql:p=>notificationReadSql.selfTest(p[0],p[1])},
 {name:'payrollNotice',args:2,sql:p=>payrollNoticeReadSql(p[0],p[1])},
];
type Entry={key:string;template:Template;values:readonly unknown[]};
const managementTemplates:Template[]=[
 {name:'operationalRecipient',args:1,sql:p=>notificationReadSql.operationalRecipient(p[0])},
 {name:'summarySeeds',args:4,sql:p=>notificationReadSql.summarySeeds(p[0],p[1],p[2],p[3])},
 ...(['coverageLocations','coverageWindows','coverageEmployees','coveragePositions'] as const).map(name=>({name,args:0,sql:()=>notificationReadSql[name]()})),
];
export function notificationReadManifest(includeManagement=false){
 const allowed=includeManagement?[...templates,...managementTemplates]:templates;
 const entries=new Map<string,Entry>();
 return {entries,identify(statement:SqlStatement){
  const template=allowed.find(t=>statement.text===t.sql(Array.from({length:t.args},(_,i)=>`$${i+1}`)));
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
  // Freeze only the discovered visible actor-owned keys. Final replay reuses the
  // same observations; newly required keys/versions fail closed, removed sources
  // remain removed. Neither batch enumerates unrelated requests or receipt history.
  let detailIds:string[]|undefined,receiptKeys:string[][]|undefined;
  async function project(db:SqlExecutor,candidates:Record<string,unknown>[],now:Date){
   const state=sqlNotificationStateRepository(db,workspace),items:EmployeeNotificationItem[]=[];
   let partial=candidates.length>LIMIT,expires=Infinity;
   const visible:{intent:NotificationIntent;source:SourceSnapshot;href:string}[]=[];
   for(const candidate of candidates.slice(0,LIMIT)){
    budget();if(typeof candidate.id!=='string')throw Error('Invalid notification candidate');
    const intent:NotificationIntent|null=await state.findIntent(candidate.id);
    if(!intent){partial=true;continue;}
    if(intent.employeeId!==proof.employee.id||intent.environment!==environment||Date.parse(intent.expiresAt)<=now.getTime()||Date.parse(intent.dueAt)>now.getTime())continue;
    if(!supported.includes(intent.source.kind as typeof supported[number])){partial=true;continue;}
    const check=await state.check(intent,proof.employee.id,now,'open');
    if(check.reason==='workspace_unavailable'||check.reason==='payroll_source_unavailable')throw Error('Notification source unavailable');
    if(!check.deliverable||check.effectiveVersion!==intent.effectiveVersion||Date.parse(check.expiresAt)<=now.getTime()||!safeReturnTo(check.destination))continue;
    const href=safeNotificationOpenPath(intent.id);if(!href){partial=true;continue;}
    expires=Math.min(expires,Date.parse(check.expiresAt));
    if(intent.source.kind==='PAYROLL_STATEMENT'){
     // Finance's canonical check above owns publication/recipient/role/scope.
     // Payroll has no generic SourceSnapshot: expose metadata only, and replay
     // this same check against the final protected Finance observation.
     if(candidate.read!==null&&(typeof candidate.read!=='string'||!Number.isFinite(Date.parse(candidate.read))))throw Error('Missing notification read metadata');
     items.push({id:intent.id,label:labels.PAYROLL_STATEMENT,at:intent.dueAt,href,reviewState:candidate.read===null?'unread':'read',actionState:'available'});
     continue;
    }
    const source=await state.readSource(intent.source);if(!source){partial=true;continue;}
    visible.push({intent,source,href});
   }
   const neededIds=[...new Set(visible.filter(v=>v.source.kind==='TIME_OFF').map(v=>v.source.source.id))].sort();
   detailIds??=neededIds;
   if(neededIds.some(id=>!detailIds!.includes(id)))throw Error('Unobserved time off source');
   const details=detailIds.length?await db.query<{detail:Record<string,unknown>}>({text:ownTimeOffDetailSql(['$1','$2','$3']),values:[workspace.id,proof.employee.id,detailIds]}):[];
   const projected=visible.flatMap(value=>{
    const {source}=value;
    let receiptKind:string|null=['SCHEDULE','EXCHANGE','COMMUNICATION'].includes(source.kind)?source.kind:null,receiptVersion=source.source.version;
    if(source.kind==='TIME_OFF'){
     const row=details.find(row=>row.detail?.id===source.source.id);
     if(!row?.detail){partial=true;return [];}
     receiptKind='TIME_OFF';receiptVersion=attentionSourceVersion({kind:'TIME_OFF',id:source.source.id,version:''},row.detail);
    }
    return [{...value,receiptKind,receiptVersion}];
   });
   const neededKeys=projected.filter(v=>v.receiptKind!==null).map(v=>[v.receiptKind!,v.source.source.id,v.receiptVersion]);
   receiptKeys??=neededKeys;
   if(neededKeys.some(key=>!receiptKeys!.some(original=>original.every((value,i)=>value===key[i]))))throw Error('Unobserved receipt source');
   const receipts=receiptKeys.length?await db.query<{source_kind:string;source_id:string;source_version:string}>({text:ownReceiptSql(['$1','$2','$3','$4','$5']),values:[workspace.id,proof.employee.id,...[0,1,2].map(i=>receiptKeys!.map(key=>key[i]))]}):[];
   for(const {intent,source,href,receiptKind,receiptVersion} of projected){
    const read=receiptKind?receipts.some(row=>row.source_kind===receiptKind&&row.source_id===source.source.id&&row.source_version===receiptVersion):null;
    const communication=source.kind==='COMMUNICATION'?(await db.query<CommunicationStatus>({text:ownCommunicationStatusSql(['$1','$2','$3']),values:[workspace.id,proof.employee.id,source.source.id]}))[0]??null:null;
    const display=projectNotificationDisplayState(source,proof.employee.id,read,communication);if(display.actionState==='unavailable')partial=true;
    items.push({id:intent.id,label:labels[intent.source.kind as typeof supported[number]],at:intent.dueAt,href,...display});
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
