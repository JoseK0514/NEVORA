"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { SigPendingLabel, useKeepFocusWhileBusy } from "@/components/signature/sig-button";

export function LoginSubmit({ idle = "Sign in", busy = "Signing in…", className = "ap-primary", focusPassword = false }: { idle?: string; busy?: string; className?: string;
  /** The page came back with the Employee ID already filled in (a failed attempt, or straight from activation): the
   * caret goes to the password, the one field left to type (inspection Nov 14, 2026, PB-006 and PB-003). */
  focusPassword?: boolean }) {
  const { pending } = useFormStatus();
  const button = useRef<HTMLButtonElement>(null);
  useKeepFocusWhileBusy(button, pending);
  useEffect(() => {
    if (pending || !focusPassword) return;
    const form = button.current?.form;
    const id = form?.elements.namedItem("employeeId"), password = form?.elements.namedItem("password");
    if (id instanceof HTMLInputElement && id.value.trim() && password instanceof HTMLInputElement) password.focus();
  }, [pending, focusPassword]);
  // Signature pending: the button keeps its fill and focus (aria-disabled, never native disabled) and refuses a
  // second press, so only one sign-in request leaves.
  return (
    <>
    <button ref={button} type="submit" className={className} aria-disabled={pending || undefined} aria-busy={pending}
      onClick={event => { if (pending) event.preventDefault(); }}>
      <SigPendingLabel pending={pending} pendingText={busy}>{idle}</SigPendingLabel>
    </button>
    <span className={className === "ap-primary" ? "ap-sr" : "q-sr"} role="status" aria-live="polite" aria-atomic="true">
      {pending ? busy : ""}
    </span>
    </>
  );
}
