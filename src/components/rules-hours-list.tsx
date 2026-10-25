"use client";

import "./quiet/u2.css";
import { useRef, useState } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";
import { initialsOf } from "./quiet/quiet";

export type RulesHoursRow = {
  employeeId: string;
  employeeName: string;
  /** "ID · Role · Location", prepared on the server. */
  detail: string;
  targetWeeklyHours: number | null;
  maximumWeeklyHours: number | null;
};

/** Weekly hours on Scheduling rules (U3; Quiet by Team U2, Oct 25, 2026, visual #3): find a person, or show only people
 * with no target. Each person is a row with Target and Maximum typed in place ("h"). Filtered rows are hidden, not removed,
 * so the shared "Save staffing and hours" still submits every field exactly as before. */
export function RulesHoursList({ rows }: { rows: RulesHoursRow[] }) {
  const [query, setQuery] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const missing = rows.filter(row => row.targetWeeklyHours === null).length;
  const term = query.trim().toLocaleLowerCase();
  const shown = (row: RulesHoursRow) => (!missingOnly || row.targetWeeklyHours === null)
    && (!term || row.employeeName.toLocaleLowerCase().includes(term) || row.employeeId.toLocaleLowerCase().includes(term));
  const count = rows.filter(shown).length;
  const showEveryone = () => { setQuery(""); setMissingOnly(false); };
  const search = useRef<HTMLInputElement>(null);

  return <>
    {rows.length > 1 ? <>
      <label className="q-search u2-hours-search">
        <MagnifyingGlassIcon className="q-ic" aria-hidden="true" />
        <span className="q-sr">Find a person</span>
        <input ref={search} type="search" placeholder="Find a person" value={query} onChange={event => setQuery(event.target.value)}
          onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} />
      </label>
      {missing ? <div className="q-seg q-seg--sheet u2-hours-seg" role="group" aria-label="Show">
        <button type="button" aria-pressed={!missingOnly} onClick={() => setMissingOnly(false)}>Everyone</button>
        <button type="button" aria-pressed={missingOnly} onClick={() => setMissingOnly(value => !value)}>No target<span className="rules-hours-count">{missing}</span></button>
      </div> : null}
    </> : null}
    <p className="q-sr" role="status">{count === rows.length ? "" : `${count} of ${rows.length} people shown`}</p>
    {/* A browser can't focus an invalid field it can't see, so a failed save shows everyone. */}
    <ul className="q-list u2-hours" onInvalidCapture={showEveryone}>
      {rows.map(row => (
        <li className="u2-hours__person manager-issue-target" id={"target-" + row.employeeId} tabIndex={-1} key={row.employeeId} hidden={!shown(row)}>
          <div className="q-row q-row--av u2-hours__who">
            <span className="q-av" aria-hidden="true">{initialsOf(row.employeeName)}</span>
            <span className="q-rt"><b>{row.employeeName}</b><i>{row.detail}</i></span>
          </div>
          <div className="u2-hours__fields">
            <label className="u2-unit-field"><span>Target</span><span className="q-in__wrap q-in__wrap--unit"><input className="q-in" type="number" inputMode="decimal" name={"target-" + row.employeeId} aria-label={row.employeeName + " target weekly hours"} defaultValue={row.targetWeeklyHours ?? ""} min={0} max={168} step={0.25} placeholder="Not set" /><span className="q-in__unit" aria-hidden="true">h</span></span></label>
            <label className="u2-unit-field"><span>Maximum</span><span className="q-in__wrap q-in__wrap--unit"><input className="q-in" type="number" inputMode="decimal" name={"maximum-" + row.employeeId} aria-label={row.employeeName + " maximum weekly hours"} defaultValue={row.maximumWeeklyHours ?? 40} min={0} max={168} step={0.25} required /><span className="q-in__unit" aria-hidden="true">h</span></span></label>
          </div>
        </li>
      ))}
    </ul>
    {rows.length && !count ? <><p className="q-empty">No one matches.</p><button type="button" className="q-btn q-btn--sec" onClick={() => { showEveryone(); requestAnimationFrame(() => search.current?.focus()); }}>Show everyone</button></> : null}
  </>;
}
