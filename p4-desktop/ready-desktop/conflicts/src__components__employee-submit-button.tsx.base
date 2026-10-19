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
  return <button type="submit" className={className} disabled={disabled || pending}>{pending ? pendingText : children}</button>;
}
