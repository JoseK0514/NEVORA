"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import type { ConfigurationResult } from "@/components/configuration-form";
import { CorpCard, CorpEmpty, CorpErrorCard, CorpRow, CorpRows } from "@/components/corp/corp";
import { FormDiscardGuard } from "@/components/kit/discard-dialog";
import { leaveWithDiscardGuard } from "@/components/kit/use-discard-guard";
import { toast } from "@/components/toaster";
import type { Position } from "@/lib/domain";
import { FieldB, ResultB, SwitchRowB } from "../settings-b-form";
import { FieldErrors, lockPageScroll, useFieldErrors } from "../wave-c-form";

type PositionAction = (data: FormData) => Promise<ConfigurationResult>;
type Editing = { kind: "add" } | { kind: "edit"; position: Position };
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const nameMessages = { name: { missing: "Enter a position name" } };
const peopleText = (count: number) => `${count} ${count === 1 ? "person" : "people"}`;

/** J8 Positions in Direction B (Nov 23, 2026). The editor's root is a fragment, so its cards are direct children of the
 * Settings page (SettingsPageB): an Active card with a row per position (name, how many active people hold it) and the
 * "Add position" row, then an Archived card when there are any. A row opens one dialog (a sheet on phones) to rename or
 * archive; "Add position" opens the same dialog empty. Same actions and fields as before (id, expectedUpdatedAt, name,
 * active). */
export function PositionCatalog({ positions, available, createAction, updateAction, people }: {
  positions: readonly Position[]; available: boolean; createAction: PositionAction; updateAction: PositionAction;
  /** Quiet (v4): how many active people hold each position. */
  people?: Readonly<Record<string, number>>;
}) {
  const ready = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [opened, setOpened] = useState(0);
  const trigger = useRef<string | null>(null);

  // Focus goes back to the row that opened the dialog once the dialog is gone (a modal dialog makes the page inert until then).
  const returnFocus = useRef(false);
  useEffect(() => {
    if (editing || !returnFocus.current) return;
    returnFocus.current = false;
    const target = trigger.current ? document.getElementById(trigger.current) : null;
    (target ?? document.getElementById("position-add"))?.focus({ preventScroll: true });
  }, [editing, positions]);

  function open(next: Editing, triggerId: string) {
    trigger.current = triggerId;
    setOpened(count => count + 1);
    setEditing(next);
  }

  if (!available) return <CorpErrorCard title="Couldn’t load positions." body="Nothing was changed."
    // eslint-disable-next-line next-preserved/no-html-link-for-pages -- a retry after a failed server read reloads the whole document so every read runs again, with or without JavaScript
    action={<a className="c-btn c-btn--secondary" href="/app/settings/positions">Try again</a>} />;

  const active = positions.filter(position => position.active);
  const archived = positions.filter(position => !position.active);
  const row = (position: Position) => <li key={position.id}>
    <CorpRow id={`position-row-${position.id}`} title={position.name} one
      value={people?.[position.id] === undefined ? undefined : peopleText(people[position.id])}
      onClick={() => open({ kind: "edit", position }, `position-row-${position.id}`)} />
  </li>;

  return <>
    <p className="c-sr" role="status" aria-live="polite">{positions.length ? `${active.length} active and ${archived.length} archived positions` : ""}</p>
    {positions.length ? <CorpCard id="positions-active" label="Active" count={active.length}>
      <CorpRows label="Active positions">
        {active.map(row)}
        <li><CorpRow id="position-add" title="Add position" icon={<PlusIcon weight="bold" />} one chevron={false} disabled={!ready}
          onClick={() => open({ kind: "add" }, "position-add")} /></li>
      </CorpRows>
    </CorpCard> : <CorpEmpty title="No positions yet" body="Shifts can still be added without a position."
      action={<button id="position-add" type="button" className="c-btn" disabled={!ready} onClick={() => open({ kind: "add" }, "position-add")}>Add position</button>} />}
    {archived.length ? <CorpCard id="positions-archived" label="Archived" count={archived.length}>
      <CorpRows label="Archived positions">{archived.map(row)}</CorpRows>
    </CorpCard> : null}
    <noscript><p className="c-note">JavaScript is required to add or edit positions.</p></noscript>
    {/* The dialog is not a child of the page itself, so the page's card rules (full width, the gap between cards) never
      reach it; display: contents gives its holder no box. */}
    <div style={{ display: "contents" }}>{editing ? <PositionDialog key={opened} editing={editing} createAction={createAction} updateAction={updateAction}
      onClose={() => { returnFocus.current = true; setEditing(null); }} /> : null}</div>
  </>;
}

