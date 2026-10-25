import {notificationOperationalAllowedSql,notificationOperationalGuard,isNotificationOperationalAuthorizationError} from './notification-operational-sql';
import 'server-only';
import {readEmployeeNotificationList,notificationReadManifest} from './employee-notification-list.server';
import {employeeReadLimits,employeeSnapshotGuards,employeeSnapshotLimits,employeeViewGuards} from './employee-profile.server';
import {getWorkspace,workspaceReadGuard} from './workspaces';
import {isManagementAuthorizationError,managementSessionStatements} from './management-session';
import {parseEmployeeView} from '../employee-view';
import {sqlNotificationStateRepository} from './notification-state';
import {neonNotificationExecutor} from './notification-transactions';
import {safeNotificationOpenPath,safeReturnTo} from '../notifications/destinations';
import type {EmployeeViewSnapshot,EmployeeNotificationItem} from '../employee-view';
import type {SqlExecutor,SqlStatement,SourceKind} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';

const LIMIT=25,MAX_BYTES=1_000_000;
const labels:Record<SourceKind,string>={SCHEDULE:'Schedule update',TIME_OFF:'Time off update',EXCHANGE:'Shift request update',CALLOUT:'Unable to work update',AVAILABILITY:'Availability update',MANAGER_SUMMARY:'Operations need review',SELF_TEST:'Device notification test',COMMUNICATION:'Team update',PAYROLL_PREPARATION:'Payroll preparation update',PAYROLL_STATEMENT:'Pay statement update'};
const candidatesSql=(actor='$1',environment='$2')=>`SELECT id,created_at::text AS at,read_at::text AS read FROM notifications n WHERE employee_id=${actor} AND environment=${environment} AND cancelled_at IS NULL AND ${notificationOperationalAllowedSql()} ORDER BY created_at DESC,id DESC LIMIT 26`;
const jsonRows=(sql:string)=>`(SELECT COALESCE(jsonb_agg(to_jsonb(r)),'[]'::jsonb) FROM (${sql}) r)`;
function rows(value:unknown):Record<string,unknown>[]{
 if(!Array.isArray(value)||value.some(row=>!row||typeof row!=='object'||Array.isArray(row)))throw Error('Missing notification observation');
 return value;
}
/** Cancellation also settles callers when an adapter cannot finish its promise.
 * The same signal still reaches every underlying request for transport cleanup. */
function abortable<T>(work:()=>Promise<T>,signal:AbortSignal):Promise<T>{
 signal.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const abort=()=>reject(signal.reason);
  signal.addEventListener('abort',abort,{once:true});
  void work().then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
 });
}
function boundedExecutor(executor:SqlExecutor,signal:AbortSignal,limits:SqlStatement[]=employeeReadLimits):SqlExecutor{
 return {
  query:async<T>(statement:SqlStatement)=>{
   const result=await abortable(()=>executor.transaction([...limits,statement],signal),signal);
   return result[limits.length] as T[];
  },
  transaction:statements=>abortable(()=>executor.transaction([...limits,...statements],signal),signal).then(result=>result.slice(limits.length)),
 };
}

/** Discovery enumerates finite canonical SELECTs only. A final protected SELECT
 * observes candidate membership, source authority and session validity together.
 * Output replays canonical policy exclusively against that fresh observation. */
