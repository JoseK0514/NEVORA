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
    <AppShell workspaceName="Northside Services" user={{ firstName: "Sam", lastName: "Cruz", role }}><h1>My Time</h1></AppShell>,
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

it.each(["EMPLOYEE", "LEAD", "MANAGER", "OWNER"] as const)("renders the NEVORA platform identity for %s", (role) => {
  const { html } = render(role);
  expect(html).toContain("NEVORA");
  expect(html).toContain("Workforce");
  expect(html).toContain("Northside Services");
  expect(html).not.toContain("Fuel Coffee Drive");
  expect(html).toContain("Powered by VELANI LLC");
  expect(html).not.toContain("Fuel Scheduler");
});

it.each(['EMPLOYEE','LEAD','MANAGER','OWNER'] as const)('places %s device settings only in existing profile affordances when enabled',role=>{
 const html=renderToStaticMarkup(<AppShell workspaceName="Northside Services" notificationsEnabled user={{firstName:'Sam',lastName:'Cruz',role}}>Content</AppShell>);
 expect(html.match(/id="portal-device-settings"/g)).toHaveLength(1);
 expect(html.match(/popoverTarget="portal-device-settings"/g)?.length).toBeGreaterThanOrEqual(2);
 expect(html).not.toContain('href="/app/notifications"');
});
it('feature off retains the ordinary profile and does not mount setup',()=>{
 const {html}=render('EMPLOYEE');expect(html).not.toContain('portal-device-settings');expect(html).toContain('<div class="sidebar-profile">');
});

it("preserves configured Fuel customer identity in the sidebar", () => {
  const html = renderToStaticMarkup(<AppShell workspaceName="Fuel Coffee Drive" user={{firstName:"Sam",lastName:"Cruz",role:"EMPLOYEE"}}>Content</AppShell>);
  expect(html).toContain("Fuel Coffee Drive");
});

it.each(['MANAGER','OWNER'] as const)('makes every remaining %s destination reachable from the mobile header', role=>{
 const {html}=render(role);
 const header=html.split('<header class="mobile-header">')[1].split('</header>')[0];
 expect(header).toContain('popoverTarget="manager-more-navigation"');
 const menu=header.split('id="manager-more-navigation"')[1]?.split('</div>')[0] ?? '';
 expect([...menu.matchAll(/href="([^"]+)"/g)].map(match=>match[1])).toEqual([
  '/app/employees','/app/schedule/templates','/app/schedule/settings',...(role==='OWNER'?['/app/settings']:[]),
 ]);
});
