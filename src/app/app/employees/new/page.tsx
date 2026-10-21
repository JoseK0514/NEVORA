import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSessionMutationProof} from '@/lib/auth/session';
import { Card, KitLink, PageBand } from "@/components/kit/kit";
import { Notice } from "@/components/wave-a/parts";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/employees";
import { listPositions } from "@/lib/data/positions";
import { createEmployeeFormAction } from "@/app/app/employees/actions";

import {NewEmployeeForm} from "@/components/company-access/new-employee-form";

const errors: Record<string, string> = {
  permission: "Only an Owner can add another Owner.",
  save: "Employee could not be saved. Check that the ID and email are unique and the selected locations and positions are active.",
  id: "Enter a unique employee ID with no more than 128 characters.",
  name: "Enter a first and last name with no more than 160 characters each.",
  email: "Enter a valid email address, or leave the optional email field empty.",
};

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireRoles(MANAGER_ROLES);
  const params=await searchParams;
  const source=await withOperationalCompany(await requireSessionMutationProof(),()=>Promise.all([listLocations(),listPositions()]));
  if(source.state==='unavailable')return <OperationalUnavailable title="Employee creation unavailable" reason={source.reason}/>;
  const [locations,positions]=source.data;
  const activeLocations = locations.filter((location) => location.active);

  // Phase 3.5 Wave A: New employee on the kit. Three cards (person, access, scheduling), then what happens next.
  return (
    <ScopedReadFrame observation={source}><div className="nv-page wa-page wa-newmember" data-nv-page="">
      <PageBand back={{ href: "/app/employees", label: "Team" }} title="Add employee" summary="Their contact, access and scheduling details. Email is optional." />
      <div className="nv-content wa-narrow">
        {params.error ? <Notice tone="urgent" title="The employee wasn’t added">{errors[params.error] ?? "Complete all required employee fields."}</Notice> : null}
        {!activeLocations.length ? <Notice tone="review" title="Add a location first">
          {session.role === "OWNER" ? "An employee needs an active primary location." : "An employee needs an active primary location. Ask an Owner to add one."}
        </Notice> : null}
        {!activeLocations.length && session.role === "OWNER" ? <KitLink href="/app/settings/locations">Manage locations</KitLink> : null}

        <Card title="Employee details"><div className="wa-fields">
          <NewEmployeeForm actorRole={session.role} locations={activeLocations} positions={positions} action={createEmployeeFormAction}/>
        </div></Card>

        <Card title="What happens next" id="new-next">
          <ol className="wa-steps">
            <li>Review their registered email and Employee ID.</li>
            <li>An Owner sends the account invitation from their profile.</li>
            <li>They open the email link, create a password and sign in with their Employee ID.</li>
          </ol>
          <p className="wa-card-note">Email is optional for the employee record. A registered email is required before an invitation can be sent.</p>
        </Card>
      </div>
    </div></ScopedReadFrame>
  );
}
