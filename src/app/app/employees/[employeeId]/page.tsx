import {OperationalRuleFields} from '@/components/operational-rule-fields';
import {readOperationalRuleProfileView} from '@/lib/data/shift-change-views';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {listPositions} from "@/lib/data/positions";
import {EmployeeSchedulingFields} from "@/components/employee-scheduling-fields";
import {ConfigurationForm} from "@/components/configuration-form";
import {saveEmployeeSchedulingProfileAction} from "../actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import { employeeInitials, employeeRoleLabel } from "@/lib/employee-display";
import { formatPhoneNumber } from "@/lib/phone";

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const actor=await requireRoles(MANAGER_ROLES);
  const { employeeId } = await params;

  const [employees, locations, positions] = await Promise.all([
    listEmployees(),
    listLocations({includeInactive:true}),
    listPositions({includeInactive:true}),
  ]);
  const employee = employees.find((item) => item.id === employeeId);

  if (!employee) notFound();
  const proof=await requireSessionMutationProof();
  let operational=null,profileUnavailable=false;try{operational=await readOperationalRuleProfileView(proof,employee.id);}catch{profileUnavailable=true;}

  const primaryLocation = locations.find(
    (location) => location.id === employee.primaryLocationId,
  );

  return (
    <div className="employee-profile-page">
      <PageHeader
        eyebrow="Employee Profile"
        title={`${employee.firstName} ${employee.lastName}`}
        description="Core scheduling profile information."
        actions={
          <Link className="button secondary" href="/app/employees">
            Back to Employees
          </Link>
        }
      />

      <section className="employee-profile-card">
        <div className="employee-profile-card-heading">
          <span className="employee-profile-card-avatar" aria-hidden="true">
            {employeeInitials(employee.firstName, employee.lastName)}
          </span>
          <div>
            <h2>{employee.firstName} {employee.lastName}</h2>
            <span className="employee-role-badge">
              Access role: {employeeRoleLabel(employee.role)}
            </span>
          </div>
        </div>

        <div className="employee-profile-details">
          <div>
            <span>Phone</span>
            <strong>{formatPhoneNumber(employee.phone)}</strong>
          </div>
          <div>
            <span>Email</span>
            <strong>{employee.email ?? "Not provided"}</strong>
          </div>
          <div>
            <span>Primary Location</span>
            <strong>{primaryLocation?.shortName ?? "Not assigned"}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{employee.active ? "Active" : "Inactive"}</strong>
          </div>
        </div>
      </section>
      <section className="panel form-panel"><h2>Scheduling profile</h2><ConfigurationForm action={saveEmployeeSchedulingProfileAction} className="employee-form scheduling-profile-form"><input type="hidden" name="employeeId" value={employee.id}/><EmployeeSchedulingFields employee={employee} locations={locations} positions={positions}/><button className="button primary" type="submit">Save Scheduling Profile</button></ConfigurationForm>{profileUnavailable?<p role="alert" className="form-error">Operational review is unavailable. Reconnect and reload.</p>:operational?<OperationalRuleFields employeeId={employee.id} profile={operational} canEdit={actor.role==='OWNER'}/>:<p>Operational review is unavailable until scheduling hour settings have been explicitly established. No maximum is created by this review.</p>}</section>
    </div>
  );
}