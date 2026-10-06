import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ActionMenu } from "@/components/action-menu";
import { StatusPill } from "@/components/status-pill";
import { requireRoles } from "@/lib/auth/permissions";
import { listLocations, listEmployees } from "@/lib/data/employees";
import { getWorkspace } from "@/lib/data/workspaces";
import { listPositions } from "@/lib/data/positions";
import {
  listLocationStaffingSettings,
  listCoverageWindows,
} from "@/lib/data/schedule-health";
import { evaluateLocationReadiness } from "@/lib/scheduling/location-readiness";
export default async function LocationsPage() {
  await requireRoles(["OWNER"]);
  const [
    workspace,
    locations,
    employees,
    positions,
    staffing,
    coverageWindows,
  ] = await Promise.all([
    getWorkspace(),
    listLocations({ includeInactive: true }),
    listEmployees(),
    listPositions({ includeInactive: true }),
    listLocationStaffingSettings(),
    listCoverageWindows(),
  ]);
  return (
    <div className="configuration-page">
      <PageHeader
        title="Locations"
        eyebrow="Owner controls"
        description="Location status, setup and permanent Clocker links."
        actions={
          <>
            <Link href="/app/settings" className="button secondary">
              Back to Settings
            </Link>
            <Link href="/app/settings/locations/new" className="button primary">
              Add Location
            </Link>
          </>
        }
      />
      <section className="panel configuration-list">
        {locations.length ? (
          locations.map((location) => {
            const readiness = evaluateLocationReadiness({
              workspace,
              location,
              staffing:
                staffing.find((s) => s.locationId === location.id) ?? null,
              coverageWindows,
              positions,
              eligibleEmployees: employees,
            });
            return (
              <div key={location.id}>
                <h2>{location.name}</h2>
                <p>
                  {location.active ? "Active" : "Inactive"} ·{" "}
                  {location.shortName}
                </p>
                <StatusPill
                  tone={
                    readiness.state === "READY"
                      ? "success"
                      : readiness.state === "INACTIVE"
                        ? "neutral"
                        : "warning"
                  }
                >
                  {readiness.state === "READY"
                    ? "Ready"
                    : readiness.state === "INACTIVE"
                      ? "Inactive"
                      : "Needs setup"}
                </StatusPill>
                {readiness.issues.length ? (
                  <details className="configuration-readiness-disclosure">
                    <summary>
                      {readiness.issues.length}{" "}
                      {readiness.state === "INACTIVE"
                        ? readiness.issues.length === 1
                          ? "status item"
                          : "status items"
                        : readiness.issues.length === 1
                          ? "setup item"
                          : "setup items"}
                    </summary>
                    <ul>
                      {readiness.issues.map((issue) => (
                        <li key={issue.code + JSON.stringify(issue.details)}>
                          {issue.message}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                <p>
                  Clocker:{" "}
                  <Link href={`/clocker/${location.clockerKey}`}>
                    /clocker/{location.clockerKey}
                  </Link>
                  {!location.active ? " (unavailable while inactive)" : ""}
                </p>
                <div className="configuration-actions">
                  <ActionMenu
                    id={`location-actions-${location.id}`}
                    label="Manage"
                    ariaLabel={`Manage ${location.name}`}
                  >
                    <Link
                      className="nevora-action-menu-item"
                      href={`/app/settings/locations/${encodeURIComponent(location.id)}`}
                    >
                      <strong>Edit Location</strong>
                      <span>Name, short name and active status.</span>
                    </Link>
                    <Link
                      className="nevora-action-menu-item"
                      href="/app/schedule/settings"
                    >
                      <strong>Scheduling Rules</strong>
                      <span>Coverage and staffing requirements.</span>
                    </Link>
                    <Link
                      className="nevora-action-menu-item"
                      href="/app/employees"
                    >
                      <strong>Employee Eligibility</strong>
                      <span>Choose who can work at this location.</span>
                    </Link>
                  </ActionMenu>
                </div>
              </div>
            );
          })
        ) : (
          <p>No locations configured. Add a location to begin setup.</p>
        )}
      </section>
    </div>
  );
}
