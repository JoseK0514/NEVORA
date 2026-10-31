"use client";

import Link, { useLinkStatus } from "next/link";
import { useState } from "react";
import { CorpPill } from "./corp/corp";

export type CoverPickPerson = { employeeId: string; employeeName: string; detail: string; href: string };

const SHOWN = 3;
const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();

/** Assign says it is opening while the review loads (form pattern, pending). */
function AssignLabel() {
  const { pending } = useLinkStatus();
  return <span role={pending ? "status" : undefined} aria-live="polite" aria-atomic="true">{pending ? "Opening review…" : "Assign"}</span>;
}

/** Find cover (board O-FindCover): "Best fit first" as a radio list in the suggested order, the first one chosen, then
 * Assign, which opens the existing review for the chosen person. Nothing is saved on this page. */
export function ScheduleCoverPick({ people, repair }: { people: CoverPickPerson[]; repair?: boolean }) {
  const [chosen, setChosen] = useState(people[0]?.employeeId ?? "");
  const [all, setAll] = useState(false);
  const person = people.find(item => item.employeeId === chosen) ?? people[0];
  // The board's three best fits first; the rest open in place (the chosen one stays listed).
  const shown = all ? people : people.filter((item, index) => index < SHOWN || item.employeeId === chosen);
  return <>
    <fieldset className="c-cover__pick">
      <legend className="c-sr">Choose who covers it</legend>
      <ul className="c-rows">
        {shown.map((item, index) => <li key={item.employeeId} id={`coverage-candidate-${item.employeeId}`}>
          <label className="c-row c-cover__person">
            <input type="radio" className="c-cover__radio" name="coverPerson" value={item.employeeId} checked={chosen === item.employeeId} onChange={() => setChosen(item.employeeId)} />
            <span className="c-av c-av--l" aria-hidden="true">{initialsOf(item.employeeName)}</span>
            <span className="c-row__main">
              <span className="c-row__title c-row__title--b">{item.employeeName}</span>
              <span className="c-row__detail"><span>{item.detail}</span></span>
            </span>
            {index === 0 ? <CorpPill tone="teal">Best fit</CorpPill> : null}
          </label>
        </li>)}
      </ul>
      {shown.length < people.length ? <button type="button" className="c-cover__more" onClick={() => { setAll(true); const next = people.find((item, index) => index >= SHOWN && item.employeeId !== chosen); requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`#coverage-candidate-${CSS.escape(next?.employeeId ?? "")} input`)?.focus()); }}>{`Show ${people.length - shown.length} more`}</button> : null}
    </fieldset>
    <div className="c-card__foot">
      <Link className="c-btn c-btn--full" href={person.href} prefetch={false} aria-label={`${repair ? "Review replacement" : "Review shift"} for ${person.employeeName}`}><AssignLabel /></Link>
    </div>
  </>;
}
