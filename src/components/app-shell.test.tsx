import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/app/my-time" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children),
}));
vi.mock("@/components/brand-mark", () => import("./brand-mark"));
vi.mock("@/components/nav-icon", () => import("./nav-icon"));
vi.mock("@/lib/navigation", () => import("../lib/navigation"));
vi.mock("@/app/login/actions", () => ({ logout: vi.fn() }));
vi.mock("next/image", () => ({ default: () => null }));

function render(role: "EMPLOYEE" | "LEAD" | "MANAGER" | "OWNER") {
  const html = renderToStaticMarkup(
    <AppShell user={{ firstName: "Sam", lastName: "Cruz", role }}><h1>My Time</h1></AppShell>,
  );
  return { html, mobile: html.split('aria-label="Mobile navigation"')[1].split("</nav>")[0] };
}

it.each(["EMPLOYEE", "LEAD"] as const)("keeps %s My Time directly reachable and secondary links in More", (role) => {
  const { html, mobile } = render(role);
  const [primary, more] = mobile.split('id="employee-more-navigation"');
  expect([...primary.matchAll(/href="([^"]+)"/g)].map((match) => match[1])).toEqual([
    "/app", "/app/schedule", "/app/my-time",
  ]);
  expect(primary).toContain('popoverTarget="employee-more-navigation"');
  expect(primary).toMatch(/href="\/app\/my-time" class="mobile-nav-link active" aria-current="page"/);
  expect(more).toContain('popover="auto"');
  expect([...more.matchAll(/href="([^"]+)"/g)].map((match) => match[1])).toEqual([
    "/app/availability", "/app/requests", "/app/exchange",
  ]);
  expect(html).toContain("app-shell employee-shell");
  expect(html).not.toContain("sidebar-mantra");
});

it.each(["MANAGER", "OWNER"] as const)("preserves the existing %s shell and mobile destinations", (role) => {
  const { html, mobile } = render(role);
  expect([...mobile.matchAll(/href="([^"]+)"/g)].map((match) => match[1])).toEqual([
    "/app", "/app/schedule", "/app/availability", "/app/requests", "/app/exchange",
  ]);
  expect(html).not.toContain("employee-shell");
  expect(html).not.toContain("employee-more-navigation");
  expect(html).not.toContain("sidebar-mantra");
});

it.each(["EMPLOYEE", "LEAD", "MANAGER", "OWNER"] as const)("renders the Nuvora platform identity for %s", (role) => {
  const { html } = render(role);
  expect(html).toContain("NUVORA");
  expect(html).toContain("Workforce");
  expect(html).toContain("Fuel Coffee Drive");
  expect(html).toContain("Powered by VELANI LLC");
  expect(html).not.toContain("Fuel Scheduler");
});
