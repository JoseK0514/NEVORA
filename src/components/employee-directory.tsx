import Link from "next/link";
import { DEFAULT_WORDS, lower, type WordSlots } from "@/lib/workspace-presentation/words";
import { CaretRight, MagnifyingGlass, UserPlus, Users, X } from "@phosphor-icons/react/dist/ssr";
import type { Employee, Location } from "@/lib/domain";
import { employeeInitials, employeeRoleLabel } from "@/lib/employee-display";
import { formatPhoneNumber } from "@/lib/phone";
import { DIRECTORY_ROLES, filterDirectoryEmployees, hasDirectoryFilters, type DirectoryFilters } from "@/lib/employee-directory";
import { PageBand, Status } from "./kit/kit";
import { KeepSelectedVisible } from "./kit/keep-selected-visible";
import { EmployeeDirectoryFilters } from "./employee-directory-filters";

export function EmployeeDirectory({ employees, visibleEmployees, locations, filters, words = DEFAULT_WORDS.en }: {
  /** Company vocabulary (B2). */
  words?: WordSlots;
  employees: readonly Employee[]; visibleEmployees: readonly Employee[];
  locations: readonly Location[]; filters: DirectoryFilters;
}) {
  // IS-36: status counts follow the other filters (search, role, location).
  const scoped = filterDirectoryEmployees(employees, { ...filters, status: "all" });
  const filtered = hasDirectoryFilters(filters);
  const locationsById = new Map(locations.map(location => [location.id, location]));
  const locationOptions = [...locations].sort((a, b) => a.shortName.localeCompare(b.shortName, "en"));
  const segments = [
    { value: "all", label: "All", count: scoped.length },
    { value: "active", label: "Active", count: scoped.filter(employee => employee.active).length },
    { value: "inactive", label: "Inactive", count: scoped.filter(employee => !employee.active).length },
  ];
  const people = lower(words.people), person = lower(words.person);
  return (
    <div className="nv-page premium-team" data-nv-page="">
      {/* F8: the summary counts people by status. The tab, the band and D-4 all say Team. */}
      {/* Clean Manager (v3): the band says Team and how many people; the Active and Inactive counts live on the filter. */}
      <PageBand title="Team" summary={`${employees.length} ${employees.length === 1 ? person : people}`}
        aside={<Link className="nv-band-control" href="/app/employees/new"><UserPlus size={18} weight="bold" aria-hidden="true" /> Add<span className="premium-band-wide"> {person}</span></Link>} />
      <div className="nv-content">
        <section className="nv-card premium-team-find" aria-labelledby="team-find-title">
          <div className="nv-card__head"><h2 className="nv-card__title" id="team-find-title">Find people</h2>
            <span className="nv-card__meta" role="status" aria-live="polite" aria-atomic="true">{/* One number per idea (v3): the band says the total; this says only how many a filter shows. */}{filtered ? `${visibleEmployees.length} of ${employees.length} ${employees.length === 1 ? person : people}` : ""}</span></div>
          <EmployeeDirectoryFilters className="premium-team-form">
            {/* Without scripts, Enter and this button apply the filters; with scripts they apply as you type (IS-35). */}
            <button type="submit" name="status" value={filters.status} className="nv-link premium-apply sr-only-focusable" data-apply="">Apply filters</button>
            <label className="premium-field premium-field--search">
              <span className="sr-only">Search {people}</span>
              <MagnifyingGlass size={20} aria-hidden="true" />
              <input key={filters.query} name="q" type="search" defaultValue={filters.query} placeholder="Name or ID" maxLength={128} />
            </label>
            <div className="premium-team-selects">
              <label className="premium-field"><span>Role</span>
                <select key={filters.role} id="directory-role" name="role" defaultValue={filters.role}><option value="">All roles</option>
                  {DIRECTORY_ROLES.map(role => <option key={role} value={role}>{employeeRoleLabel(role)}</option>)}
                </select>
              </label>
              <label className="premium-field"><span>Location</span>
                <select key={filters.location} id="directory-location" name="location" defaultValue={filters.location}><option value="">All locations</option>
                  {locationOptions.map(location => <option key={location.id} value={location.id}>{location.shortName}{location.active ? "" : " (Inactive)"}</option>)}
                </select>
              </label>
            </div>
            <div className="nv-filters premium-team-status" role="group" aria-label={`${words.person} status`}>
              {segments.map(segment => <button key={segment.value} type="submit" name="status" value={segment.value} aria-pressed={segment.value === filters.status} aria-label={`${segment.label}, ${segment.count}`} className="nv-filter premium-filter-light">
                {segment.label} <span className="premium-filter-count" aria-hidden="true">{segment.count}</span>
              </button>)}
              {/* Final phone pass: marks overflow (edge fades in every engine) and keeps the chosen status in view. */}
              <KeepSelectedVisible />
            </div>
            <div className="premium-team-actions">
              {filtered ? <Link href="/app/employees" className="nv-link"><X size={16} aria-hidden="true" /> Clear filters</Link> : null}
            </div>
          </EmployeeDirectoryFilters>
        </section>
        {visibleEmployees.length ? <section className="nv-card" aria-labelledby="team-people-title">
          <div className="nv-card__head"><h2 className="nv-card__title" id="team-people-title">{words.people}</h2></div>
          {/* Column names for the wide-screen table; each row's own label says the same four things aloud. */}
          <div className="premium-team-columns" aria-hidden="true"><span>Name</span><span>Role</span><span>{words.location}</span><span>Phone</span></div>
          <ul className="nv-rows" aria-label={words.people} data-row-nav="li">{visibleEmployees.map(employee => {
            const location = locationsById.get(employee.primaryLocationId);
            const name = `${employee.firstName} ${employee.lastName}`;
            const where = location ? `${location.shortName}${location.active ? "" : " (Inactive)"}` : "Location not assigned";
            return <li key={employee.id}>
              <Link className="nv-row" data-leading="true" href={`/app/employees/${encodeURIComponent(employee.id)}`} aria-label={`${name}, ${employeeRoleLabel(employee.role)}, ${where}${employee.phone ? `, ${formatPhoneNumber(employee.phone)}` : ""}${employee.active ? "" : ", inactive"}`}>
                <span className="nv-avatar" aria-hidden="true">{employeeInitials(employee.firstName, employee.lastName)}</span>
                <span className="nv-row__text">
                  <span className="nv-row__title premium-person-name">{name}</span>
                  {/* Phase 4: each part has its own span, so a wide screen lays them out as columns (the dots are hidden there). */}
                  <span className="nv-row__meta"><span className="nv-keep premium-team-role">{employeeRoleLabel(employee.role)}<span className="premium-team-sep">&nbsp;·</span></span> <span className="nv-keep premium-team-where">{where}</span><span className="premium-team-phone"><span className="premium-team-sep"> · </span><span className="nv-nowrap">{formatPhoneNumber(employee.phone)}</span></span></span>
                  {employee.active ? null : <span className="nv-row__status"><Status tone="neutral">Inactive</Status></span>}
                </span>
                <CaretRight className="nv-row__chev" size={18} weight="bold" aria-hidden="true" />
              </Link>
            </li>;
          })}</ul>
        </section> : <section className="nv-card" aria-labelledby="team-empty-title">
          <div className="nv-card__body premium-empty">
            <span className="nv-tile" data-tone="neutral" aria-hidden="true"><Users size={22} weight="bold" /></span>
            <h2 className="nv-card__title" id="team-empty-title">{employees.length ? `No matching ${people}` : "Your team starts here"}</h2>
            <p className="premium-note">{employees.length ? "Try a different name or employee ID, or clear your filters to see everyone." : `Add your first ${person} to start building your team and scheduling their work.`}</p>
            <Link className="nv-btn" data-kind={employees.length ? "secondary" : "primary"} href={employees.length ? "/app/employees" : "/app/employees/new"}>
              {employees.length ? <><X size={18} aria-hidden="true" /> Clear filters</> : <><UserPlus size={20} aria-hidden="true" /> Add {person}</>}
            </Link>
          </div>
        </section>}
      </div>
    </div>
  );
}
