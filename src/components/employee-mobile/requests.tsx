'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {InfoIcon} from '@phosphor-icons/react/dist/ssr/Info';
import {CorpButton,CorpButtonLink,CorpCard,CorpNav,CorpNote,CorpPage,CorpPill,CorpRow,CorpRows,CorpTitle} from '../corp/corp';
import {EmployeeRequestsCorp,requestDay,shiftPill,timeOffDetail,timeOffPill,waitingStatus,type CorpRequestRow} from '../employee-requests-corp';
import {keepWhole} from '@/lib/keep-whole';
import {createPrivateSnapshotController,type PrivatePanelState} from '@/lib/private-snapshot-client';
import {parseEmployeeRequests,type EmployeeRequestsSnapshot,type OpenEmployeeShift,type OwnRequest} from '@/lib/employee-requests';
import {shiftChangeAction,reconcileShiftChangeAction} from '@/app/app/exchange/actions';
import {shiftChangeFeedback} from '../shift-change-form-state';
import {useEmployeeMobile} from './use-mobile';
import {PickupOperation} from './pickup-operation';
import {formatTime,addDays,weekStartFor} from '@/lib/date-utils';

type Mode='hub'|'open';
const day=requestDay;
const href=(row:OwnRequest)=>row.kind==='timeOff'?`/app/requests?requestId=${encodeURIComponent(row.id)}`:`/app/exchange?tab=requests&requestId=${encodeURIComponent(row.id)}`;
const requestRow=(row:OwnRequest):CorpRequestRow=>{
 const title=row.kind==='timeOff'?'Time off':row.kind==='callout'?'Can’t work':'Shift request';
 // Time off shows its whole range and length (Codex A1: Nov 11–12 read as Nov 11 alone). The row's name is the kit's
 // "title, detail, status", the same as on desktop.
 const detail=row.kind==='timeOff'&&row.endDate?keepWhole(timeOffDetail({startDate:row.date,endDate:row.endDate,startTime:row.startTime,endTime:row.endTime})):day(row.date);
 return {key:row.kind+row.id,href:href(row),title,detail,pill:row.kind==='timeOff'?timeOffPill(row.status):shiftPill(row.status,row.kind==='callout')};
};
/** Swaps addressed to you, inside the Waiting card: a row when some need your answer, a retry when they couldn't be checked. */
export function IncomingRequestSection({count,onRetry}:{count:number|null;onRetry:()=>void}){
 if(count===null)return <div className="c-ereq__inline"><span role="status">Swaps for you couldn’t be checked. <Link className="c-link" href="/app/exchange?tab=foryou">Open swaps for you</Link></span><button className="c-ereq__retry" type="button" onClick={onRetry}>Try again</button></div>;
 return count?<CorpRows label="Needs your answer"><li><CorpRow href="/app/exchange?tab=foryou" bold title={count===1?'A teammate requested a swap':`${count} swaps need your answer`} detail="Review the shifts before responding" trail={<CorpPill tone="amber">Needs your answer</CorpPill>} chevron/></li></CorpRows>:null;
}
/** One pickup: its button ("action"), its outcome ("status"), or both stacked. */
export function Pickup({operation,onRefresh,canSubmit=false,isCurrent=()=>false,canRecover=()=>false,part='all',label}:{operation:PickupOperation;onRefresh:()=>void;canSubmit?:boolean;isCurrent?:(operation:PickupOperation)=>boolean;canRecover?:()=>boolean;part?:'all'|'action'|'status';label?:string}){
 useSyncExternalStore(operation.subscribe,operation.snapshot,operation.snapshot);
 const current=operation.state,result=current.result,resolved=result&&['completed','pending','closed'].includes(result.status);
 useEffect(()=>{if(resolved&&part!=='action')onRefresh();},[resolved,onRefresh,part]);
 const run=()=>{if(canSubmit&&navigator.onLine)void operation.submit(shiftChangeAction,()=>isCurrent(operation));};
 const action=canSubmit&&(!result||!resolved&&!current.uncertain)?<CorpButton kind="secondary" size="sm" disabled={current.pending} onClick={run} aria-label={label}>{current.pending?'Submitting…':'Pick up'}</CorpButton>:null;
 if(part==='action')return action;
 const status=<>
  {current.pending&&current.uncertain?<p role="status">Checking the original request…</p>:null}
  {result?<p role={resolved?'status':'alert'}>{result.status==='completed'?'Shift pickup completed. Check your current schedule.':result.status==='pending'?'Pickup requested. Your assignment is awaiting review.':shiftChangeFeedback(result)}</p>:null}
  {current.uncertain?<CorpButton kind="secondary" size="sm" disabled={current.pending} onClick={()=>{if(navigator.onLine)void operation.retry(reconcileShiftChangeAction,shiftChangeAction,canRecover);}}>Check pickup status</CorpButton>:null}
  {result&&!current.uncertain&&!resolved?<CorpButton kind="secondary" size="sm" onClick={onRefresh}>Refresh shift options</CorpButton>:null}
  {resolved?<CorpButtonLink href={result.status==='completed'?'/app/schedule':'/app/exchange?tab=requests'} kind="secondary" size="sm">{result.status==='completed'?'View my schedule':'View my requests'}</CorpButtonLink>:null}
 </>;
 return <div className="c-ereq__result em-pickup" aria-busy={current.pending}>{part==='all'?action:null}{status}</div>;
}
const shiftHours=(shift:{startTime:string;endTime:string})=>{const m=(t:string)=>{const [h,mm]=t.split(':').map(Number);return h*60+mm;};const a=m(shift.startTime),b=m(shift.endTime),total=b>a?b-a:b+1440-a,h=Math.round(total/6)/10;return `${Number.isInteger(h)?h:h.toFixed(1)} h`;};
function ShiftCard({shift,operation,onRefresh,selected,nextWeek,isCurrent,canRecover}:{shift:OpenEmployeeShift;operation:PickupOperation;onRefresh:()=>void;selected:boolean;nextWeek:boolean;isCurrent:(operation:PickupOperation)=>boolean;canRecover:()=>boolean}){
 const card=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(selected)card.current?.scrollIntoView({block:'center'});},[selected]);
 const overnight=shift.endTime<=shift.startTime;
 const time=`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`;
 return <div ref={card} id={'request-'+shift.id} data-selected={selected||undefined} className="c-ereq__shift">
  <CorpCard label={day(shift.date)} aside={nextWeek?'Next week':undefined}>
   <div className="c-ereq__open">
    <span className="c-row__main"><span className="c-row__title">{time}</span><span className="c-row__detail"><span>{[shift.position,shift.location,shiftHours(shift),overnight?`ends ${day(addDays(shift.date,1))}`:null].filter(Boolean).join(' · ')}</span></span></span>
    <Pickup part="action" operation={operation} onRefresh={onRefresh} canSubmit={operation.revision===shift.revision} isCurrent={isCurrent} canRecover={canRecover} label={`Pick up ${day(shift.date)}, ${time}`}/>
   </div>
   <Pickup part="status" operation={operation} onRefresh={onRefresh} canSubmit={operation.revision===shift.revision} isCurrent={isCurrent} canRecover={canRecover}/>
  </CorpCard>
 </div>;
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
  },value=>{const read=parseEmployeeRequests(value);return read.state==='ready'&&read.authority!==authority?{state:'unavailable',reason:'access_denied'}:read;},reason=>({state:'unavailable',reason}),()=>'read_failed');
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
 const viewState=state.paused?'paused':snapshot?'ready':denied?'denied':state.refreshing?'loading':'unavailable';
 const [hash,setHash]=useState('');
 useEffect(()=>{const read=()=>setHash(decodeURIComponent(window.location.hash.slice(1)));read();window.addEventListener('hashchange',read);return()=>window.removeEventListener('hashchange',read);},[]);
 const unavailable=!snapshot?<CorpCard ariaLabel="Requests status"><div className="c-card__body"><p className="c-ereq__state" role="status">{state.paused?'Requests paused. Return to this page or reconnect to refresh.':denied?'Your access changed. Sign in again to continue.':state.refreshing?'Checking your current requests…':'We couldn’t load your requests. Try again.'}</p>
  {denied?<CorpButtonLink href="/login" kind="secondary" size="md" full>Sign in</CorpButtonLink>:!state.paused&&!state.refreshing?<CorpButton kind="secondary" size="md" full onClick={refresh}>Try again</CorpButton>:null}</div></CorpCard>:null;
 if(mode==='hub'){
  const modules=snapshot?.modules;
  const recent=snapshot?.recent;
  const waiting=recent?recent.filter(row=>waitingStatus(row.status)).map(requestRow):[],decided=recent?recent.filter(row=>!waitingStatus(row.status)).slice(0,3).map(requestRow):[];
  const incoming=modules?.marketplace&&snapshot!.incoming!==0?<IncomingRequestSection count={snapshot!.incoming} onRetry={refresh}/>:null;
  const historyFailed=snapshot&&recent===null?<div className="c-ereq__inline"><span role="status">Your request history couldn’t be checked.</span><button className="c-ereq__retry" type="button" disabled={state.refreshing} onClick={refresh}>Try again</button></div>:null;
  return <EmployeeRequestsCorp className="em-requests-corp" state={viewState}
   sub={modules?modules.timeOff&&modules.marketplace?'Time off, swaps and shift changes':modules.timeOff?'Time off':'Swaps and shift changes':'Time off and shift changes'}
   newHref={modules?.timeOff?'/app/requests?tab=new':null}
   waiting={snapshot?waiting:null} decided={snapshot?decided:null}
   decidedHref={modules?.timeOff?'/app/requests?filter=decided':modules?.marketplace?'/app/exchange?tab=requests':null}
   waitingExtra={incoming||historyFailed?<>{incoming}{historyFailed}</>:null}
   notice={unavailable}/>;
 }
 const todayHere=snapshot?new Intl.DateTimeFormat('en-CA',{timeZone:snapshot.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(snapshot.observedAt)):null;
 const nextWeekStart=todayHere?addDays(weekStartFor(todayHere),7):null;
 const outcomes=new Set(eligible.map(shift=>shift.outcome));
 return <CorpPage className="c-ereq em-requests-corp" label="Open shifts">
  <div className="c-ereq__body" data-requests-state={viewState}>
   <CorpNav back={{href:'/app/schedule',label:'Schedule'}} title="Open shifts"/>
   {unavailable??(snapshot!.modules.marketplace?<>
    {[...operations.values()].filter(item=>(item.state.pending||item.state.result)&&!eligible.some(shift=>shift.id===item.requestId)).map(item=><CorpCard key={item.requestId} ariaLabel="Your pickup result"><div className="c-card__body"><Pickup operation={item} onRefresh={refresh} canRecover={canRecover}/></div></CorpCard>)}
    {snapshot!.open===null?<CorpCard ariaLabel="Open shifts"><div className="c-card__body"><p className="c-ereq__state" role="status">Open shifts couldn’t be checked.</p><CorpButton kind="secondary" size="md" full disabled={state.refreshing} onClick={refresh}>Try again</CorpButton></div></CorpCard>:<>
     <p className="c-ereq__lede" id="em-eligible-heading">{eligible.length?'Shifts at your locations you can pick up':unconfirmed.length?'Some shifts still need an eligibility check. Refresh to try again.':'No eligible open shifts right now. Check back when more coverage is offered.'}</p>
     {eligible.map(shift=>operations.has(shift.id)?<ShiftCard key={shift.id} shift={shift} selected={selected===shift.id||hash==='request-'+shift.id} nextWeek={!!nextWeekStart&&shift.date>=nextWeekStart} operation={operations.get(shift.id)!} onRefresh={refresh} isCurrent={isCurrent} canRecover={canRecover}/>:null)}
     {!eligible.length&&unconfirmed.length?<CorpButton kind="secondary" size="md" full disabled={state.refreshing} onClick={refresh}>Refresh</CorpButton>:null}
     {unconfirmed.length?<CorpCard label="Eligibility unavailable" id="em-unconfirmed"><CorpRows>{unconfirmed.map(row=><li key={row.id}><CorpRow title={`${day(row.date)} · ${formatTime(row.startTime)}`} detail={row.notice?`${row.location} · ${row.notice}`:row.location}/></li>)}</CorpRows></CorpCard>:null}
     {refused.length?<details className="c-ereq__why"><summary>Why other shifts aren’t available <CaretDownIcon aria-hidden="true"/></summary><ul>{refused.map(row=><li key={row.id}><strong>{day(row.date)} · {formatTime(row.startTime)}</strong><span>{row.location}</span>{row.notice?<p>{row.notice}</p>:null}</li>)}</ul></details>:null}
     {eligible.length?<CorpNote icon={<InfoIcon className="c-ic" aria-hidden="true"/>}>{outcomes.has('pending')&&!outcomes.has('completed')?'Your manager confirms before the shift is yours. You’ll get a notification either way.':outcomes.has('completed')&&!outcomes.has('pending')?'Picking up a shift makes it yours right away if it’s still open and you still meet the rules.':'Some shifts are yours right away; others need your manager to confirm. You’ll get a notification either way.'}</CorpNote>:null}
    </>}
   </>:<CorpCard ariaLabel="Open shifts"><div className="c-card__body"><p className="c-ereq__state" role="status">Shift pickup is turned off for your company.</p></div></CorpCard>)}
  </div>
 </CorpPage>;
}
