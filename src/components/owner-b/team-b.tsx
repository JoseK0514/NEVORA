"use client";
import { useState, type ReactNode } from "react";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { TimerIcon } from "@phosphor-icons/react/dist/ssr/Timer";
import { UserCheckIcon } from "@phosphor-icons/react/dist/ssr/UserCheck";
import { UploadSimpleIcon } from "@phosphor-icons/react/dist/ssr/UploadSimple";
import { KeyIcon } from "@phosphor-icons/react/dist/ssr/Key";
import { UserMinusIcon } from "@phosphor-icons/react/dist/ssr/UserMinus";
import { EmployeeDirectoryFilters, EmployeeSearchInput } from "@/components/employee-directory-filters";
import { TeamLivePill, teamStateOf, useTeamLive } from "@/components/team-live";
import { ownerBCopy, type OwnerBLang } from "./owner-b-copy";
import { useViewLang } from "./use-owner-lang";
import { BAvatar, BButtonLink, BCard, BChip, BFilters, BHero, BIcon, BList, BRow, BScreen, BSegs, BStack } from "./b-kit";

/* Direction B, Team on a phone (mock screen "Owner · Team"). The same people, links, search and tools as the corporate
 * page; faces carry a status ring and a chip from the Team live read (Clocked in, Clocked in late, On break, Not clocked in,
 * Off today: Jose's attendance words, Nov 11, 2026). The chips above the list filter it on the device; search still goes
 * through the page's own search, as before. */

/** `href`: the person's page; a location Manager's rows have none (that page needs company-wide access), so they aren't links. */
export type TeamBPerson = { id: string; name: string; detail: string; href?: string; active: boolean };
type Filter = "all" | "working" | "late" | "off";
export type TeamBToolIcon = "hours" | "availability" | "import" | "key" | "inactive";


