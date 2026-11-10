'use client';
import Link from 'next/link';
import {useState,type ReactNode} from 'react';
import type {OperationalAuthorityView,OperationalDirectoryData,OperationalScheduleData,OperationalShiftEditorData} from '@/lib/company-access/model';
import {employeeInitials,employeeRoleLabel} from '@/lib/employee-display';
import {addDays,formatDayLabel,formatTime,formatWeekRange,weekDates} from '@/lib/date-utils';
import {ManagerClockMonitor} from '@/components/manager-clock-monitor';
import {NavIcon} from '@/components/nav-icon';
import {SelectField} from '@/components/select-field';
import {ScopedReadFrame,type ScopedObservation} from './scoped-read-frame';
import styles from './company-access.module.css';
import {QuietHeader,QuietPage} from '@/components/quiet/quiet';

const scheduleStatusLabels:Record<OperationalScheduleData['shifts'][number]['scheduleStatus'],string>={DRAFT:'Draft',PUBLISHED:'Published',ARCHIVED:'Archived'};

export function ScopedEmployeeDirectory({data,observation}:{data:Extract<OperationalDirectoryData,{mode:'LOCATIONS'}>;observation:ScopedObservation}){
 return <ScopedDirectory key={observation.authority} data={data} observation={observation}/>;
}
function ScopedDirectory({data,observation}:{data:Extract<OperationalDirectoryData,{mode:'LOCATIONS'}>;observation:ScopedObservation}){
 const [query,setQuery]=useState('');const normalized=query.trim().toLocaleLowerCase();
 const people=data.employees.filter(p=>`${p.firstName} ${p.lastName} ${p.id}`.toLocaleLowerCase().includes(normalized));
 return <div className={styles.scopedPage}><header><h1>Team at your locations</h1><p>Review the people eligible at the locations you manage. Contact details and employee changes require company-wide access.</p></header><ScopedReadFrame observation={observation}>
  <p className="muted">{data.locations.map(l=>l.name).join(' · ')}</p>
  <label className={styles.search}>Find a team member<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search name or employee ID"/></label>
  <section className={'panel '+styles.stack} aria-label="Team members">
   <p>{people.length} {people.length===1?'person':'people'} shown in your managed locations</p>
   {people.length?people.map(person=><article key={person.id} className={styles.rosterRow}><span className={styles.avatar} aria-hidden="true">{employeeInitials(person.firstName,person.lastName)}</span><div><h2>{person.firstName} {person.lastName}</h2><p>{employeeRoleLabel(person.role)} · {person.id}</p><small>{person.locationIds.map(id=>data.locations.find(l=>l.id===id)?.name).filter(Boolean).join(' · ')}</small></div></article>):<div role="status"><h2>{query?'No matching team members':'No team members in this view'}</h2><p>{query?'Try another name or clear the search.':'There are no eligible team members in the current managed-location view.'}</p>{query&&<button className="button secondary" type="button" onClick={()=>setQuery('')}>Clear search</button>}</div>}
  </section>
 </ScopedReadFrame></div>;
}

export function ScopedManagementHome({view}:{view:Extract<OperationalAuthorityView,{state:'ready'}>}){
 // v5 (mockup M01 family): a Manager with no assigned access gets one calm Quiet page; same words, same frame.
 if(view.scope?.mode!=='LOCATIONS')return <QuietPage className="q-unavailable"><ScopedReadFrame observation={view}>
  <div className="q-top-gap" aria-hidden="true"/>
  <QuietHeader title="No access yet" sub="Management access is not assigned"/>
  <p className="q-body q-noaccess">Ask an Owner to give you locations to manage. Everything else is still in the menu.</p>
  <Link className="q-btn q-btn--sec" href="/app/profile">Your profile</Link>
 </ScopedReadFrame></QuietPage>;
 return <div className={styles.scopedPage}><header><h1>Home</h1><p>Your locations</p></header><ScopedReadFrame observation={view}>
  {view.scope?.mode==='LOCATIONS'?<><section className={'panel '+styles.stack}><h2>Your managed locations</h2><p>{view.locations.map(l=>l.name).join(' · ')}</p><div className={styles.actions}><Link className="button primary" href="/app/schedule"><NavIcon name="schedule"/>View schedule</Link><Link className="button secondary" href="/app/employees"><NavIcon name="employees"/>View team</Link></div><p className="muted">Company-wide totals and management changes require company-wide access. Your other authorized tools remain in navigation.</p></section><ManagerClockMonitor/></>:<section className={'panel '+styles.stack}><h2>Management access is not assigned</h2><p>Ask an Owner to assign the company or locations you can manage. Your other authorized tools remain in navigation.</p><Link className="button secondary" href="/app/profile">Your profile</Link></section>}
 </ScopedReadFrame></div>;
}

