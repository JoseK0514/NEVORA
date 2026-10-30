'use client';
import {timeZoneLabel} from '@/lib/time-zone-label';
import Link from 'next/link';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {formatRecordedDuration,type EmployeeTime,type EmployeeTimeEntry} from '@/lib/employee-time';
import {CorpBody,CorpButtonLink,CorpCard,CorpNote,CorpPill,CorpRow,CorpRows,CorpStats} from '../corp/corp';
export const hoursStamp=(at:string,zone:string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(at));
export const hoursDay=(at:string,zone:string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',month:'short',day:'numeric'}).format(new Date(at));
export function HoursUnavailable({message,onRefresh}:{message:string;onRefresh:()=>void}){return <section className="em-request-notice" role="status"><p>{message}</p><button className="em-request-secondary" type="button" onClick={onRefresh}>Try again</button></section>;}
function RecordRow({entry,zone}:{entry:EmployeeTimeEntry;zone:string}){return <li><Link id={'hours-entry-'+entry.id} className="em-request-entry" href={'/app/my-time?entry='+encodeURIComponent(entry.id)}><span><strong>{hoursDay(entry.clockInAt,zone)}</strong><small>{hoursStamp(entry.clockInAt,zone)} – {entry.clockOutAt?hoursStamp(entry.clockOutAt,zone):'In progress'}</small><small>{entry.locationName} · {formatRecordedDuration(entry.elapsedSeconds)} elapsed</small></span><CaretRightIcon size={20} aria-hidden="true"/></Link></li>;}
const clockAt=(at:string,zone:string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit'}).format(new Date(at));
/** Corporate (Release 1, board G-E-Time): right now, today, then earlier entries, on the kit. The same read and links;
 * clocking in, breaks and clocking out stay on the location's tablet. */
function CorpRecords({data}:{data:Extract<EmployeeTime,{state:'ready'}>}){
 const zone=data.timeZone,current=data.current,day=(at:string)=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',day:'numeric'}).formatToParts(new Date(at));return `${parts.find(p=>p.type==='weekday')?.value} ${parts.find(p=>p.type==='day')?.value}`;};
 const row=(entry:EmployeeTimeEntry,lead:boolean)=><li key={entry.id}><CorpRow id={'hours-entry-'+entry.id} href={'/app/my-time?entry='+encodeURIComponent(entry.id)} lead={lead?day(entry.clockInAt):undefined}
  title={`${clockAt(entry.clockInAt,zone)} – ${entry.clockOutAt?clockAt(entry.clockOutAt,zone):'now'}`} detail={entry.locationName} value={formatRecordedDuration(entry.elapsedSeconds)}/></li>;
 return <div className="c-page c-embed">
  <CorpCard label="Right now" aside={current?current.state==='ON_BREAK'?<CorpPill tone="amber">On break</CorpPill>:<CorpPill tone="teal" dot>On the clock</CorpPill>:<CorpPill>Off the clock</CorpPill>}>
   <CorpBody><b className="c-big">{current?current.state==='ON_BREAK'?'On a break':`Clocked in at ${clockAt(current.clockInAt,zone)}`:'Not clocked in'}</b>
    <span className="em-hours-where">{current?`${current.locationName} · ${formatRecordedDuration(current.elapsedSeconds)} so far`:'No open time entry at the last check.'}</span>
    {current?<CorpButtonLink href={'/app/my-time?entry='+encodeURIComponent(current.id)} kind="secondary" size="md" full>View this entry</CorpButtonLink>:null}
    <CorpNote center>Clock in, take breaks and clock out on your location’s tablet.</CorpNote></CorpBody>
  </CorpCard>
  <CorpCard label={`Today · ${new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(data.date+'T12:00:00Z'))}`}>
   <CorpStats items={[{label:'Recorded time',value:formatRecordedDuration(data.today.recordedSeconds)},{label:'Breaks',value:formatRecordedDuration(data.today.breakSeconds)}]}/>
   {data.today.entries.length?<CorpRows>{data.today.entries.map(entry=>row(entry,false))}</CorpRows>:null}
  </CorpCard>
  <CorpCard label="Earlier">
   <CorpRows>
    {data.recent.entries.map(entry=>row(entry,true))}
    {data.recent.entries.length?null:<li><CorpRow title="No earlier entries" one/></li>}
    <li><CorpRow href="/app/my-time?view=corrections&edit=new" title={<span className="c-link c-link--l">Fix a missed punch</span>} one/></li>
    <li><CorpRow href="/app/my-time?view=corrections" title="Your corrections" one/></li>
   </CorpRows>
  </CorpCard>
  {data.recent.entries.length<data.recent.total?<CorpNote>Showing {data.recent.entries.length} of {data.recent.total} earlier entries. Past timecards has older weeks.</CorpNote>:null}
  <CorpNote>Recorded time includes breaks. Your timecard shows paid hours. Checked {hoursStamp(data.observedAt,zone)} · {timeZoneLabel(zone)}.</CorpNote>
 </div>;
}
export function HoursRecordsView({data,entryId,onRefresh,corporate=false}:{data:EmployeeTime;entryId:string|null;onRefresh:()=>void;corporate?:boolean}){
 if(data.state!=='ready')return <HoursUnavailable message={data.reason==='not_configured'?'Recorded time isn’t available for this account.':data.reason==='schema_missing'?'Recorded time isn’t available yet.':'Your recorded time couldn’t be checked.'} onRefresh={onRefresh}/>;
 const entries=[...data.today.entries,...data.recent.entries],entry=entryId?entries.find(r=>r.id===entryId):null;
 if(entryId)return entry?<>
  <section className="em-response-status" aria-label="Entry status"><strong>{entry.clockOutAt?'Completed entry':entry.state==='ON_BREAK'?'On break':'Clocked in'}</strong><span>{entry.locationName}</span><span>{formatRecordedDuration(entry.elapsedSeconds)} elapsed · {formatRecordedDuration(entry.breakSeconds)} breaks</span></section>
  <section><h2>Recorded punches</h2><dl className="em-hours-facts"><div><dt>Clock in</dt><dd>{hoursStamp(entry.clockInAt,data.timeZone)}</dd></div>{entry.breaks.map(b=><div key={b.id}><dt>{b.name??'Recorded break'}</dt><dd>{hoursStamp(b.startAt,data.timeZone)} – {b.endAt?hoursStamp(b.endAt,data.timeZone):'In progress'}<small>{formatRecordedDuration(b.elapsedSeconds)} recorded break</small></dd></div>)}<div><dt>Clock out</dt><dd>{entry.clockOutAt?hoursStamp(entry.clockOutAt,data.timeZone):'Not recorded yet'}</dd></div></dl></section>
  <p className="em-hours-help">These are the original Clocker records. Approved adjustments appear in your timecard.</p>
  {entry.clockOutAt?<Link className="em-request-primary" href={'/app/my-time?view=corrections&edit='+encodeURIComponent('entry:'+entry.id)}>Request a correction</Link>:<p className="em-request-notice" role="status">Finish this entry on your location’s Clocker before requesting a correction.</p>}
  <Link className="em-request-secondary" href="/app/my-time?view=cards">View my timecard</Link><p className="em-hours-help">Times in {timeZoneLabel(data.timeZone)}.</p>
 </>:<HoursUnavailable message="This entry isn’t in your current recorded-time view. Review your timecard for older dates." onRefresh={onRefresh}/>;
 if(corporate)return <CorpRecords data={data}/>;
 const current=data.current,clock=current?.state==='ON_BREAK'?'On break':current?'Clocked in':'Off clock';
 return <>
  <section className="em-hours-today" aria-label="Today’s clock status"><div className="em-hours-today-heading"><ClockIcon size={22} aria-hidden="true"/><strong>{new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'long',month:'short',day:'numeric'}).format(new Date(data.date+'T12:00:00Z'))}</strong></div><h2>{clock}</h2><p>{current?current.locationName+' · Since '+hoursStamp(current.clockInAt,data.timeZone):'No open time entry was recorded at the last check.'}</p><p>Use your location’s Clocker to clock in, out or record a break.</p>{current?<Link className="em-request-text" href={'/app/my-time?entry='+encodeURIComponent(current.id)}>View current entry<CaretRightIcon size={18} aria-hidden="true"/></Link>:null}</section>
  <section><h2>Today’s recorded time</h2><dl className="em-hours-facts"><div><dt>Elapsed time</dt><dd>{formatRecordedDuration(data.today.recordedSeconds)}</dd></div><div><dt>Breaks</dt><dd>{formatRecordedDuration(data.today.breakSeconds)}</dd></div></dl><p className="em-hours-help">Elapsed time includes breaks. These are recorded intervals, not payroll totals.</p></section>
  <section><h2>Today’s entries</h2>{data.today.entries.length?<ul className="em-request-list">{data.today.entries.map(r=><RecordRow key={r.id} entry={r} zone={data.timeZone}/>)}</ul>:<p className="em-request-notice">No recorded punches today. Use your location’s Clocker when you start work.</p>}</section>
  <section><h2>Earlier entries</h2>{data.recent.entries.length?<><ul className="em-request-list">{data.recent.entries.map(r=><RecordRow key={r.id} entry={r} zone={data.timeZone}/>)}</ul>{data.recent.entries.length<data.recent.total?<p className="em-hours-help">Showing {data.recent.entries.length} of {data.recent.total} earlier entries, most recent first. Choose a timecard period to review older hours.</p>:null}</>:<p className="em-request-notice">No earlier entries recorded.</p>}</section>
  <Link className="em-request-secondary" href="/app/my-time?view=cards">View my timecards</Link><p className="em-hours-help">Checked {hoursStamp(data.observedAt,data.timeZone)} · {timeZoneLabel(data.timeZone)}</p>
 </>;
}
