"use client";

import { useFormStatus } from "react-dom";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";

export function LoginSubmit() {
  const { pending } = useFormStatus();
  return (
    <>
    <button type="submit" className="button primary full employee-login-submit" disabled={pending} aria-busy={pending}>
      <span>{pending ? "Signing in…" : "Sign In"}</span>
      <ArrowRightIcon size={20} weight="regular" aria-hidden="true" focusable="false" />
    </button>
    <span className="login-submit-status" role="status" aria-live="polite" aria-atomic="true">
      {pending ? "Signing in…" : ""}
    </span>
    </>
  );
}
