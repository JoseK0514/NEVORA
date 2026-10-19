"use client";

import { PendingLabel } from "@/components/employee-submit-button";
import { useFormStatus } from "react-dom";

/** The delete form's button says what it is doing while the request is out (form pattern). */
export function DeleteShiftButton() {
  const { pending } = useFormStatus();
  return <button className="nv-btn" data-kind="danger" data-block="true" type="submit" disabled={pending}><PendingLabel pending={pending} pendingText="Deleting…">Delete this shift</PendingLabel></button>;
}
