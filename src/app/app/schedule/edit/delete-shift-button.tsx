"use client";

import { useState } from "react";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { PendingLabel } from "@/components/employee-submit-button";
import { useFormStatus } from "react-dom";

/** The delete form's button says what it is doing while the request is out (form pattern). */
export function DeleteShiftButton() {
  const { pending } = useFormStatus();
  return <button className="q-btn q-btn--danger" type="submit" aria-disabled={pending || undefined} onClick={event => { if (pending) event.preventDefault(); }}><PendingLabel pending={pending} pendingText="Deleting…">Delete this shift</PendingLabel></button>;
}

/** Quiet (Oct 25, 2026): a red row that opens its confirmation; the confirmation holds the real delete form. */
export function DeleteShiftRow({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <>
    <ul className="q-list q-shift-form__more">
      <li><button type="button" className="q-row q-row--one q-row--btn q-row--danger" aria-expanded={open} aria-controls="edit-shift-delete" onClick={() => setOpen(value => !value)}>
        <span className="q-row__ic" aria-hidden="true"><TrashIcon className="q-ic" /></span>
        <span className="q-rt"><b>{open ? "Keep this shift" : "Delete shift"}</b></span>
      </button></li>
    </ul>
    <div id="edit-shift-delete" hidden={!open}>{children}</div>
  </>;
}
