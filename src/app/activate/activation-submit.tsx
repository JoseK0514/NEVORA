"use client";

import { useFormStatus } from "react-dom";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";

export function ActivationSubmit({pending:controlledPending}: {pending?:boolean} = {}) {
  const status = useFormStatus();
  const pending = controlledPending ?? status.pending;
  return <>
    <button type="submit" className="button primary full employee-login-submit" disabled={pending} aria-busy={pending}>
      <span>{pending ? "Activating account…" : "Activate account"}</span>
      <ArrowRightIcon size={20} weight="regular" aria-hidden="true" focusable="false" />
    </button>
    <span className="login-submit-status" role="status" aria-live="polite" aria-atomic="true">
      {pending ? "Activating account…" : ""}
    </span>
  </>;
}
