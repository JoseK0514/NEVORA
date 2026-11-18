"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { B_DESKTOP } from "@/lib/b-viewport";
import { allOpen, foldingIds, openedIds, toggled, toggledAll } from "./policy-sections-state";

export type PolicySectionView = { id: string; heading: string; body: ReactNode };

const none = () => () => {};
const subscribeDesktop = (changed: () => void) => {
  const query = window.matchMedia(B_DESKTOP);
  query.addEventListener("change", changed);
  return () => query.removeEventListener("change", changed);
};
const subscribeHash = (changed: () => void) => {
  window.addEventListener("hashchange", changed);
  return () => window.removeEventListener("hashchange", changed);
};

/** A policy's sections (Phase 5, PB-034). Every section is a real heading with its text under it.
 * - From 1024px the headings are plain and every section is open: the contents list beside the column does the moving.
 * - On phones and tablets each heading is a button that opens its text in place (`aria-expanded`, `aria-controls`); the
 *   first section starts open and "Open all" opens the rest. A section the address points at (#…) starts open too.
 * - Until the page's script runs every section is open, so the document reads in full without it.
 * `pinFirst` keeps the first section open with a plain heading at every width (Account deletion's how-to and its action,
 * which arrives in `afterFirst`). */
export function PolicySections({ sections, labels, pinFirst = false, afterFirst }: {
  sections: PolicySectionView[]; labels: { openAll: string; closeAll: string }; pinFirst?: boolean; afterFirst?: ReactNode;
}) {
  const hydrated = useSyncExternalStore(none, () => true, () => false);
  const desktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(B_DESKTOP).matches, () => false);
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => "");
  const [choice, setChoice] = useState<ReadonlySet<string> | null>(null);
  const input = { ids: sections.map(section => section.id), pinFirst, choice, hash };
  const folding = foldingIds(input), opened = openedIds(input);
  const plain = !hydrated || desktop;
  const all = allOpen(input);
  return <div className="pl-secs" data-plain={plain ? "" : undefined}>
    {folding.length > 1 ? <div className="pl-all"><button type="button" className="pl-all__btn" disabled={!hydrated}
      aria-pressed={all && !plain} onClick={() => setChoice(toggledAll(input))}>{all && !plain ? labels.closeAll : labels.openAll}</button></div> : null}
    {sections.map((section, index) => {
      const pinned = pinFirst && index === 0, open = plain || pinned || opened.has(section.id);
      return <section key={section.id} className="pl-sec" id={section.id} data-open={open ? "" : undefined} aria-labelledby={`${section.id}-title`}>
        <h2 className="pl-sec__h" id={`${section.id}-title`}>{pinned || (hydrated && desktop) ? section.heading
          : <button type="button" className="pl-sec__btn" disabled={!hydrated} aria-expanded={open} aria-controls={`${section.id}-text`} onClick={() => setChoice(toggled(input, section.id))}>
            <span>{section.heading}</span><CaretDownIcon className="pl-sec__caret" size={16} weight="bold" aria-hidden="true" /></button>}</h2>
        <div className="pl-sec__body" id={`${section.id}-text`} hidden={open ? undefined : true}>{section.body}{index === 0 ? afterFirst : null}</div>
      </section>;
    })}
  </div>;
}
