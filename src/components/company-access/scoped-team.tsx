import Link from "next/link";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import type { OperationalDirectoryData } from "@/lib/company-access/model";
import { employeeInitials, employeeRoleLabel } from "@/lib/employee-display";
import { DEFAULT_WORDS, lower, type WordSlots } from "@/lib/workspace-presentation/words";
import { ActionMenu } from "@/components/action-menu";
import { CorpBody, CorpButtonLink, CorpCard, CorpLink, CorpPage, CorpSection, CorpTitle } from "@/components/corp/corp";
import { EmployeeDirectoryFilters, EmployeeSearchInput } from "@/components/employee-directory-filters";
import { TEAM_SHOWN } from "@/components/employee-directory";
import { TeamB, type TeamBPerson } from "@/components/owner-b/team-b";
import { TeamDeskPeople } from "@/components/team-desk-people";
import { TeamLiveProvider } from "@/components/team-live";
import "@/components/employee-directory-corp.css";
import { TEAM_LIST_COPY } from "@/components/team-list-copy";
import type { PortalLang } from "@/lib/i18n/portal-lang";

type ScopedDirectory = Extract<OperationalDirectoryData, { mode: "LOCATIONS" }>;

/** Phase 2 (Jose, Nov 22, 2026: "the same screens other Managers have, limited to one location"): a location Manager's
 * Team is the company Manager's Direction B Team (TeamB on a phone, the People card with its filters on tablets and
 * desktop) with the people the scoped read returns: name, role and the places they work. The place is a chip in the band,
 * a filter when there is more than one. Nothing company-wide: no contact details, no Add, no Team tools (each of those
 * pages needs company-wide access). The rows aren't links: a person's page needs company-wide access too, and the
 * schedule has no one-person view to send them to instead. */
