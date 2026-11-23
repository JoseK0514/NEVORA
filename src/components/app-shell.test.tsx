import { readFileSync } from "node:fs";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from '@rstest/core';
import { AppShell } from "./app-shell";
import { NavIcon } from "./nav-icon";

const navigationMock = rs.hoisted(() => ({ pathname: "/app/my-time" }));
rs.mock("next/navigation", () => ({ usePathname: () => navigationMock.pathname, useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }), useSearchParams: () => new URLSearchParams() }));
rs.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children),
  useLinkStatus: () => ({ pending: false }),
}));



rs.mock("@/app/login/actions", () => ({ logout: rs.fn() }));
rs.mock("next/image", () => ({ default: () => null }));

const company={state:'ready' as const,employeeId:'actor',role:'MANAGER' as const,source:'LEGACY_ADOPTION' as const,scope:{mode:'COMPANY' as const,locationIds:[] as []},scopeRevision:1,authority:'fictional',locations:[],observedAt:'2026-10-14T12:00:00Z',validForMs:15000};

it.each([undefined,{state:'unavailable',reason:'read_failed'} as const,{...company,scope:null,source:'UNASSIGNED' as const}])('does not add clean Manager operational shortcuts without current scope',operationalAuthority=>{
 const html=renderToStaticMarkup(<AppShell workspaceName="QA" operationalAuthority={operationalAuthority} user={{id:'actor',firstName:'Sam',lastName:'Cruz',role:'MANAGER'}}>Content</AppShell>);
 expect(html).not.toContain('href="/app/schedule/new"');
 expect(html).not.toContain('href="/app?view=attendance"');
 expect(html).not.toContain('href="/app/account-recovery"');
 expect(html).toContain('href="/app/profile"');
});
it('keeps the clean Add shift action for scoped Managers without exposing Company-only Team tools',()=>{
 const operationalAuthority={...company,source:'OWNER_ASSIGNMENT' as const,scope:{mode:'LOCATIONS' as const,locationIds:['L1']}};
 const html=renderToStaticMarkup(<AppShell workspaceName="QA" operationalAuthority={operationalAuthority} user={{id:'actor',firstName:'Sam',lastName:'Cruz',role:'MANAGER'}}>Content</AppShell>);
 expect(html).toContain('href="/app/schedule/new"');
 expect(html).not.toContain('href="/app?view=attendance"');
 expect(html).not.toContain('href="/app/account-recovery"');
 expect(html).not.toContain('command-finder-trigger');
});

