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
export const metadata = { title: "Christmas bonus hours" };

/** Insights' Christmas bonus hours: the same authority as Insights (Owners and Managers with current company-wide
 * access; Leads and Employees get the closed notice and nothing is read). Only workspaces whose business time zone
 * is America/Puerto_Rico read it. The year defaults to the latest completed bonus year in the business time zone. */
export default async function ChristmasBonusPage({searchParams}:{searchParams:Promise<{year?:string}>}){
  const session=await requireSession();
  if(!isManagerRole(session.role))return <OwnerOnlyNotice state title="Christmas bonus hours" reason="Christmas bonus hours are for Owners and Managers" help="Your own hours are on Time." next={{href:'/app/my-time',label:'Open Time'}}/>;
  const proof=await requireSessionMutationProof(),params=await searchParams;
  const source=await withOperationalCompany(proof,async()=>{
    const workspace=await getWorkspace();
    // Puerto Rico law only: a workspace in another time zone reads nothing and gets the closed notice.
    if(!christmasBonusApplies(workspace.timeZone))return null;
    const today=businessDate(new Date(),workspace.timeZone);
    const year=selectBonusYear(params.year,today);
    return {choices:bonusYearChoices(today),result:await readChristmasBonusReport(proof,year)};
  });
  const insights={href:'/app/reports',label:'Insights'};
  if(source.state==='unavailable')return <OperationalUnavailable title="Christmas bonus hours unavailable" reason={source.reason} back={insights}/>;
  // Review 30 (D19): closed by Puerto Rico's rule, not by this person's access, so the card shows the information glyph.
  if(source.data===null)return <OwnerOnlyNotice state info back={insights} title="Christmas bonus hours" reason="Christmas bonus hours apply to Puerto Rico workspaces" help="This report follows Puerto Rico’s Christmas bonus rules, and this workspace is set to another time zone." next={{href:'/app/reports',label:'Open Insights'}}/>;
  const {choices,result}=source.data;
  // Review 30 (D08): a failed read is the kit's failed state under the Insights back link: what happened, that nothing
  // changed, and one Try again that reads the same year again. It no longer blames the connection.
  if(result.state==='unavailable'&&result.reason==='read_failed')return <BRouteError title="Christmas bonus hours" back={insights}
    spoken="Couldn’t load Christmas bonus hours. Nothing was changed." cardTitle="Couldn’t load Christmas bonus hours" line="Nothing was changed."
    retryHref={`/app/reports/christmas-bonus${typeof params.year==='string'&&/^\d{4}$/.test(params.year)?`?year=${params.year}`:''}`}/>;
  if(result.state==='unavailable')return <OperationalUnavailable title="Christmas bonus hours unavailable" reason={result.reason} back={insights}/>;
  return <ScopedReadFrame observation={scopedObservation(source)}><ChristmasBonusView report={result.report} choices={choices}/></ScopedReadFrame>;
}
