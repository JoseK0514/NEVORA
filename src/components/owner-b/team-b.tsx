"use client";
import { useState, type ReactNode } from "react";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { ChartBarIcon } from "@phosphor-icons/react/dist/ssr/ChartBar";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/ssr/CalendarCheck";
import { UploadSimpleIcon } from "@phosphor-icons/react/dist/ssr/UploadSimple";
import { KeyIcon } from "@phosphor-icons/react/dist/ssr/Key";
import { UserMinusIcon } from "@phosphor-icons/react/dist/ssr/UserMinus";
import { EmployeeDirectoryFilters, EmployeeSearchInput } from "@/components/employee-directory-filters";
import { clockedInText, notClockedInText, teamStateOf, useTeamLive } from "@/components/team-live";
import { BAvatar, BButtonLink, BCard, BChip, BFilters, BHero, BIcon, BList, BRow, BScreen, BStack } from "./b-kit";

/* Direction B, Team on a phone (mock screen "Owner · Team"). The same people, links, search and tools as the corporate
 * page; faces carry a status ring and a chip from the Team live read (Clocked in, Clocked in late, On break, Not clocked in,
 * Off today: Jose's attendance words, Nov 11, 2026). The chips above the list filter it on the device; search still goes
 * through the page's own search, as before. */

export type TeamBPerson = { id: string; name: string; detail: string; href: string; label: string; active: boolean };
type Filter = "all" | "working" | "late" | "off";
export type TeamBToolIcon = "hours" | "availability" | "import" | "key" | "inactive";


export function TeamB({ people, inactive, total, query, filtered, people_word, person_word, seeAll, tools, searchHidden, status, limit }: {
  people: TeamBPerson[]; inactive: TeamBPerson[]; total: number; query: string; filtered: boolean; people_word: string; person_word: string;
  /** "See all N" when the list is cut short. */ seeAll?: { href: string; label: string };
  tools: { href: string; title: string; detail: string; icon: TeamBToolIcon }[];
  /** Hidden fields the page's search keeps (role, location). */ searchHidden?: ReactNode;
  /** The directory's status filter, kept by the search's Apply button. */ status: string;
  /** Rows shown under All before "See all" (the filters count everyone). */ limit?: number;
}) {
  const live = useTeamLive();
  const [filter, setFilter] = useState<Filter>("all");
  const state = (id: string) => teamStateOf(live, id);
  const working = people.filter(person => ["working", "break"].includes(state(person.id) ?? "")).length;
  const late = people.filter(person => state(person.id) === "late").length;
  const off = people.filter(person => state(person.id) === "off").length;
  const shown = people.filter(person => filter === "all" || (filter === "working" ? ["working", "break"].includes(state(person.id) ?? "") : filter === "late" ? state(person.id) === "late" : state(person.id) === "off"));
  const lowerPeople = people_word.toLowerCase();
  // Phase 8 (a.md #30): the band says one fact at every width, the one desktop's subtitle says (TeamWorkingNow).
  const sub = `${total} ${total === 1 ? person_word : lowerPeople}${live.ready ? working ? ` · ${working} working now` : " · No one working now" : ""}`;
  const row = (person: TeamBPerson) => {
    const now = person.active ? state(person.id) : null;
    // Phase 8 (a.md #11, #45; b.md #24): a late arrival is amber, as on Home; "Off today" is the normal state, so it is
    // grey words on the line under the name, not a chip.
    const lateIn = now === "working" && live.clockedInLate.has(person.id);
    const chip = !person.active ? <BChip>Inactive</BChip> : now === "working" ? <BChip tone={lateIn ? "amber" : "green"}>{clockedInText(live, person.id)}</BChip> : now === "break" ? <BChip tone="teal">On break</BChip>
      : now === "late" ? <BChip tone="amber">{notClockedInText(live.late.get(person.id) ?? 0)}</BChip> : undefined;
    return <BRow key={person.id} href={person.href} label={person.label} lead={<BAvatar name={person.name} size={40} ring={now === "late" || lateIn ? "late" : now === "working" || now === "break" ? "on" : undefined} />}
      title={person.name} chip={chip} sub={now === "off" ? <>{person.detail}{person.detail ? " · " : ""}Off today</> : person.detail} />;
  };
  const icon = (name: TeamBToolIcon) => name === "hours" ? <ChartBarIcon weight="bold" /> : name === "availability" ? <CalendarCheckIcon weight="bold" />
    : name === "import" ? <UploadSimpleIcon weight="bold" /> : name === "key" ? <KeyIcon weight="bold" /> : <UserMinusIcon weight="bold" />;
  return <BScreen>
    <BHero title="Team" titleId="b-team-title" sub={sub} right={<BButtonLink href="/app/employees/new" kind="white" label={`Add ${person_word}`}><PlusIcon size={17} weight="bold" aria-hidden="true" />Add</BButtonLink>}>
      <EmployeeDirectoryFilters className="b-search b-glass">
        {/* Nov 14, 2026 inspection (BR-11): the magnifier is the Apply button, on a 44px target (employee-directory-corp.css);
          it was a 1px control. Search still applies as you type, and Enter still submits. */}
        <button type="submit" name="status" value={status} className="b-search__go" data-apply="" tabIndex={-1}><MagnifyingGlassIcon size={19} weight="bold" aria-hidden="true" /><span className="b-sr">Apply search</span></button>
        {searchHidden}
        <label className="b-search__in"><span className="b-sr">{`Search ${lowerPeople}`}</span><EmployeeSearchInput query={query} placeholder="Search people" /></label>
      </EmployeeDirectoryFilters>
    </BHero>
    <BStack>
      <BCard label={filtered ? `${people.length} ${people.length === 1 ? "match" : "matches"}` : people_word}>
        {live.ready && people.length ? <BFilters label="Show" items={[
          { key: "all", label: "All", count: people.length, current: filter === "all", onSelect: () => setFilter("all") },
          { key: "working", label: "Clocked in", count: working, current: filter === "working", onSelect: () => setFilter("working") },
          { key: "late", label: "Not clocked in", count: late, current: filter === "late", onSelect: () => setFilter("late") },
          { key: "off", label: "Off today", count: off, current: filter === "off", onSelect: () => setFilter("off") },
        ]} /> : null}
        {shown.length ? <BList label={people_word}>{(filter === "all" && limit ? shown.slice(0, limit) : shown).map(row)}
          {seeAll && filter === "all" ? <BRow href={seeAll.href} lead={<span className="b-lead-space" aria-hidden="true" />} title={seeAll.label} label={seeAll.label} /> : null}</BList>
          : <p className="b-state">{people.length ? (filter === "working" ? "No one is clocked in right now." : filter === "late" ? "Everyone on shift has clocked in." : "No one is off today.") : total ? `No ${lowerPeople} match “${query}”.` : `No ${lowerPeople} yet.`}</p>}
      </BCard>
      {inactive.length ? <BCard title="Inactive" count={inactive.length}><BList label={`Inactive ${lowerPeople}`}>{inactive.map(row)}</BList></BCard> : null}
      <BCard label="Team tools"><BList label="Team tools">{tools.map(tool =>
        <BRow key={tool.href} href={tool.href} lead={<BIcon tone={tool.icon === "inactive" ? "grey" : "teal"}>{icon(tool.icon)}</BIcon>} title={tool.title} sub={tool.detail} />)}</BList></BCard>
    </BStack>
  </BScreen>;
}
