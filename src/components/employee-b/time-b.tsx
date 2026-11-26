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
import {BButton,BButtonLink,BCallout,BCard,BChip,BHero,BIcon,BList,BLive,BNote,BRow,BScreen,BSeg,BStack,BState,BStatusText,compactRange,type BStateKind} from '../owner-b/b-kit';
import {momentsCopy} from '../owner-b/moments-copy';
import {BAddRow,BCardNote,BDay,BValue,Range,shiftEndedWhileOpen,shiftUnderway,sinceSpan,wallMinutesSince,wallTime,type WallShift} from './parts';
import {workCopy} from './work-copy';
import {timeCopy} from './time-copy';
import {usePortalLang,type PortalLang} from '@/lib/i18n/portal-lang';
import {useHours} from '../employee-mobile/use-hours';
import {addDays,weekStartFor} from '@/lib/date-utils';
import {keepWhole} from '@/lib/keep-whole';
import type {HoursDecision} from '@/lib/employee-hours';
import type {TimecardsResult} from '@/lib/timecards/read-model';
import type {Period} from '@/lib/timecards/project';
import type {EmployeeTimeCorrections,PublicCorrectionItem} from '@/lib/time-corrections/read-model';
import {EARLIER_MAX,boardDuration,cardStatus,cardsHref,clockAt,clockRange,compactDuration,correctionStatus,dateKey,dayLong,dayMedium,entryHref,interval,issueText,kindLabel,rangeLabel,seconds,sentAt,span,statusWord,timeWeek,weekOf,type CardState,type Ready,type StatusTone} from '../employee-mobile/hours-model';

/* Employee Time on the phone, Direction B (Jose approved the mock "Employee mobile, Direction B", Nov 6, 2026): the Time
 * tab, a day's punches, Past timecards, Your correction requests and Fix my time on the teal hero. Presentation only: each screen
 * gets the same reads, links, handlers and states as the corporate page around it (hours-corp.tsx), which still shows on
 * tablets and desktop. The pages' header (title, way back, hero line) comes from hours.tsx through HoursBContext; without
 * it (the corporate views on their own) nothing renders here. */

export type HoursBHead={title:string;sub?:string;back?:{href:string;label:string;close?:boolean};right?:ReactNode};
export type HoursBContextValue={head:HoursBHead;authority:string;/** A notice every Time page shows first (an earlier fix to check). */notice?:ReactNode;
 /** Phase 8 (review C, row 10): today's published shifts, so Right now can say a shift has ended (Home's rule). */shifts?:readonly WallShift[]|null};
export const HoursBContext=createContext<HoursBContextValue|null>(null);
/** The hero title's id: the page moves focus to it on a phone, as it does to the corporate title elsewhere. */
export const B_TITLE_ID='b-hours-title';

/** A Time page's Direction B screen: the hero from the page's header, then the cards. */
export function HoursBScreen({hero,children,sub,backLabel,right}:{hero?:ReactNode;children?:ReactNode;/** Replaces the header's line (null: none). */sub?:string|null;backLabel?:string;/** Replaces the header's action. */right?:ReactNode}){
 const context=useContext(HoursBContext);
 if(!context)return null;
 const {head,notice}=context,back=head.back?{...head.back,label:backLabel??head.back.label}:undefined;
 const stack=!!notice||(children!==undefined&&children!==null&&children!==false);
 return <BScreen back={!!back}>
  <BHero title={head.title} titleId={B_TITLE_ID} sub={sub===undefined?head.sub:sub??undefined} right={right??head.right} back={back}>{hero}</BHero>
  {stack?<BStack>{notice??null}{children}</BStack>:null}
 </BScreen>;
}

/** A read state or a message with its one way forward, as a card. Review F2 (NV-075): the shared state card (icon circle,
 * one line, one teal pill). */
