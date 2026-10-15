import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSessionMutationProof} from '@/lib/auth/session';
import Link from "next/link";
import { ArrowLeft, ArrowRight, Key } from "@phosphor-icons/react/dist/ssr";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/employees";
import { listPositions } from "@/lib/data/positions";
import { createEmployeeFormAction } from "@/app/app/employees/actions";
import {NewEmployeeForm} from "@/components/company-access/new-employee-form";
import { NewEmployeeFrame } from "./new-employee-frame";
import "./new-employee.css";

const errors: Record<string, string> = {
  permission: "Only an owner can create another owner.",
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

  return (<ScopedReadFrame observation={source}>
    <NewEmployeeFrame>
      <header className="new-employee-header" data-employee-reveal>
        <Link className="new-employee-back" href="/app/employees">
          <ArrowLeft size={16} aria-hidden="true" /> Employees
        </Link>
        <h1>Add employee</h1>
        <p>Add contact, access and scheduling details. Email remains optional.</p>
      </header>

      <div className="new-employee-layout">
        <section className="new-employee-panel" aria-label="New employee details" data-employee-reveal>
          {params.error ? (
            <p className="form-error" role="alert">
              {errors[params.error] ?? "Complete all required employee fields."}
            </p>
          ) : null}
          {!activeLocations.length ? (
            <p className="new-employee-empty" role="status">
              Add an active location before creating an employee.
              {session.role === "OWNER" ? (
                <> <Link href="/app/settings/locations">Manage locations <ArrowRight size={14} aria-hidden="true" /></Link></>
              ) : " Ask an owner to set up a location."}
            </p>
          ) : null}

          <NewEmployeeForm actorRole={session.role} locations={activeLocations} positions={positions} action={createEmployeeFormAction}/>
        </section>

        <aside className="new-employee-next" aria-labelledby="employee-next-heading" data-employee-reveal>
          <div className="new-employee-next-icon"><Key size={24} weight="duotone" aria-hidden="true" /></div>
          <h2 id="employee-next-heading">What happens next</h2>
          <p>After saving, an Owner can send an invitation to the employee’s registered email.</p>
          <ol>
            <li>Review their registered email and Employee ID.</li>
            <li>An Owner sends the account invitation from their profile.</li>
            <li>They open the email link, create a password and sign in with their Employee ID.</li>
          </ol>
          <p className="new-employee-next-note">Email is optional for the employee record. A registered email is required before an invitation can be sent.</p>
          <Link className="new-employee-directory-link" href="/app/employees">View Employees <ArrowRight size={15} aria-hidden="true" /></Link>
        </aside>
      </div>
    </NewEmployeeFrame>
  </ScopedReadFrame>);
}
