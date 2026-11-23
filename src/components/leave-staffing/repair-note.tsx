'use client';
import {createContext,useContext,useEffect,useMemo,useRef,type ReactNode} from 'react';
import Link from 'next/link';
import {CalendarXIcon} from '@phosphor-icons/react/dist/ssr/CalendarX';
import {WarningIcon} from '@phosphor-icons/react/dist/ssr/Warning';
import {BDoneMark} from '../owner-b/b-kit';
import {useLeaveStaffing,useStaffingAuthority} from './use-leave-staffing';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {LEAVE_STAFFING_COPY} from './leave-staffing-copy';
import './leave-staffing.css';

/* The schedule opened from a staffing repair (Nov 9, 2026): "Fill Maria Rivera's shift". The person's approved leave
 * overlaps this published shift, which stays published until someone replaces them or changes it and publishes. The
 * repair comes from the authorized read for this week and person (the link's ?employeeId= and ?leaveRepair= only say
 * which one to show; they grant nothing). Draft edits don't clear it, and there is nothing to dismiss: it goes away when a
 * published schedule no longer overlaps the leave. Only the schedule's own actions are offered. */

export const REPAIR_DAY_EVENT='nv-leave-repair-day';

type RepairRead={state:ReturnType<typeof useLeaveStaffing>['state'];refresh:()=>void;repairId:string};
const Repair=createContext<RepairRead|null>(null);

/** One read for the page: the phone screen and the desktop layout each draw a note from it, so they always agree. */
export function LeaveRepairProvider({weekStart,employeeId,repairId,children}:{weekStart:string;employeeId:string;repairId:string;children:ReactNode}){
 const selection=useMemo(()=>({weeks:[weekStart],employeeId}),[weekStart,employeeId]);
 const {state,refresh}=useLeaveStaffing(selection);
 const arrived=useRef(false);
 const item=state.status==='ready'?state.read.items.find(entry=>entry.id===repairId&&entry.state==='repair_required')??null:undefined;
 // Arrival from Things to do (#leave-repair): the note on screen takes focus once, and the phone schedule opens on the day.
 useEffect(()=>{
  if(arrived.current||state.status==='loading')return;arrived.current=true;
  if(item)window.dispatchEvent(new CustomEvent(REPAIR_DAY_EVENT,{detail:item.date}));
  // Layout (which copy shows) settles after hydration, so it tries for up to two seconds until focus holds.
  if(window.location.hash==='#leave-repair'){
   let tries=0;
   const attempt=()=>{
    const target=[...document.querySelectorAll<HTMLElement>('.ls-repair')].find(element=>element.getClientRects().length);
    if(target&&document.activeElement===target)return;
    if(target&&!target.contains(document.activeElement)){target.focus({preventScroll:true});target.scrollIntoView({block:'center'});}
    if(++tries<20)window.setTimeout(attempt,100);
   };
   window.setTimeout(attempt,50);
  }
 },[state.status,item]);
 const value=useMemo(()=>({state,refresh,repairId}),[state,refresh,repairId]);
 return <Repair.Provider value={value}>{children}</Repair.Provider>;
}

export function LeaveRepairNote({variant}:{variant:'b'|'corp'}){
 const authority=useStaffingAuthority();
 const read=useContext(Repair);
 const t=LEAVE_STAFFING_COPY[usePortalLang()];
 if(!read)return null;
 const {state,refresh,repairId}=read;
 const item=state.status==='ready'?state.read.items.find(entry=>entry.id===repairId&&entry.state==='repair_required')??null:undefined;
 const person=item?.employeeName;
 const first=person?.split(/\s+/)[0]??t.they;
 let tone:'amber'|'green'|'grey'='amber',icon=<CalendarXIcon weight="bold"/>,title:string,body:React.ReactNode,action:React.ReactNode=null;
 if(state.status==='loading'){tone='grey';title=t.repairChecking;body=t.repairCheckingSub;}
 else if(state.status==='paused'){tone='grey';title=t.repairPaused;body=t.repairPausedSub;}
 else if(state.status==='expired'){icon=<WarningIcon weight="bold"/>;title=t.expired;body=t.repairExpiredSub;action=<button type="button" className={variant==='b'?'b-btn b-btn--quiet':'c-btn c-btn--secondary'} onClick={refresh}>{t.checkAgain}</button>;}
 else if(state.status==='unavailable'){icon=<WarningIcon weight="bold"/>;title=state.denied?t.accessChanged:t.repairCouldntCheck;body=state.denied?t.repairDeniedSub:t.repairFailedSub;action=state.denied?null:<button type="button" className={variant==='b'?'b-btn b-btn--quiet':'c-btn c-btn--secondary'} onClick={refresh}>{t.tryAgain}</button>;}
 else if(!item){tone='green';title=t.repairCleared;body=t.repairClearedSub;}
 else{
  title=t.fillShift(person!);
  body=<>
   <span className="ls-repair__fact">{t.overlapsFact(first,item)}</span>
   <span>{t.assignElse(first)}</span>
   <span className="ls-repair__owner">{item.ownerEmployeeId===null?t.noOneAssigned:item.ownerEmployeeId===authority?.actorId?t.yoursToFill:t.assignedToManager}</span>
  </>;
  action=<Link className={variant==='b'?'b-btn b-btn--teal':'c-btn'} href={`/app/schedule/edit?shiftId=${encodeURIComponent(item.shiftId)}`}>{t.openShift}</Link>;
 }
 return <section id={variant==='b'?'leave-repair':'leave-repair-desk'} tabIndex={-1} className={`ls-repair ls-repair--${variant}`} data-tone={tone}
  data-repair={state.status==='ready'?(item?'open':'cleared'):state.status} aria-labelledby={`ls-repair-${variant}-title`} aria-live="polite">
  {tone==='green'?<BDoneMark still/>:<span className="ls-ring" data-tone={tone==='grey'?undefined:tone} aria-hidden="true">{icon}</span>}
  <span className="ls-repair__tx"><b id={`ls-repair-${variant}-title`}>{title}</b>{typeof body==='string'?<span>{body}</span>:body}</span>
  {action?<span className="ls-repair__act">{action}</span>:null}
 </section>;
}