function render(role: "EMPLOYEE" | "LEAD" | "MANAGER" | "OWNER", pathname = "/app/my-time") {
  navigationMock.pathname = pathname;
  const html = renderToStaticMarkup(
    <AppShell workspaceName="Northside Services" operationalAuthority={company} user={{ id:"actor",firstName: "Sam", lastName: "Cruz", role }}><h1>My Time</h1></AppShell>,
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

// v5 "One look" (approved Oct 24, 2026): every role uses the Quiet tab bar; an Employee's or Lead's More is a page.
// Corporate (Release 1, board C-Employee): an Employee has Home, Schedule, Time and Requests (Pay joins with payroll), no
// More tab; the header avatar opens More. A Lead keeps the v5 tabs while that role is on hold.
it("gives EMPLOYEE Home, Schedule, Time and Requests tabs, with More behind the avatar", () => {
  const { html, mobile } = render("EMPLOYEE");
  expect([...mobile.matchAll(/href="([^"]+)"/g)].map((match) => match[1])).toEqual([
    "/app", "/app/schedule", "/app/my-time", "/app/requests/hub",
  ]);
  expect(mobile).toContain('<span>Time</span>');
  expect(mobile).not.toContain('<span>More</span>');
  expect(html).toContain('href="/app/more"');
  expect(html).toContain('class="c-top-avatar"');
});
// Direction B for Leads (Jose, Nov 8, 2026): a Lead has the Employee's tab bar (Home, Schedule, Time, Requests here, without
// payroll); More opens from the header avatar, so there is no More tab.
it.each(["LEAD"] as const)("gives %s the Employee tabs, with More on the avatar", (role) => {
  const { html, mobile } = render(role);
  expect([...mobile.matchAll(/href="([^"]+)"/g)].map((match) => match[1])).toEqual([...render("EMPLOYEE").mobile.matchAll(/href="([^"]+)"/g)].map((match) => match[1]));
  expect(mobile).not.toContain('<span>More</span>');
  expect(html).toContain('class="c-top-avatar"');
});

// Corporate (Release 1, approved Oct 26): five tabs and no More tab; More opens from the header avatar. Without payroll
// review, Inbox takes Payroll's place.
// Phase 3 (MG-006): a Manager's To do tab is second, as in the Manager's sidebar; the Owner's order is unchanged.
it.each(["MANAGER", "OWNER"] as const)("gives %s Home, Schedule, Time, Inbox and Team tabs without payroll review", (role) => {
  const { html, mobile } = render(role);
  expect([...mobile.matchAll(/href="([^"]+)"/g)].map((match) => match[1])).toEqual(role === "MANAGER"
    ? ["/app", "/app/inbox", "/app/schedule", "/app/timecards", "/app/employees"]
    : ["/app", "/app/schedule", "/app/timecards", "/app/inbox", "/app/employees"]);
  expect(mobile).toContain('<span>Time</span>');
  expect(mobile).not.toContain('<span>More</span>');
  expect(mobile).not.toContain('manager-more-navigation');
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
 const html=renderToStaticMarkup(<AppShell workspaceName="Northside Services" notificationsEnabled user={{id:"actor",firstName:'Sam',lastName:'Cruz',role}}>Content</AppShell>);
 expect(html.match(/id="portal-device-settings"/g)).toHaveLength(1);
 expect(html.match(/popoverTarget="portal-device-settings"/g)?.length).toBeGreaterThanOrEqual(2);
 expect(html).toContain('sidebar-profile-chevron');
 expect(html).not.toContain('href="/app/notifications"');
});
it('feature off retains the ordinary profile and does not mount setup',()=>{
 const {html}=render('EMPLOYEE');expect(html).not.toContain('portal-device-settings');expect(html).toContain('href="/app/profile" class="sidebar-profile portal-profile-trigger"');
});

it.each(["EMPLOYEE", "MANAGER"] as const)("offers a top-right account menu with sign out for %s", role => {
  const { html } = render(role);
  expect(html).toContain('class="portal-account-menu"');
  expect(html).toContain('aria-label="Sam Cruz, account menu"');
  expect(html).toContain('id="portal-account-menu"');
  // Round 2 (copy row 99): no "Signed in as" line; the name is on the button.
  expect(html).not.toContain('Signed in as ');
  expect(html).toContain('portal-account-signout');
  if (role === "EMPLOYEE") expect(html).toContain('>Your profile</a>');
  // Desktop has no More page; the account menu is the Employee's way to the calendar link page.
  if (role === "EMPLOYEE") expect(html.split('id="portal-account-menu"')[1]).toContain('href="/app/profile/calendar" class="nevora-action-menu-item">Add shifts to your calendar</a>');
  else expect(html).not.toContain('href="/app/profile/calendar"');
});

it("preserves configured Fuel customer identity in the sidebar", () => {
  const html = renderToStaticMarkup(<AppShell workspaceName="Fuel Coffee Drive" user={{id:"actor",firstName:"Sam",lastName:"Cruz",role:"EMPLOYEE"}}>Content</AppShell>);
  expect(html).toContain("Fuel Coffee Drive");
});

// Corporate (Release 1): the desktop sidebar mirrors the phone. Home, Schedule, Time, Payroll and Team, then Things to do,
// then More; Time and Things to do carry the phone's names.
it('groups authorized owner destinations like the phone and provides an accessible sidebar control', () => {
 const {html}=render('OWNER','/app/schedule');
 const sidebar=html.split('aria-label="Primary navigation"')[1].split('</nav>')[0];
 expect([...sidebar.matchAll(/class="nav-label">([^<]+)</g)].map(match=>match[1]).slice(0,4)).toEqual(['Home','Schedule','Time','Team']);
 expect(sidebar).toContain('<span class="nav-label">Things to do</span>');
 // Release 1 ("don't overwhelm"): no Team tools group; each tool opens from Home, Team or Schedule.
 expect(sidebar).toContain('<h2 class="sidebar-group-label">More</h2>');
 expect(sidebar).not.toContain('>Team tools</h2>');
 for(const label of ['Plan','People','Time and pay','Workspace']) expect(sidebar).not.toContain(`>${label}</h2>`);
 expect(html).toContain('aria-label="Collapse sidebar"');
 expect(html).toContain('aria-expanded="true"');
});

it.each(['MANAGER','OWNER'] as const)('gives %s Home, Schedule, Time, Payroll and Team tabs with payroll review', role=>{
 navigationMock.pathname='/app/payroll-export';
 const html=renderToStaticMarkup(<AppShell workspaceName="QA" operationalAuthority={company} payrollCapabilities={{enabled:true,canConfigure:true,canReview:true,canApprove:true,internalCalculatorAvailable:false,bankCompatibility:'UNVERIFIED'}} user={{id:'actor',firstName:'Sam',lastName:'Cruz',role}}>Content</AppShell>);
 const mobile=html.split('aria-label="Mobile navigation"')[1].split('</nav>')[0];
 expect([...mobile.matchAll(/href="([^"]+)"/g)].map(match=>match[1])).toEqual(['/app','/app/schedule','/app/timecards','/app/payroll','/app/employees']);
 expect(mobile).toContain('href="/app/payroll" class="mobile-nav-link active" aria-current="page"');
});

it.each(['MANAGER','OWNER'] as const)('opens %s More from the header avatar and keeps Profile out of the sidebar', role=>{
 const {html,mobile}=render(role,'/app');
 const header=html.split('<header class="mobile-header">')[1].split('</header>')[0];
 expect(header.match(/href="\/app\/more"/g)).toHaveLength(1);
 expect(header).toMatch(/href="\/app\/more"[^>]*class="c-top-avatar"[^>]*aria-label="More, Sam Cruz, SC"/);
 expect(html).toContain('data-nv-corp=""');
 expect(html).toContain('data-corp-root=""');
 expect(mobile).not.toContain('href="/app/more"');
 // Owners and Managers reach their Profile from More and the desktop account menu, never the sidebar.
 const sidebar=html.split('aria-label="Primary navigation"')[1].split('</nav>')[0];
 expect(sidebar).not.toContain('href="/app/profile"');
 expect(html.split('id="portal-account-menu"')[1]).toContain('href="/app/profile" class="nevora-action-menu-item"');
});

it.each(['EMPLOYEE','LEAD'] as const)('push_disabled_profile_and_inbox_accessible shell affordances for %s',role=>{
 const {html}=render(role);expect(html).toContain('href="/app/profile"');expect(html).not.toContain('portal-device-settings');
 // Jose (Nov 15, 2026, item 12): Notifications is reached from the one top-bar bell (the layout always passes its
 // authority), not from a sidebar or rail entry, as for Owners and Managers.
 navigationMock.pathname='/app/my-time';
 const withBell=renderToStaticMarkup(<AppShell workspaceName="Northside Services" notificationAuthority="fictional-view-authority" operationalAuthority={company} user={{id:'actor',firstName:'Sam',lastName:'Cruz',role}}>Content</AppShell>);
 expect(withBell.match(/href="\/app\/notifications"/g)).toHaveLength(1);
 expect(withBell).toMatch(/<a href="\/app\/notifications" class="portal-notification-bell"/);
 expect(withBell.split('aria-label="Primary navigation"')[1].split('</nav>')[0]).not.toContain('/app/notifications');
});

// Review Nov 14 (BR-4): Updates opens from More and is not one of the tabs, so the phone lights no tab (it used to light Home).
it.each(['MANAGER','OWNER'] as const)('keeps %s Updates under More, lights no tab on the phone, with a pushed page header',role=>{
 const {html,mobile}=render(role,'/app/updates/compose');
 const sidebar=html.split('aria-label="Primary navigation"')[1].split('</nav>')[0];
 expect(mobile).not.toContain('href="/app/updates"');
 expect(mobile).not.toContain('mobile-nav-link active');
 expect(mobile).not.toContain('aria-current');
 expect(html).not.toContain('data-corp-root=""');
 expect(sidebar).toMatch(/href="\/app\/updates"[^>]*aria-current="true"/);
 expect(sidebar.match(/href="\/app\/updates"/g)).toHaveLength(1);
});

it.each(['MANAGER','OWNER'] as const)('gives %s one More link (the header avatar) and preserves the authorized notification destination',role=>{
 const html=renderToStaticMarkup(<AppShell workspaceName="QA" notificationAuthority="fictional-view-authority" operationalAuthority={company} user={{id:'actor',firstName:'Sam',lastName:'Cruz',role}}>Content</AppShell>);
 const header=html.split('<header class="mobile-header">')[1].split('</header>')[0];
 const mobile=html.split('aria-label="Mobile navigation"')[1].split('</nav>')[0];
 expect(header.match(/href="\/app\/notifications"/g)).toHaveLength(1);
 expect(html.match(/href="\/app\/more"/g)).toHaveLength(1);
 expect(mobile).not.toContain('href="/app/more"');
 expect(mobile).not.toContain('nevora-action-menu-chevron');
 expect(header).toContain('class="portal-account-menu"');
 expect(header).not.toContain('role-chip');
});

it.each([['MANAGER','/app/exchange','/app/schedule'],['OWNER','/app/availability','/app/schedule'],['OWNER','/app/exchange/open-shifts','/app/schedule'],['MANAGER','/app/inbox','/app/inbox'],['OWNER','/app/requests','/app/inbox'],['MANAGER','/app/employees/AUDIT-E','/app/employees'],['EMPLOYEE','/app/exchange','/app/schedule'],['EMPLOYEE','/app/requests','/app/requests/hub'],['LEAD','/app/availability','/app/schedule']] as const)('lights the %s tab that owns %s',(role,pathname,tab)=>{
 const {mobile}=render(role,pathname);
 expect(mobile).toContain(`href="${tab}" class="mobile-nav-link active" aria-current="page"`);
});

// Clean Manager (v3): Owners and Managers move between the request pages from the band (RequestPagesNav), not section tabs.
it('shows no section tabs on the request pages for OWNER', () => { expect(render('OWNER','/app/requests').html).not.toContain('class="section-tabs"'); });
// v5: an Employee's or Lead's pages switch views with segments and go back with the bar, so no tab row shows.
it.each([['EMPLOYEE','/app/requests/hub'],['LEAD','/app/requests'],['EMPLOYEE','/app/my-time'],['EMPLOYEE','/app/timecards']] as const)('shows %s no section tabs on %s',(role,pathname)=>{
 expect(render(role,pathname).html).not.toContain('class="section-tabs"');
});

it('shows no section tabs on pages outside a shared group',()=>{
 expect(render('OWNER','/app/schedule').html).not.toContain('class="section-tabs"');
});

// Review Nov 14 (BR-4): pages opened from the avatar (More, Updates, Profile), the bell (Notifications) and Help are not
// tabs, so no tab is lit while one is open (they used to light Home).
it.each(['/app/updates/own-update','/app/updates','/app/more','/app/profile','/app/notifications','/app/help'])('lights no tab for EMPLOYEE on %s, which opens from the avatar or bell',pathname=>{
 const {mobile}=render('EMPLOYEE',pathname);
 expect(mobile).not.toContain('mobile-nav-link active');
 expect(mobile).not.toContain('aria-current');
});
// A Lead has the Employee's rule (Direction B, Nov 8, 2026).
it.each(['LEAD'] as const)('lights no tab for the %s Updates destination',role=>{
 const {mobile}=render(role,'/app/updates/own-update');
 expect(mobile).not.toContain('mobile-nav-link active');
});
// Review Nov 14 (BR-4): an Owner's or Manager's More, Insights, Settings, Profile and Notifications light no tab either.
it.each(['/app/more','/app/reports','/app/settings','/app/settings/locations','/app/profile','/app/notifications'])('lights no tab for OWNER on %s',pathname=>{
 const {mobile}=render('OWNER',pathname);
 expect(mobile).not.toContain('mobile-nav-link active');
 expect(mobile).not.toContain('aria-current');
});
it('D1: the desktop top bar shows workspace and page; a primary section has no group name',()=>{
 const {html}=render('OWNER','/app/timecards');
 expect(html).toContain('<ol class="portal-location"><li class="portal-location-workspace" title="Northside Services">Northside Services</li><li><span aria-current="page">Time</span></li></ol>');
 expect(html).toContain('data-group="More"');
});
it('D-4: Time off, Shift requests and Availability light Inbox, and the trail still names the page', () => {
 for (const [pathname, label] of [['/app/requests', 'Time off'], ['/app/exchange', 'Shift requests'], ['/app/availability', 'Availability']] as const) {
  const {html} = render('MANAGER', pathname);
  const sidebar = html.split('aria-label="Primary navigation"')[1].split('</nav>')[0];
  // IS-P4-08: Inbox is the current section there, not the current page.
  expect(sidebar).toContain('href="/app/inbox" class="nav-link active" aria-current="true"');
  expect(sidebar).not.toContain('href="/app/requests"');
  expect(html).toContain(`<li><a href="/app/inbox">Things to do</a></li><li><span aria-current="page">${label}</span></li></ol>`);
 }
 const {html} = render('OWNER', '/app/payroll-export');
 expect(html).toContain('<li><a href="/app/timecards">Time</a></li><li><span aria-current="page">Time exports</span></li></ol>');
 expect(html).toContain('<span class="nav-label">Team</span>');
});
it('IS-P4-09 and IS-P4-14: Home\'s views end the trail with their own name, and a skip link comes first', () => {
 const {html} = render('MANAGER', '/app');
 expect(html.indexOf('class="portal-skip-link" href="#main-content"')).toBeLessThan(html.indexOf('<aside'));
});
// G64 (Nov 23, 2026): unfocused, the skip link is moved above the window and also transparent, so a full-page capture of a
// scrolled page (which paints above the window) never draws it; with keyboard focus it shows as before.
it('G64: the skip link draws only with keyboard focus', () => {
 const css = readFileSync(new URL('../app/app/premium-desktop.css', import.meta.url), 'utf8');
 expect(css).toContain('html body .app-shell.nevora-portal.nevora-portal .portal-skip-link:not(:focus-visible) { opacity: 0; pointer-events: none; }');
 expect(css).toContain('html body .app-shell.nevora-portal.nevora-portal .portal-skip-link:focus-visible { transform: none;');
});

it.each(['EMPLOYEE','LEAD'] as const)('scopes the teal mobile foundation to %s with current navigation ownership',role=>{
 const {html,mobile}=render(role,'/app');
 expect(html).toContain('data-employee-mobile="true"');
 expect(html).toContain('data-employee-mobile-page="home"');
 expect(mobile).toContain('aria-current="page"');
 expect(html).not.toContain('href="/app/schedule/new"');
});
it.each(['OWNER','MANAGER'] as const)('does not opt %s into the Employee mobile foundation',role=>{
 expect(render(role,'/app').html).not.toContain('data-employee-mobile="true"');
});

// Upscale (Nov 1): one desktop shell for both roles, the rail on tablets, the filled tab icons and the account menu header.
it.each(['EMPLOYEE','OWNER'] as const)('renders the %s shell with both sidebar choices, the workspace row and no native title tooltips',role=>{
 const {html}=render(role,'/app');
 // The server cannot know the width: desktop follows the stored choice (full here), tablets open as a rail.
 expect(html).toContain('data-sidebar-desktop="full"');
 expect(html).toContain('data-sidebar-tablet="rail"');
 // Review B5 (NV-110): the tile carries its full name as a title.
 // Phase 4 (EM-026): an Employee's card carries the role line a Lead's has, so both are one height; an Owner's has none.
 expect(html).toContain(`<p class="cm-org" title="Northside Services"><span class="cm-org__mark" aria-hidden="true">NS</span><span class="cm-org__name">Northside Services</span>${role==='EMPLOYEE'?'<span class="cm-org__role">Employee</span>':''}</p>`);
 const sidebar=html.split('aria-label="Primary navigation"')[1].split('</nav>')[0];
 expect(sidebar).not.toMatch(/class="nav-link[^"]*"[^>]*title=/);
 // One tooltip element for the rail, outside the sidebar, hidden from assistive technology (it repeats the entry's name).
 expect(html.match(/class="c-rail-tip"/g)).toHaveLength(1);
 expect(html).toContain('<div class="c-rail-tip" aria-hidden="true"></div>');
});

// Direction B for Leads (Nov 8, 2026): a Lead has the corporate Direction B shell (workspace tile, no round "+" button).
it('gives a Lead the corporate Direction B shell',()=>{
 const {html}=render('LEAD','/app');
 expect(html).toContain('class="cm-org"');
 expect(html).toContain('<span class="cm-org__role">Lead</span></p>');
 expect(html).not.toContain('class="e5-new"');
 expect(html).toContain('data-nv-b=""');
});

it.each(['EMPLOYEE','OWNER'] as const)('orders the %s top bar Search · bell · avatar, with no "+" button',role=>{
 navigationMock.pathname='/app';
 const html=renderToStaticMarkup(<AppShell workspaceName="Northside Services" notificationAuthority="fictional-view-authority" operationalAuthority={company} user={{id:'actor',firstName:'Sam',lastName:'Cruz',role}}>Content</AppShell>);
 const actions=html.split('class="mobile-header-actions"')[1].split('</header>')[0];
 expect(actions).not.toContain('e5-new');
 expect(actions).not.toContain('aria-label="New request"');
 const bell=actions.indexOf('portal-notification-bell'), menu=actions.indexOf('class="portal-account-menu"');
 expect(bell).toBeGreaterThan(-1);
 expect(menu).toBeGreaterThan(bell);
 if(role==='OWNER') expect(actions.indexOf('command-finder-trigger')).toBeLessThan(bell);
});

it.each([['EMPLOYEE','Employee'],['OWNER','Owner'],['MANAGER','Manager']] as const)('opens the %s account menu on the name, then the role and workspace',(role,label)=>{
 const {html}=render(role);
 const menu=html.split('id="portal-account-menu"')[1];
 expect(menu).toContain(`<div class="portal-account-head"><strong class="portal-account-head__name">Sam Cruz</strong><span class="portal-account-head__detail">${label} · Northside Services</span></div><div class="nevora-action-menu-divider portal-account-head__divider"></div>`);
 // Sign out stays last, after its own divider.
 expect(menu.indexOf('portal-account-signout')).toBeGreaterThan(menu.lastIndexOf('nevora-action-menu-divider'));
});

// Review B1 (NV-118): inactive tabs are Phosphor bold (the one weight), the current tab is filled.
it.each([['EMPLOYEE','/app/schedule','schedule'],['OWNER','/app/timecards','clock']] as const)('fills the current %s tab icon and keeps the others bold',(role,pathname,icon)=>{
 const {mobile}=render(role,pathname);
 const active=mobile.split('class="mobile-nav-link active"')[1].split('</a>')[0];
 expect(active).toContain(renderToStaticMarkup(<NavIcon name={icon} size={24} weight="fill" />));
 const home=mobile.split('href="/app"')[1].split('</a>')[0];
 expect(home).toContain(renderToStaticMarkup(<NavIcon name="dashboard" size={24} weight="bold" />));
});

// Upscale (Nov 1): the in-app Help page and the signed-in "not found" page belong to no tab or sidebar entry.
it.each(['OWNER','MANAGER'] as const)('lights no tab on a %s phone for Help, with no sidebar entry',role=>{
 const {html,mobile}=render(role,'/app/help');
 expect(mobile).not.toContain('mobile-nav-link active');
 const sidebar=html.split('aria-label="Primary navigation"')[1].split('</nav>')[0];
 expect(sidebar).not.toContain('nav-link active');
});
it.each(['EMPLOYEE','LEAD','OWNER','MANAGER'] as const)('lights no %s tab or sidebar entry on Help or an unknown address',role=>{
 // Review Nov 14 (BR-4): Help lights no tab on any role's phone, like an unknown address.
 for(const pathname of ['/app/help','/app/no-such-page','/app/nothing/here']){
  const {html,mobile}=render(role,pathname);
  expect(mobile).not.toContain('mobile-nav-link active');
  expect(mobile).not.toContain('aria-current');
  const sidebar=html.split('aria-label="Primary navigation"')[1].split('</nav>')[0];
  expect(sidebar).not.toContain('nav-link active');
  expect(sidebar).not.toContain('aria-current');
 }
});

// Phase 3, package F (Nov 15, 2026): the Owner and Manager shell.
const ownPay={enabled:true,canConfigure:false,canReview:false,canApprove:false,internalCalculatorAvailable:false,bankCompatibility:'UNVERIFIED'} as const;
function shell(role:'OWNER'|'MANAGER'|'EMPLOYEE',pathname:string,payroll:ComponentProps<typeof AppShell>['payrollCapabilities']=ownPay){
 navigationMock.pathname=pathname;
 const html=renderToStaticMarkup(<AppShell workspaceName="Northside Café &amp; Bakery" operationalAuthority={company} payrollCapabilities={payroll} user={{id:'actor',firstName:'Sam',lastName:'Cruz',role}}>Content</AppShell>);
 return {html,sidebar:html.split('aria-label="Primary navigation"')[1].split('</nav>')[0],mobile:html.split('aria-label="Mobile navigation"')[1].split('</nav>')[0],pill:html.split('class="portal-account-menu"')[1].split('</button>')[0],menu:html.split('id="portal-account-menu"')[1].split('</header>')[0]};
}
it('MG-006, MG-007: a Manager\'s sidebar reads Home, Things to do, Schedule, Time, Team, then an unnamed group with Scheduling rules and My pay',()=>{
 const {sidebar,menu}=shell('MANAGER','/app');
 expect([...sidebar.matchAll(/class="nav-label">([^<]+)</g)].map(match=>match[1])).toEqual(['Home','Things to do','Schedule','Time','Team','Insights','Updates','Scheduling rules','My pay']);
 expect(sidebar).not.toContain('sidebar-group-label');
 expect(sidebar.match(/class="sidebar-nav-group"/g)).toHaveLength(2);
 // My pay has one place on tablets and desktop: the sidebar, not the account menu as well.
 expect(menu).not.toContain('href="/app/my-pay"');
 // The Owner keeps the "More" heading and My pay in the account menu.
 const owner=shell('OWNER','/app');
 expect(owner.sidebar).toContain('<h2 class="sidebar-group-label">More</h2>');
 expect(owner.sidebar).not.toContain('href="/app/my-pay"');
 expect(owner.menu).toContain('href="/app/my-pay"');
});
it.each(['/app/schedule/settings','/app/my-pay'])('MG-007: a Manager\'s %s lights its own sidebar entry and nothing else',pathname=>{
 const {sidebar,pill}=shell('MANAGER',pathname);
 expect(sidebar.match(/aria-current=/g)).toHaveLength(1);
 expect(sidebar).toContain(`href="${pathname}" class="nav-link active" aria-current="page"`);
 expect(pill).not.toContain('aria-current');
});
it.each([['OWNER','/app/more'],['OWNER','/app/profile'],['OWNER','/app/my-pay'],['MANAGER','/app/more'],['MANAGER','/app/profile']] as const)('TB-009: for %s, %s lights no sidebar entry and marks the account pill',(role,pathname)=>{
 const {sidebar,pill,mobile}=shell(role,pathname);
 expect(sidebar).not.toContain('aria-current');
 expect(sidebar).not.toContain('nav-link active');
 expect(pill).toContain('aria-current="true"');
 expect(mobile).not.toContain('aria-current');
});
it.each(['/app','/app/schedule','/app/inbox','/app/reports'])('TB-009: the account pill is not marked on %s',pathname=>{
 const {sidebar,pill}=shell('OWNER',pathname);
 expect(pill).not.toContain('aria-current');
 expect(sidebar.match(/aria-current="page"/g)).toHaveLength(1);
});
// MG-014: a Manager's closed Payroll and Settings pages and Insights light no tab; the closed pages light no sidebar entry.
it.each(['/app/payroll','/app/settings','/app/reports'])('MG-014: a Manager\'s %s lights no tab',pathname=>{
 const {mobile,sidebar}=shell('MANAGER',pathname);
 expect(mobile).not.toContain('mobile-nav-link active');
 expect(mobile).not.toContain('aria-current');
 if(pathname==='/app/reports') expect(sidebar).toContain('href="/app/reports" class="nav-link active" aria-current="page"');
 else expect(sidebar).not.toContain('aria-current');
});
it('TB-001, TB-009: the current sidebar entry\'s glyph is filled and the others are bold',()=>{
 const fill=renderToStaticMarkup(<NavIcon name="schedule" size={20} weight="fill"/>),bold=renderToStaticMarkup(<NavIcon name="schedule" size={20}/>);
 expect(fill).not.toBe(bold);
 for(const role of ['OWNER','EMPLOYEE'] as const){
  const {sidebar}=shell(role,'/app/schedule');
  expect(sidebar.split('href="/app/schedule"')[1].split('</a>')[0]).toContain(fill);
  expect(sidebar.split('href="/app"')[1].split('</a>')[0]).not.toContain(renderToStaticMarkup(<NavIcon name="dashboard" size={20} weight="fill"/>));
 }
});
it('an Employee\'s account menu and sidebar are unchanged by the Manager rules',()=>{
 const {sidebar,pill}=shell('EMPLOYEE','/app/profile');
 expect([...sidebar.matchAll(/class="nav-label">([^<]+)</g)].map(match=>match[1])).toEqual(['Home','Schedule','Time','Pay','Requests','Updates']);
 expect(sidebar).toContain('<h2 class="sidebar-group-label">More</h2>');
 expect(pill).not.toContain('aria-current');
});
// The Phase 3 shell rules live in one marked block of owner-b-shell.css and never reach an Employee's or Lead's shell.
it('keeps every Phase 3 shell rule scoped to Owner and Manager shells',()=>{
 const css=readFileSync(new URL('../app/app/owner-b-shell.css',import.meta.url),'utf8');
 const block=css.split('Phase 3, package F (Nov 15, 2026)')[1].split('end of Phase 3, package F')[0];
 const selectors=block.replace(/\/\*[\s\S]*?\*\//g,'').split('\n').map(line=>line.trim()).filter(line=>line.startsWith(':is(#c-root, html)'));
 expect(selectors.length).toBeGreaterThan(10);
 for(const selector of selectors) expect(selector).toContain(':not([data-employee-mobile])');
 // One count pill: teal, 20px, 12/700; and the touch rule is touch-only from 768px.
 expect(block).toMatch(/\.nav-count \{[^}]*min-width: 20px !important; height: 20px !important;[^}]*background: var\(--b-teal\) !important; font: 700 var\(--b-fs-count\)/);
 expect(block).toContain('@media (min-width: 768px) and (pointer: coarse)');
 expect(css).not.toMatch(/\.b-tab-badge \{[^}]*var\(--b-red\)/);
});
// Phase 8 (Nov 17, 2026): a sidebar or rail that holds more than a short window says so. The list carries one cue at each
// edge, hidden from assistive technology and drawn only when the list scrolls (b-foundation.css reads data-more-above and
// data-more-below, which the shell sets in the browser); the entries and their order are unchanged.
it.each(['OWNER','MANAGER','EMPLOYEE'] as const)('gives the %s sidebar its scroll cues around the entries, outside the accessibility tree',role=>{
 const {sidebar}=shell(role,'/app');
 // Phase 9: the head carries a caret (pointing up) as the foot does (pointing down).
 expect(sidebar).toMatch(/^[^>]*><span class="sidebar-more sidebar-more--top" aria-hidden="true"><svg[^>]*>[\s\S]*?<\/svg><\/span><div class="sidebar-nav-group"/);
 expect(sidebar).toMatch(/<span class="sidebar-more sidebar-more--bottom" aria-hidden="true"><svg[^>]*>[\s\S]*<\/svg><\/span>$/);
 expect(sidebar).not.toContain('data-more-');
 expect(sidebar.indexOf('sidebar-more--top')).toBeLessThan(sidebar.indexOf('class="nav-link'));
 expect(sidebar.lastIndexOf('class="nav-link')).toBeLessThan(sidebar.indexOf('sidebar-more--bottom'));
});
