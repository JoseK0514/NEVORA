import type { ReactNode } from "react";

export function StatusPill({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "info";
  children: ReactNode;
}) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}
