'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
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
const day=(date:string,weekday=false)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',...(weekday?{weekday:'long'}:{}),month:'long',day:'numeric',...(weekday?{}:{year:'numeric'})}).format(utc(date));
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
export function EmployeePayView({statements,loading,error,errorCode,nextPay,statement:target,document:failure,reload}:PayView){
 const [open,setOpen]=useState<string|null>(target);
 const notice=useRef<HTMLDivElement>(null),returnTo=useRef<string|null>(null),arrived=useRef(false);
 const arranged=statements?arrangeStatements(statements):null;
 const found=!!target&&!!statements?.some(item=>item.id===target);
 const missing=!!target&&!!statements&&!found;
 const byId=new Map((statements??[]).map(item=>[item.id,item]));
 // One announcement on arrival: a failed PDF, a notification's statement, or that it is no longer available.
 useEffect(()=>{
  if(arrived.current||(!failure&&!target)||(target&&!statements))return;
  arrived.current=true;
  const frame=requestAnimationFrame(()=>{
   if(failure||missing)notice.current?.focus();
   else document.getElementById(arranged?.latest?.id===target?'pay-latest-title':`pay-statement-${target}`)?.focus();
   if(location.search)history.replaceState(history.state,'','/app/my-pay');
  });
  return()=>cancelAnimationFrame(frame);
 },[failure,target,statements,missing,arranged?.latest?.id]);
 // Returning from a PDF reloads the list; put focus back on the control that opened it.
 useEffect(()=>{
  if(!statements||!returnTo.current)return;
  const id=returnTo.current,frame=requestAnimationFrame(()=>{const el=document.getElementById(id);if(el&&(document.activeElement===document.body||!document.activeElement)){el.focus();returnTo.current=null;}});
  return()=>cancelAnimationFrame(frame);
 },[statements]);
 const actions=(item:Statement,where:string)=>{
  const label=`statement, payday ${day(item.payday)}`;
  return <div className="em-pay-actions">
   {item.viewUrl?<a id={`pay-view-${where}-${item.id}`} className="em-request-primary" href={`${documentHref(item)}/view`} target="_blank" rel="noopener" aria-label={`View ${label} (opens in a new tab)`} onClick={()=>{returnTo.current=`pay-view-${where}-${item.id}`;}}><ArrowSquareOutIcon size={20} aria-hidden="true"/>View PDF</a>:null}
   <a id={`pay-download-${where}-${item.id}`} className={item.viewUrl?'em-request-secondary':'em-request-primary'} href={documentHref(item)} aria-label={`Download ${label}`} onClick={()=>{returnTo.current=`pay-download-${where}-${item.id}`;}}><DownloadSimpleIcon size={20} aria-hidden="true"/>Download PDF</a>
  </div>;
 };
 const relation=(item:Statement)=>item.correctedBy?<p className="em-pay-relation">A corrected statement replaced this one. Use the corrected statement for this period.{byId.has(item.correctedBy)?<> <a className="em-pay-link" href={`#pay-statement-${item.correctedBy}`} onClick={event=>{event.preventDefault();const next=item.correctedBy!;if(arranged?.latest?.id===next)document.getElementById('pay-latest-title')?.focus();else{setOpen(next);requestAnimationFrame(()=>document.getElementById(`pay-statement-${next}`)?.focus());}}}>Go to the corrected statement</a></>:null}</p>
  :item.corrects?<p className="em-pay-relation">This corrects your earlier statement for the same period.</p>:null;
 const chip=(item:Statement)=>item.correctedBy?<span className="em-pay-chip em-pay-chip--muted">Replaced</span>:item.corrects?<span className="em-pay-chip">Correction</span>:null;
 const paused=errorCode==='PAUSED'||errorCode==='OFFLINE',signedOut=errorCode==='401',off=errorCode==='MODULE_OFF';
 const state=loading?'loading':signedOut?'signed-out':off?'module-off':paused?'paused':error?'error':!arranged?.latest?'empty':'ready';
 return <div className="em-requests em-pay" data-pay-state={state}>
  <header className="em-request-heading"><Link className="em-request-back" href="/app/more"><CaretLeftIcon size={18} aria-hidden="true"/>More</Link><h1>Pay</h1><p>Your published pay statements</p></header>
  <div className="em-pay-body">
   {failure||missing?<div ref={notice} tabIndex={-1} className="em-pay-notice em-pay-notice--caution" role="alert" aria-labelledby="pay-notice-title">
    <div className="em-pay-notice-heading"><WarningCircleIcon size={24} aria-hidden="true"/><h2 id="pay-notice-title">{failure==='failed'?'We couldn’t open that statement':'That statement isn’t available'}</h2></div>
    <p>{failure==='failed'?'It didn’t pass NEVORA’s file check, so it wasn’t opened. Try again later, or ask your manager.':'It may have been replaced, or your access changed. Your current statements are below.'}</p>
   </div>:null}
   {nextPay?<section className="em-pay-section" aria-labelledby="pay-next-title">
    <h2 id="pay-next-title">Next scheduled payday</h2>
    <div className="em-pay-card em-pay-next"><CalendarBlankIcon size={24} aria-hidden="true"/><span>
     <strong>{day(nextPay.payday,true)}</strong>
     <small>{[nextPay.daysUntil===0?'Today':nextPay.daysUntil===1?'Tomorrow':`In ${nextPay.daysUntil} days`,nextPay.period?`for ${payPeriod(nextPay.period.startDate,nextPay.period.endDate)}`:null].filter(Boolean).join(' · ')}</small>
     <small>From your workplace’s pay schedule. A statement appears here after payroll is published.</small>
    </span></div>
   </section>:null}
   <section className="em-pay-section" aria-labelledby="pay-latest-heading" aria-busy={loading}>
    <h2 id="pay-latest-heading">Latest statement</h2>
    {state==='loading'?<p className="em-pay-card em-pay-quiet" role="status">Loading your statements…</p>
     :state==='signed-out'?<div className="em-pay-notice" role="alert"><div className="em-pay-notice-heading"><InfoIcon size={24} aria-hidden="true"/><h3>Sign in to see your statements</h3></div><p>Your session ended. Statements stay private until you sign in again.</p><Link className="em-request-primary" href="/login?returnTo=%2Fapp%2Fmy-pay">Sign in</Link></div>
     :state==='module-off'?<div className="em-pay-notice" role="status"><div className="em-pay-notice-heading"><InfoIcon size={24} aria-hidden="true"/><h3>Pay statements are turned off</h3></div><p>Your workplace isn’t sharing pay statements in NEVORA right now. Ask your manager where to find your pay information.</p></div>
     :state==='paused'?<div className="em-pay-notice" role="status"><div className="em-pay-notice-heading"><InfoIcon size={24} aria-hidden="true"/><h3>{errorCode==='OFFLINE'?'You’re offline':'Statements are paused'}</h3></div><p>{errorCode==='OFFLINE'?'Reconnect to see your current statements.':'Statements are hidden while NEVORA is in the background. They reload when you return.'}</p></div>
     :state==='error'?<div className="em-pay-notice em-pay-notice--error" role="alert"><div className="em-pay-notice-heading"><WarningCircleIcon size={24} aria-hidden="true"/><h3>Couldn’t load your statements</h3></div><p>Check your connection, then try again.</p><button type="button" className="em-request-secondary" onClick={reload}>Try again</button></div>
     :state==='empty'?<div className="em-pay-card em-pay-quiet"><FileTextIcon size={24} aria-hidden="true"/><span><strong>No published statements yet</strong><small>Your statements appear here after your workplace publishes payroll.</small></span></div>
     :arranged?.latest?<article className="em-pay-card em-pay-latest" aria-labelledby="pay-latest-title">
      {chip(arranged.latest)}
      <h3 id="pay-latest-title" tabIndex={-1}>Payday {day(arranged.latest.payday)}</h3>
      <p>{payPeriod(arranged.latest.period.startDate,arranged.latest.period.endDate)} · PDF</p>
      {relation(arranged.latest)}
      {actions(arranged.latest,'latest')}
      {arranged.latest.viewUrl?<p className="em-pay-hint">View opens in a new tab. Close it to come back here.</p>:null}
     </article>:null}
   </section>
   {state==='ready'&&arranged&&arranged.earlier.length?<section className="em-pay-section" aria-labelledby="pay-earlier-title">
    <h2 id="pay-earlier-title">Earlier statements</h2>
    <ul className="em-pay-list">{arranged.earlier.map(item=><li key={item.id}>
     <details open={open===item.id} onToggle={event=>{const isOpen=event.currentTarget.open;setOpen(current=>isOpen?item.id:current===item.id?null:current);}}>
      <summary id={`pay-statement-${item.id}`}><span><strong>Payday {day(item.payday)}</strong><small>{payPeriod(item.period.startDate,item.period.endDate)} · PDF</small></span>{chip(item)}<CaretDownIcon size={20} aria-hidden="true"/></summary>
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
