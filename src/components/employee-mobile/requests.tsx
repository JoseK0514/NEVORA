'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {InfoIcon} from '@phosphor-icons/react/dist/ssr/Info';
import {CorpButton,CorpButtonLink,CorpCard,CorpNav,CorpNote,CorpPage,CorpRow,CorpRows} from '../corp/corp';
import {EmployeeRequestsCorp,requestDay,requestsSubtitle,shiftPill,timeOffDetail,timeOffPill,waitingStatus,waitsOnManager,type CorpRequestRow} from '../employee-requests-corp';
import {accountCopy} from '../employee-b/account-copy';
import {BStateCard,IncomingB,InlineRetryB,RequestsHubB,RequestsWaitB,bPillText,bTone,type BRequestRow} from '../employee-b/requests-b';
import {OpenShiftsB,PickupResultB,type OpenRowB} from '../employee-b/exchange-b';
import {BButton,BButtonLink,BState} from '../owner-b/b-kit';
import {momentsCopy} from '../owner-b/moments-copy';
import {keepWhole} from '@/lib/keep-whole';
import {createPrivateSnapshotController,type PrivatePanelState} from '@/lib/private-snapshot-client';
import {parseEmployeeRequests,type EmployeeRequestsSnapshot,type OpenEmployeeShift,type OwnRequest} from '@/lib/employee-requests';
import {shiftChangeAction,reconcileShiftChangeAction} from '@/app/app/exchange/actions';
import {shiftChangeFeedback} from '../shift-change-form-state';
import {useEmployeeBScreen} from './use-mobile';
import {PickupOperation} from './pickup-operation';
import {addDays,weekStartFor} from '@/lib/date-utils';
import {offlineListener} from '@/lib/offline-hold';
import {clockText,displayDateText,type MobileLang} from './mobile-format';
import {useMobileLang} from './mobile-lang';
import {requestsCopy,timeOffDetailEs} from './copy/requests';

type Mode='hub'|'open';
type Copy=typeof requestsCopy.en;
const dayIn=(lang:MobileLang)=>lang==='en'?requestDay:(date:string)=>displayDateText(date,lang);
const timeIn=(lang:MobileLang)=>(time:string)=>clockText(time,lang);
const href=(row:OwnRequest)=>row.kind==='timeOff'?`/app/requests?requestId=${encodeURIComponent(row.id)}`:`/app/exchange?tab=requests&requestId=${encodeURIComponent(row.id)}`;
const pillOf=(row:OwnRequest)=>row.kind==='timeOff'?timeOffPill(row.status):shiftPill(row.status,row.kind==='callout');
const requestRow=(row:OwnRequest,t:Copy,lang:MobileLang):CorpRequestRow=>{
 const title=row.kind==='timeOff'?t.timeOff:row.kind==='callout'?t.cantWork:t.shiftRequest;
 // Time off shows its whole range and length (Codex A1: Nov 11–12 read as Nov 11 alone). The row's name is the kit's
 // "title, detail, status", the same as on desktop.
 const range={startDate:row.date,endDate:row.endDate??row.date,startTime:row.startTime,endTime:row.endTime};
 const detail=row.kind==='timeOff'&&row.endDate?keepWhole(lang==='en'?timeOffDetail(range):timeOffDetailEs(range)):dayIn(lang)(row.date);
 // A row waiting on the manager keeps the kit's word: the shared card reads it to say who it waits on, and never draws it.
 const pill=pillOf(row);
 return {key:row.kind+row.id,href:href(row),title,detail,pill:waitsOnManager(pill)?pill:{tone:pill.tone,text:t.pills[pill.text]??pill.text}};
};
/** The same request as a Direction B row: its type icon, and its status as a chip in today's tones. */
const requestRowB=(row:OwnRequest,t:Copy,lang:MobileLang):BRequestRow=>{const corp=requestRow(row,t,lang),pill=pillOf(row),text=bPillText(pill.text);return {key:corp.key,href:corp.href,kind:row.kind,title:corp.title,sub:corp.detail,chip:{tone:bTone(corp.pill.tone),text:t.pills[text]??text}};};
/** Swaps addressed to you, inside the Waiting card: a row when some need your answer, a retry when they couldn't be checked. */
export function IncomingRequestSection({count,onRetry}:{count:number|null;onRetry:()=>void}){
 const lang=useMobileLang(),t=requestsCopy[lang];
 if(count===null)return <div className="c-ereq__inline"><span role="status">{t.swapsUnchecked}<Link className="c-link" href="/app/exchange?tab=foryou">{t.openSwapsForYou}</Link></span><button className="c-ereq__retry" type="button" onClick={onRetry}>{t.tryAgain}</button></div>;
 return count?<CorpRows label={t.needsAnswer}><li><CorpRow href="/app/exchange?tab=foryou" bold title={count===1?accountCopy(lang).swapForYou:t.swapsNeedAnswer(count)} detail={t.reviewShifts} chevron/></li></CorpRows>:null;
}
/** One pickup: its button ("action"), its outcome ("status"), or both stacked. `look="b"` draws the same controls for the
 * Direction B phone screen; its copy passes `effects={false}` so the refresh after a settled pickup runs once (the corporate
 * copy is always mounted). */
