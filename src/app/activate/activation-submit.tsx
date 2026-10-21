"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { SigSpinner, useKeepFocusWhileBusy } from "@/components/signature/sig-button";

export function ActivationSubmit({pending:controlledPending}: {pending?:boolean} = {}) {
  const status = useFormStatus();
  const pending = controlledPending ?? status.pending;
  const button = useRef<HTMLButtonElement>(null);
  useKeepFocusWhileBusy(button, pending);
  // Signature pending: deep fill, the shared spinner, focus kept (aria-disabled, never native disabled); a second
  // press is refused so only one activation request leaves. It sits outside the fieldset that locks the passwords.
  return <>
    <button ref={button} type="submit" className="ap-primary act-submit" aria-disabled={pending || undefined} aria-busy={pending}
      onClick={event => { if (pending) event.preventDefault(); }}>
      {pending ? <SigSpinner /> : null}
      <span>{pending ? "Activating account…" : "Activate account"}</span>
      {pending ? null : <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />}
    </button>
    <span className="ap-sr" role="status" aria-live="polite" aria-atomic="true">
      {pending ? "Activating account…" : ""}
    </span>
  </>;
}
