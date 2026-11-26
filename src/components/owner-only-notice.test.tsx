import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, rs } from '@rstest/core';

rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));

import { PortalLangProvider } from "../lib/i18n/portal-lang";
import { OwnerOnlyNotice, closedPayrollForManager, ownerNames } from "./owner-only-notice";

const has = (...hrefs: string[]) => (href: string) => hrefs.includes(href);

// Review Nov 11 (MG-002): the closed Payroll page points a Manager to their own part of the job and to their own pay.
describe("closed Payroll for a Manager", () => {
  it("names timecards as the Manager's part, and the Owner who runs payroll", () => {
    expect(closedPayrollForManager(has("/app/timecards", "/app/my-pay"), ownerNames(["Jose Natal"]))).toEqual({
      line: "Your part is timecards. Jose Natal runs payroll after you approve them.",
      next: { href: "/app/timecards", label: "Open Timecards" },
      also: { href: "/app/my-pay", label: "See my pay" },
    });
  });
  it("never offers a page the Manager's navigation does not have", () => {
    const none = closedPayrollForManager(has(), ownerNames(["Jose Natal", "Ana Colon", "Third Owner"]));
    expect(none).toEqual({ line: "Jose Natal or Ana Colon can give you payroll access.", next: undefined, also: undefined });
    expect(closedPayrollForManager(has(), null).line).toBe("Owners can give you payroll access.");
    expect(closedPayrollForManager(has("/app/timecards"), null)).toMatchObject({ line: "Your part is timecards. An Owner runs payroll after you approve them.", also: undefined });
  });
});

// Phase 3 (MG-002, MG-015): the one state screen for a page closed to a Manager.
describe("the closed-page state screen", () => {
  const html = renderToStaticMarkup(<OwnerOnlyNotice state title="Payroll" reason="Payroll is for Owners" line="Your part is timecards. Jose Natal runs payroll after you approve them."
    next={{ href: "/app/timecards", label: "Open Timecards" }} also={{ href: "/app/my-pay", label: "See my pay" }} />);
  it("has one title, the lock in the kit's round holder, the reason and the sentence", () => {
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toMatch(/<h1 id="owner-only-title"[^>]*>Payroll<\/h1>/);
    expect(html).toContain('<div class="b-statecard" data-kind="locked" role="status"><span class="b-ico b-ico--grey" aria-hidden="true">');
    expect(html).toContain('<p class="b-statecard__t">Payroll is for Owners</p>');
    expect(html).toContain("Your part is timecards. Jose Natal runs payroll after you approve them.");
  });
  it("offers the way on as a tinted pill and a text link, never a filled button", () => {
    expect(html).toContain('<a href="/app/timecards" class="b-btn b-btn--ghost">Open Timecards</a>');
    expect(html).toContain('<a href="/app/my-pay" class="b-closed-also">See my pay</a>');
    expect(html).not.toContain("b-btn--teal");
    expect(html).not.toContain("c-btn");
  });
  // Final verification F (F09): a closed page without a page of its own to offer still has one tinted step, Home (it was a
  // dead end on desktop, where the band draws no "‹ Home").
  it("offers Return to Home as the one tinted step when the page gives no way on", () => {
    const bare = renderToStaticMarkup(<OwnerOnlyNotice state title="Payroll" reason="Payroll is for Owners" line="Owners can give you payroll access." />);
    expect(bare).toContain('<div class="b-state-actions b-closed-actions"><a href="/app" class="b-btn b-btn--ghost">Return to Home</a></div>');
    expect(bare).not.toContain("b-btn--teal");
  });
  it("names a closed Settings page on the band (Settings itself, outside the router)", () => {
    const settings = renderToStaticMarkup(<OwnerOnlyNotice state title="Settings" reason="Settings are for Owners" line="Ask an Owner if you need a change here." />);
    expect(settings).toMatch(/<h1 id="owner-only-title"[^>]*>Settings<\/h1>/);
  });
  it("preserves the Spanish Settings heading for both restricted layouts", () => {
    for (const state of [false, true]) {
      const spanish = renderToStaticMarkup(<PortalLangProvider lang="es"><OwnerOnlyNotice
        lang="es" state={state} title="Configuración" reason="La configuración es para los dueños" /></PortalLangProvider>);
      expect(spanish).toMatch(/<h1[^>]*><span class="closed-settings-title"[^>]*>Configuración<\/span><\/h1>/);
    }
  });
  it("leaves the notice an Employee sees as it was (two layouts, one filled way on)", () => {
    const employee = renderToStaticMarkup(<OwnerOnlyNotice title="Insights" reason="Insights is for Owners and Managers" help="Your own hours are on Time." next={{ href: "/app/my-time", label: "Open Time" }} />);
    expect(employee).toContain('<a href="/app/my-time" class="b-btn b-btn--teal">Open Time</a>');
    expect(employee).toContain('<a href="/app/my-time" class="c-btn">Open Time</a>');
    expect(employee).not.toContain("b-closed-actions");
  });
});
