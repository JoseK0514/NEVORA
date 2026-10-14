import { redirect } from "next/navigation";
import Link from 'next/link';
import { ArrowUpRightIcon, CardsIcon, CaretRightIcon } from '@phosphor-icons/react/ssr';
import {employeeRowClass} from '@/components/employee-corporate-ui';
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
        <Link className={corporate?employeeRowClass('my-time-period-link'):'my-time-period-link'} href="/app/timecards">
          <CardsIcon size={20} aria-hidden="true" />
          <span className={corporate?'employee-corporate-desktop-copy':undefined}>View period timecards</span>
          {corporate?<span className="employee-corporate-mobile-copy">Timecards</span>:null}
          <ArrowUpRightIcon className={corporate?'employee-corporate-external-arrow':undefined} size={16} aria-hidden="true" />
          {corporate?<CaretRightIcon className="employee-corporate-caret" size={20} aria-hidden="true"/>:null}
        </Link>
      </header>

      <EmployeeTimePanel key={authority} authority={authority} corporate={corporate} />
    </div>
  );
}
