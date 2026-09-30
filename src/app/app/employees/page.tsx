import Link from "next/link";
import "./employees-premium.css";
import { NavIcon } from "@/components/nav-icon";
import { EmployeesDirectory } from "@/components/employees-directory";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";

export default async function EmployeesPage() {
  await requireRoles(MANAGER_ROLES);

  const [employees, locations] = await Promise.all([
    listEmployees(),
    listLocations(),
  ]);

  const activeCount = employees.filter((employee) => employee.active).length;
  const inactiveCount = employees.length - activeCount;
  const missingSetupCount = employees.filter(
    (employee) => !employee.primaryLocationId || !employee.phone,
  ).length;

  return (
    <div className="employees-page">
      <section className="employees-hero">
        <div className="employees-hero-copy">
          <p>Team</p>
          <h1>Your Team</h1>
          <span>Manage employee profiles, roles, locations, and scheduling details.</span>
        </div>
        <Link className="button primary employees-add-button" href="/app/employees/new">
          <span aria-hidden="true">+</span>
          Add Employee
        </Link>
      </section>

      <section className="employees-summary" aria-label="Team summary">
        <div>
          <span className="employees-summary-icon employees">
            <NavIcon name="employees" size={21} />
          </span>
          <span>
            <strong>{activeCount}</strong>
            <small>Active employees</small>
          </span>
        </div>
        <div>
          <span className="employees-summary-icon inactive">
            <NavIcon name="employee" size={21} />
          </span>
          <span>
            <strong>{inactiveCount}</strong>
            <small>Inactive employees</small>
          </span>
        </div>
        <div>
          <span className="employees-summary-icon locations">
            <NavIcon name="location" size={21} />
          </span>
          <span>
            <strong>{locations.length}</strong>
            <small>Locations</small>
          </span>
        </div>
        <div>
          <span className="employees-summary-icon setup">
            <NavIcon name="templates" size={21} />
          </span>
          <span>
            <strong>{missingSetupCount}</strong>
            <small>Missing setup</small>
          </span>
        </div>
      </section>

      <EmployeesDirectory employees={employees} locations={locations} />

      <section className="employees-brand-card" aria-label="Fuel Coffee Drive">
        <div>
          <strong>Great teams<br />start with great people.</strong>
          <small>People Fuel Possibility.</small>
        </div>
      </section>
    </div>
  );
}
