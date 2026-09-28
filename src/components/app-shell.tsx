"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/app" className="brand" aria-label="Fuel Scheduler home">
          <BrandMark />
          <span>
            <strong>Fuel</strong>
            <small>Scheduler</small>
          </span>
        </Link>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navigation.map((item) => {
            const active =
              item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-link active" : "nav-link"}
              >
                {item.label}
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
          <form action={logout}>
            <button className="sidebar-logout" type="submit">Sign out</button>
          </form>
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
            const active =
              item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "mobile-nav-link active" : "mobile-nav-link"}
              >
                {item.label === "Dashboard" ? "Home" : item.label}
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