export function Pickup({operation,onRefresh,canSubmit=false,isCurrent=()=>false,canRecover=()=>false,part='all',label,look='corp',effects=true}:{operation:PickupOperation;onRefresh:()=>void;canSubmit?:boolean;isCurrent?:(operation:PickupOperation)=>boolean;canRecover?:()=>boolean;part?:'all'|'action'|'status';label?:string;look?:'corp'|'b';effects?:boolean}){
 useSyncExternalStore(operation.subscribe,operation.snapshot,operation.snapshot);
 const lang=useMobileLang(),t=requestsCopy[lang],M=momentsCopy(lang);
 const current=operation.state,result=current.result,resolved=result&&['completed','pending','closed'].includes(result.status);
 useEffect(()=>{if(effects&&resolved&&part!=='action')onRefresh();},[effects,resolved,onRefresh,part]);
 const won=!!result&&(result.status==='completed'||result.status==='pending');
 // Phase 7 (moments): the pressed button leaves with the row's action, so focus goes to the result's title (the copy on
 // screen only, and only when focus was lost). The title is then what is read.
 const doneTitle=useRef<HTMLElement>(null);
 useEffect(()=>{const title=doneTitle.current,active=document.activeElement;if(won&&title?.getClientRects().length&&(!active||active===document.body))title.focus({preventScroll:true});},[won]);
 const run=()=>{if(canSubmit&&navigator.onLine)void operation.submit(shiftChangeAction,()=>isCurrent(operation));};
 const check=()=>{if(navigator.onLine)void operation.retry(reconcileShiftChangeAction,shiftChangeAction,canRecover);};
 const b=look==='b';
 const ready=canSubmit&&(!result||!resolved&&!current.uncertain),word=current.pending?t.submitting:t.pickUp;
 const action=ready?b?<BButton kind="ghost" disabled={current.pending} onClick={run} label={label}>{word}</BButton>:<CorpButton kind="secondary" size="sm" disabled={current.pending} onClick={run} aria-label={label}>{word}</CorpButton>:null;
 if(part==='action')return action;
 const next=resolved?{href:result.status==='completed'?'/app/schedule':'/app/exchange?tab=requests',text:result.status==='completed'?M.viewSchedule:M.viewRequests}:null;
 const status=<>
  {current.pending&&current.uncertain?<p role="status">{t.checkingOriginal}</p>:null}
  {/* Phase 7 (moments): a pickup the server confirmed is the shared done state in place of the row's button. "pending"
    * is requested, not yours yet; a closed request and every refusal keep their own line and never borrow the mark. */}
  {result&&won&&next?<BState kind="done" titleRef={doneTitle} title={result.status==='completed'?M.pickupDone:M.pickupSent} line={result.status==='completed'?M.pickupDoneLine:M.pickupSentLine} action={{label:next.text,href:next.href}}/>
   :result?<p role={resolved?'status':'alert'}>{shiftChangeFeedback(result)}</p>:null}
  {current.uncertain?b?<BButton kind="quiet" full disabled={current.pending} onClick={check}>{t.checkPickup}</BButton>:<CorpButton kind="secondary" size="sm" disabled={current.pending} onClick={check}>{t.checkPickup}</CorpButton>:null}
  {result&&!current.uncertain&&!resolved?b?<BButton kind="quiet" full onClick={onRefresh}>{t.refreshOptions}</BButton>:<CorpButton kind="secondary" size="sm" onClick={onRefresh}>{t.refreshOptions}</CorpButton>:null}
  {next&&!won?b?<BButtonLink href={next.href} kind="quiet" full>{next.text}</BButtonLink>:<CorpButtonLink href={next.href} kind="secondary" size="sm">{next.text}</CorpButtonLink>:null}
 </>;
 return <div className={b?'eb-pickup':'c-ereq__result em-pickup'} aria-busy={current.pending}>{part==='all'?action:null}{status}</div>;
}
/** Whether a pickup has an outcome to show under its row. */
function usePickupStatus(operation:PickupOperation){useSyncExternalStore(operation.subscribe,operation.snapshot,operation.snapshot);return !!(operation.state.result||operation.state.uncertain);}
const shiftHours=(shift:{startTime:string;endTime:string})=>{const m=(t:string)=>{const [h,mm]=t.split(':').map(Number);return h*60+mm;};const a=m(shift.startTime),b=m(shift.endTime),total=b>a?b-a:b+1440-a,h=Math.round(total/6)/10;return `${Number.isInteger(h)?h:h.toFixed(1)} h`;};
function ShiftCard({shift,operation,onRefresh,selected,nextWeek,isCurrent,canRecover}:{shift:OpenEmployeeShift;operation:PickupOperation;onRefresh:()=>void;selected:boolean;nextWeek:boolean;isCurrent:(operation:PickupOperation)=>boolean;canRecover:()=>boolean}){
 const card=useRef<HTMLDivElement>(null),lang=useMobileLang(),t=requestsCopy[lang],day=dayIn(lang),formatTime=timeIn(lang);
 useEffect(()=>{if(selected)card.current?.scrollIntoView({block:'center'});},[selected]);
 const overnight=shift.endTime<=shift.startTime;
 const time=`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`;
 return <div ref={card} id={'request-'+shift.id} data-selected={selected||undefined} className="c-ereq__shift">
  <CorpCard label={day(shift.date)} aside={nextWeek?t.nextWeek:undefined}>
   <div className="c-ereq__open">
    <span className="c-row__main"><span className="c-row__title">{time}</span><span className="c-row__detail"><span>{[shift.position,shift.location,shiftHours(shift),overnight?t.ends(day(addDays(shift.date,1))):null].filter(Boolean).join(' · ')}</span></span></span>
    <Pickup part="action" operation={operation} onRefresh={onRefresh} canSubmit={operation.revision===shift.revision} isCurrent={isCurrent} canRecover={canRecover} label={t.pickUpLabel(day(shift.date),time)}/>
   </div>
   <Pickup part="status" operation={operation} onRefresh={onRefresh} canSubmit={operation.revision===shift.revision} isCurrent={isCurrent} canRecover={canRecover}/>
  </CorpCard>
 </div>;
}
/** A pickup's outcome under its Direction B row, only when it has one. */
function PickupStatusB(props:{operation:PickupOperation;onRefresh:()=>void;canSubmit:boolean;isCurrent:(operation:PickupOperation)=>boolean;canRecover:()=>boolean}){
 return usePickupStatus(props.operation)?<Pickup look="b" effects={false} part="status" {...props}/>:null;
}
export function ResponsiveEmployeeRequests({authority,mode,selected,children}:{authority:string;mode:Mode;selected?:string;children:ReactNode}){
 const mobile=useEmployeeBScreen(),t=requestsCopy[useMobileLang()];
 return mobile?<div className="em-requests-mobile"><EmployeeMobileRequests key={authority} authority={authority} mode={mode} selected={selected}/></div>:<>{children}<div className="em-requests-mobile"><p className="em-request-loading" role="status">{t.loadingRequests}</p>
  {/* Direction B: the phone's first frame is this page's hero, checking (phones only). */}
  <RequestsWaitB page={mode==='hub'?'hub':'open'} text={t.checkingRequests}/></div></>;
}
function EmployeeMobileRequests({authority,mode,selected}:{authority:string;mode:Mode;selected?:string}){
 const [state,setState]=useState<PrivatePanelState<EmployeeRequestsSnapshot>>({snapshot:null,refreshing:true,paused:false});
 const lang=useMobileLang(),t=requestsCopy[lang],day=dayIn(lang),formatTime=timeIn(lang);
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
  const offline=offlineListener({pause:()=>controller.pause(),hold:()=>controller.hold()});for(const event of ['blur','pagehide'])window.addEventListener(event,pause);window.addEventListener('offline',offline);
  for(const event of ['focus','pageshow','online','storage'])window.addEventListener(event,sync);
  void Promise.resolve().then(()=>{if(mounted)sync();});
  return()=>{mounted=false;lifetime.current=null;controller.stop();control.current=null;document.removeEventListener('visibilitychange',sync);for(const event of ['blur','pagehide'])window.removeEventListener(event,pause);window.removeEventListener('offline',offline);for(const event of ['focus','pageshow','online','storage'])window.removeEventListener(event,sync);};
 },[authority,pathname]);
 const snapshot=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.authority===authority?state.snapshot:null;
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 const eligible=snapshot?.open?.filter(row=>row.check==='eligible')??[],unconfirmed=snapshot?.open?.filter(row=>row.check==='unavailable')??[],refused=snapshot?.open?.filter(row=>row.check==='refused')??[];
 const viewState=state.paused?'paused':snapshot?'ready':denied?'denied':state.refreshing?'loading':'unavailable';
 const [hash,setHash]=useState('');
 useEffect(()=>{const read=()=>setHash(decodeURIComponent(window.location.hash.slice(1)));read();window.addEventListener('hashchange',read);return()=>window.removeEventListener('hashchange',read);},[]);
 const stateText=state.paused?t.paused:denied?t.denied:state.refreshing?t.checkingRequests:t.failed;
 const unavailable=!snapshot?<CorpCard ariaLabel={t.statusLabel}><div className="c-card__body"><p className="c-ereq__state" role="status">{stateText}</p>
  {denied?<CorpButtonLink href="/login" kind="secondary" size="md" full>{t.signIn}</CorpButtonLink>:!state.paused&&!state.refreshing?<CorpButton kind="secondary" size="md" full onClick={refresh}>{t.tryAgain}</CorpButton>:null}</div></CorpCard>:null;
 const stateB=!snapshot?<BStateCard label={t.statusLabel} text={stateText}
  denied={denied} retry={!state.paused&&!state.refreshing?refresh:null} kind={state.paused?'paused':undefined}/>:null;
 if(mode==='hub'){
  const modules=snapshot?.modules;
  const recent=snapshot?.recent;
  const subtitle=lang==='en'?requestsSubtitle(modules):t.subtitle(modules);
  // Review B2 (NV-140): waiting requests read soonest first.
  const soonest=(a:{date:string;startTime:string|null},b:{date:string;startTime:string|null})=>a.date.localeCompare(b.date)||(a.startTime??'').localeCompare(b.startTime??'');
  const waiting=recent?recent.filter(row=>waitingStatus(row.status)).sort(soonest).map(row=>requestRow(row,t,lang)):[],decided=recent?recent.filter(row=>!waitingStatus(row.status)).slice(0,3).map(row=>requestRow(row,t,lang)):[];
  const incoming=modules?.marketplace&&snapshot!.incoming!==0?<IncomingRequestSection count={snapshot!.incoming} onRetry={refresh}/>:null;
  const historyFailed=snapshot&&recent===null?<div className="c-ereq__inline"><span role="status">{t.historyUnchecked}</span><button className="c-ereq__retry" type="button" disabled={state.refreshing} onClick={refresh}>{t.tryAgain}</button></div>:null;
  const waitingB=recent?recent.filter(row=>waitingStatus(row.status)).sort(soonest).map(row=>requestRowB(row,t,lang)):[],decidedB=recent?recent.filter(row=>!waitingStatus(row.status)).slice(0,3).map(row=>requestRowB(row,t,lang)):[];
  const incomingB=modules?.marketplace&&snapshot!.incoming!==0?<IncomingB count={snapshot!.incoming} onRetry={refresh}/>:null;
  const historyFailedB=snapshot&&recent===null?<InlineRetryB text={t.historyUnchecked} onRetry={refresh} busy={state.refreshing}/>:null;
  return <EmployeeRequestsCorp className="em-requests-corp" state={viewState}
   b={<RequestsHubB sub={subtitle} newHref={modules?.timeOff?'/app/requests?tab=new':null}
    waiting={snapshot?waitingB:null} decided={snapshot?decidedB:null} forManager={waiting.every(row=>waitsOnManager(row.pill))}
    decidedHref={modules?.timeOff?'/app/requests?filter=decided':modules?.marketplace?'/app/exchange?tab=requests':null}
    waitingExtra={incomingB||historyFailedB?<>{incomingB}{historyFailedB}</>:null} extraCount={incomingB&&snapshot!.incoming?snapshot!.incoming:0} state={stateB}
    answer={modules?.marketplace&&snapshot?snapshot.incoming:null} shiftRequests={!!modules?.marketplace}/>}
   sub={subtitle}
   newHref={modules?.timeOff?'/app/requests?tab=new':null}
   waiting={snapshot?waiting:null} decided={snapshot?decided:null}
   decidedHref={modules?.timeOff?'/app/requests?filter=decided':modules?.marketplace?'/app/exchange?tab=requests':null}
   waitingExtra={incoming||historyFailed?<>{incoming}{historyFailed}</>:null}
   notice={unavailable}/>;
 }
 const todayHere=snapshot?new Intl.DateTimeFormat('en-CA',{timeZone:snapshot.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(snapshot.observedAt)):null;
 const nextWeekStart=todayHere?addDays(weekStartFor(todayHere),7):null;
 const outcomes=new Set(eligible.map(shift=>shift.outcome));
 const note=eligible.length?outcomes.has('pending')&&!outcomes.has('completed')?t.noteConfirm:outcomes.has('completed')&&!outcomes.has('pending')?t.noteRightAway:t.noteMixed:null;
 const orphans=[...operations.values()].filter(item=>(item.state.pending||item.state.result)&&!eligible.some(shift=>shift.id===item.requestId));
 return <CorpPage className="c-ereq em-requests-corp" label={t.openShifts}>
  {/* Direction B: Pick up and swap's Open shifts (phones only). The Pick up buttons drive the same operations. */}
  <OpenShiftsB state={stateB} enabled={snapshot?snapshot.modules.marketplace:null} failed={!!snapshot&&snapshot.open===null} refreshing={state.refreshing} onRefresh={refresh}
   results={orphans.map(item=><PickupResultB key={item.requestId}><Pickup look="b" effects={false} operation={item} onRefresh={refresh} canRecover={canRecover}/></PickupResultB>)}
   rows={eligible.flatMap(shift=>{const operation=operations.get(shift.id);if(!operation)return [];return [{shift,hours:shiftHours(shift),nextWeek:!!nextWeekStart&&shift.date>=nextWeekStart,selected:selected===shift.id||hash==='request-'+shift.id,
    action:<Pickup look="b" part="action" operation={operation} onRefresh={refresh} canSubmit={operation.revision===shift.revision} isCurrent={isCurrent} canRecover={canRecover} label={t.pickUpLabel(day(shift.date),`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`)}/>,
    status:<PickupStatusB operation={operation} onRefresh={refresh} canSubmit={operation.revision===shift.revision} isCurrent={isCurrent} canRecover={canRecover}/>} satisfies OpenRowB];})}
   unconfirmed={unconfirmed} refused={refused} note={note} forYou={snapshot?.state==='ready'?snapshot.incoming:null}/>
  <div className="c-ereq__body" data-requests-state={viewState}>
   <CorpNav back={{href:'/app/schedule',label:t.back}} title={t.openShifts}/>
   {unavailable??(snapshot!.modules.marketplace?<>
    <CorpRows><li><CorpRow href="/app/exchange/open-shifts" title={t.postedOpenShifts} /></li></CorpRows>
    {orphans.map(item=><CorpCard key={item.requestId} ariaLabel={t.pickupResult}><div className="c-card__body"><Pickup operation={item} onRefresh={refresh} canRecover={canRecover}/></div></CorpCard>)}
    {snapshot!.open===null?<CorpCard ariaLabel={t.openShifts}><div className="c-card__body"><p className="c-ereq__state" role="status">{t.openUnchecked}</p><CorpButton kind="secondary" size="md" full disabled={state.refreshing} onClick={refresh}>{t.tryAgain}</CorpButton></div></CorpCard>:<>
     <p className="c-ereq__lede" id="em-eligible-heading">{eligible.length?t.ledeEligible:unconfirmed.length?t.ledeUnconfirmed:t.ledeNone}</p>
     {eligible.map(shift=>operations.has(shift.id)?<ShiftCard key={shift.id} shift={shift} selected={selected===shift.id||hash==='request-'+shift.id} nextWeek={!!nextWeekStart&&shift.date>=nextWeekStart} operation={operations.get(shift.id)!} onRefresh={refresh} isCurrent={isCurrent} canRecover={canRecover}/>:null)}
     {!eligible.length&&unconfirmed.length?<CorpButton kind="secondary" size="md" full disabled={state.refreshing} onClick={refresh}>{t.refresh}</CorpButton>:null}
     {unconfirmed.length?<CorpCard label={t.couldntCheck} id="em-unconfirmed"><CorpRows>{unconfirmed.map(row=><li key={row.id}><CorpRow title={`${day(row.date)} · ${formatTime(row.startTime)}`} detail={row.notice?`${row.location} · ${row.notice}`:row.location}/></li>)}</CorpRows></CorpCard>:null}
     {refused.length?<details className="c-ereq__why"><summary>{t.whyNot}<CaretDownIcon weight="bold" aria-hidden="true"/></summary><ul>{refused.map(row=><li key={row.id}><strong>{day(row.date)} · {formatTime(row.startTime)}</strong><span>{row.location}</span>{row.notice?<p>{row.notice}</p>:null}</li>)}</ul></details>:null}
     {note?<CorpNote icon={<InfoIcon weight="bold" className="c-ic" aria-hidden="true"/>}>{note}</CorpNote>:null}
    </>}
   </>:<CorpCard ariaLabel={t.openShifts}><div className="c-card__body"><p className="c-ereq__state" role="status">{t.pickupOff}</p></div></CorpCard>)}
  </div>
 </CorpPage>;
}
