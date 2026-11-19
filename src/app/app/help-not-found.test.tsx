import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, rs } from '@rstest/core';

rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
const fixture = rs.hoisted(() => ({ role: "OWNER", payroll: false, scope: "COMPANY", modules: undefined as Record<string, boolean> | undefined, failed: false }));
rs.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); }, usePathname: () => "/app/help", useRouter: () => ({ refresh: () => undefined }) }));
rs.mock("@/lib/auth/session", () => ({ requireSession: async () => ({ id: "fictional", role: fixture.role, firstName: "Ana", lastName: "Colón" }),
  requireSessionMutationProof: async () => ({ employee: { id: "fictional", role: fixture.role }, sessionTokenHash: "a".repeat(64) }) }));
// How to lists only what this person can open: the same role, scope, module and payroll reads the menus use (fictional here).
rs.mock("@/lib/payroll/service", () => ({ payrollFeatureEnabled: () => fixture.payroll,
  readPayrollCapabilities: async () => ({ enabled: true, canConfigure: true, canReview: true, canApprove: true, internalCalculatorAvailable: false, bankCompatibility: "UNVERIFIED" }) }));
rs.mock("@/lib/company-access/operational-scope.server", () => ({ readOperationalAuthority: async () => {
  if (fixture.failed) throw new Error("fictional read failure");
  return { state: "ready", employeeId: "fictional", role: "MANAGER", source: "LEGACY_ADOPTION", scope: { mode: fixture.scope, locationIds: fixture.scope === "COMPANY" ? [] : ["l1"] }, scopeRevision: 1, authority: "fictional", locations: [], observedAt: "2026-11-14T12:00:00Z", validForMs: 15000 };
} }));
rs.mock("@/lib/workspace-presentation/current.server", () => ({ currentBrand: async () => ({ words: "standard", modules: fixture.modules }) }));

import NotFound from "./not-found";
import MissingPage from "./[...missing]/page";
import HelpPage from "./help/page";

beforeEach(() => { fixture.role = "OWNER"; fixture.payroll = false; fixture.scope = "COMPANY"; fixture.modules = undefined; fixture.failed = false; });
const rowLinks = (html: string, id: string) => [...(html.split(`id="${id}"`)[1]?.split("</section>")[0] ?? "").matchAll(/<a[^>]*href="([^"]+)"[^>]*>(?:<[^>]+>)*([^<]+)/g)].map(match => [match[1], match[2]]);

// Nov 1 upscale (kit consistency 9): a signed-in 404 stays in the shell, in the kit.
it("tells a signed-in person the page doesn't exist and takes them Home", () => {
  const out = renderToStaticMarkup(createElement(NotFound));
  // B7 wording (NV-120): one 404 heading everywhere.
  expect(out).toContain('<h1 id="not-found-title" tabindex="-1">Page not found</h1>');
  // Phase 2 (package D): one Direction B state screen at every width, with the kit's one teal pill.
  expect(out).toContain('<a href="/app" class="b-btn b-btn--teal">Go to Home</a>');
  expect(out.match(/Go to Home/g)).toHaveLength(1);
  expect(out).not.toMatch(/sign in|404/i);
});
it("sends any unknown /app address to that page", () => {
  expect(() => MissingPage()).toThrow("NEXT_NOT_FOUND");
});

