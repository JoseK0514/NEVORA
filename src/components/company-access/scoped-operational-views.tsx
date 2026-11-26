'use client';
import Link from 'next/link';
import type {OperationalAuthorityView} from '@/lib/company-access/model';
import {ManagerClockMonitor} from '@/components/manager-clock-monitor';
import {NavIcon} from '@/components/nav-icon';
import {ScopedReadFrame} from './scoped-read-frame';
import styles from './company-access.module.css';
import {QuietHeader,QuietPage} from '@/components/quiet/quiet';
import {accessCopy,type AccessLang} from './access-copy';
import {usePortalLang} from '@/lib/i18n/portal-lang';


export function ScopedManagementHome({view,lang:langProp}:{view:Extract<OperationalAuthorityView,{state:'ready'}>;
 /** The person's language (Signed-in Spanish, Nov 23, 2026). */ lang?:AccessLang}){
 // Signed-in Spanish (Nov 23, 2026): the person's language, unless the caller names one.
 const portalLang=usePortalLang(),lang=langProp??portalLang;
 const t=accessCopy(lang).home;
 // v5 (mockup M01 family): a Manager with no assigned access gets one calm Quiet page; same words, same frame.
 if(view.scope?.mode!=='LOCATIONS')return <QuietPage className="q-unavailable"><ScopedReadFrame observation={view} lang={lang}>
  <div className="q-top-gap" aria-hidden="true"/>
  <QuietHeader title={t.noAccessTitle} sub={t.notAssigned}/>
  <p className="q-body q-noaccess">{t.noAccessLine}</p>
  <Link className="q-btn q-btn--sec" href="/app/profile">{t.yourProfile}</Link>
 </ScopedReadFrame></QuietPage>;
 return <div className={styles.scopedPage}><header><h1>{t.title}</h1><p>{t.yourLocations}</p></header><ScopedReadFrame observation={view} lang={lang}>
  {view.scope?.mode==='LOCATIONS'?<><section className={'panel '+styles.stack}><h2>{t.managedLocations}</h2><p>{view.locations.map(l=>l.name).join(' · ')}</p><div className={styles.actions}><Link className="button primary" href="/app/schedule"><NavIcon name="schedule"/>{t.viewSchedule}</Link><Link className="button secondary" href="/app/employees"><NavIcon name="employees"/>{t.viewTeam}</Link></div><p className="muted">{t.companyNote}</p></section><ManagerClockMonitor/></>:<section className={'panel '+styles.stack}><h2>{t.notAssigned}</h2><p>{t.assignLine}</p><Link className="button secondary" href="/app/profile">{t.yourProfile}</Link></section>}
 </ScopedReadFrame></div>;
}
