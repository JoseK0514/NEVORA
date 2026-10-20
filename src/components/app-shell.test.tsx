import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

const navigationMock = vi.hoisted(() => ({ pathname: "/app/my-time" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigationMock.pathname, useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }), useSearchParams: () => new URLSearchParams() }));
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

// P3-WR-09 (Oct 19): Leads use the Employee app, so they get the same My time and Timecards presentation.
it.each(['/app/my-time', '/app/timecards'])('enables the approved employee presentation on %s for Employees and Leads', pathname => {
  expect(render('EMPLOYEE', pathname).html).toContain('data-employee-corporate="true"');
  expect(render('LEAD', pathname).html).toContain('data-employee-corporate="true"');
});

it.each(['EMPLOYEE', 'LEAD', 'MANAGER', 'OWNER'] as const)('keeps %s outside the two-page employee approval elsewhere', role => {
  for (const pathname of ['/app', '/app/schedule', '/app/profile', '/app/timecards/history', '/app/my-time/other']) {
    expect(render(role, pathname).html).not.toContain('data-employee-corporate="true"');
  }
  if (role === 'MANAGER' || role === 'OWNER') {
    for (const pathname of ['/app/my-time', '/app/timecards']) {
      expect(render(role, pathname).html).not.toContain('data-employee-corporate="true"');
    }
  }
});

// Phase 7 (WR-03, AL-03) and Phase 3 (P3-ST-01): every role's Home shares the phone shell of every other tab,
// so the header and the More sheet don't change when you switch tabs.
it.each(['MANAGER','OWNER','EMPLOYEE','LEAD'] as const)('gives %s Home the same phone shell as every other tab', role => {
  expect(render(role, '/app').html).toContain('data-mobile-workforce="true"');
});
it.each(['/app/schedule','/app/availability','/app/requests','/app/settings/locations/loc-1','/app/profile'])('scopes the remaining mobile variant to the actual %s destination', pathname => {
  expect(render('OWNER', pathname).html).toContain('data-mobile-workforce="true"');
});

it.each(["EMPLOYEE", "LEAD"] as const)("gives %s Home, Schedule, Requests and Hours tabs with the rest in More", (role) => {
  const { html, mobile } = render(role);
  const [primary, more] = mobile.split('id="employee-more-navigation"');
  expect([...primary.matchAll(/href="([^"]+)"/g)].map((match) => match[1])).toEqual([
    "/app", "/app/schedule", "/app/requests/hub", "/app/my-time",
  ]);
  expect(primary).toContain('popoverTarget="employee-more-navigation"');
  expect(primary).toMatch(/href="\/app\/my-time" class="mobile-nav-link active" aria-current="page"/);
  expect(primary).toContain('<span>Hours</span>');
  expect(more).toContain('popover="auto"');
  expect([...more.matchAll(/href="([^"]+)"/g)].map((match) => match[1])).toEqual([
    "/app/updates", "/app/notifications", "/app/profile",
  ]);
  expect(html).toContain("app-shell employee-shell");
  expect(html).not.toContain("sidebar-mantra");
});

it.each(["MANAGER", "OWNER"] as const)("gives %s Home, Schedule, Inbox, Team and More tabs", (role) => {
  const { html, mobile } = render(role);
  const [primary] = mobile.split('id="manager-more-navigation"');
  expect([...primary.matchAll(/href="([^"]+)"/g)].map((match) => match[1])).toEqual([
    "/app", "/app/schedule", "/app/inbox", "/app/employees",
  ]);
  expect(primary).toContain('<span>Inbox</span>');
  expect(primary).toContain('aria-label="More navigation"');
  expect(primary).toContain('<span>More</span>');
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
  expect(html).toContain('login-brand-lockup');
  expect(html).not.toContain('brand-mark-logo');
  expect(html).not.toContain('role-chip');
  expect(html).not.toContain('sidebar-profile-chevron');
});

it.each(['MANAGER','OWNER'] as const)('places %s device settings only in existing profile affordances when enabled',role=>{
 const html=renderToStaticMarkup(<AppShell workspaceName="Northside Services" notificationsEnabled user={{firstName:'Sam',lastName:'Cruz',role}}>Content</AppShell>);
 expect(html.match(/id="portal-device-settings"/g)).toHaveLength(1);
 expect(html.match(/popoverTarget="portal-device-settings"/g)?.length).toBeGreaterThanOrEqual(2);
 expect(html).toContain('sidebar-profile-chevron');
 expect(html).not.toContain('href="/app/notifications"');
});
it('feature off retains the ordinary profile and does not mount setup',()=>{
 const {html}=render('EMPLOYEE');expect(html).not.toContain('portal-device-settings');expect(html).toContain('href="/app/profile" class="sidebar-profile portal-profile-trigger"');expect(html).toContain('href="/app/notifications"');
});

