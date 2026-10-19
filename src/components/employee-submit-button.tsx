"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

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
  // second click, tap or Enter is refused here, so only one request leaves.
  return <button type="submit" className={className} disabled={disabled} aria-disabled={pending || undefined}
    onClick={event => { if (pending) event.preventDefault(); }}>
    {/* ST-WA-8 (shared): both labels share one grid cell, so the button keeps the size of the longer one and the page
        doesn't move when "Send" becomes "Sending…" at large text. The hidden label is out of the accessibility tree. */}
    <span className="nv-label-swap"><span style={pending ? {visibility: "hidden"} : undefined}>{children}</span><span style={pending ? undefined : {visibility: "hidden"}} aria-hidden={!pending || undefined}>{pendingText}</span></span>
  </button>;
}
