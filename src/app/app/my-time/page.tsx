import { redirect } from "next/navigation";
import Link from 'next/link';
import { ArrowUpRightIcon, CardsIcon } from '@phosphor-icons/react/ssr';
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

  return (
    <div className="employee-view employee-my-time-view">
      <header className="employee-view-heading">
        <div>
          <h1>My Time</h1>
          <p className="my-time-introduction">Review your punches, breaks, and correction requests.</p>
        </div>
        <Link className="my-time-period-link" href="/app/timecards">
          <CardsIcon size={20} aria-hidden="true" />
          <span>View period timecards</span>
          <ArrowUpRightIcon size={16} aria-hidden="true" />
        </Link>
      </header>

      <EmployeeTimePanel key={authority} authority={authority} />
    </div>
  );
}
