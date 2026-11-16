'use client';
import {useMemo} from 'react';
import {InfoIcon} from '@phosphor-icons/react/dist/ssr/Info';
import {CheckCircleIcon} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {useLeaveStaffing} from './use-leave-staffing';
import {weeksFor} from '@/lib/time-off-staffing/client';
import {dayText,rangeText} from '@/lib/time-off-staffing/present';
import {Dotted} from '../employee-b/parts';
import {BCard,BList,BRow,BIcon} from '../owner-b/b-kit';
import './leave-staffing.css';

/* An Employee's or Lead's own time-off request (Nov 9, 2026): when it overlaps their published shifts, say so calmly and
 * apart from the decision. Approved leave reads as approved; the shift is the manager's to resolve, never the person's.
 * Only their own records are read (the server refuses a colleague); nothing shows until the check is back, and a failed
 * or expired check says that it couldn't check, never that there is nothing scheduled. */
export function OwnLeaveNote({request}:{request:{id:string;status:string;startDate:string;endDate:string}}){
 const open=request.status==='PENDING'||request.status==='APPROVED';
 const weeks=useMemo(()=>open?weeksFor(request.startDate,request.endDate):null,[open,request.startDate,request.endDate]);
 const {state,refresh}=useLeaveStaffing(weeks?{weeks,requestId:request.id}:null);
 if(!open||!weeks)return null;
 if(state.status==='loading'||state.status==='paused')return null;
 if(state.status!=='ready')return <BCard id="b-timeoff-shifts" label="Your shifts during this time off"><div className="ls-own ls-own--quiet" role="status">
  <span>{state.status==='expired'?'This check of your shifts expired.':'We couldn’t check your scheduled shifts for these dates.'}</span>
  {state.status==='unavailable'&&state.denied?null:<button type="button" className="b-btn b-btn--quiet" onClick={refresh}>Check again</button>}
 </div></BCard>;
 const items=state.read.items.filter(item=>item.requestId===request.id);
 if(!items.length)return null;
 const approved=items.every(item=>item.employeeInstruction==='approved_leave');
 return <BCard id="b-timeoff-shifts" title="Your shifts during this time off">
  {approved?<div className="ls-own"><BIcon tone="green"><CheckCircleIcon weight="bold"/></BIcon><span><b>Your time off is approved</b><span>You don’t need to come in for these hours.</span></span></div>:null}
  <BList label="Published shifts during this time off">{items.map(item=><BRow key={item.id} lead={<BIcon tone="grey"><InfoIcon weight="bold"/></BIcon>} title={dayText(item.date)}
   sub={<Dotted text={`${rangeText(item.startTime,item.endTime)} · ${item.locationName} · ${approved?'Still on the published schedule':'On the published schedule'}`}/>}/>)}</BList>
  <p className="ls-own__note">{approved
   ?'Your manager will take care of these shifts. You don’t need to find cover or swap them.'
   :'Your manager will see these shifts when they decide. You don’t need to do anything now.'}</p>
 </BCard>;
}
