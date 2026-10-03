import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import LoginPage from "./login/page";
import ActivatePage from "./activate/page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a">) =>
    createElement("a", { href, ...props }, children),
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/brand-mark", () => ({ BrandMark: () => createElement("span", { "data-brand-mark": true }) }));
vi.mock("@/components/phone-input", () => ({ PhoneInput: (props: ComponentProps<"input">) => createElement("input", props) }));
vi.mock("@/app/login/actions", () => ({ login: vi.fn() }));
vi.mock("@/app/activate/actions", () => ({ activateAccountAction: vi.fn() }));

it("brands login as Nuvora Workforce with the Fuel workspace and Velani ownership", async () => {
  const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }));
  expect(html).toContain("NUVORA");
  expect(html).toContain("Workforce");
  expect(html).toContain("Fuel Coffee Drive");
  expect(html).toContain("Powered by VELANI LLC");
  expect(html).not.toContain("Fuel Coffee Drive • Employee Portal");
});

it("brands activation as Nuvora Workforce", async () => {
  const html = renderToStaticMarkup(await ActivatePage({ searchParams: Promise.resolve({}) }));
  expect(html).toContain("NUVORA");
  expect(html).toContain("Workforce");
  expect(html).toContain("Fuel Coffee Drive");
});
