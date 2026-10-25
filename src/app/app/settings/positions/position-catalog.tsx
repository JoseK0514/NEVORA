"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BriefcaseIcon } from "@phosphor-icons/react/dist/ssr/Briefcase";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import type { ConfigurationResult } from "@/components/configuration-form";
import { Status } from "@/components/kit/kit";
import { toast } from "@/components/toaster";
import type { Position } from "@/lib/domain";
import { EmptyState, SettingsFrame } from "../wave-c-kit";
import "@/components/quiet/u4.css";
import { Field, SettingsForm, SwitchRow } from "../wave-c-form";

type PositionAction = (data: FormData) => Promise<ConfigurationResult>;
type Filter = "all" | "active" | "inactive";
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const nameMessages = { name: { missing: "Enter a position name." } };

function PositionRow({ position, hidden, ready, action, people }: {
  position: Position; hidden: boolean; ready: boolean; action: PositionAction; people?: number;
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
        <summary className={people === undefined ? "q-row q-row--one" : "q-row"} aria-label={`Edit ${position.name}, ${position.active ? "active" : "archived"}`}>
          <span className="q-rt"><b>{position.name}</b>{people === undefined ? null : <i>{`${people} ${people === 1 ? "person" : "people"}`}</i>}</span>
          <CaretRightIcon className="q-chev" aria-hidden="true" />
        </summary>
        <div className="wc-editable__body">
          <SettingsForm key={position.updatedAt} action={action} label={`Edit ${position.name}`} disabled={!ready}
            messages={nameMessages} submitLabel="Save position" successTitle="Position saved"
            onResult={result => { if (result.success && !result.error) { toast(result.success); close(); } }}
            secondary={<button type="button" className="q-btn q-btn--sec" onClick={close}>Cancel</button>}>
            <input type="hidden" name="id" value={position.id} />
            <input type="hidden" name="expectedUpdatedAt" value={position.updatedAt ?? ""} />
            <Field label="Name" id={`${id}-name`} name="name" defaultValue={position.name} required maxLength={80} autoComplete="off" />
            <ul className="q-list" style={{ marginTop: 16 }}><li><SwitchRow id={`${id}-active`} name="active" defaultChecked={position.active} label="Active" describedBy={`${id}-active-help`} /></li></ul>
            <p id={`${id}-active-help`} className="q-help">Archived positions can’t be newly assigned. People keep their history.</p>
          </SettingsForm>
        </div>
      </details>
    </li>
  );
}

export function PositionCatalog({ positions, available, createAction, updateAction, people }: {
  positions: readonly Position[]; available: boolean; createAction: PositionAction; updateAction: PositionAction;
  /** Quiet (v4): how many active people hold each position. */
  people?: Readonly<Record<string, number>>;
}) {
  const ready = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const addCard = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
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
  // Quiet (v4, approved Oct 23): "+" in the bar opens Add; Active and Archived (P2-5: one word everywhere); one row per position with how many people hold it.
  const [adding, setAdding] = useState(false);
  const addDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = addDialog.current; if (adding && dialog && !dialog.open) dialog.showModal(); if (!adding && dialog?.open) dialog.close(); }, [adding]);
  const tab: Filter = filter === "inactive" ? "inactive" : "active";
  return (
    <SettingsFrame title="Positions"
      bandAside={available ? <button type="button" className="q-nav__r q-nav__r--ink" aria-label="Add position" disabled={!ready} onClick={() => setAdding(true)}><PlusIcon className="q-ic" aria-hidden="true" /></button> : undefined}>
      {!available ? <EmptyState icon={null} titleId="positions-unavailable-title" title="Couldn’t load positions."
          action={<a className="q-btn q-btn--sec" href="/app/settings/positions">Try again</a>}>Nothing was changed.</EmptyState> : <>
        <noscript><p className="q-help">JavaScript is required to add or edit positions.</p></noscript>
        {positions.length ? <div className="q-seg" role="group" aria-label="Filter positions by status">
          <button type="button" aria-pressed={tab === "active"} onClick={() => setFilter("active")} aria-label={`Active, ${counts.active}`}>{`Active · ${counts.active}`}</button>
          <button type="button" aria-pressed={tab === "inactive"} onClick={() => setFilter("inactive")} aria-label={`Archived, ${counts.inactive}`}>Archived</button>
        </div> : null}
        <p className="q-sr" role="status" aria-live="polite">{positions.length ? `Showing ${positions.filter(position => position.active === (tab === "active")).length} of ${positions.length} positions` : ""}</p>
        {positions.length ? <ul className="q-list wc-editables" aria-label="Positions" style={{ marginTop: 16 }}>{positions.map(position => <PositionRow key={position.id} position={position}
          hidden={position.active !== (tab === "active")} ready={ready} action={update} people={people?.[position.id]} />)}</ul> : null}
        {positions.length && !positions.some(position => position.active === (tab === "active")) ? <p className="q-empty" style={{ marginTop: 16 }}>{tab === "active" ? "No active positions." : "No archived positions."}</p> : null}
        {!positions.length ? <EmptyState icon={null} title="No positions yet" action={<button type="button" className="q-btn" onClick={() => setAdding(true)} disabled={!ready}>Add position</button>}>
          Shifts can still be added without a position.</EmptyState> : null}
        <dialog ref={addDialog} className="wc-dialog" aria-labelledby="new-position-title" onClose={() => setAdding(false)} onCancel={() => setAdding(false)}>
          <div className="wc-dialog__head"><div><h2 className="wc-dialog__title" id="new-position-title">New position</h2></div>
            <button type="button" className="wc-dialog__close" aria-label="Close" onClick={() => setAdding(false)}><XIcon aria-hidden="true" /></button></div>
          <section id="new-position" ref={addCard}>
            <SettingsForm key={addKey} action={async data => { const result = await create(data); if (result.success && !result.error) setAdding(false); return result; }} label="Add a position" disabled={!ready} messages={nameMessages}
              submitLabel="Add position" pendingLabel="Adding…" successTitle="Position added" showServerSuccess={false}>
              <Field label="Name" id="new-position-name" name="name" required maxLength={80} placeholder="e.g. Front desk" autoComplete="off" />
            </SettingsForm>
          </section>
        </dialog>
      </>}
    </SettingsFrame>
  );
}