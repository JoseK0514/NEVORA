'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useState,useSyncExternalStore,type ReactNode} from 'react';
import {useEmployeeMobile} from './use-mobile';
import {useHours} from './use-hours';
import {HoursFrame} from './hours-frame';
import {HoursRecordsView,HoursUnavailable,hoursDay} from './hours-records';
import {HoursCardsView} from './hours-cards';
import {HoursCorrectionHistory,HoursCorrectionForm} from './hours-corrections';
import {HoursCorrectionOperation} from './hours-operation';
import {CorpFixTime,CorpCorrections,CorpHoursFrame,CorpHoursNav,CorpHoursSheetHead,CorpHoursTitle,CorpHoursUnavailable,CorpPastTimecards,CorpTimeEntry,CorpTimeTab,cardsHref,dateKey,dayMedium,timeSubtitle} from './hours-corp';
import {saveEmployeeHoursCorrection} from '@/app/app/employee-hours/actions';
import type {HoursView,HoursCorrectionPayload} from '@/lib/employee-hours';
import type {HoursDraft} from '@/lib/employee-hours-draft';
import type {Period} from '@/lib/timecards/project';
type Props={/** Corporate (Release 1): an Employee's Time tab on the kit. */corporate?:boolean;/** The records view's title: "Time" on an Employee's own tab, "Hours" for a Lead. */tabTitle?:string;authority:string;view:HoursView;period:Period;entryId:string|null;requestId:string|null;edit:string|null;filter:string;fromCards:boolean;
 /** The workspace's business date, so Past timecards offers later weeks only up to this one. */
 today?:string;
 /** The tab page Hours belongs to when Pay owns it; null when Hours is its own tab. */
 parent:{href:string;label:string}|null};
const editEntry=(edit:string|null)=>edit?.startsWith('entry:')?edit.slice(6):edit?.startsWith('break:')?edit.split(':')[1]:null;
export function ResponsiveEmployeeHours({children,...props}:Props&{children?:ReactNode}){const mobile=useEmployeeMobile();
 // Corporate (Release 1): an Employee's Time is the same kit page on a phone and in the desktop column.
 if(props.corporate)return <EmployeeHours key={props.authority} {...props}/>;
 return mobile?<div className="em-requests-mobile"><EmployeeHours key={props.authority} {...props}/></div>:<>{children}<div className="em-requests-mobile"><p className="em-request-loading" role="status">Loading your time…</p></div></>;}
function MobileTimecardsRedirect({period}:{period:Period}){const router=useRouter(),href='/app/my-time?view=cards&start='+period.startDate+'&end='+period.endDate;useEffect(()=>{router.replace(href,{scroll:false});},[router,href]);return <div className="em-requests-mobile"><p className="em-request-loading" role="status">Opening your timecards…</p><Link href={href}>Open my timecards</Link></div>;}
/** Corporate (Release 1): an Employee's timecards are Time's Past timecards on every screen; without a chosen period they
 * open on last week. */
