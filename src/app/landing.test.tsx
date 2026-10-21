import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children) }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("REDIRECT"); } }));
vi.mock("@/components/brand-mark", () => ({ BrandMark: () => null, BrandWordmark: () => null }));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn(async () => null) }));
vi.mock("@/lib/auth-lang.server", () => ({ readAuthLang: vi.fn(async () => "en") }));

import Home from "./page";
import { getSession } from "@/lib/auth/session";
import { readAuthLang } from "@/lib/auth-lang.server";
import { landingVisible } from "@/lib/landing-copy";

afterEach(() => { vi.unstubAllEnvs(); vi.mocked(getSession).mockResolvedValue(null); vi.mocked(readAuthLang).mockResolvedValue("en"); });

describe("the public landing page", () => {
  it("renders signed out, in English, with sign-in, contact and the legal links", async () => {
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain("Your team&#x27;s week,");
    expect(html).toContain("in one place.");
    expect(html).toContain('lang="en"');
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="mailto:support@thevelani.com"');
    expect(html).toContain("it never moves money");
    for (const href of ["/privacy", "/terms", "/support"]) expect(html).toContain(`href="${href}"`);
  });

  it("renders in Spanish when the nv-lang cookie says so", async () => {
    vi.mocked(readAuthLang).mockResolvedValue("es");
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain("La semana de tu equipo,");
    expect(html).toContain("en un solo lugar.");
    expect(html).toContain('lang="es"');
    expect(html).toContain("nunca mueve dinero");
  });

  it("sends a signed-in person to the app", async () => {
    vi.mocked(getSession).mockResolvedValue({ id: "e1" } as never);
    await expect(Home()).rejects.toThrow("REDIRECT");
  });

  it("stays off in production until NEVORA_LANDING=on", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(Home()).rejects.toThrow("REDIRECT");
    vi.stubEnv("NEVORA_LANDING", "on");
    expect(renderToStaticMarkup(await Home())).toContain('href="/login"');
  });

  it("landingVisible follows the same shape as policiesVisible", () => {
    expect(landingVisible({ NODE_ENV: "development" })).toBe(true);
    expect(landingVisible({ NODE_ENV: "production" })).toBe(false);
    expect(landingVisible({ NODE_ENV: "production", NEVORA_LANDING: "on" })).toBe(true);
    expect(landingVisible({ NODE_ENV: "development", NEVORA_LANDING: "off" })).toBe(false);
  });
});
