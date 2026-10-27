"use client";

import {useEmployeeNavigationLayout} from './employee-mobile/navigation-layout';
import {useEmployeeMobile} from './employee-mobile/use-mobile';
import {NavigationLink as Link} from './navigation-link';
import {useLinkStatus} from 'next/link';
import {AppNavigationProvider,useIdentityReload} from './app-navigation';
import { NotificationBell } from "./notification-bell";
import { useInboxCount } from "./use-inbox-count";
import { isMobileKeyboardVisible } from "../lib/mobile-keyboard";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { AuthBrand } from "./auth-brand";
import { PlusIcon } from "@phosphor-icons/react/ssr";
import { NavIcon } from "@/components/nav-icon";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { PortalSignout } from "./portal-signout";
import { PortalDeviceSetup } from "./portal-device-setup";
import { PortalAccountMenu } from "./portal-account-menu";
import { SheetGestures } from "./sheet-gestures";
import { Toaster } from "./toaster";
import { FormValidation } from "./form-validation";
import type { UserRole } from "@/lib/domain";
import { teamToolsForRole, activeMobileTab, activeNavigationHref, managementNavigationGroups, mobileTabsForRole, navigationForRole, sectionTabsFor, sidebarActiveHref, sidebarNavigation, type NavContext } from "@/lib/navigation";
import { SectionTabs } from "./section-tabs";
import { isPopoverOpen, hidePopover } from "./kit/popover-open";
import { CommandFinder } from "./command-finder";
import { PresentationProvider } from "./presentation-context";
import { NUVORA_BRAND } from "../lib/brand";
import { handleRowNavigation } from "../lib/row-navigation";
import type { PayrollCapabilities } from '@/lib/payroll/contracts';
import type {OperationalAuthorityView} from '@/lib/company-access/model';
import {useOperationalNavigation} from './company-access/use-operational-navigation';

/** Home's views share Home's address; the trail names them as their bands do. */
const HOME_VIEWS = { attendance: "Attendance", team: "Team overview", activity: "Schedule activity" } as const;

type AppShellProps = {
  brand?: { style?: Record<string, string>; logoUrl?: string | null };
  presentation?: NavContext;
  workspaceName: string;
  initialCollapsed?: boolean;
  preferenceCookie?: string;
  notificationAuthority?: string;
  notificationsEnabled?: boolean;
  payrollCapabilities?: PayrollCapabilities;
  operationalAuthority?: OperationalAuthorityView;
  children: ReactNode;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
};


/** Phase 1: the tapped tab lights up at once, before its page arrives (the Quiet shell styles the mark). */
function TabPending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="mobile-nav-pending" aria-hidden="true" /> : null;
}

/**
 * Client shell for server-projected identity/capabilities. Remount navigation
 * coordination when identity or role changes so pending attempts cannot leak
 * across accounts. Navigation visibility is presentation; each destination and
 * mutation still enforces current server/database authorization.
 */
export function AppShell(props:AppShellProps){
 return <AppNavigationProvider key={JSON.stringify([props.user.id,props.user.role])}><AppShellView {...props}/></AppNavigationProvider>;
}