it("keeps Help inside the app with the support content in kit cards and ‹ More back", async () => {
  const out = renderToStaticMarkup(await HelpPage());
  expect(out).toContain('href="/app/more"');
  expect(out).toMatch(/<svg[^>]*>.*<\/svg>More<\/a>/);
  // Review Nov 14 (BR-4): tablets and desktop have no More page leading to Help, so their back link (the second bar) is Home.
  expect(out).toMatch(/<a href="\/app\/more" class="c-nav__back">.*?More<\/a>.*<a href="\/app" class="c-nav__back">.*?Home<\/a>/);
  expect(out).toContain('<h1 id="help-title">Help</h1>');
  expect(out).toContain('href="mailto:support@thevelani.com"');
  expect(out).toContain("I can’t sign in");
  expect(out).toContain("Report a problem");
  // An Owner is never told to ask their manager; they get the team member's way back in instead.
  expect(out).not.toContain("Ask your manager");
  expect(out).toContain("Someone on my team can’t sign in");
  expect(out).toContain('href="/app/account-recovery"');
  // Review Nov 14 (AR-15): the page is named as Team's row and its own heading name it.
  expect(out).toContain("Help someone sign in");
  expect(out).not.toContain("Account recovery");
  expect(out).not.toContain("[CONFIRM_");
});
it("words Help for an Employee and opens policies inside their profile", async () => {
  fixture.role = "EMPLOYEE";
  const out = renderToStaticMarkup(await HelpPage());
  expect(out).toContain("Shift, time off or pay");
  expect(out).toContain("Ask your manager");
  expect(out).not.toContain("Someone on my team");
  if (out.includes("Privacy Policy")) expect(out).toContain('href="/app/profile/privacy"');
});

// Review Nov 14 (BR-12): How to, the jobs each role does most, one line and one link each, only to pages the person can open.
it("gives an Owner the How to jobs, with payroll only where payroll is on", async () => {
  let out = renderToStaticMarkup(await HelpPage());
  expect(rowLinks(out, "help-how")).toEqual([["/app/employees", "Add your team"], ["/app/schedule/publish", "Build and publish a week"], ["/app/settings/clocker", "Set up the time clock"], ["/app/timecards", "Approve timecards"]]);
  // How to sits between Contact and Common questions.
  expect(out.indexOf('id="help-contact"')).toBeLessThan(out.indexOf('id="help-how"'));
  expect(out.indexOf('id="help-how"')).toBeLessThan(out.indexOf('id="help-questions"'));
  fixture.payroll = true;
  out = renderToStaticMarkup(await HelpPage());
  expect(rowLinks(out, "help-how").at(-1)).toEqual(["/app/payroll", "Prepare payroll"]);
  expect(rowLinks(out, "help-how")).toHaveLength(5);
});
it("leaves Owner-only and company-wide jobs out of a Manager's How to", async () => {
  fixture.role = "MANAGER";
  let out = renderToStaticMarkup(await HelpPage());
  expect(rowLinks(out, "help-how")).toEqual([["/app/employees", "Add your team"], ["/app/schedule/publish", "Build and publish a week"], ["/app/timecards", "Approve timecards"]]);
  // A Manager limited to locations has none of these pages, so the section is left out.
  fixture.scope = "LOCATIONS";
  out = renderToStaticMarkup(await HelpPage());
  expect(out).not.toContain("How to");
});
it("gives an Employee or Lead their own How to jobs, following the company's modules and payroll", async () => {
  for (const role of ["EMPLOYEE", "LEAD"]) {
    fixture.role = role; fixture.payroll = true; fixture.modules = undefined;
    let out = renderToStaticMarkup(await HelpPage());
    const jobs = [["/app/schedule", "Confirm your schedule"], ["/app/requests?tab=new", "Ask for time off"], ["/app/exchange", "Swap or give away a shift"], ["/app/my-time", "Fix a missed punch"], ["/app/my-pay", "See your pay statement"]];
    // The Direction B card (the one an Employee sees) and the kit rows carry the same jobs.
    expect(rowLinks(out, "b-help-how")).toEqual(jobs);
    expect(rowLinks(out, "help-how")).toEqual(jobs);
    expect(out).toContain('class="b-keep c-help__how"');
    expect(out).not.toContain("Add your team");
    fixture.payroll = false; fixture.modules = { timeOff: false, marketplace: false, updates: true, payStatements: true, breaks: true };
    out = renderToStaticMarkup(await HelpPage());
    expect(rowLinks(out, "b-help-how")).toEqual([["/app/schedule", "Confirm your schedule"], ["/app/my-time", "Fix a missed punch"]]);
  }
});
it("keeps the rest of Help when the How to reads fail", async () => {
  fixture.failed = true;
  const out = renderToStaticMarkup(await HelpPage());
  expect(out).not.toContain("How to");
  expect(out).toContain('href="mailto:support@thevelani.com"');
  expect(out).toContain("I can’t sign in");
});
