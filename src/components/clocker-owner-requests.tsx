'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {createPrivateSnapshotController} from '../lib/private-snapshot-client';
import type {OwnerReviewRequestsResult} from '../lib/clocker/review-requests.server';
export function ClockerOwnerRequests({actorId,timeZone,onSelect}:{actorId:string;timeZone:string;onSelect:(reference:string)=>void}){
 const [state,setState]=useState<OwnerReviewRequestsResult|null>(null),[loading,setLoading]=useState(true),cursor=useRef<string|undefined>(undefined),controller=useRef<ReturnType<typeof createPrivateSnapshotController<OwnerReviewRequestsResult>>|null>(null);
 // Reliability R-05: a routine renewal keeps the current list (and the reader's place and focus) on screen; the
 // controller still clears it the moment it expires, access ends or the window is left.
 useEffect(()=>{
  const c=createPrivateSnapshotController<OwnerReviewRequestsResult>(s=>{const shown=s.refreshing&&s.snapshot?.state!=='ready'?null:s.snapshot;setState(shown);setLoading(s.refreshing&&!shown);},async signal=>{
   const response=await fetch('/api/owner/clocker-recovery',{method:'POST',credentials:'same-origin',cache:'no-store',signal,headers:{'content-type':'application/json','x-nevora-clocker-recovery':'1','x-nevora-actor':actorId},body:JSON.stringify({operation:'requests',limit:50,...(cursor.current?{cursor:cursor.current}:{})})});
   if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'};if(!response.ok)throw Error();return response.json();
  },value=>{const v=value as OwnerReviewRequestsResult;if(v?.state==='unavailable')return v;if(v?.state!=='ready'||!Array.isArray(v.requests)||v.requests.length>100||!Number.isFinite(v.validForMs)||v.validForMs<1||v.validForMs>15000||!Number.isFinite(Date.parse(v.observedAt))||v.nextCursor!==null&&typeof v.nextCursor!=='string'||v.requests.some(r=>!r||typeof r.requestId!=='string'||typeof r.requesterName!=='string'||typeof r.deviceName!=='string'||typeof r.locationName!=='string'||typeof r.requestedAt!=='string'||!Number.isFinite(Date.parse(r.requestedAt))||r.commandId!==null&&typeof r.commandId!=='string'))throw Error();return v;},reason=>({state:'unavailable',reason}),()=> 'read_failed');
  controller.current=c;const active=()=>{if(document.visibilityState==='visible'&&navigator.onLine)c.start();else c.pause();},pause=()=>c.pause();
  for(const name of ['focus','pageshow','online'])window.addEventListener(name,active);for(const name of ['blur','pagehide','offline'])window.addEventListener(name,pause);document.addEventListener('visibilitychange',active);active();
  return()=>{c.stop();controller.current=null;for(const name of ['focus','pageshow','online'])window.removeEventListener(name,active);for(const name of ['blur','pagehide','offline'])window.removeEventListener(name,pause);document.removeEventListener('visibilitychange',active);};
 },[actorId]);
 const ready=state?.state==='ready'?state:null;
 const when=(at:string)=>new Intl.DateTimeFormat('en-US',{timeZone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(at));
 // Release 1: the requests in one card like the boards' lists (who asked, where, when), a teal Refresh in its header,
 // and one way to check each. No internal wording; the request id stays for screen readers only.
 return <section className="q-list wc-help" aria-labelledby="clocker-review-requests"><div className="wc-cardhead"><h2 id="clocker-review-requests">Help requests</h2><button type="button" className="wc-textbtn" disabled={loading} onClick={()=>{cursor.current=undefined;controller.current?.refresh();}}>Refresh</button></div>
  {loading?<p className="wc-emptyrow" role="status">Checking requests…</p>:ready?ready.requests.length?<ul>{ready.requests.map(r=><li key={r.requestId}>{r.commandId
   ?<button type="button" className="q-row" onClick={()=>onSelect(r.commandId!)} aria-label={`Check ${r.requesterName}'s clock action`}><span className="q-rt"><b>{r.requesterName}</b><i>{`${r.locationName} · ${r.deviceName} · `}<time dateTime={r.requestedAt}>{when(r.requestedAt)}</time></i></span><span className="wc-meta wc-meta--teal">Check</span></button>
   :<Link className="q-row" href="/app/timecards"><span className="q-rt"><b>{r.requesterName}</b><i>{`${r.locationName} · `}<time dateTime={r.requestedAt}>{when(r.requestedAt)}</time>{' · Fix it in Timecards'}</i></span><span className="q-sr">{`Request ${r.requestId}`}</span></Link>}</li>)}</ul>
  :<p className="wc-emptyrow" role="status">No one needs help right now</p>:<p className="wc-emptyrow" role="status">Couldn’t load requests. Refresh to try again.</p>}
  {ready?.nextCursor?<button className="wc-addrow" type="button" disabled={loading} onClick={()=>{cursor.current=ready.nextCursor!;controller.current?.refresh();}}>Show more requests</button>:null}</section>;
}
