"use client";

import { usePathname } from "next/navigation";
import { RouteSkeleton } from "@/components/route-skeleton";

type Shape = { route: string; label: string; shape: "grid" | "list" | "cards"; band: number; overlap?: boolean };

/* ST-22: on a tab tap Next can show this parent placeholder for a frame before the destination's own.
 * Draw the destination's shape (the same props as its loading.tsx), so that frame matches what follows. */
const shapes: [string | RegExp, Shape][] = [
  ["/app/employees", { route: "team", label: "team", shape: "list", band: 220 }],
  ["/app/inbox", { route: "inbox", label: "inbox", shape: "list", band: 308 }],
  // Phase 3.5 Wave B: more specific routes first; band heights measured at 390 (set in premium-wave-b.css).
  ["/app/schedule/templates", { route: "wb-templates", label: "templates", shape: "list", band: 244 }],
  ["/app/schedule/settings", { route: "wb-rules", label: "scheduling rules", shape: "list", band: 196, overlap: false }],
  ["/app/reports", { route: "wb-insights", label: "insights", shape: "cards", band: 200 }],
  ["/app/updates/compose", { route: "wb-compose", label: "the update form", shape: "list", band: 312 }],
  ["/app/settings/payroll", { route: "wb-payroll-settings", label: "payroll settings", shape: "cards", band: 128, overlap: false }],
  ["/app/schedule", { route: "schedule", label: "schedule", shape: "grid", band: 244 }],
  ["/app/timecards", { route: "timecards", label: "timecards", shape: "list", band: 172, overlap: false }],
  ["/app/payroll-export", { route: "exports", label: "time exports", shape: "cards", band: 152, overlap: false }],
  ["/app/payroll", { route: "payroll", label: "payroll", shape: "cards", band: 152, overlap: false }],
  ["/app/requests/hub", { route: "hub", label: "requests", shape: "list", band: 104, overlap: false }],
  ["/app/requests", { route: "review", label: "time off", shape: "list", band: 264 }],
  // Employee and Lead pages (Phase 3): flat bands; the employee shell sets their heights in CSS.
  ["/app/exchange", { route: "exchange", label: "shift requests", shape: "list", band: 236, overlap: false }],
  ["/app/availability", { route: "availability", label: "availability", shape: "cards", band: 192, overlap: false }],
  ["/app/my-time", { route: "mytime", label: "your time", shape: "cards", band: 172, overlap: false }],
  ["/app/my-pay", { route: "mypay", label: "your pay", shape: "cards", band: 128, overlap: false }],
  ["/app/profile", { route: "profile", label: "profile", shape: "cards", band: 128, overlap: false }],
  // Wave B: a direct load of one update draws Update detail's shape; its band heights are in premium-wave-b.css.
  [/^\/app\/updates\/[^/]+$/, { route: "wb-update", label: "update", shape: "cards", band: 288 }],
  ["/app/updates", { route: "updates", label: "updates", shape: "list", band: 128, overlap: false }],
  ["/app/notifications", { route: "notifications", label: "notifications", shape: "list", band: 128, overlap: false }],
  // Wave C (Phase 3.5): Settings and the recovery pages; heights in premium-wave-c.css. Each route also has its own loading.tsx.
  ["/app/settings/workspace", { route: "settings-profile", label: "company profile", shape: "cards", band: 232 }],
  ["/app/settings/locations/new", { route: "settings-location-new", label: "the new location form", shape: "cards", band: 208 }],
  ["/app/settings/locations", { route: "settings-locations", label: "locations", shape: "cards", band: 276 }],
  ["/app/settings/branding", { route: "settings-branding", label: "branding", shape: "cards", band: 256 }],
  ["/app/settings/features", { route: "settings-features", label: "features and words", shape: "cards", band: 256 }],
  ["/app/settings/company-policies", { route: "settings-policies", label: "company policies", shape: "cards", band: 232 }],
  ["/app/settings/breaks", { route: "settings-breaks", label: "break types", shape: "cards", band: 276 }],
  ["/app/settings/positions", { route: "settings-positions", label: "positions", shape: "cards", band: 276 }],
  ["/app/settings/clocker", { route: "settings-devices", label: "Clocker devices", shape: "cards", band: 276 }],
  ["/app/settings", { route: "settings", label: "settings", shape: "cards", band: 232 }],
  ["/app/account-recovery", { route: "account-recovery", label: "account recovery", shape: "cards", band: 232 }],
  ["/app/clocker-recovery", { route: "clocker-recovery", label: "Clocker recovery", shape: "cards", band: 232 }],
];
const home: Shape = { route: "home", label: "your workspace", shape: "cards", band: 220 };

export function RootLoading() {
  const pathname = usePathname() ?? "/app";
  const match = shapes.find(([prefix]) => typeof prefix === "string" ? pathname === prefix || pathname.startsWith(`${prefix}/`) : prefix.test(pathname))?.[1] ?? home;
  return <RouteSkeleton {...match} />;
}
