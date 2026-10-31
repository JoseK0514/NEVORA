import {ResponsiveEmployeeHours} from '@/components/employee-mobile/hours';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {hoursRequestId,hoursRecordId} from '@/lib/employee-hours';
import {businessDate} from '@/lib/business-time';
import {addDays,weekStartFor} from '@/lib/date-utils';
import {parsePeriod} from '@/lib/timecards/project';
import { redirect } from "next/navigation";
import { EmployeeTimePanel } from "@/components/employee-time-panel";
import { isManagerRole } from "@/lib/auth/permissions";
import {correctionAuthority} from '@/lib/time-corrections/authority.server';
import { requireSession,requireSessionMutationProof } from "@/lib/auth/session";
import { getWorkspace } from "@/lib/data/workspaces";
import { currentPayPeriod } from "@/lib/payroll/pay-calendar.server";
import { payrollFeatureEnabled, readPayrollCapabilities } from "@/lib/payroll/service";
import { currentBrand } from "@/lib/workspace-presentation/current.server";
import { mobileTabsForRole } from "@/lib/navigation";

export default async function MyTimePage({searchParams}:{searchParams:Promise<{view?:string;start?:string;end?:string;entry?:string;requestId?:string;edit?:string;filter?:string;from?:string}>}={searchParams:Promise.resolve({})}) {
  const session = await requireSession();

  if (isManagerRole(session.role)) {
    redirect("/app");
  }

  const proof=await requireSessionMutationProof(),authority=correctionAuthority(proof),params=await searchParams;
  // P3-WR-09: a Lead's own time uses the same layout as an Employee's.
  const corporate=session.role==='EMPLOYEE'||session.role==='LEAD';
  // Jose, 2026-10-19: when the hours being worked now are paid, from the workspace's pay schedule.
  const pay=await currentPayPeriod();
  const shortDate=(date:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric'}).format(new Date(`${date}T12:00:00Z`));

  // Signature (phase 1): the band says today's date until the punches arrive; the payday line follows the Clocker note.
  const zone=await getWorkspace().then(workspace=>workspace.timeZone).catch(()=>'UTC');
  const todayLabel=new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'long',month:'short',day:'numeric'}).format(new Date());
  const paidLine=pay?`Paid ${new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'long',month:'short',day:'numeric'}).format(new Date(`${pay.payday}T12:00:00Z`))} for ${pay.period.startDate.slice(0,7)===pay.period.endDate.slice(0,7)?`${shortDate(pay.period.startDate)}–${Number(pay.period.endDate.slice(8))}`:`${shortDate(pay.period.startDate)} – ${shortDate(pay.period.endDate)}`}`:undefined;
  const today=businessDate(new Date(),zone);let period={startDate:addDays(today,-6),endDate:today};try{if(params.start&&params.end)period=parsePeriod(params.start,params.end);}catch{}
  const view=params.view==='cards'?'cards':params.view==='corrections'?'corrections':'records';
  // Corporate (board E-PastTimecards): an Employee's Past timecards open on last week, Monday to Sunday.
  if(session.role==='EMPLOYEE'&&view==='cards'&&!(params.start&&params.end)){const monday=addDays(weekStartFor(today),-7);period={startDate:monday,endDate:addDays(monday,6)};}
  // Hours belongs to the Pay tab when Pay is shown (back to Pay); otherwise Hours is its own tab (no back link). Same rules as the layout.
  const [payroll,brand]=await Promise.all([payrollFeatureEnabled()?readPayrollCapabilities(proof):Promise.resolve(undefined),currentBrand()]);
  // Corporate (Release 1): an Employee's Time is its own tab; a Lead's Hours still sits under Pay.
  const parent=session.role==='LEAD'&&mobileTabsForRole(session.role,payroll,{modules:brand.modules}).some(tab=>tab.href==='/app/my-pay')?{href:'/app/my-pay',label:'Pay'}:null;
  // Corporate (Release 1): an Employee sees the kit page on every screen, so the older desktop panel isn't rendered.
  const panel=session.role==='EMPLOYEE'?null:<EmployeeTimePanel key={authority} authority={authority} corporate={corporate} signature={{todayLabel,payLine:paidLine}} />;
  return <ResponsiveEmployeeHours today={today} corporate={session.role==='EMPLOYEE'} tabTitle={session.role==='EMPLOYEE'?'Time':'Hours'} authority={employeeViewAuthority(proof,'hours')} parent={parent} view={view} period={period} entryId={hoursRecordId(params.entry)?params.entry:null} requestId={hoursRequestId(params.requestId)?params.requestId:null} edit={params.edit&&params.edit.length<=500?params.edit:null} filter={params.filter==='decided'?'decided':'waiting'} fromCards={params.from==='cards'}>{panel}</ResponsiveEmployeeHours>;
}
