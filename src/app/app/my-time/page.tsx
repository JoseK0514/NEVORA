import { OwnerOnlyNotice } from "@/components/owner-only-notice";
import {dateRange} from '@/lib/duration-format';
import {ResponsiveEmployeeHours} from '@/components/employee-mobile/hours';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {hoursRequestId,hoursRecordId} from '@/lib/employee-hours';
import {businessDate} from '@/lib/business-time';
import {addDays,weekStartFor} from '@/lib/date-utils';
import {parsePeriod} from '@/lib/timecards/project';
import { EmployeeTimePanel } from "@/components/employee-time-panel";
import { isManagerRole } from "@/lib/auth/permissions";
import {correctionAuthority} from '@/lib/time-corrections/authority.server';
import { getSession,requireSession,requireSessionMutationProof } from "@/lib/auth/session";
import { getWorkspace } from "@/lib/data/workspaces";
import { currentPayPeriod } from "@/lib/payroll/pay-calendar.server";
import { payrollFeatureEnabled, readPayrollCapabilities } from "@/lib/payroll/service";
import { currentBrand } from "@/lib/workspace-presentation/current.server";
import { mobileTabsForRole } from "@/lib/navigation";
import {readEmployeeWeeklyReview} from '@/lib/data/employee-weekly-review.server';
import { readPageLang } from '@/lib/i18n/page-lang.server';
import { ROUTE_COPY, esDayRange } from '../route-copy';

/** Review B1 (NV-022): the page title in the tab and for screen readers. Inspection Nov 14 (AR-15): an Employee or Lead
 * reads the name on their tab and heading ("Time"); an Owner or Manager keeps "My time", the title of the notice they see.
 * The session is the render's own cached read. */
export async function generateMetadata() {
  const session = await getSession().catch(() => null);
  const t = ROUTE_COPY[await readPageLang()];
  return { title: session && !isManagerRole(session.role) ? t.time : t.myTime };
}

export default async function MyTimePage({searchParams}:{searchParams:Promise<{view?:string;start?:string;end?:string;entry?:string;requestId?:string;edit?:string;filter?:string;from?:string}>}={searchParams:Promise.resolve({})}) {
  const session = await requireSession();
  const lang = await readPageLang(), t = ROUTE_COPY[lang];

  // Review B2 (NV-136): no silent redirect; the page says whose it is and where a manager's version is.
  if (isManagerRole(session.role)) {
    return <OwnerOnlyNotice lang={lang} title={t.myTime} reason={t.myTimeForEmployees} help={t.teamHoursInTimecards} next={{ href: "/app/timecards", label: t.openTimecards }} />;
  }

  const proof=await requireSessionMutationProof(),authority=correctionAuthority(proof),params=await searchParams;
  // P3-WR-09: a Lead's own time uses the same layout as an Employee's.
  const corporate=session.role==='EMPLOYEE'||session.role==='LEAD';
  // Jose, 2026-10-19: when the hours being worked now are paid, from the workspace's pay schedule.
  const pay=await currentPayPeriod();

  // Signature (phase 1): the band says today's date until the punches arrive; the payday line follows the Clocker note.
  const zone=await getWorkspace().then(workspace=>workspace.timeZone).catch(()=>'UTC');
  const todayLabel=new Intl.DateTimeFormat(t.locale,{timeZone:zone,weekday:'long',month:'short',day:'numeric'}).format(new Date());
  const scheduledPayLine=pay?t.scheduledPayday(new Intl.DateTimeFormat(t.locale,{timeZone:'UTC',weekday:'long',month:'short',day:'numeric'}).format(new Date(`${pay.payday}T12:00:00Z`)).replace(/\./g,''),lang==='es'?esDayRange(pay.period.startDate,pay.period.endDate):dateRange(pay.period.startDate,pay.period.endDate,{year:'never'})):undefined;
  const today=businessDate(new Date(),zone);let period={startDate:addDays(today,-6),endDate:today};try{if(params.start&&params.end)period=parsePeriod(params.start,params.end);}catch{}
  const view=params.view==='cards'?'cards':params.view==='corrections'?'corrections':'records';
  // Corporate (board E-PastTimecards): an Employee's Past timecards open on last week, Monday to Sunday.
  if(corporate&&view==='cards'&&!(params.start&&params.end)){const monday=addDays(weekStartFor(today),-7);period={startDate:monday,endDate:addDays(monday,6)};}
  // Hours belongs to the Pay tab when Pay is shown (back to Pay); otherwise Hours is its own tab (no back link). Same rules as the layout.
  const [payroll,brand]=await Promise.all([payrollFeatureEnabled()?readPayrollCapabilities(proof):Promise.resolve(undefined),currentBrand()]);
  // Corporate (Release 1): an Employee's Time is its own tab; a Lead's Hours still sits under Pay.
  const parent=session.role==='LEAD'&&mobileTabsForRole(session.role,payroll,{modules:brand.modules}).some(tab=>tab.href==='/app/my-pay')?{href:'/app/my-pay',label:t.pay}:null;
  // Corporate (Release 1): an Employee sees the kit page on every screen, so the older desktop panel isn't rendered.
  // Phase 8 (review C, row 10): Time's Right now says what Home says when today's shift has ended and the punch is still
  // open. It reads today's published shifts through the same own-schedule read Home uses (read only); a failed read leaves
  // Right now as it was.
  const todayShifts=corporate&&view==='records'&&!params.entry?await readEmployeeWeeklyReview(proof,weekStartFor(today)).then(review=>review.state==='unavailable'?null:review.shifts.filter(shift=>shift.date===today).map(({date,startTime,endTime})=>({date,startTime,endTime}))).catch(()=>null):null;
  const panel=corporate?null:<EmployeeTimePanel key={authority} authority={authority} corporate={corporate} signature={{todayLabel,payLine:scheduledPayLine}} />;
  return <ResponsiveEmployeeHours today={today} corporate={corporate} tabTitle={corporate?t.time:t.hours} authority={employeeViewAuthority(proof,'hours')} parent={parent} view={view} period={period} entryId={hoursRecordId(params.entry)?params.entry:null} requestId={hoursRequestId(params.requestId)?params.requestId:null} edit={params.edit&&params.edit.length<=500?params.edit:null} filter={params.filter==='decided'?'decided':'waiting'} fromCards={params.from==='cards'} chosen={!!(params.start&&params.end)} todayShifts={todayShifts}>{panel}</ResponsiveEmployeeHours>;
}
