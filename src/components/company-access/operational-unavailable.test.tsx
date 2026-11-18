import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from '@rstest/core';

rs.mock("next/link", () => ({ default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children) }));
rs.mock("./scoped-read-frame", () => ({ ScopedReadFrame: ({ unavailable }: { unavailable: React.ReactNode }) => createElement("div", { className: "scoped-unavailable" }, unavailable) }));
import { OperationalUnavailable } from "./operational-unavailable";

// Inspection Oct 24: a Manager without an access assignment saw legacy bordered cards with outlined buttons.
// Phase 2 (package D): the state is the one Direction B state screen at every width (it was the Quiet page, whose sentence
// drew white on the canvas on tablets and desktop). The access wording and the actions are unchanged.
it("draws the no-access state on the Direction B state screen with the same wording and actions", () => {
  const html = renderToStaticMarkup(createElement(OperationalUnavailable, { title: "Employees unavailable", reason: "access_denied" }));
  expect(html).toContain('data-b-state=""');
  expect(html).toContain("<h1>Employees unavailable</h1>");
  expect(html).toContain('<div class="b-statecard" data-kind="locked" role="status">');
  expect(html).toContain("This page needs current company-wide management access. Return to Home, or sign in again if your access changed.");
  expect(html).toMatch(/<a href="\/app" class="b-btn b-btn--teal">Return to Home<\/a><a href="\/login" class="b-btn b-btn--quiet">Sign in again<\/a>/);
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
