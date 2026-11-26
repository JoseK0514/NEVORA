
import { DEFAULT_WORDS, WORD_PRESETS, lower, type WordSlots } from "@/lib/workspace-presentation/words";
import { Key, MagnifyingGlass, Plus, Timer, UploadSimple, UserCheck, UserMinus } from "@phosphor-icons/react/dist/ssr";
import type { Employee, Location, Position } from "@/lib/domain";
import { employeeInitials } from "@/lib/employee-display";
import { employeeTeamCopy, type TeamLang } from "./employee-team-copy";
import { hasDirectoryFilters, type DirectoryFilters } from "@/lib/employee-directory";
import { CorpAvatar, CorpBody, CorpButtonLink, CorpCard, CorpLink, CorpPage, CorpRow, CorpRows, CorpSection, CorpTitle } from "./corp/corp";
import { EmployeeDirectoryFilters, EmployeeSearchInput } from "./employee-directory-filters";
import { TeamLivePill, TeamLiveProvider } from "./team-live";
import { TeamDeskPeople } from "./team-desk-people";
import "./employee-directory-corp.css";
import { TeamB, type TeamBPerson } from "./owner-b/team-b";

/** How many people the People card shows before "See all" (Jose: don't overwhelm). */
export const TEAM_SHOWN = 8;