it.each(["EMPLOYEE", "MANAGER"] as const)("offers a top-right account menu with sign out for %s", role => {
  const { html } = render(role);
  expect(html).toContain('class="portal-account-menu"');
  expect(html).toContain('aria-label="Sam Cruz, account menu"');
  expect(html).toContain('id="portal-account-menu"');
  expect(html).toContain('Signed in as ');
  expect(html).toContain('portal-account-signout');
  if (role === "EMPLOYEE") expect(html).toContain('>Your profile</a>');
});

it("preserves configured Fuel customer identity in the sidebar", () => {
  const html = renderToStaticMarkup(<AppShell workspaceName="Fuel Coffee Drive" user={{firstName:"Sam",lastName:"Cruz",role:"EMPLOYEE"}}>Content</AppShell>);
  expect(html).toContain("Fuel Coffee Drive");
});

it('groups authorized owner destinations and provides an accessible sidebar control', () => {
 const {html}=render('OWNER','/app/schedule');
 const sidebar=html.split('aria-label="Primary navigation"')[1].split('</nav>')[0];
 for(const label of ['Plan','People','Time and pay','Workspace']) expect(sidebar).toContain(label);
 expect(html).toContain('aria-label="Collapse sidebar"');
 expect(html).toContain('aria-expanded="true"');
});

it.each(['MANAGER','OWNER'] as const)('makes every remaining %s destination reachable from the tab-bar More', role=>{
 const {html,mobile}=render(role);
 const header=html.split('<header class="mobile-header">')[1].split('</header>')[0];
 expect(header).not.toContain('manager-more-navigation');
 expect(mobile).toContain('popoverTarget="manager-more-navigation"');
 const menu=mobile.split('id="manager-more-navigation"')[1] ?? '';
 const hrefs=[...menu.matchAll(/href="([^"]+)"/g)].map(match=>match[1]);
 // The same destinations as before, grouped by job (MG3), plus Home's team tools at their old addresses (clean Manager v3).
 const tools=['/app?view=attendance','/app?view=team','/app?view=activity','/app/clocker-recovery','/app/account-recovery'];
 expect([...hrefs].sort()).toEqual(['/app/updates','/app/timecards','/app/reports','/app/payroll-export','/app/schedule/templates','/app/schedule/settings',...(role==='OWNER'?['/app/settings']:[]),'/app/profile',...tools].sort());
 expect(hrefs).toEqual(['/app/timecards','/app/payroll-export','/app/reports','/app/schedule/templates','/app/schedule/settings','/app/updates',...tools,'/app/profile',...(role==='OWNER'?['/app/settings']:[])]);
 // Phase 3.5: Owners and Managers reach their Profile from More › Account and the desktop account menu, never the sidebar.
 expect(menu).toContain('aria-label="Account"');
 const sidebar=html.split('aria-label="Primary navigation"')[1].split('</nav>')[0];
 expect(sidebar).not.toContain('href="/app/profile"');
 expect(html.split('id="portal-account-menu"')[1]).toContain('href="/app/profile" class="nevora-action-menu-item"');
 expect(menu).toContain('aria-label="Time and pay"');
 expect(menu).toContain('aria-label="Team tools"');
});

it.each(['EMPLOYEE','LEAD'] as const)('push_disabled_profile_and_inbox_accessible shell affordances for %s',role=>{
 const {html}=render(role);expect(html).toContain('href="/app/profile"');expect(html).toContain('href="/app/notifications"');expect(html).not.toContain('portal-device-settings');
});

it.each(['MANAGER','OWNER'] as const)('keeps %s Updates in the mobile menu with nested routes selected',role=>{
 const {html,mobile}=render(role,'/app/updates/compose');
 const sidebar=html.split('aria-label="Primary navigation"')[1].split('</nav>')[0];
 const [direct,menu]=mobile.split('id="manager-more-navigation"');
 expect(direct).not.toContain('href="/app/updates"');
 expect(direct).toContain('class="mobile-nav-link manager-more-trigger active"');
 expect(menu).toMatch(/href="\/app\/updates"[^>]*aria-current="page"/);
 expect(menu.match(/href="\/app\/updates"/g)).toHaveLength(1);
 expect(sidebar).toMatch(/href="\/app\/updates"[^>]*aria-current="true"/);
 expect(sidebar.match(/href="\/app\/updates"/g)).toHaveLength(1);
});

it.each(['MANAGER','OWNER'] as const)('gives %s one More menu in the tab bar and preserves the authorized notification destination',role=>{
 const html=renderToStaticMarkup(<AppShell workspaceName="QA" notificationAuthority="fictional-view-authority" user={{firstName:'Sam',lastName:'Cruz',role}}>Content</AppShell>);
 const header=html.split('<header class="mobile-header">')[1].split('</header>')[0];
 const mobile=html.split('aria-label="Mobile navigation"')[1].split('</nav>')[0];
 expect(header.match(/href="\/app\/notifications"/g)).toHaveLength(1);
 expect(header).not.toContain('aria-label="More navigation"');
 expect(html.match(/aria-label="More navigation"/g)?.length).toBe(2); // trigger and its menu
 expect(mobile).not.toContain('nevora-action-menu-chevron');
 expect(header).toContain('class="portal-account-menu"');
 expect(header).not.toContain('role-chip');
});

