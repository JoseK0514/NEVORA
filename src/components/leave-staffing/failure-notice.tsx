'use client';
import {useEffect,useRef,useState} from 'react';
import {FAILURE_EVENT,FAILURE_MESSAGES,type FailureRecovery} from '@/lib/http/nevora-failure';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {LEAVE_STAFFING_COPY} from './leave-staffing-copy';
import {BGlyph,type BMeaning} from '../owner-b/b-kit';
import './leave-staffing.css';

type Shown=Exclude<FailureRecovery,'unavailable'|'reread'>;
/** Phase 9 (spec 2.2, notice glyph rule): the reason's meaning, by shape and tint, in the notice's 36px ring. Grey locked
 * when the session or access ended, teal information while the page refreshes, red stop when nothing went through. */
const LOOK:Record<Shown,{tone?:'teal'|'red';meaning:BMeaning}>={
 sign_in:{meaning:'locked'},access_ended:{meaning:'locked'},refresh_view:{tone:'teal',meaning:'info'},origin:{tone:'red',meaning:'stop'},contract:{tone:'red',meaning:'stop'},
};

/** The page-level side of X-Nevora-Failure (Nov 9, 2026). Each read already clears its own protected data and says
 * "couldn't load" in place; this one notice says why, once, in the shell's words: sign in again (an ended session),
 * access changed, the page was out of date (refreshed with current authority), the connection can't be confirmed (no
 * sign-in suggestion, no address shown) or the request was malformed (no retry as another command). */
export function NevoraFailureNotice(){
 const [recovery,setRecovery]=useState<Shown|null>(null);
 // A refusal from a signed-in session (access_denied) is "not allowed", not "access changed" (QA A3-06).
 const [notAllowed,setNotAllowed]=useState(false);
 const box=useRef<HTMLDivElement>(null);
 const t=LEAVE_STAFFING_COPY[usePortalLang()];
 useEffect(()=>{
  const listen=(event:Event)=>{
   const detail=(event as CustomEvent<{recovery?:FailureRecovery;notAllowed?:boolean}>).detail,value=detail?.recovery;
   if(!value||value==='unavailable'||value==='reread'||!(value in FAILURE_MESSAGES))return;
   setRecovery(previous=>previous==='sign_in'||previous==='origin'?previous:value as Shown);
   if(value==='access_ended')setNotAllowed(detail?.notAllowed===true);
   // view_invalid: discard the mounted view and load current authority (a fresh page), at most once a minute so a view
   // that stays invalid can't loop; after that the notice stays and the person reloads.
   if(value==='refresh_view'){let last=0;try{last=Number(sessionStorage.getItem('nv-view-refresh')??0);sessionStorage.setItem('nv-view-refresh',String(Date.now()));}catch{last=Date.now();}
    if(Date.now()-last>60000)window.location.reload();}
  };
  window.addEventListener(FAILURE_EVENT,listen);return()=>window.removeEventListener(FAILURE_EVENT,listen);
 },[]);
 useEffect(()=>{if(recovery&&recovery!=='refresh_view')box.current?.focus({preventScroll:true});},[recovery]);
 if(!recovery)return null;
 const message=recovery==='access_ended'&&notAllowed?t.notAllowed:t.failures[recovery],look=LOOK[recovery];
 return <div ref={box} className="ls-failure" role={recovery==='refresh_view'?'status':'alert'} tabIndex={-1} data-recovery={recovery}>
  <span className="ls-ring" data-tone={look.tone} aria-hidden="true"><BGlyph meaning={look.meaning}/></span>
  <span className="ls-failure__tx"><b>{message.title}</b><span>{message.body}</span></span>
  <span className="ls-failure__acts">
   {recovery==='sign_in'?<a className="b-btn b-btn--teal" href="/login">{t.signIn}</a>:null}
   {recovery==='contract'||recovery==='refresh_view'?<button type="button" className="b-btn b-btn--quiet" onClick={()=>window.location.reload()}>{t.reload}</button>:null}
   <button type="button" className="b-btn b-btn--quiet" onClick={()=>setRecovery(null)} aria-label={t.closeMessage}>{t.close}</button>
  </span>
 </div>;
}