function AppShellView({
  children,
  workspaceName,
  user,
  notificationsEnabled = false,
  payrollCapabilities,
  initialCollapsed = false,
  preferenceCookie = "nevora_sidebar",
  notificationAuthority,
  brand,
  presentation,
  operationalAuthority,
}:AppShellProps) {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  function toggleSidebar() {
    const next = !collapsed; setCollapsed(next);
    if (/^[a-z0-9_]+$/i.test(preferenceCookie)) document.cookie = `${preferenceCookie}=${next ? "collapsed" : "expanded"}; Path=/app; Max-Age=31536000; SameSite=Lax`;
  }
  const employee = user.role === "EMPLOYEE" || user.role === "LEAD";
  const employeeMobile = useEmployeeMobile() && employee;
  useEmployeeNavigationLayout(employee);
  // Refresh the retained layout's server identity without interrupting the destination document's streamed content.
  const identityReload=useIdentityReload(()=>router.refresh());
  const accessChanged=useCallback((reason:'identity'|'scope')=>{if(reason==='identity')identityReload.request();else {window.dispatchEvent(new Event('nevora:notifications-changed'));router.refresh();}},[router,identityReload]);
  const operational=useOperationalNavigation(user.id,user.role,operationalAuthority,accessChanged);
  const inboxCount = useInboxCount(!employee && (user.role === 'OWNER' || operational.view?.state === 'ready' && operational.view.scope?.mode === 'COMPANY'), pathname);
  const context:NavContext = {...presentation, operational:operational.view??undefined};
  const navigation = navigationForRole(user.role, payrollCapabilities, context);
  const mobileTabs = mobileTabsForRole(user.role, payrollCapabilities, context);
  const activeTab = activeMobileTab(user.role, pathname ?? "", payrollCapabilities, context);
  // P3-ST-22: a single request's review is one task with no section tabs. Deciding it from the URL means the tabs are
  // absent from the first frame, placeholder included, instead of disappearing once the review renders.
  const focusedReview = pathname === "/app/requests" && !!search?.get("requestId");
  const sectionTabs = pathname && !focusedReview ? sectionTabsFor(user.role, pathname, payrollCapabilities, context) : null;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  const activeHref = activeNavigationHref(user.role, pathname, payrollCapabilities, context);
  const sidebarItems = sidebarNavigation(user.role, navigation);
  // Clean Manager (v3): Home's occasional tools (its views and the two recovery pages) have their own group.
  const teamTools = teamToolsForRole(user.role, context);
  const toolView = pathname === "/app" ? search?.get("view") : null;
  const activeTool = teamTools.find(tool => tool.href === pathname || (toolView && tool.href === `/app?view=${toolView}`));
  const sidebarActive = activeTool?.href ?? sidebarActiveHref(user.role, pathname, sidebarItems, payrollCapabilities, context);
  const navGroups = employee ? [{ label: "", items: sidebarItems }] : managementNavigationGroups(sidebarItems, teamTools);
  // Top-bar location (D1): section, then page. The page links back when you are deeper in it.
  const activeGroup = navGroups.find(group => group.items.some(item => item.href === sidebarActive));
  // A page reached from the account menu (Profile, My pay) has no sidebar entry; the trail still names it.
  const activeItem = activeGroup?.items.find(item => item.href === sidebarActive) ?? navigation.find(item => item.href === activeHref);
  // A team tool is its own page in the trail ("Team tools › Attendance"), never "Attendance › Attendance".
  const deeper = !!activeItem && !activeTool && pathname !== activeItem.href;
  // A page whose own entry left the sidebar (Time off under Inbox, Time exports under Timecards) still ends the trail with its own name,
  // and so do Home's views (IS-P4-09), which share Home's address.
  const searchParams = useSearchParams();
  const view = searchParams?.get("view");
  const exchangeTab = searchParams?.get("tab");
  const homeView = !employee && pathname === "/app" && view && view in HOME_VIEWS ? { href: `/app?view=${view}`, label: HOME_VIEWS[view as keyof typeof HOME_VIEWS] } : undefined;
  // WR4-07: a section tab with no navigation entry of its own (Payroll settings) also ends the trail with its name.
  const currentTab = sectionTabs?.items.find(item => item.href === pathname);
  const pageItem = activeTool ? undefined : homeView ?? (activeItem && activeHref && activeHref !== activeItem.href ? navigation.find(item => item.href === activeHref) : undefined)
    ?? (activeItem && currentTab && currentTab.href !== activeItem.href ? currentTab : undefined);

  // Keep the current page visible in a sidebar that scrolls on short screens,
  // clear of the pinned Workspace group.
  useEffect(() => {
    const nav = document.getElementById("desktop-primary-navigation");
    const link = nav?.querySelector<HTMLElement>(".nav-link.active");
    if (!nav || !link || nav.scrollHeight <= nav.clientHeight) return;
    const pinned = nav.querySelector<HTMLElement>('[data-group="Workspace"]');
    const box = nav.getBoundingClientRect(), item = link.getBoundingClientRect();
    const bottom = box.bottom - (pinned && !pinned.contains(link) ? pinned.offsetHeight : 0);
    if (item.top < box.top) nav.scrollTop -= box.top - item.top + 8;
    else if (item.bottom > bottom) nav.scrollTop += item.bottom - bottom + 8;
  }, [sidebarActive]);

  // Phase 7 (IS-3, IS-5): a focused pill in a sideways-scrolling row scrolls into view, and
  // the More sheet closes when keyboard focus moves out of it, so focus never lands behind it.
  useEffect(() => {
    function follow(event: FocusEvent) {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;
      // IS-64: the employee More sheet follows the same rule as the manager's.
      // IS-P4-03: the desktop account menu and device settings close the same way, so focus never sits behind them.
      for (const id of ["manager-more-navigation", "employee-more-navigation", "portal-account-menu", "portal-device-settings"]) {
        const sheet = document.getElementById(id);
        if (isPopoverOpen(sheet) && !sheet.contains(target) && !target.closest(`[popovertarget="${id}"]`)) hidePopover(sheet);
      }
      // IS-65: every sideways-scrolling pill row follows focus, Notifications' and Updates' filters included.
      if (target.closest(".nv-filters, .section-tabs-track, .segmented, .mws-day-navigation, .my-week-days, .updates-filters, [class*='notification-inbox-module'][class*='__filters']")) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ inline: "nearest", block: "nearest", behavior: reduce ? "auto" : "smooth" });
      }
    }
    document.addEventListener("focusin", follow);
    return () => document.removeEventListener("focusin", follow);
  }, []);

  // Clean Manager (v3), QA r3: the tab bar and a page's decision bar grow with large text, so their real heights are shared as
  // --cm-tabbar-h and --cm-actionbar-h; the decision bar docks above the tab bar and the page reserves both (Owner and Manager).
  useEffect(() => {
    if (employee || typeof ResizeObserver === "undefined") return;
    const shell = document.querySelector<HTMLElement>(".app-shell[data-nv-clean]");
    if (!shell) return;
    const measure = () => {
      const nav = shell.querySelector<HTMLElement>(".mobile-nav"), bar = shell.querySelector<HTMLElement>(".nv-actionbar");
      shell.style.setProperty("--cm-tabbar-h", `${nav && getComputedStyle(nav).display !== "none" ? Math.round(nav.getBoundingClientRect().height) : 0}px`);
      shell.style.setProperty("--cm-actionbar-h", `${bar ? Math.round(bar.getBoundingClientRect().height) : 0}px`);
    };
    const observer = new ResizeObserver(measure);
    // Phase 1: a streaming page mutates the shell many times; look for added or removed bars once per frame and
    // re-observe only when the set changed. Size changes reach measure through the ResizeObserver, after layout.
    let watched: Element[] = [], frame = 0;
    const watch = () => {
      frame = 0;
      const bars = [...shell.querySelectorAll(".mobile-nav, .nv-actionbar")];
      if (bars.length === watched.length && bars.every((bar, index) => bar === watched[index])) return;
      watched = bars; observer.disconnect(); for (const element of bars) observer.observe(element); measure();
    };
    watch();
    const changes = new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(watch); });
    changes.observe(shell, { childList: true, subtree: true });
    return () => { if (frame) cancelAnimationFrame(frame); observer.disconnect(); changes.disconnect(); };
  }, [employee, pathname]);

  // Arrow keys move between rows of dense lists that opt in (D6).
  useEffect(() => {
    document.addEventListener("keydown", handleRowNavigation);
    return () => document.removeEventListener("keydown", handleRowNavigation);
  }, []);

  useEffect(() => {
    for (const id of ['employee-more-navigation', 'manager-more-navigation']) {
      const menu = document.getElementById(id);
      if (isPopoverOpen(menu)) hidePopover(menu);
    }
  }, [pathname]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let frame = 0;
    function update() {
      const field = document.activeElement;
      const hasFocusedField = field instanceof HTMLElement && field.matches("input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([type='button']):not([type='submit']):not([type='range']), select, textarea, [contenteditable='true']");
      const nav = document.querySelector('.mobile-nav');
      document.documentElement.classList.toggle('mobile-keyboard-open', isMobileKeyboardVisible({
        hasFocusedField,
        hasMobileNavigation: !!nav && getComputedStyle(nav).display !== 'none',
        layoutHeight: document.documentElement.clientHeight,
        visualHeight: viewport!.height,
      }));
    }
    function afterFocus() { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); }
    viewport.addEventListener('resize', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', afterFocus);
    document.addEventListener('focusout', afterFocus);
    update();
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', afterFocus);
      document.removeEventListener('focusout', afterFocus);
      document.documentElement.classList.remove('mobile-keyboard-open');
    };
  }, []);

  const Profile = notificationsEnabled ? "button" : "div";
  // The NEVORA wordmark never changes; a company logo sits beside it in a white chip.
  const companyLogo = brand?.logoUrl ? <span className="company-logo-chip">
    {/* eslint-disable-next-line @next/next/no-img-element -- an immutable, same-origin asset already sized for the chip */}
    <img src={brand.logoUrl} alt={`${workspaceName} logo`} decoding="async" />
  </span> : null;
  const accountMenu = (
    <PortalAccountMenu initials={initials} name={`${user.firstName} ${user.lastName}`}>
      {employee || navigation.some(item => item.href === "/app/profile") ? <Link href="/app/profile" className="nevora-action-menu-item"
        onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>Your profile</Link> : null}
      {!employee && navigation.some(item => item.href === "/app/my-pay") ? <Link href="/app/my-pay" className="nevora-action-menu-item"
        onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>My pay</Link> : null}
      {notificationsEnabled ? <button type="button" className="nevora-action-menu-item" popoverTarget="portal-device-settings">Profile and device settings</button> : null}
      <div className="nevora-action-menu-divider" />
      <PortalSignout><button className="nevora-action-menu-item portal-account-signout" type="submit">Sign out</button></PortalSignout>
    </PortalAccountMenu>
  );
  return (
    <div className={employee ? "app-shell employee-shell nevora-portal" : "app-shell nevora-portal"} data-sidebar-collapsed={collapsed}
      // Clean Manager and Owner app (v3): premium-clean-manager.css applies only under this attribute, so Employee and Lead pages never change.
      id={employee ? "employee-mobile" : undefined}
      data-employee-mobile={employee ? "true" : undefined}
      data-employee-mobile-active={employeeMobile ? "true" : undefined}
      data-employee-mobile-page={employee ? pathname === "/app" ? "home" : pathname === "/app/schedule" ? "schedule" : pathname === "/app/requests/hub" || pathname === "/app/exchange" && !['foryou','requests','my','history'].includes(exchangeTab??'') ? "requests" : "other" : undefined}
      data-nv-clean={employee ? undefined : ""}
      // Quiet (v4, Jose approved Oct 23, docs/product/specs/owner-v4-quiet): the Owner and Manager pages and their tab bar.
      data-nv-quiet=""
      // Employee app, new style (Jose approved Oct 20, docs/product/specs/employee-style): employee-style.css applies only under this attribute.
      data-nv-e5={employee ? "" : undefined}
      style={brand?.style as CSSProperties | undefined} data-company-brand={brand?.style ? "custom" : undefined}
      // One phone shell on every tab, Home included, for every role (Phase 7 WR-03; employees since Phase 3, P3-ST-01).
      data-mobile-workforce={pathname ? "true" : undefined}
      data-employee-corporate={employee && (pathname === "/app/my-time" || pathname === "/app/timecards") ? "true" : undefined}>
      {/* IS-P4-14: on desktop, the sidebar and header come first; this skips them. Shown only on focus, and only on desktop. */}
      <a className="portal-skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar" data-collapsed={collapsed}>
        <div className="sidebar-heading">
        <Link href="/app" className="brand sidebar-brand" aria-label={NUVORA_BRAND.homeAriaLabel}>
          <AuthBrand />
        </Link>
        {companyLogo}
        {/* v3: the workspace at the top of the sidebar (Owner and Manager; desktop only). */}
        {!employee ? <p className="cm-org"><span className="cm-org__mark" aria-hidden="true">{workspaceName.trim()[0]?.toUpperCase() ?? ""}</span><span className="cm-org__name">{workspaceName}</span></p> : null}

        <button className="sidebar-toggle" type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} aria-controls="desktop-primary-navigation" onClick={toggleSidebar}><NavIcon name="sidebar" size={22} /></button>
        </div>
        <nav id="desktop-primary-navigation" className="sidebar-nav" aria-label="Primary navigation">
          {navGroups.map(group => <div className="sidebar-nav-group" data-group={group.label || undefined} key={group.label}>
          {group.label ? <h2 className="sidebar-group-label">{group.label}</h2> : null}
          {group.items.map((item) => {
            const active = item.href === sidebarActive;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-link active" : "nav-link"}
                // IS-P4-08: a holder (Inbox on Time off) is the current section, not the current page.
                aria-current={active ? (activeTool?.href === item.href || (item.href === activeHref && !pageItem && !deeper) ? "page" : "true") : undefined}
                aria-label={item.href === "/app/inbox" && inboxCount ? `${item.label}, ${inboxCount} need${inboxCount === 1 ? "s" : ""} you` : item.label}
                title={collapsed ? item.label : undefined}
              >
                <span className="nav-icon">
                  <NavIcon name={item.icon} employee={employee} size={employee ? 20 : 18} />
                </span>
                <span className="nav-label">{item.label}</span>
                {item.href === "/app/inbox" && inboxCount ? <span className="nav-count" aria-hidden="true">{inboxCount > 99 ? "99+" : inboxCount}</span> : null}
              </Link>
            );
          })}</div>)}
        </nav>

        {employee ? <Link href="/app/profile" className="sidebar-profile portal-profile-trigger" aria-label="Your profile">
          <div className="avatar">{initials}</div>
          <div className="sidebar-profile-copy"><strong>{user.firstName} {user.lastName}</strong></div>
        </Link> : <>        <Profile className={`sidebar-profile${notificationsEnabled ? " portal-profile-trigger" : ""}`} {...(notificationsEnabled ? { type: "button" as const, popoverTarget: "portal-device-settings", "aria-label": "Profile and device settings" } : {})}>
          <div className="avatar">{initials}</div>
          <div className="sidebar-profile-copy">
            <strong>{user.firstName} {user.lastName}</strong>
          </div>
          {notificationsEnabled ? <span className="sidebar-profile-chevron" aria-hidden="true">⌄</span> : null}
        </Profile></>}


        <PortalSignout className="sidebar-signout-form">
          <button className="sidebar-logout sidebar-logout-row" type="submit">
            <NavIcon name="logout" size={18} employee={employee} />
            <span>Sign out</span>
          </button>
        </PortalSignout>

        <div className="sidebar-platform-footer">
          <span>{workspaceName}</span>
          <small>{NUVORA_BRAND.poweredBy}</small>
        </div>
      </aside>

      <div className="app-main">
        <header className="mobile-header">
          <span className="portal-workspace-name" title={workspaceName}>{workspaceName}</span>
          {/* v3: Notifications has no navigation entry for Owners and Managers, so the trail names it directly. */}
          {!activeItem && !employee && pathname === "/app/notifications" ? <nav className="portal-location-nav" aria-label="You are here"><ol className="portal-location"><li><span aria-current="page">Notifications</span></li></ol></nav> : null}
          {activeItem ? <nav className="portal-location-nav" aria-label="You are here">
            <ol className="portal-location">
              <li className="portal-location-workspace" title={workspaceName}>{workspaceName}</li>
              {activeGroup?.label ? <li>{activeGroup.label}</li> : null}
              <li>{deeper || (homeView && !activeTool) ? <Link href={activeItem.href}>{activeItem.label}</Link> : <span aria-current="page">{activeItem.label}</span>}</li>
              {pageItem ? <li>{!homeView && pathname !== pageItem.href ? <Link href={pageItem.href}>{pageItem.label}</Link> : <span aria-current="page">{pageItem.label}</span>}</li> : null}
            </ol>
          </nav> : null}
          <Link href="/app" className="brand compact" aria-label={NUVORA_BRAND.homeAriaLabel}>
            <AuthBrand />
          </Link>
          {companyLogo}
          <div className="mobile-header-actions">
          {/* v3: the desktop top bar's one action (Owner and Manager); phones add shifts from Schedule. */}
          {!employee && navigation.some(item => item.href === "/app/schedule") ? <Link href="/app/schedule/new" className="cm-add-shift"><PlusIcon size={14} weight="bold" aria-hidden="true" />Add shift</Link> : null}
          {!employee && (user.role === "OWNER" || operational.view?.state === "ready" && operational.view.scope?.mode === "COMPANY") ? <CommandFinder role={user.role} payroll={payrollCapabilities} context={context} /> : null}
          {/* Employee app (new style): the avatar comes first, so focus order matches the phone header (avatar left; "+" and the
            bell right). On desktop its CSS order puts it back at the end of the top bar. */}
          {employee ? accountMenu : null}
          {/* Employee app (new style): a round "+" for a new request, next to the bell. */}
          {employee ? <Link href="/app/requests" className="e5-new" aria-label="New request"><PlusIcon size={20} aria-hidden="true" /></Link> : null}
          {notificationAuthority ? <NotificationBell key={operationalAuthority?.state==='ready'?operationalAuthority.authority:'unavailable'} authority={notificationAuthority} /> : null}
          {!employee ? accountMenu : null}
          </div>
        </header>

        <main className="page-frame" id="main-content" tabIndex={-1} data-focused-review={focusedReview || undefined}>{sectionTabs ? <SectionTabs group={sectionTabs} pathname={pathname ?? ""} /> : null}<PresentationProvider modules={context.modules} words={context.words}>{user.role==='MANAGER'&&operational.view?.state==='unavailable'&&!operational.refreshing&&<section className="portal-route-state" role="status"><h2>Management menu unavailable</h2><p>Your current management access could not be checked. Reconnect and refresh before opening another management page.</p><button className="button secondary" type="button" disabled={operational.paused} onClick={operational.retry}>Refresh management access</button></section>}{children}</PresentationProvider></main>

        <nav className="mobile-nav" aria-label="Mobile navigation" style={!employee?{gridTemplateColumns:`repeat(${Math.min(navigation.length,5)},minmax(0,1fr))`}:undefined}>
          {/* v5 One look (approved Oct 24): one Quiet tab bar for every role; More is a page. */}
            <>
              {mobileTabs.map((item) => {
                const active = item.href === activeTab;
                // F1: the Inbox tab carries the same "needs you" count as Home and Inbox, read aloud with the tab's name.
                const needsYou = item.href === "/app/inbox" && inboxCount !== null && inboxCount > 0 ? inboxCount : null;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    // Phase 1: the tabs load in full ahead of the tap. The access frame still checks each page when it opens, and its
                    // periodic refresh re-renders only the open page, so these prefetches are not repeated every few seconds.
                    prefetch
                    className={active ? "mobile-nav-link active" : "mobile-nav-link"}
                    aria-current={active ? "page" : undefined}
                    aria-label={needsYou !== null ? `${item.label}, ${needsYou} need${needsYou === 1 ? "s" : ""} you` : undefined}
                  >
                    {/* Quiet (v4): outline glyphs, filled only for the current tab; the count is spoken, not drawn. */}
                    <NavIcon name={item.icon === "employees" ? "team" : item.icon} size={24} weight={!employeeMobile && active ? "fill" : "regular"} />
                    <span>{item.label}</span>
                    <TabPending />
                  </Link>
                );
              })}
              {/* Quiet (v4): More is a page, as in the approved mockups. */}
              <Link href="/app/more" prefetch className={activeTab === "more" || pathname === "/app/more" ? "mobile-nav-link manager-more-trigger active" : "mobile-nav-link manager-more-trigger"}
                aria-current={pathname === "/app/more" ? "page" : undefined}>
                <NavIcon name="moreCircle" size={24} weight={!employeeMobile && (activeTab === "more" || pathname === "/app/more") ? "fill" : "regular"} /><span>More</span>
                <TabPending />
              </Link>
            </>
        </nav>
      </div>
      <SheetGestures />
      <Toaster />
      <FormValidation />
      {notificationsEnabled ? <PortalDeviceSetup role={user.role} /> : null}
    </div>
  );
}
