'use client';
import Link from 'next/link';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {formatRecordedDuration,type EmployeeTime,type EmployeeTimeEntry} from '@/lib/employee-time';
import {useMobileCopy,useMobileLang} from './mobile-lang';
import {dateText,instantDateText,instantText,type MobileLang} from './mobile-format';
import {hoursRecordsCopy} from './copy/hours-records';
import { RetryButton } from "@/components/kit/retry-button";
/** "Oct 27, 9:00 AM" · "27 oct, 9:00 a. m." */
export const hoursStamp=(at:string,zone:string,lang:MobileLang='en')=>lang==='en'?new Intl.DateTimeFormat('en-US',{timeZone:zone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(at)):`${instantDateText(at,lang,{timeZone:zone,month:'short',day:'numeric'})}, ${instantText(at,lang,zone)}`;
/** "Tue, Oct 27" · "mar, 27 oct" */
export const hoursDay=(at:string,zone:string,lang:MobileLang='en')=>lang==='en'?new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',month:'short',day:'numeric'}).format(new Date(at)):instantDateText(at,lang,{timeZone:zone,weekday:'short',month:'short',day:'numeric'});
export function HoursUnavailable({message,onRefresh}:{message:string;onRefresh:()=>void}){const t=useMobileCopy(hoursRecordsCopy);return <section className="em-request-notice" role="status"><p>{message}</p><RetryButton className="em-request-secondary" onClick={onRefresh}>{t.tryAgain}</RetryButton></section>;}
function RecordRow({entry,zone}:{entry:EmployeeTimeEntry;zone:string}){const lang=useMobileLang(),t=hoursRecordsCopy[lang];return <li><Link id={'hours-entry-'+entry.id} className="em-request-entry" href={'/app/my-time?entry='+encodeURIComponent(entry.id)}><span><strong>{hoursDay(entry.clockInAt,zone,lang)}</strong><small>{hoursStamp(entry.clockInAt,zone,lang)} – {entry.clockOutAt?hoursStamp(entry.clockOutAt,zone,lang):t.inProgress}</small><small>{entry.locationName} · {t.elapsed(formatRecordedDuration(entry.elapsedSeconds))}</small></span><CaretRightIcon size={20} weight="bold" aria-hidden="true"/></Link></li>;}
/** The older Hours view (a Lead's own time). An Employee's Time is on the kit in hours-corp.tsx. */
export function HoursRecordsView({data,entryId,onRefresh}:{data:EmployeeTime;entryId:string|null;onRefresh:()=>void;corporate?:boolean}){
 const lang=useMobileLang(),t=hoursRecordsCopy[lang],zone=data.state==='ready'?data.timeZone:'UTC';
 if(data.state!=='ready')return <HoursUnavailable message={data.reason==='not_configured'?t.notConfigured:data.reason==='schema_missing'?t.schemaMissing:t.readFailed} onRefresh={onRefresh}/>;
 const entries=[...data.today.entries,...data.recent.entries],entry=entryId?entries.find(r=>r.id===entryId):null;
 if(entryId)return entry?<>
  <section className="em-response-status" aria-label={t.entryStatus}><strong>{entry.clockOutAt?t.completed:entry.state==='ON_BREAK'?t.onBreak:t.clockedIn}</strong><span>{entry.locationName}</span><span>{t.elapsedBreaks(formatRecordedDuration(entry.elapsedSeconds),formatRecordedDuration(entry.breakSeconds))}</span></section>
  <section><h2>{t.recordedPunches}</h2><dl className="em-hours-facts"><div><dt>{t.clockIn}</dt><dd>{hoursStamp(entry.clockInAt,zone,lang)}</dd></div>{entry.breaks.map(b=><div key={b.id}><dt>{b.name??t.recordedBreak}</dt><dd>{hoursStamp(b.startAt,zone,lang)} – {b.endAt?hoursStamp(b.endAt,zone,lang):t.inProgress}<small>{t.breakRecorded(formatRecordedDuration(b.elapsedSeconds))}</small></dd></div>)}<div><dt>{t.clockOut}</dt><dd>{entry.clockOutAt?hoursStamp(entry.clockOutAt,zone,lang):t.notRecordedYet}</dd></div></dl></section>
  <p className="em-hours-help">{t.originalRecords}</p>
  {entry.clockOutAt?<Link className="em-request-primary" href={'/app/my-time?view=corrections&edit='+encodeURIComponent('entry:'+entry.id)}>{t.requestCorrection}</Link>:<p className="em-request-notice" role="status">{t.finishFirst}</p>}
  <Link className="em-request-secondary" href="/app/my-time?view=cards">{t.viewTimecard}</Link><p className="em-hours-help">{t.timesIn(zone)}</p>
 </>:<HoursUnavailable message={t.entryMissing} onRefresh={onRefresh}/>;
 const current=data.current,clock=current?.state==='ON_BREAK'?t.onBreak:current?t.clockedIn:t.offClock;
 return <>
  <section className="em-hours-today" aria-label={t.todayStatus}><div className="em-hours-today-heading"><ClockIcon size={22} weight="bold" aria-hidden="true"/><strong>{lang==='en'?new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'long',month:'short',day:'numeric'}).format(new Date(data.date+'T12:00:00Z')):dateText(data.date,lang,{weekday:'long',month:'short',day:'numeric'})}</strong></div><h2>{clock}</h2><p>{current?t.since(current.locationName,hoursStamp(current.clockInAt,zone,lang)):t.noOpenEntry}</p><p>{t.useClocker}</p>{current?<Link className="em-request-text" href={'/app/my-time?entry='+encodeURIComponent(current.id)}>{t.viewCurrent}<CaretRightIcon size={18} weight="bold" aria-hidden="true"/></Link>:null}</section>
  <section><h2>{t.todayRecorded}</h2><dl className="em-hours-facts"><div><dt>{t.elapsedTime}</dt><dd>{formatRecordedDuration(data.today.recordedSeconds)}</dd></div><div><dt>{t.breaks}</dt><dd>{formatRecordedDuration(data.today.breakSeconds)}</dd></div></dl><p className="em-hours-help">{t.elapsedHelp}</p></section>
  <section><h2>{t.todayEntries}</h2>{data.today.entries.length?<ul className="em-request-list">{data.today.entries.map(r=><RecordRow key={r.id} entry={r} zone={data.timeZone}/>)}</ul>:<p className="em-request-notice">{t.noPunchesToday}</p>}</section>
  <section><h2>{t.earlierEntries}</h2>{data.recent.entries.length?<><ul className="em-request-list">{data.recent.entries.map(r=><RecordRow key={r.id} entry={r} zone={data.timeZone}/>)}</ul>{data.recent.entries.length<data.recent.total?<p className="em-hours-help">{t.showing(data.recent.entries.length,data.recent.total)}</p>:null}</>:<p className="em-request-notice">{t.noEarlier}</p>}</section>
  <Link className="em-request-secondary" href="/app/my-time?view=cards">{t.viewTimecards}</Link>
 </>;
}