export function EmployeeDirectory({ employees, visibleEmployees, locations, filters, positions = [], recovery = true, clockerRecovery = false, canImport = false, words: wordsIn = DEFAULT_WORDS.en, showAll = false, lang = "en" }: {
  /** The person's language (signed-in Spanish); the page passes readPortalLanguage. English by default. */
  lang?: TeamLang;
  /** Position names for each person's detail line. */
  positions?: readonly Pick<Position, "id" | "name">[];
  /** The recovery tools, for roles that have them. */
  recovery?: boolean;
  /** The Owner also resets Clocker PINs (Employee PINs is Owner-only). */
  clockerRecovery?: boolean;
  /** Owners see "Import a staff list" (the roster import is Owner-only). */
  canImport?: boolean;
  /** Company vocabulary (B2). */
  words?: WordSlots;
  employees: readonly Employee[]; visibleEmployees: readonly Employee[];
  locations: readonly Location[]; filters: DirectoryFilters;
  /** "Show all N" was chosen (?all=1). */
  showAll?: boolean;
}) {
  const t = employeeTeamCopy(lang);
  // The company vocabulary arrives in English; a known preset reads in its Spanish form.
  const words = lang === "es" ? WORD_PRESETS.find(preset => preset.en.person === wordsIn.person && preset.en.people === wordsIn.people)?.es ?? wordsIn : wordsIn;
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
  const where = (employee: Employee) => { const location = locationsById.get(employee.primaryLocationId); return location ? `${location.shortName}${location.active ? "" : t.inactiveSuffix}` : t.locationNotAssigned; };
  // The position first; a Manager or Owner also shows their role (Owner premium R7: the screen matches what it announces).
  // Lead is on hold, so it is never added.
  const role = (employee: Employee) => {
    const position = employee.positionIds.map(id => positionName.get(id)).filter(Boolean)[0];
    return position ? (employee.role === "MANAGER" || employee.role === "OWNER" ? `${position} · ${t.roles[employee.role]}` : position) : t.roles[employee.role];
  };
  const row = (employee: Employee) => {
    const name = `${employee.firstName} ${employee.lastName}`;
    return <li key={employee.id}><CorpRow href={`/app/employees/${encodeURIComponent(employee.id)}`} bold title={name} detail={`${role(employee)} · ${where(employee)}`}
      avatar={<CorpAvatar name={`${employee.firstName} ${employee.lastName}`} initials={employeeInitials(employee.firstName, employee.lastName)} grey={!employee.active} />}
      trail={employee.active ? <TeamLivePill employeeId={employee.id} /> : undefined} chevron /></li>;
  };
  // Direction B (Jose approved Nov 5, 2026; mock "Owner · Team"): the phone screen, from the same list, links and search.
  const bPerson = (employee: Employee): TeamBPerson => {
    const name = `${employee.firstName} ${employee.lastName}`;
    return { id: employee.id, name, detail: `${role(employee)} · ${where(employee)}`, href: `/app/employees/${encodeURIComponent(employee.id)}`, active: employee.active };
  };
  const inactiveCount = employees.filter(employee => !employee.active).length;
  // Gaps G49 (Nov 23, 2026): "See all", without the count, on phones and desktop, as a location Manager's Team says it:
  // the title already says how many (each fact once).
  const seeAll = !all && active.length > TEAM_SHOWN ? { href: "/app/employees?all=1", label: t.seeAll } : undefined;
  // Nov 14, 2026 inspection: Availability is one tap from Team (AR-9), and an Owner can import a staff list.
  const bTools = [
    { href: "/app?view=team", title: t.hoursThisWeek, detail: t.hoursThisWeekDetail, icon: "hours" as const },
    { href: "/app/availability", title: t.availability, detail: t.availabilityDetail, icon: "availability" as const },
    ...(canImport ? [{ href: "/app/employees/import", title: t.importList, detail: t.importListDetail, icon: "import" as const }] : []),
    ...(recovery ? [{ href: "/app/account-recovery", title: t.helpSignIn, detail: clockerRecovery ? t.resetPasswordOrPin : t.resetPasswordOrSignIn, icon: "key" as const }] : []),
    ...(!all && inactiveCount ? [{ href: "/app/employees?all=1#team-inactive", title: t.inactivePeople, detail: t.noLongerActive(inactiveCount), icon: "inactive" as const }] : []),
  ];
  return (
    <TeamLiveProvider>
    <CorpPage className="c-team c-page--narrow" labelledBy="team-title">
      <TeamB people={active.map(bPerson)} limit={all ? undefined : TEAM_SHOWN} inactive={inactive.length && (all || !active.length) ? inactive.map(bPerson) : []} total={activeCount} query={filters.query} filtered={filtered}
        people_word={words.people} person_word={person} tools={bTools} status={filters.status}
        seeAll={seeAll}
        searchHidden={<>{filters.role ? <input type="hidden" name="role" value={filters.role} /> : null}{filters.location ? <input type="hidden" name="location" value={filters.location} /> : null}</>} />
      <CorpTitle id="team-title" title={t.team} sub={t.countOf(activeCount, activeCount === 1 ? person : people)}
        actions={<CorpButtonLink href="/app/employees/new" size="md"><Plus className="c-ic c-ic--s" weight="bold" aria-hidden="true" />{t.addPerson(person)}</CorpButtonLink>} />
      <EmployeeDirectoryFilters className="c-team-search" pendingLabel={t.updatingEmployees}>
        {/* Without scripts, Enter and this button apply the search; with scripts it applies as you type (IS-35). */}
        <button type="submit" name="status" value={filters.status} className="c-sr" data-apply="" tabIndex={-1}>{t.applySearch}</button>
        {filters.role ? <input type="hidden" name="role" value={filters.role} /> : null}
        {filters.location ? <input type="hidden" name="location" value={filters.location} /> : null}
        <label className="c-in c-team-search__field">
          <span className="c-sr">{t.searchPeopleSr(people)}</span>
          <MagnifyingGlass weight="bold" className="c-ic" aria-hidden="true" />
          {/* Phase 8 (a.md #30): one placeholder at every width (it was cut to "Search by name or pos" on phones). */}
          <EmployeeSearchInput query={filters.query} placeholder={t.searchPeople} />
        </label>
      </EmployeeDirectoryFilters>
      <p className="c-sr" role="status" aria-live="polite" aria-atomic="true">{filtered ? t.filteredCount(visibleEmployees.length, employees.length, employees.length === 1 ? person : people) : ""}</p>
      {/* Owner premium R5: list pages put the group's label above its card (CorpSection), "See all" on its line. */}
      {active.length ? <CorpSection id="team-people" label={filtered ? t.matches(active.length) : t.people}
        aside={seeAll ? <CorpLink href={seeAll.href}>{seeAll.label}</CorpLink> : undefined}>
        {/* Closing F1 (NV-091): the phone's filters and live chips, with a chevron on each row (team-desk-people.tsx). */}
        <TeamDeskPeople peopleLabel={people} limit={all ? undefined : TEAM_SHOWN} rows={active.map(employee => {
          const name = `${employee.firstName} ${employee.lastName}`;
          return { id: employee.id, name, initials: employeeInitials(employee.firstName, employee.lastName), detail: `${role(employee)} · ${where(employee)}`,
            href: `/app/employees/${encodeURIComponent(employee.id)}` };
        })} />
      </CorpSection> : inactive.length ? null : <CorpCard as="div" ariaLabel={people}><CorpBody>
        <p className="c-team__empty">{employees.length ? t.noMatch(people, filters.query) : t.noneYet(people)}</p>
        <CorpButtonLink href={employees.length ? "/app/employees" : "/app/employees/new"} kind={employees.length ? "secondary" : "primary"} size="md">{employees.length ? t.clearSearch : t.addPerson(person)}</CorpButtonLink>
      </CorpBody></CorpCard>}
      {inactive.length && (all || !active.length) ? <CorpSection id="team-inactive" label={t.inactiveCount(inactive.length)}><CorpCard as="div"><CorpRows label={t.inactivePeopleLabel(people)}>{inactive.map(row)}</CorpRows></CorpCard></CorpSection> : null}
      <CorpCard as="div" ariaLabel={t.teamTools}>
        <CorpRows label={t.teamTools}>
          {/* Phase 8 (a.md #39): each tool leads with its circle, as on the phone and in Things to do's rail. */}
          <li><CorpRow href="/app?view=team" bold icon={<Timer className="c-ic" weight="bold" />} title={t.hoursThisWeek} detail={t.hoursThisWeekDetail} chevron /></li>
          <li><CorpRow href="/app/availability" bold icon={<UserCheck className="c-ic" weight="bold" />} title={t.availability} detail={t.availabilityDetail} chevron /></li>
          {canImport ? <li><CorpRow href="/app/employees/import" bold icon={<UploadSimple className="c-ic" weight="bold" />} title={t.importList} detail={t.importListDetail} chevron /></li> : null}
          {/* Board G-O-Team: one row for both ways back in. Its page resets a password and, for an Owner, links to Employee PINs. */}
          {recovery ? <li><CorpRow href="/app/account-recovery" bold icon={<Key className="c-ic" weight="bold" />} title={t.helpSignIn} detail={clockerRecovery ? t.resetPasswordOrPin : t.resetPasswordOrSignIn} chevron /></li> : null}
          {!all && employees.some(employee => !employee.active) ? <li><CorpRow href="/app/employees?all=1#team-inactive" bold icon={<UserMinus className="c-ic" weight="bold" />} title={t.inactivePeople} detail={t.noLongerActive(employees.filter(employee => !employee.active).length)} chevron /></li> : null}
        </CorpRows>
      </CorpCard>
    </CorpPage>
    </TeamLiveProvider>
  );
}
