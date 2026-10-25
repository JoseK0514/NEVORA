import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const route = vi.hoisted(() => ({ path: "/nope", session: null as null | { id: string } }));
beforeEach(() => { route.path = "/nope"; route.session = null; });
vi.mock("next/navigation", () => ({ usePathname: () => route.path }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children),
}));
vi.mock("@/lib/auth/session", () => ({ getSession: async () => route.session }));
vi.mock("@/lib/legal/policies", () => ({ policiesVisible: () => true }));
import NotFound from "./not-found";

const render = async () => renderToStaticMarkup(await NotFound());

it("is branded and sends a signed-out visitor to sign in", async () => {
  const html = await render();
  expect(html).toContain('aria-label="NEVORA"');
  expect(html).toContain("Page not found");
  expect(html).toContain("The link may be old.");
  expect(html).toContain('href="/login"');
  expect(html).toContain("Go to sign in");
  expect(html).not.toContain("Is this a time clock tablet?");
  expect(html).toContain('class="q-page q-auth');
});

it("T-21: a signed-in visitor goes back to Home, never to sign in", async () => {
  route.session = { id: "fictional" };
  const html = await render();
  expect(html).toContain('href="/app"');
  expect(html).toContain("Back to Home");
  expect(html).not.toContain("Go to sign in");
});

it("P2-27: the footer links are separated", async () => {
  const html = await render();
  expect(html).toMatch(/Privacy<\/a> · <a[^>]*>Terms<\/a> · <a[^>]*>Support/);
});

it("tells a tablet with a wrong Clocker link to set up again", async () => {
  route.path = "/clocker/1";
  const html = await render();
  expect(html).toContain("Is this a time clock tablet?");
  expect(html).toContain("Set up this tablet again.");
});
