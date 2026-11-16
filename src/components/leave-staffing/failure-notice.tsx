'use client';
import {useEffect,useRef,useState} from 'react';
import {FAILURE_EVENT,FAILURE_MESSAGES,type FailureRecovery} from '@/lib/http/nevora-failure';
import './leave-staffing.css';

/** The page-level side of X-Nevora-Failure (Nov 9, 2026). Each read already clears its own protected data and says
 * "couldn't load" in place; this one notice says why, once, in the shell's words: sign in again (an ended session),
 * access changed, the page was out of date (refreshed with current authority), the connection can't be confirmed (no
 * sign-in suggestion, no address shown) or the request was malformed (no retry as another command). */
export function NevoraFailureNotice(){
 const [recovery,setRecovery]=useState<Exclude<FailureRecovery,'unavailable'|'reread'>|null>(null);
 const box=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const listen=(event:Event)=>{
   const value=(event as CustomEvent<{recovery?:FailureRecovery}>).detail?.recovery;
   if(!value||value==='unavailable'||value==='reread'||!(value in FAILURE_MESSAGES))return;
   setRecovery(previous=>previous==='sign_in'||previous==='origin'?previous:value as Exclude<FailureRecovery,'unavailable'|'reread'>);
   // view_invalid: discard the mounted view and load current authority (a fresh page), at most once a minute so a view
   // that stays invalid can't loop; after that the notice stays and the person reloads.
   if(value==='refresh_view'){let last=0;try{last=Number(sessionStorage.getItem('nv-view-refresh')??0);sessionStorage.setItem('nv-view-refresh',String(Date.now()));}catch{last=Date.now();}
    if(Date.now()-last>60000)window.location.reload();}
  };
  window.addEventListener(FAILURE_EVENT,listen);return()=>window.removeEventListener(FAILURE_EVENT,listen);
 },[]);
 useEffect(()=>{if(recovery&&recovery!=='refresh_view')box.current?.focus({preventScroll:true});},[recovery]);
 if(!recovery)return null;
 const message=FAILURE_MESSAGES[recovery];
 return <div ref={box} className="ls-failure" role={recovery==='refresh_view'?'status':'alert'} tabIndex={-1} data-recovery={recovery}>
  <span className="ls-failure__tx"><b>{message.title}</b><span>{message.body}</span></span>
  <span className="ls-failure__acts">
   {recovery==='sign_in'?<a className="b-btn b-btn--teal" href="/login">Sign in</a>:null}
   {recovery==='contract'||recovery==='refresh_view'?<button type="button" className="b-btn b-btn--quiet" onClick={()=>window.location.reload()}>Reload</button>:null}
   <button type="button" className="b-btn b-btn--quiet" onClick={()=>setRecovery(null)} aria-label="Close this message">Close</button>
  </span>
 </div>;
}
