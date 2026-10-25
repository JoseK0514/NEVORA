import Link from "next/link";
import { DEFAULT_WORDS, lower, type WordSlots } from "@/lib/workspace-presentation/words";
import { MagnifyingGlass, UserPlus } from "@phosphor-icons/react/dist/ssr";
import type { Employee, Location, Position } from "@/lib/domain";
import { employeeInitials, employeeRoleLabel } from "@/lib/employee-display";
import { formatPhoneNumber } from "@/lib/phone";
import { hasDirectoryFilters, type DirectoryFilters } from "@/lib/employee-directory";
import { QuietBar, QuietBarIcon, QuietGroup, QuietHeader, QuietPage, QuietRow } from "./quiet/quiet";
import { EmployeeDirectoryFilters } from "./employee-directory-filters";

export function EmployeeDirectory({ employees, visibleEmployees, locations, filters, positions = [], recovery = true, words = DEFAULT_WORDS.en }: {
  /** Position names for each person's detail line. */
  positions?: readonly Pick<Position, "id" | "name">[];
  /** Quiet (v4): the recovery tools, for roles that have them. */
  recovery?: boolean;
  /** Company vocabulary (B2). */
  words?: WordSlots;
  employees: readonly Employee[]; visibleEmployees: readonly Employee[];
  locations: readonly Location[]; filters: DirectoryFilters;
}) {
  const filtered = hasDirectoryFilters(filters);
  const locationsById = new Map(locations.map(location => [location.id, location]));
  const people = lower(words.people), person = lower(words.person);
  // Quiet (v4, approved Oct 23): search, then people grouped by location. Name and position only; who's working lives on Today.
  const positionName = new Map(positions.map(position => [position.id, position.name]));
  const groups = [...locations].sort((a, b) => a.shortName.localeCompare(b.shortName, "en"))
    .map(location => ({ key: location.id, label: `${location.shortName}${location.active ? "" : " (Inactive)"}`, people: visibleEmployees.filter(employee => employee.active && employee.primaryLocationId === location.id) }));
  const unplaced = visibleEmployees.filter(employee => employee.active && !locationsById.has(employee.primaryLocationId));
  if (unplaced.length) groups.push({ key: "unplaced", label: "No location", people: unplaced });
  const inactive = visibleEmployees.filter(employee => !employee.active);
  if (inactive.length) groups.push({ key: "inactive", label: "Inactive", people: inactive });
  const detail = (employee: Employee) => employee.positionIds.map(id => positionName.get(id)).filter(Boolean).join(", ") || employeeRoleLabel(employee.role);
  return (
    <QuietPage className="premium-team">
      <QuietBar><QuietBarIcon href="/app/employees/new" label={`Add ${person}`}><UserPlus className="q-ic" aria-hidden="true" /></QuietBarIcon></QuietBar>
      <QuietHeader title="Team" sub={`${employees.length} ${employees.length === 1 ? person : people}`} />
      <EmployeeDirectoryFilters className="q-team-form">
        {/* Without scripts, Enter and this button apply the search; with scripts it applies as you type (IS-35). */}
        <button type="submit" name="status" value={filters.status} className="q-sr" data-apply="">Apply search</button>
        {filters.role ? <input type="hidden" name="role" value={filters.role} /> : null}
        {filters.location ? <input type="hidden" name="location" value={filters.location} /> : null}
        <label className="q-search">
          <span className="q-sr">Search {people}</span>
          <MagnifyingGlass className="q-ic" aria-hidden="true" />
          <input key={filters.query} name="q" type="search" defaultValue={filters.query} placeholder="Search" maxLength={128} />
        </label>
      </EmployeeDirectoryFilters>
      <p className="q-sr" role="status" aria-live="polite" aria-atomic="true">{filtered ? `${visibleEmployees.length} of ${employees.length} ${employees.length === 1 ? person : people}` : ""}</p>
      {visibleEmployees.length ? groups.filter(group => group.people.length).map(group => <QuietGroup key={group.key} id={`team-${group.key}`} label={group.label}>
        <ul className="q-list" aria-label={group.label} data-row-nav="li">{group.people.map(employee => {
          const location = locationsById.get(employee.primaryLocationId);
          const name = `${employee.firstName} ${employee.lastName}`;
          const where = location ? `${location.shortName}${location.active ? "" : " (Inactive)"}` : "Location not assigned";
          return <QuietRow key={employee.id} href={`/app/employees/${encodeURIComponent(employee.id)}`} chevron={false}
            avatar={employeeInitials(employee.firstName, employee.lastName)} title={name} detail={detail(employee)}
            label={`${name}, ${employeeRoleLabel(employee.role)}, ${where}${employee.phone ? `, ${formatPhoneNumber(employee.phone)}` : ""}${employee.active ? "" : ", inactive"}`} />;
        })}</ul>
      </QuietGroup>) : <>
        <p className="q-empty" style={{ marginTop: 24 }}>{employees.length ? `No ${people} match “${filters.query}”.` : `No ${people} yet.`}</p>
        <Link className={employees.length ? "q-btn q-btn--sec" : "q-btn"} href={employees.length ? "/app/employees" : "/app/employees/new"}>{employees.length ? "Clear search" : `Add ${person}`}</Link>
      </>}
      {/* Quiet (v4): the two recovery tools sit at the end of Team, where their pages lead back to. */}
      {/* P2-20 (final pass): the two sign-in tools have their own 15pt group label under the people list. */}
      {recovery ? <QuietGroup label="Help someone sign in" id="team-sign-in-help"><ul className="q-list">
        <QuietRow href="/app/account-recovery" title="Account recovery" />
        <QuietRow href="/app/clocker-recovery" title="Clocker recovery" />
      </ul></QuietGroup> : null}
    </QuietPage>
  );
}
