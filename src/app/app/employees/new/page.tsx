import Link from "next/link";
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSessionMutationProof} from '@/lib/auth/session';
import { CorpPage } from "@/components/corp/corp";
import { SheetMarker } from "@/components/team/team-forms";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/employees";
import { listPositions } from "@/lib/data/positions";
import { createEmployeeFormAction } from "@/app/app/employees/actions";

import {NewEmployeeForm} from "@/components/company-access/new-employee-form";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Add employee" };

const errors: Record<string, string> = {
  permission: "Only an Owner can add another Owner.",
  save: "Couldn’t add this person. Check that the employee ID and email aren’t already in use.",
  id: "Enter a unique employee ID with no more than 128 characters.",
  name: "Enter a first and last name.",
  email: "Check the email, or leave it blank.",
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

  // Release 1 (boards O-AddEmployee, O-AddEmployeePay): a sheet in two steps; the form carries its own header.
  return (
    <ScopedReadFrame observation={source}><CorpPage className="c-addemp c-sheetpage" labelledBy="new-employee-title">
      <SheetMarker />
      <NewEmployeeForm actorRole={session.role} locations={activeLocations} positions={positions} action={createEmployeeFormAction} notice={<>
        {params.error ? <p className="c-error" role="alert">{errors[params.error] ?? "Complete all required employee fields."}</p> : null}
        {!activeLocations.length ? <p className="c-note" role="status">{session.role === "OWNER" ? <span>Add a location first.{" "}<Link className="c-link c-link--l" href="/app/settings/locations">Locations</Link></span> : "Ask an Owner to add a location first."}</p> : null}
      </>}/>
    </CorpPage></ScopedReadFrame>
  );
}