export function HoursStatusB({message,action,label,kind='locked'}:{message:ReactNode;action?:{label:ReactNode;onClick?:()=>void;href?:string;busy?:boolean};label?:string;kind?:BStateKind}){
 const T=timeCopy(usePortalLang());
 return <BCard label={label??T.timeStatus}><BState kind={kind} line={message} action={action}/></BCard>;
}
export function HoursUnavailableB({message,onRefresh}:{message:string;onRefresh:()=>void}){
 const T=timeCopy(usePortalLang());
 return <HoursBScreen><HoursStatusB kind="failed" message={message} action={{label:T.tryAgain,onClick:onRefresh}}/></HoursBScreen>;
}
/** The frame's own states (paused, denied, loading, failed) on the page's hero. */
export function HoursFrameStatusB({paused,denied,refreshing,refresh}:{paused:boolean;denied:boolean;refreshing:boolean;refresh:()=>void}){
 const offline=typeof navigator!=='undefined'&&navigator.onLine===false,T=timeCopy(usePortalLang());
 return <HoursBScreen><HoursStatusB label={T.timeAccess} kind={paused?(offline?'offline':'paused'):denied?'locked':refreshing?'loading':'failed'}
  message={paused?T.paused:denied?T.denied:refreshing?T.checking:T.failed}
  action={denied?{label:T.signIn,href:'/login'}:paused||refreshing?undefined:{label:T.tryAgain,onClick:refresh}}/></HoursBScreen>;
}
/** An earlier fix is still being checked: the way back to it, first on every Time page. */
export function HoursRecoveryB({href}:{href:string}){
 const T=timeCopy(usePortalLang());
 return <BCard label={T.earlierRequest}><div className="eb-status">
  <div className="b-notice eb-flat"><BIcon tone="amber"><WarningIcon weight="bold"/></BIcon><span className="b-notice__tx" role="status"><span className="b-notice__t">{T.earlierStillChecked}</span><span className="b-notice__s">{T.returnFirst}</span></span></div>
  <BButtonLink href={href} kind="quiet" full>{T.checkEarlier}</BButtonLink>
 </div></BCard>;
}

/** A duration as the mock writes it ("8 h 02"), with the words for assistive tech ("8 h 2 min"). */
function Dur({value}:{value:number}){
 return <><span aria-hidden="true">{compactDuration(value)}</span><span className="b-sr">{boardDuration(value)}</span></>;
}
/** Final polish, round 2 (T1): a day row's range on Time. Nov 23, 2026 (one time format): it is the Employee screens'
 * `Range` at every width, which breaks only after the dash ("8:58 AM –" over "5:28 PM") where the title column cannot hold
 * the range on one line (under 360px, measured 118px against 127px). The row's link keeps its spoken label. */
function DayRange({text}:{text:string}){
 return <Range text={text}/>;
}
/** Signed-in Spanish (Nov 23, 2026): this screen's words in the person's language. Dates, times, status words, request
 * kinds and timecard notes come from the shared Time model in that language (its helpers take a trailing `lang`). */
function useTimeWords(){
 const lang=usePortalLang();
 return {lang,T:timeCopy(lang),W:workCopy(lang),M:momentsCopy(lang)};
}
const chip=(status:{word:string;tone:StatusTone})=><BChip tone={status.tone}>{status.word}</BChip>;
/** Phase 9 (spec 1.1, 1.4): a state that stands alone in a card's header. A week still under way ("In progress") is the
 * expected state, so it is quiet grey text; a green or red chip there carries its glyph (Check, WarningCircle), so the two
 * colours colour-blind readers confuse differ by shape; Declined is grey (a decision isn't an error). */
/* The states are told by the model's flags and the record's status code, never by the word, so they hold in either language:
 * a week under way is `open`; a correction says it was declined. */
const headChip=(status:{word:string;tone:StatusTone;open?:boolean},declined=false)=>{const word=status.word;
 return status.tone==='teal'&&status.open?<BStatusText>{word}</BStatusText>
 :declined?<BChip tone="grey">{word}</BChip>
 :<BChip tone={status.tone} icon={status.tone==='green'?'check':status.tone==='red'?'stop':undefined}>{word}</BChip>;};

