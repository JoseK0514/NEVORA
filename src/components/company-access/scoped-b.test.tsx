import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from "@rstest/core";

rs.mock("next/link", () => ({ default: ({ children, ...props }: ComponentProps<"a">) => createElement("a", props, children) }));
rs.mock("@/components/manager-clock-monitor", () => ({ ManagerClockMonitor: () => createElement("p", null, "Clocked in now") }));
rs.mock("./scoped-read-frame", () => ({ ScopedReadFrame: ({ children }: { children: ReactNode }) => createElement("div", null, children) }));
import { ScopedHomeB } from "./scoped-b";

const one = [{ id: "loc-2", name: "Northside Bakery — Condado", shortName: "Condado" }];
const view = { state: "ready", employeeId: "m", role: "MANAGER", source: "OWNER_ASSIGNMENT", scope: { mode: "LOCATIONS" }, scopeRevision: 1, authority: "a", locations: one, observedAt: "2026-11-22T12:00:00Z", validForMs: 15000 } as never;
const gap = { id: "g1", title: "Coverage gap at Condado", detail: "Mon, Nov 23 · 6:00 AM–2:00 PM · Need 1 employee", href: "/app/schedule/coverage?x=1" };

it("Home names the one place in the band, puts open shifts first with Find cover, and drops the access paragraph", () => {
  const html = renderToStaticMarkup(createElement(ScopedHomeB, { view, openShifts: [gap], scheduleHref: "/app/schedule?week=2026-11-23" }));
  expect(html).toContain(">Condado<");
  expect(html).toContain("Find cover");
  expect(html).not.toContain("Coverage gap at");
  expect(html).toContain('href="/app/schedule/coverage?x=1"');
  expect(html).not.toContain("company-wide");
  expect(html.indexOf("Open shifts")).toBeLessThan(html.indexOf("Clocked in now"));
});

it("Home says when open shifts couldn't be checked, and when everything is covered", () => {
  expect(renderToStaticMarkup(createElement(ScopedHomeB, { view, openShifts: null, scheduleHref: "/app/schedule" }))).toContain("Couldn’t check open shifts. Reload to try again.");
  expect(renderToStaticMarkup(createElement(ScopedHomeB, { view, openShifts: [], scheduleHref: "/app/schedule" }))).toContain("Every shift this week is covered.");
});
