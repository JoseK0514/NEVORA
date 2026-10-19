"use client";

import { useSearchParams } from "next/navigation";
import { SettingsLoading } from "./wave-c-loading";

/** The recovery placeholders name the same Back as the page will: the employee, Settings or Home. */
export function RecoveryLoading({ title, summary, label, cards }: { title: string; summary: string; label: string; cards: number[] }) {
  const params = useSearchParams();
  const employee = params.get("employee")?.trim();
  const back = employee ? { href: `/app/employees/${encodeURIComponent(employee.slice(0, 200))}`, label: "Employee" }
    : params.get("from") === "settings" ? { href: "/app/settings", label: "Settings" } : { href: "/app", label: "Home" };
  return <SettingsLoading back={back} title={title} summary={summary} label={label} cards={cards} />;
}
