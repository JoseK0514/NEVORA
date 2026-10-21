"use client";

import { useFormStatus } from "react-dom";

export function ActivationSubmit({pending:controlledPending,idle="Activate account",busy="Activating account…"}: {pending?:boolean;idle?:string;busy?:string} = {}) {
  const status = useFormStatus();
  const pending = controlledPending ?? status.pending;
  return <>
    <button type="submit" className="ap-primary" disabled={pending} aria-busy={pending}>
      <span>{pending ? busy : idle}</span>
    </button>
    <span className="ap-sr" role="status" aria-live="polite" aria-atomic="true">
      {pending ? busy : ""}
    </span>
  </>;
}
