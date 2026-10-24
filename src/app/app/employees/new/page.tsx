import Link from "next/link";
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSessionMutationProof} from '@/lib/auth/session';
import { QuietNav } from "@/components/quiet/quiet";
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
    <ScopedReadFrame observation={source}><div className="q-page wa-newmember" data-nv-page="" data-q-sheet="">
      <QuietNav left={<Link className="q-nav__l q-nav__l--teal" href="/app/employees">Cancel</Link>} title="New employee"
        right={<button type="submit" form="new-employee-form" className="q-nav__r q-nav__r--b" disabled={!activeLocations.length}>Save</button>} />
      <h1 className="q-sr">New employee</h1>
      {params.error ? <p className="q-error" role="alert">{errors[params.error] ?? "Complete all required employee fields."}</p> : null}
      {!activeLocations.length ? <p className="q-help" role="status">{session.role === "OWNER" ? <>Add a location first. <Link href="/app/settings/locations" style={{ color: "#0B6E69" }}>Locations</Link></> : "Ask an Owner to add a location first."}</p> : null}
      <NewEmployeeForm actorRole={session.role} locations={activeLocations} positions={positions} action={createEmployeeFormAction}/>
    </div></ScopedReadFrame>
  );
}
