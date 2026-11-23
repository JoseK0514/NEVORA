import {scopedObservation} from '@/lib/company-access/observation';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireSession,requireSessionMutationProof} from '@/lib/auth/session';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {isManagerRole} from '@/lib/auth/permissions';
import {getWorkspace} from '@/lib/data/workspaces';
import {businessDate} from '@/lib/business-time';
import {bonusYearChoices,christmasBonusApplies,selectBonusYear} from '@/lib/reports/christmas-bonus';
import {readChristmasBonusReport} from '@/lib/reports/christmas-bonus.server';
import {ChristmasBonusView} from '@/components/christmas-bonus-report';
import {OwnerOnlyNotice} from '@/components/owner-only-notice';
import {BRouteError} from '@/components/owner-b/b-route-error';
import {readPortalLanguage} from '@/lib/activation/language.server';
import {CHRISTMAS_BONUS_COPY} from '@/components/christmas-bonus-copy';
export const metadata = { title: "Christmas bonus hours" };

/** Insights' Christmas bonus hours: the same authority as Insights (Owners and Managers with current company-wide
 * access; Leads and Employees get the closed notice and nothing is read). Only workspaces whose business time zone
 * is America/Puerto_Rico read it. The year defaults to the latest completed bonus year in the business time zone. */
export default async function ChristmasBonusPage({searchParams}:{searchParams:Promise<{year?:string}>}){
  const session=await requireSession();
  // Rondo Spanish (G98): the person's language (their saved choice, else the sign-in cookie or the browser's); a failed
  // read is English.
  const proof=await requireSessionMutationProof();
  let lang:'en'|'es'='en';try{lang=(await readPortalLanguage(proof)).language;}catch{/* English */}
  const t=CHRISTMAS_BONUS_COPY[lang];
  if(!isManagerRole(session.role))return <OwnerOnlyNotice state title={t.title} reason={t.closedReason} help={t.ownHours} next={{href:'/app/my-time',label:t.openTime}}/>;
  const params=await searchParams;
  const source=await withOperationalCompany(proof,async()=>{
    const workspace=await getWorkspace();
    // Puerto Rico law only: a workspace in another time zone reads nothing and gets the closed notice.
    if(!christmasBonusApplies(workspace.timeZone))return null;
    const today=businessDate(new Date(),workspace.timeZone);
    const year=selectBonusYear(params.year,today);
    return {choices:bonusYearChoices(today),result:await readChristmasBonusReport(proof,year)};
  });
  const insights={href:'/app/reports',label:t.insights};
  if(source.state==='unavailable')return <OperationalUnavailable title={t.unavailableTitle} reason={source.reason} back={insights}/>;
  // Review 30 (D19): closed by Puerto Rico's rule, not by this person's access, so the card shows the information glyph.
  if(source.data===null)return <OwnerOnlyNotice state info back={insights} title={t.title} reason={t.otherZoneReason} help={t.otherZoneHelp} next={{href:'/app/reports',label:t.openInsights}}/>;
  const {choices,result}=source.data;
  // Review 30 (D08): a failed read is the kit's failed state under the Insights back link: what happened, that nothing
  // changed, and one Try again that reads the same year again. It no longer blames the connection.
  if(result.state==='unavailable'&&result.reason==='read_failed')return <BRouteError title={t.title} back={insights}
    spoken={`${t.loadFailed}. ${t.nothingChanged}`} cardTitle={t.loadFailed} line={t.nothingChanged}
    retryHref={`/app/reports/christmas-bonus${typeof params.year==='string'&&/^\d{4}$/.test(params.year)?`?year=${params.year}`:''}`}/>;
  if(result.state==='unavailable')return <OperationalUnavailable title={t.unavailableTitle} reason={result.reason} back={insights}/>;
  return <ScopedReadFrame observation={scopedObservation(source)}><ChristmasBonusView report={result.report} choices={choices} lang={lang}/></ScopedReadFrame>;
}
