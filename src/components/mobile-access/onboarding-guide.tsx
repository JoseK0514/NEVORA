'use client';
import Link from 'next/link';
import {useState} from 'react';
import {XIcon} from '@phosphor-icons/react/dist/ssr/X';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import type {AuthLang} from '@/lib/auth-copy';
import {MOBILE_ACCESS_COPY} from './copy';
import {useAccessJourney} from './journey';
import './onboarding-guide.css';

/** Informational only: the Employee data/authority readers and their destinations stay unchanged. */
export function MobileOnboardingGuide({employeeId,lang,timeOffEnabled}:{employeeId:string;lang:AuthLang;timeOffEnabled:boolean}) {
 const t=MOBILE_ACCESS_COPY[lang],journey=useAccessJourney(),[open,setOpen]=useState(false);
 const intro=journey.confirmedId===employeeId;
 const tasks=[['/app/schedule',t.guideSchedule,t.guideScheduleSub],['/app/my-time',t.guideTime,t.guideTimeSub],...(timeOffEnabled?[['/app/requests?tab=my',t.guideTimeOff,t.guideTimeOffSub]]:[])];
 return <section lang={lang} className="ma-onboarding" aria-label={t.guideOpen}>
  {intro?<div className="ma-onboarding-intro"><div><h2>{t.guideTitle}</h2><p>{t.guideSub}</p></div><button type="button" className="ma-guide-close" aria-label={t.guideClose} onClick={()=>journey.dismiss()}><XIcon size={20} aria-hidden="true"/></button></div>:null}
  <details open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>{t.guideOpen}</summary><div className="ma-guide-list">{tasks.map(([href,title,sub])=><Link href={href} key={href}><span><b>{title}</b><small>{sub}</small></span><CaretRightIcon size={18} aria-hidden="true"/></Link>)}<div><b>{t.guideHelp}</b><p>{t.guideHelpSub}</p></div></div></details>
 </section>;
}