export function ScopedTeam({ data, query, locationId, showAll, words = DEFAULT_WORDS.en, lang = "en" }: {
  data: ScopedDirectory;
  /** The search (?q), already trimmed. */ query: string;
  /** The place chosen with the filter (?location); undefined for all of them. Only offered with more than one place. */
  locationId?: string;
  /** "See all N" was chosen (?all=1). */ showAll: boolean;
  /** Company vocabulary (B2). */ words?: WordSlots;
  /** Signed-in Spanish: the page's language (English when left out). */ lang?: PortalLang;
}) {
  const t = TEAM_LIST_COPY[lang];
  const people = lower(words.people), person = lower(words.person);
  const several = data.locations.length > 1;
  const place = locationId ? data.locations.find(location => location.id === locationId) ?? null : several ? null : data.locations[0] ?? null;
  const placeName = place ? place.shortName || place.name : t.allYourLocations;
  const shortName = (id: string) => { const location = data.locations.find(item => item.id === id); return location ? location.shortName || location.name : null; };
  const byName = (a: { firstName: string; lastName: string }, b: { firstName: string; lastName: string }) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "en");
  const here = data.employees.filter(employee => !place || employee.locationIds.includes(place.id)).sort(byName);
  const needle = query.toLocaleLowerCase();
  const shown = needle ? here.filter(employee => `${employee.firstName} ${employee.lastName}`.toLocaleLowerCase().includes(needle)) : here;
  const all = showAll || !!query;
  // Jose (Nov 23, 2026: no repeated wording): the line under a name says only what differs. The role shows for a Manager,
  // Lead or Owner (most people are Employees), and, while all of several places are listed, the places show only for
  // someone who doesn't work at every one of them (one place is said once, in the band).
  const places = (employee: ScopedDirectory["employees"][number]) => employee.locationIds.map(shortName).filter((name): name is string => !!name);
  const detail = (employee: ScopedDirectory["employees"][number]) => [employee.role === "EMPLOYEE" ? null : t.roles[employee.role] ?? employeeRoleLabel(employee.role),
    ...(several && !place && places(employee).length < data.locations.length ? places(employee) : [])].filter(Boolean).join(" · ");
  const name = (employee: ScopedDirectory["employees"][number]) => `${employee.firstName} ${employee.lastName}`;
  const keep = (extra: Record<string, string>) => { const params = new URLSearchParams(); if (place && several) params.set("location", place.id); for (const [key, value] of Object.entries(extra)) params.set(key, value); const text = params.toString(); return `/app/employees${text ? `?${text}` : ""}`; };
  // "See all", without the count: the band says how many (each count once).
  const seeAll = !all && shown.length > TEAM_SHOWN ? { href: keep({ all: "1" }), label: t.seeAll } : undefined;
  const placeHidden = place && several ? <input type="hidden" name="location" value={place.id} /> : null;
  // The place, as the location Manager's Schedule shows it: a chip for one place, a menu of places for several.
  const placeControl = (b: boolean) => several
    ? <ActionMenu id={b ? "b-team-location-menu" : "team-location-menu"} label={t.location} title={t.location} ariaLabel={t.locationIs(placeName)} align="end"
        triggerClassName={b ? "b-btn b-btn--glass" : "c-select-btn c-team-loc"} triggerContent={<><MapPinIcon size={15} weight="bold" className={b ? undefined : "c-ic"} aria-hidden="true" />{placeName}<CaretDownIcon size={13} weight="bold" aria-hidden="true" /></>}>
        <Link className="nevora-action-menu-item" href="/app/employees" aria-current={place ? undefined : "page"}><strong>{t.allYourLocations}</strong></Link>
        {data.locations.map(location => <Link key={location.id} className="nevora-action-menu-item" href={`/app/employees?location=${encodeURIComponent(location.id)}`} aria-current={place?.id === location.id ? "page" : undefined}><strong>{location.shortName || location.name}</strong></Link>)}
      </ActionMenu>
    : <span className={b ? "b-btn b-btn--glass b-team-place" : "c-select-btn c-team-loc"}><MapPinIcon size={15} weight="bold" className={b ? undefined : "c-ic"} aria-hidden="true" /><span className={b ? "b-sr" : "c-sr"}>{`${t.location}: `}</span>{placeName}</span>;
  const bPerson = (employee: ScopedDirectory["employees"][number]): TeamBPerson => ({ id: employee.id, name: name(employee), detail: detail(employee), active: true });
  return <TeamLiveProvider partial locationId={several ? place?.id : undefined}>
    <CorpPage className="c-team c-team--scoped c-page--narrow" labelledBy="team-title">
      <TeamB people={shown.map(bPerson)} limit={all ? undefined : TEAM_SHOWN} inactive={[]} total={here.length} query={query} filtered={!!query}
        people_word={words.people} person_word={person} tools={[]} status="all" seeAll={seeAll} right={placeControl(true)} searchHidden={placeHidden}
        clearHref={keep({})} searchPlaceholder={t.searchByName} lang={lang} />
      <CorpTitle id="team-title" title={t.team} sub={t.count(here.length, person, people)} actions={placeControl(false)} />
      <EmployeeDirectoryFilters className="c-team-search">
        {/* Without scripts, Enter and this button apply the search; with scripts it applies as you type (IS-35). */}
        <button type="submit" name="status" value="all" className="c-sr" data-apply="" tabIndex={-1}>{t.applySearch}</button>
        {placeHidden}
        <label className="c-in c-team-search__field">
          <span className="c-sr">{t.searchFor(people)}</span>
          <MagnifyingGlassIcon weight="bold" className="c-ic" aria-hidden="true" />
          <EmployeeSearchInput query={query} placeholder={t.searchByName} />
        </label>
      </EmployeeDirectoryFilters>
      <p className="c-sr" role="status" aria-live="polite" aria-atomic="true">{query ? t.ofTotal(shown.length, here.length, person, people) : ""}</p>
      {shown.length ? <CorpSection id="team-people" label={query ? t.matches(shown.length) : t.people}
        aside={seeAll ? <CorpLink href={seeAll.href}>{seeAll.label}</CorpLink> : undefined}>
        <TeamDeskPeople peopleLabel={people} limit={all ? undefined : TEAM_SHOWN} rows={shown.map(employee => ({ id: employee.id, name: name(employee),
          initials: employeeInitials(employee.firstName, employee.lastName), detail: detail(employee) }))} />
      </CorpSection> : <CorpCard as="div" ariaLabel={people}><CorpBody>
        <p className="c-team__empty">{here.length ? t.noMatch(people, query) : place ? t.noneAt(people, placeName) : t.noneYet(people)}</p>
        {here.length ? <CorpButtonLink href={keep({})} kind="secondary" size="md">{t.clearSearch}</CorpButtonLink> : null}
      </CorpBody></CorpCard>}
    </CorpPage>
  </TeamLiveProvider>;
}
