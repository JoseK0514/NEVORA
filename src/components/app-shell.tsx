"use client";

import {useEmployeeNavigationLayout} from './employee-mobile/navigation-layout';
import {useEmployeeMobile} from './employee-mobile/use-mobile';
import {NavigationLink as Link} from './navigation-link';
import {useLinkStatus} from 'next/link';
import {EmployeeMessageProvider,EmployeeMessageReturn} from './employee-mobile/message-session';
import {AppNavigationProvider,useIdentityReload} from './app-navigation';
import {releaseDiscardGuards} from './kit/use-discard-guard';
import { NotificationBell } from "./notification-bell";
import { useInboxCount } from "./use-inbox-count";
import { isMobileKeyboardVisible } from "../lib/mobile-keyboard";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { AuthBrand } from "./auth-brand";
import { PlusIcon } from "@phosphor-icons/react/ssr";
import { NavIcon } from "@/components/nav-icon";
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
import { useExitValue } from "./kit/overlay-exit";
import { PressFeedback } from "./kit/press-feedback";
import { CommandFinder } from "./command-finder";
import { PresentationProvider } from "./presentation-context";
import { BOfflineContext } from "./owner-b/b-offline";
import { NUVORA_BRAND } from "../lib/brand";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { SettingsSidebarLabel } from "./settings-sidebar-label";
import { SHELL_WORDS, navLabel, localClock } from "./shell-copy";
import { handleRowNavigation } from "../lib/row-navigation";
import type { PayrollCapabilities } from '@/lib/payroll/contracts';
import type {OperationalAuthorityView} from '@/lib/company-access/model';
import {useOperationalNavigation} from './company-access/use-operational-navigation';
import {employeeMobileChrome} from '@/lib/employee-mobile-chrome';
import {rootChromeClaimed,subscribeRootChrome} from '@/lib/root-chrome';
import { recordNavigation } from "./corp/corp-client";
import { CorpMotion } from "./corp/corp-motion";
import { SidebarRailTooltip } from "./sidebar-rail-tooltip";
import { OFFLINE_HELD_EVENT } from "@/lib/offline-hold";
import { QuestionIcon } from "@phosphor-icons/react/dist/ssr/Question";
import { B_TABLET } from "@/lib/b-viewport";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretUpIcon } from "@phosphor-icons/react/dist/ssr/CaretUp";

/** "9:24 PM" in the device's clock, for the offline line. */
function clockTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(" ", "\u202f");
}

/** How far the sidebar's scroll fades reach (b-foundation.css): the current entry is kept this far from either edge. */
const SIDEBAR_FADE = 40;
/** Phase 9: the room each edge of a scrolling sidebar keeps for its caret (16px, 3px off the edge); an entry that reaches
 * into it is covered whole. */
const SIDEBAR_CARET = 24;

/** Home's views share Home's address; the trail names them as their bands do. */
const HOME_VIEWS = { attendance: "Who’s working", team: "Hours this week", activity: "Activity" } as const;

/** Upscale M2: tablets (768–1279px) open with the sidebar as a rail; the person's own choice there is kept apart from
 * their desktop choice, in a second cookie beside the one the server reads. */
const TABLET_SIDEBAR_QUERY = "(min-width: 768px) and (max-width: 1279px)";
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
/** Phase 3 (TB-017): under 1024px the labelled rail is the only sidebar (no toggle is drawn there; owner-b-shell.css), so a
 * choice to expand made on a wider screen does not squeeze a tablet page. The choice returns from 1024px. */