/* ---------- Time tab ---------- */

export function TimeTabB({data}:{data:Ready}){
 const context=useContext(HoursBContext),{lang,T,W}=useTimeWords(),m=timeWeek(data,lang),zone=m.zone,current=m.current;
 const clockAtText=(at:string)=>clockAt(at,zone,lang);
 const figure=(value:number)=>m.partial?'—':<Dur value={value}/>;
 // Phase 8 (review C, row 10): today's shift has ended and the punch is still open: amber, with Home's words.
 const overrun=current&&context?.shifts?shiftEndedWhileOpen({shifts:context.shifts,today:data.date,zone,observedAt:data.observedAt,clockInAt:current.clockInAt}):null;
 // Phase 9 (spec 1.4): your own clock state is quiet grey words, with the live dot while you are or should be on the
 // clock: green Clocked in, amber On break, amber Clocked in for a punch left open after the shift ended (the amber
 // callout below says why), amber "Not clocked in · 12 min" once a shift has started with no punch. Before a shift starts
 // it is "Not clocked in" without a dot.
 const underway=!current&&context?.shifts?shiftUnderway({shifts:context.shifts,today:data.date,zone,observedAt:data.observedAt}):null;
 const since=(shift:WallShift,time:string)=>sinceSpan(wallMinutesSince({date:shift.date,time,zone,observedAt:data.observedAt}));
 const status=current?m.onBreak?<BStatusText dot="amber">{T.onBreak}</BStatusText>:<BStatusText dot={overrun?'amber':'green'}>{T.clockedIn}</BStatusText>
  :underway?<BStatusText dot="amber">{W.notClockedInFor(since(underway,underway.startTime))}</BStatusText>:<BStatusText>{T.notClockedIn}</BStatusText>;
 const headline=overrun&&current?W.stillClockedIn(clockAtText(current.clockInAt)):current?m.onBreak&&m.openBreak?T.onBreakSince(clockAtText(m.openBreak.startAt)):T.clockedInAt(clockAtText(current.clockInAt)):T.clockInOn(m.tablet);
 // Final polish, round 2 (T2, T3): the running total is the rows' compact figure ("13 h 26 so far", read "13 h 26 min so
 // far"), and it stays whole: the line breaks after the place's dot, never inside the total or before "far".
 const line:ReactNode=current?m.onBreak?keepWhole(T.placeClockedInAt(current.locationName,clockAtText(current.clockInAt)))
  :<>{current.locationName}{'\u00a0· '}<span className="eb-nb eb-sofar"><Dur value={current.elapsedSeconds}/>{T.soFar}</span></>:T.takeBreaksThere;
 const hint=overrun&&current?W.shiftEnded(keepWhole(compactRange(`${wallTime(overrun.startTime, lang)} – ${wallTime(overrun.endTime, lang)}`)),current.locationName):current?m.onBreak?T.endBreakHint:T.clockOutHint:null;
 return <HoursBScreen hero={m.week.length?<BLive label={T.atAGlance} items={[{label:T.thisWeek,value:figure(m.worked)},{label:T.breaks,value:figure(m.breaks)}]}/>:null}>
  <BCard title={T.rightNow} id="b-hours-now" chip={status}>
   {/* Phase 9 (spec 2.2): a punch left open after the shift ended is the kit's amber callout (Warning glyph, a hairline,
     * the 600 title over its lines), as on Home; every other state keeps the plain notice with the teal clock. */}
   {overrun&&current?<BCallout tone="amber" role="status" title={keepWhole(headline)}><p>{line}</p>{hint?<p>{hint}</p>:null}</BCallout>
    :<div className="b-notice eb-now"><BIcon tone="teal"><ClockIcon weight="bold"/></BIcon><span className="b-notice__tx">
    <span className="b-notice__t">{keepWhole(headline)}</span><span className="b-notice__s">{line}</span>{hint?<span className="b-notice__s">{hint}</span>:null}
   </span></div>}
  </BCard>
  <BCard title={<span><span className="eb-wide">{T.thisWeekDot}</span><span className="eb-nowrap">{rangeLabel(m.weekStart,m.weekEnd,lang)}</span></span>} id="b-hours-week" chip={<BStatusText>{T.inProgress}</BStatusText>}>
   {/* Phase 2 gate (Nov 23): rows are named by what they show (no aria-label that differs from the visible text). */}
  <BList label={T.weekTime}>
    {m.week.map(entry=>{const date=dateKey(entry.clockInAt,zone),range=clockRange(entry.clockInAt,entry.clockOutAt,zone,lang);
     return <BRow key={entry.id} href={entryHref(entry.id)} lead={<BDay date={date} today={date===data.date} lang={lang}/>} title={<span id={'b-hours-entry-'+entry.id}><span className="b-sr">{dayLong(date,lang)}, </span><DayRange text={keepWhole(range)}/></span>}
      sub={entry.breakSeconds?T.breakSub(boardDuration(entry.breakSeconds)):undefined} end={<BValue><span className={entry.clockOutAt?undefined:'eb-teal'}><Dur value={entry.elapsedSeconds}/></span></BValue>}/>;})}
    {m.week.length?null:<li className="b-li"><p className="eb-quiet">{T.noTimeYet}</p></li>}
    <BAddRow href="/app/my-time?view=corrections&edit=new" icon={<PencilSimpleIcon weight="bold"/>}>{T.fixMissed}</BAddRow>
   </BList>
   <BCardNote>{T.includeBreaks}</BCardNote>
  </BCard>
  {/* Final polish (Nov 20, 2026): last week and the corrections are one column (the Home's eb-side), so on desktop the
    * second card follows the first instead of waiting for the left column's row. Phones stack them as before. */}
  <div className="eb-side" id="b-hours-side">
  {context?<LastWeekB authority={context.authority} date={data.date}/>:null}
  {/* The corrections sit under last week (the right column on desktop). Review F2 (NV-135): phones show them too, so
    * both widths hold the same content. */}
  <div className="eb-corrections"><BCard label={T.yourRequests}><BList>
   <BRow href="/app/my-time?view=corrections" lead={<BIcon tone="teal"><PencilSimpleIcon weight="bold"/></BIcon>} title={T.yourRequests} sub={W.correctionsSub}/>
  </BList></BCard></div>
  </div>
 </HoursBScreen>;
}

