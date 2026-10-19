import { redirect } from "next/navigation";
import { EmployeeTimePanel } from "@/components/employee-time-panel";
import { isManagerRole } from "@/lib/auth/permissions";
import {correctionAuthority} from '@/lib/time-corrections/authority.server';
import { requireSession,requireSessionMutationProof } from "@/lib/auth/session";
import './my-time.css';
import { PageBand } from "@/components/kit/kit";
import { currentPayPeriod } from "@/lib/payroll/pay-calendar.server";

export default async function MyTimePage() {
  const session = await requireSession();

  if (isManagerRole(session.role)) {
    redirect("/app");
  }

  const authority=correctionAuthority(await requireSessionMutationProof());
  const corporate=session.role==='EMPLOYEE';
  // Jose, 2026-10-19: when the hours being worked now are paid, from the workspace's pay schedule.
  const pay=await currentPayPeriod();
  const shortDate=(date:string,weekday=false)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric',...(weekday?{weekday:'short' as const}:{})}).format(new Date(`${date}T12:00:00Z`));
  const payLine=pay?`Payday\u00a0${shortDate(pay.payday,true).replace(/ /g,'\u00a0')} · for\u00a0${shortDate(pay.period.startDate).replace(/ /g,'\u00a0')}\u00a0– ${shortDate(pay.period.endDate).replace(/ /g,'\u00a0')}`:undefined;

  return (
    <div className="nv-page employee-view employee-my-time-view premium-employee-time" data-nv-page="">
      {/* Phase 3: the band, then the existing time cards in the shared content column. */}
      <PageBand eyebrow={payLine} title="My time" summary="Your punches, breaks and correction requests." overlap={false} />
      <div className="premium-employee-content">
        <EmployeeTimePanel key={authority} authority={authority} corporate={corporate} />
      </div>
    </div>
  );
}
