"use client";

import Link from "next/link";
import { ActionMenu } from "./action-menu";
import { isMobileKeyboardVisible } from "../lib/mobile-keyboard";
import { usePathname } from "next/navigation";
import { BrandLockup } from "./brand-lockup";
import { NavIcon } from "@/components/nav-icon";
import { useEffect, useRef, type ReactNode } from "react";
import { PortalSignout } from "./portal-signout";
import { PortalDeviceSetup } from "./portal-device-setup";
import type { UserRole } from "@/lib/domain";
import { activeNavigationHref, navigationForRole } from "@/lib/navigation";
import { NUVORA_BRAND } from "../lib/brand";

const employeePrimary = ["/app", "/app/schedule", "/app/my-time"];

function employeeNavigationLabel(label: string) {
  if (label === "My schedule") return "My Schedule";
  if (label === "Time off") return "Time Off";
  if (label === "Shift requests") return "Shift Requests";
  return label;
}

export function AppShell({
  children,
  workspaceName,
  user,
  notificationsEnabled = false,
}: {
  workspaceName: string;
  notificationsEnabled?: boolean;
  children: ReactNode;
  user: {
    firstName: string;
    lastName: string;
    role: UserRole;
  };
}) {
  const pathname = usePathname();
  const employeeMoreKeyboardOpen = useRef(false);
  const employee = user.role === "EMPLOYEE" || user.role === "LEAD";
  const navigation = navigationForRole(user.role);
  const mobilePrimary = navigation.filter((item) => employeePrimary.includes(item.href));
  const mobileMore = navigation.filter((item) => !employeePrimary.includes(item.href));
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  const activeHref = activeNavigationHref(user.role, pathname);

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
  return (
    <div className={employee ? "app-shell employee-shell" : "app-shell"}>
      <aside className="sidebar">
        <Link href="/app" className="brand sidebar-brand" aria-label={NUVORA_BRAND.homeAriaLabel}>
          <BrandLockup tone="dark" />
        </Link>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navigation.map((item) => {
            const active = item.href === activeHref;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-link active" : "nav-link"}
                aria-current={active ? "page" : undefined}
              >
                <span className="nav-icon">
                  <NavIcon name={item.icon} employee={employee} size={employee ? 20 : 18} />
                </span>
                <span>{employee ? employeeNavigationLabel(item.label) : item.label}</span>
              </Link>
            );
          })}
        </nav>

        {employee ? <Link href="/app/profile" className="sidebar-profile portal-profile-trigger" aria-label="Your profile">
          <div className="avatar">{initials}</div>
          <div className="sidebar-profile-copy"><strong>{user.firstName} {user.lastName}</strong><small>{user.role === "LEAD" ? "Lead" : "Employee"}</small></div>
        </Link> : <>        <Profile className={`sidebar-profile${notificationsEnabled ? " portal-profile-trigger" : ""}`} {...(notificationsEnabled ? { type: "button" as const, popoverTarget: "portal-device-settings", "aria-label": "Profile and device settings" } : {})}>
          <div className="avatar">{initials}</div>
          <div className="sidebar-profile-copy">
            <strong>{user.firstName} {user.lastName}</strong>
            <small>{user.role[0]}{user.role.slice(1).toLowerCase()}</small>
          </div>
          {employee ? null : <span className="sidebar-profile-chevron" aria-hidden="true">⌄</span>}
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
          <Link href="/app" className="brand compact" aria-label={NUVORA_BRAND.homeAriaLabel}>
            <BrandLockup variant="compact" />
          </Link>
          <div className="mobile-header-actions">
          {notificationsEnabled && !employee ? <button type="button" className="role-chip portal-role-trigger" popoverTarget="portal-device-settings" aria-label="Profile and device settings">{user.role[0]}{user.role.slice(1).toLowerCase()}</button> : <span className="role-chip">{user.role[0]}{user.role.slice(1).toLowerCase()}</span>}
          {!employee ? (
            <ActionMenu id="manager-more-navigation" label="Menu" ariaLabel="More navigation">
              {navigation.slice(5).map(item => (
                <Link key={item.href} href={item.href} className="nevora-action-menu-item"
                  aria-current={item.href === activeHref ? 'page' : undefined}
                  onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>
                  {item.label}
                </Link>
              ))}
              <div className="nevora-action-menu-divider" />
              <PortalSignout><button className="nevora-action-menu-item" type="submit">Sign out</button></PortalSignout>
            </ActionMenu>
          ) : null}
          </div>
        </header>

        <div className="page-frame">{children}</div>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {employee ? (
            <>
              {mobilePrimary.map((item) => (
                <Link key={item.href} href={item.href}
                  className={item.href === activeHref ? "mobile-nav-link active" : "mobile-nav-link"}
                  aria-current={item.href === activeHref ? "page" : undefined}>
                  <NavIcon name={item.icon} employee size={22} />
                  <span>{item.href === "/app/schedule" ? "Schedule" : item.label}</span>
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
                className={mobileMore.some((item) => item.href === activeHref) ? "mobile-nav-link employee-more-trigger active" : "mobile-nav-link employee-more-trigger"}>
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
                    aria-current={item.href === activeHref ? "page" : undefined}>
                    <NavIcon name={item.icon} employee size={22} />
                    <span>{employeeNavigationLabel(item.label)}</span>
                  </Link>
                ))}
                <div className="employee-more-profile">
                  <div><strong>{user.firstName} {user.lastName}</strong><small>{user.role === "LEAD" ? "Lead" : "Employee"}</small></div>
                  <PortalSignout><button type="submit"><NavIcon name="logout" employee size={18} /><span>Sign out</span></button></PortalSignout>
                </div>
              </div>
            </>
          ) : (
            <>
              {navigation.slice(0, 5).map((item) => {
                const active = item.href === activeHref;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={active ? "mobile-nav-link active" : "mobile-nav-link"}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label === "Dashboard"
                      ? "Home"
                      : item.label === "Shift requests"
                        ? "Shifts"
                        : item.label === "My schedule"
                          ? "Schedule"
                          : item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>
      </main>
      {notificationsEnabled ? <PortalDeviceSetup role={user.role} /> : null}
    </div>
  );
}
