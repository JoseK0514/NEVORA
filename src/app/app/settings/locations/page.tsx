import Link from "next/link";
import { ArrowLeft, CaretDown, CaretRight, CheckCircle, Clock, MagnifyingGlass, PencilSimple, Plus, Storefront, Users } from "@phosphor-icons/react/dist/ssr";
import { ActionMenu } from "@/components/action-menu";
import { StatusPill } from "@/components/status-pill";
import { requireRoles } from "@/lib/auth/permissions";
import { listLocations, listEmployees } from "@/lib/data/employees";
import { getWorkspace } from "@/lib/data/workspaces";
import { listPositions } from "@/lib/data/positions";
import { listLocationStaffingSettings, listCoverageWindows } from "@/lib/data/schedule-health";
import { evaluateLocationReadiness, type LocationSetupIssueCode } from "@/lib/scheduling/location-readiness";
import { LocationsFrame } from "./locations-frame";
import { LocationsSearch } from "./locations-search";
import "./locations.css";

type Search = { q?: string | string[]; status?: string | string[] };
type Filter = "all" | "setup" | "ready" | "inactive";
const directoryPath = "/app/settings/locations";

function directoryLink(query: string, status: Filter) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status !== "all") params.set("status", status);
  return directoryPath + (params.size ? `?${params}` : "");
}

function issueAction(code: LocationSetupIssueCode) {
  if (code === "NO_ELIGIBLE_EMPLOYEES") return { href: "/app/employees", label: "Employee eligibility" };
  if (code === "WORKSPACE_INACTIVE") return { href: "/app/settings/workspace", label: "Workspace settings" };
  if (code === "LOCATION_INACTIVE") return null;
  return { href: "/app/schedule/settings", label: "Scheduling rules" };
}

