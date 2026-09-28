import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";

export default async function EmployeesPage() {
  await requireRoles(MANAGER_ROLES);

  const [employees, locations] = await Promise.all([
    listEmployees(),
    listLocations(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Employees"
        description="Employee profiles stay intentionally simple and scheduling-focused."
        actions={<Link className="button primary" href="/app/employees/new">Add employee</Link>}
      />

      <section className="panel">
        <div className="table-list">
          {employees.length === 0 ? (
            <div className="empty-state">
              <strong>No employees yet.</strong>
              <span>Add the first employee to begin scheduling.</span>
            </div>
          ) : employees.map((employee) => {
            const primary = locations.find((location) => location.id === employee.primaryLocationId);
            return (
              <article className="employee-row" key={employee.id}>
                <div className="employee-identity">
                  <div className="avatar">{employee.firstName[0]}{employee.lastName[0]}</div>
                  <div>
                    <strong>{employee.firstName} {employee.lastName}</strong>
                    <span>{employee.id} · {employee.phone}</span>
                  </div>
                </div>
                <span>{employee.role[0]}{employee.role.slice(1).toLowerCase()}</span>
                <span>{primary?.shortName ?? "—"}</span>
                <StatusPill tone={employee.active ? "success" : "neutral"}>
                  {employee.active ? "Active" : "Inactive"}
                </StatusPill>
                <button className="button ghost">View</button>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
