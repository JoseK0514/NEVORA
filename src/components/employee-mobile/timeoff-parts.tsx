import {CorpRow} from '../corp/corp';
import {formatTime} from '@/lib/date-utils';
import {keepWhole} from '@/lib/keep-whole';

/* Time off on the corporate kit (Release 1, board E-TimeOffDetail): the pieces the phone view (planning snapshot) and the
 * desktop page (server read) both draw, so one request reads the same everywhere. Presentation only. */

export type TimeOffView = {
 id:string;status:string;startDate:string;endDate:string;startTime?:string|null;endTime?:string|null;
 note?:string|null;createdAt?:string|null;reviewedAt?:string|null;reviewer?:string|null;
};

const v4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
/** Only a request with a v4 id has a withdraw identity (the server's command contract); older ones are changed by the manager. */
export const canWithdrawTimeOff=(requestId:string)=>v4.test(requestId);
const utc=(date:string)=>new Date(date+'T12:00:00Z');
/** "Thu, Nov 12" */
export const timeOffDay=(date:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(utc(date));
/** "Thu, Nov 12" or "Thu, Nov 12 – Sat, Nov 14" */
export const timeOffDates=(r:TimeOffView)=>r.startDate===r.endDate?timeOffDay(r.startDate):timeOffDay(r.startDate)+' – '+timeOffDay(r.endDate);
/** "All day", "3 days" or "Part of day · 9:00 AM – 12:00 PM" */
export function timeOffLength(r:TimeOffView){
 if(r.startTime&&r.endTime)return 'Part of day · '+formatTime(r.startTime)+' – '+formatTime(r.endTime);
 const days=Math.round((utc(r.endDate).getTime()-utc(r.startDate).getTime())/86_400_000)+1;
 return days>1?days+' days':'All day';
}
const words:Record<string,string>={PENDING:'Waiting',APPROVED:'Approved',DENIED:'Declined',CANCELLED:'Withdrawn'};
/** Upscale S4: a request's state in grey text (no amber, blue or other pill). */
export function TimeOffPill({status}:{status:string}){
 return <span className="c-meta">{words[status]??'Open to check'}</span>;
}
const inZone=(at:string,zone:string,options:Intl.DateTimeFormatOptions)=>{try{return new Intl.DateTimeFormat('en-US',{timeZone:zone,...options}).format(new Date(at));}catch{return '';}};
/** "Mon, Oct 26" in the workspace's time zone. */
export const sentDay=(at:string,zone:string)=>inZone(at,zone,{weekday:'short',month:'short',day:'numeric'});
const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]!.toUpperCase()).join('');

/** Who the request waits on, or who decided it and when: the words the request's page says once. */
export function timeOffDecision(request:TimeOffView,zone:string){
 const when=request.reviewedAt?keepWhole(inZone(request.reviewedAt,zone,{month:'short',day:'numeric'})+' at '+inZone(request.reviewedAt,zone,{hour:'numeric',minute:'2-digit'})):null;
 const by=request.reviewer&&request.status!=='CANCELLED'?request.reviewer:null;
 const title=request.status==='PENDING'?'Waiting for your manager':request.status==='CANCELLED'?'You withdrew it':(request.status==='APPROVED'?'Approved':request.status==='DENIED'?'Declined':'Decided')+(by?' by '+by:'');
 const detail=request.status==='PENDING'?'Your manager decides on this request':when;
 return {by,title,detail};
}

/** Who the request waits on, or who decided it and when (the one place the detail page says the state). A pending request has no named approver in the read. */
function Decision({request,zone}:{request:TimeOffView;zone:string}){
 const {by,title,detail}=timeOffDecision(request,zone);
 // Upscale S10: initials when a name is known; otherwise the text row alone (no icon tile).
 return <div className={'c-row tof-who'+(detail?'':' c-row--one')}>
  {by?<span className="c-av c-av--l" aria-hidden="true">{initials(by)}</span>:null}
  <span className="c-row__main"><span className="c-row__title">{keepWhole(title)}</span>{detail?<span className="c-row__detail"><span>{detail}</span></span>:null}</span>
 </div>;
}

/** The request card: when it was sent, the dates and length (with the person's note), then the decision (its state, said once). */
export function TimeOffRequestCard({request,zone,headingId}:{request:TimeOffView;zone:string;headingId?:string}){
 const sent=request.createdAt?sentDay(request.createdAt,zone):'';
 return <section className="c-card" aria-labelledby={headingId} data-employee-status={request.status}>
  <div className="c-card__head"><span className="c-card__label">{sent?keepWhole('Sent '+sent):'Time-off request'}</span></div>
  <div className="c-card__body">
   <h2 className="c-big" id={headingId}>{keepWhole(timeOffDates(request))}</h2>
   <span className="c-line2 tof-what">{keepWhole(timeOffLength(request))}{request.note?' · '+request.note:''}</span>
  </div>
  <Decision request={request} zone={zone}/>
 </section>;
}

/** One request in the list: dates, length, its state in grey and a chevron. */
export function TimeOffListRow({request,href,id}:{request:TimeOffView;href:string;id?:string}){
 return <li data-employee-status={request.status}><CorpRow id={id} href={href} title={keepWhole(timeOffDates(request))} detail={keepWhole(timeOffLength(request))} trail={<TimeOffPill status={request.status}/>} chevron/></li>;
}
