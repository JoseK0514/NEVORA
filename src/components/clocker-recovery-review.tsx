'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {createPrivateSnapshotController} from '../lib/private-snapshot-client';
import type {RecoveryReview} from '../lib/clocker/recovery-review.server';
export function ClockerRecoveryReview({actorId}:{actorId:string}){
 const [reference,setReference]=useState(''),[state,setState]=useState<RecoveryReview|null>(null),[loading,setLoading]=useState(true);
 const selected=useRef(''),controller=useRef<ReturnType<typeof createPrivateSnapshotController<RecoveryReview>>|null>(null);
 useEffect(()=>{
  const c=createPrivateSnapshotController<RecoveryReview>(value=>{setState(value.refreshing?null:value.snapshot);setLoading(value.refreshing);},async signal=>{
   if(!selected.current)return {state:'unavailable',reason:'no_selection'};
   const response=await fetch('/api/manager/clocker-recovery',{method:'POST',credentials:'same-origin',cache:'no-store',signal,headers:{'Content-Type':'application/json','X-Nevora-Clocker-Recovery':'1','X-Nevora-Actor':actorId},body:JSON.stringify({commandId:selected.current})});
   if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'};
   if(!response.ok)throw Error('Unavailable');return response.json();
  },value=>{
   const v=value as RecoveryReview;
   if(v?.state==='unavailable')return v;
   if(v?.state!=='ready'||v.commandId!==selected.current||!Array.isArray(v.receipts)||v.receipts.length>100||!Number.isFinite(v.validForMs)||v.validForMs<1||v.validForMs>15000||!Number.isFinite(Date.parse(v.observedAt)))throw Error('Invalid receipt review');return v;
  },reason=>({state:'unavailable',reason}),()=> 'read_failed');controller.current=c;
  let live=false;
  const active=(event?:Event)=>{if(event?.type==='focus'&&(event.target!==window||live))return;live=document.visibilityState==='visible'&&navigator.onLine;if(live)c.start();else c.pause();};
  const pause=(event?:Event)=>{if(event?.type==='blur'&&event.target!==window)return;live=false;c.pause();};for(const name of ['focus','pageshow','online','storage'])window.addEventListener(name,active);
  for(const name of ['blur','pagehide','offline'])window.addEventListener(name,pause);document.addEventListener('visibilitychange',active);active();
  return()=>{c.stop();for(const name of ['focus','pageshow','online','storage'])window.removeEventListener(name,active);for(const name of ['blur','pagehide','offline'])window.removeEventListener(name,pause);document.removeEventListener('visibilitychange',active);controller.current=null;};
 },[actorId]);
 return <section className="panel"><h2>Check a saved action</h2><p>Use the reference shown on the registered tablet. Review the saved receipt with the employee before resolving their recovery screen.</p>
  <form onSubmit={e=>{e.preventDefault();selected.current=reference.trim();controller.current?.refresh();}}><fieldset disabled={loading} style={{border:0,margin:0,padding:0,minWidth:0}}><label className="field">Saved action reference<input required value={reference} onChange={e=>{setReference(e.target.value);setState(null);}} pattern="[0-9a-fA-F-]{36}" maxLength={36}/></label><button className="button primary" disabled={loading}>Check receipt</button></fieldset></form>
  {loading?<p role="status">Checking the immutable ledger…</p>:state?.state==='ready'?<>
   <p>Reference: <code style={{overflowWrap:'anywhere'}}>{state.commandId}</code></p>
   {state.receipts.length?state.receipts.map((r,i)=><article key={i}><h3>Recorded action</h3><p>{r.employeeName} · {r.action} · {r.performedAt}</p><p>{r.deviceName} · {r.locationName}</p><p>Ask this employee to enter their PIN on the same tablet and check their action status. That screen verifies the receipt before clearing only their resolved intent.</p></article>):<p role="status">No committed receipt was observed. The action remains unconfirmed. Keep the recovery record. Ask the employee to verify their PIN and check the action on the same registered tablet; an absent receipt alone does not cancel an in-flight request.</p>}
   <p>Other employees can use their own PIN and record their work. If this tablet cannot store recovery data, use another registered tablet at this location while keeping the original record for review.</p>
   <Link href="/app/timecards">Review timecards</Link><p>Use the existing correction workflow for missing or incorrect recorded time after reviewing the employee’s evidence. Preserve the original reference.</p>
  </>:state?.state==='unavailable'&&state.reason!=='no_selection'?<p role="alert">{state.reason==='access_denied'?'Recovery review access ended. Sign in again.':'Recovery review unavailable. Keep the saved action and try again.'}</p>:null}
 </section>;
}
