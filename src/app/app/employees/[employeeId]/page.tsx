import { EmployeeCoreProfileForm } from "@/components/employee-core-profile-form";
import { EmployeeSchedulingFields } from "@/components/employee-scheduling-fields";
import { ConfigurationForm } from "@/components/configuration-form";
import { OperationalRuleFields } from "@/components/operational-rule-fields";
import { EmployeeProfileTabs } from "@/components/employee-profile-tabs";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { KeyIcon } from "@phosphor-icons/react/dist/ssr/Key";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import "./employee-profile.css";
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
      <Link className="profile-back" href="/app/employees">
        <ArrowLeftIcon size={18} aria-hidden="true" focusable="false" />
        Back to Employees
      </Link>
      <header className="profile-overview">
        <div className="profile-identity">
          <span className="profile-avatar" aria-hidden="true">
            {employeeInitials(employee.firstName, employee.lastName)}
          </span>
          <div className="profile-identity-copy">
            <p className="profile-context">Employee profile</p>
            <h1>
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="profile-intro">
              Contact, access and scheduling information.
            </p>
          </div>
          <span className={`profile-status ${employee.active ? "active" : "inactive"}`}>
            {employee.active ? "Active" : "Inactive"}
          </span>
        </div>
        <dl className="profile-summary">
          <div>
            <dt>Phone</dt>
            <dd>{formatPhoneNumber(employee.phone)}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{employee.email ?? "Not provided"}</dd>
          </div>
          <div>
            <dt>Primary location</dt>
            <dd>
              {primaryLocation?.shortName ?? "Not assigned"}
              {primaryLocation && !primaryLocation.active ? " (Inactive)" : ""}
            </dd>
          </div>
          <div>
            <dt>Access role</dt>
            <dd>{employeeRoleLabel(employee.role)}</dd>
          </div>
        </dl>
      </header>
      <EmployeeProfileTabs
        details={
          <>
            <section className="profile-editor employee-core-management">
              <div className="employee-profile-section-heading">
                <div>
                  <h2>Employee details</h2>
                  <p>
                    Manage contact information and workplace access. Historical
                    records stay intact.
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
                  remains available in Scheduling.
                </p>
              )}
            </section>
            {canManageCore && employee.active ? (
              <section className="profile-pin">
                <span className="profile-pin-icon" aria-hidden="true">
                  <KeyIcon size={22} />
                </span>
                <div>
                  <h2>Clocker PIN</h2>
                  <p>Shared-tablet access, separate from portal sign-in.</p>
                </div>
                <Link
                  className="button secondary"
                  href={`/app/employees/${encodeURIComponent(employee.id)}/clocker-pin`}
                >
                  Manage Clocker PIN
                  <ArrowUpRightIcon size={18} aria-hidden="true" focusable="false" />
                </Link>
              </section>
            ) : null}
          </>
        }
        scheduling={
          <section className="profile-editor employee-scheduling-management">
            <div className="employee-profile-section-heading">
              <div>
                <h2>Scheduling profile</h2>
                <p>
                  Positions and eligible locations control where this employee
                  can be considered for scheduling.
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
                <CheckIcon size={18} aria-hidden="true" focusable="false" />
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
        }
      />
    </div>
  );
}
