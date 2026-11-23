'use client';
import Link from 'next/link';
import {useEffect,useRef,type ReactNode} from 'react';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import type {EmployeeHoursSnapshot,HoursView} from '@/lib/employee-hours';
import type {PrivatePanelState} from '@/lib/private-snapshot-client';
import {useMobileCopy} from './mobile-lang';
import {hoursFrameCopy} from './copy/hours-frame';
export function HoursFrame({title,sub,back,backLabel,contextKey,view,editing=false,state,ready,refresh,children,corporate=false}:{/** Corporate (Release 1, board G-E-Time): no segmented tabs; Past timecards sits on the title row. */corporate?:boolean;title:string;sub:string;back:string|null;backLabel:string|null;contextKey:string;view:HoursView;editing?:boolean;state:PrivatePanelState<EmployeeHoursSnapshot>;ready:boolean;refresh:()=>void;children:ReactNode}){
 const t=useMobileCopy(hoursFrameCopy),heading=useRef<HTMLHeadingElement>(null),focused=useRef<string|null>(null);
 useEffect(()=>{if(!ready||focused.current===contextKey)return;focused.current=contextKey;const target=window.location.hash.slice(1);if(target&&document.getElementById(target))document.getElementById(target)?.focus();else heading.current?.focus();},[ready,contextKey]);
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 return <div className="q-page em-requests em-hours" data-hours-context={contextKey} data-hours-view={view} data-hours-state={state.paused?'paused':ready?'ready':denied?'denied':state.refreshing?'loading':'unavailable'}>
  <header className="em-request-heading">{back&&backLabel?<Link href={back} className="em-request-back"><CaretLeftIcon size={18} weight="bold" aria-hidden="true"/>{backLabel}</Link>:null}<h1 ref={heading} tabIndex={-1}>{title}</h1><p>{sub}</p>{corporate&&view==='records'&&!editing?<Link className="em-hours-past" href="/app/my-time?view=cards">{t.pastTimecards}</Link>:null}</header>
  <div className="em-request-body">
   {!editing&&!corporate?<nav className="em-hours-tabs" aria-label={t.yourTime}><Link href="/app/my-time" aria-current={view==='records'?'page':undefined}>{t.hours}</Link><Link href="/app/my-time?view=cards" aria-current={view==='cards'?'page':undefined}>{t.timecards}</Link><Link href="/app/my-time?view=corrections" aria-current={view==='corrections'?'page':undefined}>{t.corrections}</Link></nav>:null}
   {ready?children:<section className="em-request-notice" aria-label={t.timeAccess}><p role="status">{state.paused?t.paused:denied?t.denied:state.refreshing?t.checkingRecords:t.failed}</p>{denied?<Link className="em-request-secondary" href="/login">{t.signIn}</Link>:<button className="em-request-secondary" type="button" disabled={state.paused||state.refreshing} onClick={refresh}>{state.refreshing?t.checking:t.tryAgain}</button>}</section>}
  </div>
 </div>;
}
