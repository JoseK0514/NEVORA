"use client";

import { usePathname } from "next/navigation";
import { RouteSkeleton } from "@/components/route-skeleton";

type Shape = { route: string; label: string; shape: "grid" | "list" | "cards"; band: number; overlap?: boolean };

/* ST-22: on a tab tap Next can show this parent placeholder for a frame before the destination's own.
 * Draw the destination's shape (the same props as its loading.tsx), so that frame matches what follows. */
const shapes: [string, Shape][] = [
  ["/app/employees", { route: "team", label: "team", shape: "list", band: 220 }],
  ["/app/inbox", { route: "inbox", label: "inbox", shape: "list", band: 308 }],
  ["/app/schedule", { route: "schedule", label: "schedule", shape: "grid", band: 244 }],
  ["/app/timecards", { route: "timecards", label: "timecards", shape: "list", band: 172, overlap: false }],
  ["/app/payroll-export", { route: "exports", label: "time exports", shape: "cards", band: 152, overlap: false }],
  ["/app/payroll", { route: "payroll", label: "payroll", shape: "cards", band: 152, overlap: false }],
  ["/app/requests", { route: "review", label: "time off", shape: "list", band: 264 }],
];
const home: Shape = { route: "home", label: "your workspace", shape: "cards", band: 220 };

export function RootLoading() {
  const pathname = usePathname() ?? "/app";
  const match = shapes.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? home;
  return <RouteSkeleton {...match} />;
}
