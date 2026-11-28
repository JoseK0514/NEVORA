import { DeclineNote } from "../leave-decline-note";
import {CorpRow} from '../corp/corp';
import {formatTime} from '@/lib/date-utils';
import {keepWhole} from '@/lib/keep-whole';
import {LOCALE,displayDateText,timeText,type MobileLang} from './mobile-format';
import {timeoffPartsCopy} from './copy/timeoff-parts';

/* Time off on the corporate kit (Release 1, board E-TimeOffDetail): the pieces the phone view (planning snapshot) and the
 * desktop page (server read) both draw, so one request reads the same everywhere. Presentation only. */

export type TimeOffView = {
 id:string;status:string;startDate:string;endDate:string;startTime?:string|null;endTime?:string|null;
 declineNote?:string;note?:string|null;createdAt?:string|null;reviewedAt?:string|null;reviewer?:string|null;
};

const v4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
/** Only a request with a v4 id has a withdraw identity (the server's command contract); older ones are changed by the manager. */
export const canWithdrawTimeOff=(requestId:string)=>v4.test(requestId);
const utc=(date:string)=>new Date(date+'T12:00:00Z');
/** "Thu, Nov 12" */
export const timeOffDay=(date:string,lang:MobileLang='en')=>lang==='en'?new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(utc(date)):displayDateText(date,lang);
/** "Thu, Nov 12" or "Thu, Nov 12 – Sat, Nov 14" */
export const timeOffDates=(r:TimeOffView,lang:MobileLang='en')=>r.startDate===r.endDate?timeOffDay(r.startDate,lang):timeOffDay(r.startDate,lang)+' – '+timeOffDay(r.endDate,lang);
/** "All day", "3 days" or "Part of day · 9:00 AM – 12:00 PM" */
export function timeOffLength(r:TimeOffView,lang:MobileLang='en'){
 const t=timeoffPartsCopy[lang];
 if(r.startTime&&r.endTime)return t.partOfDay(timeText(formatTime(r.startTime)+' – '+formatTime(r.endTime),lang));
 const days=Math.round((utc(r.endDate).getTime()-utc(r.startDate).getTime())/86_400_000)+1;
 return days>1?t.days(days):t.allDay;
}
/** Upscale S4: a request's state in grey text (no amber, blue or other pill). */
export function TimeOffPill({status,lang='en'}:{status:string;lang?:MobileLang}){
 const t=timeoffPartsCopy[lang];
 return <span className="c-meta">{t.status[status]??t.openToCheck}</span>;
}
const inZone=(at:string,zone:string,options:Intl.DateTimeFormatOptions,lang:MobileLang='en')=>{try{return new Intl.DateTimeFormat(LOCALE[lang],{timeZone:zone,...options}).format(new Date(at));}catch{return '';}};
/** "Mon, Oct 26" in the workspace's time zone. */
export const sentDay=(at:string,zone:string,lang:MobileLang='en')=>inZone(at,zone,{weekday:'short',month:'short',day:'numeric'},lang);
const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]!.toUpperCase()).join('');

/** Who the request waits on, or who decided it and when: the words the request's page says once. */
export function timeOffDecision(request:TimeOffView,zone:string,lang:MobileLang='en'){
 const t=timeoffPartsCopy[lang];
 // The time is the app's one English form, then said in the language ("3:00 PM" · "3:00 p. m.").
 const when=request.reviewedAt?keepWhole(t.at(inZone(request.reviewedAt,zone,{month:'short',day:'numeric'},lang),timeText(inZone(request.reviewedAt,zone,{hour:'numeric',minute:'2-digit'}),lang))):null;
 const by=request.reviewer&&request.status!=='CANCELLED'?request.reviewer:null;
 const title=request.status==='PENDING'?t.waitingForManager:request.status==='CANCELLED'?t.youWithdrew:(request.status==='APPROVED'?t.approved:request.status==='DENIED'?t.declined:t.decided)+(by?t.by(by):'');
 const detail=request.status==='PENDING'?t.managerDecides:when;
 return {by,title,detail};
}

/** Who the request waits on, or who decided it and when (the one place the detail page says the state). A pending request has no named approver in the read. */
function Decision({request,zone,lang}:{request:TimeOffView;zone:string;lang:MobileLang}){
 const {by,title,detail}=timeOffDecision(request,zone,lang);
 // Upscale S10: initials when a name is known; otherwise the text row alone (no icon tile).
 return <div className={'c-row tof-who'+(detail?'':' c-row--one')}>
  {by?<span className="c-av c-av--l" aria-hidden="true">{initials(by)}</span>:null}
  <span className="c-row__main"><span className="c-row__title">{keepWhole(title)}</span>{detail?<span className="c-row__detail"><span>{detail}</span></span>:null}</span>
 </div>;
}

/** The request card: when it was sent, the dates and length (with the person's note), then the decision (its state, said once). */
export function TimeOffRequestCard({request,zone,headingId,lang='en'}:{request:TimeOffView;zone:string;headingId?:string;lang?:MobileLang}){
 const t=timeoffPartsCopy[lang],sent=request.createdAt?sentDay(request.createdAt,zone,lang):'';
 return <section className="c-card" aria-labelledby={headingId} data-employee-status={request.status}>
  <div className="c-card__head"><span className="c-card__label">{sent?keepWhole(t.sent(sent)):t.timeOffRequest}</span></div>
  <div className="c-card__body">
   <h2 className="c-big" id={headingId}>{keepWhole(timeOffDates(request,lang))}</h2>
   <span className="c-line2 tof-what">{keepWhole(timeOffLength(request,lang))}{request.note?' · '+request.note:''}</span>
  </div>
  <Decision request={request} zone={zone} lang={lang}/>
  {request.declineNote && <div className="c-card__body"><DeclineNote note={request.declineNote} lang={lang} /></div>}
 </section>;
}

/** One request in the list: dates, length, its state in grey and a chevron. */
export function TimeOffListRow({request,href,id,lang='en'}:{request:TimeOffView;href:string;id?:string;lang?:MobileLang}){
 return <li data-employee-status={request.status}><CorpRow id={id} href={href} title={keepWhole(timeOffDates(request,lang))} detail={keepWhole(timeOffLength(request,lang))} trail={<TimeOffPill status={request.status} lang={lang}/>} chevron/></li>;
}
