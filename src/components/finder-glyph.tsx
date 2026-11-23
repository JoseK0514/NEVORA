import type { ReactNode } from "react";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { BuildingsIcon } from "@phosphor-icons/react/dist/ssr/Buildings";
import { PaintBrushIcon } from "@phosphor-icons/react/dist/ssr/PaintBrush";
import { ToggleRightIcon } from "@phosphor-icons/react/dist/ssr/ToggleRight";
import { ScrollIcon } from "@phosphor-icons/react/dist/ssr/Scroll";
import { BriefcaseIcon } from "@phosphor-icons/react/dist/ssr/Briefcase";
import { CoffeeIcon } from "@phosphor-icons/react/dist/ssr/Coffee";
import { DeviceTabletIcon } from "@phosphor-icons/react/dist/ssr/DeviceTablet";
import { PasswordIcon } from "@phosphor-icons/react/dist/ssr/Password";
import { CameraIcon } from "@phosphor-icons/react/dist/ssr/Camera";
import { ClockCountdownIcon } from "@phosphor-icons/react/dist/ssr/ClockCountdown";
import { CurrencyDollarIcon } from "@phosphor-icons/react/dist/ssr/CurrencyDollar";
import { QuestionIcon } from "@phosphor-icons/react/dist/ssr/Question";
import { NavIcon, type NavIconName } from "@/components/nav-icon";
import type { FinderItem } from "@/lib/finder";

/* Final polish (Nov 20, 2026; confirmations review A #20): a finder row leads with the glyph of the place it opens, the
 * one the sidebar, More or the Settings hub draws for it (it was one bolt for every action and one blank page for every
 * page). An action that creates something leads with the bold Plus, as create actions do on the band; any other action
 * leads with the glyph of the page it opens. */
const CREATES = new Set(["action:shift", "action:employee", "action:update"]);
/** The Settings hub's own row glyphs (src/app/app/settings/page.tsx). */
const SETTINGS: Record<string, ReactNode> = {
  "/app/settings/workspace": <BuildingsIcon weight="bold" aria-hidden="true" />,
  "/app/settings/locations": <MapPinIcon weight="bold" aria-hidden="true" />,
  "/app/settings/branding": <PaintBrushIcon weight="bold" aria-hidden="true" />,
  "/app/settings/features": <ToggleRightIcon weight="bold" aria-hidden="true" />,
  "/app/settings/company-policies": <ScrollIcon weight="bold" aria-hidden="true" />,
  "/app/settings/positions": <BriefcaseIcon weight="bold" aria-hidden="true" />,
  "/app/settings/breaks": <CoffeeIcon weight="bold" aria-hidden="true" />,
  "/app/settings/clocker": <DeviceTabletIcon weight="bold" aria-hidden="true" />,
  "/app/settings/clocker/pins": <PasswordIcon weight="bold" aria-hidden="true" />,
  "/app/settings/clocker/photos": <CameraIcon weight="bold" aria-hidden="true" />,
  "/app/settings/clocker/matching": <ClockCountdownIcon weight="bold" aria-hidden="true" />,
  "/app/settings/payroll": <CurrencyDollarIcon weight="bold" aria-hidden="true" />,
};
/** Places the role's navigation may not list under this address (an Employee's pages, an action's page). */
const PLACES: Record<string, NavIconName> = {
  "/app": "dashboard", "/app/inbox": "inbox", "/app/schedule": "schedule", "/app/schedule/new": "schedule", "/app/availability": "availability",
  "/app/requests": "timeOff", "/app/requests/hub": "requests", "/app/exchange": "exchange", "/app/updates": "updates", "/app/updates/compose": "updates",
  "/app/employees": "employees", "/app/employees/new": "employees", "/app/timecards": "clock", "/app/my-time": "clock", "/app/reports": "reports",
  "/app/payroll-export": "export", "/app/payroll": "payroll", "/app/my-pay": "receipt", "/app/notifications": "notifications", "/app/profile": "employee",
  "/app/settings": "settings", "/app/schedule/templates": "templates", "/app/schedule/settings": "rules",
};

export function finderGlyph(item: FinderItem, nav: Record<string, NavIconName>): ReactNode {
  if (item.group === "Locations") return <MapPinIcon weight="bold" aria-hidden="true" />;
  if (CREATES.has(item.id)) return <PlusIcon weight="bold" aria-hidden="true" />;
  const path = item.href.split(/[?#]/)[0];
  if (SETTINGS[path]) return SETTINGS[path];
  if (path === "/app/help") return <QuestionIcon weight="bold" aria-hidden="true" />;
  // A page's own entry first (a Home view such as Activity has its own glyph), then the page an action opens.
  const name = (item.group === "Pages" ? nav[item.href] : undefined) ?? PLACES[path] ?? nav[path] ?? (path.startsWith("/app/settings") ? "settings" : "arrowRight");
  return <NavIcon name={name} />;
}