function subscribeRailOnly(changed: () => void) {
  const media = window.matchMedia(B_TABLET);
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


/** The Things to do count as the sidebar entry and the tab draw it (and as their names read it): "99+" past 99. */
function countText(count: number) {
  return count > 99 ? "99+" : String(count);
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

/** Review B2 (NV-001; Jose, Nov 10, 2026): while offline, the pages keep what the person loaded (read-only). The oldest
 * time a page reports holding is the line's "updated" time; none held means the page cleared, so the line says so. */
function useOfflineHeldAt(online: boolean) {
  const [heldAt, setHeldAt] = useState<string | null>(null);
  // Always listening: readers announce in their own 'offline' listeners, before this shell re-renders offline.
  useEffect(() => {
    const held = (event: Event) => {
      const at = (event as CustomEvent<string>).detail;
      if (typeof at === "string" && Number.isFinite(Date.parse(at))) setHeldAt(previous => previous && Date.parse(previous) <= Date.parse(at) ? previous : at);
    };
    const reset = () => setHeldAt(null);
    window.addEventListener(OFFLINE_HELD_EVENT, held);
    window.addEventListener("online", reset);
    return () => { window.removeEventListener(OFFLINE_HELD_EVENT, held); window.removeEventListener("online", reset); };
  }, []);
  return online ? null : heldAt;
}

/** The page's actions (pill buttons and submit buttons); links and rows that only open details stay usable offline. */
const OFFLINE_ACTIONS = "button.b-btn, button.c-btn, button.q-btn, button.q-bs, button.button, button[type='submit'], input[type='submit']";

/** Offline, the page's actions are disabled (the information stays readable): a press or a submit inside the page does
 * nothing, and b-foundation.css draws them in the disabled pair. Links still move between pages. */
function blockOfflineActions(event: Event) {
  if (navigator.onLine) return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target?.closest("#main-content")) return;
  if (event.type === "submit" || target.closest(OFFLINE_ACTIONS)) {
    event.preventDefault();
    event.stopPropagation();
  }
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
  // Signed-in Spanish: the shell's words and navigation labels in the person's language (shell-copy.ts).
  const lang = usePortalLang(), W = SHELL_WORDS[lang], L = (label: string) => navLabel(label, lang);
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
  // An Employee's or Lead's shell keeps its toggle and its choice at every width (their shell is not part of Phase 3).
  const railOnly = useSyncExternalStore(subscribeRailOnly, () => window.matchMedia(B_TABLET).matches, () => false) && user.role !== "EMPLOYEE" && user.role !== "LEAD";
  const tabletRail = railOnly || (tabletChoice ?? storedTablet !== "expanded");
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
  const accessChanged=useCallback((reason:'identity'|'scope')=>{if(reason==='identity'){/* The session is no longer this person's: no "Discard changes?" and no browser prompt on the way out. */releaseDiscardGuards();identityReload.request();}else {window.dispatchEvent(new Event('nevora:notifications-changed'));router.refresh();}},[router,identityReload]);
  const operational=useOperationalNavigation(user.id,user.role,operationalAuthority,accessChanged);
  const inboxAuthority = operational.navigation?.state === 'ready' && operational.navigation.scope
    ? operational.navigation.authority : null;
  const inboxCount = useInboxCount(!employee ? inboxAuthority : null, pathname);
  // Review B2 (NV-030): menus follow the last current scope while a check is slow, failed or offline.
  const context:NavContext = {...presentation, operational:operational.navigation??undefined};
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
  const navGroups = employee ? employeeNavigationGroups(sidebarItems) : managementNavigationGroups(sidebarItems, [], user.role);
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
  // clear of the pinned Workspace group. Phase 8: clear of the edge fades too (40px), and again when the window changes
  // size (a phone turned sideways), so the lit entry is always on screen.
  useEffect(() => {
    const reveal = () => {
      const nav = document.getElementById("desktop-primary-navigation");
      const link = nav?.querySelector<HTMLElement>(".nav-link.active");
      if (!nav || !link || nav.scrollHeight <= nav.clientHeight) return;
      const pinned = nav.querySelector<HTMLElement>('[data-group="Workspace"]');
      const box = nav.getBoundingClientRect(), item = link.getBoundingClientRect();
      const bottom = box.bottom - (pinned && !pinned.contains(link) ? pinned.offsetHeight : 0);
      if (item.top < box.top + SIDEBAR_FADE) nav.scrollTop -= box.top + SIDEBAR_FADE - item.top;
      else if (item.bottom > bottom - SIDEBAR_FADE) nav.scrollTop += item.bottom - bottom + SIDEBAR_FADE;
    };
    let frame = 0;
    const later = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(reveal); };
    reveal();
    window.addEventListener("resize", later);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", later); };
  }, [sidebarActive]);

  // Phase 8 (Nov 17, 2026): a sidebar or rail that scrolls says so. The list marks the edge that has more entries
  // (data-more-above, data-more-below); b-foundation.css fades that edge and puts a caret at the foot. A list that fits
  // carries neither mark.
  // Phase 9 (Nov 18, 2026): no entry is drawn half under a cue. The cue at an edge covers the entry that edge cuts, whole
  // (--bs-cover-above, --bs-cover-below; owner-b-shell.css), so the list shows whole entries only and a count badge is
  // never cut in half. Each edge keeps room for its caret (the foot's points down, the head's up: the cover hides the
  // faded entry that used to say "more above"); an entry that reaches into that room is covered too. A group's heading
  // counts as an entry (the full sidebar on a short window).
  useEffect(() => {
    const nav = document.getElementById("desktop-primary-navigation");
    if (!nav) return;
    let frame = 0;
    const mark = () => {
      frame = 0;
      const more = nav.scrollHeight - nav.clientHeight > 1;
      const above = more && nav.scrollTop > 1, below = more && nav.scrollTop + nav.clientHeight < nav.scrollHeight - 1;
      nav.toggleAttribute("data-more-above", above);
      nav.toggleAttribute("data-more-below", below);
      let coverAbove = SIDEBAR_CARET, coverBelow = SIDEBAR_CARET;
      if (above || below) {
        const box = nav.getBoundingClientRect();
        const top = box.top + nav.clientTop, bottom = top + nav.clientHeight;
        for (const entry of nav.querySelectorAll<HTMLElement>(".nav-link, .sidebar-group-label")) {
          const item = entry.getBoundingClientRect();
          if (!item.height) continue;
          if (above && item.top < top + SIDEBAR_CARET && item.bottom > top) coverAbove = Math.max(coverAbove, item.bottom - top);
          if (below && item.bottom > bottom - SIDEBAR_CARET && item.top < bottom) coverBelow = Math.max(coverBelow, bottom - item.top);
        }
      }
      nav.style.setProperty("--bs-cover-above", `${Math.ceil(coverAbove)}px`);
      nav.style.setProperty("--bs-cover-below", `${Math.ceil(coverBelow)}px`);
    };
    const later = () => { if (!frame) frame = requestAnimationFrame(mark); };
    mark();
    nav.addEventListener("scroll", later, { passive: true });
    window.addEventListener("resize", later);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(later);
    observer?.observe(nav);
    return () => { if (frame) cancelAnimationFrame(frame); nav.removeEventListener("scroll", later); window.removeEventListener("resize", later); observer?.disconnect(); };
  }, [sidebarItems.length]);

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
  const offlineHeldAt = useOfflineHeldAt(online);
  const offlineLine = online ? null : offlineHeldAt ? W.offlineUpdated(localClock(clockTime(offlineHeldAt), lang)) : W.offline;
  // Phase 7: back online, the shell's pill keeps its words for its one exit (150ms, b-motion.css).
  const offlinePill = useExitValue(offlineLine !== null, offlineLine);
  useEffect(() => {
    if (online) return;
    document.addEventListener("click", blockOfflineActions, true);
    document.addEventListener("submit", blockOfflineActions, true);
    return () => { document.removeEventListener("click", blockOfflineActions, true); document.removeEventListener("submit", blockOfflineActions, true); };
  }, [online]);

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
    {/* eslint-disable-next-line next-preserved/no-img-element -- an immutable, same-origin asset already sized for the chip */}
    <img src={brand.logoUrl} alt={W.logoAlt(workspaceName)} decoding="async" />
  </span> : null;
  // Round 2 (R13): one profile entry. "Profile and device settings" retired from this menu; this device's alerts stay one
  // step away: an Owner or Manager's profile page has the "Alerts on this phone" row (it opens the same device settings),
  // and so does the sidebar's name button; an Employee gets the alerts page by its own name. With no profile page, the
  // menu keeps a "Device settings" entry so nothing is lost.
  const profilePage = employee || navigation.some(item => item.href === "/app/profile");
  // Phase 3 (TB-009, MG-007): More, Profile and My pay open from the account pill and have no sidebar or rail entry (an
  // Owner's or Manager's; a Manager's My pay is in the sidebar and lights there), so the pill is marked while one is open.
  const accountPage = !employee && !sidebarActive && (pathname === "/app/more" || pathname === "/app/profile" || !!pathname?.startsWith("/app/profile/") || pathname === "/app/my-pay");
  const myPayInSidebar = sidebarItems.some(item => item.href === "/app/my-pay");
  const accountMenu = (
    <PortalAccountMenu initials={initials} name={`${user.firstName} ${user.lastName}`} detail={`${W.roles[user.role] ?? ""} · ${workspaceName}`} current={accountPage}>
      {profilePage ? <Link href="/app/profile" className="nevora-action-menu-item"
        onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>{W.yourProfile}</Link> : null}
      {/* Desktop Employee: the calendar link page has no other way in at this width (phones reach it from More). */}
      {employee ? <Link href="/app/profile/calendar" className="nevora-action-menu-item"
        onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>{W.addToCalendar}</Link> : null}
      {!employee && !myPayInSidebar && navigation.some(item => item.href === "/app/my-pay") ? <Link href="/app/my-pay" className="nevora-action-menu-item"
        onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>{W.myPay}</Link> : null}
      {notificationsEnabled && employee ? <Link href="/app/profile/device-alerts" className="nevora-action-menu-item"
        onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>{W.alertsOnDevice}</Link> : null}
      {notificationsEnabled && !profilePage ? <button type="button" className="nevora-action-menu-item" popoverTarget="portal-device-settings">{W.deviceSettings}</button> : null}
      {/* Review B2 (NV-011): Help is one click away at every width (on desktop it was only a back-link target or in Ctrl K). */}
      <Link href="/app/help" className="nevora-action-menu-item"
        onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>{W.help}</Link>
      {/* Review F5 (NV-011): an Employee's or Lead's phone More lists Help and Privacy and terms together ("Help and legal");
        * on tablets and desktop the account menu holds both, so nothing More reaches is further away there. */}
      {employee ? <Link href="/privacy" className="nevora-action-menu-item"
        onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>{W.privacyAndTerms}</Link> : null}
      <div className="nevora-action-menu-divider" />
      <PortalSignout><button className="nevora-action-menu-item portal-account-signout" type="submit">{W.signOut}</button></PortalSignout>
    </PortalAccountMenu>
  );
  return (
    <div className={employee ? "app-shell employee-shell nevora-portal" : "app-shell nevora-portal"} data-sidebar-collapsed={railed}
      data-sidebar-desktop={collapsed ? "rail" : "full"} data-sidebar-tablet={tabletRail ? "rail" : "full"} data-sidebar-motion={sidebarMotion ?? undefined}
      // Clean Manager and Owner app (v3): premium-clean-manager.css applies only under this attribute, so Employee and Lead pages never change.
      id={employee ? "employee-mobile" : undefined}
      data-employee-mobile={employee ? "true" : undefined}
      data-employee-mobile-active={employeeMobile ? "true" : undefined}
      data-employee-mobile-chrome={rootChrome && employee ? "root" : employeeMobileChrome(user.role,pathname,mobileTabs,search)}
      // Jose (Nov 15, 2026, item 12): Notifications left the Employee sidebar, so the page names itself for the band rules.
      data-shell-page={pathname === "/app/notifications" ? "notifications" : undefined}
      data-employee-mobile-page={employee ? pathname === "/app" ? "home" : pathname === "/app/schedule" ? "schedule" : pathname === "/app/my-time" || pathname === "/app/timecards" ? "hours" : pathname === "/app/my-pay" ? "pay" : (pathname === "/app/requests/hub" || pathname === "/app/requests" || pathname === "/app/availability") || (pathname === "/app/exchange" || pathname.startsWith("/app/exchange/")) ? "requests" : "other" : undefined}
      data-nv-clean={employee ? undefined : ""}
      // Quiet (v4, Jose approved Oct 23, docs/product/specs/owner-v4-quiet): the Owner and Manager pages and their tab bar.
      data-nv-quiet=""
      // Employee app, new style (Jose approved Oct 20, docs/product/specs/employee-style): employee-style.css applies only under this attribute.
      style={brand?.style as CSSProperties | undefined} data-company-brand={brand?.style ? "custom" : undefined}
      // One phone shell on every tab, Home included, for every role (Phase 7 WR-03; employees since Phase 3, P3-ST-01).
      data-mobile-workforce={pathname ? "true" : undefined}
      data-employee-corporate={employee && (pathname === "/app/my-time" || pathname === "/app/timecards") ? "true" : undefined}
      // Corporate (Release 1, approved Oct 26): Owner and Manager. A tab's own page shows the white header (logo, bell, avatar).
      // Employees joined in Phase 6, Leads on Nov 8, 2026 (Direction B).
      // Owner premium (A7): a page that is itself a sidebar entry needs no "‹ Back" line on tablets and desktop.
      data-nav-root={!employee && !toolView && sidebarItems.some(item => item.href === pathname) ? "" : undefined}
      // Direction B (Jose approved Nov 5, 2026): the Owner and Manager phone screens draw a teal hero; see owner-b-shell.css.
      // Employees joined Nov 6, 2026 (phones only; their desktop is unchanged, see owner-b-desktop.css). Leads joined Nov 8, 2026 with the Employee's screens (desktop included).
      data-nv-b=""
      data-offline={online ? undefined : ""}
      data-nv-corp="" data-corp-root={(rootChrome || mobileTabs.some(tab => tab.href === pathname)) && !(pathname === "/app" && search?.get("view")) && !(pathname === "/app/schedule" && search?.get("view") === "open") && !(pathname === "/app/inbox" && search?.get("view") === "more") && !(pathname === "/app/my-pay" && (search?.get("view") || search?.get("paycheck"))) ? "" : undefined}>
      {/* IS-P4-14: on desktop, the sidebar and header come first; this skips them. Shown only on focus, and only on desktop. */}
      <a className="portal-skip-link" href="#main-content">{W.skipToContent}</a>
      <aside className="sidebar" data-collapsed={railed} ref={sidebarRef}>
        <div className="sidebar-heading">
        <Link href="/app" className="brand sidebar-brand" aria-label={W.homeLinkName}>
          <AuthBrand />
        </Link>
        {companyLogo}
        {/* v3: the workspace at the top of the sidebar (desktop only). Upscale B2: one desktop shell, so Employees have it too;
          in the rail it is the 32px initials avatar. */}
        <p className="cm-org" title={workspaceName}><span className="cm-org__mark" aria-hidden="true">{workspaceName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase()}</span><span className="cm-org__name">{workspaceName}</span>{/* A Lead's role line under the workspace (Direction B, Nov 8, 2026); the shell has no location in hand. Phase 4 (EM-026): an Employee has the line too, so the card is one height for both. */}{user.role === "LEAD" ? <span className="cm-org__role">{W.roles.LEAD}</span> : user.role === "EMPLOYEE" ? <span className="cm-org__role">{W.roles.EMPLOYEE}</span> : null}</p>

        <button className="sidebar-toggle" type="button" aria-label={railed ? W.expandSidebar : W.collapseSidebar} aria-expanded={!railed} aria-controls="desktop-primary-navigation" onClick={toggleSidebar}><NavIcon name="sidebar" size={20} /></button>
        </div>
        <nav id="desktop-primary-navigation" className="sidebar-nav" aria-label={W.primaryNavigation}>
          {/* Phase 8: the scroll cues of a list that holds more than the window (drawn only then; b-foundation.css). */}
          <span className="sidebar-more sidebar-more--top" aria-hidden="true"><CaretUpIcon weight="bold" /></span>
          {navGroups.map((group, index) => <div className="sidebar-nav-group" data-group={group.label || undefined} key={`${index}:${group.label}`}>
          {group.label ? <h2 className="sidebar-group-label">{L(group.label)}</h2> : null}
          {group.items.map((item) => {
            const active = item.href === sidebarActive;
            const spanishSettings = lang === "es" && item.href === "/app/settings";
            // G6 (Nov 23, 2026): the name starts with what the entry shows, the label and then the count as drawn ("99+").
            const count = item.href === "/app/inbox" && inboxCount ? countText(inboxCount) : null;

            return (
              <Link
                key={item.href}
                href={item.href}
                intent="auto"
                className={active ? "nav-link active" : "nav-link"}
                // IS-P4-08: a holder (Inbox on Time off) is the current section, not the current page.
                aria-current={active ? (activeTool?.href === item.href || (item.href === activeHref && !pageItem && !deeper) ? "page" : "true") : undefined}
                aria-label={spanishSettings ? undefined : count ? W.withCount(L(item.label), count) : L(item.label)}
              >
                <span className="nav-icon">
                  {/* Phase 3 (TB-001, TB-009): the current entry's glyph is filled, in the sidebar and the rail, as the phone's current tab is.
                    * Phase 9: one glyph per concept, the tab bar's own (a pay statement is the receipt for every role). */}
                  <NavIcon name={item.icon} employee={employee} size={20} weight={active ? "fill" : "bold"} />
                </span>
                {spanishSettings ? <SettingsSidebarLabel full={L(item.label)} short={W.compactSettings} /> : <span className="nav-label">{L(item.label)}</span>}
                <NavPending />
                {/* The space keeps the label and the count two words for tools that read the drawn text (the flex row
                  * draws no gap for it). */}
                {count ? <>{" "}<span className="nav-count" aria-hidden="true">{count}</span></> : null}
              </Link>
            );
          })}</div>)}
          <span className="sidebar-more sidebar-more--bottom" aria-hidden="true"><CaretDownIcon weight="bold" /></span>
        </nav>

        {employee ? <Link href="/app/profile" className="sidebar-profile portal-profile-trigger" aria-label={W.yourProfile}>
          <div className="avatar">{initials}</div>
          <div className="sidebar-profile-copy"><strong>{user.firstName} {user.lastName}</strong></div>
        </Link> : <>        <Profile className={`sidebar-profile${notificationsEnabled ? " portal-profile-trigger" : ""}`} {...(notificationsEnabled ? { type: "button" as const, popoverTarget: "portal-device-settings", "aria-label": W.profileAndDevice } : {})}>
          <div className="avatar">{initials}</div>
          <div className="sidebar-profile-copy">
            <strong>{user.firstName} {user.lastName}</strong>
          </div>
          {notificationsEnabled ? <span className="sidebar-profile-chevron" aria-hidden="true">⌄</span> : null}
        </Profile></>}


        <PortalSignout className="sidebar-signout-form">
          <button className="sidebar-logout sidebar-logout-row" type="submit">
            <NavIcon name="logout" size={18} employee={employee} />
            <span>{W.signOut}</span>
          </button>
        </PortalSignout>

        {/* Review B2 (NV-011): a Help link above "Powered by" on tablets and desktop. Phase 9: its glyph is the entries' 20px. */}
        <Link href="/app/help" className="sidebar-help-link" aria-current={pathname === "/app/help" ? "page" : undefined}><QuestionIcon size={20} weight={pathname === "/app/help" ? "fill" : "bold"} aria-hidden="true" /><span className="nav-label">{W.help}</span></Link>
        <div className="sidebar-platform-footer">
          <span>{workspaceName}</span>
          <small>{NUVORA_BRAND.poweredBy}</small>
        </div>
      </aside>

      <div className="app-main">
        <header className="mobile-header">
          <span className="portal-workspace-name" title={workspaceName}>{workspaceName}</span>
          {/* v3: Notifications has no navigation entry for Owners and Managers, so the trail names it directly. */}
          {!activeItem && !employee && pathname === "/app/notifications" ? <nav className="portal-location-nav" aria-label={W.youAreHere}><ol className="portal-location"><li><span aria-current="page">{W.notifications}</span></li></ol></nav> : null}
          {activeItem ? <nav className="portal-location-nav" aria-label={W.youAreHere}>
            <ol className="portal-location">
              <li className="portal-location-workspace" title={workspaceName}>{workspaceName}</li>
              {activeGroup?.label ? <li>{L(activeGroup.label)}</li> : null}
              <li>{deeper || (homeView && !activeTool) ? <Link href={activeItem.href}>{L(activeItem.label)}</Link> : <span aria-current="page">{L(activeItem.label)}</span>}</li>
              {pageItem ? <li>{!homeView && pathname !== pageItem.href ? <Link href={pageItem.href}>{L(pageItem.label)}</Link> : <span aria-current="page">{L(pageItem.label)}</span>}</li> : null}
            </ol>
          </nav> : null}
          <Link href="/app" className="brand compact" aria-label={W.homeLinkName}>
            <AuthBrand />
          </Link>
          {companyLogo}
          <div className="mobile-header-actions">
          {/* v3: the desktop top bar's one action (Owner and Manager); phones add shifts from Schedule. */}
          {!employee && navigation.some(item => item.href === "/app/schedule") ? <Link href="/app/schedule/new" className="cm-add-shift"><PlusIcon size={14} weight="bold" aria-hidden="true" />{W.addShift}</Link> : null}
          {/* Employee desktop (Nov 8, 2026): Employees search their own pages (desktop only; see employee-b-desktop.css). */}
          {(!employee && (user.role === "OWNER" || operational.navigation?.state === "ready" && operational.navigation.scope?.mode === "COMPANY")) || employee ? <CommandFinder role={user.role} payroll={payrollCapabilities} context={context} /> : null}
          {notificationAuthority ? <NotificationBell key={operationalAuthority?.state==='ready'?operationalAuthority.authority:'unavailable'} authority={notificationAuthority} /> : null}
          {/* Upscale B2: one desktop top bar for every role, Search · bell · avatar. The Employee "+" retired (New request
            lives on Requests). */}
          {accountMenu}
          {/* Corporate phone header: the avatar opens More (profile, settings and the rest). Desktop keeps the account menu. */}
          <Link href="/app/more" prefetch className="c-top-avatar" aria-label={W.moreFor(`${user.firstName} ${user.lastName}`, initials)} aria-current={pathname === "/app/more" ? "page" : undefined}><span aria-hidden="true">{initials}</span>{/* Review F2 (NV-099): a small visible cue that the avatar opens More. */}<i className="c-top-avatar__more" aria-hidden="true"><CaretDownIcon weight="bold" /></i></Link>
          </div>
        </header>
        {/* Owner premium P7 and P11: the thin progress bar while a page is on its way, and the offline line over the page. */}
        <div className="c-progress" aria-hidden="true"><i /></div>
        {/* Jose (Nov 15, 2026, item 9): a page with a band shows this line inside it, under the title (BOffline); this
          * one stays for pages without a band and is hidden when the band's pill is on the page (owner-b-shell.css). */}
        {offlinePill.value ? <div className="c-offline" role="status" data-held={offlineHeldAt ? "" : undefined} data-leaving={offlinePill.leaving ? "" : undefined}>{offlinePill.value}</div> : null}

        <main className="page-frame" id="main-content" tabIndex={-1} data-focused-review={focusedReview || undefined}>{sectionTabs ? <SectionTabs group={sectionTabs} pathname={pathname ?? ""} /> : null}<PresentationProvider modules={context.modules} words={context.words}>{/* Review B2 (NV-032): no separate "Management menu unavailable" card above the hero; the page's own state says it once
          and its Try again re-checks the menus too. */}<EmployeeMessageReturn/><BOfflineContext.Provider value={offlineLine}>{children}</BOfflineContext.Provider></PresentationProvider></main>

        <nav className="mobile-nav" aria-label={W.mobileNavigation} style={{gridTemplateColumns:`repeat(${mobileTabs.length},minmax(0,1fr))`}}>
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
                    // Phase 1: the tabs load in full ahead of the tap. The access frame still checks each page when it opens.
                    // Gap closure (Nov 23, 2026): on intent (touch start, pointer, focus), not on sight, so the frame's renewals no
                    // longer fetch every tab again (each renewal cleared the router cache: 36 extra reads a minute).
                    intent="full"
                    className={active ? "mobile-nav-link active" : "mobile-nav-link"}
                    // Review Nov 14 (BR-4): More and the pages it opens light no tab, so a lit tab is always the page's own place.
                    aria-current={active ? "page" : undefined}
                    // G6 (Nov 23, 2026): the name starts with the tab's own label, then the count as drawn ("To do, 3").
                    aria-label={needsYou !== null ? W.withCount(L(item.label), countText(needsYou)) : undefined}
                    // Owner premium P8: tapping the tab you are on scrolls its page back to the top, as on iOS.
                    onClick={event => {
                      if (location !== item.href || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                      event.preventDefault();
                      window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
                    }}
                  >
                    {/* Corporate (boards C-Owner, C-Employee): outline glyphs; the current tab is teal and filled (upscale S1: every
                      tab, not Home alone). A Lead has the Employee's tab bar. Phase 9: each tab draws its sidebar entry's glyph
                      (Payroll the wallet, not a card), so a place looks the same on a phone and in the rail. */}
                    <NavIcon name={item.icon} size={24} weight={active ? "fill" : "bold"} />
                    <span>{L(item.label)}</span>
                    {/* Direction B: the count is visible on the tab too (phones, Owner and Manager); the label above reads it. */}
                    {needsYou !== null && !employee ? <>{" "}<span className="b-tab-badge" aria-hidden="true">{countText(needsYou)}</span></> : null}
                    <TabPending />
                  </Link>
                );
              })}
            </>
        </nav>
      </div>
      <SidebarRailTooltip sidebar={sidebarRef} enabled={railed} />
      <SheetGestures />
      {/* Phase 7: a press from the keyboard shows the same feedback as a tap (b-motion.css). */}
      <PressFeedback />
      {/* Round 2 (R12): tab lines, the sidebar tint and segment thumbs slide to the current item. */}
      <CorpMotion />
      <Toaster />
      <FormValidation />
      {notificationsEnabled ? employee?<EmployeeDevicePopover role={user.role} nativeApp={nativeApp}/>:nativeApp?<NativePortalDeviceSetup role={user.role}/>:<PortalDeviceSetup role={user.role} /> : null}
    </div>
  );
}
