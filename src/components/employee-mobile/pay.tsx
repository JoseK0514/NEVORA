'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {dateRange} from '@/lib/duration-format';
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
import {businessDate} from '@/lib/business-time';
import type {NextPay} from '../payroll/my-pay';
import {useMobileLang} from './mobile-lang';
import {LOCALE,dateText,type MobileLang} from './mobile-format';
import {payCopy} from './copy/pay';
import './requests.css';
import './pay.css';

type Statement=PayrollStatementsResponse['statements'][number];
export type PayDocumentFailure='unavailable'|'failed'|'temporary';
export type PayView={statements:Statement[]|null;loading:boolean;error:string;errorCode:string;nextPay:NextPay;statement:string|null;document:PayDocumentFailure|null;reload():void};

const day=(date:string,lang:MobileLang,weekday=false)=>{const text=dateText(date,lang,{...(weekday?{weekday:'long'}:{}),month:'long',day:'numeric',...(weekday?{}:{year:'numeric'})});return lang==='en'?text.replace(/([A-Za-z]+) (\d)/,'$1\u00a0$2'):text;};
/** "Sep 21–27, 2026" or "Sep 28–Oct 4, 2026", ending with the year so history stays unambiguous (both years when the
 * period crosses one). */
export function payPeriod(start:string,end:string,lang:MobileLang='en'){
 return dateRange(start,end,lang==='en'?{year:'end'}:{year:'end',locale:LOCALE[lang]});
}
const documentHref=(statement:Statement)=>`/api/payroll/documents/${encodeURIComponent(statement.id)}`;
/** Inspection Nov 14 (PY-7): who pays, said once on every Pay view. NEVORA shows a scheduled payday and a statement. */
export const PAY_SCOPE_LINE=payCopy.en.scope;
/** Inspection Nov 14 (PY-11): under a corrected or replaced statement, whom to ask when the amount received differs. */
export const PAY_DIFFERENCE_LINE=payCopy.en.difference;

/** Newest payday first; a correction comes before the statement it replaced. The latest is the newest statement
 * nothing replaced. Corrections are linked only when both statements are the person's own and published. */
export function arrangeStatements(statements:readonly Statement[]){
 const sorted=[...statements].sort((a,b)=>b.payday.localeCompare(a.payday)||Number(!!a.correctedBy)-Number(!!b.correctedBy)||a.id.localeCompare(b.id));
 const latest=sorted.find(statement=>!statement.correctedBy)??sorted[0]??null;
 return {latest,earlier:sorted.filter(statement=>statement!==latest)};
}

/** Employee/Lead phone presentation of My pay (owner: MyPay in ../payroll/my-pay.tsx, which holds the read). A
 * scheduled payday comes from the pay schedule and is never presented as a payment, amount or deposit. */
