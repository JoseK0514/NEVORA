"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { managerNavigation } from "@/lib/navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/app" className="brand" aria-label="Fuel Scheduler home">
          <span className="brand-mark">F</span>
          <span>
            <strong>Fuel</strong>
            <small>Scheduler</small>
          </span>
        </Link>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {managerNavigation.map((item) => {
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
          <div className="avatar">JM</div>
          <div>
            <strong>Jose</strong>
            <small>Owner</small>
          </div>
        </div>
      </aside>

      <main className="app-main">
        <header className="mobile-header">
          <Link href="/app" className="brand compact">
            <span className="brand-mark">F</span>
            <strong>Fuel Scheduler</strong>
          </Link>
          <span className="role-chip">Owner</span>
        </header>

        <div className="page-frame">{children}</div>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {managerNavigation.slice(0, 5).map((item) => {
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
