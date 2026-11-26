// Phase 2 (package D): loading, error and offline are designed once. The placeholder keeps the page's frame, a state is one
// band and one card, and the offline line never sits between the top bar and the band.
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, rs } from '@rstest/core';

rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
rs.mock("./owner-b.css", () => ({}));
rs.mock("@/components/kit/focus-after-retry", () => ({ focusAfterRetry: () => {} }));

import { BHero, BLoadingScreen, BState, BStateScreen } from "./b-kit";
import { BOfflineContext } from "./b-offline";
import { BRouteLoading, loadingShape } from "./b-loading";
import { BRouteError } from "./b-route-error";

const css = readFileSync(join(__dirname, "owner-b.css"), "utf8");
const count = (html: string, text: string) => html.split(text).length - 1;

describe("the loading placeholder keeps the page's frame", () => {
  it("without a shape it is the first version: a title bar and two cards, said once as Loading…", () => {
    const html = renderToStaticMarkup(<BLoadingScreen />);
    expect(html).toContain('data-b-load=""');
    expect(html).toContain('<h1><span class="b-skel b-skel--title" aria-hidden="true"></span><span class="b-sr">Loading…</span></h1>');
    expect(count(html, '<section class="b-card"')).toBe(2);
    expect(html).not.toContain("data-b-band");
  });
  it("draws the page's own title, back row, strip, band height, width and row cards", () => {
    const html = renderToStaticMarkup(<BLoadingScreen {...loadingShape("/app/settings/clocker/pins", false)} />);
    // Clocker PINs: a back link, a title with no sub-line and the search on the band, which ends at 264 (a band of its own).
    // (Notifications was this test's page until Nov 20, 2026, when it lost its back link from 768px and took the 296 strip band.)
    expect(html).toContain('class="b-screen b-screen--back" data-b-load="" data-b-band="own" style="--b-band-own:264px" data-b-frame="read"');
    expect(html).not.toContain("data-b-lift");
    expect(html).toContain('data-b-under=""');
    expect(html).toContain('<span class="b-skel b-skel--back" aria-hidden="true"></span>');
    expect(html).toContain('<h1>Clocker PINs<span class="b-sr"> Loading…</span></h1>');
    expect(html).toContain('<span class="b-skel b-skel--strip" aria-hidden="true"></span>');
    expect(count(html, 'class="b-skel-row"')).toBe(6);
    // The cards are placeholders only: nothing in them is read aloud or can take focus.
    expect(html).toContain('<section class="b-card" aria-hidden="true">');
    expect(html).not.toMatch(/<a |<button/);
  });
  it("a slow page keeps the band and the title and shows one state card with one Try again", () => {
    const html = renderToStaticMarkup(<BLoadingScreen {...loadingShape("/app/schedule", false)}
      state={<BState alert kind="loading" title="This is taking longer than usual" line="Check your connection, then try again." action={{ label: "Try again", onClick: () => {} }} />} />);
    expect(html).toContain('data-b-band="strip" data-b-frame="state"');
    // The page overlaps its band, so the state keeps the band's strip (and its height) on a phone.
    expect(html).not.toContain("data-b-under");
    expect(html).toContain('<span class="b-skel b-skel--strip" aria-hidden="true"></span>');
    expect(html).toContain("<h1>Schedule</h1>");
    expect(count(html, '<section class="b-card"')).toBe(1);
    expect(html).toContain('role="alert"');
    expect(count(html, ">Try again</button>")).toBe(1);
    expect(html).not.toContain("b-skel-card");
  });
  it("gives every route a ladder band, except the main tabs that keep their loaded height", () => {
    // Home (both shells) and the Employee's Time, Pay and Requests keep the shell's own height (--b-ph-band).
    expect(loadingShape("/app", false).band).toBeUndefined();
    for (const path of ["/app", "/app/my-time", "/app/my-pay", "/app/requests/hub"]) expect(loadingShape(path, true).band, path).toBeUndefined();
    // Owner and Manager (package A's settled frame).
    for (const path of ["/app/schedule", "/app/timecards", "/app/employees", "/app/inbox", "/app/availability", "/app/payroll-export", "/app/settings/payroll"]) expect(loadingShape(path, false).band, path).toBe("strip");
    // Polish (Nov 20, 2026): a strip of tabs is one band (296), with or without a sub-line; Notifications has no back link
    // from 768px. Clocker PINs (search on the band, no tabs strip) keeps 264.
    for (const path of ["/app/notifications", "/app/requests", "/app/exchange", "/app/updates"]) expect(loadingShape(path, false).band, path).toBe("strip");
    expect(loadingShape("/app/notifications", false).back).toBeFalsy();
    expect(loadingShape("/app/settings/clocker/pins", false).band).toBe(264);
    expect(loadingShape("/app/updates", false).back).toBeFalsy();
    expect(loadingShape("/app/updates", false).lift).toBeUndefined();
    for (const path of ["/app/reports", "/app/settings", "/app/more", "/app/help", "/app/profile", "/app/schedule/new", "/app/schedule/publish", "/app/updates/compose", "/app/employees/import", "/app/settings/locations", "/app/anything-else"]) expect(loadingShape(path, false).band, path).toBe("short");
    for (const path of ["/app/employees/QA-1", "/app/employees/new", "/app/timecards/corrections", "/app/schedule/settings"]) expect(loadingShape(path, false).band, path).toBe("sub");
    expect(loadingShape("/app/payroll", false).band).toBe("strip");
    // Title at 88 (no back row) or at 130 (under one).
    for (const path of ["/app/schedule/new", "/app/schedule/publish", "/app/updates/compose", "/app/payroll-export", "/app/settings/payroll", "/app/profile"]) expect(loadingShape(path, false).back, path).toBeFalsy();
    for (const path of ["/app/my-pay", "/app/employees/new", "/app/schedule/settings"]) expect(loadingShape(path, false).back, path).toBe(true);
    // Polish (Nov 20, 2026): the account pages share Profile's frame, with no back link from 768px.
    for (const path of ["/app/more", "/app/help", "/app/notifications"]) expect(loadingShape(path, false).back, path).toBeFalsy();
    expect(loadingShape("/app/employees", false).frame).toBe("rail-desktop");
    expect(loadingShape("/app/employees", false).lift).toBeUndefined();
    // Phase 8: Time exports and Payroll settings lift their first card like Payroll (sibling tabs, one frame).
    expect(loadingShape("/app/payroll-export", false).lift).toBeUndefined();
    expect(loadingShape("/app/settings/payroll", false).lift).toBeUndefined();
    // Employee and Lead (package B's settled frame).
    for (const path of ["/app/schedule", "/app/requests", "/app/exchange", "/app/notifications", "/app/updates", "/app/more"]) expect(loadingShape(path, true).band, path).toBe("strip");
    for (const path of ["/app/notifications", "/app/updates", "/app/schedule"]) { expect(loadingShape(path, true).lift, path).toBeUndefined(); expect(loadingShape(path, true).back, path).toBeFalsy(); }
    for (const path of ["/app/availability", "/app/updates/compose", "/app/profile/privacy", "/app/account/delete"]) expect(loadingShape(path, true).band, path).toBe("sub");
    for (const path of ["/app/profile", "/app/profile/calendar", "/app/help", "/app/exchange/swap", "/app/exchange/callout"]) expect(loadingShape(path, true).band, path).toBe("short");
    // The longer address wins over its parent.
    expect(loadingShape("/app/schedule/new", false).title).toBe("Add shift");
    expect(loadingShape("/app/requests/hub", true).title).toBe("Requests");
    expect(loadingShape("/app/requests", true).title).toBe("Time off");
    // An address nobody listed still gets a frame, with a back row for an Employee's pushed page.
    expect(loadingShape("/app/anything-else", true)).toMatchObject({ band: "short", frame: "read", back: true });
  });
  it("draws both shells' frames for an address, so the first paint is already the right one", () => {
    const html = renderToStaticMarkup(<BRouteLoading pathname="/app/exchange" />);
    expect(count(html, 'data-b-load=""')).toBe(2);
    expect(html).toContain('data-b-shell="management"');
    expect(html).toContain('data-b-shell="employee"');
    expect(html).toContain("Pick up and swap");
    expect(css).toMatch(/\.app-shell\[data-nv-b\]\[data-employee-mobile\] \.b-screen\[data-b-shell="management"\],\s*html body \.app-shell\[data-nv-b\]:not\(\[data-employee-mobile\]\) \.b-screen\[data-b-shell="employee"\] \{ display: none !important; \}/);
  });
  it("a page off the ladder gives its own band height, and Team is one column on tablets", () => {
    const html = renderToStaticMarkup(<BLoadingScreen {...loadingShape("/app/payroll", false)} band={314} />);
    expect(html).toContain('data-b-band="own" style="--b-band-own:314px"');
    expect(css).toContain('.b-screen[data-b-band="own"] { --b-ph-band: calc(var(--b-band-own) - var(--b-title-top)); }');
    expect(css).toMatch(/@media \(min-width: 768px\) and \(max-width: 1023px\) \{\s*[^{]*\[data-b-frame="rail-desktop"\][^{]*\{ display: grid !important; grid-template-columns: minmax\(0, 1fr\) !important; \}/);
  });
  it("reads the band heights from the frame tokens; its own rules stay still (the one shimmer is b-shimmer.css, Phase 7)", () => {
    for (const kind of ["short", "sub", "strip"]) expect(css).toContain(`.b-screen[data-b-band="${kind}"] { --b-ph-band: calc(var(--b-band-${kind}) - var(--b-title-top)); }`);
    // The placeholder's block ends where the premium pass (notices, buttons, micro-interactions) begins.
    const block = css.slice(css.indexOf("Phase 2 (package D"), css.indexOf("---------- Premium pass (Nov 20, 2026)"));
    expect(block.length).toBeGreaterThan(200);
    expect(block).not.toMatch(/animation|@keyframes|transition/);
  });
});

describe("one state screen", () => {
  it("is the band with the title, then one state card of a state card's width", () => {
    const html = renderToStaticMarkup(<BStateScreen title="Page not found" back={{ href: "/app", label: "Home" }}>
      <BState kind="failed" title="This page doesn’t exist" line="The link may be old, or the page may have moved." action={{ label: "Go to Home", href: "/app" }} />
    </BStateScreen>);
    expect(html).toContain('class="b-screen b-screen--back" data-b-state="" data-b-band="short" data-b-frame="state"');
    expect(html).toContain("<h1>Page not found</h1>");
    expect(count(html, '<section class="b-card"')).toBe(1);
    expect(html).toContain('<div class="b-statecard" data-kind="failed" role="status">');
    expect(css).toMatch(/\[data-b-frame="state"\][^{]*\{ max-width: var\(--b-frame-form\) !important; \}/);
  });
  it("a route error says its message once, in one alert, with one Try again outside it", () => {
    const html = renderToStaticMarkup(<BRouteError title="Add shift" sub="This page didn’t load." back={{ href: "/app/schedule", label: "Schedule" }}
      spoken="Add shift didn’t load. Nothing was changed. Check your connection, then try again." cardTitle="Add shift didn’t load"
      line="Nothing was changed. Check your connection, then try again." onRetry={() => {}} away={{ href: "/app/schedule", label: "Back to Schedule" }} />);
    expect(count(html, 'role="alert"')).toBe(1);
    expect(html).toContain('<p class="b-sr" role="alert">Add shift didn’t load. Nothing was changed. Check your connection, then try again.</p>');
    // The visible card is not a second live region.
    expect(html).toContain('<div class="b-statecard" data-kind="failed">');
    expect(html).not.toContain('role="status"');
    // One Try again; its busy words ("Trying again…", Nov 26, 2026) wait hidden in the same cell.
    expect(count(html, '<span class="b-busy__idle">Try again</span>')).toBe(1);
    expect(count(html, "<button")).toBe(1);
    expect(html).toContain('<a href="/app/schedule" class="b-btn b-btn--quiet">Back to Schedule</a>');
    expect(html).toContain('<h1 id="b-route-error-title" tabindex="-1">Add shift</h1>');
  });
  it("a page the server draws retries with a link to the same view", () => {
    const html = renderToStaticMarkup(<BRouteError title="This page didn’t load" spoken="This page didn’t load." line="Check your connection, then try again." retryHref="/app?week=2026-11-09" />);
    expect(html).toContain('<a href="/app?week=2026-11-09" class="b-btn b-btn--teal">Try again</a>');
    expect(html).not.toContain("<button");
  });
});

describe("offline is one pill over the canvas", () => {
  const layer = css.slice(css.lastIndexOf("@layer nv-b {"));
  it("on tablets and desktop it takes no room in the page and stands at the foot of the window", () => {
    const wide = layer.slice(layer.indexOf("@media (min-width: 768px)"));
    const rule = wide.slice(wide.indexOf(".c-offline {"));
    expect(rule).toContain("position: sticky !important; top: calc(100dvh - 60px) !important;");
    expect(rule).toContain("height: 36px !important; min-height: 36px !important; margin: 0 auto -36px !important;");
  });
  it("on a phone it is the pill above the tab bar on every page, with or without a Direction B screen", () => {
    const phone = layer.slice(layer.indexOf("@media (max-width: 767px)"), layer.indexOf("@media (min-width: 768px)"));
    expect(phone).toMatch(/\.app-shell\[data-nv-b\]\[data-nv-b\]\[data-nv-b\] \.c-offline \{\s*position: fixed !important; top: auto !important;/);
    expect(phone).not.toContain(":has(.c-page > .b-screen) .c-offline");
  });
});

// Jose (Nov 15, 2026, item 9; finding OW-008): on a page with a band, offline is a glass pill inside it, under the title.
describe("offline sits inside the band when the page has one", () => {
  it("the hero draws the shell's line under its title, and nothing while online", () => {
    const offline = renderToStaticMarkup(<BOfflineContext.Provider value="Offline · updated 9:24 PM"><BHero title="Home" sub="3 things need you" /></BOfflineContext.Provider>);
    expect(offline).toContain('<p class="b-sub">3 things need you</p><p class="b-offline b-glass" role="status"><span class="b-dot b-dot--warn" aria-hidden="true"></span>Offline · updated 9:24 PM</p></div>');
    expect(renderToStaticMarkup(<BHero title="Home" />)).not.toContain("b-offline");
  });
  it("only a drawn band pill sends the shell's pill aside (a phone screen kept on desktop draws none)", () => {
    const shell = readFileSync(join(__dirname, "../../app/app/owner-b-shell.css"), "utf8");
    expect(shell).toMatch(/:has\(\.b-hero \.b-offline\[data-shown\]\) \.c-offline \{ display: none !important; \}/);
    expect(shell).not.toMatch(/:has\(\.b-hero \.b-offline\) \.c-offline/);
  });
});
