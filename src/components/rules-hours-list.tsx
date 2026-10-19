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

/** Weekly hours on Scheduling rules (U3): find a person or show only people with
 * no target. Filtered rows are hidden, not removed, so the shared "Save staffing &
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
    {rows.length > 1 ? <div className="wb-filterbar">
      <label className="wb-search">
        <MagnifyingGlassIcon size={20} aria-hidden="true" />
        <span className="sr-only">Find a person</span>
        <input type="search" placeholder="Find a person" value={query} onChange={event => setQuery(event.target.value)}
          onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} />
      </label>
      {missing ? <button type="button" className="wb-toggle" aria-pressed={missingOnly} onClick={() => setMissingOnly(value => !value)}>
        No target<span className="rules-hours-count">{missing}</span>
      </button> : null}
    </div> : null}
    <p className="sr-only" role="status">{count === rows.length ? "" : `${count} of ${rows.length} people shown`}</p>
    {/* A browser can't focus an invalid field it can't see, so a failed save shows everyone. */}
    <ul className="wb-setting-list" onInvalidCapture={showEveryone}>
      {rows.map(row => (
        <li className="wb-setting manager-issue-target" id={"target-" + row.employeeId} tabIndex={-1} key={row.employeeId} hidden={!shown(row)}>
          <div className="wb-setting__name"><span className="wb-record__title">{row.employeeName}</span><span className="wb-record__meta">{row.detail}</span></div>
          <div className="wb-setting__fields wb-setting__fields--pair">
            <label className="wb-field"><span>Target</span><span className="wb-suffix"><input type="number" name={"target-" + row.employeeId} aria-label={row.employeeName + " target weekly hours"} defaultValue={row.targetWeeklyHours ?? ""} min={0} max={168} step={0.25} placeholder="Not set" /><span aria-hidden="true">hrs</span></span></label>
            <label className="wb-field"><span>Maximum</span><span className="wb-suffix"><input type="number" name={"maximum-" + row.employeeId} aria-label={row.employeeName + " maximum weekly hours"} defaultValue={row.maximumWeeklyHours ?? 40} min={0} max={168} step={0.25} required /><span aria-hidden="true">hrs</span></span></label>
          </div>
        </li>
      ))}
    </ul>
    {rows.length && !count ? <div className="wb-body wb-body--ruled wb-none"><p className="wb-note">No one matches.</p><div className="wb-actions"><button type="button" className="nv-btn" data-kind="secondary" onClick={showEveryone}>Show everyone</button></div></div> : null}
  </>;
}
