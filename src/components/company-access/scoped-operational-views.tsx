'use client';
import Link from 'next/link';
import type {OperationalAuthorityView} from '@/lib/company-access/model';
import {ManagerClockMonitor} from '@/components/manager-clock-monitor';
import {NavIcon} from '@/components/nav-icon';
import {ScopedReadFrame} from './scoped-read-frame';
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
