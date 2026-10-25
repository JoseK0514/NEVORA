"use client";

import "@/components/quiet/u2.css";
import { useState } from "react";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { PendingLabel } from "@/components/employee-submit-button";
import { useFormStatus } from "react-dom";
import { QuietSheet, useSheetClose } from "@/components/quiet/quiet-sheet";

/** The delete form's button says what it is doing while the request is out (form pattern). */
export function DeleteShiftButton() {
  const { pending } = useFormStatus();
  return <button className="q-btn u2-btn--danger" type="submit" aria-disabled={pending || undefined} onClick={event => { if (pending) event.preventDefault(); }}><PendingLabel pending={pending} pendingText="Deleting…">Delete shift</PendingLabel></button>;
}

function KeepShift() {
  const close = useSheetClose();
  return <button type="button" className="q-btn q-btn--sec" onClick={() => close?.()}>Keep shift</button>;
}

/** T-4 (Team U2, Oct 25, 2026): one danger pattern. A red row at the bottom opens a confirmation sheet ("Delete this
 * shift?", whose shift and when); the sheet holds the real delete form, apart from the edit form. */
export function DeleteShiftRow({ title = "Delete this shift?", detail, children }: { title?: string; detail?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <>
    <ul className="q-list u2-delete">
      <li><button type="button" className="q-row q-row--one q-row--btn q-row--danger" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <span className="q-row__ic" aria-hidden="true"><TrashIcon className="q-ic" /></span>
        <span className="q-rt"><b>Delete shift</b></span>
      </button></li>
    </ul>
    <QuietSheet open={open} label={title} onClose={() => setOpen(false)}>
      <div className="u2-confirm" id="edit-shift-delete">
        <p className="u2-confirm__title">{title}</p>
        {detail ? <p className="q-help u2-confirm__detail">{detail}</p> : null}
        {children}
        <KeepShift />
      </div>
    </QuietSheet>
  </>;
}
