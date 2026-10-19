import { redirect } from "next/navigation";
import { EmployeeTimePanel } from "@/components/employee-time-panel";
import { isManagerRole } from "@/lib/auth/permissions";
import {correctionAuthority} from '@/lib/time-corrections/authority.server';
import { requireSession,requireSessionMutationProof } from "@/lib/auth/session";
import './my-time.css';
import { PageBand } from "@/components/kit/kit";

export default async function MyTimePage() {
  const session = await requireSession();

  if (isManagerRole(session.role)) {
    redirect("/app");
  }

  const authority=correctionAuthority(await requireSessionMutationProof());
  const corporate=session.role==='EMPLOYEE';

  return (
    <div className="nv-page employee-view employee-my-time-view premium-employee-time" data-nv-page="">
      {/* Phase 3: the band, then the existing time cards in the shared content column. */}
      <PageBand title="My time" summary="Your punches, breaks and correction requests." overlap={false} />
      <div className="premium-employee-content">
        <EmployeeTimePanel key={authority} authority={authority} corporate={corporate} />
      </div>
    </div>
  );
}
