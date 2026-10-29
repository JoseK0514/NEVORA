'use client';
import Link from 'next/link';
import {useEffect,useRef,type ReactNode} from 'react';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import type {EmployeeHoursSnapshot,HoursView} from '@/lib/employee-hours';
import type {PrivatePanelState} from '@/lib/private-snapshot-client';
export function HoursFrame({title,sub,back,backLabel,contextKey,view,editing=false,state,ready,refresh,children}:{title:string;sub:string;back:string|null;backLabel:string|null;contextKey:string;view:HoursView;editing?:boolean;state:PrivatePanelState<EmployeeHoursSnapshot>;ready:boolean;refresh:()=>void;children:ReactNode}){
 const heading=useRef<HTMLHeadingElement>(null),focused=useRef<string|null>(null);
 useEffect(()=>{if(!ready||focused.current===contextKey)return;focused.current=contextKey;const target=window.location.hash.slice(1);if(target&&document.getElementById(target))document.getElementById(target)?.focus();else heading.current?.focus();},[ready,contextKey]);
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 return <div className="q-page em-requests em-hours" data-hours-context={contextKey} data-hours-view={view} data-hours-state={state.paused?'paused':ready?'ready':denied?'denied':state.refreshing?'loading':'unavailable'}>
  <header className="em-request-heading">{back&&backLabel?<Link href={back} className="em-request-back"><CaretLeftIcon size={18} aria-hidden="true"/>{backLabel}</Link>:null}<h1 ref={heading} tabIndex={-1}>{title}</h1><p>{sub}</p></header>
  <div className="em-request-body">
   {!editing?<nav className="em-hours-tabs" aria-label="Your time"><Link href="/app/my-time" aria-current={view==='records'?'page':undefined}>Hours</Link><Link href="/app/my-time?view=cards" aria-current={view==='cards'?'page':undefined}>Timecards</Link><Link href="/app/my-time?view=corrections" aria-current={view==='corrections'?'page':undefined}>Corrections</Link></nav>:null}
   {ready?children:<section className="em-request-notice" aria-label="Time access"><p role="status">{state.paused?'Your time records are paused. Return to this page or reconnect to refresh.':denied?'Your access changed. Sign in again to continue.':state.refreshing?'Checking your current time records…':'Your records couldn’t be checked.'}</p>{denied?<Link className="em-request-secondary" href="/login">Sign in</Link>:<button className="em-request-secondary" type="button" disabled={state.paused||state.refreshing} onClick={refresh}>{state.refreshing?'Checking…':'Try again'}</button>}</section>}
   {ready?<footer className="em-request-footer"><span>Your information only</span><button type="button" disabled={state.refreshing} onClick={refresh}>{state.refreshing?'Refreshing…':'Refresh'}</button></footer>:null}
  </div>
 </div>;
}