/** Last Monday to Sunday through the same private hours read as Past timecards' weeks; hidden while it loads or fails. */
function LastWeekB({authority,date}:{authority:string;date:string}){
 const period=weekOf(addDays(weekStartFor(date),-7)),panel=useHours(authority,'cards',period.startDate+'_'+period.endDate,null),{lang,T}=useTimeWords();
 const data=panel.read?.view==='cards'?panel.read.data:null;
 if(!data||data.state!=='ready')return null;
 const item=data.cards[0],card=item?.card,range=rangeLabel(period.startDate,period.endDate,lang);
 if(!item||!card||!card.entries.length)return <BCard title={T.lastWeek} id="b-hours-last"><BList><BRow title={range} sub={T.noHoursRecorded}/></BList></BCard>;
 // Last week is over: an open period reads as not approved yet.
 const status=item.state==='DRAFT'?{word:T.notApprovedYet,tone:'grey' as const}:cardStatus(item.state,card.issues,lang),total=seconds(card.recordedNanoseconds);
 return <BCard title={T.lastWeek} id="b-hours-last" chip={headChip(status)}><BList>
  <BRow href={cardsHref(period)} title={range} sub={T.shifts(card.entries.length)} end={<BValue><Dur value={total}/></BValue>}/>
 </BList></BCard>;
}

/* ---------- One day (a Time entry or a timecard day) ---------- */

