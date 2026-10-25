import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./quiet/quiet.css", () => ({}));
vi.mock("./quiet/u1.css", () => ({}));
import { OwnersOnlyState, QuietSystemState, RoleUnavailableState } from "./quiet-system-state";
import { OwnerOnlyNotice } from "./owner-only-notice";
import { WaveARouteError } from "./wave-a/route-error";
import AppNotFound from "../app/app/not-found";
import AppError from "../app/app/error";

const OLD = /nv-card|nv-pageband|nv-masthead|premium-error|sg-sys|Go to sign in|LockSimple|There’s no page here|could not be loaded/;

it("T-21: one Quiet state, as M01: a large title, one sentence, a grey main button and a quiet second action", () => {
  const error = renderToStaticMarkup(createElement(AppError, { error: new Error("x"), reset: () => {} }));
  expect(error).toContain('class="q-page q-unavailable u1-state"');
  expect(error).toContain(">This page didn’t load</h1>");
  expect(error).toContain('<div role="alert"><p class="q-body">Check your connection and try again.</p></div>');
  expect(error).toContain('<button type="button" class="q-btn q-btn--sec">Try again</button>');
  expect(error).toMatch(/<a (?=[^>]*class="q-btn q-btn--quiet")(?=[^>]*href="\/app")[^>]*>Back to Home<\/a>/);
  expect(error.match(/role="alert"/g)).toHaveLength(1);
  expect(error).not.toMatch(OLD);
});

it("a signed-in 404 is Page not found with Back to Home, never sign in", () => {
  const html = renderToStaticMarkup(createElement(AppNotFound));
  expect(html).toContain(">Page not found</h1>");
  expect(html).toContain("The link may be old.");
  expect(html).toMatch(/<a (?=[^>]*class="q-btn q-btn--sec")(?=[^>]*href="\/app")[^>]*>Back to Home<\/a>/);
  expect(html).not.toMatch(OLD);
  expect(html).not.toContain("/login");
});

it("Owner-only pages and pages another role doesn't have say so in the same shape (UX-E-47)", () => {
  for (const html of [renderToStaticMarkup(createElement(OwnersOnlyState)), renderToStaticMarkup(createElement(OwnerOnlyNotice))]) {
    expect(html).toContain(">Owners only</h1>");
    expect(html).toContain("Ask an Owner if you need a change here.");
    expect(html).toContain('href="/app"');
    expect(html).not.toMatch(OLD);
  }
  const role = renderToStaticMarkup(createElement(RoleUnavailableState));
  expect(role).toContain(">Not available for your role</h1>");
  expect(role).toContain("Back to Home");
});

it("a pushed page's failed read keeps its ‹ Parent bar and goes back there", () => {
  const html = renderToStaticMarkup(createElement(WaveARouteError, { retry: () => {}, title: "Edit shift", back: { href: "/app/schedule", label: "Schedule" } }));
  expect(html).toContain('class="q-nav"');
  expect(html).toContain('href="/app/schedule"');
  expect(html).toContain("Edit shift didn’t load. Nothing was changed.");
  expect(html).toContain(">Back to Schedule</a>");
  expect(html).not.toMatch(OLD);
});

it("the default action is Back to Home only when no other is given", () => {
  const html = renderToStaticMarkup(createElement(QuietSystemState, { kind: "error", primary: createElement("button", { className: "q-btn q-btn--sec" }, "Try again") }));
  expect(html).not.toContain("Back to Home");
});
