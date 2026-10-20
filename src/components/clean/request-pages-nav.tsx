"use client";
import Link from "next/link";
import { usePresentation } from "@/components/presentation-context";
import { pathEnabled } from "@/lib/workspace-presentation/modules";

/** Clean Manager (v3): Time off, Shift requests and Availability link to each other in their band, in place of the
 * section tabs (one pill row per page). Owner and Manager only; turned-off modules leave the row. */
export function RequestPagesNav({ current }: { current: "/app/requests" | "/app/exchange" | "/app/availability" }) {
  const { modules } = usePresentation();
  const pages = [
    { href: "/app/requests", label: "Time off" },
    { href: "/app/exchange", label: "Shift requests" },
    { href: "/app/availability", label: "Availability" },
  ].filter(page => pathEnabled(page.href, modules));
  if (pages.length < 2) return null;
  return <nav className="cm-request-pages" aria-label="Request pages">
    {pages.map(page => <Link key={page.href} href={page.href} aria-current={page.href === current ? "page" : undefined}>{page.label}</Link>)}
  </nav>;
}
