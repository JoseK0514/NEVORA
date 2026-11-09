import 'server-only';
import type {SqlExecutor} from '../notifications/types';
export type QueueHealth={workspaceId:string;observedAt:string;payroll:{due:number;failed:number;expiredLeases:number;oldestDueSeconds:number};notifications:{dueIntents:number;dueDeliveries:number;failed:number;expiredLeases:number;oldestDueSeconds:number}};
const liveNotice="n.environment=$1 AND n.expires_at>t.now AND n.push_state NOT IN('cancelled','expired')";
const liveDelivery=liveNotice+' AND d.expires_at>t.now';
const dueDelivery="((d.status IN('queued','retry_pending') AND d.next_attempt_at<=t.now) OR (d.status='processing' AND d.lease_expires_at<=t.now))";
const duePayroll="j.workspace_id=w.id AND j.available_at<=t.now AND (j.status='PENDING' OR (j.status='RUNNING' AND j.lease_until<=t.now))";
// One database-clock observation and SELECT-only aggregates. No employee, payload,
// endpoint, credential, source text or individual job identifier is projected.
const observationSql=`WITH observe AS MATERIALIZED(SELECT clock_timestamp() AS now)
SELECT w.id AS workspace_id,t.now::text AS observed_at,
 (SELECT count(*) FROM payroll_jobs j WHERE ${duePayroll}) AS payroll_due,
 (SELECT count(*) FROM payroll_jobs j WHERE j.workspace_id=w.id AND j.status='FAILED') AS payroll_failed,
 (SELECT count(*) FROM payroll_jobs j WHERE j.workspace_id=w.id AND j.status='RUNNING' AND j.lease_until<=t.now) AS payroll_expired_leases,
 (SELECT coalesce(floor(extract(epoch FROM(t.now-min(CASE WHEN j.status='RUNNING' THEN j.lease_until ELSE j.available_at END))))::bigint,0) FROM payroll_jobs j WHERE ${duePayroll}) AS payroll_oldest_due_seconds,
 (SELECT count(*) FROM notifications n WHERE ${liveNotice} AND n.push_state='pending' AND n.due_at<=t.now) AS notification_due_intents,
 (SELECT count(*) FROM push_deliveries d JOIN notifications n ON n.id=d.notification_id WHERE ${liveDelivery} AND ${dueDelivery}) AS notification_due_deliveries,
 (SELECT count(*) FROM push_deliveries d JOIN notifications n ON n.id=d.notification_id WHERE ${liveDelivery} AND d.status='failed') AS notification_failed,
 (SELECT count(*) FROM push_deliveries d JOIN notifications n ON n.id=d.notification_id WHERE ${liveDelivery} AND d.status='processing' AND d.lease_expires_at<=t.now) AS notification_expired_leases,
 (SELECT coalesce(floor(extract(epoch FROM(t.now-min(at))))::bigint,0) FROM(
   SELECT n.due_at AS at FROM notifications n WHERE ${liveNotice} AND n.push_state='pending' AND n.due_at<=t.now
   UNION ALL
   SELECT CASE WHEN d.status='processing' THEN d.lease_expires_at ELSE d.next_attempt_at END AS at FROM push_deliveries d JOIN notifications n ON n.id=d.notification_id WHERE ${liveDelivery} AND ${dueDelivery}
 ) due) AS notification_oldest_due_seconds
FROM workspaces w CROSS JOIN observe t WHERE w.singleton AND w.active`;
const count=(v:unknown)=>{
 if(typeof v==='string'&&/^(0|[1-9][0-9]*)$/.test(v))v=Number(v);
 if(typeof v!=='number'||!Number.isSafeInteger(v)||v<0)throw Error('operations_health_unavailable');return v;
};
export async function readQueueHealth(ex:SqlExecutor,environment:'test'|'production',callerSignal?:AbortSignal):Promise<QueueHealth>{
 if(!['test','production'].includes(environment))throw Error('operations_configuration_invalid');
 const signal=callerSignal?AbortSignal.any([callerSignal,AbortSignal.timeout(5000)]):AbortSignal.timeout(5000);
 let onAbort=()=>{};
 try{
  signal.throwIfAborted();
  const aborted=new Promise<never>((_ok,bad)=>{onAbort=()=>bad(Error('operations_health_unavailable'));signal.addEventListener('abort',onAbort,{once:true});});
  const rows=await Promise.race([Promise.resolve().then(()=>{signal.throwIfAborted();return ex.query<Record<string,unknown>>({text:observationSql,values:[environment]},signal);}),aborted]);
  const r=rows[0];
  if(rows.length!==1||!r||Object.keys(r).sort().join(',')!=='notification_due_deliveries,notification_due_intents,notification_expired_leases,notification_failed,notification_oldest_due_seconds,observed_at,payroll_due,payroll_expired_leases,payroll_failed,payroll_oldest_due_seconds,workspace_id'||typeof r.workspace_id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(r.workspace_id)||typeof r.observed_at!=='string'||!Number.isFinite(Date.parse(r.observed_at)))throw Error('operations_health_unavailable');
  const payroll={due:count(r.payroll_due),failed:count(r.payroll_failed),expiredLeases:count(r.payroll_expired_leases),oldestDueSeconds:count(r.payroll_oldest_due_seconds)};
  const notifications={dueIntents:count(r.notification_due_intents),dueDeliveries:count(r.notification_due_deliveries),failed:count(r.notification_failed),expiredLeases:count(r.notification_expired_leases),oldestDueSeconds:count(r.notification_oldest_due_seconds)};
  if(payroll.due===0&&payroll.oldestDueSeconds!==0||notifications.dueIntents+notifications.dueDeliveries===0&&notifications.oldestDueSeconds!==0)throw Error('operations_health_unavailable');
  return {workspaceId:r.workspace_id,observedAt:new Date(r.observed_at).toISOString(),payroll,notifications};
 }catch{throw Error('operations_health_unavailable');}
 finally{signal.removeEventListener('abort',onAbort);}
}
export function assessQueueHealth(health:QueueHealth,maxAgeSeconds:number,domain:'all'|'payroll'|'notifications'='all'):{healthy:boolean;reasons:string[]}{
 if(!Number.isSafeInteger(maxAgeSeconds)||maxAgeSeconds<1||maxAgeSeconds>86400||!['all','payroll','notifications'].includes(domain))throw Error('operations_configuration_invalid');
 const reasons:string[]=[];
 if(domain!=='notifications'){
  if(health.payroll.failed)reasons.push('payroll_failed');if(health.payroll.expiredLeases)reasons.push('payroll_expired_lease');if(health.payroll.oldestDueSeconds>maxAgeSeconds)reasons.push('payroll_queue_age');
 }
 if(domain!=='payroll'){
  if(health.notifications.failed)reasons.push('notification_failed');if(health.notifications.expiredLeases)reasons.push('notification_expired_lease');if(health.notifications.oldestDueSeconds>maxAgeSeconds)reasons.push('notification_queue_age');
 }
 return {healthy:reasons.length===0,reasons};
}
