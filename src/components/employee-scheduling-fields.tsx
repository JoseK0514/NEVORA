import type { Employee, Location, Position } from "../lib/domain";

const DISCLOSURE_THRESHOLD = 8;

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
    <label className="checkbox-row employee-scheduling-choice" key={position.id}>
      <input
        type="checkbox"
        name="positionIds"
        value={position.id}
        defaultChecked={employee?.positionIds?.includes(position.id)}
      />
      <span>
        {position.name}
        {position.active ? "" : " (Inactive — retained qualification)"}
      </span>
    </label>
  ));

  const locationRows = availableLocations.map((location) => (
    <label className="checkbox-row employee-scheduling-choice" key={location.id}>
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
      <span>
        {location.name}
        {location.active ? "" : " (Inactive)"}
        {employee?.primaryLocationId === location.id ? " · Primary" : ""}
      </span>
    </label>
  ));

  return (
    <>
      <fieldset>
        <legend>Positions</legend>
        {availablePositions.length > DISCLOSURE_THRESHOLD ? (
          <details className="employee-choice-disclosure">
            <summary>
              <span>Position qualifications</span>
              <small>{availablePositions.length} available</small>
            </summary>
            <div className="employee-choice-disclosure-body">
              <p>
                Job qualifications are separate from access roles. A shift
                position is selected explicitly.
              </p>
              <div className="checkbox-grid">{positionRows}</div>
            </div>
          </details>
        ) : (
          <>
            <p>
              Job qualifications are separate from access roles. A shift
              position is selected explicitly.
            </p>
            <div className="checkbox-grid">{positionRows}</div>
          </>
        )}
        {!availablePositions.length ? (
          <p>
            No active positions available. Positions are optional; this employee
            can have no position qualifications.
          </p>
        ) : null}
      </fieldset>

      <fieldset>
        <legend>Eligible locations</legend>
        {availableLocations.length > DISCLOSURE_THRESHOLD ? (
          <details className="employee-choice-disclosure">
            <summary>
              <span>Eligible locations</span>
              <small>{availableLocations.length} available</small>
            </summary>
            <div className="employee-choice-disclosure-body">
              <p>The primary location is always included.</p>
              <div className="checkbox-grid">{locationRows}</div>
            </div>
          </details>
        ) : (
          <>
            <p>The primary location is always included.</p>
            <div className="checkbox-grid">{locationRows}</div>
          </>
        )}
      </fieldset>
    </>
  );
}
