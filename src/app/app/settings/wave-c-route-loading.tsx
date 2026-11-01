"use client";

import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { SettingsLoading } from "./wave-c-loading";

type Props = ComponentProps<typeof SettingsLoading>;
const locations = { href: "/app/settings/locations", label: "Locations" };
/* The Settings segment's placeholder takes the destination's shape, so entering a sub-page from
 * elsewhere never shows the hub's band first (the same words as each page's own loading.tsx). */
const shapes: [RegExp, Props][] = [
  [/^\/app\/settings\/workspace/, { title: "Company profile", summary: "Your business name and the timezone your team works in.", label: "company profile", cards: [1, 2] }],
  [/^\/app\/settings\/locations\/new/, { back: locations, title: "Add location", summary: "Give your team a new place to work.", label: "the new location form", cards: [2, 1] }],
  [/^\/app\/settings\/locations\/[^/]+/, { back: locations, eyebrow: true, title: <span className="wc-skeleton__title" />, summary: "Names and status your team sees, and this location’s Clocker link.", label: "the location", cards: [2, 1] }],
  [/^\/app\/settings\/locations/, { eyebrow: true, add: "Add location", title: <span className="wc-skeleton__title" />, summary: "Where your team works, each place’s scheduling setup and its Clocker link.", label: "locations", cards: [2, 3, 3], aside: false }],
  [/^\/app\/settings\/branding/, { title: "Branding", summary: "Your color and logo across NEVORA. Layout, text sizes and status colors stay the same.", label: "branding", cards: [3, 2, 4] }],
  [/^\/app\/settings\/features/, { title: "Features & words", summary: "Turn off what your company doesn’t use, and name your team the way you do.", label: "features and words", cards: [4, 5] }],
  [/^\/app\/settings\/company-policies/, { title: "Company policies", summary: "Set attendance review rules for your company and locations.", label: "company policies", cards: [2, 1, 1, 1] }],
  [/^\/app\/settings\/breaks/, { eyebrow: true, add: "Add break type", title: "Break types", summary: "The breaks your team can start at the Clocker.", label: "break types", cards: [2, 3] }],
  [/^\/app\/settings\/positions/, { eyebrow: true, title: "Positions", summary: "The job qualifications your team brings to each shift.", label: "positions", cards: [1, 4] }],
  [/^\/app\/settings\/clocker/, { title: "Clocker tablets", summary: "A shared tablet at each location, with access you control.", label: "Clocker tablets", cards: [2, 4] }],
];
const hub: Props = { back: null, eyebrow: true, title: "Settings", summary: "Set up your workspace and the way your team works.", label: "settings", cards: [4, 4], aside: false };

export function SettingsRouteLoading() {
  const pathname = usePathname() ?? "/app/settings";
  const props = shapes.find(([pattern]) => pattern.test(pathname))?.[1] ?? hub;
  return <SettingsLoading {...props} />;
}
