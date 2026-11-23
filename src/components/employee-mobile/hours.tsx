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
import {timeSubtitleShort} from './hours-model';
import {useMobileCopy,useMobileLang} from './mobile-lang';
import {hoursCopy} from './copy/hours';
import {HoursBContext,HoursRecoveryB,TimecardsRedirectB,type HoursBHead} from '../employee-b/time-b';
import type {WallShift} from '../employee-b/parts';
import {BButtonLink} from '../owner-b/b-kit';
import {saveEmployeeHoursCorrection} from '@/app/app/employee-hours/actions';
import type {HoursView,HoursCorrectionPayload} from '@/lib/employee-hours';
import type {HoursDraft} from '@/lib/employee-hours-draft';
import type {Period} from '@/lib/timecards/project';
type Props={/** Corporate (Release 1): an Employee's Time tab on the kit. */corporate?:boolean;/** The records view's title: "Time" on an Employee's own tab, "Hours" for a Lead. */tabTitle?:string;authority:string;view:HoursView;period:Period;entryId:string|null;requestId:string|null;edit:string|null;filter:string;fromCards:boolean;
 /** The workspace's business date, so Past timecards offers later weeks only up to this one. */
 today?:string;
 /** Past timecards: the week was chosen (?start&end), so its days are listed; otherwise it is one week of the list. */
 chosen?:boolean;
 /** The tab page Hours belongs to when Pay owns it; null when Hours is its own tab. */
 parent:{href:string;label:string}|null;
 /** Phase 8: today's published shifts (wall times), so Time's Right now can say a shift has ended; null when unknown. */
 todayShifts?:WallShift[]|null};
const editEntry=(edit:string|null)=>edit?.startsWith('entry:')?edit.slice(6):edit?.startsWith('break:')?edit.split(':')[1]:null;
export function ResponsiveEmployeeHours({children,...props}:Props&{children?:ReactNode}){const mobile=useEmployeeMobile(),t=useMobileCopy(hoursCopy);
 // Corporate (Release 1): an Employee's Time is the same kit page on a phone and in the desktop column.
 if(props.corporate)return <EmployeeHours key={props.authority} {...props}/>;
 return mobile?<div className="em-requests-mobile"><EmployeeHours key={props.authority} {...props}/></div>:<>{children}<div className="em-requests-mobile"><p className="em-request-loading" role="status">{t.loadingTime}</p></div></>;}
function MobileTimecardsRedirect({period}:{period:Period}){const t=useMobileCopy(hoursCopy),router=useRouter(),href='/app/my-time?view=cards&start='+period.startDate+'&end='+period.endDate;useEffect(()=>{router.replace(href,{scroll:false});},[router,href]);return <div className="em-requests-mobile"><p className="em-request-loading" role="status">{t.openingTimecards}</p><Link href={href}>{t.openMyTimecards}</Link></div>;}
/** Corporate (Release 1): an Employee's timecards are Time's Past timecards on every screen; without a chosen period they
 * open on last week. */
