"use client";

import { useFormStatus } from "react-dom";

export function LoginSubmit() {
  const { pending } = useFormStatus();
  return (
    <>
    <button type="submit" className="button primary full employee-login-submit" disabled={pending} aria-busy={pending}>
      <span>{pending ? "Signing in…" : "Sign in"}</span>
    </button>
    <span className="login-submit-status" role="status" aria-live="polite" aria-atomic="true">
      {pending ? "Signing in…" : ""}
    </span>
    </>
  );
}
