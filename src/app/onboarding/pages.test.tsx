import { beforeEach, describe, expect, it, rs } from "@rstest/core";
import { renderToStaticMarkup } from "react-dom/server";

const state = rs.hoisted(() => ({ host: "signup.example.invalid" as string | null, lang: "en" as "en" | "es", page: { mode: "closed" } as Record<string, unknown> }));
rs.mock("next/headers", () => ({ headers: async () => new Headers(state.host ? { host: state.host } : {}), cookies: async () => ({ get: () => undefined }) }));
rs.mock("@/lib/auth-lang.server", () => ({ readAuthLang: async () => state.lang }));
rs.mock("@/lib/data/workspaces", () => ({ getPublicWorkspaceName: async () => "Fictional Coffee" }));
rs.mock("@/lib/onboarding/signup-page.server", () => ({
  onSignupHost: (host: string | null) => host === "signup.example.invalid",
  readSignupPage: () => state.page,
  signupPortalDomain: () => "portal.example",
  signupResumeUrl: () => "https://signup.example.invalid/onboarding/verify",
}));

import SignupPage from "./page";
import VerifyPage from "./verify/page";
import OwnerActivationPage from "./activate/page";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
beforeEach(() => { state.host = "signup.example.invalid"; state.lang = "en"; state.page = { mode: "closed" }; });

describe("signup page", () => {
  it("is not found on any host but the signup origin", async () => {
    state.host = "alpha.portal.example";
    await expect(SignupPage()).rejects.toThrow();
    await expect(VerifyPage({ searchParams: Promise.resolve({}) })).rejects.toThrow();
  });
  it("shows the closed page, in English and Spanish, with no form", async () => {
    const en = renderToStaticMarkup(await SignupPage());
    expect(text(en)).toContain("Signup isn’t open yet");
    expect(en).not.toContain("<form");
    state.lang = "es";
    const es = renderToStaticMarkup(await SignupPage());
    expect(text(es)).toContain("El registro aún no está abierto");
    expect(es).toContain('lang="es"');
  });
  it("shows the private test form with consent links and no prefilled data", async () => {
    state.page = { mode: "private", termsVersion: "terms-1", privacyVersion: "privacy-1", portalBaseDomain: "portal.example" };
    const html = renderToStaticMarkup(await SignupPage());
    expect(text(html)).toContain("Private test");
    expect(html).toMatch(/<input[^>]*id="signup-email"[^>]*type="email"/);
    expect(html).toMatch(/<a[^>]*href="\/terms"/);
    expect(html).toMatch(/<a[^>]*href="\/privacy"/);
    expect(text(html)).toContain("Send confirmation link");
  });
  it("shows the open form without the private test line", async () => {
    state.page = { mode: "open", termsVersion: "terms-1", privacyVersion: "privacy-1", portalBaseDomain: "portal.example" };
    expect(text(renderToStaticMarkup(await SignupPage()))).not.toContain("Private test");
  });
});

describe("verify page", () => {
  it("opens in the link's language, ahead of the saved one", async () => {
    state.lang = "en";
    const es = renderToStaticMarkup(await VerifyPage({ searchParams: Promise.resolve({ lang: "es" }) }));
    expect(text(es)).toContain("Confirmando tu correo");
    const en = renderToStaticMarkup(await VerifyPage({ searchParams: Promise.resolve({ lang: "fr" }) }));
    expect(text(en)).toContain("Confirming your email");
  });
});

describe("Owner activation page", () => {
  it("renders on the company host with its title and no proof in the markup", async () => {
    state.host = "alpha.portal.example";
    const html = renderToStaticMarkup(await OwnerActivationPage());
    expect(text(html)).toContain("Set your Owner password");
    expect(html).not.toMatch(/proof=/);
  });
});
