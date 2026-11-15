import type {PoolClient} from 'pg';
import type {Business,CommerceStore} from './store';
import {accessAt,DAY} from './model';
export const lifecycleTemplates=['trial_7d','trial_1d','renewal_failed','workplace_ready'] as const;
export type LifecycleTemplate=typeof lifecycleTemplates[number];
export const lifecycleMailKey=(id:string,template:LifecycleTemplate,anchor:number)=>`lifecycle:${id}:${template}:${anchor}`;
/** Recheck at delivery; a queued notice must not survive payment, a changed
 * deadline, or a different company lifecycle. It is never a sign-in bearer. */
export function lifecycleMailCurrent(b:Business,template:LifecycleTemplate,anchor:number,now=Date.now()):boolean{
 if(b.state!=='ready'||!Number.isSafeInteger(anchor))return false;
 if(template==='workplace_ready')return b.trialStart===anchor;
 const access=accessAt(b,now);
 if(template==='renewal_failed')return b.pastDueSince===anchor&&access.reason==='payment_failed';
 if(access.state!=='trial'||b.trialEnd!==anchor)return false;
 const left=anchor-now;return template==='trial_7d'?left>DAY&&left<=7*DAY:left>0&&left<=DAY;
}
export function lifecycleMailCopy(b:Business,template:LifecycleTemplate,anchor:number){
 const origin=new URL(b.origin??'');
 if(origin.origin!==b.origin||origin.username||origin.password||!(origin.protocol==='https:'||origin.protocol==='http:'&&['127.0.0.1','localhost'].includes(origin.hostname)))throw Error('installation_not_ready');
 const ready=template==='workplace_ready',url=origin.origin+(ready?'/login':'/app/billing'),at=new Date(anchor).toUTCString();
 const subject=ready?'Your NEVORA workplace is ready':template==='renewal_failed'?'Review your NEVORA payment':'Your NEVORA trial is ending';
 const text=ready?`Your NEVORA workplace is ready. Sign in with your Employee ID and password.\n\n${url}`:template==='renewal_failed'?`Your NEVORA renewal payment needs attention. Review your plan and payment method to avoid or resolve a pause in workplace access.\n\n${url}`:`Your NEVORA trial ends soon. Trial ends: ${at}. Review your plan before workplace access is paused.\n\n${url}`;
 return {email:b.email,url,template,subject,text};
}
/** Ready is enqueued only by the actual readiness transition, never backfilled
 * for already operating workplaces. The contact is resolved again at delivery. */
export async function enqueueWorkplaceReady(store:CommerceStore,client:PoolClient,id:string,anchor:number){
 await store.enqueue(client,'mail',lifecycleMailKey(id,'workplace_ready',anchor),{businessId:id,template:'workplace_ready',anchor:String(anchor)});
}
/** Bounded candidate scan excludes existing receipts before LIMIT. Concurrent
 * workers share the existing unique job key, business locks and job leases. */
export async function scheduleLifecycleMail(store:CommerceStore,now=Date.now()){
 const candidates=await store.pool.query<{id:string;template:LifecycleTemplate;anchor:string}>(`WITH due AS (
  SELECT id,CASE WHEN trial_ends_at<=$1::timestamptz+interval '1 day' THEN 'trial_1d' ELSE 'trial_7d' END AS template,trial_ends_at AS anchor
  FROM commerce.businesses WHERE state='ready' AND trial_ends_at>$1::timestamptz AND trial_ends_at<=$1::timestamptz+interval '7 days' AND (paid_through IS NULL OR paid_through<=$1::timestamptz)
  UNION ALL SELECT id,'renewal_failed',past_due_since FROM commerce.businesses WHERE state='ready' AND past_due_since IS NOT NULL AND subscription_status IN('past_due','unpaid') AND (paid_through IS NULL OR paid_through<=$1::timestamptz) AND (trial_ends_at IS NULL OR trial_ends_at<=$1::timestamptz)
 ) SELECT id::text,template,FLOOR(EXTRACT(epoch FROM anchor)*1000)::bigint::text AS anchor FROM due d WHERE NOT EXISTS(SELECT 1 FROM commerce.jobs j WHERE j.dedupe_key='lifecycle:'||d.id::text||':'||d.template||':'||FLOOR(EXTRACT(epoch FROM d.anchor)*1000)::bigint::text) ORDER BY anchor,id LIMIT 100`,[new Date(now).toISOString()]);
 for(const row of candidates.rows)await store.withBusinessLock(row.id,async(client,business)=>{
  const anchor=Number(row.anchor);if(!lifecycleMailCurrent(business,row.template,anchor,now))return;
  await store.enqueue(client,'mail',lifecycleMailKey(row.id,row.template,anchor),{businessId:row.id,template:row.template,anchor:row.anchor});
 });
 return candidates.rowCount??0;
}
