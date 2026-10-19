"use client";

import { useState } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";

export type RulesHoursRow = {
  employeeId: string;
  employeeName: string;
  /** "ID · Role · Location", prepared on the server. */
  detail: string;
  targetWeeklyHours: number | null;
  maximumWeeklyHours: number | null;
};

/** Weekly hours on Scheduling rules (U3): find a person or show only missing
 * targets. Filtered rows are hidden, not removed, so the shared "Save staffing &
 * hours" still submits every field exactly as before. */
export function RulesHoursList({ rows }: { rows: RulesHoursRow[] }) {
  const [query, setQuery] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const missing = rows.filter(row => row.targetWeeklyHours === null).length;
  const term = query.trim().toLocaleLowerCase();
  const shown = (row: RulesHoursRow) => (!missingOnly || row.targetWeeklyHours === null)
    && (!term || row.employeeName.toLocaleLowerCase().includes(term) || row.employeeId.toLocaleLowerCase().includes(term));
  const count = rows.filter(shown).length;
  const showEveryone = () => { setQuery(""); setMissingOnly(false); };

  return <>
    {rows.length > 1 ? <div className="rules-hours-filter">
      <label className="rules-hours-search">
        <MagnifyingGlassIcon size={18} aria-hidden="true" />
        <span className="sr-only">Find a person</span>
        <input type="search" placeholder="Find a person" value={query} onChange={event => setQuery(event.target.value)}
          onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} />
      </label>
      {missing ? <button type="button" className="rules-hours-missing" aria-pressed={missingOnly} onClick={() => setMissingOnly(value => !value)}>
        Missing target<span className="rules-hours-count">{missing}</span>
      </button> : null}
    </div> : null}
    <p className="sr-only" role="status">{count === rows.length ? "" : `${count} of ${rows.length} people shown`}</p>
    {/* A browser can't focus an invalid field it can't see, so a failed save shows everyone. */}
    <div className="rules-hours-list" onInvalidCapture={showEveryone}>
      {rows.map(row => (
        <div className="rules-hours-row manager-issue-target" id={"target-" + row.employeeId} tabIndex={-1} key={row.employeeId} hidden={!shown(row)}>
          <div className="rules-employee"><strong>{row.employeeName}</strong><span>{row.detail}</span></div>
          <div className="rules-hour-fields">
            <label><span>Target</span><span className="rules-number-input"><input type="number" name={"target-" + row.employeeId} aria-label={row.employeeName + " target weekly hours"} defaultValue={row.targetWeeklyHours ?? ""} min={0} max={168} step={0.25} placeholder="Not set" /><small>hrs</small></span></label>
            <label><span>Maximum</span><span className="rules-number-input"><input type="number" name={"maximum-" + row.employeeId} aria-label={row.employeeName + " maximum weekly hours"} defaultValue={row.maximumWeeklyHours ?? 40} min={0} max={168} step={0.25} required /><small>hrs</small></span></label>
          </div>
        </div>
      ))}
      {rows.length && !count ? <div className="rules-hours-none"><p>No one matches.</p><button type="button" className="button secondary" onClick={showEveryone}>Show everyone</button></div> : null}
    </div>
  </>;
}
