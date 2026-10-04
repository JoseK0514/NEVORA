import type { Employee, Location, Position } from "@/lib/domain";
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
    (p) => p.active || employee?.positionIds?.includes(p.id),
  );
  return (
    <>
      <fieldset>
        <legend>Positions</legend>
        <p>
          Job qualifications are separate from access roles. A shift position is
          selected explicitly.
        </p>
        <div className="checkbox-grid">
          {availablePositions.map((p) => (
            <label className="checkbox-row" key={p.id}>
              <input
                type="checkbox"
                name="positionIds"
                value={p.id}
                defaultChecked={employee?.positionIds?.includes(p.id)}
              />
              <span>
                {p.name}
                {p.active ? "" : " (Inactive — retained qualification)"}
              </span>
            </label>
          ))}
        </div>
        {!availablePositions.length ? (
          <p>
            No active positions available. Positions are optional; this employee
            can have no position qualifications.
          </p>
        ) : null}
      </fieldset>
      <fieldset>
        <legend>Eligible Locations</legend>
        <p>The primary location is always included.</p>
        <div className="checkbox-grid">
          {locations
            .filter(
              (l) =>
                l.active ||
                employee?.eligibleLocationIds.includes(l.id) ||
                employee?.primaryLocationId === l.id,
            )
            .map((l) => (
              <label className="checkbox-row" key={l.id}>
                <input
                  type="checkbox"
                  name="eligibleLocationIds"
                  value={l.id}
                  defaultChecked={
                    employee?.eligibleLocationIds.includes(l.id) ||
                    employee?.primaryLocationId === l.id
                  }
                  disabled={employee?.primaryLocationId === l.id}
                />
                <span>
                  {l.name}
                  {l.active ? "" : " (Inactive)"}
                  {employee?.primaryLocationId === l.id ? " · Primary" : ""}
                </span>
              </label>
            ))}
        </div>
      </fieldset>
    </>
  );
}