export type DayPunch={key:string;title:string;detail?:string;value:string;soft?:boolean};
export function DayB({total,running,status,line,punches,location,fix,notes}:{total:number|null;running:boolean;status:{word:string;tone:StatusTone};line:string;punches:DayPunch[];location:string;fix:string|null;notes:string[]}){
 const {T}=useTimeWords();
 return <HoursBScreen>
  {/* Phase 9 (spec 1.4): an entry still running is your own clock state, quiet words with the live dot (green Clocked in,
    * amber On break). */}
  <BCard title={T.hours} id="b-hours-day" chip={running&&status.tone!=='grey'?<BStatusText dot={status.tone==='teal'?'green':status.tone}>{status.word}</BStatusText>:headChip(status)}>
   <div className="eb-sum"><p className="eb-sum__big">{total===null?T.inProgress:<><Dur value={total}/>{running?<span className="eb-sum__so">{T.soFarShort}</span>:null}</>}</p><p className="eb-sum__line">{line}</p></div>
  </BCard>
  <BCard title={T.punches} id="b-hours-punches">
   <BList label={T.punches}>
    {punches.map(punch=><BRow key={punch.key} title={punch.title} sub={punch.detail} end={<span className={punch.soft?'eb-val eb-val--soft':'eb-val'}>{keepWhole(punch.value)}</span>}/>)}
    <BRow title={T.location} end={<span className="eb-val eb-val--soft eb-val--wrap">{location}</span>}/>
    {fix?<BAddRow href={fix} icon={<PencilSimpleIcon weight="bold"/>}>{T.requestCorrection}</BAddRow>:null}
   </BList>
   {notes.map(note=><BCardNote key={note}>{note}</BCardNote>)}
  </BCard>
 </HoursBScreen>;
}

/* ---------- Past timecards ---------- */