it.each([['MANAGER','/app/exchange','/app/inbox'],['OWNER','/app/availability','/app/inbox'],['MANAGER','/app/inbox','/app/inbox'],['OWNER','/app/requests','/app/inbox'],['MANAGER','/app/employees/AUDIT-E','/app/employees'],['EMPLOYEE','/app/exchange','/app/requests/hub'],['LEAD','/app/availability','/app/requests/hub']] as const)('lights the %s tab that owns %s',(role,pathname,tab)=>{
 const {mobile}=render(role,pathname);
 expect(mobile).toContain(`href="${tab}" class="mobile-nav-link active" aria-current="page"`);
});

it.each([['OWNER','/app/requests',['/app/requests','/app/exchange','/app/availability']],['EMPLOYEE','/app/requests/hub',['/app/requests/hub','/app/requests','/app/exchange','/app/availability']]] as const)('shows %s section tabs on %s with real URLs',(role,pathname,hrefs)=>{
 const {html}=render(role,pathname);
 const tabs=html.split('class="section-tabs"')[1].split('</nav>')[0];
 expect([...tabs.matchAll(/href="([^"]+)"/g)].map(match=>match[1])).toEqual(hrefs);
 expect(tabs).toContain(`href="${pathname}" class="section-tab" aria-current="page"`);
});

it('shows no section tabs on pages outside a shared group',()=>{
 expect(render('OWNER','/app/schedule').html).not.toContain('class="section-tabs"');
});

it('M7: an employee reaches Timecards from the Pay section tabs',()=>{
 const {html}=render('EMPLOYEE','/app/my-time');
 const tabs=html.split('class="section-tabs"')[1]?.split('</nav>')[0]??'';
 expect(tabs).toContain('href="/app/my-time"');
 expect(tabs).toContain('href="/app/timecards"');
 expect(render('EMPLOYEE','/app/timecards').html).toContain('href="/app/timecards" class="section-tab" aria-current="page"');
});

it.each(['EMPLOYEE','LEAD'] as const)('keeps the %s Updates destination within the existing employee More navigation',role=>{
 const {html}=render(role,'/app/updates/own-update');
 const header=html.split('<header class="mobile-header">')[1].split('</header>')[0];
 // The desktop location trail (hidden on phones) links back to the section; no other header shortcut appears.
 const [before,rest]=header.split('<nav class="portal-location-nav"');
 expect(before+rest.slice(rest.indexOf('</nav>')+6)).not.toContain('href="/app/updates"');
 expect(rest).toContain('<li><a href="/app/updates">Updates</a></li>');
 expect(html).toContain('href="/app/updates" class="employee-more-link active" aria-current="page"');
});
it('D1: the desktop top bar shows workspace, section and page, and pins Workspace in the sidebar',()=>{
 const {html}=render('OWNER','/app/timecards');
 expect(html).toContain('<ol class="portal-location"><li class="portal-location-workspace" title="Northside Services">Northside Services</li><li>Time and pay</li><li><span aria-current="page">Timecards</span></li></ol>');
 expect(html).toContain('data-group="Workspace"');
});
it('D-4: Time off, Shift requests and Availability light Inbox, and the trail still names the page', () => {
 for (const [pathname, label] of [['/app/requests', 'Time off'], ['/app/exchange', 'Shift requests'], ['/app/availability', 'Availability']] as const) {
  const {html} = render('MANAGER', pathname);
  const sidebar = html.split('aria-label="Primary navigation"')[1].split('</nav>')[0];
  // IS-P4-08: Inbox is the current section there, not the current page.
  expect(sidebar).toContain('href="/app/inbox" class="nav-link active" aria-current="true"');
  expect(sidebar).not.toContain('href="/app/requests"');
  expect(html).toContain(`<li>Plan</li><li><a href="/app/inbox">Inbox</a></li><li><span aria-current="page">${label}</span></li></ol>`);
 }
 const {html} = render('OWNER', '/app/payroll-export');
 expect(html).toContain('<li>Time and pay</li><li><a href="/app/timecards">Timecards</a></li><li><span aria-current="page">Time exports</span></li></ol>');
 expect(html).toContain('<span class="nav-label">Team</span>');
});
it('IS-P4-09 and IS-P4-14: Home\'s views end the trail with their own name, and a skip link comes first', () => {
 const {html} = render('MANAGER', '/app');
 expect(html.indexOf('class="portal-skip-link" href="#main-content"')).toBeLessThan(html.indexOf('<aside'));
});
