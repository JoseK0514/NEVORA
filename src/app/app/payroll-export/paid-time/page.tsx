import { payrollExportsDisabled } from '@/lib/payroll-export/launch-setting.server';
import { redirect } from 'next/navigation';
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
import {readPageLang} from '@/lib/i18n/page-lang.server';
import {copy} from './page-copy';

export const generateMetadata = routeTitle("paidTime");

/** U01: paid time and export by batch. The same people as Time exports (Owners and Managers with the whole company;
 * the same closed-page card and the same company check), for the period that page was showing. */
export default async function PaidTimeExportPage({searchParams}:{searchParams:Promise<{start?:string;end?:string}>}){
  const session=await requireSession();
  if(!isManagerRole(session.role)){
    const lang=await readPageLang(), wording=copy[lang];
    return <OwnerOnlyNotice lang={lang} title={wording.paidTimeExport} reason={wording.timeExportsAreForOwnersAndManagers} help={wording.yourOwnHoursAreOnTime} next={{href:'/app/my-time',label:wording.openTime}}/>;
  }
  const proof=await requireSessionMutationProof();
  let lang: keyof typeof copy = 'en';
  try { lang = (await readPortalLanguage(proof)).language; } catch { /* Use the existing English fallback. */ }
  const wording = copy[lang];
  const access=await withOperationalCompany(proof,async()=>null);if(access.state==='unavailable')return <OperationalUnavailable lang={lang} title={wording.paidTimeExportUnavailable} reason={access.reason}/>;
  const workspace=await getWorkspace(),params=await searchParams;
  const today=Temporal.Now.zonedDateTimeISO(workspace.timeZone).toPlainDate();
  const monday=today.subtract({days:today.dayOfWeek-1});
  let period={startDate:monday.toString(),endDate:monday.add({days:6}).toString()};
  try{if(params.start&&params.end)period=parsePeriod(params.start,params.end);}catch{/* Invalid navigation falls back to the current week, as Time exports does. */}
  if (payrollExportsDisabled()) redirect(`/app/payroll-export?start=${period.startDate}&end=${period.endDate}`);
  return <ScopedReadFrame observation={scopedObservation(access)}><CorpPage className="c-addemp c-sheetpage c-pim" labelledBy="paid-export-title">
    <SheetMarker/>
    <PaidTimeExportFlow lang={lang} key={`${session.id}:${period.startDate}:${period.endDate}`} actorId={session.id} workspaceId={workspace.id} period={period} timeZone={workspace.timeZone}/>
  </CorpPage></ScopedReadFrame>;
}