export default async function LocationsPage({ searchParams }: { searchParams?: Promise<Search> } = {}) {
  await requireRoles(["OWNER"]);
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
    { value: "all", label: "All locations" }, { value: "setup", label: "Needs setup" },
    { value: "ready", label: "Ready" }, { value: "inactive", label: "Inactive" },
  ];

  return (
    <LocationsFrame contentKey={`${query}:${filter}`}>
      <header className="locations-heading">
        <div className="locations-heading-copy">
          <Link href="/app/settings" className="locations-back"><ArrowLeft size={18} aria-hidden="true" />Back to Settings</Link>
          <h1>Locations</h1>
          <p>Manage your workplaces, scheduling setup, and Clocker access.</p>
        </div>
        <Link href={`${directoryPath}/new`} className="button primary locations-add"><Plus size={20} aria-hidden="true" />Add location</Link>
      </header>

      <section className="locations-directory" aria-labelledby="locations-directory-title">
        <div className="locations-toolbar">
          <div>
            <h2 id="locations-directory-title">Your workplaces</h2>
            <p>{locations.length} {locations.length === 1 ? "location" : "locations"} <span aria-hidden="true">&middot;</span> {locations.filter(location => location.active).length} active</p>
          </div>
          {locations.length > 0 ? (
            <LocationsSearch key={`${query}:${filter}`} query={query} status={filter} />
          ) : null}
        </div>
        {locations.length > 0 ? (
          <nav className="locations-filters" aria-label="Filter locations by setup status">
            {filters.map(({ value, label }) => (
              <Link key={value} href={directoryLink(query, value)} aria-current={filter === value ? "page" : undefined}>{label}<span>{counts[value]}</span></Link>
            ))}
          </nav>
        ) : null}
        {locations.length > 0 ? <p className="locations-result-count" role="status">Showing {visible.length} of {locations.length} locations{query ? ` matching "${query}"` : ""}.</p> : null}

        <div className="locations-list">
          {visible.map(({ location, readiness, eligibleCount }) => (
            <article className="location-card" key={location.id} aria-labelledby={`location-title-${location.id}`}>
              <div className="location-card-heading">
                <span className="location-icon" aria-hidden="true"><Storefront size={26} weight="duotone" /></span>
                <div className="location-identity">
                  <h3 id={`location-title-${location.id}`}>{location.name}</h3>
                  <p>{location.shortName}<span aria-hidden="true"> &middot; </span>{location.active ? "Active" : "Inactive"}</p>
                </div>
                <StatusPill tone={readiness.state === "READY" ? "success" : readiness.state === "INACTIVE" ? "neutral" : "warning"}>
                  {readiness.state === "READY" ? "Ready" : readiness.state === "INACTIVE" ? "Inactive" : "Needs setup"}
                </StatusPill>
              </div>
              <div className="location-card-body">
                <div className="location-team"><Users size={19} aria-hidden="true" /><span>{eligibleCount} eligible {eligibleCount === 1 ? "employee" : "employees"}</span></div>
                <div className="location-clocker">
                  <span className="location-clocker-label"><Clock size={19} aria-hidden="true" />Clocker link</span>
                  <Link href={`/clocker/${location.clockerKey}`} aria-label={`Open Clocker for ${location.name}`}><span>/clocker/{location.clockerKey}</span><CaretRight size={17} aria-hidden="true" /></Link>
                  {!location.active ? <small>Unavailable while inactive</small> : null}
                </div>
                <div className="location-card-actions">
                  <Link className="button secondary" href={`${directoryPath}/${encodeURIComponent(location.id)}`} aria-label={`Edit Location: ${location.name}`}><PencilSimple size={18} aria-hidden="true" />Edit location</Link>
                  <ActionMenu id={`location-actions-${location.id}`} label="Manage" ariaLabel={`Manage ${location.name}`}>
                    <Link className="nevora-action-menu-item" href={`${directoryPath}/${encodeURIComponent(location.id)}`}><strong>Edit location</strong><span>Name, short name and active status.</span></Link>
                    <Link className="nevora-action-menu-item" href="/app/schedule/settings"><strong>Scheduling rules</strong><span>Coverage and staffing requirements.</span></Link>
                    <Link className="nevora-action-menu-item" href="/app/employees"><strong>Employee eligibility</strong><span>Choose who can work at this location.</span></Link>
                  </ActionMenu>
                </div>
              </div>
              {readiness.issues.length ? (
                <details className="configuration-readiness-disclosure">
                  <summary>
                    <span>{readiness.issues.length} {readiness.state === "INACTIVE" ? (readiness.issues.length === 1 ? "status item" : "status items") : (readiness.issues.length === 1 ? "setup item" : "setup items")}</span>
                    <span className="location-disclosure-hint">{readiness.state === "INACTIVE" ? "View details" : "Review setup"}<CaretDown size={16} aria-hidden="true" /></span>
                  </summary>
                  <ul>{readiness.issues.map(issue => {
                    const action = issueAction(issue.code);
                    return <li key={issue.code + JSON.stringify(issue.details)}><span>{issue.message}</span>{action ? <Link href={action.href}>{action.label}<CaretRight size={16} aria-hidden="true" /></Link> : null}</li>;
                  })}</ul>
                </details>
              ) : (
                <p className="location-ready-note"><CheckCircle size={17} aria-hidden="true" />Scheduling setup is complete.</p>
              )}
            </article>
          ))}
          {visible.length === 0 ? (
            <div className="locations-empty">
              <span className="location-icon" aria-hidden="true">{locations.length ? <MagnifyingGlass size={28} /> : <Storefront size={32} weight="duotone" />}</span>
              <h3>{locations.length ? "No matching locations" : "Your first workplace starts here"}</h3>
              <p>{locations.length ? "Try another name or clear the filters to see every location." : "Add a location, then set up staffing, coverage, and your eligible team."}</p>
              <Link href={locations.length ? directoryPath : `${directoryPath}/new`} className={`button ${locations.length ? "secondary" : "primary"}`}>
                {locations.length ? "Clear search and filters" : <><Plus size={20} aria-hidden="true" />Add location</>}
              </Link>
            </div>
          ) : null}
        </div>
      </section>
      <p className="locations-footnote"><Clock size={18} aria-hidden="true" />Clocker links stay the same when you rename a location. Inactive locations remain here for reference.</p>
    </LocationsFrame>
  );
}
