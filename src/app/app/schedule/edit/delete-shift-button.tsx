"use client";

import { PendingLabel } from "@/components/employee-submit-button";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** The delete form's button says what it is doing while the request is out (form pattern). */
export function DeleteShiftButton() {
  const { pending } = useFormStatus();
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return <button ref={ref} className="c-btn c-btn--danger c-btn--full" type="submit" aria-disabled={pending || undefined} onClick={event => { if (pending) event.preventDefault(); }}><PendingLabel pending={pending} pendingText="Deleting…">Delete this shift</PendingLabel></button>;
}

/** Board O-EditShift, Nov 1 upscale: Delete shift is a red text row in its own card under the form (red text at the footer's
 * left on desktop). The first tap says what will happen; the second deletes. */
export function DeleteShiftConfirm({ warning }: { warning: ReactNode }) {
  const [asked, setAsked] = useState(false);
  if (!asked) return <button type="button" className="c-shift__delete-row" aria-expanded="false" onClick={() => setAsked(true)}>Delete shift</button>;
  return <>
    <p className="c-shift__warn" role="status">{warning}</p>
    <DeleteShiftButton />
    <button type="button" className="c-btn c-btn--secondary c-btn--full" onClick={() => setAsked(false)}>Keep shift</button>
  </>;
}
