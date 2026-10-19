"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BriefcaseIcon } from "@phosphor-icons/react/dist/ssr/Briefcase";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import type { ConfigurationResult } from "@/components/configuration-form";
import { Status } from "@/components/kit/kit";
import { toast } from "@/components/toaster";
import type { Position } from "@/lib/domain";
import { EmptyState, GuideCard, SettingsFrame } from "../wave-c-kit";
import { Field, SettingsForm, SwitchRow } from "../wave-c-form";

type PositionAction = (data: FormData) => Promise<ConfigurationResult>;
type Filter = "all" | "active" | "inactive";
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const nameMessages = { name: { missing: "Enter a position name." } };

function PositionRow({ position, hidden, ready, action }: {
  position: Position; hidden: boolean; ready: boolean; action: PositionAction;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const id = `position-${position.id}`;
  function close() {
    if (!details.current) return;
    details.current.querySelector("form")?.reset();
    details.current.open = false;
    details.current.querySelector("summary")?.focus();
  }
  return (
    <li hidden={hidden}>
      <details className="wc-editable" ref={details}>
        <summary className="nv-row" aria-label={`Edit ${position.name}, ${position.active ? "active" : "inactive"}`}>
          <span className="nv-row__text">
            <span className="nv-row__title">{position.name}</span>
            {position.active ? null : <span className="nv-row__status"><Status tone="neutral">Inactive</Status></span>}
          </span>
          <span className="nv-row__trail wc-edit-label">Edit</span>
          <CaretDownIcon className="nv-row__chev wc-caret" size={18} weight="bold" aria-hidden="true" />
        </summary>
        <div className="wc-editable__body">
          <SettingsForm key={position.updatedAt} action={action} label={`Edit ${position.name}`} disabled={!ready}
            messages={nameMessages} submitLabel="Save position" successTitle="Position saved"
            onResult={result => { if (result.success && !result.error) { toast(result.success); close(); } }}
            secondary={<button type="button" className="nv-btn" data-kind="secondary" onClick={close}>Cancel</button>}>
            <input type="hidden" name="id" value={position.id} />
            <input type="hidden" name="expectedUpdatedAt" value={position.updatedAt ?? ""} />
            <div className="wc-fields">
              <Field label="Position name" help="Use a job title or qualification your team recognizes."
                id={`${id}-name`} name="name" defaultValue={position.name} required maxLength={80} autoComplete="off" />
              <div className="wc-field">
                <SwitchRow id={`${id}-active`} name="active" defaultChecked={position.active}
                  label="Active position" description="Available for new assignments" describedBy={`${id}-active-help`} />
                <p id={`${id}-active-help`} className="wc-muted">Turning this off stops new assignments. Employees keep their qualifications and history.</p>
              </div>
            </div>
          </SettingsForm>
        </div>
      </details>
    </li>
  );
}

export function PositionCatalog({ positions, available, createAction, updateAction }: {
  positions: readonly Position[]; available: boolean; createAction: PositionAction; updateAction: PositionAction;
}) {
  const ready = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const addCard = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [addKey, setAddKey] = useState(0);
  const activeCount = positions.filter(position => position.active).length;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = (position: Position) => position.name.toLocaleLowerCase().includes(normalizedQuery) && (filter === "all" || position.active === (filter === "active"));
  const shown = positions.filter(matches).length;
  const counts: Record<Filter, number> = { all: positions.length, active: activeCount, inactive: positions.length - activeCount };
  const filtered = Boolean(normalizedQuery) || filter !== "all";
  // After an add, the fresh form keeps the cursor in its field for the next one.
  useEffect(() => { if (addKey) addCard.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true }); }, [addKey]);
  function revealAdd() {
    addCard.current?.scrollIntoView({ block: "center" });
    addCard.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true });
  }
  function clearFilters() { setQuery(""); setFilter("all"); }
  function clearAndFocus() { clearFilters(); requestAnimationFrame(() => document.getElementById("position-search")?.focus()); }
  async function create(data: FormData) {
    const result = await createAction(data);
    if (result.success && !result.error) {
      clearFilters();
      toast(result.success);
      setAddKey(key => key + 1);
    }
    return result;
  }
  async function update(data: FormData) {
    const result = await updateAction(data);
    if (result.success && !result.error) clearFilters();
    return result;
  }
  return (
    <SettingsFrame title="Positions" eyebrow={available ? `${positions.length} ${positions.length === 1 ? "position" : "positions"} · ${activeCount} active` : undefined}
      summary="The job qualifications your team brings to each shift."
      aside={<>
        <GuideCard title="Qualifications, not access">
          <p>Positions describe job qualifications. They do not grant Owner, Manager, Lead or Employee access.</p>
        </GuideCard>
        <GuideCard title="Retire a position, keep its history" action={<Link className="nv-link" href="/app/schedule/settings">Review scheduling rules<CaretRightIcon size={16} weight="bold" aria-hidden="true" /></Link>}>
          <p>Inactive positions can’t be newly assigned. Coverage rules that still ask for one stay in Scheduling rules and need attention.</p>
        </GuideCard>
      </>}>
      {!available ? (
        <section className="nv-card" aria-labelledby="positions-unavailable-title">
          <EmptyState tone="urgent" icon={<WarningCircleIcon size={22} weight="bold" />} titleId="positions-unavailable-title" title="Couldn’t load positions."
            action={<a className="nv-btn" data-kind="primary" href="/app/settings/positions">Try again</a>}>
            Try again to see your positions. Nothing was changed.
          </EmptyState>
        </section>
      ) : (
        <>
          <noscript><p className="wc-footnote">JavaScript is required to add or edit positions. You can still review the catalog.</p></noscript>
          <section className="nv-card" aria-labelledby="new-position-title" id="new-position" ref={addCard}>
            <div className="nv-card__head"><h2 className="nv-card__title" id="new-position-title">Add a position</h2></div>
            <div className="nv-card__body">
              <SettingsForm key={addKey} action={create} label="Add a position" disabled={!ready} messages={nameMessages}
                submitLabel="Add position" pendingLabel="Adding…" successTitle="Position added" showServerSuccess={false}>
                <Field label="Position name" help="New positions are active and available for assignment." helpId="new-position-help"
                  id="new-position-name" name="name" required maxLength={80} placeholder="e.g. Customer support" autoComplete="off" />
              </SettingsForm>
            </div>
          </section>
          <section className="nv-card" aria-labelledby="position-catalog-heading">
            <div className="nv-card__head">
              <h2 className="nv-card__title" id="position-catalog-heading">Position catalog</h2>
              {positions.length ? <span className="nv-card__meta" role="status" aria-live="polite">{`Showing ${shown} of ${positions.length} ${positions.length === 1 ? "position" : "positions"}`}</span> : null}
            </div>
            {positions.length ? <>
              <div className="wc-find">
                <label className="nv-sr" htmlFor="position-search">Search positions</label>
                <span className="wc-search"><MagnifyingGlassIcon size={20} aria-hidden="true" />
                  <input id="position-search" className="wc-control" type="search" placeholder="Search positions" value={query} onChange={event => setQuery(event.target.value)} autoComplete="off" />
                </span>
                <div className="wc-pills" role="group" aria-label="Filter positions by status">
                  {(["all", "active", "inactive"] as const).map(option => <button type="button" className="nv-filter" key={option} aria-pressed={filter === option} onClick={() => setFilter(option)}
                    aria-label={`${option[0].toUpperCase() + option.slice(1)}, ${counts[option]}`}>
                    {option[0].toUpperCase() + option.slice(1)} <span className="wc-count" aria-hidden="true">{counts[option]}</span></button>)}
                </div>
              </div>
              <ul className="nv-rows wc-editables" aria-label="Positions">{positions.map(position => <PositionRow key={position.id} position={position} hidden={!matches(position)} ready={ready} action={update} />)}</ul>
              {!shown ? <EmptyState headingLevel={3} icon={<MagnifyingGlassIcon size={22} weight="bold" />} title="No matching positions"
                action={<button type="button" className="nv-btn" data-kind="secondary" onClick={clearAndFocus}><XIcon size={18} aria-hidden="true" />Clear filters</button>}>
                Try a different name, or clear your filters.
              </EmptyState> : null}
            </> : <EmptyState headingLevel={3} icon={<BriefcaseIcon size={22} weight="bold" />} title="No positions yet"
              action={<button type="button" className="nv-btn" data-kind="secondary" onClick={revealAdd}>Add your first position</button>}>
              No positions configured. Positionless shifts remain available.
            </EmptyState>}
          </section>
        </>
      )}
    </SettingsFrame>
  );
}