function CorporateTimecardsRedirect({period}:{period:Period|null}){const router=useRouter(),href=period?'/app/my-time?view=cards&start='+period.startDate+'&end='+period.endDate:'/app/my-time?view=cards';useEffect(()=>{router.replace(href,{scroll:false});},[router,href]);return <div className="c-page" data-nv-page="" data-corp=""><p className="c-note" role="status"><span>Opening your timecards… <Link className="c-link c-link--l" href={href}>Open Past timecards</Link></span></p></div>;}
export function ResponsiveEmployeeTimecards({children,period,corporate=false,explicit=false}:{children?:ReactNode;period:Period;corporate?:boolean;explicit?:boolean}){const mobile=useEmployeeMobile();if(corporate)return <CorporateTimecardsRedirect period={explicit?period:null}/>;return mobile?<MobileTimecardsRedirect period={period}/>:<>{children}<div className="em-requests-mobile"><p className="em-request-loading" role="status">Loading your timecards…</p></div></>;}
function EmployeeHours({authority,view,period,entryId,requestId,edit,filter,fromCards,parent,tabTitle='Hours',corporate=false,today}:Props){
 const router=useRouter(),targetEntry=editEntry(edit),selection=view==='records'?'overview':view==='cards'?period.startDate+'_'+period.endDate:requestId??(targetEntry?'target:'+targetEntry:'list'),panel=useHours(authority,view,selection,edit),[drafts,setDrafts]=useState<Record<string,HoursDraft>>({}),[operation,setOperation]=useState(()=>new HoursCorrectionOperation()),[activeEdit,setActiveEdit]=useState<string|null>(null),[recoveryHref,setRecoveryHref]=useState<string|null>(null);
 useSyncExternalStore(operation.subscribe,operation.snapshot,operation.snapshot);
 // An access denial ends this page's correction recovery, as the earlier desktop correction panel did: after re-entry the
 // page never offers to resend a command from before the denial, and a late reply to it is not shown.
 const denied=panel.state.snapshot?.state==='unavailable'&&panel.state.snapshot.reason==='access_denied',[deniedSeen,setDeniedSeen]=useState(denied);
 if(denied!==deniedSeen){setDeniedSeen(denied);if(denied){setOperation(new HoursCorrectionOperation());setActiveEdit(null);setRecoveryHref(null);}}
 const read=panel.read,corrections=read?.view==='corrections'?read.data:null,snapshot=corrections?.snapshot.state==='ready'?corrections.snapshot:null;
 const detail=snapshot?.requests.find(r=>r.id===requestId),record=read?.view==='records'&&read.data.state==='ready'?[...read.data.today.entries,...read.data.recent.entries].find(e=>e.id===entryId):null;
 const editHref=edit?'/app/my-time?view=corrections&edit='+encodeURIComponent(edit)+(requestId?'&requestId='+requestId:'')+(fromCards?'&from=cards&start='+period.startDate+'&end='+period.endDate:''):null;
 const list='/app/my-time?view=corrections'+(detail?.status!=='PENDING'&&!!detail||filter==='decided'?'&filter=decided':'');
 const corpRoot=corporate&&!edit&&!requestId&&!entryId&&view!=='records';
 const back=corpRoot?'/app/my-time':edit?fromCards?'/app/my-time?view=cards&start='+period.startDate+'&end='+period.endDate:targetEntry?'/app/my-time?entry='+encodeURIComponent(targetEntry):requestId?'/app/my-time?view=corrections&requestId='+requestId:'/app/my-time?view=corrections':requestId?list+'#hours-request-'+requestId:entryId?'/app/my-time#hours-entry-'+entryId:parent?.href??null;
 const title=edit?edit==='new'?'Request missing time':'Request a correction':requestId?'Your correction':entryId?'Time entry':view==='cards'?(corporate?'Past timecards':'Timecards'):view==='corrections'?'Corrections':tabTitle;
 const sub=edit?'Propose the time your manager should review':requestId?'Original, proposed and current effective time':entryId&&record&&read?hoursDay(record.clockInAt,read.timeZone):view==='cards'?'Your effective hours and review history':view==='corrections'?'Your requests and manager decisions':'Your punches, breaks and recorded time';
 const contextKey=[view,selection,entryId??'',edit??'',filter].join('|');
 const send=async(payload:HoursCorrectionPayload)=>{const result=await saveEmployeeHoursCorrection(payload);panel.accept(result);return result;};
 const onSubmit=(payload:HoursCorrectionPayload)=>{if(!edit||!panel.allowed()||operation.pending||operation.uncertain)return;let owner=operation;if(operation.result?.status==='recorded'){owner=new HoursCorrectionOperation();setOperation(owner);}setActiveEdit(edit);setRecoveryHref(editHref);void owner.submit(payload,send,panel.allowed);};
 if(corporate){
  // One header per page (board sub-page bar); the Fix sheet draws Cancel · Fix my time · Send itself.
  const cardsData=read?.view==='cards'&&read.data.state==='ready'?read.data.cards[0]?.card:null,cardEntry=cardsData&&entryId?cardsData.entries.find(e=>e.id===entryId):null;
  const cancel=fromCards?cardsHref(period)+(targetEntry?'&entry='+encodeURIComponent(targetEntry):''):targetEntry?'/app/my-time?entry='+encodeURIComponent(targetEntry):requestId?'/app/my-time?view=corrections&requestId='+requestId:'/app/my-time';
  const head=edit?<CorpHoursSheetHead cancel={cancel}/>
   :view==='records'&&!entryId?<CorpHoursTitle sub={read?.view==='records'&&read.data.state==='ready'?timeSubtitle(read.data):undefined}/>
   :view==='records'?<CorpHoursNav back={{href:'/app/my-time#hours-entry-'+entryId,label:'Time'}} title={record&&read?dayMedium(dateKey(record.clockInAt,read.timeZone)):'Time entry'}/>
   :view==='cards'?entryId?<CorpHoursNav back={{href:cardsHref(period)+'#hours-card-entry-'+entryId,label:'Week'}} title={cardEntry&&cardsData?dayMedium(dateKey(cardEntry.startAt,cardsData.timeZone)):'Timecard day'}/>:<CorpHoursNav back={{href:'/app/my-time',label:'Time'}} title="Past timecards"/>
   :requestId?<CorpHoursNav back={{href:list+'#hours-request-'+requestId,label:'Back'}} title="Your correction"/>:<CorpHoursNav back={{href:'/app/my-time',label:'Time'}} title="Your corrections"/>;
  return <CorpHoursFrame contextKey={contextKey} view={view} state={panel.state} ready={!!read} refresh={panel.refresh} head={head} headInside={!!edit} sub={!!edit||!!entryId||!!requestId||view!=='records'}>
   {read?<>
    {(operation.pending||operation.uncertain)&&activeEdit!==edit&&recoveryHref?<div className="c-callout c-hours-stack" role="status"><span>An earlier fix still needs to be checked. Return to it before starting a new one.</span><div className="c-btns"><Link className="c-btn c-btn--secondary c-btn--sm" href={recoveryHref}>Return to my submission</Link></div></div>:null}
    {read.view==='records'?read.data.state!=='ready'?<CorpHoursUnavailable message={read.data.reason==='not_configured'?'Recorded time isn’t available for this account.':read.data.reason==='schema_missing'?'Recorded time isn’t available yet.':'Your recorded time couldn’t be checked.'} onRefresh={panel.refresh}/>
     :entryId?record?<CorpTimeEntry entry={record} zone={read.data.timeZone}/>:<CorpHoursUnavailable message="This day isn’t in your recent time. Past timecards has older weeks." onRefresh={panel.refresh}/>
     :<CorpTimeTab data={read.data}/>
    :read.view==='cards'?<CorpPastTimecards key={selection} data={read.data} period={period} today={today??period.endDate} entryId={entryId} onRefresh={panel.refresh}/>
    :edit?snapshot&&corrections?<CorpFixTime key={edit} snapshot={snapshot} basis={corrections.basis} edit={edit} draft={drafts[edit]} onDraft={draft=>setDrafts(previous=>({...previous,[edit]:draft}))} operation={operation} isActive={activeEdit===edit} otherPending={(operation.pending||operation.uncertain)&&activeEdit!==edit} onSubmit={onSubmit} onRetry={()=>{void operation.retry(send,panel.allowed);}} onReset={()=>{setOperation(new HoursCorrectionOperation());setActiveEdit(null);setDrafts(previous=>{const next={...previous};delete next[edit];return next;});}} onRefresh={panel.refresh} cancel={cancel}
      onEdit={next=>router.push('/app/my-time?view=corrections&edit='+encodeURIComponent(next)+(fromCards?'&from=cards&start='+period.startDate+'&end='+period.endDate:''),{scroll:false})}/>
     :<><CorpHoursSheetHead cancel={cancel}/><CorpHoursUnavailable message="Your time couldn’t be checked for a fix. Go back to Time and try again." onRefresh={panel.refresh}/></>
    :<CorpCorrections snapshot={read.data.snapshot} decisions={read.data.decisions} requestId={requestId} filter={filter} onRefresh={panel.refresh}/>}
   </>:null}
  </CorpHoursFrame>;
 }
 return <HoursFrame corporate={corporate} title={title} sub={sub} back={back} backLabel={corpRoot?tabTitle:edit?fromCards?'Timecards':targetEntry?'Time entry':requestId?'Your correction':'Corrections':requestId?'Corrections':entryId?tabTitle:parent?.label??null} contextKey={contextKey} view={view} editing={!!edit||!!entryId||!!requestId} state={panel.state} ready={!!read} refresh={panel.refresh}>
  {read?<>
   {(operation.pending||operation.uncertain)&&activeEdit!==edit&&recoveryHref?<section className="em-request-notice"><p>An earlier correction submission still needs to be checked. Return to it before starting a new proposal.</p><Link className="em-request-secondary" href={recoveryHref}>Return to my submission</Link></section>:null}
   {read.view==='records'?<HoursRecordsView data={read.data} entryId={entryId} onRefresh={panel.refresh} corporate={corporate}/>:read.view==='cards'?<HoursCardsView key={selection} data={read.data} period={period} onRefresh={panel.refresh} onPeriod={next=>router.push('/app/my-time?view=cards&start='+next.startDate+'&end='+next.endDate,{scroll:false})}/>:edit?snapshot&&corrections?<HoursCorrectionForm key={edit} snapshot={snapshot} basis={corrections.basis} edit={edit} draft={drafts[edit]} onDraft={draft=>setDrafts(previous=>({...previous,[edit]:draft}))} operation={operation} isActive={activeEdit===edit} otherPending={(operation.pending||operation.uncertain)&&activeEdit!==edit} onSubmit={onSubmit} onRetry={()=>{void operation.retry(send,panel.allowed);}} onReset={()=>{setOperation(new HoursCorrectionOperation());setActiveEdit(null);setDrafts(previous=>{const next={...previous};delete next[edit];return next;});}} onRefresh={panel.refresh} onEdit={next=>router.push('/app/my-time?view=corrections&edit='+encodeURIComponent(next)+(fromCards?'&from=cards&start='+period.startDate+'&end='+period.endDate:''),{scroll:false})}/>:<HoursUnavailable message="Your correction sources couldn’t be checked. Return to Hours to review your records." onRefresh={panel.refresh}/>:<HoursCorrectionHistory snapshot={read.data.snapshot} decisions={read.data.decisions} requestId={requestId} filter={filter} onRefresh={panel.refresh}/>}
  </>:null}
 </HoursFrame>;
}
