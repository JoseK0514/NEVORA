import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import {
  employeeInitials,
  employeeRoleLabel,
} from "@/lib/employee-display";
import { formatPhoneNumber } from "@/lib/phone";

export default async function EmployeesPage() {
  await requireRoles(MANAGER_ROLES);

  const [employees, locations] = await Promise.all([
    listEmployees(),
    listLocations(),
  ]);

  return (
    <div className="employee-directory-page">
      <PageHeader
        eyebrow="Team"
        title="Employees"
        description="A clean directory of the people scheduled across your workspace."
        actions={
          <Link className="button primary" href="/app/employees/new">
            Add Employee
          </Link>
        }
      />

      <section className="employee-directory-card">
        {employees.length ? (
          <div className="employee-profile-feed">
            {employees.map((employee) => {
              const primaryLocation = locations.find(
                (location) => location.id === employee.primaryLocationId,
              );

              return (
                <article className="employee-profile-row" key={employee.id}>
                  <div className="employee-profile-main">
                    <span className="employee-profile-avatar" aria-hidden="true">
                      {employeeInitials(employee.firstName, employee.lastName)}
                    </span>

                    <div className="employee-profile-copy">
                      <strong>
                        {employee.firstName} {employee.lastName}
                      </strong>
                      <span className="employee-profile-meta">
                        {formatPhoneNumber(employee.phone)}
                      </span>
                      <span className="employee-profile-meta">
                        {primaryLocation?.shortName ?? "Location not assigned"}
                      </span>
                    </div>
                  </div>

                  <div className="employee-profile-actions">
                    <StatusPill tone={employee.active ? "success" : "neutral"}>
                      {employee.active ? "Active" : "Inactive"}
                    </StatusPill>
                    <span className="employee-role-badge">
                      {employeeRoleLabel(employee.role)}
                    </span>

                    <Link
                      className="employee-profile-view"
                      href={`/app/employees/${encodeURIComponent(employee.id)}`}
                    >
                      View Profile
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="employee-directory-empty">
            <span aria-hidden="true">✓</span>
            <strong>No employees yet</strong>
            <small>Add the first employee to begin scheduling.</small>
          </div>
        )}
      </section>
    </div>
  );
}