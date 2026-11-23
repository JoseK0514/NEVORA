"use client";

import { useRef, useState } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { RULES_HOURS_LIST_COPY } from "./rules-hours-list-copy";

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
  const t = RULES_HOURS_LIST_COPY[usePortalLang()];
  const [query, setQuery] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const missing = rows.filter(row => row.targetWeeklyHours === null).length;
  const term = query.trim().toLocaleLowerCase();
  const shown = (row: RulesHoursRow) => (!missingOnly || row.targetWeeklyHours === null)
    && (!term || row.employeeName.toLocaleLowerCase().includes(term) || row.employeeId.toLocaleLowerCase().includes(term));
  const count = rows.filter(shown).length;
  const showEveryone = () => { setQuery(""); setMissingOnly(false); };
  const search = useRef<HTMLInputElement>(null);

  // Phase 2 (C9, Nov 23, 2026): the kit's search field and filter chip, then one row per person with Target and Maximum
  // named once, as column heads, not on every row (each field keeps its own name for screen readers).
  return <>
    {rows.length > 1 ? <div className="c-rf-filterbar">
      <label className="c-rf-search">
        <MagnifyingGlassIcon weight="bold" aria-hidden="true" />
        <span className="sr-only">{t.find}</span>
        <input ref={search} type="search" placeholder={t.find} value={query} onChange={event => setQuery(event.target.value)}
          onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} />
      </label>
      {missing ? <button type="button" className="c-rf-chip" aria-pressed={missingOnly} onClick={() => setMissingOnly(value => !value)}>
        {t.noTarget}<span className="rules-hours-count">{missing}</span>
      </button> : null}
    </div> : null}
    <p className="sr-only" role="status">{count === rows.length ? "" : t.shown(count, rows.length)}</p>
    {count ? <div className="c-rf-cols" aria-hidden="true"><span /><span>{t.target}</span><span>{t.maximum}</span></div> : null}
    {/* A browser can't focus an invalid field it can't see, so a failed save shows everyone. */}
    <ul className="c-rf-list" onInvalidCapture={showEveryone}>
      {rows.map(row => (
        <li className="c-rf-item manager-issue-target" id={"target-" + row.employeeId} tabIndex={-1} key={row.employeeId} hidden={!shown(row)}>
          <div className="c-rf-item__name"><span className="c-rf-item__t">{row.employeeName}</span><span className="c-rf-item__m">{row.detail}</span></div>
          <div className="c-rf-item__fields">
            <input className="c-in c-rf-num" type="number" name={"target-" + row.employeeId} aria-label={t.targetLabel(row.employeeName)} defaultValue={row.targetWeeklyHours ?? ""} min={0} max={168} step={0.25} placeholder={t.notSet} />
            <input className="c-in c-rf-num" type="number" name={"maximum-" + row.employeeId} aria-label={t.maximumLabel(row.employeeName)} defaultValue={row.maximumWeeklyHours ?? 40} min={0} max={168} step={0.25} required />
          </div>
        </li>
      ))}
    </ul>
    {rows.length && !count ? <div className="c-rf-none"><p className="c-rf-help">{t.noMatch}</p><button type="button" className="c-btn c-btn--secondary" onClick={() => { showEveryone(); requestAnimationFrame(() => search.current?.focus()); }}>{t.showEveryone}</button></div> : null}
  </>;
}
