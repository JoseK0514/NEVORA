'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CalendarBlankIcon} from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import {FileTextIcon} from '@phosphor-icons/react/dist/ssr/FileText';
import {ArrowSquareOutIcon} from '@phosphor-icons/react/dist/ssr/ArrowSquareOut';
import {DownloadSimpleIcon} from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {InfoIcon} from '@phosphor-icons/react/dist/ssr/Info';
import type {PayrollStatementsResponse} from '@/lib/payroll/contracts';
import type {NextPay} from '../payroll/my-pay';
import './requests.css';
import './pay.css';

type Statement=PayrollStatementsResponse['statements'][number];
export type PayView={statements:Statement[]|null;loading:boolean;error:string;errorCode:string;nextPay:NextPay;statement:string|null;document:'unavailable'|'failed'|null;reload():void};

const utc=(date:string)=>new Date(`${date}T12:00:00Z`);
const day=(date:string,weekday=false)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',...(weekday?{weekday:'long'}:{}),month:'long',day:'numeric',...(weekday?{}:{year:'numeric'})}).format(utc(date)).replace(/([A-Za-z]+) (\d)/,'$1\u00a0$2');
/** "Sep 21 – 27, 2026" or "Sep 28 – Oct 4, 2026", ending with the year so history stays unambiguous. */
export function payPeriod(start:string,end:string){
 const short=(date:string,month=true)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',...(month?{month:'short'}:{}),day:'numeric'}).format(utc(date));
 return `${short(start)} – ${short(end,start.slice(0,7)!==end.slice(0,7))}, ${end.slice(0,4)}`;
}
const documentHref=(statement:Statement)=>`/api/payroll/documents/${encodeURIComponent(statement.id)}`;

/** Newest payday first; a correction comes before the statement it replaced. The latest is the newest statement
 * nothing replaced. Corrections are linked only when both statements are the person's own and published. */
export function arrangeStatements(statements:readonly Statement[]){
 const sorted=[...statements].sort((a,b)=>b.payday.localeCompare(a.payday)||Number(!!a.correctedBy)-Number(!!b.correctedBy)||a.id.localeCompare(b.id));
 const latest=sorted.find(statement=>!statement.correctedBy)??sorted[0]??null;
 return {latest,earlier:sorted.filter(statement=>statement!==latest)};
}

/** Employee/Lead phone presentation of My pay (owner: MyPay in ../payroll/my-pay.tsx, which holds the read). A
 * scheduled payday comes from the pay schedule and is never presented as a payment, amount or deposit. */
