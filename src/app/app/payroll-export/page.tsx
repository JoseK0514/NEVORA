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
import {PayrollExport} from '@/components/payroll-export';
import {OwnerOnlyNotice} from '@/components/owner-only-notice';
import {payrollFeatureEnabled,readPayrollCapabilities} from '@/lib/payroll/service';
import {payrollTabs} from '@/components/payroll/payroll-tabs';
import './payroll-page.css';
import { readPageLang } from '@/lib/i18n/page-lang.server';
import { ROUTE_COPY } from '../route-copy';

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: ROUTE_COPY[await readPageLang()].timeExports }; }
export default async function PayrollExportPage({searchParams}:{searchParams:Promise<{start?:string;end?:string}>}){const lang = await readPageLang(), t = ROUTE_COPY[lang];
  const session=await requireSession();
  // Review F2 (NV-136): a closed page says why, never a silent redirect to Home.
  if(!isManagerRole(session.role))return <OwnerOnlyNotice state lang={await readPageLang()} title={t.timeExports} reason={t.timeExportsFor} help={t.ownHoursOnTime} next={{href:'/app/my-time',label:t.openTime}}/>;
  const proof=await requireSessionMutationProof();
  const access=await withOperationalCompany(proof,async()=>null);if(access.state==='unavailable')return <OperationalUnavailable lang={lang} title={t.timeExportsUnavailable} reason={access.reason}/>;
  const workspace=await getWorkspace(),params=await searchParams;
  const today=Temporal.Now.zonedDateTimeISO(workspace.timeZone).toPlainDate();
  // Quiet (v4): the default is this week, Monday to Sunday (the period Timecards and Payroll show).
  const monday=today.subtract({days:today.dayOfWeek-1});
  let period={startDate:monday.toString(),endDate:monday.add({days:6}).toString()};
  try{if(params.start&&params.end)period=parsePeriod(params.start,params.end);}catch{/* Invalid navigation falls back to the current period. */}
  // Managers and Owners only (the notice above). Corporate (Release 1, board O-TimeExports): the page draws its own kit frame.
  // Owner premium: Payroll's tabs under the title; the same access read the shell makes for its section tabs.
  const payroll=payrollFeatureEnabled()?await readPayrollCapabilities(proof).catch(()=>undefined):undefined;
  return <ScopedReadFrame observation={scopedObservation(access)}><PayrollExport key={session.id} initialPeriod={period} actorId={session.id} tabs={payrollTabs(session.role,payroll)} today={today.toString()}/></ScopedReadFrame>;
}
