import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import NotFound from "./not-found";

const route = vi.hoisted(() => ({ path: "/nope" }));
const language = vi.hoisted(() => ({ lang: "en" as "en" | "es" }));
beforeEach(() => { route.path = "/nope"; language.lang = "en"; });
vi.mock("next/navigation", () => ({ usePathname: () => route.path }));
vi.mock("@/lib/auth-lang.server", () => ({ readAuthLang: async () => language.lang }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children),
}));

it("is branded and sends people to sign in", async () => {
  const html = renderToStaticMarkup(await NotFound());
  expect(html).toContain('aria-label="NEVORA"');
  expect(html).toContain("Page not found");
  expect(html).toContain('href="/login"');
  expect(html).toContain("Go to sign in");
  expect(html).not.toContain("Is this a time clock tablet?");
  // Review B4: the one-line legal footer, not the old lockup.
  expect(html).toContain('class="q-legal"');
  expect(html).not.toContain("login-brand-module");
});

it("reads in the sign-in language and offers the switch", async () => {
  language.lang = "es";
  const html = renderToStaticMarkup(await NotFound());
  expect(html).toContain('lang="es"');
  expect(html).toContain("Página no encontrada");
  expect(html).toContain("Ir a iniciar sesión");
  expect(html).toContain('class="q-auth__lang"');
});

it("tells a tablet with a wrong Clocker link to set up again", async () => {
  route.path = "/clocker/1";
  const html = renderToStaticMarkup(await NotFound());
  expect(html).toContain("Is this a time clock tablet?");
  expect(html).toContain("Set up this tablet again.");
});
