import Link from "next/link";
import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { lower, wordPreset } from "@/lib/workspace-presentation/words";
import { CaretRight, Plus } from "@phosphor-icons/react/dist/ssr";
import { requireRoles } from "@/lib/auth/permissions";
import { listLocations, listEmployees } from "@/lib/data/employees";
import { getWorkspace } from "@/lib/data/workspaces";
import { listPositions } from "@/lib/data/positions";
import { listLocationStaffingSettings, listCoverageWindows } from "@/lib/data/schedule-health";
import { evaluateLocationReadiness, type LocationSetupIssueCode } from "@/lib/scheduling/location-readiness";
import { EmptyState, SettingsFrame } from "../wave-c-kit";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Locations" };

type Search = { q?: string | string[]; status?: string | string[] };
type Filter = "all" | "setup" | "ready" | "inactive";
const directoryPath = "/app/settings/locations";

function directoryLink(query: string, status: Filter) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status !== "all") params.set("status", status);
  return directoryPath + (params.size ? `?${params}` : "");
}

function issueAction(code: LocationSetupIssueCode, person = "Employee") {
  if (code === "NO_ELIGIBLE_EMPLOYEES") return { href: "/app/employees", label: `${person} eligibility` };
  if (code === "WORKSPACE_INACTIVE") return { href: "/app/settings/workspace", label: "Company profile" };
  if (code === "LOCATION_INACTIVE") return null;
  return { href: "/app/schedule/settings", label: "Scheduling rules" };
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
  const counts = {
    all: entries.length,
    setup: entries.filter(entry => entry.readiness.state === "NEEDS_SETUP").length,
    ready: entries.filter(entry => entry.readiness.state === "READY").length,
    inactive: entries.filter(entry => entry.readiness.state === "INACTIVE").length,
  };
  const visible = entries.filter(({ location, readiness }) =>
    `${location.name} ${location.shortName}`.toLowerCase().includes(query.toLowerCase()) &&
    (filter === "all" || readiness.state === ({ setup: "NEEDS_SETUP", ready: "READY", inactive: "INACTIVE" } as const)[filter]),
  );
  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All" }, { value: "setup", label: "Needs setup" },
    { value: "ready", label: "Ready" }, { value: "inactive", label: "Inactive" },
  ];

  const activeCount = locations.filter(location => location.active).length;
  const place = lower(words.location), places = lower(words.locations);
  const team = employees.filter(employee => employee.active).length;
  const peopleWord = (count: number) => count === 1 ? lower(words.person) : lower(words.people);
  // Release 1 (board O-Locations): one card with its count line, a row per place (name, its state, how many people can
  // work there) and an inline "+ Add location" row, then one grey line. Places carry no address or hours yet, so the rows
  // show what the app holds.
  return (
    <SettingsFrame title={words.locations}>
      <p className="q-sr" role="status">{activeCount} active of {locations.length} {locations.length === 1 ? place : places}</p>
      {/* Closing F1 (NV-238): the card's title is the page's noun with a count pill ("Locations 2"), as on every index card;
        (NV-248) a long name wraps to two lines instead of being cut. */}
      {visible.length ? <ul className="q-list wc-locations" aria-label={words.locations}>
        <li className="wc-cardhead" aria-hidden="true"><span>{words.locations}<span className="wc-count c-num">{activeCount}</span></span></li>
        {visible.map(({ location, readiness, eligibleCount }) => <li key={location.id} data-location={location.id}>
          <Link className={location.name !== location.shortName || readiness.state !== "READY" ? "q-row" : "q-row q-row--one"} href={`${directoryPath}/${encodeURIComponent(location.id)}`} aria-label={`Edit ${location.name}`}>
            <span className="q-rt"><b>{location.shortName}</b>{location.name !== location.shortName || readiness.state !== "READY" ? <i>{[location.name !== location.shortName ? location.name : null,
              readiness.state === "INACTIVE" ? "Inactive" : readiness.state === "NEEDS_SETUP" ? "Needs setup" : null].filter(Boolean).join(" · ")}</i> : null}</span>
            <span className="wc-meta">{`${eligibleCount} ${peopleWord(eligibleCount)}`}</span>
            <CaretRight className="q-chev" aria-hidden="true" />
          </Link>
        </li>)}
        <li><Link className="wc-addrow" href={`${directoryPath}/new`}><Plus aria-hidden="true" weight="bold" />{`Add ${place}`}</Link></li>
      </ul> : <EmptyState icon={null} titleId="locations-empty-title" title={locations.length ? `No matching ${places}` : `No ${places} yet`}
        action={<Link className={locations.length ? "q-btn q-btn--sec" : "q-btn"} href={locations.length ? directoryPath : `${directoryPath}/new`}>{locations.length ? "Show all" : `Add ${place}`}</Link>}>
        {locations.length ? "" : `Add the places your team works.`}
      </EmptyState>}
      {visible.length ? <p className="wc-foot">{`Each ${place} keeps its own schedule.`}</p> : null}
    </SettingsFrame>
  );
}
