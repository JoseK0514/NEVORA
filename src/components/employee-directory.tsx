import Link from "next/link";
import { DEFAULT_WORDS, lower, type WordSlots } from "@/lib/workspace-presentation/words";
import { CaretRight, MagnifyingGlass, MapPin, UserPlus, Users, X } from "@phosphor-icons/react/dist/ssr";
import type { CSSProperties } from "react";
import type { Employee, Location } from "@/lib/domain";
import { employeeInitials, employeeRoleLabel } from "@/lib/employee-display";
import { formatPhoneNumber } from "@/lib/phone";
import { DIRECTORY_ROLES, hasDirectoryFilters, type DirectoryFilters } from "@/lib/employee-directory";
import { StatusPill } from "./status-pill";
import { EmployeeDirectoryMotion } from "./employee-directory-motion";
import { EmployeeDirectoryFilters } from "./employee-directory-filters";
import styles from "./employee-directory.module.css";

export function EmployeeDirectory({ employees, visibleEmployees, locations, filters, words = DEFAULT_WORDS.en }: {
  /** Company vocabulary (B2). */
  words?: WordSlots;
  employees: readonly Employee[]; visibleEmployees: readonly Employee[];
  locations: readonly Location[]; filters: DirectoryFilters;
}) {
  const activeCount = employees.filter(employee => employee.active).length;
  const filtered = hasDirectoryFilters(filters);
  const locationsById = new Map(locations.map(location => [location.id, location]));
  const locationOptions = [...locations].sort((a, b) => a.shortName.localeCompare(b.shortName, "en"));
  const segments = [
    { value: "all", label: "All", count: employees.length },
    { value: "active", label: "Active", count: activeCount },
    { value: "inactive", label: "Inactive", count: employees.length - activeCount },
  ];
  const selectionStyle: CSSProperties & { "--segment-index": number } = {
    "--segment-index": segments.findIndex(segment => segment.value === filters.status),
  };
  return (
    <EmployeeDirectoryMotion className={styles.directory}>
      <header className={styles.header} data-directory-enter>
        <div><h1>{words.people}</h1><p>Find people, review their details, and manage your team.</p></div>
        <Link className={styles.primaryAction} href="/app/employees/new"><UserPlus size={20} aria-hidden="true" /> Add {lower(words.person)}</Link>
      </header>
      <section className={styles.panel} aria-label="Employee directory" data-directory-enter>
        <EmployeeDirectoryFilters>
          <div className={styles.fields}>
            <label className={styles.searchField}>
              <span>Search employees</span>
              <span className={styles.searchInput}><MagnifyingGlass size={20} aria-hidden="true" />
                <input key={filters.query} name="q" type="search" defaultValue={filters.query} placeholder="Name or employee ID" maxLength={128} />
              </span>
            </label>
            <div className={styles.field}><label htmlFor="directory-role">Role</label>
              <select key={filters.role} id="directory-role" name="role" defaultValue={filters.role}><option value="">All roles</option>
                {DIRECTORY_ROLES.map(role => <option key={role} value={role}>{employeeRoleLabel(role)}</option>)}
              </select>
            </div>
            <div className={styles.field}><label htmlFor="directory-location">Primary location</label>
              <select key={filters.location} id="directory-location" name="location" defaultValue={filters.location}><option value="">All locations</option>
                {locationOptions.map(location => <option key={location.id} value={location.id}>{location.shortName}{location.active ? "" : " (Inactive)"}</option>)}
              </select>
            </div>
            <button type="submit" name="status" value={filters.status} className={styles.applyAction}>Apply filters</button>
          </div>
          <div className={styles.filterSummary}>
            <div className={styles.segments} role="group" aria-label="Employee status" style={selectionStyle}>
              <span className={styles.segmentThumb} aria-hidden="true" />
              {segments.map(segment => <button key={segment.value} type="submit" name="status" value={segment.value} aria-pressed={segment.value === filters.status}>
                {segment.label}<span className={styles.segmentCount}>{segment.count}</span>
              </button>)}
            </div>
            <div className={styles.results}>
              <p role="status" aria-live="polite" aria-atomic="true">{filtered ? `${visibleEmployees.length} of ${employees.length}` : employees.length} {employees.length === 1 ? "employee" : "employees"}</p>
              {filtered ? <Link href="/app/employees" className={styles.clearAction}><X size={16} aria-hidden="true" /> Clear filters</Link> : null}
            </div>
          </div>
        </EmployeeDirectoryFilters>
        {visibleEmployees.length ? <table className={styles.table} role="table" aria-label="Employees">
          <thead role="rowgroup"><tr role="row">{["Employee", "Role", "Primary location", "Phone", "Status", "Profile"].map(label => <th scope="col" key={label} role="columnheader">{label}</th>)}</tr></thead>
          <tbody role="rowgroup" data-row-nav="tr">{visibleEmployees.map(employee => {
            const location = locationsById.get(employee.primaryLocationId);
            const name = `${employee.firstName} ${employee.lastName}`;
            return <tr key={employee.id} role="row">
              <th scope="row" className={styles.person} role="rowheader">
                <span className={styles.avatar} aria-hidden="true">{employeeInitials(employee.firstName, employee.lastName)}</span>
                <span className={styles.personCopy}><strong>{name}</strong><span className={styles.employeeId}>{employee.id}</span></span>
              </th>
              <td className={styles.role} role="cell">{employeeRoleLabel(employee.role)}</td>
              <td className={styles.location} role="cell"><MapPin size={17} aria-hidden="true" /><span>{location ? `${location.shortName}${location.active ? "" : " (Inactive)"}` : "Location not assigned"}</span></td>
              <td className={styles.phone} role="cell">{formatPhoneNumber(employee.phone)}</td>
              <td className={styles.status} role="cell"><StatusPill tone={employee.active ? "success" : "neutral"}>{employee.active ? "Active" : "Inactive"}</StatusPill></td>
              <td className={styles.profile} role="cell"><Link href={`/app/employees/${encodeURIComponent(employee.id)}`} className={styles.profileAction}>
                View profile <CaretRight size={17} aria-hidden="true" /><span className={styles.srOnly}> for {name}</span>
              </Link></td>
            </tr>;
          })}</tbody>
        </table> : <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true"><Users size={28} weight="duotone" /></span>
          <h2>{employees.length ? "No matching employees" : "Your team starts here"}</h2>
          <p>{employees.length ? "Try a different name or employee ID, or clear your filters to see everyone." : "Add your first employee to start building your team and scheduling their work."}</p>
          <Link className={styles.emptyAction} href={employees.length ? "/app/employees" : "/app/employees/new"}>
            {employees.length ? <><X size={18} aria-hidden="true" /> Clear filters</> : <><UserPlus size={20} aria-hidden="true" /> Add {lower(words.person)}</>}
          </Link>
        </div>}
      </section>
    </EmployeeDirectoryMotion>
  );
}
