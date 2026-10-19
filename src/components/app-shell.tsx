"use client";

import Link from "next/link";
import { NotificationBell } from "./notification-bell";
import { useInboxCount } from "./use-inbox-count";
import { ActionMenu } from "./action-menu";
import { isMobileKeyboardVisible } from "../lib/mobile-keyboard";
import { usePathname } from "next/navigation";
import { AuthBrand } from "./auth-brand";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react/ssr";
import { NavIcon } from "@/components/nav-icon";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { PortalSignout } from "./portal-signout";
import { PortalDeviceSetup } from "./portal-device-setup";
import { PortalAccountMenu } from "./portal-account-menu";
import { SheetGestures } from "./sheet-gestures";
import { Toaster } from "./toaster";
import { FormValidation } from "./form-validation";
import type { UserRole } from "@/lib/domain";
import { activeMobileTab, activeNavigationHref, managementNavigationGroups, mobileMoreForRole, moreNavigationGroups, mobileTabsForRole, navigationForRole, sectionTabsFor, sidebarActiveHref, sidebarNavigation, type NavContext } from "@/lib/navigation";
import { SectionTabs } from "./section-tabs";
import { CommandFinder, OPEN_FINDER_EVENT, type OpenFinderDetail } from "./command-finder";
import { PresentationProvider } from "./presentation-context";
import { NUVORA_BRAND } from "../lib/brand";
import { handleRowNavigation } from "../lib/row-navigation";
import type { PayrollCapabilities } from '@/lib/payroll/contracts';

