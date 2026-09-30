import Link from "next/link";
import "./employee-create-premium.css";
import { NavIcon } from "@/components/nav-icon";
import { EmployeeCreateForm } from "@/components/employee-create-form";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/employees";

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireRoles(MANAGER_ROLES);
  const locations = await listLocations();
  const params = await searchParams;

  return (
    <div className="employee-create-page">
      <section className="employee-create-hero">
        <div className="employee-create-hero-copy">
          <p>Team</p>
          <h1>Add employee</h1>
          <span>Create the employee profile used for scheduling and account activation.</span>
        </div>

        <Link className="button secondary employee-create-cancel-top" href="/app/employees">
          <span aria-hidden="true">×</span>
          Cancel
        </Link>
      </section>

      {params.error ? (
        <p className="form-error employee-create-error">
          {params.error === "permission"
            ? "Only an owner can create another owner."
            : params.error === "save"
              ? "Employee could not be saved. Check that the ID and email are not already in use."
              : "Complete all required employee fields."}
        </p>
      ) : null}

      <section className="employee-create-layout">
        <EmployeeCreateForm
          locations={locations.map((location) => ({
            id: location.id,
            name: location.name,
            shortName: location.shortName,
          }))}
          canCreateOwner={session.role === "OWNER"}
        />

        <aside className="employee-setup-rail">
          <section className="employee-setup-card">
            <div className="employee-setup-heading">
              <span className="employee-setup-heading-icon" aria-hidden="true">
                <NavIcon name="employees" size={24} />
              </span>
              <span>
                <strong>Employee setup</strong>
                <small>A quick and easy process.</small>
              </span>
            </div>

            <div className="employee-setup-steps">
              <div>
                <span>1</span>
                <p>
                  <strong>Profile</strong>
                  <small>Add the employee’s basic information, role, and location access.</small>
                </p>
              </div>
              <div>
                <span>2</span>
                <p>
                  <strong>Location access</strong>
                  <small>Select the locations where they can be scheduled.</small>
                </p>
              </div>
              <div>
                <span>3</span>
                <p>
                  <strong>Employee activates account</strong>
                  <small>They create their own password using their Employee ID and phone number.</small>
                </p>
              </div>
            </div>

            <div className="employee-setup-help">
              <span aria-hidden="true">?</span>
              <p>
                <strong>Need help?</strong>
                <small>Contact an admin if you need assistance adding an employee.</small>
              </p>
            </div>

            <div className="employee-setup-brand" aria-hidden="true">
              <span>People</span>
              <span>Fuel</span>
              <span>Possibility.</span>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
