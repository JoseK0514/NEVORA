'use client';
import {useMemo} from 'react';
import {InfoIcon} from '@phosphor-icons/react/dist/ssr/Info';
import {useLeaveStaffing} from './use-leave-staffing';
import {weeksFor} from '@/lib/time-off-staffing/client';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {LEAVE_STAFFING_COPY} from './leave-staffing-copy';
import {Dotted} from '../employee-b/parts';
import {BCard,BList,BRow,BIcon,BDoneMark} from '../owner-b/b-kit';
import './leave-staffing.css';

/* An Employee's or Lead's own time-off request (Nov 9, 2026): when it overlaps their published shifts, say so calmly and
 * apart from the decision. Approved leave reads as approved; the shift is the manager's to resolve, never the person's.
 * Only their own records are read (the server refuses a colleague); nothing shows until the check is back, and a failed
 * or expired check says that it couldn't check, never that there is nothing scheduled. */
export function OwnLeaveNote({request}:{request:{id:string;status:string;startDate:string;endDate:string}}){
 const open=request.status==='PENDING'||request.status==='APPROVED';
 const weeks=useMemo(()=>open?weeksFor(request.startDate,request.endDate):null,[open,request.startDate,request.endDate]);
 const {state,refresh}=useLeaveStaffing(weeks?{weeks,requestId:request.id}:null);
 const t=LEAVE_STAFFING_COPY[usePortalLang()];
 if(!open||!weeks)return null;
 if(state.status==='loading'||state.status==='paused')return null;
 if(state.status!=='ready')return <BCard id="b-timeoff-shifts" label={t.yourShifts}><div className="ls-own ls-own--quiet" role="status">
  <span>{state.status==='expired'?t.ownExpired:t.ownCouldntCheck}</span>
  {state.status==='unavailable'&&state.denied?null:<button type="button" className="b-btn b-btn--quiet" onClick={refresh}>{t.checkAgain}</button>}
 </div></BCard>;
 const items=state.read.items.filter(item=>item.requestId===request.id);
 if(!items.length)return null;
 const approved=items.every(item=>item.employeeInstruction==='approved_leave');
 return <BCard id="b-timeoff-shifts" title={t.yourShifts}>
  {approved?<div className="ls-own"><BDoneMark still/><span><b>{t.approvedTitle}</b><span>{t.approvedSub}</span></span></div>:null}
  <BList label={t.publishedDuring}>{items.map(item=><BRow key={item.id} lead={<BIcon tone="grey"><InfoIcon weight="bold"/></BIcon>} title={t.day(item.date)}
   sub={<Dotted text={`${t.range(item.startTime,item.endTime)} · ${item.locationName} · ${approved?t.stillOnSchedule:t.onPublished}`}/>}/>)}</BList>
  <p className="ls-own__note">{approved
   ?t.managerTakesCare
   :t.managerWillSee}</p>
 </BCard>;
}
