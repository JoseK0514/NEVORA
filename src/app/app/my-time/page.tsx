import { redirect } from "next/navigation";
import Link from 'next/link';
import { EmployeeTimePanel } from "@/components/employee-time-panel";
import { isManagerRole } from "@/lib/auth/permissions";
import {correctionAuthority} from '@/lib/time-corrections/authority.server';
import { requireSession,requireSessionMutationProof } from "@/lib/auth/session";

export default async function MyTimePage() {
  const session = await requireSession();

  if (isManagerRole(session.role)) {
    redirect("/app");
  }

  const authority=correctionAuthority(await requireSessionMutationProof());

  return (
    <div className="employee-view employee-my-time-view">
      <header className="employee-view-heading">
        <div>
          <p className="employee-view-eyebrow">Your worked time</p>
          <h1>My Time</h1>
        </div>
      </header>

      <EmployeeTimePanel key={authority} authority={authority} />
      <Link className="button secondary" href="/app/timecards">View period timecards</Link>
    </div>
  );
}
