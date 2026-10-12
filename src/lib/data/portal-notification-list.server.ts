import 'server-only';
import {readEmployeeNotificationList,notificationReadManifest} from './employee-notification-list.server';
import {employeeReadLimits,employeeViewGuards} from './employee-profile.server';
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
const labels:Record<SourceKind,string>={SCHEDULE:'Schedule update',TIME_OFF:'Time off update',EXCHANGE:'Shift request update',CALLOUT:'Callout update',AVAILABILITY:'Availability update',MANAGER_SUMMARY:'Operations need review',SELF_TEST:'Device notification test',COMMUNICATION:'Team update',PAYROLL_PREPARATION:'Payroll preparation update',PAYROLL_STATEMENT:'Pay statement update'};
const candidatesSql=(actor='$1',environment='$2')=>`SELECT id,created_at::text AS at,read_at::text AS read FROM notifications WHERE employee_id=${actor} AND environment=${environment} AND cancelled_at IS NULL ORDER BY created_at DESC,id DESC LIMIT 26`;
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
function boundedExecutor(executor:SqlExecutor,signal:AbortSignal):SqlExecutor{
 return {
  query:async<T>(statement:SqlStatement)=>{
   const result=await abortable(()=>executor.transaction([...employeeReadLimits,statement],signal),signal);
   return result[employeeReadLimits.length] as T[];
  },
  transaction:statements=>abortable(()=>executor.transaction([...employeeReadLimits,...statements],signal),signal).then(result=>result.slice(employeeReadLimits.length)),
 };
}

/** Discovery enumerates finite canonical SELECTs only. A final protected SELECT
 * observes candidate membership, source authority and session validity together.
 * Output replays canonical policy exclusively against that fresh observation. */
export async function readPortalNotificationList(proof:SessionMutationProof,environment:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<EmployeeViewSnapshot>{
 if(['EMPLOYEE','LEAD'].includes(proof.employee.role))return readEmployeeNotificationList(proof,environment,executor);
 if(!['OWNER','MANAGER'].includes(proof.employee.role)||!/^[a-f0-9]{64}$/.test(proof.sessionTokenHash))return {state:'unavailable',reason:'access_denied'};
 if(environment!=='test'&&environment!=='production')return {state:'unavailable',reason:'read_failed'};
 const signal=AbortSignal.timeout(8000),bounded=boundedExecutor(executor,signal);
 try{
  const workspace=await getWorkspace(bounded),guards=employeeViewGuards(proof,workspace,false);
  const initial=await bounded.transaction([...guards,{text:candidatesSql(),values:[proof.employee.id,environment]}]);
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
   let expires=Infinity;
   for(const row of candidates.slice(0,LIMIT)){
    signal.throwIfAborted();if(typeof row.id!=='string'||typeof row.at!=='string')throw Error('Invalid notification candidate');
    const intent=await repository.findIntent(row.id);
    if(!intent||intent.employeeId!==proof.employee.id||intent.environment!==environment||Date.parse(intent.dueAt)>now.getTime()||Date.parse(intent.expiresAt)<=now.getTime())continue;
    const check=await repository.check(intent,proof.employee.id,now,'open');
    if(check.reason==='workspace_unavailable'||check.reason==='payroll_source_unavailable')throw Error('Notification source unavailable');
    const href=safeNotificationOpenPath(row.id);
    if(!check.deliverable||check.effectiveVersion!==intent.effectiveVersion||!href||!safeReturnTo(check.destination)||!(Date.parse(check.expiresAt)>now.getTime()))continue;
    expires=Math.min(expires,Date.parse(check.expiresAt));
    items.push({id:row.id,label:labels[intent.source.kind],at:new Date(row.at).toISOString(),href,reviewState:row.read?'read':'unread',actionState:'available'});
   }
   return {items,expires,coverage:candidates.length>LIMIT?'partial' as const:'complete' as const};
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
    (SELECT LEAST(45000,FLOOR(EXTRACT(EPOCH FROM (s.expires_at-at))*1000)) FROM employee_sessions s JOIN employees e ON e.id=s.employee_id
     WHERE s.token_hash=$2 AND e.id=$1 AND e.active AND e.role=$3 AND s.expires_at>at) AS "validForMs",
    (SELECT active FROM workspaces WHERE id=$4 AND singleton=true) AS active FROM observed`,values};
  const result=await bounded.transaction([...guards,statement]);
  const final=result[guards.length]?.[0] as {candidates:unknown;reads:unknown;observedAt:string;validForMs:number|null;active:boolean}|undefined;
  if(!final?.active||!final.validForMs||!Number.isFinite(Date.parse(final.observedAt)))throw Error('Notification final authority unavailable');
  if(Buffer.byteLength(JSON.stringify(final))>MAX_BYTES||!Array.isArray(final.reads)||final.reads.length!==entries.length)throw Error('Invalid notification observation');
  const fresh=new Map(entries.map((entry,i)=>[entry.key,rows((final.reads as unknown[])[i])]));
  const replay:SqlExecutor={transaction:async()=>{throw Error('Unexpected notification replay transaction');},query:async<T>(statement:SqlStatement)=>{
   signal.throwIfAborted();const entry=manifest.identify(statement),observed=fresh.get(entry.key);
   if(!observed)throw Error('Unobserved notification source');
   return observed.map(row=>entry.template.clockField?{...structuredClone(row),[entry.template.clockField]:final.observedAt}:structuredClone(row)) as T[];
  }};
  const projected=await project(replay,rows(final.candidates),new Date(final.observedAt));signal.throwIfAborted();
  return parseEmployeeView({state:'ready',kind:'notifications',items:projected.items,coverage:projected.coverage,observedAt:final.observedAt,validForMs:Math.min(Number(final.validForMs),projected.expires-Date.parse(final.observedAt))},'notifications');
 }catch(error){return {state:'unavailable',reason:isManagementAuthorizationError(error)?'access_denied':'read_failed'};}
}

/** Explicit read changes only the recipient's timestamp, never acknowledgement. */
export async function markManagementNotificationRead(proof:SessionMutationProof,id:string,environment:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<boolean>{
 if(!['OWNER','MANAGER'].includes(proof.employee.role)||!/^[a-f0-9]{64}$/.test(proof.sessionTokenHash)||!id||id.length>100||(environment!=='test'&&environment!=='production'))return false;
 const bounded=boundedExecutor(executor,AbortSignal.timeout(8000)),workspace=await getWorkspace(bounded);
 const results=await bounded.transaction([
  ...workspaceReadGuard(workspace),
  {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
  ...managementSessionStatements(proof,proof.employee.id,[proof.employee.role]),
  {text:`UPDATE notifications SET read_at=COALESCE(read_at,clock_timestamp()) WHERE id=$1 AND employee_id=$2 AND environment=$3 AND cancelled_at IS NULL AND expires_at>clock_timestamp() AND due_at<=clock_timestamp() RETURNING id`,values:[id,proof.employee.id,environment]},
  ...managementSessionStatements(proof,proof.employee.id,[proof.employee.role]),
 ]);
 return results[results.length-3]?.length===1;
}
