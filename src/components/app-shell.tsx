"use client";

import {useEmployeeNavigationLayout} from './employee-mobile/navigation-layout';
import {useEmployeeMobile} from './employee-mobile/use-mobile';
import {NavigationLink as Link} from './navigation-link';
import {useLinkStatus} from 'next/link';
import {EmployeeMessageProvider,EmployeeMessageReturn} from './employee-mobile/message-session';
import {AppNavigationProvider,useIdentityReload} from './app-navigation';
import { NotificationBell } from "./notification-bell";
import { useInboxCount } from "./use-inbox-count";
import { isMobileKeyboardVisible } from "../lib/mobile-keyboard";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { AuthBrand } from "./auth-brand";
import { PlusIcon } from "@phosphor-icons/react/ssr";
import { NavIcon, type NavIconName } from "@/components/nav-icon";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { PortalSignout } from "./portal-signout";
import { PortalDeviceSetup,NativePortalDeviceSetup } from "./portal-device-setup";
import {EmployeeDeviceProvider,EmployeeDevicePopover} from './employee-mobile/device-owner';
import { PortalAccountMenu } from "./portal-account-menu";
import { SheetGestures } from "./sheet-gestures";
import { Toaster } from "./toaster";
import { FormValidation } from "./form-validation";
import type { UserRole } from "@/lib/domain";
import { employeeNavigationGroups, teamToolHolder, teamToolsForRole, activeMobileTab, activeNavigationHref, managementNavigationGroups, mobileTabsForRole, navigationForRole, sectionTabsFor, sidebarActiveHref, sidebarNavigation, type NavContext } from "@/lib/navigation";
import { SectionTabs } from "./section-tabs";
import { isPopoverOpen, hidePopover } from "./kit/popover-open";
import { CommandFinder } from "./command-finder";
import { PresentationProvider } from "./presentation-context";
import { NUVORA_BRAND } from "../lib/brand";
import { handleRowNavigation } from "../lib/row-navigation";
import type { PayrollCapabilities } from '@/lib/payroll/contracts';
import type {OperationalAuthorityView} from '@/lib/company-access/model';
import {useOperationalNavigation} from './company-access/use-operational-navigation';
import {employeeMobileChrome} from '@/lib/employee-mobile-chrome';
import {rootChromeClaimed,subscribeRootChrome} from '@/lib/root-chrome';
import { recordNavigation } from "./corp/corp-client";
import { CorpMotion } from "./corp/corp-motion";
import { SidebarRailTooltip } from "./sidebar-rail-tooltip";

/** Home's views share Home's address; the trail names them as their bands do. */
const HOME_VIEWS = { attendance: "Who’s working", team: "Hours this week", activity: "Activity" } as const;

/** Upscale M2: tablets (768–1279px) open with the sidebar as a rail; the person's own choice there is kept apart from
 * their desktop choice, in a second cookie beside the one the server reads. */
const TABLET_SIDEBAR_QUERY = "(min-width: 768px) and (max-width: 1279px)";
const ROLE_LABELS: Record<UserRole, string> = { OWNER: "Owner", MANAGER: "Manager", LEAD: "Lead", EMPLOYEE: "Employee" };
function readCookie(name: string) {
  for (const part of document.cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return undefined;
}
function subscribeTablet(changed: () => void) {
  const media = window.matchMedia(TABLET_SIDEBAR_QUERY);
  media.addEventListener("change", changed);
  return () => media.removeEventListener("change", changed);
}
const noSubscription = () => () => {};
function writeSidebarCookie(name: string, rail: boolean) {
  if (/^[a-z0-9_]+$/i.test(name)) document.cookie = `${name}=${rail ? "collapsed" : "expanded"}; Path=/app; Max-Age=31536000; SameSite=Lax`;
}

type AppShellProps = {
  brand?: { style?: Record<string, string>; logoUrl?: string | null };
  presentation?: NavContext;
  workspaceName: string;
  initialCollapsed?: boolean;
  preferenceCookie?: string;
  notificationAuthority?: string;
  messagesAuthority?: string;
  communicationAuthority?: string;
  notificationsEnabled?: boolean;
  nativeApp?: boolean;
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


/** The corporate tab bar's glyphs (boards C-Owner, C-Employee); the sidebar keeps its own. */
function tabIcon(icon: NavIconName): NavIconName {
  return icon === "payroll" || icon === "receipt" ? "tabPay" : icon === "requests" ? "tabRequests" : icon;
}

/** Phase 1: the tapped tab lights up at once, before its page arrives (the Quiet shell styles the mark). */
function TabPending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="mobile-nav-pending" aria-hidden="true" /> : null;
}

/** Owner premium P7: a sidebar link that is on its way marks itself, so the shell's thin progress bar can show. */
function NavPending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="c-nav-pending" aria-hidden="true" /> : null;
}