export function PositionDialog({ editing, createAction, updateAction, onClose }: {
  editing: Editing; createAction: PositionAction; updateAction: PositionAction; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const sending = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { errors, handlers, clear } = useFieldErrors(nameMessages);
  const position = editing.kind === "edit" ? editing.position : null;
  const id = position ? `position-${position.id}` : "new-position";

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    element?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true });
    const unlock = lockPageScroll();
    return () => { unlock(); if (element?.open) element.close(); };
  }, []);
  useEffect(() => { if (error) feedback.current?.focus(); }, [error]);

  const close = () => { if (!sending.current) onClose(); };
  const askClose = () => leaveWithDiscardGuard(close);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    if (!event.currentTarget.checkValidity()) return;
    const data = new FormData(event.currentTarget);
    sending.current = true; setPending(true); setError(null); clear();
    try {
      const result = await (position ? updateAction : createAction)(data);
      if (result.success && !result.error) {
        toast(result.success);
        sending.current = false;
        onClose();
        return;
      }
      setError(result.error || "It may not have saved. Your entries are kept; check the page before you try again.");
    } catch {
      setError("Your entries are kept. Try again.");
    } finally { sending.current = false; setPending(false); }
  }

  const titleId = `${id}-title`;
  return <dialog ref={dialog} className="c-setb-dlg wc-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); askClose(); }}>
    <form noValidate onSubmit={submit} aria-busy={pending} {...handlers}
      onInput={() => { if (error) setError(null); }}>
      <FormDiscardGuard />
      <div className="c-setb-dlg__head">
        <div><h2 className="c-setb-dlg__title" id={titleId}>{position ? "Edit position" : "New position"}</h2></div>
        <button type="button" className="c-setb-dlg__close" aria-label="Close" disabled={pending} onClick={askClose}><XIcon weight="bold" aria-hidden="true" /></button>
      </div>
      <div className="c-setb-dlg__body">
        <fieldset className="c-setb-fieldset" disabled={pending}>
          {position ? <>
            <input type="hidden" name="id" value={position.id} />
            <input type="hidden" name="expectedUpdatedAt" value={position.updatedAt ?? ""} />
          </> : null}
          <FieldErrors errors={errors}>
            <FieldB label="Name" id={`${id}-name`} name="name" defaultValue={position?.name ?? ""} required maxLength={80} autoComplete="off"
              placeholder={position ? undefined : "e.g. Front desk"} />
          </FieldErrors>
          {position ? <ul className="c-rows">
            <li><SwitchRowB id={`${id}-active`} name="active" defaultChecked={position.active} label="Active"
              description="Archived positions can’t be newly assigned. They stay on past shifts and timecards." /></li>
          </ul> : null}
        </fieldset>
      </div>
      {error ? <ResultB innerRef={feedback} tone="urgent" title="Not saved">{error}</ResultB> : null}
      <p className="c-sr" role="status" aria-live="polite">{pending ? (position ? "Saving…" : "Adding…") : ""}</p>
      <div className="c-setb-dlg__acts">
        <button type="button" className="c-btn c-btn--secondary" disabled={pending} onClick={askClose}>Cancel</button>
        <button type="submit" className="c-btn" disabled={pending}>
          {pending ? (position ? "Saving…" : "Adding…") : position ? "Save position" : "Add position"}
        </button>
      </div>
    </form>
  </dialog>;
}
