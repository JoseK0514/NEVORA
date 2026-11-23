import type { ReactNode } from "react";
import type { Employee, Location, Position } from "../lib/domain";
import { employeeScheduleCopy, type ScheduleLang } from "./employee-schedule-copy";

const DISCLOSURE_THRESHOLD = 8;

/** Positions and eligible locations as checkbox lists (Wave A form pattern). Long lists fold behind a disclosure. */
export function EmployeeSchedulingFields({
  employee,
  locations,
  positions,
  lang = "en",
}: {
  employee?: Employee;
  locations: Location[];
  positions: Position[];
  /** The person's language (signed-in Spanish, Nov 23, 2026); English when absent. */
  lang?: ScheduleLang;
}) {
  const t = employeeScheduleCopy(lang);
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
        {position.active ? null : <span className="wa-check__help">{t.inactivePosition}</span>}
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
        {!location.active || employee?.primaryLocationId === location.id ? <span className="wa-check__help">{[!location.active ? t.inactive : null, employee?.primaryLocationId === location.id ? t.primaryIncluded : null].filter(Boolean).join(" · ")}</span> : null}
      </span>
    </label>
  ));

  const group = (rows: ReactNode[], summary: string) => rows.length > DISCLOSURE_THRESHOLD ? (
    <details className="employee-choice-disclosure">
      <summary className="wa-disclosure__summary"><span>{summary}</span><span className="wa-muted">{t.available(rows.length)}</span></summary>
      <div className="wa-checks">{rows}</div>
    </details>
  ) : <div className="wa-checks">{rows}</div>;

  return (
    <>
      <fieldset className="wa-fieldset">
        <legend className="wa-fieldset__legend">{t.positions}</legend>
        <p className="wa-field__help">{t.positionsHelp}</p>
        {availablePositions.length ? group(positionRows, t.positionQualifications) : (
          <p className="wa-field__help">{t.noPositions}</p>
        )}
      </fieldset>

      <fieldset className="wa-fieldset">
        <legend className="wa-fieldset__legend">{t.locationsTitle}</legend>
        <p className="wa-field__help">{t.locationsHelp}</p>
        {group(locationRows, t.eligibleLocations)}
      </fieldset>
    </>
  );
}
