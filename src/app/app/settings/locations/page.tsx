import Link from "next/link";
import { PageHeader } from "@/components/page-header";
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
                  <ul>
                    {readiness.issues.map((issue) => (
                      <li key={issue.code + JSON.stringify(issue.details)}>
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p>
                  Clocker:{" "}
                  <Link href={`/clocker/${location.clockerKey}`}>
                    /clocker/{location.clockerKey}
                  </Link>
                  {!location.active ? " (unavailable while inactive)" : ""}
                </p>
                <div className="configuration-actions">
                  <Link
                    className="button secondary"
                    href={`/app/settings/locations/${encodeURIComponent(location.id)}`}
                  >
                    Edit Location
                  </Link>
                  <Link
                    className="button secondary"
                    href="/app/schedule/settings"
                  >
                    Scheduling Rules
                  </Link>
                  <Link className="button secondary" href="/app/employees">
                    Employee Eligibility
                  </Link>
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
