'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {ArrowSquareOutIcon} from '@phosphor-icons/react/dist/ssr/ArrowSquareOut';
import {businessDate} from '@/lib/business-time';
import type {NextPay} from '../payroll/my-pay';
import {CorpBody,CorpButton,CorpButtonLink,CorpCard,CorpLink,CorpNote,CorpRow,CorpRows,CorpTitle} from '../corp/corp';
import {arrangeStatements,type PayView} from './pay';
import './pay-corp.css';
import {PayB, type PayBStatus} from '../employee-b/pay-b';
import {BButton, BButtonLink} from '../owner-b/b-kit';

/** The element to focus: the phone screen's (Direction B) when it is the one showing, else the corporate one. */
const shownById=(...ids:string[])=>ids.map(id=>document.getElementById(id)).find(el=>!!el&&el.getClientRects().length>0)??document.getElementById(ids[ids.length-1]);

/* An Employee's Pay on the corporate kit (Release 1 boards G-E-Pay, E-PayHistory, E-Paycheck). The same statements read,
 * documents, arrival notices and states as the older view. Statements carry no amounts, hours or deposit details, so the
 * pages show paydays, periods and the provider's PDF, never figures; a scheduled payday is never called a payment. */

type Statement=NonNullable<PayView['statements']>[number];
const utc=(date:string)=>new Date(`${date}T12:00:00Z`);
const fmt=(options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',...options});
/** "Fri, Oct 30" */
const payday=(date:string)=>fmt({weekday:'short',month:'short',day:'numeric'}).format(utc(date));
/** "Friday, October 30, 2026" for a screen reader label and the paycheck's title. */
const paydayLong=(date:string)=>fmt({weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(utc(date));
/** "Oct 19 – 25", or "Sep 28 – Oct 4" across a month. */
const period=(start:string,end:string)=>{const short=(date:string)=>fmt({month:'short',day:'numeric'}).format(utc(date));return start.slice(0,7)===end.slice(0,7)?`${short(start)} – ${Number(end.slice(8))}`:`${short(start)} – ${short(end)}`;};
const documentHref=(statement:Statement)=>`/api/payroll/documents/${encodeURIComponent(statement.id)}`;
const paycheckHref=(id:string)=>`/app/my-pay?paycheck=${encodeURIComponent(id)}`;
const role=(item:Statement)=>item.correctedBy?'replaced statement':item.corrects?'corrected statement':'statement';
// Upscale S4: a statement's state is grey text, not a pill (blue is not a NEVORA colour).
const pill=(item:Statement)=>item.correctedBy?<span className="c-meta">Replaced</span>:item.corrects?<span className="c-meta">Correction</span>:null;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Days until the scheduled payday, kept current while the page stays open (it starts from the server's count). */
function useDaysUntil(nextPay:NextPay){
 const [days,setDays]=useState(nextPay?.daysUntil??null);
 useEffect(()=>{
  if(!nextPay?.timeZone)return;const zone=nextPay.timeZone,day=nextPay.payday;
  const update=()=>{try{setDays(Math.round((Date.parse(`${day}T12:00:00Z`)-Date.parse(`${businessDate(new Date(),zone)}T12:00:00Z`))/86_400_000));}catch{}};
  update();const timer=setInterval(update,60_000);window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);
  return()=>{clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};
 },[nextPay?.payday,nextPay?.timeZone]);
 return days;
}

/** A pushed page's white bar: "‹ Pay" left, the title centred. */
function PayNav({back,title}:{back:{href:string;label:string};title:string}){
 return <div className="c-nav"><Link className="c-nav__back" href={back.href}><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true"/>{back.label}</Link>
  <h1 className="c-nav__title" id="pay-page-title" tabIndex={-1}>{title}</h1><span className="c-nav__right"/></div>;
}

export function CorpPayView({statements,loading,error,errorCode,nextPay,statement:arrivedTarget,document:arrivedFailure,reload}:PayView){
 const search=useSearchParams(),requested=search?.get('paycheck')??null,paycheck=requested&&UUID.test(requested)?requested:null;
 const view=paycheck?'paycheck':search?.get('view')==='history'?'history':'pay';
 const daysUntil=useDaysUntil(nextPay);
 // The year shows only on a payday outside the current year (the workspace's, else the device's).
 const thisYear=(()=>{try{return businessDate(new Date(),nextPay?.timeZone??Intl.DateTimeFormat().resolvedOptions().timeZone).slice(0,4);}catch{return String(new Date().getFullYear());}})();
 // Latched on arrival: cleaning the URL re-renders the page without its parameters, and the notice must stay.
 const [latch,setLatch]=useState(()=>({target:arrivedTarget,failure:arrivedFailure,seq:0}));
 if((arrivedTarget||arrivedFailure)&&(arrivedTarget!==latch.target||arrivedFailure!==latch.failure))setLatch({target:arrivedTarget,failure:arrivedFailure,seq:latch.seq+1});
 const {target,failure}=latch;
 const notice=useRef<HTMLDivElement>(null),bNotice=useRef<HTMLDivElement>(null),returnTo=useRef<string|null>(null),arrived=useRef(-1),shown=useRef<string|null>(null);
 const arranged=statements?arrangeStatements(statements):null,ordered=arranged?.latest?[arranged.latest,...arranged.earlier]:[];
 const found=!!target&&!!statements?.some(item=>item.id===target),missing=!!target&&!!statements&&!found;
 const byId=new Map((statements??[]).map(item=>[item.id,item]));
 // One announcement on arrival: a failed PDF or a missing statement on Pay; a notification's statement opens as its paycheck.
 useEffect(()=>{
  if(arrived.current===latch.seq||(!failure&&!target)||!statements)return;
  // Marked handled only when the frame runs: Strict Mode's mount/unmount/mount cancels an earlier frame.
  const frame=requestAnimationFrame(()=>{
   arrived.current=latch.seq;
   // Next integrates native replaceState without a server round trip, so a refresh can't replay this notice.
   if(failure||missing){(bNotice.current&&bNotice.current.getClientRects().length?bNotice.current:notice.current)?.focus();if(location.search)history.replaceState(null,'','/app/my-pay');}
   else if(target)history.replaceState(null,'',paycheckHref(target));
  });
  return()=>cancelAnimationFrame(frame);
 },[failure,target,statements,missing,latch.seq]);
 // A pushed page puts focus on its title when it opens.
 useEffect(()=>{const key=view+(paycheck??'');if(shown.current===null){shown.current=key;if(view==='pay')return;}else if(shown.current===key)return;shown.current=key;
  const frame=requestAnimationFrame(()=>{const id=view==='pay'?'pay-title':'pay-page-title';shownById('b-'+id,id)?.focus();});return()=>cancelAnimationFrame(frame);},[view,paycheck]);
 // Returning from a PDF reloads the list; put focus back on the control that opened it.
 useEffect(()=>{
  if(!statements||!returnTo.current)return;
  const id=returnTo.current,frame=requestAnimationFrame(()=>{const el=document.getElementById(id);if(el&&(document.activeElement===document.body||!document.activeElement)){el.focus();returnTo.current=null;}});
  return()=>cancelAnimationFrame(frame);
 },[statements]);
 const paused=errorCode==='PAUSED'||errorCode==='OFFLINE',signedOut=errorCode==='SIGNED_OUT',off=errorCode==='MODULE_OFF',denied=errorCode==='FORBIDDEN';
 const state=loading?'loading':signedOut?'signed-out':off?'module-off':denied?'denied':paused?'paused':error?'error':!arranged?.latest?'empty':'ready';
 // Statements can only follow in these states, so only these show arrival notices and the scheduled payday.
 const listed=state==='ready'||state==='empty'||state==='loading';
 const surface=(title:string,body:string,action?:ReactNode,live:'status'|'alert'='status')=><CorpCard ariaLabel={title}><CorpBody>
  <div role={live} aria-labelledby={`pay-${state}-title`}><h2 className="c-big" id={`pay-${state}-title`}>{title}</h2><p className="c-line2">{body}</p></div>{action}</CorpBody></CorpCard>;
 const status=state==='loading'?<CorpCard label="Recent pay"><p className="c-empty" role="status">Loading your statements…</p></CorpCard>
  :state==='signed-out'?surface('Sign in to see your statements','Your session ended. Statements stay private until you sign in again.',<CorpButtonLink href="/login?returnTo=%2Fapp%2Fmy-pay" kind="secondary" size="md" full>Sign in</CorpButtonLink>,'alert')
  :state==='denied'?surface('Your access to pay statements changed','NEVORA can’t show your statements right now. If that seems wrong, ask your manager.')
  :state==='module-off'?surface('Pay statements are turned off','Your workplace isn’t sharing pay statements in NEVORA right now. Ask your manager where to find your pay information.')
  :state==='paused'?surface(errorCode==='OFFLINE'?'You’re offline':'Statements are paused',errorCode==='OFFLINE'?'Reconnect to see your current statements.':'Statements are hidden while NEVORA is in the background. They reload when you return.')
  :state==='error'?surface('Couldn’t load your statements','Check your connection, then try again.',<CorpButton kind="secondary" size="md" full onClick={reload}>Try again</CorpButton>,'alert')
  :state==='empty'?<CorpCard label="Recent pay"><p className="c-empty"><b>No published statements yet</b>Your statements appear here after your workplace publishes payroll.</p></CorpCard>:null;
 const row=(item:Statement)=><li key={item.id}><CorpRow id={`pay-statement-${item.id}`} href={paycheckHref(item.id)} bold title={payday(item.payday)} detail={period(item.period.startDate,item.period.endDate)}
  label={`${paydayLong(item.payday)}, ${role(item)} for ${period(item.period.startDate,item.period.endDate)}`} trail={pill(item)} chevron/></li>;
 // Direction B (phones): the same states, words and links on the dark ink screen.
 const bStatus:PayBStatus=state==='signed-out'?{title:'Sign in to see your statements',body:'Your session ended. Statements stay private until you sign in again.',action:<BButtonLink href="/login?returnTo=%2Fapp%2Fmy-pay" kind="teal" full>Sign in</BButtonLink>,live:'alert'}
  :state==='denied'?{title:'Your access to pay statements changed',body:'NEVORA can’t show your statements right now. If that seems wrong, ask your manager.',live:'status'}
  :state==='module-off'?{title:'Pay statements are turned off',body:'Your workplace isn’t sharing pay statements in NEVORA right now. Ask your manager where to find your pay information.',live:'status'}
  :state==='paused'?{title:errorCode==='OFFLINE'?'You’re offline':'Statements are paused',body:errorCode==='OFFLINE'?'Reconnect to see your current statements.':'Statements are hidden while NEVORA is in the background. They reload when you return.',live:'status'}
  :state==='error'?{title:'Couldn’t load your statements',body:'Check your connection, then try again.',action:<BButton kind="quiet" full onClick={reload}>Try again</BButton>,live:'alert'}:null;
 const bNoticeText=failure||missing?{title:failure==='failed'||failure==='temporary'?'We couldn’t open that statement':'That statement isn’t available',
  body:failure==='failed'?'It didn’t pass NEVORA’s file check, so it wasn’t opened. Try again later, or ask your manager.':failure==='temporary'?'NEVORA couldn’t open it just now. Try again in a moment.':state==='empty'?'It may have been replaced, or your access changed.':'It may have been replaced, or your access changed. Your current statements are below.'}:null;
 const b=<PayB view={view} state={state} ordered={ordered} byId={byId} paycheck={paycheck} nextPay={nextPay} daysUntil={daysUntil} listed={listed} thisYear={thisYear}
  notice={bNoticeText} noticeRef={bNotice} status={bStatus} onOpenPdf={id=>{returnTo.current=id;}}/>;
 const frame=(children:ReactNode,sub:boolean)=><div className={sub?'c-page c-page--narrow c-pay c-pay--sub':'c-page c-page--narrow c-pay'} data-nv-page="" data-corp="" data-pay-state={state} data-pay-view={view} aria-busy={loading}>{b}{children}</div>;

 if(view==='paycheck'){
  const item=paycheck?byId.get(paycheck):undefined;
  return frame(<>
   <PayNav back={{href:'/app/my-pay',label:'Pay'}} title="Pay statement"/>
   {state!=='ready'?status:!item?<CorpCard ariaLabel="Pay statement"><CorpBody><div role="status"><h2 className="c-big">That statement isn’t available</h2><p className="c-line2">It may have been replaced, or your access changed.</p></div></CorpBody></CorpCard>:<>
    <CorpCard id="pay-paycheck" label={`Pay period ${period(item.period.startDate,item.period.endDate)}`} aside={pill(item)}>
     <CorpBody><span className="c-line3">Payday</span><b className="c-big">{fmt({weekday:'short',month:'short',day:'numeric',...(item.payday.slice(0,4)===thisYear?{}:{year:'numeric'})}).format(utc(item.payday))}</b>
      {item.correctedBy?<span className="c-line3 c-pay-gap">A corrected statement replaced this one. Use the corrected statement for this period.</span>
       :item.corrects?<span className="c-line3 c-pay-gap">This corrects your earlier statement for the same period.</span>:null}</CorpBody>
     <CorpRows label="Statement">
      {item.correctedBy&&byId.has(item.correctedBy)?<li><CorpRow href={paycheckHref(item.correctedBy)} title={<span className="c-link c-link--l">Use the corrected statement</span>} label="Use the corrected statement" one/></li>:null}
      {/* Upscale S8: one row for the one document. It opens the PDF separately (on a phone the viewer offers Save); without
        * a viewer link it goes to the route, whose attachment header downloads it. No `download` attribute, so a failed
        * file's redirect back to Pay is shown, not saved. */}
      <li><a id={`pay-pdf-${item.id}`} className="c-row c-row--one" href={item.viewUrl?`${documentHref(item)}/view`:documentHref(item)} {...(item.viewUrl?{target:'_blank',rel:'noopener'}:{})}
       aria-label={`Pay statement (PDF), ${role(item)}, payday ${paydayLong(item.payday)}${item.viewUrl?' (opens separately)':''}`} onClick={()=>{returnTo.current=`pay-pdf-${item.id}`;}}>
       <span className="c-row__main"><span className="c-row__title c-pay-action">Pay statement (PDF)</span></span><ArrowSquareOutIcon className="c-pay-icon" weight="bold" aria-hidden="true"/></a></li>
     </CorpRows>
    </CorpCard>
    <CorpNote>Downloaded files may contain personal pay information.</CorpNote>
   </>}
  </>,true);
 }
 if(view==='history'){
  const months=new Map<string,Statement[]>();for(const item of ordered){const key=item.payday.slice(0,7);months.set(key,[...(months.get(key)??[]),item]);}
  return frame(<>
   <PayNav back={{href:'/app/my-pay',label:'Pay'}} title="Pay history"/>
   {state!=='ready'?status:<>
    <CorpNote>Your published pay statements, newest first.</CorpNote>
    {[...months].map(([month,items])=><CorpCard key={month} label={fmt({month:'long',...(month.slice(0,4)===thisYear?{}:{year:'numeric'})}).format(utc(`${month}-15`))}>
     <CorpRows>{items.map(row)}</CorpRows>
    </CorpCard>)}
   </>}
  </>,true);
 }
 return frame(<>
  <CorpTitle id="pay-title" title="Pay"
   actions={state==='ready'?<CorpButtonLink href="/app/my-pay?view=history" kind="neutral" size="sm">Pay history</CorpButtonLink>:undefined}/>
  {(failure||missing)&&listed&&state!=='loading'?<div ref={notice} tabIndex={-1} className="c-callout c-pay-notice" role="alert" aria-labelledby="pay-notice-title">
   <b id="pay-notice-title">{failure==='failed'||failure==='temporary'?'We couldn’t open that statement':'That statement isn’t available'}</b>
   <span>{failure==='failed'?'It didn’t pass NEVORA’s file check, so it wasn’t opened. Try again later, or ask your manager.':failure==='temporary'?'NEVORA couldn’t open it just now. Try again in a moment.':state==='empty'?'It may have been replaced, or your access changed.':'It may have been replaced, or your access changed. Your current statements are below.'}</span>
  </div>:null}
  {/* Upscale S16: the payday said once. The card head carries the period, the body the date, then how far away it is. */}
  {nextPay&&listed&&daysUntil!==null&&daysUntil>=0?<CorpCard id="pay-period" label={nextPay.period?`This pay period · ${period(nextPay.period.startDate,nextPay.period.endDate)}`:'This pay period'}>
   <CorpBody><b className="c-big">{payday(nextPay.payday)}</b>
    <span className="c-line3">{daysUntil===0?'Payday is today':daysUntil===1?'Payday is tomorrow':`Payday in ${daysUntil} days`}</span></CorpBody>
   <CorpRows><li><CorpRow href="/app/my-time" title={<span className="c-link c-link--l">See your hours</span>} label="See your hours" one/></li></CorpRows>
  </CorpCard>:null}
  {state==='ready'?<CorpCard id="pay-recent" label="Recent pay" aside={ordered.length>3?<CorpLink href="/app/my-pay?view=history" label="See all pay">See all</CorpLink>:undefined}>
   <CorpRows label="Recent pay">{ordered.slice(0,3).map(row)}</CorpRows>
  </CorpCard>:status}
 </>,false);
}
