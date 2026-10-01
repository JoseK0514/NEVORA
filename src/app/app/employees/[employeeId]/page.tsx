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
  await requireRoles(MANAGER_ROLES);
  const { employeeId } = await params;

  const [employees, locations] = await Promise.all([
    listEmployees(),
    listLocations(),
  ]);
  const employee = employees.find((item) => item.id === employeeId);

  if (!employee) notFound();

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
              {employeeRoleLabel(employee.role)}
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
    </div>
  );
}