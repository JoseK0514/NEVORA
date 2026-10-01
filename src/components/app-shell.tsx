"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { NavIcon } from "@/components/nav-icon";
import type { ReactNode } from "react";
import { logout } from "@/app/login/actions";
import type { UserRole } from "@/lib/domain";
import { navigationForRole } from "@/lib/navigation";

const employeeOrder = [
  "/app", "/app/schedule", "/app/my-time",
  "/app/availability", "/app/requests", "/app/exchange",
];

function employeeNavigationLabel(label: string) {
  if (label === "My schedule") return "My Schedule";
  if (label === "Time off") return "Time Off";
  if (label === "Shift requests") return "Shift Requests";
  return label;
}

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
  const employee = user.role === "EMPLOYEE" || user.role === "LEAD";
  const navigation = navigationForRole(user.role);
  if (employee) {
    navigation.sort((a, b) => employeeOrder.indexOf(a.href) - employeeOrder.indexOf(b.href));
  }
  const mobilePrimary = navigation.filter((item) => employeeOrder.slice(0, 3).includes(item.href));
  const mobileMore = navigation.filter((item) => !employeeOrder.slice(0, 3).includes(item.href));
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  const activeHref = navigation
    .filter((item) =>
      item.href === "/app"
        ? pathname === "/app"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className={employee ? "app-shell employee-shell" : "app-shell"}>
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
                aria-current={employee && active ? "page" : undefined}
              >
                <span className="nav-icon">
                  <NavIcon name={item.icon} employee={employee} size={employee ? 20 : 18} />
                </span>
                <span>{employee ? employeeNavigationLabel(item.label) : item.label}</span>
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
          {employee ? null : <span className="sidebar-profile-chevron" aria-hidden="true">⌄</span>}
        </div>

        <form action={logout} className="sidebar-signout-form">
          <button className="sidebar-logout sidebar-logout-row" type="submit">
            <NavIcon name="logout" size={18} employee={employee} />
            <span>Sign out</span>
          </button>
        </form>

        {employee ? null : <div className="sidebar-mantra" aria-hidden="true">
          <span>People</span>
          <span>Fuel</span>
          <span>Possibility.</span>
        </div>}
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
              <button type="button" popoverTarget="employee-more-navigation"
                className={mobileMore.some((item) => item.href === activeHref) ? "mobile-nav-link employee-more-trigger active" : "mobile-nav-link employee-more-trigger"}>
                <NavIcon name="more" employee size={22} />
                <span>More</span>
              </button>
              <div id="employee-more-navigation" className="employee-more-navigation" popover="auto">
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
                  <form action={logout}><button type="submit"><NavIcon name="logout" employee size={18} /><span>Sign out</span></button></form>
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
    </div>
  );
}