export type WeekState={data:TimecardsResult|null;paused:boolean};
/** One week as a row: its range, then shifts and state, its total and a chevron to its days. */
function WeekRowB({period,state}:{period:Period;state:WeekState|undefined}){
 const {lang,T}=useTimeWords(),range=rangeLabel(period.startDate,period.endDate,lang),data=state?.data??null;
 if(!data)return <BRow title={range} sub={state?.paused?T.pausedShort:T.loading}/>;
 if(data.state!=='ready')return <BRow href={cardsHref(period)} title={range} sub={T.couldntCheck}/>;
 const item=data.cards[0],card=item?.card;
 // The week under way says so (as on Time), with nothing recorded yet; a past week with none says it recorded none.
 if(!item||!card||!card.entries.length){const open=!!item&&!!card&&cardStatus(item.state,card.issues,lang).open;
  return <BRow title={range} sub={open?T.noHoursYet:T.noHoursRecorded}/>;}
 const status=cardStatus(item.state,card.issues,lang),count=T.shifts(card.entries.length),total=seconds(card.recordedNanoseconds);
 // A closed week says its state in grey; one that needs attention carries a chip. Phase 9 (spec 1.4): the week under way is
 // the expected state, so its sub-line ("3 shifts so far") says it and no teal chip does.
 return <BRow href={cardsHref(period)} title={range} chip={status.flag?chip(status):undefined} sub={status.open?T.countSoFar(count):status.flag?count:`${count} · ${status.word}`}
  end={<BValue><Dur value={total}/></BValue>}/>;
}
/** The chosen week (?start&end): its total and its days. */
function ChosenWeekB({data,period}:{data:Extract<TimecardsResult,{state:'ready'}>;period:Period}){
 const {lang,T}=useTimeWords(),item=data.cards[0],card=item?.card,range=rangeLabel(period.startDate,period.endDate,lang);
 if(!item||!card)return <BCard title={range} id="b-hours-timecard"><p className="eb-quiet">{T.noHoursThisWeek}</p></BCard>;
 const entries=[...card.entries].sort((a,b)=>a.startAt.localeCompare(b.startAt)),notes=card.issues.map(issue=>issueText(issue,lang)).filter((text):text is string=>!!text);
 return <BCard title={rangeLabel(card.startDate,card.endDate,lang)} id="b-hours-timecard" chip={entries.length?headChip(cardStatus(item.state as CardState,card.issues,lang)):undefined}>
  {entries.length?<>
   <div className="eb-sum"><p className="eb-sum__big"><Dur value={seconds(card.recordedNanoseconds)}/></p><p className="eb-sum__line">{T.hoursIncludes(boardDuration(seconds(card.breakNanoseconds)))}</p>
    {notes.map(note=><p className="eb-sum__line eb-sum__line--warn" key={note}>{note}</p>)}</div>
   <BList label={T.days}>{entries.map(entry=>{const length=span(entry.startAt,entry.endAt),date=dateKey(entry.startAt,card.timeZone),times=clockRange(entry.startAt,entry.endAt,card.timeZone,lang);
    return <BRow key={entry.id} href={cardsHref(period)+'&entry='+encodeURIComponent(entry.id)} lead={<BDay date={date} lang={lang}/>} title={<span id={'b-hours-card-entry-'+entry.id}><span className="b-sr">{dayLong(date,lang)}, </span><DayRange text={keepWhole(times)}/></span>}
     end={length===null?<span className="eb-val eb-val--teal">{T.inProgress}</span>:<BValue><Dur value={length}/></BValue>}/>;})}</BList>
  </>:<p className="eb-quiet">{T.noHoursThisWeek}</p>}
 </BCard>;
}
export function PastTimecardsB({data,period,today,chosen,weeks,earlier,earlierCount,onMore}:{data:Extract<TimecardsResult,{state:'ready'}>;period:Period;today:string;chosen:boolean;weeks:Record<string,WeekState>;earlier:Period[];earlierCount:number;onMore:()=>void}){
 const monday=weekStartFor(period.startDate),later=weekOf(addDays(monday,7)),key=(week:Period)=>week.startDate+'_'+week.endDate,{T,W}=useTimeWords();
 return <HoursBScreen>
  {/* Desktop is a list and its detail: the week shown opens beside the list even before one is chosen (eb-desk). */}
  {chosen?<ChosenWeekB data={data} period={period}/>:<div className="eb-desk eb-tcdetail"><ChosenWeekB data={data} period={period}/></div>}
  <BCard title={T.weeks} id="b-hours-weeks">
   <BList label={T.weeks}>
    {later.startDate<=today?<WeekRowB period={later} state={weeks[key(later)]}/>:null}
    {chosen?null:<WeekRowB period={period} state={{data,paused:false}}/>}
    {earlier.map(week=><WeekRowB key={week.startDate} period={week} state={weeks[key(week)]}/>)}
    <li className="b-li">{earlierCount<EARLIER_MAX
     ?<button type="button" className="eb-more" onClick={onMore}>{T.showEarlier}<CaretDownIcon weight="bold" aria-hidden="true"/></button>
     :<Link className="eb-more" href={cardsHref(weekOf(addDays(monday,-7*(EARLIER_MAX+1))))}>{T.earlierWeeks}<CaretRightIcon weight="bold" aria-hidden="true"/></Link>}</li>
   </BList>
  </BCard>
  <BCard label={T.yourRequests}><BList>
   <BRow href="/app/my-time?view=corrections" lead={<BIcon tone="teal"><PencilSimpleIcon weight="bold"/></BIcon>} title={T.yourRequests} sub={W.correctionsSub}/>
  </BList></BCard>
 </HoursBScreen>;
}

/* ---------- Your correction requests ---------- */