export function TeamB({ people, inactive, total, query, filtered, people_word, person_word, seeAll, tools, searchHidden, status, limit, right, clearHref = "/app/employees", searchPlaceholder, lang: langProp }: {
  people: TeamBPerson[]; inactive: TeamBPerson[]; total: number; query: string; filtered: boolean; people_word: string; person_word: string;
  /** "See all" when the list is cut short (the band says how many). */ seeAll?: { href: string; label: string };
  tools: { href: string; title: string; detail: string; icon: TeamBToolIcon }[];
  /** Hidden fields the page's search keeps (role, location). */ searchHidden?: ReactNode;
  /** The directory's status filter, kept by the search's Apply button. */ status: string;
  /** Rows shown under All before "See all" (the filters count everyone). */ limit?: number;
  /** The band's right-hand control: Add by default; a location Manager's place (its chip, or its filter). */ right?: ReactNode;
  /** Where Clear search goes (the page without ?q, keeping a chosen place). */ clearHref?: string;
  /** The search field's placeholder. */ searchPlaceholder?: string;
  /** Signed-in Spanish: the language to draw in (defaults to the person's, from the app layout). */ lang?: OwnerBLang;
}) {
  const lang = useViewLang(langProp), c = ownerBCopy(lang).team;
  const live = useTeamLive();
  const [filter, setFilter] = useState<Filter>("all");
  const state = (id: string) => teamStateOf(live, id);
  const working = people.filter(person => ["working", "break"].includes(state(person.id) ?? "")).length;
  const late = people.filter(person => state(person.id) === "late").length;
  const off = people.filter(person => state(person.id) === "off").length;
  const shown = people.filter(person => filter === "all" || (filter === "working" ? ["working", "break"].includes(state(person.id) ?? "") : filter === "late" ? state(person.id) === "late" : state(person.id) === "off"));
  const lowerPeople = people_word.toLowerCase();
  // Jose (Nov 23, 2026: each count once), for every role (gaps G24): the band says how many people, the filters say how
  // many are clocked in or not, so the band has no "clocked in" figure and All carries no count.
  const sub = `${total} ${total === 1 ? person_word : lowerPeople}`;
  const row = (person: TeamBPerson) => {
    const now = person.active ? state(person.id) : null;
    // Phase 8 (a.md #11, #45; b.md #24): a late arrival is amber, as on Home; "Off today" is the normal state, so it is
    // grey words on the line under the name, not a chip. Phase 9 (spec 3.1): the live state is Home's On now's: quiet grey
    // words for the normal states ("Clocked in" with the green live dot, "On break"), an amber chip with the dot only for an
    // exception. It sits beside the name when both fit and drops under the name otherwise, so the name never wraps for it.
    // Final regression review: the line under the name is the kit's facts line (BSegs), so at 320 no line starts or ends
    // on the dot ("Front counter · Manager · Calle Loíza · Off today").
    const lateIn = now === "working" && live.clockedInLate.has(person.id);
    // Final polish (Nov 20, 2026): one place for the state on every row. It was beside the name on one row, between the name
    // and its line on the next and inside the facts line for "Off today". On phones a status drops under the name and its
    // sub-line (DESIGN.MD, "Status labels"): the Team live label there, grey words for a normal state, a chip for an exception.
    // A location Manager's reads cover only their places, so "nothing here today" is not "Off today" (team-live.tsx).
    const status = !person.active ? <BChip>{c.inactive}</BChip> : now && !(now === "off" && live.partial) ? <TeamLivePill employeeId={person.id} /> : undefined;
    return <BRow key={person.id} href={person.href} lead={<BAvatar name={person.name} size={40} ring={now === "late" || lateIn ? "late" : now === "working" || now === "break" ? "on" : undefined} />}
      title={person.name} sub={person.detail ? <BSegs parts={person.detail.split(" · ")} /> : undefined} extra={status ? <span className="b-row__state">{status}</span> : undefined} />;
  };
  // Premium pass FA (final verification A #15): Hours this week is the timer, the navigation's glyph for it (ChartBar is
  // Insights').
  const icon = (name: TeamBToolIcon) => name === "hours" ? <TimerIcon weight="bold" /> : name === "availability" ? <UserCheckIcon weight="bold" />
    : name === "import" ? <UploadSimpleIcon weight="bold" /> : name === "key" ? <KeyIcon weight="bold" /> : <UserMinusIcon weight="bold" />;
  return <BScreen>
    <BHero title={c.title} titleId="b-team-title" sub={sub} right={right ?? <BButtonLink href="/app/employees/new" kind="white" label={c.addPerson(person_word)}><PlusIcon size={17} weight="bold" aria-hidden="true" />{c.add}</BButtonLink>}>
      <EmployeeDirectoryFilters className="b-search b-glass">
        {/* Nov 14, 2026 inspection (BR-11): the magnifier is the Apply button, on a 44px target (employee-directory-corp.css);
          it was a 1px control. Search still applies as you type, and Enter still submits. */}
        <button type="submit" name="status" value={status} className="b-search__go" data-apply="" tabIndex={-1}><MagnifyingGlassIcon size={19} weight="bold" aria-hidden="true" /><span className="b-sr">{c.apply}</span></button>
        {searchHidden}
        <label className="b-search__in"><span className="b-sr">{c.search(lowerPeople)}</span><EmployeeSearchInput query={query} placeholder={searchPlaceholder ?? c.searchPlaceholder} /></label>
      </EmployeeDirectoryFilters>
    </BHero>
    <BStack>
      <BCard label={filtered ? c.matches(people.length) : people_word}>
        {live.ready && people.length ? <BFilters label={c.show} items={[
          { key: "all", label: c.all, current: filter === "all", onSelect: () => setFilter("all") },
          { key: "working", label: c.onClock, count: working, current: filter === "working", onSelect: () => setFilter("working") },
          { key: "late", label: c.notClockedIn, count: late, current: filter === "late", onSelect: () => setFilter("late") },
          ...(live.partial ? [] : [{ key: "off", label: c.offToday, count: off, current: filter === "off", onSelect: () => setFilter("off") }]),
        ]} /> : null}
        {shown.length ? <BList label={people_word}>{(filter === "all" && limit ? shown.slice(0, limit) : shown).map(row)}
          {seeAll && filter === "all" ? <BRow href={seeAll.href} lead={<span className="b-lead-space" aria-hidden="true" />} title={seeAll.label} /> : null}</BList>
          : <><p className="b-state">{people.length ? (filter === "working" ? c.noneOn : filter === "late" ? c.allIn : c.noneOff) : total ? (query ? c.noMatch(lowerPeople, query) : c.noSearchMatch) : c.none(lowerPeople)}</p>
            {/* Gaps G13 (Nov 23, 2026): an empty search offers Clear search on phones too, as the desktop card does. */}
            {!people.length && total && query ? <div className="b-state-actions b-team-clear"><BButtonLink href={clearHref} kind="ghost">{c.clear}</BButtonLink></div> : null}</>}
      </BCard>
      {inactive.length ? <BCard title={c.inactive} count={inactive.length}><BList label={c.inactivePeople(lowerPeople)}>{inactive.map(row)}</BList></BCard> : null}
      {tools.length ? <BCard label={c.tools}><BList label={c.tools}>{tools.map(tool =>
        // Phase 9 (spec 3.2): every tool row opens a page, so its circle is teal (Inactive people's was grey).
        <BRow key={tool.href} href={tool.href} lead={<BIcon tone="teal">{icon(tool.icon)}</BIcon>} title={tool.title} sub={tool.detail} />)}</BList></BCard> : null}
    </BStack>
  </BScreen>;
}
