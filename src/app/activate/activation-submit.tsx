"use client";

import { useFormStatus } from "react-dom";

export function ActivationSubmit() {
  const { pending } = useFormStatus();
  return <>
    <button type="submit" className="button primary full employee-login-submit" disabled={pending} aria-busy={pending}>
      <span>{pending ? "Activating account…" : "Activate account"}</span>
    </button>
    <span className="login-submit-status" role="status" aria-live="polite" aria-atomic="true">
      {pending ? "Activating account…" : ""}
    </span>
  </>;
}
