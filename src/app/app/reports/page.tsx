import {scopedObservation} from '@/lib/company-access/observation';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {Temporal} from '@js-temporal/polyfill';
import {requireSession} from '@/lib/auth/session';
import {isManagerRole} from '@/lib/auth/permissions';
import {getWorkspace} from '@/lib/data/workspaces';
import {parsePeriod} from '@/lib/timecards/project';
import {christmasBonusApplies} from '@/lib/reports/christmas-bonus';
import {Reports} from '@/components/reports';
import {ReportsEntrance} from '@/components/reports-entrance';
import {OwnerOnlyNotice} from '@/components/owner-only-notice';
import { navLabel } from '@/components/shell-copy';
import {readPortalLanguage} from '@/lib/activation/language.server';
import {REPORTS_COPY} from '@/components/reports-messages';
import { readPageLang } from '@/lib/i18n/page-lang.server';
import { copy as pageWording } from './page-copy';

export async function generateMetadata() {
  return { title: pageWording[await readPageLang()].insights };
}

export default async function ReportsPage({searchParams}:{searchParams:Promise<{start?:string;end?:string}>}){
  const session=await requireSession();
  // Rondo Spanish (G98): the page's own words follow the person's language (Reports reads it from the portal); a failed
  // read is English.
  const proof=await requireSessionMutationProof();
  let lang:'en'|'es'='en';try{lang=(await readPortalLanguage(proof)).language;}catch{/* English */}
  const t=REPORTS_COPY[lang];
  // Review F2 (NV-136): a closed page says why, never a silent redirect to Home.
  if(!isManagerRole(session.role))return <OwnerOnlyNotice state back={lang === "es" ? { href: "/app", label: navLabel("Home", lang) } : undefined} title={t.insights} reason={t.closedReason} help={t.ownHours} next={{href:'/app/my-time',label:t.openTime}}/>;
  const access=await withOperationalCompany(proof,async()=>null);if(access.state==='unavailable')return <OperationalUnavailable lang={lang} closedPageTitle={lang === "es" ? t.unavailableTitle : undefined} title={t.unavailableTitle} reason={access.reason}/>;
  const workspace=await getWorkspace(),params=await searchParams;
  const today=Temporal.Now.zonedDateTimeISO(workspace.timeZone).toPlainDate();
  // MK5 / PD4: the default is this week so far, Monday to today (the This week preset); Last week is one tap away.
  const monday=today.subtract({days:today.dayOfWeek-1});
  let period={startDate:monday.toString(),endDate:today.toString()};
  try{if(params.start&&params.end)period=parsePeriod(params.start,params.end);}catch{/* Invalid navigation falls back to the current period. */}
  // Release 1 (board O-Insights): Reports renders the whole page (title, periods, Export on wide screens and the cards).
  return <ScopedReadFrame observation={scopedObservation(access)}><ReportsEntrance>
    <Reports key={session.id} initialPeriod={period} today={today.toString()} christmasBonus={christmasBonusApplies(workspace.timeZone)}/></ReportsEntrance></ScopedReadFrame>;
}
