import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import LoginPage from "./login/page";
import ActivatePage from "./activate/page";

const identity = vi.hoisted(() => ({ name: "Northside Services" as string | null }));
vi.mock("@/lib/data/workspaces", () => ({ getPublicWorkspaceName: async () => identity.name }));
beforeEach(() => { identity.name = "Northside Services"; });

vi.mock("@/components/brand-lockup", () => import("../components/brand-lockup"));
vi.mock("@/components/brand-legal", () => import("../components/brand-legal"));

vi.mock("@/lib/notifications/destinations", () => import("../lib/notifications/destinations"));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a">) =>
    createElement("a", { href, ...props }, children),
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/brand-mark", () => ({ BrandMark: () => createElement("span", { "data-brand-mark": true }), BrandWordmark: () => createElement("span", { "aria-label": "NEVORA", "data-brand-wordmark": true }) }));
vi.mock("@/components/phone-input", () => ({ PhoneInput: (props: ComponentProps<"input">) => createElement("input", props) }));
vi.mock("@/app/login/actions", () => ({ login: vi.fn() }));
vi.mock("@/app/activate/actions", () => ({ activateAccountAction: vi.fn() }));

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
  expect(html).toContain("Activate account");
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