const correctionChip=(status:PublicCorrectionItem['status'],lang:PortalLang,head?:boolean)=>{const look=correctionStatus(status,lang),declined=status==='REJECTED';return head?headChip(look,declined):chip(declined?{...look,tone:'grey'}:look);};
export function CorrectionsB({snapshot,decided}:{snapshot:Extract<EmployeeTimeCorrections,{state:'ready'}>;decided:boolean}){
 const zone=snapshot.timeZone,rows=snapshot.requests.filter(r=>decided?r.status!=='PENDING':r.status==='PENDING'),{lang,T}=useTimeWords();
 // Desktop: Fix a missed punch is the band's white action (the card's own row is the phone's).
 return <HoursBScreen right={<span className="eb-desk"><BButtonLink href="/app/my-time?view=corrections&edit=new" kind="white"><PencilSimpleIcon size={16} weight="bold" aria-hidden="true"/>{T.fixMissed}</BButtonLink></span>} hero={<BSeg label={T.correctionRequests} items={[{key:'waiting',label:T.waiting,href:'/app/my-time?view=corrections',current:!decided},{key:'decided',label:T.decided,href:'/app/my-time?view=corrections&filter=decided',current:decided}]}/>}>
  <BCard label={decided?T.decisions:T.waitingForReview}>
   <BList label={decided?T.decisions:T.waitingForReview}>
    {rows.map(r=>{const day=dateKey(r.proposedStartAt,zone),times=clockRange(r.proposedStartAt,r.proposedEndAt,zone,lang);
     return <BRow key={r.id} href={'/app/my-time?view=corrections&requestId='+r.id+(decided?'&filter=decided':'')} title={<span id={'b-hours-request-'+r.id}>{kindLabel(r.kind,lang)}</span>}
      sub={keepWhole(`${dayMedium(day,lang)} · ${times}`)} end={correctionChip(r.status,lang)}/>;})}
    {rows.length?null:<li className="b-li"><div className="eb-none">
     <BIcon tone="grey"><ClockCounterClockwiseIcon weight="bold"/></BIcon>
     <p className="eb-none__t">{decided?T.noDecided:T.nothingWaiting}</p>
     <p className="eb-none__s">{decided?T.nothingDecided:T.stayHere}</p>
    </div></li>}
    <BAddRow href="/app/my-time?view=corrections&edit=new" icon={<PencilSimpleIcon weight="bold"/>}>{T.fixMissed}</BAddRow>
   </BList>
   <BCardNote>{T.openFromTime}</BCardNote>
  </BCard>
  {snapshot.totalRequests>snapshot.requests.length?<BNote>{T.showingRecent(snapshot.requests.length)}</BNote>:null}
 </HoursBScreen>;
}
export function CorrectionDetailB({item,decision,zone}:{item:PublicCorrectionItem;decision:HoursDecision|undefined;zone:string}){
 const {lang,T}=useTimeWords(),when=(start:string,end:string)=>interval(start,end,zone,lang),sent=(at:string)=>sentAt(at,zone,lang);
 const context=item.context,now=context.state==='confirmed'&&context.sourceKind==='ADJUSTMENT'?when(context.startAt,context.endAt):null;
 return <HoursBScreen>
  <BCard title={item.kind==='BREAK_BOUNDARY'&&item.breakName?T.breakNamed(item.breakName):kindLabel(item.kind,lang)} id="b-hours-correction" chip={correctionChip(item.status,lang,true)}>
   <BList label={T.times}>
    <BRow title={T.recorded} sub={item.originalStartAt&&item.originalEndAt?keepWhole(when(item.originalStartAt,item.originalEndAt)):T.noPunches}/>
    <BRow title={T.youAskedFor} sub={keepWhole(when(item.proposedStartAt,item.proposedEndAt))}/>
    {now?<BRow title={T.onTimecard} sub={keepWhole(now)}/>:null}
    <BRow title={T.location} end={<span className="eb-val eb-val--soft eb-val--wrap">{item.locationName}</span>}/>
    <BRow title={T.sent} end={<span className="eb-val eb-val--soft">{keepWhole(sent(item.createdAt))}</span>}/>
   </BList>
  </BCard>
  <BCard title={decision?T.decision:T.yourNote} id="b-hours-note">
   {decision?<BList><BRow title={T.decidedBy(statusWord(decision.status,lang),decision.by)} sub={keepWhole(sent(decision.at))}/></BList>:null}
   <div className={decision?'eb-said eb-said--line':'eb-said'}>
    {decision?<p className="eb-said__k">{T.yourNote}</p>:null}<p className="eb-said__v">{item.reason}</p>
    {decision?.note?<><p className="eb-said__k eb-said__k--gap">{T.managersNote}</p><p className="eb-said__v">{decision.note}</p></>:null}
   </div>
  </BCard>
  {context.state==='confirmed'&&context.decisions.length?<BCard title={T.earlierDecisions} id="b-hours-earlier">
   <BList>{context.decisions.map((d,index)=><BRow key={index} title={keepWhole(`${d.status==='APPROVED'?T.approved:T.declined} · ${sent(d.decidedAt)}`)} sub={keepWhole(when(d.startAt,d.endAt)+(d.note?` · ${d.note}`:''))}/>)}</BList>
  </BCard>:null}
  {decision?null:<BNote>{T.managerReviews}</BNote>}
  {item.baseChanged?<BCard label={T.changedTimecard}><div className="b-notice"><BIcon tone="amber"><WarningIcon weight="bold"/></BIcon><span className="b-notice__tx"><span className="b-notice__s eb-ink">{T.timecardChanged}</span></span></div></BCard>:null}
  {item.kind==='MISSING_ENTRY'&&item.status==='APPROVED'&&item.currentAdjustmentId&&!item.baseChanged?<BButtonLink href={'/app/my-time?view=corrections&requestId='+item.id+'&edit='+encodeURIComponent('missing:'+item.id)} kind="quiet" full>{T.requestAnother}</BButtonLink>:null}
 </HoursBScreen>;
}

