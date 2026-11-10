"use client";
import { useState, type ReactNode } from "react";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { ChartBarIcon } from "@phosphor-icons/react/dist/ssr/ChartBar";
import { KeyIcon } from "@phosphor-icons/react/dist/ssr/Key";
import { UserMinusIcon } from "@phosphor-icons/react/dist/ssr/UserMinus";
import { EmployeeDirectoryFilters, EmployeeSearchInput } from "@/components/employee-directory-filters";
import { useTeamLive } from "@/components/team-live";
import { BAvatar, BButtonLink, BCard, BChip, BFilters, BHero, BIcon, BList, BRow, BScreen, BStack } from "./b-kit";

/* Direction B, Team on a phone (mock screen "Owner · Team"). The same people, links, search and tools as the corporate
 * page; faces carry a status ring and a chip from the Team live read (Working, On break, Late, Off today). The chips above
 * the list filter it on the device; search still goes through the page's own search, as before. */

export type TeamBPerson = { id: string; name: string; detail: string; href: string; label: string; active: boolean };
type Filter = "all" | "working" | "late" | "off";

const lateText = (minutes: number) => minutes >= 60 ? `Late ${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}` : `Late ${minutes} min`;

export function TeamB({ people, inactive, total, query, filtered, people_word, person_word, seeAll, tools, searchHidden, status, limit }: {
  people: TeamBPerson[]; inactive: TeamBPerson[]; total: number; query: string; filtered: boolean; people_word: string; person_word: string;
  /** "See all N" when the list is cut short. */ seeAll?: { href: string; label: string };
  tools: { href: string; title: string; detail: string; icon: "hours" | "key" | "inactive" }[];
  /** Hidden fields the page's search keeps (role, location). */ searchHidden?: ReactNode;
  /** The directory's status filter, kept by the search's Apply button. */ status: string;
  /** Rows shown under All before "See all" (the filters count everyone). */ limit?: number;
}) {
  const live = useTeamLive();
  const [filter, setFilter] = useState<Filter>("all");
  const state = (id: string) => !live.ready ? null : live.working.has(id) ? "working" : live.onBreak.has(id) ? "break" : live.late.has(id) ? "late" : live.scheduled.has(id) ? "later" : "off";
  const working = people.filter(person => ["working", "break"].includes(state(person.id) ?? "")).length;
  const late = people.filter(person => state(person.id) === "late").length;
  const off = people.filter(person => state(person.id) === "off").length;
  const shown = people.filter(person => filter === "all" || (filter === "working" ? ["working", "break"].includes(state(person.id) ?? "") : filter === "late" ? state(person.id) === "late" : state(person.id) === "off"));
  const lowerPeople = people_word.toLowerCase();
  const sub = `${total} ${total === 1 ? person_word : lowerPeople}${live.ready ? late ? ` · ${late} late now` : working ? ` · ${working} working now` : " · No one working now" : ""}`;
  const row = (person: TeamBPerson) => {
    const now = person.active ? state(person.id) : null;
    const chip = !person.active ? <BChip>Inactive</BChip> : now === "working" ? <BChip tone="green">Working</BChip> : now === "break" ? <BChip tone="teal">On break</BChip>
      : now === "late" ? <BChip tone="amber">{lateText(live.late.get(person.id) ?? 0)}</BChip> : now === "off" ? <BChip>Off today</BChip> : undefined;
    return <BRow key={person.id} href={person.href} label={person.label} lead={<BAvatar name={person.name} size={40} ring={now === "late" ? "late" : now === "working" || now === "break" ? "on" : undefined} />}
      title={person.name} chip={chip} sub={person.detail} />;
  };
  const icon = (name: "hours" | "key" | "inactive") => name === "hours" ? <ChartBarIcon weight="bold" /> : name === "key" ? <KeyIcon weight="bold" /> : <UserMinusIcon weight="bold" />;
  return <BScreen>
    <BHero title="Team" titleId="b-team-title" sub={sub} right={<BButtonLink href="/app/employees/new" kind="white" label={`Add ${person_word}`}><PlusIcon size={17} weight="bold" aria-hidden="true" />Add</BButtonLink>}>
      <EmployeeDirectoryFilters className="b-search b-glass">
        <button type="submit" name="status" value={status} className="b-sr" data-apply="" tabIndex={-1}>Apply search</button>
        {searchHidden}
        <MagnifyingGlassIcon size={19} aria-hidden="true" />
        <label className="b-search__in"><span className="b-sr">{`Search ${lowerPeople}`}</span><EmployeeSearchInput query={query} placeholder="Search by name or position" /></label>
      </EmployeeDirectoryFilters>
    </BHero>
    <BStack>
      <BCard label={filtered ? `${people.length} ${people.length === 1 ? "match" : "matches"}` : people_word}>
        {live.ready && people.length ? <BFilters label="Show" items={[
          { key: "all", label: "All", count: people.length, current: filter === "all", onSelect: () => setFilter("all") },
          { key: "working", label: "Working", count: working, current: filter === "working", onSelect: () => setFilter("working") },
          { key: "late", label: "Late", count: late, current: filter === "late", onSelect: () => setFilter("late") },
          { key: "off", label: "Off today", count: off, current: filter === "off", onSelect: () => setFilter("off") },
        ]} /> : null}
        {shown.length ? <BList label={people_word}>{(filter === "all" && limit ? shown.slice(0, limit) : shown).map(row)}
          {seeAll && filter === "all" ? <BRow href={seeAll.href} lead={<span className="b-lead-space" aria-hidden="true" />} title={seeAll.label} label={seeAll.label} /> : null}</BList>
          : <p className="b-state">{people.length ? "No one right now." : total ? `No ${lowerPeople} match “${query}”.` : `No ${lowerPeople} yet.`}</p>}
      </BCard>
      {inactive.length ? <BCard title="Inactive" count={inactive.length}><BList label={`Inactive ${lowerPeople}`}>{inactive.map(row)}</BList></BCard> : null}
      <BCard label="Team tools"><BList label="Team tools">{tools.map(tool =>
        <BRow key={tool.href} href={tool.href} lead={<BIcon tone={tool.icon === "inactive" ? "grey" : "teal"}>{icon(tool.icon)}</BIcon>} title={tool.title} sub={tool.detail} />)}</BList></BCard>
    </BStack>
  </BScreen>;
}