function CorporateTimecardsRedirect({period}:{period:Period|null}){const t=useMobileCopy(hoursCopy),router=useRouter(),href=period?'/app/my-time?view=cards&start='+period.startDate+'&end='+period.endDate:'/app/my-time?view=cards';useEffect(()=>{router.replace(href,{scroll:false});},[router,href]);return <div className="c-page" data-nv-page="" data-corp=""><TimecardsRedirectB href={href}/><p className="c-note" role="status"><span>{t.openingTimecards} <Link className="c-link c-link--l" href={href}>{t.openPastTimecards}</Link></span></p></div>;}
export function ResponsiveEmployeeTimecards({children,period,corporate=false,explicit=false}:{children?:ReactNode;period:Period;corporate?:boolean;explicit?:boolean}){const mobile=useEmployeeMobile(),t=useMobileCopy(hoursCopy);if(corporate)return <CorporateTimecardsRedirect period={explicit?period:null}/>;return mobile?<MobileTimecardsRedirect period={period}/>:<>{children}<div className="em-requests-mobile"><p className="em-request-loading" role="status">{t.loadingTimecards}</p></div></>;}
function EmployeeHours({authority,view,period,entryId,requestId,edit,filter,fromCards,parent:parentProp,tabTitle:tabTitleProp,corporate=false,today,chosen=true,todayShifts=null}:Props){
 const lang=useMobileLang(),t=hoursCopy[lang],tabTitle=t.tabName(tabTitleProp??'Hours'),parent=parentProp?{...parentProp,label:t.tabName(parentProp.label)}:null;
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
 const title=edit?edit==='new'?t.requestMissing:t.requestCorrection:requestId?t.yourRequest:entryId?t.timeEntry:view==='cards'?(corporate?t.pastTimecards:t.timecards):view==='corrections'?t.corrections:tabTitle;
 const sub=edit?t.subEdit:requestId?t.subRequest:entryId&&record&&read?hoursDay(record.clockInAt,read.timeZone,lang):view==='cards'?t.subCards:view==='corrections'?t.subCorrections:t.subRecords;
 const contextKey=[view,selection,entryId??'',edit??'',filter].join('|');
 const send=async(payload:HoursCorrectionPayload)=>{const result=await saveEmployeeHoursCorrection(payload);panel.accept(result);return result;};
 const onSubmit=(payload:HoursCorrectionPayload)=>{if(!edit||!panel.allowed()||operation.pending||operation.uncertain)return;let owner=operation;if(operation.result?.status==='recorded'){owner=new HoursCorrectionOperation();setOperation(owner);}setActiveEdit(edit);setRecoveryHref(editHref);void owner.submit(payload,send,panel.allowed);};
 if(corporate){
  // One header per page (board sub-page bar); the Fix sheet draws Cancel · Fix my time · Send itself.
  const cardsData=read?.view==='cards'&&read.data.state==='ready'?read.data.cards[0]?.card:null,cardEntry=cardsData&&entryId?cardsData.entries.find(e=>e.id===entryId):null;
  const cancel=fromCards?cardsHref(period)+(targetEntry?'&entry='+encodeURIComponent(targetEntry):''):targetEntry?'/app/my-time?entry='+encodeURIComponent(targetEntry):requestId?'/app/my-time?view=corrections&requestId='+requestId:'/app/my-time';
  const head=edit?<CorpHoursSheetHead cancel={cancel}/>
   :view==='records'&&!entryId?<CorpHoursTitle sub={read?.view==='records'&&read.data.state==='ready'?timeSubtitle(read.data,lang):undefined}/>
   :view==='records'?<CorpHoursNav back={{href:'/app/my-time#hours-entry-'+entryId,label:t.time}} title={record&&read?dayMedium(dateKey(record.clockInAt,read.timeZone),lang):t.timeEntry}/>
   :view==='cards'?entryId?<CorpHoursNav back={{href:cardsHref(period)+'#hours-card-entry-'+entryId,label:t.week}} title={cardEntry&&cardsData?dayMedium(dateKey(cardEntry.startAt,cardsData.timeZone),lang):t.timecardDay}/>:<CorpHoursNav back={{href:'/app/my-time',label:t.time}} title={t.pastTimecards}/>
   :requestId?<CorpHoursNav back={{href:list+'#hours-request-'+requestId,label:t.back}} title={t.yourRequest}/>:<CorpHoursNav back={{href:'/app/my-time',label:t.time}} title={t.yourRequests}/>;
  // Direction B (phones): the same header as the hero of each page's phone screen (time-b.tsx).
  const records=read?.view==='records'&&read.data.state==='ready'?read.data:null;
  const bHead:HoursBHead=edit?{title:t.fixMyTime,back:{href:cancel,label:t.cancel,close:true}}
   :view==='records'&&!entryId?{title:tabTitle,sub:records?timeSubtitleShort(records,lang):undefined,right:<BButtonLink href="/app/my-time?view=cards" kind="glass">{t.pastTimecards}</BButtonLink>}
   :view==='records'?{title:record&&read?dayMedium(dateKey(record.clockInAt,read.timeZone),lang):t.timeEntry,back:{href:'/app/my-time#hours-entry-'+entryId,label:t.time}}
   :view==='cards'?entryId?{title:cardEntry&&cardsData?dayMedium(dateKey(cardEntry.startAt,cardsData.timeZone),lang):t.timecardDay,back:{href:cardsHref(period)+'#hours-card-entry-'+entryId,label:t.week}}:{title:t.pastTimecards,back:{href:'/app/my-time',label:t.time}}
   :requestId?{title:t.yourRequest,back:{href:list+'#hours-request-'+requestId,label:t.back}}:{title:t.yourRequests,sub:t.sentForReview,back:{href:'/app/my-time',label:t.time}};
  const recovery=(operation.pending||operation.uncertain)&&activeEdit!==edit&&recoveryHref?recoveryHref:null;
  return <HoursBContext.Provider value={{head:bHead,authority,notice:recovery&&read?<HoursRecoveryB href={recovery}/>:null,shifts:todayShifts}}><CorpHoursFrame contextKey={contextKey} view={view} state={panel.state} ready={!!read} refresh={panel.refresh} head={head} headInside={!!edit} sub={!!edit||!!entryId||!!requestId||view!=='records'}>
   {read?<>
    {(operation.pending||operation.uncertain)&&activeEdit!==edit&&recoveryHref?<div className="c-callout c-hours-stack" role="status"><span>{t.earlierPending}</span><div className="c-btns"><Link className="c-btn c-btn--secondary c-btn--sm" href={recoveryHref}>{t.checkEarlier}</Link></div></div>:null}
    {read.view==='records'?read.data.state!=='ready'?<CorpHoursUnavailable message={read.data.reason==='not_configured'?t.notConfigured:read.data.reason==='schema_missing'?t.schemaMissing:t.readFailed} onRefresh={panel.refresh}/>
     :entryId?record?<CorpTimeEntry entry={record} zone={read.data.timeZone}/>:<CorpHoursUnavailable message={t.dayMissing} onRefresh={panel.refresh}/>
     :<CorpTimeTab data={read.data}/>
    :read.view==='cards'?<CorpPastTimecards key={selection} authority={authority} data={read.data} period={period} today={today??period.endDate} entryId={entryId} onRefresh={panel.refresh} chosen={chosen}/>
    :edit?snapshot&&corrections?<CorpFixTime key={edit} snapshot={snapshot} basis={corrections.basis} edit={edit} draft={drafts[edit]} onDraft={draft=>setDrafts(previous=>({...previous,[edit]:draft}))} operation={operation} isActive={activeEdit===edit} otherPending={(operation.pending||operation.uncertain)&&activeEdit!==edit} onSubmit={onSubmit} onRetry={()=>{void operation.retry(send,panel.allowed);}} onReset={()=>{setOperation(new HoursCorrectionOperation());setActiveEdit(null);setDrafts(previous=>{const next={...previous};delete next[edit];return next;});}} onRefresh={panel.refresh} cancel={cancel}
      onEdit={next=>router.push('/app/my-time?view=corrections&edit='+encodeURIComponent(next)+(fromCards?'&from=cards&start='+period.startDate+'&end='+period.endDate:''),{scroll:false})}/>
     :<><CorpHoursSheetHead cancel={cancel}/><CorpHoursUnavailable message={t.timeDidntLoad} onRefresh={panel.refresh}/></>
    :<CorpCorrections snapshot={read.data.snapshot} decisions={read.data.decisions} requestId={requestId} filter={filter} onRefresh={panel.refresh}/>}
   </>:null}
  </CorpHoursFrame></HoursBContext.Provider>;
 }
 return <HoursFrame corporate={corporate} title={title} sub={sub} back={back} backLabel={corpRoot?tabTitle:edit?fromCards?t.timecards:targetEntry?t.timeEntry:requestId?t.yourRequest:t.corrections:requestId?t.corrections:entryId?tabTitle:parent?.label??null} contextKey={contextKey} view={view} editing={!!edit||!!entryId||!!requestId} state={panel.state} ready={!!read} refresh={panel.refresh}>
  {read?<>
   {(operation.pending||operation.uncertain)&&activeEdit!==edit&&recoveryHref?<section className="em-request-notice"><p>{t.earlierPending}</p><Link className="em-request-secondary" href={recoveryHref}>{t.checkEarlier}</Link></section>:null}
   {read.view==='records'?<HoursRecordsView data={read.data} entryId={entryId} onRefresh={panel.refresh} corporate={corporate}/>:read.view==='cards'?<HoursCardsView key={selection} data={read.data} period={period} onRefresh={panel.refresh} onPeriod={next=>router.push('/app/my-time?view=cards&start='+next.startDate+'&end='+next.endDate,{scroll:false})}/>:edit?snapshot&&corrections?<HoursCorrectionForm key={edit} snapshot={snapshot} basis={corrections.basis} edit={edit} draft={drafts[edit]} onDraft={draft=>setDrafts(previous=>({...previous,[edit]:draft}))} operation={operation} isActive={activeEdit===edit} otherPending={(operation.pending||operation.uncertain)&&activeEdit!==edit} onSubmit={onSubmit} onRetry={()=>{void operation.retry(send,panel.allowed);}} onReset={()=>{setOperation(new HoursCorrectionOperation());setActiveEdit(null);setDrafts(previous=>{const next={...previous};delete next[edit];return next;});}} onRefresh={panel.refresh} onEdit={next=>router.push('/app/my-time?view=corrections&edit='+encodeURIComponent(next)+(fromCards?'&from=cards&start='+period.startDate+'&end='+period.endDate:''),{scroll:false})}/>:<HoursUnavailable message={t.sourcesFailed} onRefresh={panel.refresh}/>:<HoursCorrectionHistory snapshot={read.data.snapshot} decisions={read.data.decisions} requestId={requestId} filter={filter} onRefresh={panel.refresh}/>}
  </>:null}
 </HoursFrame>;
}