/* ---------- Fix my time: the receipts (the form itself is the corporate one, restyled in time.css) ---------- */

export function FixRecordedB({requestId,onReset,heading}:{requestId:string;onReset:()=>void;heading:Ref<HTMLHeadingElement>}){
 // Phase 7 (moments): the end of the correction flow is the shared page finish. The heading takes focus, so it is what is read.
 const {T,M}=useTimeWords();
 return <HoursBScreen sub={null} backLabel={T.close}><BCard label={T.submissionResult}>
  <BState kind="done" size="finish" heading titleRef={heading} title={M.correctionSent} line={M.correctionLine} action={{label:M.viewRequest,href:'/app/my-time?view=corrections&requestId='+requestId}}
   quiet={<button className="b-done__quiet" type="button" onClick={onReset}>{M.anotherCorrection}</button>}/>
 </BCard></HoursBScreen>;
}
export function FixPendingB({pending,onRetry}:{pending:boolean;onRetry:()=>void}){
 const {T}=useTimeWords();
 return <HoursBScreen sub={null}><BCard label={T.submissionStatus}><div className="eb-status">
  <h2 className="eb-receipt">{pending?T.checkingRequest:T.checkEarlier}</h2>
  <p className="b-state">{pending?T.checkingWhether:T.couldntConfirm}</p>
  {pending?<p className="b-state" role="status">{T.sending}</p>:<BButton kind="quiet" full onClick={onRetry}>{T.checkStatus}</BButton>}
 </div></BCard></HoursBScreen>;
}

/* ---------- /app/timecards: the redirect to Past timecards ---------- */

export function TimecardsRedirectB({href}:{href:string}){
 const {T}=useTimeWords();
 return <BScreen back><BHero back={{href:'/app/my-time',label:T.time}} title={T.pastTimecards}/><BStack>
  <BCard label={T.openingLabel}><div className="eb-status"><p className="b-state" role="status">{T.opening}</p><BButtonLink href={href} kind="quiet" full>{T.openPast}</BButtonLink></div></BCard>
 </BStack></BScreen>;
}
