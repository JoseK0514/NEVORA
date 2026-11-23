'use client';
import Link from 'next/link';
import {useCallback,useEffect,useId,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {CorpBody,CorpButton,CorpButtonLink,CorpCard,CorpField,CorpNote,CorpPill,CorpRow,CorpRows,CorpSegments,CorpStats,CorpTitle} from '../corp/corp';
import {BState} from '../owner-b/b-kit';
import {addDays,formatTime,weekStartFor} from '@/lib/date-utils';
import type {EmployeeTimeEntry} from '@/lib/employee-time';
import type {EmployeeHoursSnapshot,HoursView,HoursDecision,HoursCorrectionPayload} from '@/lib/employee-hours';
import type {PrivatePanelState} from '@/lib/private-snapshot-client';
import type {TimecardsResult} from '@/lib/timecards/read-model';
import type {Period,TimecardEntry,TimecardIssue} from '@/lib/timecards/project';
import type {EmployeeTimeCorrections,PublicCorrectionItem} from '@/lib/time-corrections/read-model';
import {buildHoursProposal,initialHoursDraft,resolveHoursEdit,type HoursDraft} from '@/lib/employee-hours-draft';
import type {HoursCorrectionOperation} from './hours-operation';
import {useHours} from './use-hours';
import {useMobileLang} from './mobile-lang';
import {timeText,type MobileLang} from './mobile-format';
import {hoursCorpCopy} from './copy/hours-corp';
import {EARLIER_MAX,EARLIER_STEP,boardDuration,cardStatus,cardsHref,clockAt,clockRange,dateKey,dayMedium,dayShort,entryHref,interval,issueText,kindLabel,correctionStatus,rangeLabel,seconds,sentAt,span,statusWord,timeWeek,weekOf,type CardState,type Ready,type StatusTone} from './hours-model';
import {CorrectionDetailB,CorrectionsB,DayB,FixPendingB,FixRecordedB,HoursBScreen,HoursFrameStatusB,HoursStatusB,HoursUnavailableB,PastTimecardsB,TimeTabB,type WeekState} from '../employee-b/time-b';

/* Employee Time on the corporate kit (Release 1 boards G-E-Time, E-TimeOnClock, E-TimecardDay, E-PastTimecards and
 * E-CorrectionSheet). Presentation only: the same reads, links, correction operation and states as the older views.
 * Clocking in, breaks and clocking out stay on the location's tablet. */

export {boardDuration,clockAt,clockRange,dateKey,dayShort,dayMedium,rangeLabel,timeSubtitle,cardsHref} from './hours-model';

/* ---------- Frame ---------- */

/** The visible element for an id: the corporate one on tablets and desktop; on a phone its Direction B twin (the same id
 * with "b-", or the row link around it), which takes focus the same way. */
function visible(id:string){
 const own=document.getElementById(id);if(!own||own.getClientRects().length)return own;
 const twin=document.getElementById('b-'+id),target=twin?.closest<HTMLElement>('a,button')??twin;
 if(!target||!target.getClientRects().length)return own;
 if(target===twin&&!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');
 return target;
}
/** One header per page: the tab title on Time itself; a white "‹ Back  Title" bar on pushed pages; Cancel · title · Send
 * on the correction sheet. Ready content, otherwise the read's status and its one recovery action. On a phone the ready
 * content draws its Direction B screen and the frame's own states draw theirs (time-b.tsx). */
export function CorpHoursFrame({contextKey,view,state,ready,refresh,head,headInside=false,sub,children}:{contextKey:string;view:HoursView;state:PrivatePanelState<EmployeeHoursSnapshot>;ready:boolean;refresh:()=>void;
 head:ReactNode;/** The ready content draws its own header (the correction sheet's Send lives in its form). */headInside?:boolean;/** A pushed page (hides the shell's brand header on a phone). */sub:boolean;children:ReactNode}){
 const focused=useRef<string|null>(null);
 useEffect(()=>{if(!ready||focused.current===contextKey)return;const first=focused.current===null;focused.current=contextKey;const target=window.location.hash.slice(1);
  if(target&&document.getElementById(target))visible(target)?.focus();else if(!first||sub)visible('hours-title')?.focus();},[ready,contextKey,sub]);
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied',t=hoursCorpCopy[useMobileLang()].frame;
 return <div className={sub?'c-page c-page--narrow c-hours c-hours--sub':'c-page c-page--narrow c-hours'} data-nv-page="" data-corp="" data-hours-context={contextKey} data-hours-view={view}
  data-hours-state={state.paused?'paused':ready?'ready':denied?'denied':state.refreshing?'loading':'unavailable'} aria-busy={state.refreshing}>
  {ready?null:<HoursFrameStatusB paused={state.paused} denied={denied} refreshing={state.refreshing} refresh={refresh}/>}
  {ready&&headInside?null:head}
  {ready?children:<CorpCard ariaLabel={t.access}><CorpBody>
   <p className="c-line2" role="status">{state.paused?t.paused:denied?t.denied:state.refreshing?t.refreshing:t.failed}</p>
   {denied?<CorpButtonLink href="/login" kind="secondary" size="md" full>{t.signIn}</CorpButtonLink>:<CorpButton kind="secondary" size="md" full disabled={state.paused||state.refreshing} onClick={refresh}>{state.refreshing?t.checking:t.tryAgain}</CorpButton>}
  </CorpBody></CorpCard>}
 </div>;
}
/** A pushed page's white bar: "‹ Back" left, the title centred. */
export function CorpHoursNav({back,title}:{back:{href:string;label:string};title:string}){
 return <div className="c-nav"><Link className="c-nav__back" href={back.href}><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true"/>{back.label}</Link>
  <h1 className="c-nav__title" id="hours-title" tabIndex={-1}>{title}</h1><span className="c-nav__right"/></div>;
}
/** The correction sheet's bar: Cancel · Fix my time · Send. */
export function CorpHoursSheetHead({cancel,cancelLabel,send}:{cancel:string;cancelLabel?:string;send?:ReactNode}){
 const t=hoursCorpCopy[useMobileLang()].frame;
 return <div className="c-nav c-hours-sheet"><Link className="c-nav__back c-hours-cancel" href={cancel}>{cancelLabel??t.cancel}</Link>
  <h1 className="c-nav__title" id="hours-title" tabIndex={-1}>{t.fixMyTime}</h1><span className="c-nav__right">{send??null}</span></div>;
}
/** The Time tab's title: Past timecards on the right, the date and location under it. */
export function CorpHoursTitle({sub}:{sub?:string}){
 const t=hoursCorpCopy[useMobileLang()].frame;
 return <CorpTitle id="hours-title" focusTarget title={t.time} sub={sub} actions={<CorpButtonLink href="/app/my-time?view=cards" kind="neutral" size="sm">{t.pastTimecards}</CorpButtonLink>}/>;
}
/** A read that couldn't be used, with Try again; on a phone the same message on the page's hero. */
export function CorpHoursUnavailable({message,onRefresh}:{message:string;onRefresh:()=>void}){
 const t=hoursCorpCopy[useMobileLang()].frame;
 return <><HoursUnavailableB message={message} onRefresh={onRefresh}/><CorpCard ariaLabel={t.status}><CorpBody><p className="c-line2" role="status">{message}</p><CorpButton kind="secondary" size="md" full onClick={onRefresh}>{t.tryAgain}</CorpButton></CorpBody></CorpCard></>;
}

/* ---------- Time tab ---------- */

export function CorpTimeTab({data}:{data:Ready}){
 const lang=useMobileLang(),t=hoursCorpCopy[lang].tab;
 const {zone,current,weekStart,weekEnd,week,partial,worked,breaks,onBreak,openBreak,tablet}=timeWeek(data,lang);
 const total=(value:number)=>partial?'—':boardDuration(value);
 return <>
  <TimeTabB data={data}/>
  {/* Upscale S9: off the clock, the heading says it once (no "Off the clock" pill) and names the tablet to use. */}
  <CorpCard id="hours-now" label={current?t.currentShift:t.rightNow} aside={current?onBreak?<CorpPill tone="amber">{t.onBreak}</CorpPill>:<CorpPill tone="teal" dot>{t.clockedIn}</CorpPill>:undefined}>
   <CorpBody>
    <b className="c-big">{current?onBreak&&openBreak?t.onBreakSince(clockAt(openBreak.startAt,zone,lang)):t.clockedInAt(clockAt(current.clockInAt,zone,lang)):t.notClockedIn}</b>
    <span className="c-line2">{current?onBreak?t.placeClockedInAt(current.locationName,clockAt(current.clockInAt,zone,lang)):t.placeSoFar(current.locationName,boardDuration(current.elapsedSeconds)):t.clockInOn(tablet)}</span>
    {current?<span className="c-line3">{onBreak?t.endBreak:t.takeBreaks}</span>:null}
   </CorpBody>
  </CorpCard>
  <CorpCard id="hours-week" label={<><span className="c-hours-wide">{t.thisWeek}</span>{rangeLabel(weekStart,weekEnd,lang)}</>} aside={<CorpPill>{t.inProgress}</CorpPill>}>
   {week.length?<CorpStats items={[{label:t.hours,value:total(worked)},{label:t.breaks,value:total(breaks)}]}/>:null}
   <CorpRows label={t.weekTime}>
    {week.map(entry=><li key={entry.id}><CorpRow id={'hours-entry-'+entry.id} href={entryHref(entry.id)} bold title={dayShort(dateKey(entry.clockInAt,zone),lang)}
     detail={clockRange(entry.clockInAt,entry.clockOutAt,zone,lang)+(entry.breakSeconds?t.breakDetail(boardDuration(entry.breakSeconds)):'')}
     value={boardDuration(entry.elapsedSeconds)} valueTone={entry.clockOutAt?undefined:'teal'}/></li>)}
    {week.length?null:<li><CorpRow title={t.noTimeYet} one/></li>}
    <li><CorpRow href="/app/my-time?view=corrections&edit=new" label={t.fixMissed} title={<span className="c-link c-link--l">{t.fixMissed}</span>} one/></li>
   </CorpRows>
  </CorpCard>
  <CorpNote>{t.hoursIncludeBreaks}</CorpNote>
 </>;
}

/* ---------- One day (board E-TimecardDay) ---------- */

type Punch={key:string;title:string;detail?:string;value:string;soft?:boolean};
function DayCards({seconds:length,running,status,pill,line,punches,location,fix,notes}:{/** null: still open. */seconds:number|null;running:boolean;status:{word:string;tone:StatusTone};pill:ReactNode;line:string;punches:Punch[];location:string;fix:string|null;notes:string[]}){
 const t=hoursCorpCopy[useMobileLang()].day,total=length===null?t.inProgress:boardDuration(length);
 return <>
  <DayB total={length} running={running} status={status} line={line} punches={punches} location={location} fix={fix} notes={notes}/>
  <CorpCard id="hours-day" label={t.hours} aside={pill}>
   <CorpBody><b className="c-big">{running?t.soFar(total):total}</b><span className="c-line2">{line}</span></CorpBody>
  </CorpCard>
  <CorpCard label={t.punches}>
   <CorpRows label={t.punches}>
    {punches.map(punch=><li key={punch.key}><CorpRow bold title={punch.title} detail={punch.detail} one={!punch.detail} value={punch.value} valueTone={punch.soft?'soft':undefined}/></li>)}
    <li><CorpRow bold title={t.location} value={location} valueTone="soft" one/></li>
    {fix?<li><CorpRow href={fix} label={t.requestCorrection} title={<><span className="c-hours-wide">{t.somethingWrong}</span><span className="c-hours-teal">{t.requestCorrection}</span></>} one/></li>:null}
   </CorpRows>
  </CorpCard>
  {notes.map(note=><CorpNote key={note}>{note}</CorpNote>)}
 </>;
}
type Words=typeof hoursCorpCopy.en;
const entryPill=(state:EmployeeTimeEntry['state'],t:Words['day'])=>state==='CLOCKED_OUT'?<CorpPill>{t.completed}</CorpPill>:state==='ON_BREAK'?<CorpPill tone="amber">{t.onBreak}</CorpPill>:<CorpPill tone="teal" dot>{t.clockedIn}</CorpPill>;
const entryStatus=(state:EmployeeTimeEntry['state'],t:Words['day']):{word:string;tone:StatusTone}=>state==='CLOCKED_OUT'?{word:t.completed,tone:'grey'}:state==='ON_BREAK'?{word:t.onBreak,tone:'amber'}:{word:t.clockedIn,tone:'teal'};
/** A recorded entry from the Time tab. */
export function CorpTimeEntry({entry,zone}:{entry:EmployeeTimeEntry;zone:string}){
 const lang=useMobileLang(),t=hoursCorpCopy[lang].day,done=!!entry.clockOutAt;
 return <DayCards seconds={entry.elapsedSeconds} running={!done} status={entryStatus(entry.state,t)} pill={entryPill(entry.state,t)} location={entry.locationName}
  line={entry.breakSeconds?t.includesBreaks(boardDuration(entry.breakSeconds)):t.noBreaks}
  punches={[{key:'in',title:t.clockIn,value:clockAt(entry.clockInAt,zone,lang)},
   ...entry.breaks.map(item=>({key:item.id,title:item.name??t.breakWord,detail:boardDuration(item.elapsedSeconds)+(item.endAt?'':t.soFarSuffix),value:clockRange(item.startAt,item.endAt,zone,lang)})),
   {key:'out',title:t.clockOut,value:entry.clockOutAt?clockAt(entry.clockOutAt,zone,lang):t.notYet,soft:!done}]}
  fix={done?'/app/my-time?view=corrections&edit='+encodeURIComponent('entry:'+entry.id):null}
  notes={done?[t.hoursIncludeBreaks]:[t.finishEntry]}/>;
}

/* ---------- Past timecards (board E-PastTimecards) ---------- */

/** Upscale S4/M4: a default state is grey text; Approved stays a teal pill and Reopened or Needs review an amber one. */
function cardPill(state:CardState,issues:TimecardIssue[],lang:MobileLang){
 const word=cardStatus(state,issues,lang).word;
 if(state==='APPROVED')return <CorpPill tone="teal">{word}</CorpPill>;
 if(state==='REOPENED'||state==='NEEDS_REVIEW')return <CorpPill tone="amber">{word}</CorpPill>;
 return <span className="c-meta">{word}</span>;
}
/** One earlier week's private read (the same hours read as the page, paused and cleared with it), reported to the page so
 * the week's card here and its row on the phone screen share one read. Draws nothing. */
function WeekRead({authority,period,onState}:{authority:string;period:Period;onState:(key:string,state:WeekState|null)=>void}){
 const selection=period.startDate+'_'+period.endDate,panel=useHours(authority,'cards',selection,null);
 const data=panel.read?.view==='cards'?panel.read.data:null,paused=panel.state.paused;
 useEffect(()=>{onState(selection,{data,paused});},[onState,selection,data,paused]);
 useEffect(()=>()=>onState(selection,null),[onState,selection]);
 return null;
}
/** One earlier week as a card: its range and state, then its total (17/600) linking to the week. */
function WeekCard({period,state}:{period:Period;state:WeekState|undefined}){
 const lang=useMobileLang(),t=hoursCorpCopy[lang].cards;
 const data=state?.data??null,item=data?.state==='ready'?data.cards[0]:null,card=item?.card;
 const label=rangeLabel(period.startDate,period.endDate,lang),worked=!!card&&card.entries.length>0;
 return <CorpCard label={label} aside={worked&&item?cardPill(item.state,card!.issues,lang):undefined}>
  <CorpRows>{!data?<li><CorpRow title={<span className="c-hours-soft">{state?.paused?t.paused:t.loading}</span>} one/></li>
   :data.state!=='ready'?<li><CorpRow href={cardsHref(period)} title={<span className="c-hours-soft">{t.unchecked}</span>} label={t.uncheckedLabel(label)} one/></li>
   :worked?<li><CorpRow href={cardsHref(period)} label={t.totalLabel(label,boardDuration(seconds(card!.recordedNanoseconds)))} title={<span className="c-hours-total">{boardDuration(seconds(card!.recordedNanoseconds))}</span>}
     detail={card!.breakNanoseconds!=='0'?t.hoursIncludes(boardDuration(seconds(card!.breakNanoseconds))):t.hours}/></li>
   :<li><CorpRow title={<span className="c-hours-soft">{t.noHours}</span>} one/></li>}</CorpRows>
 </CorpCard>;
}
export function CorpPastTimecards({authority,data,period,today,entryId,onRefresh,chosen=true}:{authority:string;data:TimecardsResult;period:Period;today:string;entryId:string|null;onRefresh:()=>void;
 /** The week was chosen (?start&end): the phone screen lists its days; otherwise it is one row of the weeks list. */chosen?:boolean}){
 const [earlierCount,setEarlierCount]=useState(EARLIER_STEP),[weeks,setWeeks]=useState<Record<string,WeekState>>({});
 const lang=useMobileLang(),t=hoursCorpCopy[lang].cards;
 const onWeek=useCallback((key:string,state:WeekState|null)=>setWeeks(previous=>{if(state)return previous[key]?.data===state.data&&previous[key]?.paused===state.paused?previous:{...previous,[key]:state};if(!(key in previous))return previous;const next={...previous};delete next[key];return next;}),[]);
 if(data.state!=='ready')return <CorpHoursUnavailable message={data.reason==='source_limit'?t.sourceLimit:t.failed} onRefresh={onRefresh}/>;
 const item=data.cards[0],card=item?.card;
 if(entryId){const entry=card?.entries.find(e=>e.id===entryId);return entry&&card&&item?<CorpTimecardDay entry={entry} zone={card.timeZone} status={cardStatus(item.state,card.issues,lang)} pill={cardPill(item.state,card.issues,lang)} period={period}/>:<CorpHoursUnavailable message={t.entryMissing} onRefresh={onRefresh}/>;}
 const monday=weekStartFor(period.startDate),later=weekOf(addDays(monday,7));
 const earlier=Array.from({length:earlierCount},(_,index)=>weekOf(addDays(monday,-7*(index+1))));
 const notes=card?card.issues.map(issue=>issueText(issue,lang)).filter((text):text is string=>!!text):[];
 const entries=card?[...card.entries].sort((a,b)=>a.startAt.localeCompare(b.startAt)):[];
 const more=()=>setEarlierCount(count=>Math.min(EARLIER_MAX,count+EARLIER_STEP)),key=(week:Period)=>week.startDate+'_'+week.endDate;
 // Upscale M4: the chosen week in full, then earlier weeks as one card each, newest first, and "Show earlier weeks".
 return <>
  <PastTimecardsB data={data} period={period} today={today} chosen={chosen} weeks={weeks} earlier={earlier} earlierCount={earlierCount} onMore={more}/>
  {/* Each week is read once; its card here and its row on the phone screen show that read. The later week is the phone list's first row. */}
  {later.startDate<=today?<WeekRead authority={authority} period={later} onState={onWeek}/>:null}
  {earlier.map(week=><WeekRead key={week.startDate} authority={authority} period={week} onState={onWeek}/>)}
  {later.startDate<=today?<CorpCard ariaLabel={t.laterWeeks}><CorpRows><li><CorpRow href={cardsHref(later)} title={t.laterWeek} value={rangeLabel(later.startDate,later.endDate,lang)} valueTone="soft" one/></li></CorpRows></CorpCard>:null}
  {card&&item?<CorpCard id="hours-timecard" label={rangeLabel(card.startDate,card.endDate,lang)} aside={entries.length?cardPill(item.state,card.issues,lang):undefined}>
   {entries.length?<CorpBody><b className="c-big">{boardDuration(seconds(card.recordedNanoseconds))}</b>
    <span className="c-line3">{t.hoursIncludes(boardDuration(seconds(card.breakNanoseconds)))}</span>
    {notes.map(note=><span className="c-line3 c-hours-warn" key={note}>{note}</span>)}</CorpBody>:<CorpRows><li><CorpRow title={<span className="c-hours-soft">{t.noHours}</span>} one/></li></CorpRows>}
   {entries.length?<CorpRows label={t.days}>
    {entries.map(entry=>{const length=span(entry.startAt,entry.endAt);return <li key={entry.id}><CorpRow id={'hours-card-entry-'+entry.id} href={cardsHref(period)+'&entry='+encodeURIComponent(entry.id)} bold
     title={dayShort(dateKey(entry.startAt,card.timeZone),lang)} detail={clockRange(entry.startAt,entry.endAt,card.timeZone,lang)}
     value={length===null?t.inProgress:boardDuration(length)} valueTone={length===null?'teal':undefined}/></li>;})}
   </CorpRows>:null}
  </CorpCard>:<CorpCard label={rangeLabel(period.startDate,period.endDate,lang)}><CorpRows><li><CorpRow title={<span className="c-hours-soft">{t.noHours}</span>} one/></li></CorpRows></CorpCard>}
  {earlier.map(week=><WeekCard key={week.startDate} period={week} state={weeks[key(week)]}/>)}
  <CorpCard ariaLabel={t.moreTimecards}>
   <CorpRows>
    {earlierCount<EARLIER_MAX?<li><CorpRow onClick={more} title={<span className="c-link c-link--l">{t.showEarlier}</span>} label={t.showEarlier} chevron={false} one/></li>
     :<li><CorpRow href={cardsHref(weekOf(addDays(monday,-7*(EARLIER_MAX+1))))} title={t.earlierWeeks} one/></li>}
    <li><CorpRow href="/app/my-time?view=corrections" title={t.yourCorrections} one/></li>
   </CorpRows>
  </CorpCard>
 </>;
}
function CorpTimecardDay({entry,zone,status,pill,period}:{entry:TimecardEntry;zone:string;status:{word:string;tone:StatusTone};pill:ReactNode;period:Period}){
 const lang=useMobileLang(),t=hoursCorpCopy[lang].day;
 const length=span(entry.startAt,entry.endAt),moved=(raw:string|null,now:string|null)=>!!raw&&!!now&&raw!==now;
 const missing=!entry.rawStartAt,breakTotal=entry.breaks.reduce((sum,item)=>sum+(span(item.startAt,item.endAt)??0),0);
 return <DayCards seconds={length} running={false} status={status} pill={pill} location={entry.locationName}
  line={[entry.positionName,missing?t.approvedMissing:entry.adjustmentId?t.includesCorrection:null,breakTotal?t.breaksOf(boardDuration(breakTotal)):t.noBreaks].filter(Boolean).join(' · ')}
  punches={[{key:'in',title:t.clockIn,detail:moved(entry.rawStartAt,entry.startAt)?t.recordedAt(clockAt(entry.rawStartAt!,zone,lang)):undefined,value:clockAt(entry.startAt,zone,lang)},
   ...entry.breaks.map(item=>{const time=span(item.startAt,item.endAt);return {key:item.id,title:item.name,detail:(time===null?t.inProgress:boardDuration(time))+(item.adjustmentId?t.corrected:''),value:clockRange(item.startAt,item.endAt,zone,lang)};}),
   {key:'out',title:t.clockOut,detail:moved(entry.rawEndAt,entry.endAt)?t.recordedAt(clockAt(entry.rawEndAt!,zone,lang)):undefined,value:entry.endAt?clockAt(entry.endAt,zone,lang):t.notYet,soft:!entry.endAt}]}
  fix={entry.rawStartAt&&entry.rawEndAt?'/app/my-time?view=corrections&edit='+encodeURIComponent('entry:'+entry.id)+'&from=cards&start='+period.startDate+'&end='+period.endDate:null}
  notes={missing?[t.noDevicePunch]:entry.adjustmentId?[t.originalKept]:[]}/>;
}

/* ---------- Corrections ---------- */

const statusPill=(status:PublicCorrectionItem['status'],lang:MobileLang)=>{const word=correctionStatus(status,lang).word;return status==='PENDING'?<span className="c-meta">{word}</span>:status==='APPROVED'?<CorpPill tone="teal">{word}</CorpPill>:<CorpPill tone="red">{word}</CorpPill>;};
export function CorpCorrections({snapshot,decisions,requestId,filter,onRefresh}:{snapshot:EmployeeTimeCorrections;decisions:HoursDecision[];requestId:string|null;filter:string;onRefresh:()=>void}){
 const lang=useMobileLang(),t=hoursCorpCopy[lang].corrections;
 if(snapshot.state!=='ready')return <CorpHoursUnavailable message={snapshot.reason==='source_limit'?t.sourceLimit:t.failed} onRefresh={onRefresh}/>;
 const zone=snapshot.timeZone;
 if(requestId){const item=snapshot.requests.find(r=>r.id===requestId);return item?<><CorrectionDetailB item={item} decision={decisions.find(d=>d.requestId===item.id)} zone={zone}/><CorpCorrectionDetail item={item} decision={decisions.find(d=>d.requestId===item.id)} zone={zone}/></>
  :<><HoursBScreen><HoursStatusB label={t.correction} message={t.notAvailable}/></HoursBScreen><CorpCard ariaLabel={t.correction}><p className="c-empty" role="status">{t.notAvailable}</p></CorpCard></>;}
 const decided=filter==='decided',rows=snapshot.requests.filter(r=>decided?r.status!=='PENDING':r.status==='PENDING');
 return <>
  <CorrectionsB snapshot={snapshot} decided={decided}/>
  <CorpSegments label={t.segments} items={[{href:'/app/my-time?view=corrections',label:t.waiting,current:!decided},{href:'/app/my-time?view=corrections&filter=decided',label:t.decided,current:decided}]}/>
  <CorpCard label={decided?t.decisions:t.waitingReview}>
   {rows.length?<CorpRows label={decided?t.decisions:t.waitingReview}>{rows.map(r=><li key={r.id}><CorpRow id={'hours-request-'+r.id} href={'/app/my-time?view=corrections&requestId='+r.id+(decided?'&filter=decided':'')}
    bold title={kindLabel(r.kind,lang)} detail={<>{dayMedium(dateKey(r.proposedStartAt,zone),lang)}<span className="c-hours-wide"> · {clockRange(r.proposedStartAt,r.proposedEndAt,zone,lang)}</span></>} trail={statusPill(r.status,lang)} chevron/></li>)}</CorpRows>
   :<p className="c-empty">{decided?t.noDecided:t.noWaiting}</p>}
  </CorpCard>
  <CorpCard ariaLabel={t.fixMyTime}><CorpRows><li><CorpRow href="/app/my-time?view=corrections&edit=new" label={t.fixMissed} title={<span className="c-link c-link--l">{t.fixMissed}</span>} one/></li></CorpRows></CorpCard>
  {snapshot.totalRequests>snapshot.requests.length?<CorpNote>{t.showing(snapshot.requests.length)}</CorpNote>:null}
  <CorpNote>{t.fromTime}</CorpNote>
 </>;
}
function CorpCorrectionDetail({item,decision,zone}:{item:PublicCorrectionItem;decision:HoursDecision|undefined;zone:string}){
 const lang=useMobileLang(),t=hoursCorpCopy[lang].detail;
 const context=item.context,now=context.state==='confirmed'&&context.sourceKind==='ADJUSTMENT'?interval(context.startAt,context.endAt,zone,lang):null;
 return <>
  <CorpCard id="hours-correction" label={item.kind==='BREAK_BOUNDARY'&&item.breakName?t.breakNamed(item.breakName):kindLabel(item.kind,lang)} aside={statusPill(item.status,lang)}>
   <CorpRows label={t.times}>
    <li><CorpRow bold title={t.recorded} detail={item.originalStartAt&&item.originalEndAt?interval(item.originalStartAt,item.originalEndAt,zone,lang):t.noPunches}/></li>
    <li><CorpRow bold title={t.asked} detail={interval(item.proposedStartAt,item.proposedEndAt,zone,lang)}/></li>
    {now?<li><CorpRow bold title={t.onTimecard} detail={now}/></li>:null}
    <li><CorpRow bold title={t.location} value={item.locationName} valueTone="soft" one/></li>
    <li><CorpRow bold title={t.sent} value={sentAt(item.createdAt,zone,lang)} valueTone="soft" one/></li>
   </CorpRows>
  </CorpCard>
  <CorpCard label={decision?t.decision:t.yourNote}>
   {decision?<CorpRows><li><CorpRow bold title={t.decidedBy(statusWord(decision.status,lang),decision.by)} detail={sentAt(decision.at,zone,lang)}/></li></CorpRows>:null}
   <CorpBody>{decision?<span className="c-line3">{t.yourNote}</span>:null}<p className="c-hours-note">{item.reason}</p>
    {decision?.note?<><span className="c-line3 c-hours-gap">{t.managerNote}</span><p className="c-hours-note">{decision.note}</p></>:null}</CorpBody>
  </CorpCard>
  {context.state==='confirmed'&&context.decisions.length?<CorpCard label={t.earlier}>
   <CorpRows>{context.decisions.map((d,index)=><li key={index}><CorpRow bold title={t.earlierLine(d.status==='APPROVED',sentAt(d.decidedAt,zone,lang))} detail={interval(d.startAt,d.endAt,zone,lang)+(d.note?` · ${d.note}`:'')}/></li>)}</CorpRows>
  </CorpCard>:null}
  {decision?null:<CorpNote>{t.managerReviews}</CorpNote>}
  {item.baseChanged?<p className="c-callout">{t.baseChanged}</p>:null}
  {item.kind==='MISSING_ENTRY'&&item.status==='APPROVED'&&item.currentAdjustmentId&&!item.baseChanged?<CorpButtonLink href={'/app/my-time?view=corrections&requestId='+item.id+'&edit='+encodeURIComponent('missing:'+item.id)} kind="secondary" full>{t.requestAnother}</CorpButtonLink>:null}
 </>;
}

/* ---------- Fix my time (board E-CorrectionSheet) ---------- */

/** "9", "9:30", "930pm", "9:30 PM" or "21:30" to "HH:MM"; anything else is null. */
export function parseClock(text:string){
 const match=text.trim().toLowerCase().replace(/[\s.]+/g,'').match(/^(\d{1,2})(?::?(\d{2}))?(a|am|p|pm)?$/);if(!match)return null;
 let hour=Number(match[1]);const minute=match[2]?Number(match[2]):0,half=match[3];if(minute>59)return null;
 if(half){if(hour<1||hour>12)return null;hour=hour%12+(half.startsWith('p')?12:0);}else if(hour>23)return null;
 return String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');
}
/** A stored time in the field: "7:00 AM" (the one time format; 24:00 is "12:00 AM"). */
export function formatClock(value:string){return formatTime(value);}
function TimeInput({id,name,value,onValue,invalid,describedBy,placeholder}:{id:string;name:string;value:string;onValue:(value:string)=>void;invalid:boolean;describedBy?:string;placeholder:string}){
 // Spanish shows "7:00 a. m."; parseClock reads it back (spaces and dots are ignored).
 const lang=useMobileLang(),shownClock=(clock:string)=>timeText(formatClock(clock),lang);
 const [text,setText]=useState(()=>value?shownClock(value):''),[seen,setSeen]=useState(value);
 // A value set from outside (Use current times) replaces what is typed unless the typing already means it.
 if(value!==seen){setSeen(value);if((parseClock(text)??'')!==value)setText(value?shownClock(value):'');}
 return <input id={id} name={name} className="c-in" type="text" inputMode="text" autoComplete="off" spellCheck={false} placeholder={placeholder} value={text} aria-invalid={invalid||undefined} aria-describedby={describedBy}
  onChange={event=>{setText(event.target.value);onValue(parseClock(event.target.value)??'');}} onBlur={()=>{const parsed=parseClock(text);if(parsed)setText(shownClock(parsed));}}/>;
}
type Option={key:string;title:string;detail:string};
/** A fixed operation id for checking whether the draft is complete (the real submission makes its own). */
const PROBE_ID='00000000-0000-4000-8000-000000000000';
export function CorpFixTime({snapshot,basis,edit,draft,onDraft,operation,isActive,otherPending,onSubmit,onRetry,onReset,onRefresh,onEdit,cancel}:{snapshot:Extract<EmployeeTimeCorrections,{state:'ready'}>;basis:string;edit:string;draft:HoursDraft|undefined;onDraft:(draft:HoursDraft)=>void;operation:HoursCorrectionOperation;isActive:boolean;otherPending:boolean;onSubmit:(payload:HoursCorrectionPayload)=>void;onRetry:()=>void;onReset:()=>void;onRefresh:()=>void;onEdit:(edit:string)=>void;cancel:string}){
 useSyncExternalStore(operation.subscribe,operation.snapshot,operation.snapshot);
 const lang=useMobileLang(),t=hoursCorpCopy[lang].fix;
 const zone=snapshot.timeZone,info=resolveHoursEdit(snapshot,edit),readyDraft=draft??(info?initialHoursDraft(info,basis,zone,snapshot.locations):null);
 const [error,setError]=useState<{field:keyof HoursDraft;message:string}|null>(null),[blank,setBlank]=useState<(keyof HoursDraft)[]>([]),uid=useId(),errorId=uid+'error',formId=uid+'form',whatId=uid+'what',form=useRef<HTMLFormElement>(null),receipt=useRef<HTMLHeadingElement>(null),receiptB=useRef<HTMLHeadingElement>(null);
 const pending=operation.pending,uncertain=operation.uncertain,recorded=isActive&&operation.result?.status==='recorded',locked=pending||uncertain||recorded||otherPending,stale=!!readyDraft&&readyDraft.basis!==basis;
 // The receipt's heading takes focus: the phone screen's when it shows, else the corporate one.
 useEffect(()=>{if(recorded)(receiptB.current?.getClientRects().length?receiptB.current:receipt.current)?.focus();},[recorded]);
 if(recorded&&operation.result?.status==='recorded')return <>
  <FixRecordedB requestId={operation.result.requestId} onReset={onReset} heading={receiptB}/>
  <CorpHoursSheetHead cancel={cancel} cancelLabel={t.close}/>
  <CorpCard ariaLabel={t.result}><CorpBody>
   <div className="b-done-host--flush"><BState kind="done" heading titleRef={receipt} title={t.correctionSent} line={t.correctionLine} action={{label:t.viewRequest,href:'/app/my-time?view=corrections&requestId='+operation.result.requestId}}
    quiet={<button className="b-done__quiet" type="button" onClick={onReset}>{t.anotherCorrection}</button>}/></div>
  </CorpBody></CorpCard>
 </>;
 if(isActive&&(pending||uncertain))return <>
  <FixPendingB pending={pending} onRetry={onRetry}/>
  <CorpHoursSheetHead cancel={cancel}/>
  <CorpCard ariaLabel={t.status}><CorpBody>
   <h2 className="c-big">{pending?t.checkingRequest:t.checkEarlier}</h2>
   <span className="c-line2">{pending?t.checkingWhether:t.couldntConfirm}</span>
   {uncertain?<CorpButton kind="secondary" full onClick={onRetry}>{t.checkStatus}</CorpButton>:<span className="c-line3" role="status">{t.sendingRequest}</span>}
  </CorpBody></CorpCard>
 </>;
 if(!info||!readyDraft)return <><CorpHoursSheetHead cancel={cancel}/><CorpHoursUnavailable message={t.cantFix} onRefresh={onRefresh}/></>;
 const missing=info.kind==='MISSING_ENTRY',unconfirmed=!missing&&info.context.state!=='confirmed';
 const change=(patch:Partial<HoursDraft>)=>{setError(null);setBlank(current=>current.filter(field=>!(field in patch)));const next={...readyDraft,...patch};
  // One Day field: an end earlier than the start is the next morning (overnight on the start day).
  if('startDate' in patch||'startTime' in patch||'endTime' in patch)next.endDate=next.startDate&&next.startTime&&next.endTime&&next.endTime<next.startTime?addDays(next.startDate,1):next.startDate;
  onDraft(next);};
 // Review F2 (NV-112): pressing Send marks every empty field at once, each with its own message under it (the first is
 // focused); the first rule the proposal breaks keeps its own message as before.
 const BLANK:Partial<Record<keyof HoursDraft,string>>=t.blank;
 const ownError=(field:keyof HoursDraft)=>error?.field===field||(field==='endTime'&&error?.field==='endDate');
 const shown=(field:keyof HoursDraft)=>ownError(field)||blank.includes(field);
 const idFor=(field:keyof HoursDraft)=>ownError(field)?errorId:errorId+'-'+field;
 const attr=(field:keyof HoursDraft)=>({'aria-invalid':shown(field)||undefined,'aria-describedby':shown(field)?idFor(field):undefined});
 // Round 4: an error sits right under the field it names (the form-level line is only for anything else).
 const under=(field:keyof HoursDraft)=>ownError(field)?{error:message,errorId}:blank.includes(field)?{error:BLANK[field],errorId:idFor(field)}:{};
 const focus=(field:keyof HoursDraft|undefined)=>form.current?.querySelector<HTMLElement>('[name="'+(field==='endDate'?'endTime':field)+'"]')?.focus();
 // What to fix: a shift with no punches, the latest recorded days, and the breaks of the day being fixed.
 const key=(target:{kind:string;timeEntryId:string;breakEntryId:string|null})=>target.kind==='ENTRY_BOUNDARY'?'entry:'+target.timeEntryId:'break:'+target.timeEntryId+':'+target.breakEntryId;
 const days=snapshot.targets.filter(target=>target.kind==='ENTRY_BOUNDARY').sort((a,b)=>b.recordedStartAt.localeCompare(a.recordedStartAt));
 const picked=days.slice(0,3);const own=days.find(target=>target.timeEntryId===info.entryId);if(own&&!picked.includes(own))picked.push(own);
 const options:Option[]=[{key:edit.startsWith('missing:')?edit:'new',title:t.missedWhole,detail:edit.startsWith('missing:')?t.changeApproved:t.noClock}];
 for(const day of picked){options.push({key:key(day),title:dayMedium(dateKey(day.recordedStartAt,zone),lang),detail:clockRange(day.recordedStartAt,day.recordedEndAt,zone,lang)});
  if(day.timeEntryId===info.entryId)for(const item of snapshot.targets.filter(target=>target.kind==='BREAK_BOUNDARY'&&target.timeEntryId===info.entryId))options.push({key:key(item),title:t.breakWord,detail:clockRange(item.recordedStartAt,item.recordedEndAt,zone,lang)});}
 const today=dateKey(snapshot.observedAt,zone),dates=Array.from({length:31},(_,index)=>addDays(today,-index));
 if(readyDraft.startDate&&!dates.includes(readyDraft.startDate))dates.push(readyDraft.startDate);dates.sort((a,b)=>b.localeCompare(a));
 const recordedHelp=!missing&&info.recordedStartAt&&info.recordedEndAt?t.recorded(clockRange(info.recordedStartAt,info.recordedEndAt,zone,lang))+(info.context.state==='confirmed'&&info.context.sourceKind==='ADJUSTMENT'?t.now(clockRange(info.context.startAt,info.context.endAt,zone,lang)):'')
  :missing&&info.adjustmentId&&info.context.state==='confirmed'?t.approved(clockRange(info.context.startAt,info.context.endAt,zone,lang)):undefined;
 const feedback=isActive?operation.result:null;
 const message=error?.message.startsWith('The end must be after the start')?t.endAfterStart:error?(t.draftError(error.message)??error.message):undefined;
 const placed=!!error&&(['startDate','startTime','endTime','endDate','reason'].includes(error.field)||error.field==='locationId'&&missing);
 const disabled=locked||stale||unconfirmed||missing&&!snapshot.locations.length;
 // Upscale S14: Send stays grey (aria-disabled) until the proposal is complete; pressing it then says what is missing.
 const complete=!!buildHoursProposal(readyDraft,info,PROBE_ID,zone).payload&&(!missing||snapshot.locations.some(l=>l.id===readyDraft.locationId));
 return <>
  {/* Phones: the hero over one white card holding this same form (time.css), with Send at its foot; the sheet bar is hidden there. */}
  <HoursBScreen sub={options.length>1?null:edit==='new'?t.subMissed:t.subChange}/>
  <CorpHoursSheetHead cancel={cancel} send={<button type="submit" form={formId} disabled={disabled} aria-disabled={!disabled&&!complete?true:undefined}>{pending?t.sending:t.send}</button>}/>
  <div className="b-keep eb-fix">
  {stale?<div className="c-callout c-hours-stack" role="status" aria-label={t.changedLabel}><b>{t.changed}</b><span>{t.unsentKept}</span>
   <div className="c-btns"><CorpButton kind="secondary" size="sm" disabled={locked} onClick={()=>onDraft({...readyDraft,basis})}>{t.reviewUpdated}</CorpButton><CorpButton kind="secondary" size="sm" disabled={locked} onClick={()=>onDraft({...initialHoursDraft(info,basis,zone,snapshot.locations),reason:readyDraft.reason})}>{t.useCurrent}</CorpButton></div></div>:null}
  {unconfirmed?<div className="c-callout c-hours-stack" role="status"><span>{t.unconfirmed}</span><div className="c-btns"><CorpButton kind="secondary" size="sm" onClick={onRefresh}>{t.refresh}</CorpButton></div></div>:null}
  <form id={formId} className="c-form" ref={form} noValidate aria-busy={pending} aria-labelledby="hours-title" onSubmit={event=>{event.preventDefault();if(disabled)return;
   const empty=(['locationId','startDate','startTime','endTime','reason'] as const).filter(field=>(field!=='locationId'||missing)&&!readyDraft[field].trim());
   if(missing&&!snapshot.locations.some(l=>l.id===readyDraft.locationId)){setError({field:'locationId',message:t.chooseAvailable});setBlank(empty.filter(field=>field!=='locationId'));focus('locationId');return;}
   const result=buildHoursProposal(readyDraft,info,crypto.randomUUID(),zone);if(!result.payload){setError(result.error);setBlank(empty.filter(field=>field!==result.error?.field));focus(empty[0]??result.error?.field);return;}setError(null);setBlank([]);onSubmit(result.payload);}}>
   <fieldset className="c-hours-fieldset" disabled={locked}>
    <div className={options.length>1?'c-field':'c-field eb-fix-one'}><span className="c-field__label" id={whatId}>{t.whatToFix}</span>
     <div className="c-card c-hours-choices" role="radiogroup" aria-labelledby={whatId}>
      {options.map(option=><label key={option.key} className="c-row">
       <span className="c-row__main"><span className="c-row__title">{option.title}</span><span className="c-row__detail"><span>{option.detail}</span></span></span>
       <input className="c-hours-radio" type="radio" name="what" value={option.key} checked={option.key===edit} onChange={()=>{if(option.key!==edit)onEdit(option.key);}}/>
      </label>)}
     </div>
    </div>
    {missing?<CorpField label={t.location} htmlFor={uid+'location'} {...under('locationId')}><select id={uid+'location'} name="locationId" className="c-in" value={readyDraft.locationId} {...attr('locationId')} disabled={locked||!!info.adjustmentId} onChange={e=>change({locationId:e.target.value})}>
     <option value="">{t.chooseLocation}</option>{snapshot.locations.map(l=><option value={l.id} key={l.id}>{l.name}</option>)}</select></CorpField>:null}
    <CorpField label={t.day} htmlFor={uid+'day'} help={recordedHelp} {...under('startDate')}><select id={uid+'day'} name="startDate" className="c-in" value={readyDraft.startDate} {...attr('startDate')} onChange={e=>change({startDate:e.target.value})}>
     {readyDraft.startDate?null:<option value="">{t.chooseDay}</option>}{dates.map(date=><option key={date} value={date}>{date===today?t.today(dayMedium(date,lang).split(', ')[1]):dayMedium(date,lang)}</option>)}</select></CorpField>
    <div className="c-field__row">
     <CorpField label={t.start} htmlFor={uid+'start'} {...under('startTime')}><TimeInput id={uid+'start'} name="startTime" placeholder={t.choose} value={readyDraft.startTime} invalid={shown('startTime')} describedBy={shown('startTime')?idFor('startTime'):undefined} onValue={value=>change({startTime:value})}/></CorpField>
     <CorpField label={t.end} htmlFor={uid+'end'} {...under('endTime')}><TimeInput id={uid+'end'} name="endTime" placeholder={t.choose} value={readyDraft.endTime} invalid={shown('endTime')} describedBy={shown('endTime')?idFor('endTime'):undefined} onValue={value=>change({endTime:value})}/></CorpField>
    </div>
    <CorpField label={t.note} htmlFor={uid+'note'} {...under('reason')}><textarea id={uid+'note'} name="reason" className="c-in" rows={3} maxLength={500} value={readyDraft.reason} {...attr('reason')} onChange={e=>change({reason:e.target.value})}/></CorpField>
   </fieldset>
   {error&&!placed?<p className="c-error" id={errorId} role="alert">{message}</p>:null}
   {pending?<p className="c-note" role="status"><span>{t.sendingRequest}</span></p>:isActive&&uncertain?<div className="c-callout c-hours-stack" role="status"><span>{t.couldntConfirm}</span><div className="c-btns"><CorpButton kind="secondary" size="sm" onClick={onRetry}>{t.checkStatus}</CorpButton></div></div>
    :feedback&&feedback.status!=='recorded'?<p className="c-callout" role="status">{feedback.status==='blocked'?t.blocked[feedback.reason]:feedback.status==='conflict'?t.conflict:feedback.status==='denied'?t.denied:t.checkFields}</p>:null}
   <button type="submit" className="eb-fix-send" disabled={disabled} aria-disabled={!disabled&&!complete?true:undefined}>{pending?t.sending:t.send}</button>
   <CorpNote>{t.reviewsIt}</CorpNote>
  </form>
  </div>
 </>;
}
