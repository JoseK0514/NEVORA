"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";

export function AvailabilityFeedback({ children, error = false }: { children: ReactNode; error?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, [children, error]);
  const Icon = error ? WarningCircleIcon : CheckCircleIcon;
  return <div ref={ref} className={`av-feedback${error ? " error" : " success"}`} tabIndex={-1} role={error ? "alert" : "status"}><Icon size={22} aria-hidden="true" /><p>{children}</p></div>;
}
