import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { employees, locations } from "@/lib/demo-data";

export default function EmployeesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Employees"
        description="Keep employee details intentionally simple and scheduling-focused."
        actions={<button className="button primary">+ Add Employee</button>}
      />

      <section className="panel">
        <div className="table-list">
          {employees.map((employee) => {
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
                <span>{primary?.shortName}</span>
                <StatusPill tone="success">Active</StatusPill>
                <button className="button ghost">View</button>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
