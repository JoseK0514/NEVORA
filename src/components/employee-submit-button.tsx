"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { SigPendingLabel } from "./signature/sig-button";


/** Reserve both labels and centre the shorter pending words in the same grid cell. The pending words carry the
 * Signature 16px spinner, so every working button in the app shows the same "working" sign. */
export function PendingLabel({children,pendingText,pending,className = ""}: {children: ReactNode; pendingText: ReactNode; pending: boolean; className?: string}) {
  return <SigPendingLabel className={`nv-label-swap ${className}`.trim()} pending={pending} pendingText={pendingText}>{children}</SigPendingLabel>;
}

export function EmployeeSubmitButton({
  children,
  pendingText,
  className,
  disabled = false,
}: {
  children: ReactNode;
  pendingText: string;
  className: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  // IS (round 3): while sending, the button stays focusable (aria-disabled) so focus doesn't fall to the page top; a
  // second click, tap or Enter is refused here, so only one request leaves. Signature: pending wins over disabled (the
  // native attribute would drop focus and the quiet disabled look would read as "failed"), and aria-busy marks it working.
  return <button type="submit" className={className} disabled={(disabled && !pending) || undefined} aria-disabled={pending || undefined}
    aria-busy={pending || undefined} onClick={event => { if (pending) event.preventDefault(); }}>
    {/* ST-WA-8 (shared): both labels share one grid cell, so the button keeps the size of the longer one and the page
        doesn't move when "Send" becomes "Sending…" at large text. The hidden label is out of the accessibility tree.
        The pending cell carries SigButton's 16px spinner. */}
    <SigPendingLabel className="nv-label-swap" pending={pending} pendingText={pendingText}>{children}</SigPendingLabel>
  </button>;
}