export function ScopedOperationalSchedule({data,observation,feedback}:{data:OperationalScheduleData;observation:ScopedObservation;feedback?:ReactNode}){
 const query=(week:string)=>'/app/schedule?'+new URLSearchParams({week,...(data.selectedLocationId?{location:data.selectedLocationId}:{})});
 const create='/app/schedule/new?'+new URLSearchParams({week:data.weekStart,...(data.selectedLocationId?{locationId:data.selectedLocationId}:{})});
 return <div className={styles.scopedPage}><header><h1>Weekly schedule</h1><p>Manage draft shifts at your locations. Publishing and protected shift changes require company-wide access.</p></header><ScopedReadFrame observation={observation}>
  {feedback}<div className={styles.actions}><Link className="button primary" href={create}><NavIcon name="shift"/>Add shift</Link></div>
  <nav className={styles.weekNavigation} aria-label="Schedule week"><Link className="button secondary" href={query(addDays(data.weekStart,-7))} aria-label="Previous week"><NavIcon name="chevronRight" className={styles.previousIcon}/></Link><strong>{formatWeekRange(data.weekStart)}</strong><Link className="button secondary" href={query(addDays(data.weekStart,7))} aria-label="Next week"><NavIcon name="chevronRight"/></Link></nav>
  <form method="get" action="/app/schedule" className={styles.actions}><input type="hidden" name="week" value={data.weekStart}/><SelectField className={styles.search} label="Location" name="location" defaultValue={data.selectedLocationId??'all'} options={[{value:'all',label:'All your managed locations'},...data.locations.map(l=>({value:l.id,label:l.name}))]}/><button className="button secondary" type="submit">Show schedule</button></form>
  <div className={styles.scopeDays}>{weekDates(data.weekStart).map(date=>{const shifts=data.shifts.filter(s=>s.date===date);const day=formatDayLabel(date);return <section className={'panel '+styles.stack} key={date}><h2>{day.weekday}, {day.day}</h2>{shifts.length?shifts.map(shift=><article className={styles.shiftRow} key={shift.id}><div><h3><Link className={styles.shiftLink} href={'/app/schedule/edit?'+new URLSearchParams({shiftId:shift.id})} aria-label={`View shift for ${shift.employeeName} on ${day.weekday}, ${day.day}`}>{shift.employeeName}<NavIcon name="arrowRight" size={16}/></Link></h3><p>{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</p><small>{data.locations.find(l=>l.id===shift.locationId)?.name??'Location unavailable'} · {shift.positionName??'No position specified'}</small></div><span className="status-pill neutral">{scheduleStatusLabels[shift.scheduleStatus]}{shift.isCalloutApproved?' · Call-out approved':''}</span></article>):<p className="muted">No shifts in this managed-location view.</p>}</section>;})}</div>
  <section className={'panel '+styles.stack}><h2>Scheduled within your managed locations</h2><p className="muted">These recorded minutes cover your managed locations, rather than company-wide employee totals.</p>{data.roster.length?data.roster.map(person=><div className={styles.rosterRow} key={person.id}><strong>{person.firstName} {person.lastName}</strong><span className={styles.recordedMinutes}>{Math.floor(person.scheduledMinutesInScope/60)}h {person.scheduledMinutesInScope%60}m</span></div>):<p>No team members in the current managed-location view.</p>}</section>
 </ScopedReadFrame></div>;
}

export function ScopedShiftReadOnly({data,observation,feedback}:{data:OperationalShiftEditorData;observation:ScopedObservation;feedback?:ReactNode}){
 const unavailable=data.saveAvailability==='unavailable';
 const shift=data.shift,back='/app/schedule?'+new URLSearchParams({week:data.weekStart,location:data.locationId});
 return <div className={styles.scopedPage}><header><h1>{shift?'Shift details':unavailable?'Shift changes unavailable':'Shift changes require company-wide access'}</h1><p>{unavailable?'Changes are currently unavailable. Review these details or return to the schedule.':'Changing this shift requires company-wide access. You can review its recorded details here.'}</p></header><ScopedReadFrame observation={observation}>{feedback}{shift&&<section className={'panel '+styles.stack}><h2>{shift.employeeName}</h2><p>{formatDayLabel(shift.date).weekday}, {formatDayLabel(shift.date).day}</p><p>{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</p><p>{data.positionOptions.find(p=>p.id===shift.positionId)?.name??(shift.positionId?'Assigned position unavailable':'No position specified')}</p>{shift.notes&&<p>{shift.notes}</p>}</section>}<Link className="button secondary" href={back}>Back to schedule</Link></ScopedReadFrame></div>;
}
