import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

const navigationMock = vi.hoisted(() => ({ pathname: "/app/my-time" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigationMock.pathname }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children),
}));
vi.mock("@/components/brand-mark", () => import("./brand-mark"));
vi.mock("@/components/nav-icon", () => import("./nav-icon"));
vi.mock("@/lib/navigation", () => import("../lib/navigation"));
vi.mock("@/app/login/actions", () => ({ logout: vi.fn() }));
vi.mock("next/image", () => ({ default: () => null }));

function render(role: "EMPLOYEE" | "LEAD" | "MANAGER" | "OWNER", pathname = "/app/my-time") {
  navigationMock.pathname = pathname;
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
    "/app/requests/hub", "/app/availability", "/app/updates", "/app/notifications", "/app/profile",
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

it.each(["MANAGER", "OWNER"] as const)("marks the current %s destination for assistive technology", (role) => {
  const { html, mobile } = render(role, "/app/schedule");
  const sidebar = html.split('aria-label="Primary navigation"')[1].split("</nav>")[0];
  expect(sidebar).toContain('href="/app/schedule" class="nav-link active" aria-current="page"');
  expect(mobile).toContain('href="/app/schedule" class="mobile-nav-link active" aria-current="page"');
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

it.each(['MANAGER','OWNER'] as const)('places %s device settings only in existing profile affordances when enabled',role=>{
 const html=renderToStaticMarkup(<AppShell workspaceName="Northside Services" notificationsEnabled user={{firstName:'Sam',lastName:'Cruz',role}}>Content</AppShell>);
 expect(html.match(/id="portal-device-settings"/g)).toHaveLength(1);
 expect(html.match(/popoverTarget="portal-device-settings"/g)?.length).toBeGreaterThanOrEqual(2);
 expect(html).not.toContain('href="/app/notifications"');
});
it('feature off retains the ordinary profile and does not mount setup',()=>{
 const {html}=render('EMPLOYEE');expect(html).not.toContain('portal-device-settings');expect(html).toContain('href="/app/profile" class="sidebar-profile portal-profile-trigger"');expect(html).toContain('href="/app/notifications"');
});

it("preserves configured Fuel customer identity in the sidebar", () => {
  const html = renderToStaticMarkup(<AppShell workspaceName="Fuel Coffee Drive" user={{firstName:"Sam",lastName:"Cruz",role:"EMPLOYEE"}}>Content</AppShell>);
  expect(html).toContain("Fuel Coffee Drive");
});

it('groups authorized owner destinations and provides an accessible sidebar control', () => {
 const {html}=render('OWNER','/app/schedule');
 const sidebar=html.split('aria-label="Primary navigation"')[1].split('</nav>')[0];
 for(const label of ['Plan','Team','Time &amp; Pay','Workspace']) expect(sidebar).toContain(label);
 expect(html).toContain('aria-label="Collapse sidebar"');
 expect(html).toContain('aria-expanded="true"');
});

it.each(['MANAGER','OWNER'] as const)('makes every remaining %s destination reachable from the mobile header', role=>{
 const {html}=render(role);
 const header=html.split('<header class="mobile-header">')[1].split('</header>')[0];
 expect(header).toContain('popoverTarget="manager-more-navigation"');
 const menu=header.split('id="manager-more-navigation"')[1]?.split('</div>')[0] ?? '';
 expect([...menu.matchAll(/href="([^"]+)"/g)].map(match=>match[1])).toEqual([
  '/app/employees','/app/timecards','/app/reports','/app/payroll-export','/app/schedule/templates','/app/schedule/settings',...(role==='OWNER'?['/app/settings']:[]),
 ]);
});

it.each(['EMPLOYEE','LEAD'] as const)('push_disabled_profile_and_inbox_accessible shell affordances for %s',role=>{
 const {html}=render(role);expect(html).toContain('href="/app/profile"');expect(html).toContain('href="/app/notifications"');expect(html).not.toContain('portal-device-settings');
});

it.each(['MANAGER','OWNER'] as const)('lets %s open Updates directly on mobile and keeps its nested routes selected',role=>{
 const {html}=render(role,'/app/updates/compose');
 const sidebar=html.split('aria-label="Primary navigation"')[1].split('</nav>')[0];
 const header=html.split('<header class="mobile-header">')[1].split('</header>')[0];
 const direct=header.split('id="manager-more-navigation"')[0];
 expect(direct).toMatch(/href="\/app\/updates"[^>]*aria-label="Updates"[^>]*aria-current="page"/);
 expect(sidebar).toMatch(/href="\/app\/updates"[^>]*aria-current="page"/);
 expect(sidebar.match(/href="\/app\/updates"/g)).toHaveLength(1);
});

it.each(['EMPLOYEE','LEAD'] as const)('keeps the %s Updates destination within the existing employee More navigation',role=>{
 const {html}=render(role,'/app/updates/own-update');
 const header=html.split('<header class="mobile-header">')[1].split('</header>')[0];
 expect(header).not.toContain('href="/app/updates"');
 expect(html).toContain('href="/app/updates" class="employee-more-link active" aria-current="page"');
});
