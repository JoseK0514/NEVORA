import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from '@rstest/core';

rs.mock("next/link", () => ({ default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children) }));
rs.mock("./scoped-read-frame", () => ({ ScopedReadFrame: ({ unavailable }: { unavailable: React.ReactNode }) => createElement("div", { className: "scoped-unavailable" }, unavailable) }));
import { OperationalUnavailable } from "./operational-unavailable";

// Inspection Oct 24: a Manager without an access assignment saw legacy bordered cards with outlined buttons.
// Phase 2 (package D): the state is the one Direction B state screen at every width (it was the Quiet page, whose sentence
// drew white on the canvas on tablets and desktop). The access wording and the actions are unchanged.
// Review 30 (D09): a page that needs company-wide access is the designed closed state, not a failure: the page's name on
// the band, the lock, the reason as the card's title, who can change it, one tinted step and signing in again as a link.
it("draws the no-access state as the closed page: the page's name, the reason, one tinted step", () => {
  const html = renderToStaticMarkup(createElement(OperationalUnavailable, { title: "Employees unavailable", reason: "access_denied" }));
  expect(html).toContain('data-b-state=""');
  expect(html).toContain("<h1>Employees</h1>");
  expect(html).toContain('<div class="b-statecard" data-kind="locked" role="status">');
  expect(html).toContain("Company-wide access needed");
  expect(html).toContain("An Owner can give it to you.");
  // QA A3-06 recheck (Nov 22, 2026): a signed-in Manager who lacks access is not offered Sign in again.
  expect(html).toMatch(/<a href="\/app" class="b-btn b-btn--ghost">Return to Home<\/a><\/div>/);
  expect(html).not.toContain("Sign in again");
  expect(html).not.toContain("b-btn--teal");
  expect(html).not.toContain("Refresh current view");
  expect(html).not.toContain("q-unavailable");
  expect(html).not.toContain("portal-route-state");
});
it("a read that failed is the red state, with the same sentence", () => {
  const html = renderToStaticMarkup(createElement(OperationalUnavailable, { title: "Schedule unavailable", reason: "read_failed" }));
  expect(html).toContain('<div class="b-statecard" data-kind="failed" role="status">');
  expect(html).toContain("Current information could not be confirmed. Reconnect and reload this page.");
  expect(html).not.toContain("Sign in again");
});
it("a location-scoped manager is sent to their schedule, not to sign in", () => {
  const html = renderToStaticMarkup(createElement(OperationalUnavailable, { reason: "access_denied", scoped: true }));
  expect(html).toContain("Open your schedule");
  expect(html).not.toContain("Sign in again");
});

it("shows the full account recovery page name in the access-denied band", () => {
  const title = "Help someone sign in is unavailable";
  const denied = renderToStaticMarkup(createElement(OperationalUnavailable, { title, reason: "access_denied" }));
  expect(denied).toContain("<h1>Help someone sign in</h1>");
  const failed = renderToStaticMarkup(createElement(OperationalUnavailable, { title, reason: "read_failed" }));
  expect(failed).toContain("<h1>Help someone sign in is unavailable</h1>");
});
