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

it("brands login as NEVORA Workforce with the configured workspace and Velani ownership", async () => {
  const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }));
  expect(html).toContain("NEVORA");
  expect(html).toContain("Workforce");
  expect(html).toContain("Northside Services");
  expect(html).not.toContain("Fuel Coffee Drive");
  expect(html).toContain("Powered by VELANI LLC");
  expect(html).not.toContain("Fuel Coffee Drive • Employee Portal");
  expect(html).toContain("© 2026 VELANI LLC. All rights reserved.");
  expect(html).toContain("NEVORA is a product of VELANI LLC.");
  expect(html).not.toContain("employee-login-scene-copy");
});

it("brands activation as NEVORA Workforce", async () => {
  const html = renderToStaticMarkup(await ActivatePage({ searchParams: Promise.resolve({}) }));
  expect(html).toContain("NEVORA");
  expect(html).toContain("Workforce");
  expect(html).toContain("Northside Services");
  expect(html).not.toContain("Fuel Coffee Drive");
  expect(html).toContain("© 2026 VELANI LLC. All rights reserved.");
  expect(html).toContain("NEVORA is a product of VELANI LLC.");
});

it.each([LoginPage, ActivatePage])("keeps explicit Fuel customer identity when configured", async page => {
  identity.name = "Fuel Coffee Drive";
  expect(renderToStaticMarkup(await page({ searchParams: Promise.resolve({}) }))).toContain("Fuel Coffee Drive");
});
it.each([LoginPage, ActivatePage])("renders unavailable workspace identity when public configuration is missing", async page => {
  identity.name = null;
  const html = renderToStaticMarkup(await page({ searchParams: Promise.resolve({}) }));
  expect(html).toContain("Workspace unavailable");
  expect(html).not.toContain("Fuel Coffee Drive");
  expect(html).toContain("NEVORA");
});
