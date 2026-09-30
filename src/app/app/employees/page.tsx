import Link from "next/link";
import "./employees-premium.css";
import { NavIcon } from "@/components/nav-icon";
import { StatusPill } from "@/components/status-pill";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import { formatPhoneNumber } from "@/lib/phone";

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
  const roles = Array.from(new Set(employees.map((employee) => employee.role)));

  return (
    <div className="employees-page">
      <section className="employees-hero">
        <div className="employees-hero-copy">
          <p>Team</p>
          <h1>Your team</h1>
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

      <section className="employees-toolbar" aria-label="Employee filters">
        <label className="employees-search">
          <NavIcon name="requests" size={18} />
          <input type="search" placeholder="Search employees..." aria-label="Search employees" />
        </label>

        <div className="employees-filter-group">
          <label>
            <span className="sr-only">Role</span>
            <select defaultValue="">
              <option value="">All roles</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role[0]}{role.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Location</span>
            <select defaultValue="">
              <option value="">All locations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.shortName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Status</span>
            <select defaultValue="active">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
      </section>

      <section className="employees-directory">
        <div className="employees-table-head" aria-hidden="true">
          <span>Employee</span>
          <span>Role</span>
          <span>Primary location</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        <div className="employees-table-body">
          {employees.length === 0 ? (
            <div className="employees-empty-state">
              <span aria-hidden="true">
                <NavIcon name="employees" size={24} />
              </span>
              <strong>No employees yet</strong>
              <small>Add the first employee to begin scheduling.</small>
              <Link className="button primary" href="/app/employees/new">
                Add Employee
              </Link>
            </div>
          ) : (
            employees.map((employee) => {
              const primary = locations.find(
                (location) => location.id === employee.primaryLocationId,
              );

              return (
                <article className="employees-table-row" key={employee.id}>
                  <div className="employees-person">
                    <span className="employees-avatar" aria-hidden="true">
                      {employee.firstName[0]}{employee.lastName[0]}
                    </span>
                    <span className="employees-person-copy">
                      <strong>{employee.firstName} {employee.lastName}</strong>
                      <small>{employee.id} · {formatPhoneNumber(employee.phone)}</small>
                    </span>
                  </div>

                  <span className="employees-role">
                    {employee.role[0]}{employee.role.slice(1).toLowerCase()}
                  </span>

                  <span className="employees-location">
                    {primary?.shortName ?? "—"}
                  </span>

                  <StatusPill tone={employee.active ? "success" : "neutral"}>
                    {employee.active ? "Active" : "Inactive"}
                  </StatusPill>

                  <div className="employees-row-actions">
                    <button className="employees-view-button" type="button">
                      View profile
                      <span aria-hidden="true">›</span>
                    </button>
                    <button
                      className="employees-more-button"
                      type="button"
                      aria-label={`More actions for ${employee.firstName} ${employee.lastName}`}
                    >
                      ⋮
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="employees-brand-card" aria-label="Fuel Coffee Drive">
        <div>
          <strong>Great teams<br />start with great people.</strong>
          <small>People Fuel Possibility.</small>
        </div>
      </section>
    </div>
  );
}
