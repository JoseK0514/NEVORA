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
import { Field, SettingsForm, SwitchRow } from "../wave-c-form";

type PositionAction = (data: FormData) => Promise<ConfigurationResult>;
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
        <summary className="q-row q-row--one" aria-label={`Edit ${position.name}, ${position.active ? "active" : "archived"}`}>
          <span className="q-rt"><b>{position.name}</b></span>
          {people === undefined ? null : <span className="wc-meta">{`${people} ${people === 1 ? "person" : "people"}`}</span>}
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
            <p id={`${id}-active-help`} className="q-help">Archived positions can’t be newly assigned. They stay on past shifts and timecards.</p>
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
  const [addKey, setAddKey] = useState(0);
  const activeCount = positions.filter(position => position.active).length;
  const counts = { active: activeCount, inactive: positions.length - activeCount };
  // After an add, the fresh form keeps the cursor in its field for the next one.
  useEffect(() => { if (addKey) addCard.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true }); }, [addKey]);
  async function create(data: FormData) {
    const result = await createAction(data);
    if (result.success && !result.error) {
      toast(result.success);
      setAddKey(key => key + 1);
    }
    return result;
  }
  // Release 1 (board O-Positions): a card of active positions with how many people hold each and an inline "+ Add position"
  // row, then an Archived card when there are any, then one grey line. Opening a row edits it (rename, or archive with
  // Active off). Positions have no colour yet, so the rows carry no colour dot.
  const [adding, setAdding] = useState(false);
  const addDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = addDialog.current; if (adding && dialog && !dialog.open) dialog.showModal(); if (!adding && dialog?.open) dialog.close(); }, [adding]);
  const archived = positions.filter(position => !position.active);
  return (
    <SettingsFrame title="Positions">
      {!available ? <EmptyState icon={null} titleId="positions-unavailable-title" title="Couldn’t load positions."
          action={<a className="q-btn q-btn--sec" href="/app/settings/positions">Try again</a>}>Nothing was changed.</EmptyState> : <>
        <noscript><p className="q-help">JavaScript is required to add or edit positions.</p></noscript>
        <p className="q-sr" role="status" aria-live="polite">{positions.length ? `${counts.active} active and ${counts.inactive} archived positions` : ""}</p>
        {positions.length ? <ul className="q-list wc-editables" aria-label="Positions">
          {positions.filter(position => position.active).map(position => <PositionRow key={position.id} position={position} hidden={false} ready={ready} action={updateAction} people={people?.[position.id]} />)}
          <li><button type="button" className="wc-addrow" disabled={!ready} onClick={() => setAdding(true)}><PlusIcon aria-hidden="true" weight="bold" />Add position</button></li>
        </ul> : null}
        {archived.length ? <ul className="q-list wc-editables" aria-label="Archived positions">
          <li className="wc-cardhead" aria-hidden="true"><span>{`Archived (${archived.length})`}</span></li>
          {archived.map(position => <PositionRow key={position.id} position={position} hidden={false} ready={ready} action={updateAction} people={people?.[position.id]} />)}
        </ul> : null}
        {positions.length ? <p className="wc-foot">Choose a position to rename or archive it. Past shifts keep their position.</p> : null}
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