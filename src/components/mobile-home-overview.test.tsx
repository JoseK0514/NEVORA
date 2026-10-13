import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("next/link", () => ({ default: ({ children, ...props }: ComponentProps<"a">) => createElement("a", props, children) }));
import { MobileHomeOverview, MobileHomeTools } from "./mobile-home-overview";

it("keeps selected-week facts, draft context and exact week destinations in the phone summary", () => {
  const html = renderToStaticMarkup(<MobileHomeOverview weekStart="2026-10-12" weekLabel="Oct 12 – Oct 18"
    previousWeek="2026-10-05" nextWeek="2026-10-19" plannedShifts={21}
    availabilityReceived={6} activeEmployees={10} publishedLocations={1} locations={2}/>);
  expect(html).toContain('href="/app?week=2026-10-05"');
  expect(html).toContain('href="/app?week=2026-10-19"');
  expect(html).toContain('href="/app/schedule?week=2026-10-12"');
  expect(html).toContain('including drafts');
  expect(html).toContain('<dd>6<span> / 10</span></dd>');
  expect(html).toContain('<dd>1<span> / 2</span></dd>');
});

it("preserves the remaining manager views behind meaningful phone actions", () => {
  const html = renderToStaticMarkup(<MobileHomeTools weekStart="2026-10-12"/>);
  for (const view of ['attendance', 'team', 'requests', 'activity']) {
    expect(html).toContain(`href="/app?week=2026-10-12&amp;view=${view}"`);
  }
  expect(html).toContain('Review attendance');
  expect(html).toContain('Pending requests');
});
