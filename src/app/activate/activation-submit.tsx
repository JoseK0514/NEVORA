"use client";

import { useFormStatus } from "react-dom";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";

export function ActivationSubmit({pending:controlledPending}: {pending?:boolean} = {}) {
  const status = useFormStatus();
  const pending = controlledPending ?? status.pending;
  return <>
    <button type="submit" className="ap-primary act-submit" disabled={pending} aria-busy={pending}>
      {pending ? <span className="act-spin act-spin--light" aria-hidden="true" /> : null}
      <span>{pending ? "Activating account…" : "Activate account"}</span>
      {pending ? null : <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />}
    </button>
    <span className="ap-sr" role="status" aria-live="polite" aria-atomic="true">
      {pending ? "Activating account…" : ""}
    </span>
  </>;
}
