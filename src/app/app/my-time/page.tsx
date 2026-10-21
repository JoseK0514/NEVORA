import { redirect } from "next/navigation";
import { EmployeeTimePanel } from "@/components/employee-time-panel";
import { isManagerRole } from "@/lib/auth/permissions";
import {correctionAuthority} from '@/lib/time-corrections/authority.server';
import { requireSession,requireSessionMutationProof } from "@/lib/auth/session";
import { getWorkspace } from "@/lib/data/workspaces";
import { currentPayPeriod } from "@/lib/payroll/pay-calendar.server";

export default async function MyTimePage() {
  const session = await requireSession();

  if (isManagerRole(session.role)) {
    redirect("/app");
  }

  const authority=correctionAuthority(await requireSessionMutationProof());
  // P3-WR-09: a Lead's own time uses the same layout as an Employee's.
  const corporate=session.role==='EMPLOYEE'||session.role==='LEAD';
  // Jose, 2026-10-19: when the hours being worked now are paid, from the workspace's pay schedule.
  const pay=await currentPayPeriod();
  const shortDate=(date:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric'}).format(new Date(`${date}T12:00:00Z`));

  // Signature (phase 1): the band says today's date until the punches arrive; the payday line follows the Clocker note.
  const zone=await getWorkspace().then(workspace=>workspace.timeZone).catch(()=>'UTC');
  const todayLabel=new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'long',month:'short',day:'numeric'}).format(new Date());
  const paidLine=pay?`Paid ${new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'long',month:'short',day:'numeric'}).format(new Date(`${pay.payday}T12:00:00Z`))} for ${pay.period.startDate.slice(0,7)===pay.period.endDate.slice(0,7)?`${shortDate(pay.period.startDate)}–${Number(pay.period.endDate.slice(8))}`:`${shortDate(pay.period.startDate)} – ${shortDate(pay.period.endDate)}`}`:undefined;
  return <EmployeeTimePanel key={authority} authority={authority} corporate={corporate} signature={{todayLabel,payLine:paidLine}} />;
}
