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

it("keeps the suggested order, picks the best fit first and Assign opens that person's review", () => {
  const html = render();
  expect(html.indexOf("Avery Cruz")).toBeLessThan(html.indexOf("Blair Rivera"));
  // Board O-FindCover: "Who can cover" as radios, the first chosen and marked Best fit; Assign is the one action.
  expect(html).toContain(">Who can cover<"); expect(html).toContain("2\u00a0people free");
  expect(html).toContain('name="coverPerson" checked="" value="E1"'); expect(html).toContain('name="coverPerson" value="E2"/>');
  expect(html.indexOf(">Best fit<")).toBeLessThan(html.indexOf("Blair Rivera"));
  expect(html).toContain('href="/app/schedule/new?employeeId=E1&amp;start=08:00" class="c-btn c-btn--full" aria-label="Review shift for Avery Cruz"');
  expect(html).toContain(">Assign<");
  expect(html).not.toContain("<form");
});

it("shows the three best fits first and the rest on request", () => {
  const many = Array.from({ length: 5 }, (_, i) => ({ ...props.candidates[0], employeeId: `P${i}`, employeeName: `Person ${i}`, href: `/app/schedule/new?employeeId=P${i}` }));
  const html = render({ candidates: many });
  expect(html).toContain("Person 2"); expect(html).not.toContain("Person 3"); expect(html).toContain(">Show 2 more</button>");
  expect(html).toContain("5\u00a0people free");
});

it("keeps missing targets distinct from zero targets", () => {
  const html = render();
  expect(html).toContain("12h of 32h this week"); expect(html).toContain("18h this week · No target set");
  const zero = render({ candidates: [{ ...props.candidates[1], targetHours: 0 }] });
  expect(zero).not.toContain("No target set"); expect(zero).toContain("18h this week");
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
    requirements: [{ label: "Operations: 1 missing", href: "/app/schedule/coverage?repair=current-position", selected: true },
      { label: "Shift lead needed", href: "/app/schedule/coverage?repair=lead", selected: false }],
  });
  expect(html).toContain('href="/app/schedule/new?review=signed-review-token"');
  expect(html).toContain('href="/app/schedule/coverage?repair=current-position" class="c-row c-row--one" aria-current="true"');
  expect(html).toContain(">Open shift<"); expect(html).not.toContain("Not filled"); expect(html).toContain("Operations · Mon, Oct 12 · Main Office · Shift lead needed");
  expect(html).toContain("Review replacement for Avery Cruz");
  // One need only: no chooser.
  expect(render({ repair: true, requirements: [{ label: "1 more person needed", href: "/app/schedule/coverage?repair=one", selected: true }] })).not.toContain("repair=one");
});

it("labels overnight context and empty results without an assignment action", () => {
  // Dates and times are kept whole with no-break spaces; compare the words.
  // R2: the time is the kit's CorpTime (thin and narrow spaces, AM/PM in spans), so compare the words without tags.
  const html = render({ startTime: "22:00", endTime: "06:00", candidates: [] }).replace(/[\u00a0\u2009\u202f]/g, " ").replace(/<span class="c-ampm">([^<]*)<\/span>/g, "$1");
  expect(html).toContain("Ends Tue, Oct 13"); expect(html).toContain("10:00 PM – 6:00 AM");
  // Owner premium R14 / copy table 29–31: words for zero, and no "lead" (the role is on hold).
  expect(html).toContain("No one free"); expect(html).toContain("No one is free"); expect(html).not.toContain("lead, location"); expect(html).not.toContain("/app/schedule/new?");
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
