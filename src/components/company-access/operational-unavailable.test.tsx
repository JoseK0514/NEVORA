import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children) }));
vi.mock("./scoped-read-frame", () => ({ ScopedReadFrame: ({ unavailable }: { unavailable: React.ReactNode }) => createElement("div", { className: "scoped-unavailable" }, unavailable) }));
import { OperationalUnavailable } from "./operational-unavailable";

// Inspection Oct 24: a Manager without an access assignment saw legacy bordered cards with outlined buttons.
// The state now uses the Quiet page; the access wording and the actions are unchanged.
it("draws the no-access state on the Quiet page with the same wording and actions", () => {
  const html = renderToStaticMarkup(createElement(OperationalUnavailable, { title: "Employees unavailable", reason: "access_denied" }));
  expect(html).toContain('class="q-page q-unavailable"');
  expect(html).toContain("<h1>Employees unavailable</h1>");
  expect(html).toContain("This page needs current company-wide management access. Return to Home, or sign in again if your access changed.");
  expect(html).toMatch(/<a href="\/app" class="q-btn q-btn--sec">Return to Home<\/a>/);
  expect(html).toMatch(/<a href="\/login" class="q-btn q-btn--quiet">Sign in again<\/a>/);
  expect(html).not.toContain("portal-route-state");
});
it("a location-scoped manager is sent to their schedule, not to sign in", () => {
  const html = renderToStaticMarkup(createElement(OperationalUnavailable, { reason: "access_denied", scoped: true }));
  expect(html).toContain("Open your schedule");
  expect(html).not.toContain("Sign in again");
});