export async function readPortalNotificationList(proof:SessionMutationProof,environment:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<EmployeeViewSnapshot>{
 if(['EMPLOYEE','LEAD'].includes(proof.employee.role))return readEmployeeNotificationList(proof,environment,executor);
 if(!['OWNER','MANAGER'].includes(proof.employee.role)||!/^[a-f0-9]{64}$/.test(proof.sessionTokenHash))return {state:'unavailable',reason:'access_denied'};
 if(environment!=='test'&&environment!=='production')return {state:'unavailable',reason:'read_failed'};
 // Inspection B3: discovery and source collection are READ ONLY snapshots with lock-free guards (company version,
 // exact session and role) checked in the same instant as their rows. The final observation and the response fence
 // keep the locked guards, so an in-flight role/session change is still waited for before release.
 const started=performance.now(),signal=AbortSignal.timeout(8000),bounded=boundedExecutor(executor,signal,employeeSnapshotLimits),locked=boundedExecutor(executor,signal);
 try{
  const workspace=await getWorkspace(bounded),guards=employeeSnapshotGuards(proof,workspace,false),finalGuards=employeeViewGuards(proof,workspace,false);
  const initial=await bounded.transaction([...guards,{text:candidatesSql(),values:[proof.employee.id,environment]},
   {text:`SELECT LEAST(15000,FLOOR(EXTRACT(EPOCH FROM(s.expires_at-clock_timestamp()))*1000)) AS "validForMs" FROM employee_sessions s JOIN employees e ON e.id=s.employee_id WHERE s.token_hash=$1 AND e.id=$2 AND e.active AND e.role=$3 AND s.expires_at>clock_timestamp()`,values:[proof.sessionTokenHash,proof.employee.id,proof.employee.role]}]);
  const originalBudget=Number((initial[guards.length+1]?.[0] as {validForMs:unknown}|undefined)?.validForMs);
  if(!Number.isFinite(originalBudget)||originalBudget<=0)return {state:'unavailable',reason:'access_denied'};
  const manifest=notificationReadManifest(true),cache=new Map<string,Promise<Record<string,unknown>[]>>();
  let bytes=0;
  const collecting:SqlExecutor={transaction:async()=>{throw Error('Unexpected notification transaction');},query:async<T>(statement:SqlStatement)=>{
   signal.throwIfAborted();const entry=manifest.identify(statement);
   if(!cache.has(entry.key))cache.set(entry.key,(async()=>{
    const [result]=await bounded.query<{rows:unknown}>({text:`SELECT ${jsonRows(statement.text)} AS rows`,values:entry.values});
    const observed=rows(result?.rows);bytes+=Buffer.byteLength(JSON.stringify(observed));
    if(bytes>MAX_BYTES)throw Error('Notification observation too large');return observed;
   })());
   return structuredClone(await cache.get(entry.key)!) as T[];
  }};
  async function project(db:SqlExecutor,candidates:Record<string,unknown>[],now:Date){
   const repository=sqlNotificationStateRepository(db,workspace),items:EmployeeNotificationItem[]=[];
   let expires=Infinity,requiresCompany=false;
   for(const row of candidates.slice(0,LIMIT)){
    signal.throwIfAborted();if(typeof row.id!=='string'||typeof row.at!=='string')throw Error('Invalid notification candidate');
    const intent=await repository.findIntent(row.id);
    if(!intent||intent.employeeId!==proof.employee.id||intent.environment!==environment||Date.parse(intent.dueAt)>now.getTime()||Date.parse(intent.expiresAt)<=now.getTime())continue;
    const check=await repository.check(intent,proof.employee.id,now,'open');
    if(check.reason==='workspace_unavailable'||check.reason==='payroll_source_unavailable')throw Error('Notification source unavailable');
    const href=safeNotificationOpenPath(row.id);
    if(!check.deliverable||check.effectiveVersion!==intent.effectiveVersion||!href||!safeReturnTo(check.destination)||!(Date.parse(check.expiresAt)>now.getTime()))continue;
    expires=Math.min(expires,Date.parse(check.expiresAt));
    if(!['PAYROLL_PREPARATION','PAYROLL_STATEMENT','SELF_TEST'].includes(intent.source.kind))requiresCompany=true;
    items.push({id:row.id,label:labels[intent.source.kind],at:new Date(row.at).toISOString(),href,reviewState:row.read?'read':'unread',actionState:'available'});
   }
   const access=requiresCompany?await repository.recipientAccess(proof.employee.id,'operational'):null;
   if(requiresCompany&&(!access?.operationalCompany||!access.operationalAuthority))throw Error('notification_operational_authorization');
   return {items,expires,operationalAuthority:access?.operationalAuthority,coverage:candidates.length>LIMIT?'partial' as const:'complete' as const};
  }
  await project(collecting,rows(initial[guards.length]),new Date());
  const entries=[...manifest.entries.values()],values:unknown[]=[proof.employee.id,proof.sessionTokenHash,proof.employee.role,workspace.id,environment];
  const observations=entries.map(entry=>{
   const args=entry.values.map(value=>{values.push(value);return `$${values.length}`;});
   return jsonRows(entry.template.sql(args));
  });
  const statement:SqlStatement={text:`WITH facts AS MATERIALIZED (SELECT ${jsonRows(candidatesSql('$1','$5'))} AS candidates,jsonb_build_array(${observations.join(',')}) AS reads),
   observed AS MATERIALIZED (SELECT facts.*,clock_timestamp() AS at FROM facts)
   SELECT candidates,reads,to_jsonb(at) AS "observedAt",
    (SELECT LEAST(15000,FLOOR(EXTRACT(EPOCH FROM (s.expires_at-at))*1000)) FROM employee_sessions s JOIN employees e ON e.id=s.employee_id
     WHERE s.token_hash=$2 AND e.id=$1 AND e.active AND e.role=$3 AND s.expires_at>at) AS "validForMs",
    (SELECT active FROM workspaces WHERE id=$4 AND singleton=true) AS active FROM observed`,values};
  const finalStarted=performance.now(),result=await locked.transaction([...finalGuards,statement]);
  const final=result[finalGuards.length]?.[0] as {candidates:unknown;reads:unknown;observedAt:string;validForMs:number|null;active:boolean}|undefined;
  if(!final?.active||!final.validForMs||!Number.isFinite(Date.parse(final.observedAt)))throw Error('Notification final authority unavailable');
  if(Buffer.byteLength(JSON.stringify(final))>MAX_BYTES||!Array.isArray(final.reads)||final.reads.length!==entries.length)throw Error('Invalid notification observation');
  const fresh=new Map(entries.map((entry,i)=>[entry.key,rows((final.reads as unknown[])[i])]));
  const replay:SqlExecutor={transaction:async()=>{throw Error('Unexpected notification replay transaction');},query:async<T>(statement:SqlStatement)=>{
   signal.throwIfAborted();const entry=manifest.identify(statement),observed=fresh.get(entry.key);
   if(!observed)throw Error('Unobserved notification source');
   return observed.map(row=>entry.template.clockField?{...structuredClone(row),[entry.template.clockField]:final.observedAt}:structuredClone(row)) as T[];
  }};
  const projected=await project(replay,rows(final.candidates),new Date(final.observedAt));signal.throwIfAborted();
  await locked.transaction([...finalGuards,...(projected.operationalAuthority?[notificationOperationalGuard(proof.employee.id,proof.employee.role,projected.operationalAuthority)]:[]),...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])]);
  const now=performance.now(),validForMs=Math.floor(Math.min(Number(final.validForMs)-(now-finalStarted),originalBudget-(now-started),projected.expires-Date.parse(final.observedAt)));
  if(validForMs<=0)return {state:'unavailable',reason:'access_denied'};
  return parseEmployeeView({state:'ready',kind:'notifications',items:projected.items,coverage:projected.coverage,observedAt:final.observedAt,validForMs},'notifications');
 }catch(error){return {state:'unavailable',reason:isManagementAuthorizationError(error)||isNotificationOperationalAuthorizationError(error)?'access_denied':'read_failed'};}
}

