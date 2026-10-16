"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { BriefcaseIcon } from "@phosphor-icons/react/dist/ssr/Briefcase";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { ConfigurationForm, type ConfigurationResult } from "@/components/configuration-form";
import type { Position } from "@/lib/domain";

gsap.registerPlugin(useGSAP);
type PositionAction = (data: FormData) => Promise<ConfigurationResult>;
type Filter = "all" | "active" | "inactive";
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function PositionRow({ position, hidden, ready, action }: {
  position: Position; hidden: boolean; ready: boolean; action: PositionAction;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const name = useRef<HTMLInputElement>(null);
  const active = useRef<HTMLInputElement>(null);
  const id = `position-${position.id}`;
  function cancel() {
    if (name.current) name.current.value = position.name;
    if (active.current) active.current.checked = position.active;
    if (details.current) {
      details.current.open = false;
      details.current.querySelector("summary")?.focus();
    }
  }
  return (
    <li hidden={hidden}>
      <details className="positions-row" ref={details}>
        <summary aria-label={`Edit ${position.name}, ${position.active ? "active" : "inactive"}`}>
          <span className={`positions-role-icon${position.active ? "" : " is-inactive"}`}><BriefcaseIcon size={22} weight="duotone" aria-hidden="true" /></span>
          <span className="positions-row-name">{position.name}</span>
          <span className={`positions-status${position.active ? " is-active" : ""}`}><span aria-hidden="true" />{position.active ? "Active" : "Inactive"}</span>
          <span className="positions-edit-label">Edit</span>
          <CaretDownIcon className="positions-caret" size={16} aria-hidden="true" />
        </summary>
        <div className="positions-editor">
          <ConfigurationForm key={position.updatedAt} action={action} className="positions-form">
            <fieldset disabled={!ready} className="positions-fields">
              <legend className="positions-sr-only">Edit {position.name}</legend>
              <input type="hidden" name="id" value={position.id} />
              <input type="hidden" name="expectedUpdatedAt" value={position.updatedAt ?? ""} />
              <label htmlFor={`${id}-name`}>Position name</label>
              <input ref={name} id={`${id}-name`} name="name" defaultValue={position.name} required maxLength={80} aria-describedby={`${id}-name-help`} />
              <p id={`${id}-name-help`} className="positions-field-help">Use a job title or qualification your team recognizes.</p>
              <label className="positions-active-choice" htmlFor={`${id}-active`}>
                <input ref={active} id={`${id}-active`} type="checkbox" name="active" defaultChecked={position.active} aria-labelledby={`${id}-active-label`} aria-describedby={`${id}-active-subtitle ${id}-active-help`} />
                <span><strong id={`${id}-active-label`}>Active position</strong><span id={`${id}-active-subtitle`}>Available for new assignments</span></span>
              </label>
              <p id={`${id}-active-help`} className="positions-field-help">Turning this off prevents new assignments. Existing employee qualifications and history are retained.</p>
              <div className="positions-form-actions">
                <button type="button" className="positions-button positions-button-secondary" onClick={cancel}>Cancel</button>
                <button type="submit" className="positions-button positions-button-primary"><CheckIcon size={18} aria-hidden="true" />Save position</button>
              </div>
            </fieldset>
          </ConfigurationForm>
        </div>
      </details>
    </li>
  );
}

export function PositionCatalog({ positions, available, createAction, updateAction }: {
  positions: readonly Position[]; available: boolean; createAction: PositionAction; updateAction: PositionAction;
}) {
  const root = useRef<HTMLDivElement>(null);
  const addDetails = useRef<HTMLDetailsElement>(null);
  const addName = useRef<HTMLInputElement>(null);
  const ready = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const activeCount = positions.filter(position => position.active).length;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = (position: Position) => position.name.toLocaleLowerCase().includes(normalizedQuery) && (filter === "all" || position.active === (filter === "active"));
  const shown = positions.filter(matches).length;
  const counts: Record<Filter, number> = { all: positions.length, active: activeCount, inactive: positions.length - activeCount };
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".positions-heading, .positions-catalog", { y: 6, opacity: 0.6, duration: 0.28, stagger: 0.04, ease: "power2.out", clearProps: "transform,opacity" });
    });
    return () => media.revert();
  }, { scope: root });
  function revealAdd() {
    if (addDetails.current) addDetails.current.open = true;
    addName.current?.focus();
  }
  function clearFilters() { setQuery(""); setFilter("all"); }
  async function create(data: FormData) {
    const result = await createAction(data);
    if (result.success && !result.error) {
      clearFilters();
      if (addName.current) addName.current.value = "";
    }
    return result;
  }
  async function update(data: FormData) {
    const result = await updateAction(data);
    if (result.success && !result.error) clearFilters();
    return result;
  }
  return (
    <div className="positions-page" ref={root}>
      <Link className="positions-back" href="/app/settings"><ArrowLeftIcon size={18} aria-hidden="true" />Back to Settings</Link>
      <header className="positions-heading">
        <div><h1>Positions</h1><p>Define the qualifications your team brings to each shift.</p></div>
        {available ? <a className="positions-button positions-button-primary" href="#new-position" onClick={event => { event.preventDefault(); revealAdd(); }}><PlusIcon size={18} aria-hidden="true" />Add position</a> : null}
      </header>
      <div className="positions-purpose"><ShieldCheckIcon size={20} weight="duotone" aria-hidden="true" /><p>Positions describe job qualifications. They do not grant Owner, Manager, Lead or Employee access.</p></div>
      {!available ? (
        <section className="positions-unavailable" aria-labelledby="positions-unavailable-title"><InfoIcon size={32} weight="duotone" aria-hidden="true" /><h2 id="positions-unavailable-title">Positions are unavailable</h2><p>We could not load the catalog. Reload this page to try again.</p><a className="positions-button positions-button-secondary" href="/app/settings/positions">Reload positions</a></section>
      ) : (
        <>
          <noscript><p className="positions-no-script">JavaScript is required to add or edit positions. You can still review the catalog and open each position.</p></noscript>
          <details id="new-position" className="positions-add" ref={addDetails}>
            <summary><span className="positions-add-icon"><PlusIcon size={20} aria-hidden="true" /></span><span><strong>Add a position</strong><span>A new qualification for your team</span></span><CaretDownIcon className="positions-caret" size={18} aria-hidden="true" /></summary>
            <ConfigurationForm action={create} className="positions-form positions-add-form">
              <fieldset className="positions-fields" disabled={!ready}>
                <legend className="positions-sr-only">New position</legend>
                <label htmlFor="new-position-name">Position name</label>
                <input ref={addName} id="new-position-name" name="name" required maxLength={80} placeholder="e.g. Customer support" aria-describedby="new-position-help" />
                <p id="new-position-help" className="positions-field-help">New positions are active and available for assignment.</p>
                <div className="positions-form-actions"><button type="button" className="positions-button positions-button-secondary" onClick={() => { if (addDetails.current) { addDetails.current.open = false; addDetails.current.querySelector("summary")?.focus(); } }}>Close</button><button type="submit" className="positions-button positions-button-primary"><PlusIcon size={18} aria-hidden="true" />Add position</button></div>
              </fieldset>
            </ConfigurationForm>
          </details>
          <section className="positions-catalog" aria-labelledby="position-catalog-heading">
            <div className="positions-catalog-heading"><div><h2 id="position-catalog-heading">Position catalog</h2><p>{positions.length ? "Select a position to edit its name or availability." : "Add your first position whenever your team needs one."}</p></div><span className="positions-total">{positions.length} {positions.length === 1 ? "position" : "positions"}</span></div>
            {positions.length ? <>
              <div className="positions-toolbar">
                <div className="positions-search"><MagnifyingGlassIcon size={18} aria-hidden="true" /><label className="positions-sr-only" htmlFor="position-search">Search positions</label><input id="position-search" type="search" placeholder="Search positions" value={query} onChange={event => setQuery(event.target.value)} disabled={!ready} /></div>
                <div className="positions-filters" role="group" aria-label="Filter positions by status">{(["all", "active", "inactive"] as const).map(option => <button type="button" key={option} aria-pressed={filter === option} disabled={!ready} onClick={() => setFilter(option)}>{option[0].toUpperCase() + option.slice(1)}<span>{counts[option]}</span></button>)}</div>
              </div>
              <div className="positions-list-heading" aria-hidden="true"><span>Position</span><span>Status</span><span /></div>
              <ul className="positions-list">{positions.map(position => <PositionRow key={position.id} position={position} hidden={!matches(position)} ready={ready} action={update} />)}</ul>
              {!shown ? <div className="positions-empty"><MagnifyingGlassIcon size={30} aria-hidden="true" /><h3>No matching positions</h3><p>Try a different name or clear your filters.</p><button type="button" className="positions-button positions-button-secondary" onClick={clearFilters}>Clear filters</button></div> : null}
              <p className="positions-result-count" role="status" aria-live="polite">Showing {shown} of {positions.length} {positions.length === 1 ? "position" : "positions"}</p>
            </> : <div className="positions-empty"><span className="positions-empty-icon"><BriefcaseIcon size={32} weight="duotone" aria-hidden="true" /></span><h3>A place for every qualification</h3><p>No positions configured. Positionless shifts remain available.</p><button type="button" className="positions-button positions-button-secondary" onClick={revealAdd} disabled={!ready}><PlusIcon size={18} aria-hidden="true" />Add your first position</button></div>}
          </section>
          <aside className="positions-guidance" aria-label="Position guidance"><InfoIcon size={22} weight="duotone" aria-hidden="true" /><div><h2>Retire a position, keep its history</h2><p>Inactive positions cannot be newly assigned. Existing coverage requirements remain visible in Scheduling Rules and need attention.</p><Link href="/app/schedule/settings">Review scheduling rules<CaretRightIcon size={16} aria-hidden="true" /></Link></div></aside>
        </>
      )}
    </div>
  );
}
