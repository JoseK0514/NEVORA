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
    onClick={event => { if (pending) event.preventDefault(); }}>{pending ? pendingText : children}</button>;
}
