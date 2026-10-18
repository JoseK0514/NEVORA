import { redirect } from "next/navigation";
import { EmployeeTimePanel } from "@/components/employee-time-panel";
import { isManagerRole } from "@/lib/auth/permissions";
import {correctionAuthority} from '@/lib/time-corrections/authority.server';
import { requireSession,requireSessionMutationProof } from "@/lib/auth/session";
import './my-time.css';

export default async function MyTimePage() {
  const session = await requireSession();

  if (isManagerRole(session.role)) {
    redirect("/app");
  }

  const authority=correctionAuthority(await requireSessionMutationProof());
  const corporate=session.role==='EMPLOYEE';

  return (
    <div className="employee-view employee-my-time-view">
      <header className="employee-view-heading">
        <div>
          <h1>My time</h1>
          <p className="my-time-introduction">Review your punches, breaks, and correction requests.</p>
        </div>
      </header>

      <EmployeeTimePanel key={authority} authority={authority} corporate={corporate} />
    </div>
  );
}
