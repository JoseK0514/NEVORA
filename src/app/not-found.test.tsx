import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import NotFound from "./not-found";

const route = vi.hoisted(() => ({ path: "/nope" }));
beforeEach(() => { route.path = "/nope"; });
vi.mock("next/navigation", () => ({ usePathname: () => route.path }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children),
}));

it("is branded and sends people to sign in", () => {
  const html = renderToStaticMarkup(createElement(NotFound));
  expect(html).toContain('aria-label="NEVORA"');
  expect(html).toContain("Page not found");
  expect(html).toContain('href="/login"');
  expect(html).toContain("Go to sign in");
  expect(html).not.toContain("Is this a time clock tablet?");
});

it("tells a tablet with a wrong Clocker link to set up again", () => {
  route.path = "/clocker/1";
  const html = renderToStaticMarkup(createElement(NotFound));
  expect(html).toContain("Is this a time clock tablet?");
  expect(html).toContain("Set up this tablet again.");
});
