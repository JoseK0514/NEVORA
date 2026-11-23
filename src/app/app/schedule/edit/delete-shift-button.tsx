"use client";

import { PendingLabel } from "@/components/employee-submit-button";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** The delete form's button says what it is doing while the request is out (form pattern). */
export function DeleteShiftButton() {
  const { pending } = useFormStatus();
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return <button ref={ref} className="c-btn c-btn--danger c-shift__ask-go" type="submit" aria-disabled={pending || undefined} onClick={event => { if (pending) event.preventDefault(); }}><PendingLabel pending={pending} pendingText="Deleting…">Delete</PendingLabel></button>;
}

/** Board O-EditShift, Nov 1 upscale: Delete shift is a red text row in its own card under the form (red text at the footer's
 * left on desktop). The first tap says what will happen; the second deletes.
 * Final polish (Nov 20, 2026; confirmations review A #6, #11): the question is one block, as "Cancel this time off?" is:
 * a 600 title, the consequence, then quiet Keep shift and the red-edged commit on one row. From 768px it is the form
 * card's last section (owner-b-schedule.css); on phones it is the card the Delete shift row was. The title asks
 * the question and the commit says "Delete" (gaps G30: "Delete this shift" repeated the title); it still differs from the
 * "Delete shift" row, so a second tap never lands on a button of the same name. */
export function DeleteShiftConfirm({ warning }: { warning: ReactNode }) {
  const [asked, setAsked] = useState(false);
  const title = useId();
  if (!asked) return <button type="button" className="c-shift__delete-row" aria-expanded="false" onClick={() => setAsked(true)}>Delete shift</button>;
  return <div className="c-shift__ask" role="group" aria-labelledby={title}>
    <p className="c-shift__ask-t" id={title}>Delete this shift?</p>
    <p className="c-shift__warn" role="status">{warning}</p>
    <div className="c-shift__ask-acts">
      <button type="button" className="c-btn c-btn--secondary b-rowact b-rowact--quiet c-shift__ask-keep" onClick={() => setAsked(false)}>Keep shift</button>
      <DeleteShiftButton />
    </div>
  </div>;
}
