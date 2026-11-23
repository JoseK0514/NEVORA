import type { ReactNode } from "react";
import { BSegs } from "@/components/owner-b/b-kit";
import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { lower, wordPreset } from "@/lib/workspace-presentation/words";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { CorpButtonLink, CorpCard, CorpEmpty, CorpRow, CorpRows } from "@/components/corp/corp";
import { requireRoles } from "@/lib/auth/permissions";
import { listLocations, listEmployees } from "@/lib/data/employees";
import { getWorkspace } from "@/lib/data/workspaces";
import { listPositions } from "@/lib/data/positions";
import { listLocationStaffingSettings, listCoverageWindows } from "@/lib/data/schedule-health";
import { evaluateLocationReadiness } from "@/lib/scheduling/location-readiness";
import { SettingsPageB } from "../settings-b";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Locations" };

type Search = { q?: string | string[]; status?: string | string[] };
type Filter = "all" | "setup" | "ready" | "inactive";
const directoryPath = "/app/settings/locations";

/** The Owner's own name for a place, whole; a spaced em dash is the one place it may break (see the list below). */
function placeName(name: string): ReactNode {
  const parts = name.split(" — ");
  return parts.length > 1 ? <BSegs className="b-segs--dash" parts={parts} /> : name.replace(/ (–) /g, "\u00A0$1 ");
}

export default async function LocationsPage({ searchParams }: { searchParams?: Promise<Search> } = {}) {
  await requireRoles(["OWNER"]);
  const words = wordPreset((await currentPresentation()).words).en;
  const [workspace, locations, employees, positions, staffing, coverageWindows, search] = await Promise.all([
    getWorkspace(), listLocations({ includeInactive: true }), listEmployees(),
    listPositions({ includeInactive: true }), listLocationStaffingSettings(), listCoverageWindows(),
    searchParams ?? Promise.resolve({} as Search),
  ]);
  const query = typeof search.q === "string" ? search.q.trim().slice(0, 160) : "";
  const filter: Filter = search.status === "setup" || search.status === "ready" || search.status === "inactive" ? search.status : "all";
  const entries = locations.map(location => ({
    location,
    readiness: evaluateLocationReadiness({
      workspace, location, staffing: staffing.find(setting => setting.locationId === location.id) ?? null,
      coverageWindows, positions, eligibleEmployees: employees,
    }),
    eligibleCount: employees.filter(employee => employee.active && employee.eligibleLocationIds.includes(location.id)).length,
  }));

  const visible = entries.filter(({ location, readiness }) =>
    `${location.name} ${location.shortName}`.toLowerCase().includes(query.toLowerCase()) &&
    (filter === "all" || readiness.state === ({ setup: "NEEDS_SETUP", ready: "READY", inactive: "INACTIVE" } as const)[filter]),
  );
  const activeCount = locations.filter(location => location.active).length;
  const place = lower(words.location), places = lower(words.locations);

  const peopleWord = (count: number) => count === 1 ? lower(words.person) : lower(words.people);
  // Phase 2 (Nov 23, 2026): Settings' own Direction B frame (SettingsPageB) and one white card of the kit's rows: a row
  // per place (short name; its full name and state on the facts line; how many people can work there on the right),
  // then the "Add location" row; every row leads with its icon, so all titles share one left edge. The page title already says "Locations", so the card has no title of its own, and the
  // grey line that was always true ("Each location keeps its own schedule.") is gone. Rows carry no aria-label: the
  // name a screen reader hears is the row's visible text.
  return (
    <SettingsPageB title={words.locations} titleId="locations-title">
      <p className="c-sr" role="status">{activeCount} active of {locations.length} {locations.length === 1 ? place : places}</p>
      {visible.length ? <CorpCard as="div">
        <CorpRows label={words.locations}>
          {visible.map(({ location, readiness, eligibleCount }) => {
            // Final fixes S2 (G85): the full name only when it says more than the short name; "Condado — Condado" read twice.
            const fullSaysMore = !location.name.toLowerCase().includes(location.shortName.trim().toLowerCase());
            const facts = [fullSaysMore ? placeName(location.name) : null,
              readiness.state === "INACTIVE" ? "Inactive" : readiness.state === "NEEDS_SETUP" ? "Needs setup" : null];
            return <li key={location.id} data-location={location.id}>
              <CorpRow href={`${directoryPath}/${encodeURIComponent(location.id)}`} title={location.shortName} icon={<MapPinIcon weight="bold" />}
                detail={facts.some(Boolean) ? <BSegs parts={facts} /> : undefined}
                value={`${eligibleCount} ${peopleWord(eligibleCount)}`} valueTone="soft" chevron />
            </li>;
          })}
          <li><CorpRow href={`${directoryPath}/new`} title={`Add ${place}`} icon={<PlusIcon weight="bold" />} chevron={false} /></li>
        </CorpRows>
      </CorpCard> : <CorpEmpty title={locations.length ? `No matching ${places}` : `No ${places} yet`}
        body={locations.length ? undefined : "Add the places your team works."}
        action={<CorpButtonLink href={locations.length ? directoryPath : `${directoryPath}/new`} kind={locations.length ? "secondary" : "primary"}>{locations.length ? "Show all" : `Add ${place}`}</CorpButtonLink>} />}
    </SettingsPageB>
  );
}
