"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Employee, Location } from "@/lib/domain";
import { filterEmployees, type EmployeeFilters } from "@/lib/employee-filters";
import { formatPhoneNumber } from "@/lib/phone";
import { NavIcon } from "@/components/nav-icon";
import { StatusPill } from "@/components/status-pill";

export function EmployeesDirectory({ employees, locations }: { employees: Employee[]; locations: Location[] }) {
  const [filters, setFilters] = useState<EmployeeFilters>({ search: "", role: "", locationId: "", status: "active" });
  const visible = useMemo(() => filterEmployees(employees, filters), [employees, filters]);
  const roles = Array.from(new Set(employees.map((employee) => employee.role)));
  const locationsById = new Map(locations.map((location) => [location.id, location]));
  const hasFilters = Boolean(filters.search || filters.role || filters.locationId || filters.status !== "all");

  return (
    <>
      <section className="employees-toolbar" aria-label="Employee filters">
        <label className="employees-search">
          <NavIcon name="search" size={18} />
          <input type="search" placeholder="Search employees..." aria-label="Search employees" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
        </label>

        <div className="employees-filter-group">
          <label>
            <span className="sr-only">Role</span>
            <select aria-label="Role" value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}>
              <option value="">All Roles</option>
              {roles.map((role) => <option key={role} value={role}>{role[0]}{role.slice(1).toLowerCase()}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Location</span>
            <select aria-label="Primary location" value={filters.locationId} onChange={(event) => setFilters((current) => ({ ...current, locationId: event.target.value }))}>
              <option value="">All Locations</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.shortName}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Status</span>
            <select aria-label="Status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as EmployeeFilters["status"] }))}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
      </section>

      <section className="employees-directory" aria-label="Employee directory">
        <div className="employees-table-head" aria-hidden="true">
          <span>Employee</span><span>Role</span><span>Primary Location</span><span>Status</span>
        </div>
        <div className="employees-table-body" aria-live="polite">
          {visible.length === 0 ? (
            <div className="employees-empty-state">
              <span aria-hidden="true"><NavIcon name="employees" size={24} /></span>
              <strong>{employees.length === 0 ? "No Employees Yet" : "No Matching Employees"}</strong>
              <small>{employees.length === 0 ? "Add the first employee to begin scheduling." : "Try a different search or filter."}</small>
              {employees.length === 0 ? <Link className="button primary" href="/app/employees/new">Add Employee</Link> : hasFilters ? <button className="button secondary" type="button" onClick={() => setFilters({ search: "", role: "", locationId: "", status: "all" })}>Clear Filters</button> : null}
            </div>
          ) : visible.map((employee) => (
            <article className="employees-table-row" key={employee.id}>
              <div className="employees-person">
                <span className="employees-avatar" aria-hidden="true">{employee.firstName[0]}{employee.lastName[0]}</span>
                <span className="employees-person-copy">
                  <strong>{employee.firstName} {employee.lastName}</strong>
                  <small>{employee.id} · {formatPhoneNumber(employee.phone)}</small>
                </span>
              </div>
              <span className="employees-role">{employee.role[0]}{employee.role.slice(1).toLowerCase()}</span>
              <span className="employees-location">{locationsById.get(employee.primaryLocationId)?.shortName ?? "—"}</span>
              <StatusPill tone={employee.active ? "success" : "neutral"}>{employee.active ? "Active" : "Inactive"}</StatusPill>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
