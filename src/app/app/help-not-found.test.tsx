import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
const fixture = vi.hoisted(() => ({ role: "OWNER" }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); }, usePathname: () => "/app/help", useRouter: () => ({ refresh: () => undefined }) }));
vi.mock("@/lib/auth/session", () => ({ requireSession: async () => ({ id: "fictional", role: fixture.role, firstName: "Ana", lastName: "Colón" }) }));

import NotFound from "./not-found";
import MissingPage from "./[...missing]/page";
import HelpPage from "./help/page";

beforeEach(() => { fixture.role = "OWNER"; });

// Nov 1 upscale (kit consistency 9): a signed-in 404 stays in the shell, in the kit.
it("tells a signed-in person the page doesn't exist and takes them Home", () => {
  const out = renderToStaticMarkup(createElement(NotFound));
  // B7 wording (NV-120): one 404 heading everywhere.
  expect(out).toContain('<h1 id="not-found-title">Page not found</h1>');
  expect(out).toContain('<a href="/app" class="c-btn">Go to Home</a>');
  expect(out).not.toMatch(/sign in|404/i);
});
it("sends any unknown /app address to that page", () => {
  expect(() => MissingPage()).toThrow("NEXT_NOT_FOUND");
});

it("keeps Help inside the app with the support content in kit cards and ‹ More back", async () => {
  const out = renderToStaticMarkup(await HelpPage());
  expect(out).toContain('href="/app/more"');
  expect(out).toMatch(/<svg[^>]*>.*<\/svg>More<\/a>/);
  expect(out).toContain('<h1 id="help-title">Help</h1>');
  expect(out).toContain('href="mailto:support@thevelani.com"');
  expect(out).toContain("I can’t sign in");
  expect(out).toContain("Report a problem");
  // An Owner is never told to ask their manager; they get the team member's way back in instead.
  expect(out).not.toContain("Ask your manager");
  expect(out).toContain("Someone on my team can’t sign in");
  expect(out).toContain('href="/app/account-recovery"');
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
