import { routeTitle } from "@/app/app/route-titles";
import {scopedObservation} from '@/lib/company-access/observation';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireSession,requireSessionMutationProof} from '@/lib/auth/session';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {Temporal} from '@js-temporal/polyfill';
import {isManagerRole} from '@/lib/auth/permissions';
import {getWorkspace} from '@/lib/data/workspaces';
import {parsePeriod} from '@/lib/timecards/project';
import {OwnerOnlyNotice} from '@/components/owner-only-notice';
import {CorpPage} from '@/components/corp/corp';
import {SheetMarker} from '@/components/team/team-forms';
import {PaidTimeExportFlow} from '@/components/payroll-import/export-flow';
import {readPortalLanguage} from '@/lib/activation/language.server';

export const generateMetadata = routeTitle("paidTime");

/** U01: paid time and export by batch. The same people as Time exports (Owners and Managers with the whole company;
 * the same closed-page card and the same company check), for the period that page was showing. */
export default async function PaidTimeExportPage({searchParams}:{searchParams:Promise<{start?:string;end?:string}>}){
  const session=await requireSession();
  if(!isManagerRole(session.role))return <OwnerOnlyNotice title="Paid time export" reason="Time exports are for Owners and Managers." help="Your own hours are on Time." next={{href:'/app/my-time',label:'Open Time'}}/>;
  const proof=await requireSessionMutationProof();
  const access=await withOperationalCompany(proof,async()=>null);if(access.state==='unavailable')return <OperationalUnavailable title="Paid time export unavailable" reason={access.reason}/>;
  const workspace=await getWorkspace(),params=await searchParams;
  const today=Temporal.Now.zonedDateTimeISO(workspace.timeZone).toPlainDate();
  const monday=today.subtract({days:today.dayOfWeek-1});
  let period={startDate:monday.toString(),endDate:monday.add({days:6}).toString()};
  try{if(params.start&&params.end)period=parsePeriod(params.start,params.end);}catch{/* Invalid navigation falls back to the current week, as Time exports does. */}
  // G98 (gap closure): the flow has Spanish copy, so it follows the person's language: their saved choice, else the nv-lang
  // cookie or the browser's, the same read the person and time off pages use. English if that read fails.
  let lang:'en'|'es'='en';try{lang=(await readPortalLanguage(proof)).language;}catch{/* English */}
  return <ScopedReadFrame observation={scopedObservation(access)}><CorpPage className="c-addemp c-sheetpage c-pim" labelledBy="paid-export-title">
    <SheetMarker/>
    <PaidTimeExportFlow lang={lang} key={`${session.id}:${period.startDate}:${period.endDate}`} actorId={session.id} workspaceId={workspace.id} period={period} timeZone={workspace.timeZone}/>
  </CorpPage></ScopedReadFrame>;
}
