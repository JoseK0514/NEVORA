import Link from "next/link";
import { DEFAULT_WORDS, lower, type WordSlots } from "@/lib/workspace-presentation/words";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react/dist/ssr";
import type { Employee, Location, Position } from "@/lib/domain";
import { employeeInitials, employeeRoleLabel } from "@/lib/employee-display";
import { formatPhoneNumber } from "@/lib/phone";
import { hasDirectoryFilters, type DirectoryFilters } from "@/lib/employee-directory";
import { CorpAvatar, CorpBody, CorpButtonLink, CorpCard, CorpLink, CorpPage, CorpRow, CorpRows, CorpTitle } from "./corp/corp";
import { EmployeeDirectoryFilters } from "./employee-directory-filters";
import { TeamLivePill, TeamLiveProvider, TeamWorkingNow } from "./team-live";
import "./employee-directory-corp.css";

/** How many people the People card shows before "Show all N" (Jose: don't overwhelm). */
export const TEAM_SHOWN = 8;

export function EmployeeDirectory({ employees, visibleEmployees, locations, filters, positions = [], recovery = true, clockerRecovery = false, words = DEFAULT_WORDS.en, showAll = false }: {
  /** Position names for each person's detail line. */
  positions?: readonly Pick<Position, "id" | "name">[];
  /** The recovery tools, for roles that have them. */
  recovery?: boolean;
  clockerRecovery?: boolean;
  /** Company vocabulary (B2). */
  words?: WordSlots;
  employees: readonly Employee[]; visibleEmployees: readonly Employee[];
  locations: readonly Location[]; filters: DirectoryFilters;
  /** "Show all N" was chosen (?all=1). */
  showAll?: boolean;
}) {
  const filtered = hasDirectoryFilters(filters);
  const locationsById = new Map(locations.map(location => [location.id, location]));
  const people = lower(words.people), person = lower(words.person);
  const positionName = new Map(positions.map(position => [position.id, position.name]));
  // Corporate (Release 1, board G-O-Team): one People card, active people by name, "Position · Location" and who's working.
  const byName = (a: Employee, b: Employee) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "en");
  const active = visibleEmployees.filter(employee => employee.active).sort(byName);
  const inactive = visibleEmployees.filter(employee => !employee.active).sort(byName);
  const activeCount = employees.filter(employee => employee.active).length;
  const all = showAll || filtered;
  const shown = all ? active : active.slice(0, TEAM_SHOWN);
  const where = (employee: Employee) => { const location = locationsById.get(employee.primaryLocationId); return location ? `${location.shortName}${location.active ? "" : " (Inactive)"}` : "Location not assigned"; };
  const role = (employee: Employee) => employee.positionIds.map(id => positionName.get(id)).filter(Boolean)[0] ?? employeeRoleLabel(employee.role);
  const row = (employee: Employee) => {
    const name = `${employee.firstName} ${employee.lastName}`;
    return <li key={employee.id}><CorpRow href={`/app/employees/${encodeURIComponent(employee.id)}`} bold title={name} detail={`${role(employee)} · ${where(employee)}`}
      avatar={<CorpAvatar initials={employeeInitials(employee.firstName, employee.lastName)} grey={!employee.active} />}
      trail={employee.active ? <TeamLivePill employeeId={employee.id} /> : <span className="c-pill c-pill--neutral">Inactive</span>} chevron={false}
      label={`${name}, ${employeeRoleLabel(employee.role)}, ${where(employee)}${employee.phone ? `, ${formatPhoneNumber(employee.phone)}` : ""}${employee.active ? "" : ", inactive"}`} /></li>;
  };
  return (
    <TeamLiveProvider>
    <CorpPage className="c-team" labelledBy="team-title">
      <CorpTitle id="team-title" title="Team" sub={<>{`${activeCount} ${activeCount === 1 ? person : people}`}<TeamWorkingNow /></>}
        actions={<CorpButtonLink href="/app/employees/new" kind="secondary" size="xs" aria-label={`Add ${person}`}><Plus className="c-ic c-ic--s" weight="bold" aria-hidden="true" />Add</CorpButtonLink>} />
      <EmployeeDirectoryFilters className="c-team-search">
        {/* Without scripts, Enter and this button apply the search; with scripts it applies as you type (IS-35). */}
        <button type="submit" name="status" value={filters.status} className="c-sr" data-apply="">Apply search</button>
        {filters.role ? <input type="hidden" name="role" value={filters.role} /> : null}
        {filters.location ? <input type="hidden" name="location" value={filters.location} /> : null}
        <label className="c-in c-team-search__field">
          <span className="c-sr">Search {people}</span>
          <MagnifyingGlass className="c-ic" aria-hidden="true" />
          <input key={filters.query} name="q" type="search" defaultValue={filters.query} placeholder="Search by name or position" maxLength={128} />
        </label>
      </EmployeeDirectoryFilters>
      <p className="c-sr" role="status" aria-live="polite" aria-atomic="true">{filtered ? `${visibleEmployees.length} of ${employees.length} ${employees.length === 1 ? person : people}` : ""}</p>
      {active.length ? <CorpCard id="team-people" label={filtered ? `${active.length} ${active.length === 1 ? "match" : "matches"}` : "People"}
        aside={!all && active.length > TEAM_SHOWN ? <CorpLink href="/app/employees?all=1" label={`Show all ${active.length} ${people}`}>{`Show all ${active.length}`}</CorpLink> : undefined}>
        <CorpRows label={people}>{shown.map(row)}</CorpRows>
      </CorpCard> : inactive.length ? null : <CorpCard as="div" ariaLabel={people}><CorpBody>
        <p className="c-team__empty">{employees.length ? `No ${people} match “${filters.query}”.` : `No ${people} yet.`}</p>
        <CorpButtonLink href={employees.length ? "/app/employees" : "/app/employees/new"} kind={employees.length ? "secondary" : "primary"} size="md">{employees.length ? "Clear search" : `Add ${person}`}</CorpButtonLink>
      </CorpBody></CorpCard>}
      {inactive.length && (all || !active.length) ? <CorpCard id="team-inactive" label={`Inactive (${inactive.length})`}><CorpRows label={`Inactive ${people}`}>{inactive.map(row)}</CorpRows></CorpCard> : null}
      <CorpCard as="div" ariaLabel="Team tools">
        <CorpRows label="Team tools">
          <li><CorpRow href="/app?view=team" bold title="Hours this week" detail="Scheduled hours, person by person" chevron /></li>
          {recovery ? <li><CorpRow href="/app/account-recovery" bold title="Help someone sign in" detail="Reset a password or recover an account" chevron /></li> : null}
          {recovery && clockerRecovery ? <li><CorpRow href="/app/clocker-recovery" bold title="Clocker PIN" detail="Reset someone’s PIN for the Clocker" chevron /></li> : null}
          {!all && employees.some(employee => !employee.active) ? <li><CorpRow href="/app/employees?all=1#team-inactive" bold title="Inactive people" detail={`${employees.filter(employee => !employee.active).length} no longer active`} chevron /></li> : null}
        </CorpRows>
      </CorpCard>
    </CorpPage>
    </TeamLiveProvider>
  );
}
