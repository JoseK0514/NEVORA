import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { CoverageAssistant, type CoverageAssistantProps } from "./coverage-assistant";

const linkState = vi.hoisted(() => ({ pending: false }));
vi.mock("next/link", () => ({ useLinkStatus: () => linkState, default: ({ href, children, prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => { void prefetch; return createElement("a", { href, ...props }, children); } }));

const props: CoverageAssistantProps = {
  date: "2026-10-12", startTime: "08:00", endTime: "16:00", locationName: "Main Office",
  designatedLead: false, backHref: "/app/schedule?week=2026-10-12&location=loc-1", status: "READY",
  candidates: [
    { employeeId: "E1", employeeName: "Avery Cruz", role: "EMPLOYEE", scheduledHours: 12, targetHours: 32, hoursNeeded: 20, priorUnderTargetWeeks: 2, href: "/app/schedule/new?employeeId=E1&start=08:00" },
    { employeeId: "E2", employeeName: "Blair Rivera", role: "LEAD", scheduledHours: 18, hoursNeeded: 0, priorUnderTargetWeeks: 0, href: "/app/schedule/new?employeeId=E2&start=08:00" },
  ],
};
const render = (patch: Partial<CoverageAssistantProps> = {}) => renderToStaticMarkup(createElement(CoverageAssistant, { ...props, ...patch }));

it("preserves source order and each employee's review destination in native disclosures", () => {
  const html = render();
  expect(html.indexOf("Avery Cruz")).toBeLessThan(html.indexOf("Blair Rivera"));
  expect(html).toContain('href="/app/schedule/new?employeeId=E1&amp;start=08:00"');
  expect(html).toContain('href="/app/schedule/new?employeeId=E2&amp;start=08:00"');
  expect(html.match(/<details class="coverage-employee-details"/g)).toHaveLength(2);
  expect(html).not.toContain("<form");
});

it("keeps missing targets distinct from zero targets and exposes historical context", () => {
  const html = render();
  expect(html).toContain("No target set"); expect(html).toContain("20h below target");
  expect(html).toContain("Prior weeks short"); expect(html).toContain("context only");
  const zero = render({ candidates: [{ ...props.candidates[1], targetHours: 0 }] });
  expect(zero).not.toContain("No target set"); expect(zero).toContain("At or above target");
});

it.each(["STALE", "RESOLVED", "CHOOSE"] as const)("%s never exposes retained candidate review links", status => {
  const html = render({ status, repair: true, refreshHref: "/app/schedule/coverage?repair=retained&refresh=1", requirements: [{ label: "Lead missing", href: "/app/schedule/coverage?repair=lead", selected: false }] });
  expect(html).not.toContain("employeeId=E1"); expect(html).not.toContain("employeeId=E2");
  expect(html.includes("refresh=1")).toBe(status === "STALE");
  expect(html.includes("repair=lead")).toBe(status === "CHOOSE");
});

it("keeps signed replacement review links and selected requirements intact", () => {
  const html = render({ repair: true, positionName: "Operations", designatedLead: true,
    candidates: [{ ...props.candidates[0], href: "/app/schedule/new?review=signed-review-token" }],
    requirements: [{ label: "Operations: 1 missing", href: "/app/schedule/coverage?repair=current-position", selected: true }],
  });
  expect(html).toContain('href="/app/schedule/new?review=signed-review-token"');
  expect(html).toContain('aria-current="true"'); expect(html).toContain("Designated Lead required");
  expect(html).toContain("Review replacement");
});

it("labels overnight context and empty results without an assignment action", () => {
  const html = render({ startTime: "22:00", endTime: "06:00", candidates: [] });
  expect(html).toContain("Ends next day"); expect(html).toContain("8h shift");
  expect(html).toContain("0 eligible"); expect(html).not.toContain("/app/schedule/new?");
  expect(html).toContain(props.backHref.replaceAll("&", "&amp;"));
});

it("names the pending review without changing its destination", () => {
  linkState.pending = true;
  try {
    const html = render();
    expect(html).toContain('role="status" aria-live="polite"');
    expect(html).toContain("Opening review…");
    expect(html).toContain('href="/app/schedule/new?employeeId=E1&amp;start=08:00"');
  } finally { linkState.pending = false; }
});
