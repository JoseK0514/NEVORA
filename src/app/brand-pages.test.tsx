import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, rs } from '@rstest/core';
import LoginPage from "./login/page";
import ActivatePage from "./activate/page";

const identity = rs.hoisted(() => ({ name: "Northside Services" as string | null }));
rs.mock("@/lib/data/workspaces", () => ({ getPublicWorkspaceName: async () => identity.name }));
beforeEach(() => { identity.name = "Northside Services"; });






rs.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a">) =>
    createElement("a", { href, ...props }, children),
}));
rs.mock("next/image", () => ({ default: () => null }));
rs.mock("@/components/brand-mark", () => ({ BrandMark: () => createElement("span", { "data-brand-mark": true }), BrandWordmark: () => createElement("span", { "aria-label": "NEVORA", "data-brand-wordmark": true }) }));
rs.mock("@/app/login/actions", () => ({ login: rs.fn() }));
rs.mock("@/app/activate/actions", () => ({ activateAccountAction: rs.fn() }));

// Quiet (v4, approved Oct 23): the wordmark at the top of sign in, the workspace under the greeting, and one
// legal line at the bottom ("© 2026 VELANI LLC · Privacy · Terms · Support"; the ownership line stays for screen readers).
it("brands login as NEVORA Workforce with the configured workspace and Velani ownership", async () => {
  const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }));
  expect(html).toContain('aria-label="NEVORA"');
  expect(html).toContain("Northside Services");
  expect(html).not.toContain("Fuel Coffee Drive");
  expect(html).toContain("© 2026 VELANI LLC");
  expect(html).toContain("NEVORA is a product of VELANI LLC.");
  expect(html).toContain("Welcome back");
});

// Activation follows development's email-invitation page until it gets its own Signature mock.
it("brands activation with the workspace and Velani ownership", async () => {
  const html = renderToStaticMarkup(await ActivatePage({ searchParams: Promise.resolve({}) }));
  expect(html).toContain("Set up your account");
  expect(html).toContain("Northside Services");
  expect(html).not.toContain("Fuel Coffee Drive");
  expect(html).toContain("© 2026 VELANI LLC");
  expect(html).toContain("NEVORA is a product of VELANI LLC.");
});

it("keeps explicit Fuel customer identity when configured", async () => {
  identity.name = "Fuel Coffee Drive";
  expect(renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }))).toContain("Fuel Coffee Drive");
  expect(renderToStaticMarkup(await ActivatePage({ searchParams: Promise.resolve({}) }))).toContain("Fuel Coffee Drive");
});
it("renders unavailable workspace identity when public configuration is missing", async () => {
  identity.name = null;
  const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }));
  expect(html).toContain("Workspace unavailable");
  expect(html).not.toContain("Fuel Coffee Drive");
  expect(html).toContain('aria-label="NEVORA"');
  const activation = renderToStaticMarkup(await ActivatePage({ searchParams: Promise.resolve({}) }));
  expect(activation).toContain("Workspace unavailable");
  expect(activation).not.toContain("Fuel Coffee Drive");
});
