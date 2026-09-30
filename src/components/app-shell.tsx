"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { NavIcon } from "@/components/nav-icon";
import { useEffect, useRef, type ReactNode } from "react";
import { logout } from "@/app/login/actions";
import type { UserRole } from "@/lib/domain";
import { navigationForRole } from "@/lib/navigation";
import { isMobileKeyboardVisible } from "@/lib/mobile-keyboard";

export function AppShell({
  children,
  user,
}: {
  children: ReactNode;
  user: {
    firstName: string;
    lastName: string;
    role: UserRole;
  };
}) {
  const pathname = usePathname();
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const navigation = navigationForRole(user.role);
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  const activeHref = navigation
    .filter((item) =>
      item.href === "/app"
        ? pathname === "/app"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  useEffect(() => {
    mobileMenuRef.current?.removeAttribute("open");
  }, [pathname]);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (!mobileMenuRef.current?.contains(event.target as Node)) {
        mobileMenuRef.current?.removeAttribute("open");
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && mobileMenuRef.current?.open) {
        mobileMenuRef.current.removeAttribute("open");
        mobileMenuRef.current.querySelector("summary")?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    function updateKeyboardState() {
      if (!viewport) return;
      const focused = document.activeElement;
      const hasFocusedField = focused instanceof HTMLElement &&
        focused.matches("input:not([type='checkbox']):not([type='radio']), select, textarea, [contenteditable='true']");
      const mobileNav = document.querySelector(".mobile-nav");
      const hasMobileNavigation = !!mobileNav && getComputedStyle(mobileNav).display !== "none";

      document.documentElement.classList.toggle("mobile-keyboard-open", isMobileKeyboardVisible({
        hasFocusedField,
        hasMobileNavigation,
        layoutHeight: document.documentElement.clientHeight,
        visualHeight: viewport.height,
      }));
    }

    function updateAfterFocus() {
      window.requestAnimationFrame(updateKeyboardState);
    }

    viewport.addEventListener("resize", updateKeyboardState);
    window.addEventListener("resize", updateKeyboardState);
    document.addEventListener("focusin", updateAfterFocus);
    document.addEventListener("focusout", updateAfterFocus);
    updateKeyboardState();

    return () => {
      viewport.removeEventListener("resize", updateKeyboardState);
      window.removeEventListener("resize", updateKeyboardState);
      document.removeEventListener("focusin", updateAfterFocus);
      document.removeEventListener("focusout", updateAfterFocus);
      document.documentElement.classList.remove("mobile-keyboard-open");
    };
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/app" className="brand sidebar-brand" aria-label="Fuel Scheduler home">
          <BrandMark />
          <span className="sidebar-brand-copy">
            <strong>Fuel.</strong>
            <small>Coffee Drive</small>
          </span>
        </Link>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navigation.map((item) => {
            const active = item.href === activeHref;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-link active" : "nav-link"}
              >
                <span className="nav-icon">
                  <NavIcon name={item.icon} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-profile">
          <div className="avatar">{initials}</div>
          <div className="sidebar-profile-copy">
            <strong>{user.firstName} {user.lastName}</strong>
            <small>{user.role[0]}{user.role.slice(1).toLowerCase()}</small>
          </div>
        </div>

        <form action={logout} className="sidebar-signout-form">
          <button className="sidebar-logout sidebar-logout-row" type="submit">
            <NavIcon name="logout" size={18} />
            <span>Sign Out</span>
          </button>
        </form>

        <div className="sidebar-mantra" aria-hidden="true">
          <span>People</span>
          <span>Fuel</span>
          <span>Possibility.</span>
        </div>
      </aside>

      <main className="app-main">
        <header className="mobile-header">
          <Link href="/app" className="brand compact">
            <BrandMark />
            <strong>Fuel Scheduler</strong>
          </Link>
          <div className="mobile-header-actions">
            <span className="role-chip">{user.role[0]}{user.role.slice(1).toLowerCase()}</span>
            {navigation.length > 5 ? (
              <details className="mobile-more" ref={mobileMenuRef}>
                <summary>Menu</summary>
                <nav aria-label="More navigation">
                  {navigation.slice(5).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={item.href === activeHref ? "page" : undefined}
                      onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}
                    >
                      <NavIcon name={item.icon} size={18} />
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </details>
            ) : null}
          </div>
        </header>

        <div className="page-frame">{children}</div>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navigation.slice(0, 5).map((item) => {
            const active = item.href === activeHref;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "mobile-nav-link active" : "mobile-nav-link"}
              >
                {item.href === "/app"
                  ? "Home"
                  : item.href === "/app/exchange"
                    ? "Shifts"
                    : item.href === "/app/schedule"
                      ? "Schedule"
                      : item.label}
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
