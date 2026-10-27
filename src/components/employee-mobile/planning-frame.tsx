'use client';
import Link from 'next/link';
import {useEffect,useRef,type ReactNode} from 'react';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import type {EmployeePlanningSnapshot} from '@/lib/employee-planning';
import type {PrivatePanelState} from '@/lib/private-snapshot-client';
export function PlanningFrame({title,sub,back,backLabel='Requests',selection,state,ready,refresh,children}:{title:string;sub:string;back:string;backLabel?:string;selection:string;state:PrivatePanelState<EmployeePlanningSnapshot>;ready:boolean;refresh:()=>void;children:ReactNode}){
 const heading=useRef<HTMLHeadingElement>(null),focused=useRef<string|null>(null);
 useEffect(()=>{if(!ready||focused.current===selection)return;focused.current=selection;const id=window.location.hash.slice(1);if(id)document.getElementById(id)?.focus();else heading.current?.focus();},[ready,selection]);
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 return <div className="q-page em-requests em-planning" data-planning-selection={selection} data-planning-state={state.paused?'paused':ready?'ready':denied?'denied':state.refreshing?'loading':'unavailable'}>
  <header className="em-request-heading"><Link href={back} className="em-request-back"><CaretLeftIcon size={18} aria-hidden="true"/>{backLabel}</Link><h1 ref={heading} tabIndex={-1}>{title}</h1><p>{sub}</p></header>
  <div className="em-request-body">{ready?children:<section className="em-request-notice" aria-label="Planning access"><p role="status">{state.paused?'Your planning is paused. Return to this page or reconnect to refresh.':denied?'Your access changed. Sign in again to continue.':state.refreshing?'Checking your current planning…':'Your planning couldn’t be checked. Your unsent entries are kept while this page stays open.'}</p>{denied?<Link href="/login" className="em-request-secondary">Sign in</Link>:<button className="em-request-secondary" type="button" disabled={state.paused||state.refreshing} onClick={refresh}>{state.refreshing?'Checking…':'Try again'}</button>}</section>}
   {ready?<footer className="em-request-footer"><span>Your information only</span><button type="button" onClick={refresh} disabled={state.refreshing}>{state.refreshing?'Refreshing…':'Refresh'}</button></footer>:null}
  </div>
 </div>;
}
