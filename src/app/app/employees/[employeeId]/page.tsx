import { EmployeeCoreProfileForm } from "@/components/employee-core-profile-form";
import { EmployeeSchedulingFields } from "@/components/employee-scheduling-fields";
import { ConfigurationForm } from "@/components/configuration-form";
import { OperationalRuleFields } from "@/components/operational-rule-fields";
import { PageHeader } from "@/components/page-header";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import {
  getEmployeeManagementProfile,
  listLocations,
} from "@/lib/data/employees";
import { listPositions } from "@/lib/data/positions";
import { readOperationalRuleProfileView } from "@/lib/data/shift-change-views";
import { employeeInitials, employeeRoleLabel } from "@/lib/employee-display";
import { formatPhoneNumber } from "@/lib/phone";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  saveEmployeeCoreProfileAction,
  saveEmployeeSchedulingProfileAction,
} from "../actions";

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const actor = await requireRoles(MANAGER_ROLES);
  const { employeeId } = await params;

  const [employee, locations, positions] = await Promise.all([
    getEmployeeManagementProfile(employeeId),
    listLocations({ includeInactive: true }),
    listPositions({ includeInactive: true }),
  ]);

  if (!employee) notFound();

  const proof = await requireSessionMutationProof();
  let operational = null;
  let profileUnavailable = false;
  try {
    operational = await readOperationalRuleProfileView(proof, employee.id);
  } catch {
    profileUnavailable = true;
  }

  const primaryLocation = locations.find(
    (location) => location.id === employee.primaryLocationId,
  );
  const canManageCore = actor.role === "OWNER" || employee.role !== "OWNER";

  return (
    <div className="employee-profile-page">
      <PageHeader
        eyebrow="Employee Profile"
        title={`${employee.firstName} ${employee.lastName}`}
        description="Contact, access and scheduling information."
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
            <h2>
              {employee.firstName} {employee.lastName}
            </h2>
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

      <section className="panel form-panel employee-core-management">
        <div className="employee-profile-section-heading">
          <div>
            <h2>Employee details</h2>
            <p>
              Update contact information, access role, primary location and
              status without changing historical records.
            </p>
          </div>
        </div>
        {canManageCore ? (
          <EmployeeCoreProfileForm
            employee={employee}
            locations={locations}
            actorRole={actor.role}
            action={saveEmployeeCoreProfileAction}
          />
        ) : (
          <p className="employee-management-notice">
            Only an Owner can change another Owner. Scheduling information
            remains available below.
          </p>
        )}
      </section>

      {canManageCore && employee.active ? <section className="panel">
        <h2>Clocker PIN</h2>
        <p>Manage this employee’s shared-tablet PIN separately from portal access.</p>
        <Link className="button secondary" href={`/app/employees/${encodeURIComponent(employee.id)}/clocker-pin`}>Manage Clocker PIN</Link>
      </section> : null}

      <section className="panel form-panel employee-scheduling-management">
        <div className="employee-profile-section-heading">
          <div>
            <h2>Scheduling profile</h2>
            <p>
              Positions and eligible locations control where this employee can
              be considered for scheduling.
            </p>
          </div>
        </div>
        <ConfigurationForm
          action={saveEmployeeSchedulingProfileAction}
          className="employee-form scheduling-profile-form"
          reviewedUpdatedAt={employee.updatedAt}
        >
          <input type="hidden" name="employeeId" value={employee.id} />
          <EmployeeSchedulingFields
            employee={employee}
            locations={locations}
            positions={positions}
          />
          <button className="button primary" type="submit">
            Save Scheduling Profile
          </button>
        </ConfigurationForm>
        {profileUnavailable ? (
          <p role="alert" className="form-error">
            Operational review is unavailable. Reconnect and reload.
          </p>
        ) : operational ? (
          <OperationalRuleFields
            employeeId={employee.id}
            profile={operational}
            canEdit={actor.role === "OWNER"}
          />
        ) : (
          <p>
            Operational review is unavailable until scheduling hour settings
            have been explicitly established. No maximum is created by this
            review.
          </p>
        )}
      </section>
    </div>
  );
}