export function AppShell({
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
}: {
  workspaceName: string;
  /** Company brand (B1): derived colour tokens and an optional logo. */
  brand?: { style?: Record<string, string>; logoUrl?: string | null };
  /** Company modules and words (B2). */
  presentation?: NavContext;
  initialCollapsed?: boolean;
  preferenceCookie?: string;
  notificationAuthority?: string;
  notificationsEnabled?: boolean;
  payrollCapabilities?: PayrollCapabilities;
  children: ReactNode;
  user: {
    firstName: string;
    lastName: string;
    role: UserRole;
  };
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  function toggleSidebar() {
    const next = !collapsed; setCollapsed(next);
    if (/^[a-z0-9_]+$/i.test(preferenceCookie)) document.cookie = `${preferenceCookie}=${next ? "collapsed" : "expanded"}; Path=/app; Max-Age=31536000; SameSite=Lax`;
  }
  const employeeMoreKeyboardOpen = useRef(false);
  const employee = user.role === "EMPLOYEE" || user.role === "LEAD";
  const inboxCount = useInboxCount(!employee, pathname);
  const context = presentation ?? {};
  const navigation = navigationForRole(user.role, payrollCapabilities, context);
  const mobileTabs = mobileTabsForRole(user.role, payrollCapabilities, context);
  const mobileMore = mobileMoreForRole(user.role, payrollCapabilities, context);
  const activeTab = activeMobileTab(user.role, pathname ?? "", payrollCapabilities, context);
  const sectionTabs = pathname ? sectionTabsFor(user.role, pathname, payrollCapabilities, context) : null;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  const activeHref = activeNavigationHref(user.role, pathname, payrollCapabilities, context);
  const sidebarItems = sidebarNavigation(user.role, navigation);
  const sidebarActive = sidebarActiveHref(user.role, pathname, sidebarItems, payrollCapabilities, context);
  const navGroups = employee ? [{ label: "", items: sidebarItems }] : managementNavigationGroups(sidebarItems);
  // Top-bar location (D1): section, then page. The page links back when you are deeper in it.
  const activeGroup = navGroups.find(group => group.items.some(item => item.href === sidebarActive));
  // A page reached from the account menu (Profile, My pay) has no sidebar entry; the trail still names it.
  const activeItem = activeGroup?.items.find(item => item.href === sidebarActive) ?? navigation.find(item => item.href === activeHref);
  const deeper = !!activeItem && pathname !== activeItem.href;

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
      for (const id of ["manager-more-navigation", "employee-more-navigation"]) {
        const sheet = document.getElementById(id);
        if (sheet?.matches(":popover-open") && !sheet.contains(target) && !target.closest(`[popovertarget="${id}"]`)) sheet.hidePopover();
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

  // Arrow keys move between rows of dense lists that opt in (D6).
  useEffect(() => {
    document.addEventListener("keydown", handleRowNavigation);
    return () => document.removeEventListener("keydown", handleRowNavigation);
  }, []);

  useEffect(() => {
    for (const id of ['employee-more-navigation', 'manager-more-navigation']) {
      const menu = document.getElementById(id);
      if (menu?.matches(':popover-open')) menu.hidePopover();
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
  return (
    <div className={employee ? "app-shell employee-shell nevora-portal" : "app-shell nevora-portal"} data-sidebar-collapsed={collapsed}
      style={brand?.style as CSSProperties | undefined} data-company-brand={brand?.style ? "custom" : undefined}
      // One phone shell on every tab, Home included, for every role (Phase 7 WR-03; employees since Phase 3, P3-ST-01).
      data-mobile-workforce={pathname ? "true" : undefined}
      data-employee-corporate={employee && (pathname === "/app/my-time" || pathname === "/app/timecards") ? "true" : undefined}>
      <aside className="sidebar" data-collapsed={collapsed}>
        <div className="sidebar-heading">
        <Link href="/app" className="brand sidebar-brand" aria-label={NUVORA_BRAND.homeAriaLabel}>
          <AuthBrand />
        </Link>
        {companyLogo}

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
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                title={collapsed ? item.label : undefined}
              >
                <span className="nav-icon">
                  <NavIcon name={item.icon} employee={employee} size={employee ? 20 : 18} />
                </span>
                <span className="nav-label">{item.label}</span>
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
          {activeItem ? <nav className="portal-location-nav" aria-label="You are here">
            <ol className="portal-location">
              <li className="portal-location-workspace" title={workspaceName}>{workspaceName}</li>
              {activeGroup?.label ? <li>{activeGroup.label}</li> : null}
              <li>{deeper ? <Link href={activeItem.href}>{activeItem.label}</Link> : <span aria-current="page">{activeItem.label}</span>}</li>
            </ol>
          </nav> : null}
          <Link href="/app" className="brand compact" aria-label={NUVORA_BRAND.homeAriaLabel}>
            <AuthBrand />
          </Link>
          {companyLogo}
          <div className="mobile-header-actions">
          {!employee ? <CommandFinder role={user.role} payroll={payrollCapabilities} context={context} /> : null}
          {notificationAuthority ? <NotificationBell authority={notificationAuthority} /> : null}
          <PortalAccountMenu initials={initials} name={`${user.firstName} ${user.lastName}`}>
            {employee ? <Link href="/app/profile" className="nevora-action-menu-item"
              onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>Your profile</Link> : null}
            {!employee && navigation.some(item => item.href === "/app/my-pay") ? <Link href="/app/my-pay" className="nevora-action-menu-item"
              onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>Your pay statements</Link> : null}
            {notificationsEnabled ? <button type="button" className="nevora-action-menu-item" popoverTarget="portal-device-settings">Profile and device settings</button> : null}
            <div className="nevora-action-menu-divider" />
            <PortalSignout><button className="nevora-action-menu-item portal-account-signout" type="submit">Sign out</button></PortalSignout>
          </PortalAccountMenu>
          </div>
        </header>

        <main className="page-frame" id="main-content" tabIndex={-1}>{sectionTabs ? <SectionTabs group={sectionTabs} pathname={pathname ?? ""} /> : null}<PresentationProvider modules={context.modules} words={context.words}>{children}</PresentationProvider></main>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {employee ? (
            <>
              {mobileTabs.map((item) => (
                <Link key={item.href} href={item.href}
                  className={item.href === activeTab ? "mobile-nav-link active" : "mobile-nav-link"}
                  aria-current={item.href === activeTab ? "page" : undefined}>
                  <NavIcon name={item.icon} employee size={22} />
                  <span>{item.label}</span>
                </Link>
              ))}
              <button
                type="button"
                popoverTarget="employee-more-navigation"
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    employeeMoreKeyboardOpen.current = true;
                  }
                }}
                onPointerDown={() => {
                  employeeMoreKeyboardOpen.current = false;
                }}
                aria-label="More"
                className={activeTab === "more" ? "mobile-nav-link employee-more-trigger active" : "mobile-nav-link employee-more-trigger"}>
                <NavIcon name="more" employee size={22} />
                <span>More</span>
              </button>
              <div
                id="employee-more-navigation"
                className="employee-more-navigation"
                popover="auto"
                onToggle={(event) => {
                  const surface = event.currentTarget;
                  if (event.newState !== "open") {
                    employeeMoreKeyboardOpen.current = false;
                    return;
                  }
                  if (!employeeMoreKeyboardOpen.current) return;
                  const first = surface.querySelector<HTMLElement>(
                    ".employee-more-link,button:not([disabled])",
                  );
                  first?.focus({ preventScroll: true });
                  employeeMoreKeyboardOpen.current = false;
                }}
              >
                <p className="employee-more-label">More</p>
                {mobileMore.map((item) => (
                  <Link key={item.href} href={item.href}
                    className={item.href === activeHref ? "employee-more-link active" : "employee-more-link"}
                    onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}
                    aria-current={item.href === activeHref ? "page" : undefined}>
                    <NavIcon name={item.icon} employee size={22} />
                    <span>{item.label}</span>
                  </Link>
                ))}
                <div className="employee-more-profile">
                  <div><strong>{user.firstName} {user.lastName}</strong></div>
                  <PortalSignout><button type="submit"><NavIcon name="logout" employee size={18} /><span>Sign out</span></button></PortalSignout>
                </div>
                <button className="mobile-workforce-sheet-close" type="button" aria-label="Close"
                  onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>
                  <XIcon size={20} aria-hidden="true"/><span>Close</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {mobileTabs.map((item) => {
                const active = item.href === activeTab;
                // F1: the Inbox tab carries the same "needs you" count as Home and Inbox, read aloud with the tab's name.
                const needsYou = item.href === "/app/inbox" && inboxCount !== null && inboxCount > 0 ? inboxCount : null;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={active ? "mobile-nav-link active" : "mobile-nav-link"}
                    aria-current={active ? "page" : undefined}
                    aria-label={needsYou !== null ? `${item.label}, ${needsYou} need${needsYou === 1 ? "s" : ""} you` : undefined}
                  >
                    <NavIcon name={item.icon} size={22} />
                    <span>{item.label}</span>
                    {needsYou !== null ? <span className="mobile-nav-count" aria-hidden="true">{needsYou > 99 ? "99+" : needsYou}</span> : null}
                  </Link>
                );
              })}
              <ActionMenu id="manager-more-navigation" label="More" ariaLabel="More navigation"
                triggerClassName={activeTab === "more" ? "mobile-nav-link manager-more-trigger active" : "mobile-nav-link manager-more-trigger"}
                triggerContent={<><NavIcon name="more" size={22} /><span>More</span></>}>
                {/* A tool, not a destination: opens the one finder dialog in the same tap (no timer), so iOS raises the keyboard. */}
                <button type="button" className="nevora-action-menu-item nevora-more-search" aria-haspopup="dialog"
                  onClick={event => {
                    event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover();
                    const detail: OpenFinderDetail = { returnFocusTo: document.querySelector<HTMLElement>('[popovertarget="manager-more-navigation"]') };
                    window.dispatchEvent(new CustomEvent(OPEN_FINDER_EVENT, { detail }));
                  }}>
                  <MagnifyingGlassIcon size={22} aria-hidden="true" /><span>Search</span>
                </button>
                <div className="nevora-action-menu-divider nevora-more-search-divider" />
                {/* MG3: grouped by job. Headings are labels only; every link is unchanged. */}
                {moreNavigationGroups(mobileMore).map(group => <div key={group.label} className="nevora-more-group" role="group" aria-label={group.label}>
                  <p className="nevora-more-group-label" aria-hidden="true">{group.label}</p>
                  {group.items.map(item => (
                    <Link key={item.href} href={item.href} className="nevora-action-menu-item"
                      aria-current={item.href === activeHref ? 'page' : undefined}
                      onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>
                      {item.label}
                    </Link>
                  ))}
                </div>)}
                {notificationsEnabled ? <button type="button" className="nevora-action-menu-item" popoverTarget="portal-device-settings" aria-label="Profile and device settings">Profile and device settings</button> : null}
                <div className="nevora-action-menu-divider" />
                <PortalSignout><button className="nevora-action-menu-item" type="submit">Sign out</button></PortalSignout>
              </ActionMenu>
            </>
          )}
        </nav>
      </div>
      <SheetGestures />
      <Toaster />
      <FormValidation />
      {notificationsEnabled ? <PortalDeviceSetup role={user.role} /> : null}
    </div>
  );
}
