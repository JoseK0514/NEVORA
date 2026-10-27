'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CalendarBlankIcon} from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import {CalendarMinusIcon} from '@phosphor-icons/react/dist/ssr/CalendarMinus';
import {ArrowsLeftRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {createPrivateSnapshotController,type PrivatePanelState} from '@/lib/private-snapshot-client';
import {parseEmployeeRequests,type EmployeeRequestsSnapshot,type OpenEmployeeShift,type OwnRequest} from '@/lib/employee-requests';
import {shiftChangeAction,reconcileShiftChangeAction} from '@/app/app/exchange/actions';
import {shiftChangeFeedback} from '../shift-change-form-state';
import {useEmployeeMobile} from './use-mobile';
import {PickupOperation} from './pickup-operation';
import {formatTime,addDays} from '@/lib/date-utils';

type Mode='hub'|'open';
const day=(date:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(date+'T12:00:00Z'));
const href=(row:OwnRequest)=>row.kind==='timeOff'?`/app/requests?tab=my#request-${encodeURIComponent(row.id)}`:`/app/exchange?tab=requests&requestId=${encodeURIComponent(row.id)}`;
const status=(value:string)=>({OPEN:'Offered for cover',EMPLOYEE_PENDING:'Awaiting a teammate',MANAGER_PENDING:'Awaiting manager review',APPROVED:'Approved',PENDING:'Awaiting approval',DENIED:'Declined',CANCELLED:'Cancelled',EXPIRED:'Expired'}[value]??'Open request to check status');
function Entry({href,title,detail,icon}:{href:string;title:string;detail?:string;icon:ReactNode}){
 return <li><Link className="em-request-entry" href={href}><span className="em-request-icon" aria-hidden="true">{icon}</span><span><strong>{title}</strong>{detail?<small>{detail}</small>:null}</span><CaretRightIcon aria-hidden="true"/></Link></li>;
}
export function IncomingRequestSection({count,onRetry}:{count:number|null;onRetry:()=>void}){
 if(count===null)return <section aria-labelledby="em-answer-heading"><h2 id="em-answer-heading">Swaps for you</h2><div className="em-request-notice"><p role="status">Swaps for you couldn’t be checked.</p><Link className="em-request-text" href="/app/exchange?tab=foryou">Open swaps for you</Link><button className="em-request-secondary" type="button" onClick={onRetry}>Try again</button></div></section>;
 return count?<section aria-labelledby="em-answer-heading"><h2 id="em-answer-heading">Needs your answer</h2><ul className="em-request-list"><Entry href="/app/exchange?tab=foryou" title={count===1?'A teammate requested a swap':`${count} swaps need your answer`} detail="Review the shifts before responding" icon={<ArrowsLeftRightIcon/>}/></ul></section>:null;
}
export function Pickup({operation,onRefresh,canSubmit=false,isCurrent=()=>false,canRecover=()=>false}:{operation:PickupOperation;onRefresh:()=>void;canSubmit?:boolean;isCurrent?:(operation:PickupOperation)=>boolean;canRecover?:()=>boolean}){
 useSyncExternalStore(operation.subscribe,operation.snapshot,operation.snapshot);
 const current=operation.state,result=current.result,resolved=result&&['completed','pending','closed'].includes(result.status);
 useEffect(()=>{if(resolved)onRefresh();},[resolved,onRefresh]);
 const run=()=>{if(canSubmit&&navigator.onLine)void operation.submit(shiftChangeAction,()=>isCurrent(operation));};
 return <div className="em-pickup" aria-busy={current.pending}>
  {canSubmit&&(!result||!resolved&&!current.uncertain)?<button className="em-request-primary" type="button" disabled={current.pending} onClick={run}>{current.pending?'Submitting…':'Pick up shift'}</button>:null}
  {current.pending&&current.uncertain?<p role="status">Checking the original request…</p>:null}
  {result?<p role={resolved?'status':'alert'}>{result.status==='completed'?'Shift pickup completed. Check your current schedule.':result.status==='pending'?'Pickup requested. Your assignment is awaiting review.':shiftChangeFeedback(result)}</p>:null}
  {current.uncertain?<button className="em-request-secondary" type="button" disabled={current.pending} onClick={()=>{if(navigator.onLine)void operation.retry(reconcileShiftChangeAction,shiftChangeAction,canRecover);}}>Check pickup status</button>:null}
  {result&&!current.uncertain&&!resolved?<button className="em-request-secondary" type="button" onClick={onRefresh}>Refresh shift options</button>:null}
  {resolved?<Link className="em-request-text" href={result.status==='completed'?'/app/schedule':'/app/exchange?tab=requests'}>{result.status==='completed'?'View my schedule':'View my requests'}</Link>:null}
 </div>;
}
function ShiftCard({shift,operation,onRefresh,selected,isCurrent,canRecover}:{shift:OpenEmployeeShift;operation:PickupOperation;onRefresh:()=>void;selected:boolean;isCurrent:(operation:PickupOperation)=>boolean;canRecover:()=>boolean}){
 const [open,setOpen]=useState(selected);
 const overnight=shift.endTime<=shift.startTime;
 return <details className="em-open-shift" open={open} onToggle={event=>setOpen(event.currentTarget.open)}>
  <summary><span><small>{day(shift.date)}{overnight?' · Overnight':''}</small><strong>{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</strong><span>{shift.location}{shift.position?` · ${shift.position}`:''}</span></span><CaretDownIcon aria-hidden="true"/></summary>
  <div className="em-open-detail">
   {overnight?<p>Ends {day(addDays(shift.date,1))} at {formatTime(shift.endTime)}.</p>:null}
   <p>{shift.outcome==='completed'?'Picking up this shift assigns it to you immediately if it is still available and you still meet the rules.':'Your manager must approve this pickup before the shift is assigned to you.'}</p>
   <Pickup operation={operation} onRefresh={onRefresh} canSubmit={operation.revision===shift.revision} isCurrent={isCurrent} canRecover={canRecover}/>
  </div>
 </details>;
}
export function ResponsiveEmployeeRequests({authority,mode,selected,children}:{authority:string;mode:Mode;selected?:string;children:ReactNode}){
 const mobile=useEmployeeMobile();
 return mobile?<div className="em-requests-mobile"><EmployeeMobileRequests key={authority} authority={authority} mode={mode} selected={selected}/></div>:<>{children}<div className="em-requests-mobile"><p className="em-request-loading" role="status">Loading requests…</p></div></>;
}
function EmployeeMobileRequests({authority,mode,selected}:{authority:string;mode:Mode;selected?:string}){
 const [state,setState]=useState<PrivatePanelState<EmployeeRequestsSnapshot>>({snapshot:null,refreshing:true,paused:false});
 const control=useRef<ReturnType<typeof createPrivateSnapshotController<EmployeeRequestsSnapshot>>|null>(null);
 const lifetime=useRef<Map<string,number>|null>(null);
 const isCurrent=useCallback((operation:PickupOperation)=>lifetime.current?.get(operation.requestId)===operation.revision,[]);
 const canRecover=useCallback(()=>lifetime.current!==null,[]);
 const [operations,setOperations]=useState(()=>new Map<string,PickupOperation>()),pathname=usePathname();
 const refresh=useCallback(()=>control.current?.refresh(),[]);
 useEffect(()=>{
  const controller=createPrivateSnapshotController<EmployeeRequestsSnapshot>(next=>{
   lifetime.current=!next.paused&&next.snapshot?.state==='ready'&&next.snapshot.authority===authority&&next.snapshot.modules.marketplace?new Map((next.snapshot.open??[]).filter(row=>row.check==='eligible').map(row=>[row.id,row.revision])):null;
   if(next.snapshot?.state==='ready') {
    const shifts=next.snapshot.open??[];
    setOperations(previous=>{
     const updated=new Map(previous);
     for(const shift of shifts){
      const old=updated.get(shift.id);
      if(!old||old.revision!==shift.revision&&!old.state.pending&&!old.state.uncertain)updated.set(shift.id,new PickupOperation(shift.id,shift.revision));
     }
     return updated;
    });
   }
   setState(next);
  },async signal=>{
   const response=await fetch('/api/employee/requests',{credentials:'same-origin',cache:'no-store',redirect:'error',signal,headers:{Accept:'application/json','X-Nevora-Employee-View':authority}});
   if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'};
   if(!response.ok)throw Error('Requests unavailable');return response.json();
  },value=>{const read=parseEmployeeRequests(value);return read.state==='ready'&&read.authority!==authority?{state:'unavailable',reason:'access_denied'}:read;},reason=>({state:'unavailable',reason}));
  control.current=controller;let mounted=true;
  const pause=()=>controller.pause(),sync=()=>{controller.pause();if(document.visibilityState!=='hidden'&&navigator.onLine)controller.start();};
  document.addEventListener('visibilitychange',sync);
  for(const event of ['blur','pagehide','offline'])window.addEventListener(event,pause);
  for(const event of ['focus','pageshow','online','storage'])window.addEventListener(event,sync);
  void Promise.resolve().then(()=>{if(mounted)sync();});
  return()=>{mounted=false;lifetime.current=null;controller.stop();control.current=null;document.removeEventListener('visibilitychange',sync);for(const event of ['blur','pagehide','offline'])window.removeEventListener(event,pause);for(const event of ['focus','pageshow','online','storage'])window.removeEventListener(event,sync);};
 },[authority,pathname]);
 const snapshot=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.authority===authority?state.snapshot:null;
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 const eligible=snapshot?.open?.filter(row=>row.check==='eligible')??[],unconfirmed=snapshot?.open?.filter(row=>row.check==='unavailable')??[],refused=snapshot?.open?.filter(row=>row.check==='refused')??[];
 return <div className="q-page em-requests" data-requests-state={state.paused?'paused':snapshot?'ready':denied?'denied':state.refreshing?'loading':'unavailable'}>
  <header className="em-request-heading">{mode==='open'?<Link className="em-request-back" href="/app/requests/hub">‹ Requests</Link>:null}<h1>{mode==='hub'?'Requests':'Open shifts'}</h1><p>{mode==='hub'?'Your requests and shift options':'Find a shift that works for you'}</p></header>
  <div className="em-request-body">
   {!snapshot?<section className="em-request-notice" aria-label="Requests status"><p role="status">{state.paused?'Requests paused. Return online to refresh.':denied?'Your access changed. Sign in again to continue.':state.refreshing?'Checking your current requests…':'We couldn’t load your requests. Try again.'}</p>{denied?<Link className="em-request-secondary" href="/login">Sign in</Link>:<button className="em-request-secondary" type="button" disabled={state.paused||state.refreshing} onClick={refresh}>{state.refreshing?'Checking…':'Try again'}</button>}</section>:<>
    {mode==='hub'?<>
     {snapshot.modules.marketplace?<IncomingRequestSection count={snapshot.incoming} onRetry={refresh}/>:null}
     <section aria-labelledby="em-options-heading"><h2 id="em-options-heading">Your options</h2><ul className="em-request-list">
      {snapshot.modules.marketplace?<><Entry href="/app/exchange?tab=available" title="Open shifts" detail={snapshot.open===null||unconfirmed.length?'Some eligibility checks are unavailable':eligible.length?`${eligible.length} ${eligible.length===1?'shift matches':'shifts match'} your current eligibility`:'No eligible open shifts right now'} icon={<CalendarBlankIcon/>}/><Entry href="/app/schedule" title="Swap or cover a shift" detail="Start with a shift on your schedule" icon={<ArrowsLeftRightIcon/>}/></>:null}
      {snapshot.modules.timeOff?<Entry href="/app/requests?tab=new" title="Request time off" detail="Ask for a day or part of a day away" icon={<CalendarMinusIcon/>}/>:null}
      <Entry href="/app/availability" title="Availability" detail="Let your manager know when you can work" icon={<ClockIcon/>}/>
     </ul></section>
     <section aria-labelledby="em-recent-heading"><h2 id="em-recent-heading">Recent requests</h2>
      {snapshot.recent===null?<p className="em-request-notice" role="status">Your request history couldn’t be checked. Open the request type below to try again.</p>:snapshot.recent.length?<ul className="em-request-list">{snapshot.recent.map(row=><Entry key={row.kind+row.id} href={href(row)} title={`${row.kind==='timeOff'?'Time off':row.kind==='callout'?'Unable to work':'Shift request'} · ${day(row.date)}`} detail={status(row.status)} icon={row.kind==='timeOff'?<CalendarMinusIcon/>:<ArrowsLeftRightIcon/>}/>)}</ul>:<p className="em-request-notice">No requests yet. Start with one of the options above.</p>}
      <div className="em-request-links">{snapshot.modules.timeOff?<Link href="/app/requests?tab=my">All time-off requests</Link>:null}{snapshot.modules.marketplace?<Link href="/app/exchange?tab=requests">All shift requests</Link>:null}</div>
     </section>
    </>:snapshot.modules.marketplace?<>
     {[...operations.values()].filter(item=>(item.state.pending||item.state.result)&&!eligible.some(shift=>shift.id===item.requestId)).map(item=><section className="em-request-notice" aria-label="Your pickup result" key={item.requestId}><Pickup operation={item} onRefresh={refresh} canRecover={canRecover}/></section>)}
     {snapshot.open===null?<p className="em-request-notice" role="status">Open shifts couldn’t be checked. Refresh to try again.</p>:<>
      <section aria-labelledby="em-eligible-heading"><div className="em-request-section-title"><h2 id="em-eligible-heading">Eligible for you</h2><span>{eligible.length} {eligible.length===1?'shift':'shifts'}</span></div>
       {eligible.length?<div className="em-open-list">{eligible.map(shift=>operations.has(shift.id)?<ShiftCard key={shift.id} shift={shift} selected={selected===shift.id} operation={operations.get(shift.id)!} onRefresh={refresh} isCurrent={isCurrent} canRecover={canRecover}/>:null)}</div>:<p className="em-request-notice">{unconfirmed.length?'Some shifts still need an eligibility check. Refresh to try again.':'No eligible open shifts right now. Check back when more coverage is offered.'}</p>}
      </section>
      {unconfirmed.length?<section aria-labelledby="em-unconfirmed-heading"><h2 id="em-unconfirmed-heading">Eligibility unavailable</h2><ul className="em-request-list">{unconfirmed.map(row=><li className="em-refusal" key={row.id}><strong>{day(row.date)} · {formatTime(row.startTime)}</strong><span>{row.location}</span><p>{row.notice}</p></li>)}</ul></section>:null}
      {refused.length?<details className="em-refused"><summary>Why other shifts aren’t available <CaretDownIcon aria-hidden="true"/></summary><ul className="em-request-list">{refused.map(row=><li className="em-refusal" key={row.id}><strong>{day(row.date)} · {formatTime(row.startTime)}</strong><span>{row.location}</span><p>{row.notice}</p></li>)}</ul></details>:null}
     </>}
     <div className="em-request-links"><Link href="/app/exchange?tab=foryou">Swaps for you</Link><Link href="/app/exchange?tab=requests">My shift requests</Link><Link href="/app/schedule">My schedule</Link></div>
    </>:<p className="em-request-notice" role="status">Shift pickup is turned off for your company.</p>}
    <footer className="em-request-footer"><span>Checked {new Intl.DateTimeFormat('en-US',{timeZone:snapshot.timeZone,hour:'numeric',minute:'2-digit'}).format(new Date(snapshot.observedAt))}</span><button type="button" disabled={state.refreshing} onClick={refresh}>{state.refreshing?'Refreshing…':'Refresh'}</button></footer>
   </>}
  </div>
 </div>;
}
