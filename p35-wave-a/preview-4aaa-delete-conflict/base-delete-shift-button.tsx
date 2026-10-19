"use client";

import { useFormStatus } from "react-dom";
import { useKeepHeight } from "@/components/wave-a/keep-height";

/** The delete form's button says what it is doing while the request is out (form pattern). */
export function DeleteShiftButton() {
  const { pending } = useFormStatus();
  const button = useKeepHeight<HTMLButtonElement>(pending);
  return <button ref={button} className="nv-btn" data-kind="danger" data-block="true" type="submit" disabled={pending}>{pending ? "Deleting…" : "Delete this shift"}</button>;
}
