'use client';
import Link from 'next/link';
import type {ReactNode} from 'react';
import type {OperationalAuthorityView,OperationalShiftEditorData} from '@/lib/company-access/model';
import {formatDayLabel,formatTime} from '@/lib/date-utils';
import {ManagerClockMonitor} from '@/components/manager-clock-monitor';
import {NavIcon} from '@/components/nav-icon';
import {RootChrome} from '@/components/root-chrome';
import {ScopedReadFrame,type ScopedObservation} from './scoped-read-frame';
import styles from './company-access.module.css';
import {QuietHeader,QuietPage} from '@/components/quiet/quiet';


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

export function ScopedShiftReadOnly({data,observation,feedback}:{data:OperationalShiftEditorData;observation:ScopedObservation;feedback?:ReactNode}){
 const unavailable=data.saveAvailability==='unavailable';
 const shift=data.shift,back='/app/schedule?'+new URLSearchParams({week:data.weekStart,location:data.locationId});
 return <div className={styles.scopedPage}><RootChrome/><header><h1>{shift?'Shift details':unavailable?'Shift changes unavailable':'Shift changes require company-wide access'}</h1><p>{unavailable?'Changes are currently unavailable. Review these details or return to the schedule.':'Changing this shift requires company-wide access. You can review its recorded details here.'}</p></header><ScopedReadFrame observation={observation}>{feedback}{shift&&<section className={'panel '+styles.stack}><h2>{shift.employeeName}</h2><p>{formatDayLabel(shift.date).weekday}, {formatDayLabel(shift.date).day}</p><p>{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</p><p>{data.positionOptions.find(p=>p.id===shift.positionId)?.name??(shift.positionId?'Assigned position unavailable':'No position specified')}</p>{shift.notes&&<p>{shift.notes}</p>}</section>}<Link className="button secondary" href={back}>Back to schedule</Link></ScopedReadFrame></div>;
}
