import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("next/link", () => ({ default: ({ children, ...props }: ComponentProps<"a">) => createElement("a", props, children) }));
import { MobileHomeOverview, MobileHomeTools } from "./mobile-home-overview";

it("keeps selected-week facts, draft context and exact week destinations in the phone summary", () => {
  const html = renderToStaticMarkup(<MobileHomeOverview weekStart="2026-10-12" weekLabel="Oct 12 – Oct 18"
    previousWeek="2026-10-05" nextWeek="2026-10-19" plannedShifts={21}
    availabilityReceived={6} availabilityEligible={10} publishedLocations={1} locations={2}/>);
  expect(html).toContain('href="/app?week=2026-10-05"');
  expect(html).toContain('href="/app?week=2026-10-19"');
  expect(html).toContain('href="/app/schedule?week=2026-10-12"');
  expect(html).toContain('Includes drafts');
  expect(html).toContain('6<span> of 10</span>');
  expect(html).toContain('style="width:60%"');
  expect(html).toContain('1<span> of 2</span>');
  expect(html).toContain('style="width:50%"');
});

it("preserves the remaining manager views behind meaningful phone actions", () => {
  const html = renderToStaticMarkup(<MobileHomeTools weekStart="2026-10-12" owner/>);
  for (const view of ['attendance', 'team', 'activity']) {
    expect(html).toContain(`href="/app?week=2026-10-12&amp;view=${view}"`);
  }
  // R1: requests have one landing, the Inbox filtered to Requests.
  expect(html).toContain('href="/app/inbox?filter=requests"');
  expect(html).not.toContain('view=requests');
  expect(html).toContain('Review attendance');
  expect(html).toContain('Pending requests');
  expect(html).toContain('href="/app/clocker-recovery"');
  expect(html).toContain('href="/app/account-recovery"');
});

it("an empty roster shows an empty bar rather than dividing by zero", () => {
  const html = renderToStaticMarkup(<MobileHomeOverview weekStart="2026-10-12" weekLabel="Oct 12 – Oct 18"
    previousWeek="2026-10-05" nextWeek="2026-10-19" plannedShifts={0}
    availabilityReceived={0} availabilityEligible={0} publishedLocations={0} locations={0}/>);
  expect(html).toContain('0<span> of 0</span>');
  expect(html).toContain('style="width:0%"');
});

it("keeps account recovery and attendance available without Owner Clocker controls",()=>{const html=renderToStaticMarkup(<MobileHomeTools weekStart="2026-10-12"/>);expect(html).not.toContain("/app/clocker-recovery");expect(html).toContain("/app/account-recovery");expect(html).toContain("view=attendance");});