/** Read only the exact canonical manifest, then fence the normalized source
 * observation before/after the actual UPDATE. The only normalized intent field
 * is read_at, the timestamp this command itself changes. */
export async function markManagementNotificationRead(proof:SessionMutationProof,id:string,environment:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<boolean>{
 if(!['OWNER','MANAGER'].includes(proof.employee.role)||!/^[a-f0-9]{64}$/.test(proof.sessionTokenHash)||!id||id.length>100||(environment!=='test'&&environment!=='production'))return false;
 const signal=AbortSignal.timeout(8000),bounded=boundedExecutor(executor,signal),workspace=await getWorkspace(bounded),guards=employeeViewGuards(proof,workspace,false);
 try{
  await bounded.transaction(guards);
  const manifest=notificationReadManifest(true),cache=new Map<string,Record<string,unknown>[]>();let bytes=0;
  const collecting:SqlExecutor={transaction:async()=>{throw Error('Unexpected notification read transaction');},query:async<T>(statement:SqlStatement)=>{
   signal.throwIfAborted();const entry=manifest.identify(statement);
   if(!cache.has(entry.key)){
    const [observed]=await bounded.query<{rows:unknown}>({text:`SELECT ${jsonRows(statement.text)} AS rows`,values:entry.values}),data=rows(observed?.rows);
    bytes+=Buffer.byteLength(JSON.stringify(data));if(bytes>MAX_BYTES)throw Error('Notification read observation too large');cache.set(entry.key,data);
   }
   return structuredClone(cache.get(entry.key)!) as T[];
  }};
  const state=sqlNotificationStateRepository(collecting,workspace),intent=await state.findIntent(id),now=new Date();
  if(!intent||intent.employeeId!==proof.employee.id||intent.environment!==environment||Date.parse(intent.dueAt)>now.getTime()||Date.parse(intent.expiresAt)<=now.getTime())return false;
  const check=await state.check(intent,proof.employee.id,now,'open');
  if(check.reason==='workspace_unavailable'||check.reason==='payroll_source_unavailable')throw Error('Notification source unavailable');
  if(!check.deliverable||check.effectiveVersion!==intent.effectiveVersion||!safeReturnTo(check.destination)||Date.parse(check.expiresAt)<=now.getTime())return false;
  const entries=[...manifest.entries.values()],values:unknown[]=[];
  const normalized=entries.map(entry=>(cache.get(entry.key)??[]).map(row=>{
   const copy={...row};if(entry.template.clockField)delete copy[entry.template.clockField];if(entry.template.name==='intent')delete copy.read_at;return copy;
  }));
  const reads=entries.map(entry=>{
   const args=entry.values.map(value=>{values.push(value);return `$${values.length}`;}),removed=[...(entry.template.clockField?[entry.template.clockField]:[]),...(entry.template.name==='intent'?['read_at']:[])];
   const row='to_jsonb(r)'+removed.map(key=>`-'${key}'`).join('');
   return `(SELECT COALESCE(jsonb_agg(${row}),'[]'::jsonb) FROM (${entry.template.sql(args)}) r)`;
  });
  values.push(JSON.stringify(normalized));const expected=`$${values.length}`;values.push(check.expiresAt);const until=`$${values.length}`;
  const current:SqlStatement={text:`SELECT(CASE WHEN jsonb_build_array(${reads.join(',')})=${expected}::jsonb AND clock_timestamp()<${until}::timestamptz THEN '1' ELSE 'notification_read_conflict' END)::integer`,values};
  const update:SqlStatement={text:`UPDATE notifications SET read_at=COALESCE(read_at,clock_timestamp()) WHERE id=$1 AND employee_id=$2 AND environment=$3 AND cancelled_at IS NULL AND expires_at>clock_timestamp() AND due_at<=clock_timestamp() AND ${notificationOperationalAllowedSql('notifications')} RETURNING id`,values:[id,proof.employee.id,environment]};
  const prefix=[...guards,current],result=await bounded.transaction([...prefix,update,current,...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])]);
  if(result[prefix.length]?.length!==1)return false;
  // Post-await loss suppresses acknowledgement without rewriting known history.
  await bounded.transaction([...guards,current,...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])]);
  return true;
 }catch(error){
  if(isManagementAuthorizationError(error)||isNotificationOperationalAuthorizationError(error)||error&&typeof error==='object'&&'code'in error&&error.code==='22P02'&&'message'in error&&error.message==='invalid input syntax for type integer: "notification_read_conflict"')return false;
  throw error;
 }
}
