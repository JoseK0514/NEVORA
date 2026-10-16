"use client";

import Link from "next/link";
import { NotificationBell } from "./notification-bell";
import { ActionMenu } from "./action-menu";
import { isMobileKeyboardVisible } from "../lib/mobile-keyboard";
import { usePathname } from "next/navigation";
import { AuthBrand } from "./auth-brand";
import { XIcon } from "@phosphor-icons/react/ssr";
import { NavIcon } from "@/components/nav-icon";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { PortalSignout } from "./portal-signout";
import { PortalDeviceSetup } from "./portal-device-setup";
import { PortalAccountMenu } from "./portal-account-menu";
import { SheetGestures } from "./sheet-gestures";
import { Toaster } from "./toaster";
import { FormValidation } from "./form-validation";
import type { UserRole } from "@/lib/domain";
import { activeMobileTab, activeNavigationHref, managementNavigationGroups, mobileMoreForRole, mobileTabsForRole, navigationForRole, sectionTabsFor } from "@/lib/navigation";
import { SectionTabs } from "./section-tabs";
import { CommandFinder } from "./command-finder";
import { NUVORA_BRAND } from "../lib/brand";
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
}: {
  workspaceName: string;
  /** Company brand (B1): derived colour tokens and an optional logo. */
  brand?: { style?: Record<string, string>; logoUrl?: string | null };
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
  const navigation = navigationForRole(user.role, payrollCapabilities);
  const mobileTabs = mobileTabsForRole(user.role, payrollCapabilities);
  const mobileMore = mobileMoreForRole(user.role, payrollCapabilities);
  const activeTab = activeMobileTab(user.role, pathname ?? "", payrollCapabilities);
  const sectionTabs = pathname ? sectionTabsFor(user.role, pathname, payrollCapabilities) : null;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  const activeHref = activeNavigationHref(user.role, pathname, payrollCapabilities);

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
      data-mobile-workforce={pathname && pathname !== "/app" ? "true" : undefined}
      data-employee-corporate={user.role === "EMPLOYEE" && (pathname === "/app/my-time" || pathname === "/app/timecards") ? "true" : undefined}>
      <aside className="sidebar" data-collapsed={collapsed}>
        <div className="sidebar-heading">
        <Link href="/app" className="brand sidebar-brand" aria-label={NUVORA_BRAND.homeAriaLabel}>
          <AuthBrand />
        </Link>
        {companyLogo}

        <button className="sidebar-toggle" type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} aria-controls="desktop-primary-navigation" onClick={toggleSidebar}><NavIcon name="sidebar" size={22} /></button>
        </div>
        <nav id="desktop-primary-navigation" className="sidebar-nav" aria-label="Primary navigation">
          {(employee ? [{label:"",items:navigation}] : managementNavigationGroups(navigation)).map(group => <div className="sidebar-nav-group" key={group.label}>
          {group.label ? <h2 className="sidebar-group-label">{group.label}</h2> : null}
          {group.items.map((item) => {
            const active = item.href === activeHref;

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

      <main className="app-main">
        <header className="mobile-header">
          <span className="portal-workspace-name" title={workspaceName}>{workspaceName}</span>
          <Link href="/app" className="brand compact" aria-label={NUVORA_BRAND.homeAriaLabel}>
            <AuthBrand />
          </Link>
          {companyLogo}
          <div className="mobile-header-actions">
          {!employee ? <CommandFinder role={user.role} payroll={payrollCapabilities} /> : null}
          {notificationAuthority ? <NotificationBell authority={notificationAuthority} /> : null}
          <PortalAccountMenu initials={initials} name={`${user.firstName} ${user.lastName}`}>
            {employee ? <Link href="/app/profile" className="nevora-action-menu-item"
              onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>Your profile</Link> : null}
            {notificationsEnabled ? <button type="button" className="nevora-action-menu-item" popoverTarget="portal-device-settings">Profile and device settings</button> : null}
            <div className="nevora-action-menu-divider" />
            <PortalSignout><button className="nevora-action-menu-item portal-account-signout" type="submit">Sign out</button></PortalSignout>
          </PortalAccountMenu>
          </div>
        </header>

        <div className="page-frame">{sectionTabs ? <SectionTabs group={sectionTabs} pathname={pathname ?? ""} /> : null}{children}</div>

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
                <button className="mobile-workforce-sheet-close" type="button" aria-label="Close actions"
                  onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>
                  <XIcon size={20} aria-hidden="true"/><span>Close actions</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {mobileTabs.map((item) => {
                const active = item.href === activeTab;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={active ? "mobile-nav-link active" : "mobile-nav-link"}
                    aria-current={active ? "page" : undefined}
                  >
                    <NavIcon name={item.icon} size={22} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <ActionMenu id="manager-more-navigation" label="More" ariaLabel="More navigation"
                triggerClassName={activeTab === "more" ? "mobile-nav-link manager-more-trigger active" : "mobile-nav-link manager-more-trigger"}
                triggerContent={<><NavIcon name="more" size={22} /><span>More</span></>}>
                {mobileMore.map(item => (
                  <Link key={item.href} href={item.href} className="nevora-action-menu-item"
                    aria-current={item.href === activeHref ? 'page' : undefined}
                    onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>
                    {item.label}
                  </Link>
                ))}
                {notificationsEnabled ? <button type="button" className="nevora-action-menu-item" popoverTarget="portal-device-settings" aria-label="Profile and device settings">Profile and device settings</button> : null}
                <div className="nevora-action-menu-divider" />
                <PortalSignout><button className="nevora-action-menu-item" type="submit">Sign out</button></PortalSignout>
              </ActionMenu>
            </>
          )}
        </nav>
      </main>
      <SheetGestures />
      <Toaster />
      <FormValidation />
      {notificationsEnabled ? <PortalDeviceSetup role={user.role} /> : null}
    </div>
  );
}
