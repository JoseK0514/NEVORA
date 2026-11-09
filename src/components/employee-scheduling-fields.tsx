import type { ReactNode } from "react";
import type { Employee, Location, Position } from "../lib/domain";

const DISCLOSURE_THRESHOLD = 8;

/** Positions and eligible locations as checkbox lists (Wave A form pattern). Long lists fold behind a disclosure. */
export function EmployeeSchedulingFields({
  employee,
  locations,
  positions,
}: {
  employee?: Employee;
  locations: Location[];
  positions: Position[];
}) {
  const availablePositions = positions.filter(
    (position) =>
      position.active || employee?.positionIds?.includes(position.id),
  );
  const availableLocations = locations.filter(
    (location) =>
      location.active ||
      employee?.eligibleLocationIds.includes(location.id) ||
      employee?.primaryLocationId === location.id,
  );
  const positionRows = availablePositions.map((position) => (
    <label className="wa-check" key={position.id}>
      <input
        type="checkbox"
        name="positionIds"
        value={position.id}
        defaultChecked={employee?.positionIds?.includes(position.id)}
      />
      <span className="wa-check__text">
        <span className="wa-check__title">{position.name}</span>
        {position.active ? null : <span className="wa-check__help">Inactive position, kept as a qualification</span>}
      </span>
    </label>
  ));

  const locationRows = availableLocations.map((location) => (
    <label className="wa-check" key={location.id}>
      <input
        type="checkbox"
        name="eligibleLocationIds"
        value={location.id}
        defaultChecked={
          employee?.eligibleLocationIds.includes(location.id) ||
          employee?.primaryLocationId === location.id
        }
        disabled={employee?.primaryLocationId === location.id}
      />
      <span className="wa-check__text">
        <span className="wa-check__title">{location.shortName}</span>
        {!location.active || employee?.primaryLocationId === location.id ? <span className="wa-check__help">{[!location.active ? "Inactive" : null, employee?.primaryLocationId === location.id ? "Primary location, always included" : null].filter(Boolean).join(" · ")}</span> : null}
      </span>
    </label>
  ));

  const group = (rows: ReactNode[], summary: string) => rows.length > DISCLOSURE_THRESHOLD ? (
    <details className="employee-choice-disclosure">
      <summary className="wa-disclosure__summary"><span>{summary}</span><span className="wa-muted">{rows.length} available</span></summary>
      <div className="wa-checks">{rows}</div>
    </details>
  ) : <div className="wa-checks">{rows}</div>;

  return (
    <>
      <fieldset className="wa-fieldset">
        <legend className="wa-fieldset__legend">Positions</legend>
        <p className="wa-field__help">What they’re qualified to do. This is separate from their access role.</p>
        {availablePositions.length ? group(positionRows, "Position qualifications") : (
          <p className="wa-field__help">No active positions available. Positions are optional.</p>
        )}
      </fieldset>

      <fieldset className="wa-fieldset">
        <legend className="wa-fieldset__legend">Locations they can work at</legend>
        <p className="wa-field__help">Their primary location is always included.</p>
        {group(locationRows, "Eligible locations")}
      </fieldset>
    </>
  );
}
