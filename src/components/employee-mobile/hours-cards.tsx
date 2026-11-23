'use client';
import {dateRange} from '@/lib/duration-format';
import Link from 'next/link';
import {useId,useRef,useState} from 'react';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {parsePeriod,type Period,type TimecardIssue} from '@/lib/timecards/project';
import type {TimecardsResult} from '@/lib/timecards/read-model';
import {formatRecordedDuration} from '@/lib/employee-time';
import {HoursUnavailable,hoursStamp,hoursDay} from './hours-records';
import {useMobileLang} from './mobile-lang';
import {LOCALE,instantDateText,instantText} from './mobile-format';
import {hoursCardsCopy} from './copy/hours-cards';
const duration=(nanos:string)=>formatRecordedDuration(Number(BigInt(nanos)/BigInt(1000000000)));
export function HoursCardsView({data,period,onPeriod,onRefresh}:{data:TimecardsResult;period:Period;onPeriod:(period:Period)=>void;onRefresh:()=>void}){
 const [start,setStart]=useState(period.startDate),[end,setEnd]=useState(period.endDate),[error,setError]=useState<{field:'start'|'end';message:string}|null>(null),errorId=useId(),form=useRef<HTMLFormElement>(null);
 const item=data.state==='ready'?data.cards[0]:null,card=item?.card;
 const lang=useMobileLang(),t=hoursCardsCopy[lang],issues:Record<TimecardIssue,string>=t.issues,states=t.states;
 // Spanish: "26 oct, 7:59 a. m." and "lun, 26 oct"; English keeps hours-records' formats.
 const stamp=(at:string,zone:string)=>lang==='en'?hoursStamp(at,zone):`${instantDateText(at,lang,{timeZone:zone,month:'short',day:'numeric'})}, ${instantText(at,lang,zone)}`;
 const day=(at:string,zone:string)=>lang==='en'?hoursDay(at,zone):instantDateText(at,lang,{timeZone:zone,weekday:'short',month:'short',day:'numeric'});
 return <>
  <form className="em-hours-form" ref={form} noValidate onSubmit={event=>{event.preventDefault();try{onPeriod(parsePeriod(start,end));setError(null);}catch{const field=!/^\d{4}-\d{2}-\d{2}$/.test(start)?'start':'end';setError({field,message:t.invalidPeriod});form.current?.querySelector<HTMLElement>('[name="'+field+'"]')?.focus();}}}>
   <div className="em-hours-pair"><label>{t.startDate}<input type="date" name="start" value={start} onChange={e=>{setStart(e.target.value);setError(null);}} aria-invalid={error?.field==='start'||undefined} aria-describedby={error?.field==='start'?errorId:undefined}/></label><label>{t.endDate}<input type="date" name="end" value={end} onChange={e=>{setEnd(e.target.value);setError(null);}} aria-invalid={error?.field==='end'||undefined} aria-describedby={error?.field==='end'?errorId:undefined}/></label></div>
   {error?<p id={errorId} role="alert" className="em-hours-error">{error.message}</p>:null}<button className="em-request-secondary" type="submit">{t.viewPeriod}</button>
  </form>
  {data.state!=='ready'?<HoursUnavailable message={t.unavailable} onRefresh={onRefresh}/>:!item||!card?<p className="em-request-notice" role="status">{t.noCard}</p>:<>
   <section className="em-response-status" aria-label={t.status}><strong>{states[item.state]}</strong><span>{dateRange(card.startDate,card.endDate,lang==='en'?{year:'end'}:{year:'end',locale:LOCALE[lang]})}</span>{item.state==='FINALIZED'?<span>{t.finalized}</span>:null}</section>
   <section><h2>{t.hoursInPeriod}</h2><dl className="em-hours-facts"><div><dt>{t.effective}</dt><dd>{duration(card.recordedNanoseconds)}</dd></div><div><dt>{t.breaks}</dt><dd>{duration(card.breakNanoseconds)}</dd></div></dl><p className="em-hours-help">{t.effectiveHelp}</p></section>
   {card.issues.length?<section className="em-request-notice" aria-label={t.periodInfo}><h2>{card.issues.every(i=>i==='period_open')?t.periodInProgress:t.aboutHours}</h2>{card.issues.length===1?<p>{issues[card.issues[0]]}</p>:<ul className="em-hours-issues">{card.issues.map(issue=><li key={issue}>{issues[issue]}</li>)}</ul>}<Link className="em-request-text" href="/app/my-time?view=corrections">{t.reviewCorrections}</Link></section>:null}
   <section><h2>{t.timeEntries}</h2>{card.entries.length?<div className="em-hours-disclosures">{card.entries.map(entry=><details className="em-hours-disclosure" key={entry.id}><summary><span><strong>{day(entry.startAt,card.timeZone)}</strong><small>{entry.locationName} · {entry.positionName??t.recordedTime}</small><small>{stamp(entry.startAt,card.timeZone)} – {entry.endAt?stamp(entry.endAt,card.timeZone):t.inProgress}</small></span><CaretDownIcon size={20} weight="bold" aria-hidden="true"/></summary><div className="em-hours-disclosure-body"><h3>{t.currentEffective}</h3><p>{stamp(entry.startAt,card.timeZone)} – {entry.endAt?stamp(entry.endAt,card.timeZone):t.inProgress}</p>{entry.adjustmentId?<p className="em-hours-help">{t.adjustmentIncluded}</p>:null}<h3>{t.originalPunches}</h3><p>{entry.rawStartAt?stamp(entry.rawStartAt,card.timeZone)+(entry.rawEndAt?' – '+stamp(entry.rawEndAt,card.timeZone):t.noClockOut):t.approvedMissing}</p>{entry.breaks.length?<><h3>{t.breaksHeading}</h3><dl className="em-hours-facts">{entry.breaks.map(b=><div key={b.id}><dt>{b.name}</dt><dd>{stamp(b.startAt,card.timeZone)} – {b.endAt?stamp(b.endAt,card.timeZone):t.inProgress}{b.adjustmentId?<small>{t.original}{stamp(b.rawStartAt,card.timeZone)} – {b.rawEndAt?stamp(b.rawEndAt,card.timeZone):t.inProgress}</small>:null}</dd></div>)}</dl></>:null}{entry.rawStartAt&&entry.rawEndAt?<Link className="em-request-text" href={'/app/my-time?view=corrections&edit='+encodeURIComponent('entry:'+entry.id)+'&from=cards&start='+period.startDate+'&end='+period.endDate}>{t.requestCorrection}</Link>:null}</div></details>)}</div>:<p className="em-request-notice">{t.noEntries}</p>}</section>
   <details className="em-hours-disclosure em-hours-history"><summary><span><strong>{t.history}</strong><small>{t.historySub}</small></span><CaretDownIcon size={20} weight="bold" aria-hidden="true"/></summary><div className="em-hours-disclosure-body">{item.history.length?<ol className="em-hours-history-list">{item.history.map(h=><li key={h.operationId}><strong>{t.historyBy(h.action,h.actorName)}</strong><time>{stamp(h.occurredAt,h.snapshot.timeZone)}</time>{h.note?<p>{h.note}</p>:null}</li>)}</ol>:<p className="em-hours-help">{t.noHistory}</p>}</div></details>
   <p className="em-hours-help">{t.timesIn(card.timeZone)}</p>
  </>}
 </>;
}