/** Days until the scheduled payday, kept current while the page stays open (it starts from the server's count). */
function useDaysUntil(nextPay:NextPay){
 const [days,setDays]=useState(nextPay?.daysUntil??null);
 useEffect(()=>{
  if(!nextPay?.timeZone)return;const zone=nextPay.timeZone,payday=nextPay.payday;
  const update=()=>{try{setDays(Math.round((Date.parse(`${payday}T12:00:00Z`)-Date.parse(`${businessDate(new Date(),zone)}T12:00:00Z`))/86_400_000));}catch{}};
  update();const timer=setInterval(update,60_000);window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);
  return()=>{clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};
 },[nextPay?.payday,nextPay?.timeZone]);
 return days;
}
export function EmployeePayView({statements,loading,error,errorCode,nextPay,statement:arrivedTarget,document:arrivedFailure,reload}:PayView){
 const daysUntil=useDaysUntil(nextPay),lang=useMobileLang(),t=payCopy[lang];
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
 const role=(item:Statement)=>item.correctedBy?t.role.replaced:item.corrects?t.role.corrected:t.role.statement;
 const goTo=(next:string)=>{if(arranged?.latest?.id===next)document.getElementById('pay-latest-title')?.focus();else{setOpen(next);requestAnimationFrame(()=>document.getElementById(`pay-statement-${next}`)?.focus());}};
 // A replaced statement points to its correction first; its own files stay available but secondary (PAY-UI-2).
 // Download relies on the route's attachment header, not a `download` attribute: with the attribute a failed
 // statement's redirect back to My pay would be saved as a file instead of shown (PAY-CR-9).
 const actions=(item:Statement,where:string)=>{
  const label=t.actionLabel(role(item),day(item.payday,lang)),quiet=!!item.correctedBy;
  return <div className="em-pay-actions">
   {quiet&&item.correctedBy&&byId.has(item.correctedBy)?<button type="button" className="em-request-primary em-pay-use" onClick={()=>goTo(item.correctedBy!)}>{t.useCorrected}</button>:null}
   {item.viewUrl?<a id={`pay-view-${where}-${item.id}`} className={quiet?'em-request-secondary':'em-request-primary'} href={`${documentHref(item)}/view`} target="_blank" rel="noopener" aria-label={t.viewLabel(label)} onClick={()=>{returnTo.current=`pay-view-${where}-${item.id}`;}}><ArrowSquareOutIcon size={20} weight="bold" aria-hidden="true"/>{t.view}</a>:null}
   <a id={`pay-download-${where}-${item.id}`} className={item.viewUrl||quiet?'em-request-secondary':'em-request-primary'} href={documentHref(item)} aria-label={t.downloadLabel(label)} onClick={()=>{returnTo.current=`pay-download-${where}-${item.id}`;}}><DownloadSimpleIcon size={20} weight="bold" aria-hidden="true"/>{t.download}</a>
  </div>;
 };
 const relation=(item:Statement)=>item.correctedBy?<p className="em-pay-relation">{t.replacedBy+' '}{t.difference}</p>
  :item.corrects?<p className="em-pay-relation">{t.corrects+' '}{t.difference}</p>:null;
 const chip=(item:Statement)=>item.correctedBy?<span className="em-pay-chip em-pay-chip--muted">{t.replacedChip}</span>:item.corrects?<span className="em-pay-chip">{t.correctionChip}</span>:null;
 const paused=errorCode==='PAUSED'||errorCode==='OFFLINE',signedOut=errorCode==='SIGNED_OUT',off=errorCode==='MODULE_OFF',denied=errorCode==='FORBIDDEN';
 const state=loading?'loading':signedOut?'signed-out':off?'module-off':denied?'denied':paused?'paused':error?'error':!arranged?.latest?'empty':'ready';
 // Statements can only follow in these states, so only these show arrival notices and the scheduled payday.
 const listed=state==='ready'||state==='empty'||state==='loading';
 const surface=(tone:''|'caution'|'error',icon:ReactNode,title:string,body:string,action?:ReactNode,live:'status'|'alert'='status')=><div className={`em-pay-notice${tone?' em-pay-notice--'+tone:''}`} role={live} aria-labelledby={`pay-${state}-title`}><div className="em-pay-notice-heading">{icon}<h2 id={`pay-${state}-title`}>{title}</h2></div><p>{body}</p>{action}</div>;
 return <div className="em-requests em-pay" data-pay-state={state}>
  {/* Pay is a top-level tab, like Hours and Schedule: no back link. */}
  <header className="em-request-heading"><h1>{t.title}</h1><p>{t.subtitle}</p></header>
  <div className="em-pay-body" aria-busy={loading}>
   {(failure||missing)&&listed&&state!=='loading'?<div ref={notice} tabIndex={-1} className="em-pay-notice em-pay-notice--caution" role="alert" aria-labelledby="pay-notice-title">
    <div className="em-pay-notice-heading"><WarningCircleIcon size={24} weight="bold" aria-hidden="true"/><h2 id="pay-notice-title">{failure==='failed'||failure==='temporary'?t.couldntOpen:t.notAvailable}</h2></div>
    <p>{failure==='failed'?t.failedCheck:failure==='temporary'?t.temporary:state==='empty'?t.maybeReplaced:t.maybeReplacedBelow}</p>
   </div>:null}
   {nextPay&&listed&&daysUntil!==null&&daysUntil>=0?<section className="em-pay-section em-pay-schedule" aria-labelledby="pay-next-title">
    <h2 id="pay-next-title">{t.nextPayday}</h2>
    <div className="em-pay-next"><CalendarBlankIcon size={22} weight="bold" aria-hidden="true"/><span>
     <strong>{day(nextPay.payday,lang,true)}</strong>
     <small>{[daysUntil===0?t.today:daysUntil===1?t.tomorrow:t.inDays(daysUntil),nextPay.period?t.forPeriod(payPeriod(nextPay.period.startDate,nextPay.period.endDate,lang)):null].filter(Boolean).join(' · ')}</small>
     <small>{t.fromSchedule}</small>
    </span></div>
   </section>:null}
   {state==='loading'?<div className="em-pay-card em-pay-quiet" role="status"><span><small>{t.loading}</small></span></div>
    :state==='signed-out'?surface('',<InfoIcon size={24} weight="bold" aria-hidden="true"/>,t.signedOutTitle,t.signedOutBody,<Link className="em-request-primary" href="/login?returnTo=%2Fapp%2Fmy-pay">{t.signIn}</Link>,'alert')
    :state==='denied'?surface('',<InfoIcon size={24} weight="bold" aria-hidden="true"/>,t.deniedTitle,t.deniedBody)
    :state==='module-off'?surface('',<InfoIcon size={24} weight="bold" aria-hidden="true"/>,t.offTitle,t.offBody)
    :state==='paused'?surface('',<InfoIcon size={24} weight="bold" aria-hidden="true"/>,errorCode==='OFFLINE'?t.offlineTitle:t.pausedTitle,errorCode==='OFFLINE'?t.offlineBody:t.pausedBody)
    :state==='error'?surface('',<InfoIcon size={24} weight="bold" aria-hidden="true"/>,t.errorTitle,t.errorBody,<button type="button" className="em-request-secondary" onClick={reload}>{t.tryAgain}</button>,'alert')
    :state==='empty'?<div className="em-pay-card em-pay-quiet"><FileTextIcon size={22} weight="bold" aria-hidden="true"/><span><strong>{t.emptyTitle}</strong><small>{t.emptyBody}</small></span></div>
    :arranged?.latest?<section className="em-pay-section" aria-labelledby="pay-latest-heading">
     <h2 id="pay-latest-heading">{t.latest}</h2>
     <article className="em-pay-card em-pay-latest" aria-labelledby="pay-latest-title">
      <h3 id="pay-latest-title" tabIndex={-1}>{t.payday}{day(arranged.latest.payday,lang)}</h3>
      <p>{payPeriod(arranged.latest.period.startDate,arranged.latest.period.endDate,lang)} · PDF</p>
      {chip(arranged.latest)}
      {relation(arranged.latest)}
      {actions(arranged.latest,'latest')}
      {arranged.latest.viewUrl?<p className="em-pay-hint">{t.viewHint}</p>:null}
     </article>
    </section>:null}
   {state==='ready'&&arranged&&arranged.earlier.length?<section className="em-pay-section" aria-labelledby="pay-earlier-title">
    <h2 id="pay-earlier-title">{t.earlier}</h2>
    <ul className="em-pay-list">{arranged.earlier.map(item=><li key={item.id}>
     <details open={open===item.id} onToggle={event=>{const isOpen=event.currentTarget.open;setOpen(current=>isOpen?item.id:current===item.id?null:current);}}>
      <summary id={`pay-statement-${item.id}`}><span><strong>{t.payday}{day(item.payday,lang)}</strong><small>{payPeriod(item.period.startDate,item.period.endDate,lang)} · PDF</small>{chip(item)}</span><CaretDownIcon size={20} weight="bold" aria-hidden="true"/></summary>
      <div>{relation(item)}{actions(item,'earlier')}</div>
     </details>
    </li>)}</ul>
   </section>:null}
   <section className="em-pay-section" aria-labelledby="pay-hours-title">
    <h2 id="pay-hours-title">{t.yourHours}</h2>
    <ul className="em-pay-links"><li><Link href="/app/my-time">{t.myTime}<CaretRightIcon size={20} weight="bold" aria-hidden="true"/></Link></li><li><Link href="/app/timecards">{t.timecards}<CaretRightIcon size={20} weight="bold" aria-hidden="true"/></Link></li></ul>
   </section>
   {listed?<p className="em-pay-privacy">{t.scope}</p>:null}
   {listed?<p className="em-pay-privacy">{t.privacy}</p>:null}
  </div>
 </div>;
}