export function EmployeePayView({statements,loading,error,errorCode,nextPay,statement:arrivedTarget,document:arrivedFailure,reload}:PayView){
 // Latched on arrival: cleaning the URL re-renders the page without its parameters, and the notice must stay.
 // A new non-empty arrival (another notification, another failed PDF) replaces the latch.
 const [latch,setLatch]=useState(()=>({target:arrivedTarget,failure:arrivedFailure,seq:0}));
 const [open,setOpen]=useState<string|null>(latch.target);
 if((arrivedTarget||arrivedFailure)&&(arrivedTarget!==latch.target||arrivedFailure!==latch.failure)){setLatch({target:arrivedTarget,failure:arrivedFailure,seq:latch.seq+1});if(arrivedTarget)setOpen(arrivedTarget);}
 const {target,failure}=latch;
 const notice=useRef<HTMLDivElement>(null),returnTo=useRef<string|null>(null),arrived=useRef(-1);
 const arranged=statements?arrangeStatements(statements):null;
 const found=!!target&&!!statements?.some(item=>item.id===target);
 const missing=!!target&&!!statements&&!found;
 const byId=new Map((statements??[]).map(item=>[item.id,item]));
 // One announcement on arrival: a failed PDF, a notification's statement, or that it is no longer available.
 useEffect(()=>{
  if(arrived.current===latch.seq||(!failure&&!target)||!statements)return;
  // Marked handled only when the frame runs: Strict Mode's mount/unmount/mount cancels an earlier frame.
  const frame=requestAnimationFrame(()=>{
   arrived.current=latch.seq;
   if(failure||missing)notice.current?.focus();
   else document.getElementById(arranged?.latest?.id===target?'pay-latest-title':`pay-statement-${target}`)?.focus();
   // Next integrates native replaceState without a server round trip (router.replace fetched and could be cut off
   // by the next navigation). A refresh then can't replay this notice.
   if(location.search)history.replaceState(null,'','/app/my-pay');
  });
  return()=>cancelAnimationFrame(frame);
 },[failure,target,statements,missing,arranged?.latest?.id,latch.seq]);
 // Returning from a PDF reloads the list; put focus back on the control that opened it.
 useEffect(()=>{
  if(!statements||!returnTo.current)return;
  const id=returnTo.current,frame=requestAnimationFrame(()=>{const el=document.getElementById(id);if(el&&(document.activeElement===document.body||!document.activeElement)){el.focus();returnTo.current=null;}});
  return()=>cancelAnimationFrame(frame);
 },[statements]);
 const role=(item:Statement)=>item.correctedBy?'replaced statement':item.corrects?'corrected statement':'statement';
 const goTo=(next:string)=>{if(arranged?.latest?.id===next)document.getElementById('pay-latest-title')?.focus();else{setOpen(next);requestAnimationFrame(()=>document.getElementById(`pay-statement-${next}`)?.focus());}};
 // A replaced statement points to its correction first; its own files stay available but secondary (PAY-UI-2).
 const actions=(item:Statement,where:string)=>{
  const label=`${role(item)}, payday ${day(item.payday)}`,quiet=!!item.correctedBy;
  return <div className="em-pay-actions">
   {quiet&&item.correctedBy&&byId.has(item.correctedBy)?<button type="button" className="em-request-primary em-pay-use" onClick={()=>goTo(item.correctedBy!)}>Use the corrected statement</button>:null}
   {item.viewUrl?<a id={`pay-view-${where}-${item.id}`} className={quiet?'em-request-secondary':'em-request-primary'} href={`${documentHref(item)}/view`} target="_blank" rel="noopener" aria-label={`View ${label} (opens separately)`} onClick={()=>{returnTo.current=`pay-view-${where}-${item.id}`;}}><ArrowSquareOutIcon size={20} aria-hidden="true"/>View</a>:null}
   <a id={`pay-download-${where}-${item.id}`} className={item.viewUrl||quiet?'em-request-secondary':'em-request-primary'} href={documentHref(item)} download={item.filename} aria-label={`Download ${label}`} onClick={()=>{returnTo.current=`pay-download-${where}-${item.id}`;}}><DownloadSimpleIcon size={20} aria-hidden="true"/>Download</a>
  </div>;
 };
 const relation=(item:Statement)=>item.correctedBy?<p className="em-pay-relation">A corrected statement replaced this one. Use the corrected statement for this period.</p>
  :item.corrects?<p className="em-pay-relation">This corrects your earlier statement for the same period.</p>:null;
 const chip=(item:Statement)=>item.correctedBy?<span className="em-pay-chip em-pay-chip--muted">Replaced</span>:item.corrects?<span className="em-pay-chip">Correction</span>:null;
 const paused=errorCode==='PAUSED'||errorCode==='OFFLINE',signedOut=errorCode==='SIGNED_OUT',off=errorCode==='MODULE_OFF';
 const state=loading?'loading':signedOut?'signed-out':off?'module-off':paused?'paused':error?'error':!arranged?.latest?'empty':'ready';
 // Statements can only follow in these states, so only these show arrival notices and the scheduled payday.
 const listed=state==='ready'||state==='empty'||state==='loading';
 const surface=(tone:''|'caution'|'error',icon:ReactNode,title:string,body:string,action?:ReactNode,live:'status'|'alert'='status')=><div className={`em-pay-notice${tone?' em-pay-notice--'+tone:''}`} role={live} aria-labelledby={`pay-${state}-title`}><div className="em-pay-notice-heading">{icon}<h2 id={`pay-${state}-title`}>{title}</h2></div><p>{body}</p>{action}</div>;
 return <div className="em-requests em-pay" data-pay-state={state}>
  {/* Pay is a top-level tab, like Hours and Schedule: no back link. */}
  <header className="em-request-heading"><h1>Pay</h1><p>Your published pay statements</p></header>
  <div className="em-pay-body" aria-busy={loading}>
   {(failure||missing)&&listed&&state!=='loading'?<div ref={notice} tabIndex={-1} className="em-pay-notice em-pay-notice--caution" role="alert" aria-labelledby="pay-notice-title">
    <div className="em-pay-notice-heading"><WarningCircleIcon size={24} aria-hidden="true"/><h2 id="pay-notice-title">{failure==='failed'?'We couldn’t open that statement':'That statement isn’t available'}</h2></div>
    <p>{failure==='failed'?'It didn’t pass NEVORA’s file check, so it wasn’t opened. Try again later, or ask your manager.':state==='empty'?'It may have been replaced, or your access changed.':'It may have been replaced, or your access changed. Your current statements are below.'}</p>
   </div>:null}
   {nextPay&&listed?<section className="em-pay-section" aria-labelledby="pay-next-title">
    <h2 id="pay-next-title">Next scheduled payday</h2>
    <div className="em-pay-card em-pay-next"><CalendarBlankIcon size={22} aria-hidden="true"/><span>
     <strong>{day(nextPay.payday,true)}</strong>
     <small>{[nextPay.daysUntil===0?'Today':nextPay.daysUntil===1?'Tomorrow':`In ${nextPay.daysUntil} days`,nextPay.period?`for ${payPeriod(nextPay.period.startDate,nextPay.period.endDate)}`:null].filter(Boolean).join(' · ')}</small>
     <small>From your workplace’s pay schedule. A statement appears here after payroll is published.</small>
    </span></div>
   </section>:null}
   {state==='loading'?<p className="em-pay-card em-pay-quiet" role="status">Loading your statements…</p>
    :state==='signed-out'?surface('',<InfoIcon size={24} aria-hidden="true"/>,'Sign in to see your statements','Your session ended. Statements stay private until you sign in again.',<Link className="em-request-primary" href="/login?returnTo=%2Fapp%2Fmy-pay">Sign in</Link>,'alert')
    :state==='module-off'?surface('',<InfoIcon size={24} aria-hidden="true"/>,'Pay statements are turned off','Your workplace isn’t sharing pay statements in NEVORA right now. Ask your manager where to find your pay information.')
    :state==='paused'?surface('',<InfoIcon size={24} aria-hidden="true"/>,errorCode==='OFFLINE'?'You’re offline':'Statements are paused',errorCode==='OFFLINE'?'Reconnect to see your current statements.':'Statements are hidden while NEVORA is in the background. They reload when you return.')
    :state==='error'?surface('error',<WarningCircleIcon size={24} aria-hidden="true"/>,'Couldn’t load your statements','Check your connection, then try again.',<button type="button" className="em-request-secondary" onClick={reload}>Try again</button>,'alert')
    :state==='empty'?<div className="em-pay-card em-pay-quiet"><FileTextIcon size={22} aria-hidden="true"/><span><strong>No published statements yet</strong><small>Your statements appear here after your workplace publishes payroll.</small></span></div>
    :arranged?.latest?<section className="em-pay-section" aria-labelledby="pay-latest-heading">
     <h2 id="pay-latest-heading">Latest statement</h2>
     <article className="em-pay-card em-pay-latest" aria-labelledby="pay-latest-title">
      <h3 id="pay-latest-title" tabIndex={-1}>Payday {day(arranged.latest.payday)}</h3>
      <p>{payPeriod(arranged.latest.period.startDate,arranged.latest.period.endDate)} · PDF</p>
      {chip(arranged.latest)}
      {relation(arranged.latest)}
      {actions(arranged.latest,'latest')}
      {arranged.latest.viewUrl?<p className="em-pay-hint">View opens the PDF on its own. Close it to come back to Pay.</p>:null}
     </article>
    </section>:null}
   {state==='ready'&&arranged&&arranged.earlier.length?<section className="em-pay-section" aria-labelledby="pay-earlier-title">
    <h2 id="pay-earlier-title">Earlier statements</h2>
    <ul className="em-pay-list">{arranged.earlier.map(item=><li key={item.id}>
     <details open={open===item.id} onToggle={event=>{const isOpen=event.currentTarget.open;setOpen(current=>isOpen?item.id:current===item.id?null:current);}}>
      <summary id={`pay-statement-${item.id}`}><span><strong>Payday {day(item.payday)}</strong><small>{payPeriod(item.period.startDate,item.period.endDate)} · PDF</small>{chip(item)}</span><CaretDownIcon size={20} aria-hidden="true"/></summary>
      <div>{relation(item)}{actions(item,'earlier')}</div>
     </details>
    </li>)}</ul>
   </section>:null}
   <section className="em-pay-section" aria-labelledby="pay-hours-title">
    <h2 id="pay-hours-title">Your hours</h2>
    <ul className="em-pay-links"><li><Link href="/app/my-time">My time<CaretRightIcon size={20} aria-hidden="true"/></Link></li><li><Link href="/app/timecards">Timecards<CaretRightIcon size={20} aria-hidden="true"/></Link></li></ul>
   </section>
   <p className="em-pay-privacy">Only your own published statements are available here. Downloaded files may contain personal pay information.</p>
  </div>
 </div>;
}
