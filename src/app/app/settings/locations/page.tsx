import Link from "next/link";
import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { lower, wordPreset } from "@/lib/workspace-presentation/words";
import { CaretDown, CaretRight, CheckCircle, Clock, MagnifyingGlass, PencilSimple, Plus, Storefront, Users } from "@phosphor-icons/react/dist/ssr";
import { Status } from "@/components/kit/kit";
import { requireRoles } from "@/lib/auth/permissions";
import { listLocations, listEmployees } from "@/lib/data/employees";
import { getWorkspace } from "@/lib/data/workspaces";
import { listPositions } from "@/lib/data/positions";
import { listLocationStaffingSettings, listCoverageWindows } from "@/lib/data/schedule-health";
import { evaluateLocationReadiness, type LocationSetupIssueCode } from "@/lib/scheduling/location-readiness";
import { LocationsSearch } from "./locations-search";
import { EmptyState, SettingsFrame } from "../wave-c-kit";

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
  return (
    <SettingsFrame title={words.locations} eyebrow={`${locations.length} ${locations.length === 1 ? place : places} · ${activeCount} active`}
      summary="Where your team works, each place’s scheduling setup and its Clocker link."
      bandAside={<Link className="nv-band-control" href={`${directoryPath}/new`}><Plus size={18} weight="bold" aria-hidden="true" />Add {place}</Link>}>
      {locations.length > 0 ? (
        <section className="nv-card" aria-labelledby="locations-find-title">
          <div className="nv-card__head"><h2 className="nv-card__title" id="locations-find-title">Find {places}</h2></div>
          <div className="wc-find">
            <LocationsSearch key={`${query}:${filter}`} query={query} status={filter} />
            <nav className="wc-pills" aria-label={`Filter ${places} by setup status`}>
              {filters.map(({ value, label }) => (
                <Link key={value} className="nv-filter" href={directoryLink(query, value)} aria-current={filter === value ? "page" : undefined}
                  aria-label={`${label}, ${counts[value]}`}>{label} <span className="wc-count" aria-hidden="true">{counts[value]}</span></Link>
              ))}
            </nav>
            <p className="wc-count-line" role="status">Showing {visible.length} of {locations.length} {locations.length === 1 ? place : places}{query ? ` matching “${query}”` : ""}</p>
          </div>
        </section>
      ) : null}

      {visible.length ? <div className="wc-grid">
        {visible.map(({ location, readiness, eligibleCount }) => {
          const tone = readiness.state === "READY" ? "done" : readiness.state === "INACTIVE" ? "neutral" : "review";
          const editHref = `${directoryPath}/${encodeURIComponent(location.id)}`;
          return (
            <article className="nv-card wc-location" data-location={location.id} key={location.id} aria-labelledby={`location-title-${location.id}`}>
              <div className="nv-card__head">
                <h2 className="nv-card__title" id={`location-title-${location.id}`}>{location.name}</h2>
                <span className="nv-card__meta"><Status tone={tone}>{readiness.state === "READY" ? "Ready" : readiness.state === "INACTIVE" ? "Inactive" : "Needs setup"}</Status></span>
              </div>
              <div className="nv-card__body wc-location__facts">
                <p className="wc-muted"><span className="nv-keep">{location.shortName}&nbsp;·</span> <span className="nv-keep">{location.active ? "Active" : "Inactive"}&nbsp;·</span> <span className="nv-keep"><Users size={16} aria-hidden="true" className="wc-inline-icon" />{eligibleCount} eligible {eligibleCount === 1 ? lower(words.person) : lower(words.people)}</span></p>
              </div>
              <ul className="nv-rows wc-location__clocker">
                <li>
                  <Link className="nv-row" data-leading="true" href={`/clocker/${location.clockerKey}`} aria-label={`Open Clocker for ${location.name}`}>
                    <span className="nv-tile" data-tone="neutral" aria-hidden="true"><Clock size={20} weight="bold" /></span>
                    <span className="nv-row__text">
                      <span className="nv-row__title">Clocker link</span>
                      <span className="nv-row__meta wc-path">/clocker/{location.clockerKey}</span>
                      {!location.active ? <span className="nv-row__meta">Unavailable while inactive</span> : null}
                    </span>
                    <CaretRight className="nv-row__chev" size={18} weight="bold" aria-hidden="true" />
                  </Link>
                </li>
              </ul>
              <div className="wc-section">
                {readiness.issues.length ? (
                  <details className="wc-disclosure">
                    <summary>
                      {readiness.issues.length} {readiness.state === "INACTIVE" ? (readiness.issues.length === 1 ? "status item" : "status items") : (readiness.issues.length === 1 ? "setup item" : "setup items")}
                      <CaretDown className="wc-caret" size={16} weight="bold" aria-hidden="true" />
                    </summary>
                    <ul className="wc-issues">{readiness.issues.map(issue => {
                      const action = issueAction(issue.code, words.person);
                      return <li key={issue.code + JSON.stringify(issue.details)}><span>{issue.message}</span>{action ? <Link className="nv-link" href={action.href}>{action.label}<CaretRight size={16} weight="bold" aria-hidden="true" /></Link> : null}</li>;
                    })}</ul>
                  </details>
                ) : (
                  <p className="wc-ready"><CheckCircle size={18} weight="fill" aria-hidden="true" />Scheduling setup is complete.</p>
                )}
              </div>
              <div className="wc-card-actions">
                <Link className="nv-link" href={editHref} aria-label={`Edit ${location.name}`}><PencilSimple size={18} aria-hidden="true" />Edit {place}</Link>
                <Link className="nv-link" href="/app/schedule/settings">Scheduling rules</Link>
              </div>
            </article>
          );
        })}
      </div> : (
        <section className="nv-card" aria-labelledby="locations-empty-title">
          {locations.length ? (
            <EmptyState icon={<MagnifyingGlass size={22} weight="bold" />} titleId="locations-empty-title" title={`No matching ${places}`}
              action={<Link className="nv-btn" data-kind="secondary" href={directoryPath}>Clear search and filters</Link>}>
              Try another name, or clear the filters to see every {place}.
            </EmptyState>
          ) : (
            <EmptyState icon={<Storefront size={22} weight="bold" />} titleId="locations-empty-title" title="Your first workplace starts here"
              action={<Link className="nv-btn" data-kind="primary" href={`${directoryPath}/new`}><Plus size={20} aria-hidden="true" />Add {place}</Link>}>
              Add a {place}, then set up staffing, coverage and your eligible team.
            </EmptyState>
          )}
        </section>
      )}
      <p className="wc-footnote"><Clock size={18} aria-hidden="true" /><span>Clocker links stay the same when you rename a {place}. Inactive {places} stay here for reference.</span></p>
    </SettingsFrame>
  );
}
