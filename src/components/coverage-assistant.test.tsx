import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { AssignLabel, CoverageAssistant, type CoverageAssistantProps } from "./coverage-assistant";

const linkState = vi.hoisted(() => ({ pending: false }));
vi.mock("next/link", () => ({ useLinkStatus: () => linkState, default: ({ href, children, prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => { void prefetch; return createElement("a", { href, ...props }, children); } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }), usePathname: () => "/app/schedule/coverage", useSearchParams: () => new URLSearchParams() }));

const props: CoverageAssistantProps = {
  date: "2026-10-12", startTime: "08:00", endTime: "16:00", locationName: "Main Office",
  designatedLead: false, backHref: "/app/schedule?week=2026-10-12&location=loc-1", status: "READY",
  candidates: [
    { employeeId: "E1", employeeName: "Avery Cruz", role: "EMPLOYEE", scheduledHours: 12, targetHours: 32, hoursNeeded: 20, priorUnderTargetWeeks: 2, href: "/app/schedule/new?employeeId=E1&start=08:00" },
    { employeeId: "E2", employeeName: "Blair Rivera", role: "LEAD", scheduledHours: 18, hoursNeeded: 0, priorUnderTargetWeeks: 0, href: "/app/schedule/new?employeeId=E2&start=08:00" },
  ],
};
const render = (patch: Partial<CoverageAssistantProps> = {}) => renderToStaticMarkup(createElement(CoverageAssistant, { ...props, ...patch }));

it("preserves source order and each employee's review destination as radio rows behind Assign (T-5)", () => {
  const html = render();
  expect(html.indexOf("Avery Cruz")).toBeLessThan(html.indexOf("Blair Rivera"));
  expect(html).toContain('value="/app/schedule/new?employeeId=E1&amp;start=08:00"');
  expect(html).toContain('value="/app/schedule/new?employeeId=E2&amp;start=08:00"');
  expect(html.match(/type="radio"/g)).toHaveLength(2);
  // Assign waits for a choice, and nothing on this page saves.
  expect(html).toMatch(/<button type="button" class="q-nav__r q-nav__r--b" disabled="">Assign<\/button>/);
  expect(html).not.toContain("<form");
  expect(html).toContain('href="/app/schedule?week=2026-10-12&amp;location=loc-1"');
});

it("keeps missing targets distinct from zero targets and exposes historical context", () => {
  const html = render();
  expect(html).toContain("No target set"); expect(html).toContain("20 h under target");
  expect(html).toContain("Under target 2 earlier weeks"); expect(html).toContain("context only");
  const zero = render({ candidates: [{ ...props.candidates[1], targetHours: 0 }] });
  expect(zero).not.toContain("No target set"); expect(zero).toContain("At or above target");
});

it.each(["STALE", "RESOLVED", "CHOOSE"] as const)("%s never exposes retained candidate review links", status => {
  const html = render({ status, repair: true, refreshHref: "/app/schedule/coverage?repair=retained&refresh=1", requirements: [{ label: "Lead missing", href: "/app/schedule/coverage?repair=lead", selected: false }] });
  expect(html).not.toContain("employeeId=E1"); expect(html).not.toContain("employeeId=E2");
  expect(html.includes("refresh=1")).toBe(status === "STALE");
  expect(html.includes("repair=lead")).toBe(status === "CHOOSE");
  expect(html).not.toContain(">Assign<");
});

it("keeps signed replacement review links and selected requirements intact", () => {
  const html = render({ repair: true, positionName: "Operations", designatedLead: true,
    candidates: [{ ...props.candidates[0], href: "/app/schedule/new?review=signed-review-token" }],
    requirements: [{ label: "Operations: 1 missing", href: "/app/schedule/coverage?repair=current-position", selected: true }],
  });
  expect(html).toContain('value="/app/schedule/new?review=signed-review-token"');
  expect(html).toContain('aria-current="true"'); expect(html).toContain("<b>Shift lead</b></span><span class=\"q-rv q-rv--l\">Needed");
  expect(html).toContain("Operations");
});

it("labels overnight context; with no one, offers to add a shift anyway (no one pre-chosen) or ask the team", () => {
  // Dates and times are kept whole with no-break spaces; compare the words.
  const empty = { candidates: [], addAnywayHref: "/app/schedule/new?week=2026-10-12&date=2026-10-12&locationId=loc-1&start=22:00&end=06:00" };
  const html = render({ startTime: "22:00", endTime: "06:00", ...empty }).replace(/ /g, " ");
  expect(html).toContain("Ends Tue, Oct 13"); expect(html).toContain("· 8 h");
  expect(html).toContain("0 people"); expect(html).toContain("No one can work it right now");
  expect(html).toContain('href="/app/schedule/new?week=2026-10-12&amp;date=2026-10-12&amp;locationId=loc-1&amp;start=22:00&amp;end=06:00"');
  expect(html).not.toContain("employeeId="); expect(html).toContain("Add a shift anyway"); expect(html).toContain('href="/app/updates/compose"');
  expect(html).not.toContain("Back to schedule");
  expect(html).toContain(props.backHref.replaceAll("&", "&amp;"));
});

it("a shift that ends at midnight says so without an end day", () => {
  const html = render({ startTime: "16:00", endTime: "24:00" }).replace(/ /g, " ");
  expect(html).toContain("4:00 PM – midnight · 8 h");
  expect(html).not.toContain("Ends Tue");
  expect(html).not.toContain("12:00 AM");
});

it("names the pending review while Assign opens it", () => {
  linkState.pending = true;
  try {
    const html = renderToStaticMarkup(createElement(AssignLabel));
    expect(html).toContain('role="status" aria-live="polite"');
    expect(html).toContain("Opening review…");
  } finally { linkState.pending = false; }
  expect(renderToStaticMarkup(createElement(AssignLabel))).toContain(">Assign<");
});
