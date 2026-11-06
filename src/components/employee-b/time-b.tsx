'use client';

import './employee-b.css';
import './time.css';
import Link from 'next/link';
import {createContext,useContext,type ReactNode,type Ref} from 'react';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {ClockCounterClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ClockCounterClockwise';
import {PencilSimpleIcon} from '@phosphor-icons/react/dist/ssr/PencilSimple';
import {WarningIcon} from '@phosphor-icons/react/dist/ssr/Warning';
import {BButton,BButtonLink,BCard,BChip,BHero,BIcon,BList,BLive,BNote,BRow,BScreen,BSeg,BStack} from '../owner-b/b-kit';
import {BAddRow,BCardNote,BDay,BValue} from './parts';
import {useHours} from '../employee-mobile/use-hours';
import {addDays,weekStartFor} from '@/lib/date-utils';
import {keepWhole} from '@/lib/keep-whole';
import type {HoursDecision} from '@/lib/employee-hours';
import type {TimecardsResult} from '@/lib/timecards/read-model';
import type {Period} from '@/lib/timecards/project';
import type {EmployeeTimeCorrections,PublicCorrectionItem} from '@/lib/time-corrections/read-model';
import {EARLIER_MAX,boardDuration,cardStatus,cardsHref,clockAt,clockRange,compactDuration,correctionStatus,dateKey,dayLong,dayMedium,entryHref,interval,issueText,kindLabel,rangeLabel,seconds,sentAt,shiftCount,span,statusWord,timeWeek,weekOf,type CardState,type Ready,type StatusTone} from '../employee-mobile/hours-model';

/* Employee Time on the phone, Direction B (Jose approved the mock "Employee mobile, Direction B", Nov 6, 2026): the Time
 * tab, a day's punches, Past timecards, Your corrections and Fix my time on the teal hero. Presentation only: each screen
 * gets the same reads, links, handlers and states as the corporate page around it (hours-corp.tsx), which still shows on
 * tablets and desktop. The pages' header (title, way back, hero line) comes from hours.tsx through HoursBContext; without
 * it (the corporate views on their own) nothing renders here. */

export type HoursBHead={title:string;sub?:string;back?:{href:string;label:string;close?:boolean};right?:ReactNode};
export type HoursBContextValue={head:HoursBHead;authority:string;/** A notice every Time page shows first (an earlier fix to check). */notice?:ReactNode};
export const HoursBContext=createContext<HoursBContextValue|null>(null);
/** The hero title's id: the page moves focus to it on a phone, as it does to the corporate title elsewhere. */
export const B_TITLE_ID='b-hours-title';

/** A Time page's Direction B screen: the hero from the page's header, then the cards. */
export function HoursBScreen({hero,children,sub,backLabel}:{hero?:ReactNode;children?:ReactNode;/** Replaces the header's line (null: none). */sub?:string|null;backLabel?:string}){
 const context=useContext(HoursBContext);
 if(!context)return null;
 const {head,notice}=context,back=head.back?{...head.back,label:backLabel??head.back.label}:undefined;
 const stack=!!notice||(children!==undefined&&children!==null&&children!==false);
 return <BScreen back={!!back}>
  <BHero title={head.title} titleId={B_TITLE_ID} sub={sub===undefined?head.sub:sub??undefined} right={head.right} back={back}>{hero}</BHero>
  {stack?<BStack>{notice??null}{children}</BStack>:null}
 </BScreen>;
}

/** A read state or a message with its one way forward, as a card. */
export function HoursStatusB({message,action,label='Time status'}:{message:ReactNode;action?:ReactNode;label?:string}){
 return <BCard label={label}><div className="eb-status"><p className="b-state" role="status">{message}</p>{action??null}</div></BCard>;
}
export function HoursUnavailableB({message,onRefresh}:{message:string;onRefresh:()=>void}){
 return <HoursBScreen><HoursStatusB message={message} action={<BButton kind="quiet" full onClick={onRefresh}>Try again</BButton>}/></HoursBScreen>;
}
/** The frame's own states (paused, denied, loading, failed) on the page's hero. */
export function HoursFrameStatusB({paused,denied,refreshing,refresh}:{paused:boolean;denied:boolean;refreshing:boolean;refresh:()=>void}){
 return <HoursBScreen><HoursStatusB label="Time access"
  message={paused?'Your time records are paused. Return to this page or reconnect to refresh.':denied?'Your access changed. Sign in again to continue.':refreshing?'Checking your current time records…':'Your records couldn’t be checked.'}
  action={denied?<BButtonLink href="/login" kind="teal" full>Sign in</BButtonLink>:<BButton kind="quiet" full disabled={paused||refreshing} onClick={refresh}>{refreshing?'Checking…':'Try again'}</BButton>}/></HoursBScreen>;
}
/** An earlier fix is still being checked: the way back to it, first on every Time page. */
export function HoursRecoveryB({href}:{href:string}){
 return <BCard label="Earlier fix"><div className="eb-status">
  <div className="b-notice eb-flat"><BIcon tone="amber"><WarningIcon weight="bold"/></BIcon><span className="b-notice__tx" role="status"><span className="b-notice__t">An earlier fix still needs to be checked.</span><span className="b-notice__s">Return to it before starting a new one.</span></span></div>
  <BButtonLink href={href} kind="quiet" full>Return to my submission</BButtonLink>
 </div></BCard>;
}

/** A duration as the mock writes it ("8 h 02"), with the words for assistive tech ("8 h 2 min"). */
function Dur({value}:{value:number}){
 return <><span aria-hidden="true">{compactDuration(value)}</span><span className="b-sr">{boardDuration(value)}</span></>;
}
const chip=(status:{word:string;tone:StatusTone})=><BChip tone={status.tone}>{status.word}</BChip>;

/* ---------- Time tab ---------- */

export function TimeTabB({data}:{data:Ready}){
 const context=useContext(HoursBContext),m=timeWeek(data),zone=m.zone,current=m.current;
 const figure=(value:number)=>m.partial?'—':<Dur value={value}/>;
 const status=current?m.onBreak?<BChip tone="amber">On break</BChip>:<BChip tone="teal">On the clock</BChip>:<BChip>Not clocked in</BChip>;
 const headline=current?m.onBreak&&m.openBreak?`On break since ${clockAt(m.openBreak.startAt,zone)}`:`Clocked in at ${clockAt(current.clockInAt,zone)}`:`Clock in on ${m.tablet}`;
 const line=current?m.onBreak?`${current.locationName} · clocked in at ${clockAt(current.clockInAt,zone)}`:`${current.locationName} · ${boardDuration(current.elapsedSeconds)} so far`:'Breaks and clock out happen there too';
 const hint=current?m.onBreak?'End your break on your location’s tablet.':'Take breaks and clock out on your location’s tablet.':null;
 return <HoursBScreen hero={m.week.length?<BLive label="This week at a glance" items={[{label:'This week',value:figure(m.worked)},{label:'Breaks',value:figure(m.breaks)}]}/>:null}>
  <BCard title="Right now" id="b-hours-now" chip={status}>
   <div className="b-notice eb-now"><BIcon tone="teal"><ClockIcon weight="bold"/></BIcon><span className="b-notice__tx">
    <span className="b-notice__t">{keepWhole(headline)}</span><span className="b-notice__s">{keepWhole(line)}</span>{hint?<span className="b-notice__s">{hint}</span>:null}
   </span></div>
  </BCard>
  <BCard title={<span><span className="eb-wide">This week · </span><span className="eb-nowrap">{rangeLabel(m.weekStart,m.weekEnd)}</span></span>} id="b-hours-week" chip={<BChip tone="teal">In progress</BChip>}>
   <BList label="This week’s time">
    {m.week.map(entry=>{const date=dateKey(entry.clockInAt,zone),range=clockRange(entry.clockInAt,entry.clockOutAt,zone);
     return <BRow key={entry.id} href={entryHref(entry.id)} lead={<BDay date={date} today={date===data.date}/>} title={<span id={'b-hours-entry-'+entry.id}>{keepWhole(range)}</span>}
      sub={entry.breakSeconds?`${boardDuration(entry.breakSeconds)} break`:undefined} end={<BValue><span className={entry.clockOutAt?undefined:'eb-teal'}><Dur value={entry.elapsedSeconds}/></span></BValue>}
      label={`${dayLong(date)}, ${range}, ${boardDuration(entry.elapsedSeconds)}${entry.breakSeconds?`, ${boardDuration(entry.breakSeconds)} break`:''}`}/>;})}
    {m.week.length?null:<li className="b-li"><p className="eb-quiet">No time recorded yet this week</p></li>}
    <BAddRow href="/app/my-time?view=corrections&edit=new" icon={<PencilSimpleIcon weight="bold"/>}>Fix a missed punch</BAddRow>
   </BList>
   <BCardNote>Hours include breaks.</BCardNote>
  </BCard>
  {context?<LastWeekB authority={context.authority} date={data.date}/>:null}
 </HoursBScreen>;
}

/** Last Monday to Sunday through the same private hours read as Past timecards' weeks; hidden while it loads or fails. */
function LastWeekB({authority,date}:{authority:string;date:string}){
 const period=weekOf(addDays(weekStartFor(date),-7)),panel=useHours(authority,'cards',period.startDate+'_'+period.endDate,null);
 const data=panel.read?.view==='cards'?panel.read.data:null;
 if(!data||data.state!=='ready')return null;
 const item=data.cards[0],card=item?.card,range=rangeLabel(period.startDate,period.endDate);
 if(!item||!card||!card.entries.length)return <BCard title="Last week" id="b-hours-last"><BList><BRow title={range} sub="No hours recorded"/></BList></BCard>;
 // Last week is over: an open period reads as not approved yet.
 const status=item.state==='DRAFT'?{word:'Not approved yet',tone:'grey' as const}:cardStatus(item.state,card.issues),total=seconds(card.recordedNanoseconds);
 return <BCard title="Last week" id="b-hours-last" chip={chip(status)}><BList>
  <BRow href={cardsHref(period)} title={range} sub={shiftCount(card.entries.length)} end={<BValue><Dur value={total}/></BValue>} label={`Last week, ${range}, ${status.word}, ${shiftCount(card.entries.length)}, ${boardDuration(total)}`}/>
 </BList></BCard>;
}

/* ---------- One day (a Time entry or a timecard day) ---------- */

export type DayPunch={key:string;title:string;detail?:string;value:string;soft?:boolean};
export function DayB({total,running,status,line,punches,location,fix,notes}:{total:number|null;running:boolean;status:{word:string;tone:StatusTone};line:string;punches:DayPunch[];location:string;fix:string|null;notes:string[]}){
 return <HoursBScreen>
  <BCard title="Hours" id="b-hours-day" chip={chip(status)}>
   <div className="eb-sum"><p className="eb-sum__big">{total===null?'In progress':<><Dur value={total}/>{running?<span className="eb-sum__so"> so far</span>:null}</>}</p><p className="eb-sum__line">{line}</p></div>
  </BCard>
  <BCard title="Punches" id="b-hours-punches">
   <BList label="Punches">
    {punches.map(punch=><BRow key={punch.key} title={punch.title} sub={punch.detail} end={<span className={punch.soft?'eb-val eb-val--soft':'eb-val'}>{keepWhole(punch.value)}</span>}/>)}
    <BRow title="Location" end={<span className="eb-val eb-val--soft eb-val--wrap">{location}</span>}/>
    {fix?<BAddRow href={fix} icon={<PencilSimpleIcon weight="bold"/>}>Request a correction</BAddRow>:null}
   </BList>
   {notes.map(note=><BCardNote key={note}>{note}</BCardNote>)}
  </BCard>
 </HoursBScreen>;
}

/* ---------- Past timecards ---------- */

export type WeekState={data:TimecardsResult|null;paused:boolean};
/** One week as a row: its range, then shifts and state, its total and a chevron to its days. */
function WeekRowB({period,state}:{period:Period;state:WeekState|undefined}){
 const range=rangeLabel(period.startDate,period.endDate),data=state?.data??null;
 if(!data)return <BRow title={range} sub={state?.paused?'Paused':'Loading…'}/>;
 if(data.state!=='ready')return <BRow href={cardsHref(period)} title={range} sub="Couldn’t be checked" label={`${range}, couldn’t be checked`}/>;
 const item=data.cards[0],card=item?.card;
 // The week under way says so (as on Time), with nothing recorded yet; a past week with none says it recorded none.
 if(!item||!card||!card.entries.length){const open=!!item&&!!card&&cardStatus(item.state,card.issues).open;
  return <BRow title={range} chip={open?<BChip tone="teal">In progress</BChip>:undefined} sub={open?'No hours yet':'No hours recorded'}/>;}
 const status=cardStatus(item.state,card.issues),count=shiftCount(card.entries.length),total=seconds(card.recordedNanoseconds);
 // A closed week says its state in grey; the week under way and one that needs attention carry a chip.
 return <BRow href={cardsHref(period)} title={range} chip={status.open||status.flag?chip(status):undefined} sub={status.open?`${count} so far`:status.flag?count:`${count} · ${status.word}`}
  end={<BValue><Dur value={total}/></BValue>} label={`${range}, ${status.word}, ${count}, ${boardDuration(total)}`}/>;
}
/** The chosen week (?start&end): its total and its days. */
function ChosenWeekB({data,period}:{data:Extract<TimecardsResult,{state:'ready'}>;period:Period}){
 const item=data.cards[0],card=item?.card,range=rangeLabel(period.startDate,period.endDate);
 if(!item||!card)return <BCard title={range} id="b-hours-timecard"><p className="eb-quiet">No hours this week</p></BCard>;
 const entries=[...card.entries].sort((a,b)=>a.startAt.localeCompare(b.startAt)),notes=card.issues.map(issue=>issueText[issue]).filter((text):text is string=>!!text);
 return <BCard title={rangeLabel(card.startDate,card.endDate)} id="b-hours-timecard" chip={entries.length?chip(cardStatus(item.state as CardState,card.issues)):undefined}>
  {entries.length?<>
   <div className="eb-sum"><p className="eb-sum__big"><Dur value={seconds(card.recordedNanoseconds)}/></p><p className="eb-sum__line">Hours · includes {boardDuration(seconds(card.breakNanoseconds))} of breaks</p>
    {notes.map(note=><p className="eb-sum__line eb-sum__line--warn" key={note}>{note}</p>)}</div>
   <BList label="Days">{entries.map(entry=>{const length=span(entry.startAt,entry.endAt),date=dateKey(entry.startAt,card.timeZone),times=clockRange(entry.startAt,entry.endAt,card.timeZone);
    return <BRow key={entry.id} href={cardsHref(period)+'&entry='+encodeURIComponent(entry.id)} lead={<BDay date={date}/>} title={<span id={'b-hours-card-entry-'+entry.id}>{keepWhole(times)}</span>}
     end={length===null?<span className="eb-val eb-val--teal">In progress</span>:<BValue><Dur value={length}/></BValue>} label={`${dayLong(date)}, ${times}, ${length===null?'in progress':boardDuration(length)}`}/>;})}</BList>
  </>:<p className="eb-quiet">No hours this week</p>}
 </BCard>;
}
export function PastTimecardsB({data,period,today,chosen,weeks,earlier,earlierCount,onMore}:{data:Extract<TimecardsResult,{state:'ready'}>;period:Period;today:string;chosen:boolean;weeks:Record<string,WeekState>;earlier:Period[];earlierCount:number;onMore:()=>void}){
 const monday=weekStartFor(period.startDate),later=weekOf(addDays(monday,7)),key=(week:Period)=>week.startDate+'_'+week.endDate;
 return <HoursBScreen>
  {chosen?<ChosenWeekB data={data} period={period}/>:null}
  <BCard title="Weeks" id="b-hours-weeks">
   <BList label="Weeks">
    {later.startDate<=today?<WeekRowB period={later} state={weeks[key(later)]}/>:null}
    {chosen?null:<WeekRowB period={period} state={{data,paused:false}}/>}
    {earlier.map(week=><WeekRowB key={week.startDate} period={week} state={weeks[key(week)]}/>)}
    <li className="b-li">{earlierCount<EARLIER_MAX
     ?<button type="button" className="eb-more" onClick={onMore}>Show earlier weeks<CaretDownIcon weight="bold" aria-hidden="true"/></button>
     :<Link className="eb-more" href={cardsHref(weekOf(addDays(monday,-7*(EARLIER_MAX+1))))}>Earlier weeks<CaretRightIcon weight="bold" aria-hidden="true"/></Link>}</li>
   </BList>
  </BCard>
  <BCard label="Your corrections"><BList>
   <BRow href="/app/my-time?view=corrections" lead={<BIcon tone="grey"><PencilSimpleIcon weight="bold"/></BIcon>} title="Your corrections" sub="Fixes you asked your manager for"/>
  </BList></BCard>
 </HoursBScreen>;
}

/* ---------- Your corrections ---------- */

const correctionChip=(status:PublicCorrectionItem['status'])=>chip(correctionStatus(status));
export function CorrectionsB({snapshot,decided}:{snapshot:Extract<EmployeeTimeCorrections,{state:'ready'}>;decided:boolean}){
 const zone=snapshot.timeZone,rows=snapshot.requests.filter(r=>decided?r.status!=='PENDING':r.status==='PENDING');
 return <HoursBScreen hero={<BSeg label="Correction requests" items={[{key:'waiting',label:'Waiting',href:'/app/my-time?view=corrections',current:!decided},{key:'decided',label:'Decided',href:'/app/my-time?view=corrections&filter=decided',current:decided}]}/>}>
  <BCard label={decided?'Decisions':'Waiting for review'}>
   <BList label={decided?'Decisions':'Waiting for review'}>
    {rows.map(r=>{const day=dateKey(r.proposedStartAt,zone),times=clockRange(r.proposedStartAt,r.proposedEndAt,zone),word=correctionStatus(r.status).word;
     return <BRow key={r.id} href={'/app/my-time?view=corrections&requestId='+r.id+(decided?'&filter=decided':'')} title={<span id={'b-hours-request-'+r.id}>{kindLabel[r.kind]}</span>}
      sub={keepWhole(`${dayMedium(day)} · ${times}`)} end={correctionChip(r.status)} label={`${kindLabel[r.kind]}, ${dayLong(day)}, ${times}, ${word}`}/>;})}
    {rows.length?null:<li className="b-li"><div className="eb-none">
     <BIcon tone="grey"><ClockCounterClockwiseIcon weight="bold"/></BIcon>
     <p className="eb-none__t">{decided?'No decided requests':'Nothing waiting for review'}</p>
     <p className="eb-none__s">{decided?'Nothing decided in your recent history.':'Fixes you send stay here until your manager decides.'}</p>
    </div></li>}
    <BAddRow href="/app/my-time?view=corrections&edit=new" icon={<PencilSimpleIcon weight="bold"/>}>Fix a missed punch</BAddRow>
   </BList>
   <BCardNote>To fix a day you already clocked, open it from Time.</BCardNote>
  </BCard>
  {snapshot.totalRequests>snapshot.requests.length?<BNote>Showing your {snapshot.requests.length} most recent requests.</BNote>:null}
 </HoursBScreen>;
}
export function CorrectionDetailB({item,decision,zone}:{item:PublicCorrectionItem;decision:HoursDecision|undefined;zone:string}){
 const context=item.context,now=context.state==='confirmed'&&context.sourceKind==='ADJUSTMENT'?interval(context.startAt,context.endAt,zone):null;
 return <HoursBScreen>
  <BCard title={item.kind==='BREAK_BOUNDARY'&&item.breakName?`Break · ${item.breakName}`:kindLabel[item.kind]} id="b-hours-correction" chip={correctionChip(item.status)}>
   <BList label="Times">
    <BRow title="Recorded" sub={item.originalStartAt&&item.originalEndAt?keepWhole(interval(item.originalStartAt,item.originalEndAt,zone)):'No punches recorded'}/>
    <BRow title="You asked for" sub={keepWhole(interval(item.proposedStartAt,item.proposedEndAt,zone))}/>
    {now?<BRow title="On your timecard" sub={keepWhole(now)}/>:null}
    <BRow title="Location" end={<span className="eb-val eb-val--soft eb-val--wrap">{item.locationName}</span>}/>
    <BRow title="Sent" end={<span className="eb-val eb-val--soft">{keepWhole(sentAt(item.createdAt,zone))}</span>}/>
   </BList>
  </BCard>
  <BCard title={decision?'Decision':'Your note'} id="b-hours-note">
   {decision?<BList><BRow title={`${statusWord[decision.status]} by ${decision.by}`} sub={keepWhole(sentAt(decision.at,zone))}/></BList>:null}
   <div className={decision?'eb-said eb-said--line':'eb-said'}>
    {decision?<p className="eb-said__k">Your note</p>:null}<p className="eb-said__v">{item.reason}</p>
    {decision?.note?<><p className="eb-said__k eb-said__k--gap">Manager’s note</p><p className="eb-said__v">{decision.note}</p></>:null}
   </div>
  </BCard>
  {context.state==='confirmed'&&context.decisions.length?<BCard title="Earlier decisions for this time" id="b-hours-earlier">
   <BList>{context.decisions.map((d,index)=><BRow key={index} title={keepWhole(`${d.status==='APPROVED'?'Approved':'Declined'} · ${sentAt(d.decidedAt,zone)}`)} sub={keepWhole(interval(d.startAt,d.endAt,zone)+(d.note?` · ${d.note}`:''))}/>)}</BList>
  </BCard>:null}
  {decision?null:<BNote>Your manager reviews this request. Your original punches stay unchanged.</BNote>}
  {item.baseChanged?<BCard label="Changed timecard"><div className="b-notice"><BIcon tone="amber"><WarningIcon weight="bold"/></BIcon><span className="b-notice__tx"><span className="b-notice__s eb-ink">Your timecard changed after this request. Check the current times before sending another fix.</span></span></div></BCard>:null}
  {item.kind==='MISSING_ENTRY'&&item.status==='APPROVED'&&item.currentAdjustmentId&&!item.baseChanged?<BButtonLink href={'/app/my-time?view=corrections&requestId='+item.id+'&edit='+encodeURIComponent('missing:'+item.id)} kind="quiet" full>Request another correction</BButtonLink>:null}
 </HoursBScreen>;
}

/* ---------- Fix my time: the receipts (the form itself is the corporate one, restyled in time.css) ---------- */

export function FixRecordedB({requestId,onReset,heading}:{requestId:string;onReset:()=>void;heading:Ref<HTMLHeadingElement>}){
 return <HoursBScreen sub={null} backLabel="Close"><BCard label="Submission result"><div className="eb-status">
  <h2 className="eb-receipt" ref={heading} tabIndex={-1}>Correction recorded</h2><p className="b-state">Your manager reviews it. Open it to check its status.</p>
  <BButtonLink href={'/app/my-time?view=corrections&requestId='+requestId} kind="teal" full>View my correction</BButtonLink>
  <BButton kind="quiet" full onClick={onReset}>Start another proposal</BButton>
 </div></BCard></HoursBScreen>;
}
export function FixPendingB({pending,onRetry}:{pending:boolean;onRetry:()=>void}){
 return <HoursBScreen sub={null}><BCard label="Submission status"><div className="eb-status">
  <h2 className="eb-receipt">{pending?'Checking your proposal':'Check your original submission'}</h2>
  <p className="b-state">{pending?'Your original proposal is being checked.':'The result couldn’t be confirmed. Check the original submission before starting another proposal, even if this time is no longer available for a new correction.'}</p>
  {pending?<p className="b-state" role="status">Sending your original proposal…</p>:<BButton kind="quiet" full onClick={onRetry}>Check submission status</BButton>}
 </div></BCard></HoursBScreen>;
}

/* ---------- /app/timecards: the redirect to Past timecards ---------- */

export function TimecardsRedirectB({href}:{href:string}){
 return <BScreen back><BHero back={{href:'/app/my-time',label:'Time'}} title="Past timecards"/><BStack>
  <BCard label="Opening your timecards"><div className="eb-status"><p className="b-state" role="status">Opening your timecards…</p><BButtonLink href={href} kind="quiet" full>Open Past timecards</BButtonLink></div></BCard>
 </BStack></BScreen>;
}
