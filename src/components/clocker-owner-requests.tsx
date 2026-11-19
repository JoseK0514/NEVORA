'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {BAvatar,BCard,BList,BRow,BState} from './owner-b/b-kit';
import {clockerOwnerCopy,clockerOwnerWhen,type ClockerOwnerLang} from './clocker-owner-copy';
import {createPrivateSnapshotController} from '../lib/private-snapshot-client';
import type {OwnerReviewRequestsResult} from '../lib/clocker/review-requests.server';
/** Help requests on Clocker recovery (Phase 6): who asked on a tablet, where and when, with one tinted action (Check
 * looks their saved punch up) and one quiet one (Fix in Timecards). Loading, empty, offline and failed are each one state
 * card inside the list's card. The private snapshot controller and its pause-on-blur are unchanged. */
export function ClockerOwnerRequests({actorId,timeZone,onSelect,lang='en'}:{actorId:string;timeZone:string;onSelect:(reference:string)=>void;lang?:ClockerOwnerLang}){
 const t=clockerOwnerCopy[lang];
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
 const offline=state?.state==='unavailable'&&state.reason==='offline';
 const refresh=()=>{cursor.current=undefined;controller.current?.refresh();};
 const row=(r:Extract<OwnerReviewRequestsResult,{state:'ready'}>['requests'][number])=>{
  const when=<time dateTime={r.requestedAt}>{clockerOwnerWhen(r.requestedAt,timeZone,lang)}</time>;
  const fix=<Link className="b-btn b-btn--quiet ck-text" href="/app/timecards" aria-label={t.fixFor(r.requesterName)}>{t.fixInTimecards}</Link>;
  return <BRow key={r.requestId} lead={<BAvatar name={r.requesterName}/>} title={r.requesterName}
   sub={<>{t.requestLine(r.locationName,r.deviceName)} · {when}{r.commandId?null:<> · {t.requestNoCode}</>}</>}
   trail={<span className="ck-acts">{r.commandId?<button type="button" className="b-btn b-btn--ghost" onClick={()=>onSelect(r.commandId!)} aria-label={t.checkFor(r.requesterName)}>{t.check}</button>:null}{fix}</span>}/>;
 };
 return <BCard id="clocker-review-requests" title={t.requestsTitle} count={ready?.requests.length?ready.requests.length:undefined}
  chip={<button type="button" className="b-btn b-btn--quiet ck-text" disabled={loading} onClick={refresh}>{t.refresh}</button>}>
  {loading?<BState kind="loading" title={t.requestsLoading}/>
   :ready?ready.requests.length?<BList label={t.requestsList}>{ready.requests.map(row)}</BList>
    :<BState kind="empty" title={t.requestsEmptyTitle} line={t.requestsEmptyBody}/>
   :offline?<BState kind="offline" title={t.requestsOfflineTitle} line={t.requestsOfflineBody}/>
   :<BState kind="failed" alert title={t.requestsFailedTitle} line={t.requestsFailedBody}><button type="button" className="b-btn b-btn--ghost" onClick={refresh}>{t.refresh}</button></BState>}
  {ready?.nextCursor?<div className="ck-foot"><button className="b-btn b-btn--ghost" type="button" disabled={loading} onClick={()=>{cursor.current=ready.nextCursor!;controller.current?.refresh();}}>{t.requestsMore}</button></div>:null}
 </BCard>;
}