/** Owner premium P11: whether the device is online (the page stays; a banner says what is shown). */
function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  return online;
}

/**
 * Client shell for server-projected identity/capabilities. Remount navigation
 * coordination when identity or role changes so pending attempts cannot leak
 * across accounts. Navigation visibility is presentation; each destination and
 * mutation still enforces current server/database authorization.
 */
export function AppShell(props:AppShellProps){
 const employee=['EMPLOYEE','LEAD'].includes(props.user.role);
 const content=employee?<EmployeeDeviceProvider key={props.notificationAuthority} authority={props.notificationAuthority} enabled={!props.nativeApp&&(props.notificationsEnabled??false)}><AppShellView {...props}/></EmployeeDeviceProvider>:<AppShellView {...props}/>;
 return <AppNavigationProvider key={JSON.stringify([props.user.id,props.user.role])}>{props.messagesAuthority&&props.communicationAuthority&&employee?<EmployeeMessageProvider key={props.messagesAuthority} authority={props.messagesAuthority} core={props.communicationAuthority}>{content}</EmployeeMessageProvider>:content}</AppNavigationProvider>;
}

function AppShellView({
  children,
  workspaceName,
  user,
  notificationsEnabled = false,
  nativeApp = false,
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
  // Upscale M1/M2: the sidebar is a 72px rail or the full 232px list. Desktop (1280px and up) follows the cookie the server
  // reads; tablets (768–1279px) open as a rail until the person chooses otherwise there. The server cannot know the width,
  // so it renders both choices (data-sidebar-desktop, data-sidebar-tablet) and the CSS picks by width, with no jump on load.
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const tabletCookie = `${preferenceCookie}_tablet`;
  // The stored tablet choice is read in the browser only (the server renders the default, the rail).
  const storedTablet = useSyncExternalStore(noSubscription, () => readCookie(tabletCookie), () => undefined);
  const [tabletChoice, setTabletChoice] = useState<boolean | null>(null);
  const tabletRail = tabletChoice ?? storedTablet !== "expanded";
  const tabletWidth = useSyncExternalStore(subscribeTablet, () => window.matchMedia(TABLET_SIDEBAR_QUERY).matches, () => false);
  const [sidebarMotion, setSidebarMotion] = useState<"collapse" | "expand" | null>(null);
  const motionTimer = useRef(0);
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => () => window.clearTimeout(motionTimer.current), []);
  const railed = tabletWidth ? tabletRail : collapsed;
  function toggleSidebar() {
    const next = !railed;
    if (tabletWidth) { setTabletChoice(next); writeSidebarCookie(tabletCookie, next); }
    else { setCollapsed(next); writeSidebarCookie(preferenceCookie, next); }
    // The width eases only when the person toggles it (never on load or when the window crosses a breakpoint).
    setSidebarMotion(next ? "collapse" : "expand");
    window.clearTimeout(motionTimer.current);
    motionTimer.current = window.setTimeout(() => setSidebarMotion(null), 400);
  }
  const employee = user.role === "EMPLOYEE" || user.role === "LEAD";
  const employeeMobile = useEmployeeMobile() && employee;
  // QA D16: a page with no tab address (the signed-in 404) can ask for a tab page's phone header.
  const rootChrome = useSyncExternalStore(subscribeRootChrome, rootChromeClaimed, () => false);
  useEmployeeNavigationLayout(employee);
  // Refresh the retained layout's server identity without interrupting the destination document's streamed content.
  const identityReload=useIdentityReload(()=>router.refresh());
  const accessChanged=useCallback((reason:'identity'|'scope')=>{if(reason==='identity')identityReload.request();else {window.dispatchEvent(new Event('nevora:notifications-changed'));router.refresh();}},[router,identityReload]);
  const operational=useOperationalNavigation(user.id,user.role,operationalAuthority,accessChanged);
  const inboxCount = useInboxCount(!employee && (user.role === 'OWNER' || operational.view?.state === 'ready' && operational.view.scope?.mode === 'COMPANY'), pathname);
  const context:NavContext = {...presentation, operational:operational.view??undefined};
  const navigation = navigationForRole(user.role, payrollCapabilities, context);
  const mobileTabs = mobileTabsForRole(user.role, payrollCapabilities, context);
  // Release 1: a few pages are views of another page (Schedule activity, Open shifts), so the query takes part.
  const location = `${pathname ?? ""}${search?.toString() ? `?${search.toString()}` : ""}`;
  const activeTab = activeMobileTab(user.role, location, payrollCapabilities, context);
  // P3-ST-22: a single request's review is one task with no section tabs. Deciding it from the URL means the tabs are
  // absent from the first frame, placeholder included, instead of disappearing once the review renders.
  const focusedReview = pathname === "/app/requests" && !!search?.get("requestId");
  const sectionTabs = pathname && !focusedReview ? sectionTabsFor(user.role, pathname, payrollCapabilities, context) : null;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  const activeHref = activeNavigationHref(user.role, location, payrollCapabilities, context);
  const sidebarItems = sidebarNavigation(user.role, navigation);
  // Clean Manager (v3): Home's occasional tools (its views and the two recovery pages) have their own group.
  const teamTools = teamToolsForRole(user.role, context);
  const toolView = pathname === "/app" ? search?.get("view") : null;
  const activeTool = teamTools.find(tool => tool.href === pathname || (toolView && tool.href === `/app?view=${toolView}`));
  // Release 1 ("don't overwhelm"): the team tools have no sidebar group; the entry that holds each one lights instead.
  const toolHolder = activeTool ? teamToolHolder(activeTool.href) : undefined;
  const sidebarActive = toolHolder ?? sidebarActiveHref(user.role, pathname, sidebarItems, payrollCapabilities, context);
  const navGroups = employee ? user.role === "EMPLOYEE" ? employeeNavigationGroups(sidebarItems) : [{ label: "", items: sidebarItems }] : managementNavigationGroups(sidebarItems);
  // Top-bar location (D1): section, then page. The page links back when you are deeper in it.
  const activeGroup = navGroups.find(group => group.items.some(item => item.href === sidebarActive));
  // A page reached from the account menu (Profile, My pay) has no sidebar entry; the trail still names it.
  const activeItem = activeGroup?.items.find(item => item.href === sidebarActive) ?? navigation.find(item => item.href === activeHref);
  // A team tool is its own page in the trail ("Team tools › Attendance"), never "Attendance › Attendance".
  const deeper = !!activeItem && (!!toolHolder || !activeTool && pathname !== activeItem.href);
  // A page whose own entry left the sidebar (Time off under Inbox, Time exports under Timecards) still ends the trail with its own name,
  // and so do Home's views (IS-P4-09), which share Home's address.
  const searchParams = useSearchParams();
  const view = searchParams?.get("view");
  const homeView = !employee && pathname === "/app" && view && view in HOME_VIEWS ? { href: `/app?view=${view}`, label: HOME_VIEWS[view as keyof typeof HOME_VIEWS] } : undefined;
  // WR4-07: a section tab with no navigation entry of its own (Payroll settings) also ends the trail with its name.
  const currentTab = sectionTabs?.items.find(item => item.href === pathname);
  const pageItem = activeTool ? (toolHolder ? activeTool : undefined) : homeView ?? (activeItem && activeHref && activeHref !== activeItem.href ? navigation.find(item => item.href === activeHref) : undefined)
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

  // Owner premium P6: remember where the person came from, so a kit back link to that page can go back in history.
  useEffect(() => { recordNavigation(location); }, [location]);

  // Owner premium P8: headers show their hairline only once the page has scrolled.
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".app-shell[data-nv-corp]");
    if (!shell) return;
    let frame = 0;
    const update = () => { frame = 0; shell.toggleAttribute("data-scrolled", window.scrollY > 0); };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { if (frame) cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); };
  }, [pathname]);
  const online = useOnline();

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
  // Round 2 (R13): one profile entry. "Profile and device settings" retired from this menu; this device's alerts stay one
  // step away: an Owner or Manager's profile page has the "Alerts on this phone" row (it opens the same device settings),
  // and so does the sidebar's name button; an Employee gets the alerts page by its own name. With no profile page, the
  // menu keeps a "Device settings" entry so nothing is lost.
  const profilePage = employee || navigation.some(item => item.href === "/app/profile");
  const accountMenu = (
    <PortalAccountMenu initials={initials} name={`${user.firstName} ${user.lastName}`} detail={`${ROLE_LABELS[user.role] ?? ""} · ${workspaceName}`}>
      {profilePage ? <Link href="/app/profile" className="nevora-action-menu-item"
        onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>Your profile</Link> : null}
      {/* Desktop Employee: the calendar link page has no other way in at this width (phones reach it from More). */}
      {employee ? <Link href="/app/profile/calendar" className="nevora-action-menu-item"
        onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>Add shifts to your calendar</Link> : null}
      {!employee && navigation.some(item => item.href === "/app/my-pay") ? <Link href="/app/my-pay" className="nevora-action-menu-item"
        onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>My pay</Link> : null}
      {notificationsEnabled && employee ? <Link href="/app/profile/device-alerts" className="nevora-action-menu-item"
        onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>Alerts on this device</Link> : null}
      {notificationsEnabled && !profilePage ? <button type="button" className="nevora-action-menu-item" popoverTarget="portal-device-settings">Device settings</button> : null}
      <div className="nevora-action-menu-divider" />
      <PortalSignout><button className="nevora-action-menu-item portal-account-signout" type="submit">Sign out</button></PortalSignout>
    </PortalAccountMenu>
  );
  return (
    <div className={employee ? "app-shell employee-shell nevora-portal" : "app-shell nevora-portal"} data-sidebar-collapsed={railed}
      data-sidebar-desktop={collapsed ? "rail" : "full"} data-sidebar-tablet={tabletRail ? "rail" : "full"} data-sidebar-motion={sidebarMotion ?? undefined}
      // Clean Manager and Owner app (v3): premium-clean-manager.css applies only under this attribute, so Employee and Lead pages never change.
      id={employee ? "employee-mobile" : undefined}
      data-employee-mobile={employee ? "true" : undefined}
      data-employee-mobile-active={employeeMobile ? "true" : undefined}
      data-employee-mobile-chrome={rootChrome && user.role === "EMPLOYEE" ? "root" : employeeMobileChrome(user.role,pathname,mobileTabs,search)}
      data-employee-mobile-page={employee ? pathname === "/app" ? "home" : pathname === "/app/schedule" ? "schedule" : pathname === "/app/my-time" || pathname === "/app/timecards" ? "hours" : pathname === "/app/my-pay" ? "pay" : (pathname === "/app/requests/hub" || pathname === "/app/requests" || pathname === "/app/availability") || (pathname === "/app/exchange" || pathname.startsWith("/app/exchange/")) ? "requests" : "other" : undefined}
      data-nv-clean={employee ? undefined : ""}
      // Quiet (v4, Jose approved Oct 23, docs/product/specs/owner-v4-quiet): the Owner and Manager pages and their tab bar.
      data-nv-quiet=""
      // Employee app, new style (Jose approved Oct 20, docs/product/specs/employee-style): employee-style.css applies only under this attribute.
      data-nv-e5={user.role === "LEAD" ? "" : undefined}
      style={brand?.style as CSSProperties | undefined} data-company-brand={brand?.style ? "custom" : undefined}
      // One phone shell on every tab, Home included, for every role (Phase 7 WR-03; employees since Phase 3, P3-ST-01).
      data-mobile-workforce={pathname ? "true" : undefined}
      data-employee-corporate={employee && (pathname === "/app/my-time" || pathname === "/app/timecards") ? "true" : undefined}
      // Corporate (Release 1, approved Oct 26): Owner and Manager. A tab's own page shows the white header (logo, bell, avatar).
      // Employees joined in Phase 6; a Lead keeps the v5 look while that role is on hold.
      // Owner premium (A7): a page that is itself a sidebar entry needs no "‹ Back" line on tablets and desktop.
      data-nav-root={!employee && !toolView && sidebarItems.some(item => item.href === pathname) ? "" : undefined}
      data-nv-corp={user.role === "LEAD" ? undefined : ""} data-corp-root={user.role !== "LEAD" && (rootChrome || mobileTabs.some(tab => tab.href === pathname)) && !(pathname === "/app" && search?.get("view")) && !(pathname === "/app/schedule" && search?.get("view") === "open") ? "" : undefined}>
      {/* IS-P4-14: on desktop, the sidebar and header come first; this skips them. Shown only on focus, and only on desktop. */}
      <a className="portal-skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar" data-collapsed={railed} ref={sidebarRef}>
        <div className="sidebar-heading">
        <Link href="/app" className="brand sidebar-brand" aria-label={NUVORA_BRAND.homeAriaLabel}>
          <AuthBrand />
        </Link>
        {companyLogo}
        {/* v3: the workspace at the top of the sidebar (desktop only). Upscale B2: one desktop shell, so Employees have it too;
          in the rail it is the 32px initials avatar. */}
        {user.role !== "LEAD" ? <p className="cm-org"><span className="cm-org__mark" aria-hidden="true">{workspaceName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase()}</span><span className="cm-org__name">{workspaceName}</span></p> : null}

        <button className="sidebar-toggle" type="button" aria-label={railed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!railed} aria-controls="desktop-primary-navigation" onClick={toggleSidebar}><NavIcon name="sidebar" size={20} /></button>
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
              >
                <span className="nav-icon">
                  <NavIcon name={item.icon} employee={employee} size={employee ? 20 : 18} />
                </span>
                <span className="nav-label">{item.label}</span>
                <NavPending />
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
          {/* A Lead (v5 look, on hold) keeps its header: the avatar first, then a round "+" for a new request, then the bell. */}
          {user.role === "LEAD" ? accountMenu : null}
          {user.role === "LEAD" ? <Link href="/app/requests" className="e5-new" aria-label="New request"><PlusIcon size={20} aria-hidden="true" /></Link> : null}
          {notificationAuthority ? <NotificationBell key={operationalAuthority?.state==='ready'?operationalAuthority.authority:'unavailable'} authority={notificationAuthority} /> : null}
          {/* Upscale B2: one desktop top bar for every role, Search · bell · avatar. The Employee "+" retired (New request
            lives on Requests). */}
          {user.role !== "LEAD" ? accountMenu : null}
          {/* Corporate phone header: the avatar opens More (profile, settings and the rest). Desktop keeps the account menu. */}
          {user.role !== "LEAD" ? <Link href="/app/more" prefetch className="c-top-avatar" aria-label={`More, ${user.firstName} ${user.lastName}`} aria-current={pathname === "/app/more" ? "page" : undefined}><span aria-hidden="true">{initials}</span></Link> : null}
          </div>
        </header>
        {/* Owner premium P7 and P11: the thin progress bar while a page is on its way, and the offline line over the page. */}
        <div className="c-progress" aria-hidden="true"><i /></div>
        {!online ? <div className="c-offline" role="status">You’re offline. Showing what was loaded.</div> : null}

        <main className="page-frame" id="main-content" tabIndex={-1} data-focused-review={focusedReview || undefined}>{sectionTabs ? <SectionTabs group={sectionTabs} pathname={pathname ?? ""} /> : null}<PresentationProvider modules={context.modules} words={context.words}>{user.role==='MANAGER'&&operational.view?.state==='unavailable'&&!operational.refreshing&&<section className="portal-route-state" role="status"><h2>Management menu unavailable</h2><p>Your current management access could not be checked. Reconnect and refresh before opening another management page.</p><button className="button secondary" type="button" disabled={operational.paused} onClick={operational.retry}>Refresh management access</button></section>}<EmployeeMessageReturn/>{children}</PresentationProvider></main>

        <nav className="mobile-nav" aria-label="Mobile navigation" style={user.role !== "LEAD"?{gridTemplateColumns:`repeat(${mobileTabs.length},minmax(0,1fr))`}:undefined}>
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
                    // Owner premium P8: tapping the tab you are on scrolls its page back to the top, as on iOS.
                    onClick={event => {
                      if (location !== item.href || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                      event.preventDefault();
                      window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
                    }}
                  >
                    {/* Corporate (boards C-Owner, C-Employee): outline glyphs; the current tab is teal and filled (upscale S1: every
                      tab, not Home alone). Team is two people, Pay and Payroll a card, Requests a page. A Lead keeps the v5 tab bar. */}
                    <NavIcon name={user.role === "LEAD" ? (item.icon === "employees" ? "team" : item.icon) : tabIcon(item.icon)} size={24}
                      weight={user.role === "LEAD" ? (!employeeMobile && active ? "fill" : "regular") : active ? "fill" : "regular"} />
                    <span>{item.label}</span>
                    <TabPending />
                  </Link>
                );
              })}
              {/* A Lead: More is a tab-bar page. Every other role opens More from the header avatar. */}
              {user.role === "LEAD" ? <Link href="/app/more" prefetch className={activeTab === "more" || pathname === "/app/more" ? "mobile-nav-link manager-more-trigger active" : "mobile-nav-link manager-more-trigger"}
                aria-current={pathname === "/app/more" ? "page" : undefined}>
                <NavIcon name="moreCircle" size={24} weight={!employeeMobile && (activeTab === "more" || pathname === "/app/more") ? "fill" : "regular"} /><span>More</span>
                <TabPending />
              </Link> : null}
            </>
        </nav>
      </div>
      <SidebarRailTooltip sidebar={sidebarRef} enabled={railed} />
      <SheetGestures />
      {/* Round 2 (R12): tab lines, the sidebar tint and segment thumbs slide to the current item. */}
      <CorpMotion />
      <Toaster />
      <FormValidation />
      {notificationsEnabled ? employee?<EmployeeDevicePopover role={user.role} nativeApp={nativeApp}/>:nativeApp?<NativePortalDeviceSetup role={user.role}/>:<PortalDeviceSetup role={user.role} /> : null}
    </div>
  );
}
