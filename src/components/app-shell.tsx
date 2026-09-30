"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { NavIcon } from "@/components/nav-icon";
import type { ReactNode } from "react";
import { logout } from "@/app/login/actions";
import type { UserRole } from "@/lib/domain";
import { navigationForRole } from "@/lib/navigation";

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
  const navigation = navigationForRole(user.role);
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  const activeHref = navigation
    .filter((item) =>
      item.href === "/app"
        ? pathname === "/app"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

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
          <span className="sidebar-profile-chevron" aria-hidden="true">⌄</span>
        </div>

        <form action={logout} className="sidebar-signout-form">
          <button className="sidebar-logout sidebar-logout-row" type="submit">
            <NavIcon name="logout" size={18} />
            <span>Sign out</span>
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
          <span className="role-chip">{user.role[0]}{user.role.slice(1).toLowerCase()}</span>
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
        </nav>
      </main>
    </div>
  );
}
