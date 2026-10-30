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
import {saveEmployeeHoursCorrection} from '@/app/app/employee-hours/actions';
import type {HoursView,HoursCorrectionPayload} from '@/lib/employee-hours';
import type {HoursDraft} from '@/lib/employee-hours-draft';
import type {Period} from '@/lib/timecards/project';
type Props={/** Corporate (Release 1): an Employee's Time tab on the kit. */corporate?:boolean;/** The records view's title: "Time" on an Employee's own tab, "Hours" for a Lead. */tabTitle?:string;authority:string;view:HoursView;period:Period;entryId:string|null;requestId:string|null;edit:string|null;filter:string;fromCards:boolean;
 /** The tab page Hours belongs to when Pay owns it; null when Hours is its own tab. */
 parent:{href:string;label:string}|null};
const editEntry=(edit:string|null)=>edit?.startsWith('entry:')?edit.slice(6):edit?.startsWith('break:')?edit.split(':')[1]:null;
export function ResponsiveEmployeeHours({children,...props}:Props&{children:ReactNode}){const mobile=useEmployeeMobile();return mobile?<div className="em-requests-mobile"><EmployeeHours key={props.authority} {...props}/></div>:<>{children}<div className="em-requests-mobile"><p className="em-request-loading" role="status">Loading your time…</p></div></>;}
function MobileTimecardsRedirect({period}:{period:Period}){const router=useRouter(),href='/app/my-time?view=cards&start='+period.startDate+'&end='+period.endDate;useEffect(()=>{router.replace(href,{scroll:false});},[router,href]);return <div className="em-requests-mobile"><p className="em-request-loading" role="status">Opening your timecards…</p><Link href={href}>Open my timecards</Link></div>;}
export function ResponsiveEmployeeTimecards({children,period}:{children:ReactNode;period:Period}){const mobile=useEmployeeMobile();return mobile?<MobileTimecardsRedirect period={period}/>:<>{children}<div className="em-requests-mobile"><p className="em-request-loading" role="status">Loading your timecards…</p></div></>;}
function EmployeeHours({authority,view,period,entryId,requestId,edit,filter,fromCards,parent,tabTitle='Hours',corporate=false}:Props){
 const router=useRouter(),targetEntry=editEntry(edit),selection=view==='records'?'overview':view==='cards'?period.startDate+'_'+period.endDate:requestId??(targetEntry?'target:'+targetEntry:'list'),panel=useHours(authority,view,selection,edit),[drafts,setDrafts]=useState<Record<string,HoursDraft>>({}),[operation,setOperation]=useState(()=>new HoursCorrectionOperation()),[activeEdit,setActiveEdit]=useState<string|null>(null),[recoveryHref,setRecoveryHref]=useState<string|null>(null);
 useSyncExternalStore(operation.subscribe,operation.snapshot,operation.snapshot);
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
 return <HoursFrame corporate={corporate} title={title} sub={sub} back={back} backLabel={corpRoot?tabTitle:edit?fromCards?'Timecards':targetEntry?'Time entry':requestId?'Your correction':'Corrections':requestId?'Corrections':entryId?tabTitle:parent?.label??null} contextKey={contextKey} view={view} editing={!!edit||!!entryId||!!requestId} state={panel.state} ready={!!read} refresh={panel.refresh}>
  {read?<>
   {(operation.pending||operation.uncertain)&&activeEdit!==edit&&recoveryHref?<section className="em-request-notice"><p>An earlier correction submission still needs to be checked. Return to it before starting a new proposal.</p><Link className="em-request-secondary" href={recoveryHref}>Return to my submission</Link></section>:null}
   {read.view==='records'?<HoursRecordsView data={read.data} entryId={entryId} onRefresh={panel.refresh} corporate={corporate}/>:read.view==='cards'?<HoursCardsView key={selection} data={read.data} period={period} onRefresh={panel.refresh} onPeriod={next=>router.push('/app/my-time?view=cards&start='+next.startDate+'&end='+next.endDate,{scroll:false})}/>:edit?snapshot&&corrections?<HoursCorrectionForm key={edit} snapshot={snapshot} basis={corrections.basis} edit={edit} draft={drafts[edit]} onDraft={draft=>setDrafts(previous=>({...previous,[edit]:draft}))} operation={operation} isActive={activeEdit===edit} otherPending={(operation.pending||operation.uncertain)&&activeEdit!==edit} onSubmit={onSubmit} onRetry={()=>{void operation.retry(send,panel.allowed);}} onReset={()=>{setOperation(new HoursCorrectionOperation());setActiveEdit(null);setDrafts(previous=>{const next={...previous};delete next[edit];return next;});}} onRefresh={panel.refresh} onEdit={next=>router.push('/app/my-time?view=corrections&edit='+encodeURIComponent(next)+(fromCards?'&from=cards&start='+period.startDate+'&end='+period.endDate:''),{scroll:false})}/>:<HoursUnavailable message="Your correction sources couldn’t be checked. Return to Hours to review your records." onRefresh={panel.refresh}/>:<HoursCorrectionHistory snapshot={read.data.snapshot} decisions={read.data.decisions} requestId={requestId} filter={filter} onRefresh={panel.refresh}/>}
  </>:null}
 </HoursFrame>;
}
