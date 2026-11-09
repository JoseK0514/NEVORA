"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { SigPendingLabel, useKeepFocusWhileBusy } from "@/components/signature/sig-button";

export function LoginSubmit({ idle = "Sign in", busy = "Signing in…", className = "ap-primary" }: { idle?: string; busy?: string; className?: string }) {
  const { pending } = useFormStatus();
  const button = useRef<HTMLButtonElement>(null);
  useKeepFocusWhileBusy(button, pending);
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
