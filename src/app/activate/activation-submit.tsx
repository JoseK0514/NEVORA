"use client";

import { useFormStatus } from "react-dom";

export function ActivationSubmit({ idle = "Activate account", busy = "Activating account…" }: { idle?: string; busy?: string }) {
  const { pending } = useFormStatus();
  return <>
    <button type="submit" className="ap-primary" disabled={pending} aria-busy={pending}>
      <span>{pending ? busy : idle}</span>
    </button>
    <span className="ap-sr" role="status" aria-live="polite" aria-atomic="true">
      {pending ? busy : ""}
    </span>
  </>;
}
