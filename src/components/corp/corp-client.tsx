"use client";

import "./corp.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";

/* Owner premium (Oct 31, 2026): the kit's client pieces. Presentation and navigation only; no data is read or written. */

const PREV = "nv:nav:prev";
const CUR = "nv:nav:cur";

/** The shell records each in-app location, so a back link can tell whether the page it names is the one just before
 * this one (P6). Session storage only; a private window without it simply falls back to an ordinary link. */
export function recordNavigation(location: string) {
  try {
    const current = sessionStorage.getItem(CUR);
    if (current === location) return;
    sessionStorage.setItem(PREV, current ?? "");
    sessionStorage.setItem(CUR, location);
  } catch { /* Storage unavailable: back links stay ordinary links. */ }
}

function samePlace(a: string, b: string) {
  try {
    const left = new URL(a, window.location.origin), right = new URL(b, window.location.origin);
    return left.origin === right.origin && left.pathname === right.pathname && left.search === right.search;
  } catch { return false; }
}

/** A back link that behaves like Back (P6): when the page it names is the previous entry, it goes back in history, so no
 * new entry is added (no swipe-back loop) and the browser restores that page's scroll. Otherwise it is an ordinary link. */
export function CorpBackLink({ href, className, children, label }: { href: string; className?: string; children: ReactNode; label?: string }) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    let previous: string | null = null;
    try { previous = sessionStorage.getItem(PREV); } catch { previous = null; }
    if (!previous || window.history.length < 2 || !samePlace(previous, href)) return;
    event.preventDefault();
    window.history.back();
  };
  return <Link className={className} href={href} aria-label={label} onClick={onClick}>{children}</Link>;
}

/** The error card's "Try again": refreshes the current page's server data. */
export function CorpRetryButton({ children = "Try again" }: { children?: ReactNode }) {
  const router = useRouter();
  return <button type="button" className="c-btn c-btn--neutral" onClick={() => router.refresh()}>{children}</button>;
}

/** Nov 1 upscale (kit consistency 7): the one partial-failure line, on the right of a card's header when part of the card's
 * data didn't load: "Couldn't load" in grey, then "Try again" as a teal 13/600 link. Try again calls `onRetry` when a page
 * can retry just that read, or refreshes the page's server data. The figures under it show "—" (CORP_NO_VALUE). */
export function CorpLoadFailed({ onRetry, busy }: { onRetry?: () => void; busy?: boolean }) {
  const router = useRouter();
  return <span className="c-fail">
    <span className="c-fail__text" role="status">Couldn’t load</span>
    <span className="c-fail__dot" aria-hidden="true">·</span>
    <button type="button" className="c-link c-fail__retry" aria-disabled={busy || undefined}
      onClick={() => { if (busy) return; if (onRetry) onRetry(); else router.refresh(); }}>{busy ? "Trying…" : "Try again"}</button>
  </span>;
}

/* Loading (P7; Nov 1 upscale, kit consistency 8): each page's placeholder has the page's own shape, so nothing moves when
 * the page arrives. The title is real text at once (the page's fixed title, or the title this person last saw on that
 * page, such as "Welcome back, Alexandra"); the shapes fade in after 120ms, so a quick load shows no flash. Bars are
 * #EDEEEF, radius 4, 13px (a line of text) or 20px (a figure) tall. One quiet shimmer crosses them, none with reduced
 * motion. When the page replaces the placeholder it fades in over 150ms. After 2.5s it becomes the error card (P3). */
type Bar = 13 | 20;
type Part =
  | { kind: "seg" }
  | { kind: "label"; aside?: boolean }
  | { kind: "card"; head?: boolean; lines?: Bar[]; stats?: number; rows?: number; avatar?: boolean; lead?: boolean; one?: boolean; button?: boolean; strip?: boolean };
/** `narrow`: the page is a single column capped at 720px on tablets and desktop (CorpPage className="c-page--narrow"). */
type Shape = { title?: string; sub?: boolean; narrow?: boolean; parts: Part[] };
const card = (spec: Omit<Extract<Part, { kind: "card" }>, "kind">): Part => ({ kind: "card", ...spec });
const SEG: Part = { kind: "seg" };
const label = (aside?: boolean): Part => ({ kind: "label", aside });

/** Owner and Manager shapes by route (the `route` each loading.tsx passes), then the Employee shape where the page differs. */
const OWNER: Record<string, Shape> = {
  // Home: the greeting and date, Today (three figures), Payday, Things to do.
  home: { sub: true, parts: [card({ head: true, stats: 3 }), card({ head: true, lines: [20, 13] }), card({ head: true, rows: 3 })] },
  // Schedule: the week card (its day strip on a phone) and the day's shifts with avatars.
  schedule: { title: "Schedule", sub: true, parts: [card({ head: true, strip: true }), card({ rows: 5, avatar: true })] },
  // Timecards: period, the status line, then the team's timecards.
  timecards: { title: "Timecards", sub: true, parts: [SEG, card({ lines: [20, 13] }), card({ head: true, rows: 5, avatar: true })] },
  // Payroll: the next payroll, then recent payrolls.
  payroll: { title: "Payroll", sub: true, narrow: true, parts: [card({ head: true, lines: [20, 13], button: true }), label(), card({ rows: 3 })] },
  // Time off requests (the Owner's /app/requests).
  review: { title: "Time off", parts: [SEG, card({ rows: 4, avatar: true })] },
  // Things to do: two groups of items.
  inbox: { title: "Things to do", sub: true, narrow: true, parts: [label(true), card({ rows: 2 }), label(true), card({ rows: 3 })] },
  team: { title: "Team", sub: true, narrow: true, parts: [SEG, label(), card({ rows: 8, avatar: true })] },
  settings: { title: "Settings", narrow: true, parts: [label(), card({ rows: 3, one: true }), label(), card({ rows: 4, one: true })] },
  notifications: { title: "Notifications", narrow: true, parts: [SEG, card({ rows: 4 })] },
  updates: { title: "Updates", parts: [SEG, card({ rows: 3 })] },
  exports: { title: "Time exports", narrow: true, parts: [card({ head: true, lines: [20, 13], button: true }), card({ rows: 3 })] },
  profile: { parts: [card({ rows: 2, avatar: true }), card({ rows: 4, one: true })] },
  // An Owner's or Manager's own pay statements.
  mypay: { parts: [card({ head: true, lines: [20, 13] }), card({ head: true, rows: 2 })] },
};
const EMPLOYEE: Record<string, Shape> = {
  // Home: "Welcome back, …", the next shift, what needs you, coming up.
  home: { sub: true, parts: [card({ head: true, lines: [20, 13] }), card({ rows: 1 }), card({ head: true, rows: 3, lead: true })] },
  // Schedule: the week strip, then this week's shifts by day.
  schedule: { title: "Schedule", sub: true, parts: [card({ head: true, strip: true }), card({ head: true, rows: 4, lead: true })] },
  // Time (also /app/timecards for an Employee): right now, this week, recent days.
  timecards: { title: "Time", sub: true, parts: [card({ head: true, lines: [20, 13] }), card({ head: true, stats: 2 }), card({ head: true, rows: 3 })] },
  mytime: { title: "Time", sub: true, parts: [card({ head: true, lines: [20, 13] }), card({ head: true, stats: 2 }), card({ head: true, rows: 3 })] },
  // Pay: this pay period, then recent statements.
  mypay: { title: "Pay", sub: true, parts: [card({ head: true, lines: [20, 13] }), card({ head: true, rows: 3 })] },
  // Requests: waiting, then recent.
  hub: { title: "Requests", sub: true, parts: [label(), card({ rows: 2 }), label(), card({ rows: 3 })] },
  review: { title: "Time off", parts: [SEG, card({ rows: 3 })] },
  availability: { title: "Availability", sub: true, parts: [card({ head: true, rows: 7, one: true })] },
  exchange: { title: "Shift requests", parts: [SEG, card({ rows: 3 })] },
  profile: { parts: [card({ rows: 1, avatar: true }), card({ rows: 4, one: true })] },
};
const FALLBACK: Shape = { parts: [card({ head: true, lines: [20, 13] }), card({ rows: 4 })] };

const TITLES = "nv:titles";
const noSubscribe = () => () => {};
/** Whose shell this is: the name in the sidebar (titles are remembered per person, so a shared tab never shows another
 * person's greeting). */
const shellName = () => document.querySelector(".sidebar-profile-copy strong")?.textContent?.trim() ?? "";

/** CorpMotion records the title shown on each page (the page's h1); the placeholder shows it next time. */
export function rememberTitle(path: string, title: string) {
  try {
    const who = shellName();
    const saved = JSON.parse(sessionStorage.getItem(TITLES) ?? "null") as { who: string; titles: Record<string, string> } | null;
    const titles = saved && saved.who === who ? saved.titles : {};
    if (titles[path] === title) return;
    titles[path] = title;
    const keys = Object.keys(titles);
    for (const key of keys.slice(0, Math.max(0, keys.length - 40))) delete titles[key];
    sessionStorage.setItem(TITLES, JSON.stringify({ who, titles }));
  } catch { /* storage off: placeholders keep their fixed titles */ }
}
function rememberedTitle(path: string): string | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(TITLES) ?? "null") as { who: string; titles: Record<string, string> } | null;
    return saved && saved.who === shellName() ? saved.titles[path] ?? null : null;
  } catch { return null; }
}

const bar = (height: Bar, width: string, key?: number) => <i key={key} className={height === 20 ? "c-skel__bar c-skel__bar--20" : "c-skel__bar"} style={{ width }} />;
const ROW_WIDTHS = ["52%", "40%", "60%", "46%", "36%", "56%", "44%", "50%"];

function SkelPart({ part, index }: { part: Part; index: number }) {
  if (part.kind === "seg") return <span className="c-skel__seg" />;
  if (part.kind === "label") return <span className="c-sec-label c-skel__label"><span className="c-skel__line">{bar(13, "22%")}</span>{part.aside ? <span className="c-skel__line">{bar(13, "48px")}</span> : null}</span>;
  return <span className="c-card c-skel__card">
    {part.head ? <span className="c-card__head"><span className="c-skel__line">{bar(13, index % 2 ? "28%" : "34%")}</span></span> : null}
    {part.strip ? <span className="c-skel__strip">{Array.from({ length: 7 }, (_, day) => <i key={day} />)}</span> : null}
    {part.lines ? <span className="c-card__body c-skel__body">
      {part.lines.map((height, line) => <span key={line} className={height === 20 ? "c-skel__line c-skel__line--20" : "c-skel__line"}>{bar(height, line ? "58%" : "40%")}</span>)}
      {part.button ? <span className="c-skel__button" /> : null}
    </span> : null}
    {part.stats ? <span className="c-stats c-skel__stats">{Array.from({ length: part.stats }, (_, stat) => <span key={stat} className="c-stat">
      <span className="c-stat__label">{bar(13, "64%")}</span><span className="c-stat__value">{bar(20, "40%")}</span>
    </span>)}</span> : null}
    {part.rows ? <span className="c-skel__rows">{Array.from({ length: part.rows }, (_, row) => <span key={row} className={part.one ? "c-row c-row--one" : "c-row"}>
      {part.lead ? <span className="c-row__lead">{bar(13, "36px")}</span> : null}
      {part.avatar ? <i className="c-skel__av" /> : null}
      <span className="c-row__main">
        <span className="c-skel__line">{bar(13, ROW_WIDTHS[(row + index) % ROW_WIDTHS.length])}</span>
        {part.one ? null : <span className="c-skel__line c-skel__line--detail">{bar(13, ROW_WIDTHS[(row + index + 3) % ROW_WIDTHS.length])}</span>}
      </span>
    </span>)}</span> : null}
  </span>;
}

function SkelShape({ shape, title, variant }: { shape: Shape; title: string | null; variant?: "owner" | "employee" }) {
  return <span className={`c-skel__v${variant ? ` c-skel__v--${variant}` : ""}${shape.narrow ? " c-skel__v--narrow" : ""}`}>
    <span className="c-title"><span className="c-title__row">{title ? <span className="c-skel__title">{title}</span> : <span className="c-skel__titlebar">{bar(20, "46%")}</span>}</span>
      {shape.sub ? <span className="c-title__sub">{bar(13, "34%")}</span> : null}</span>
    <span className="c-skel__shapes">{shape.parts.map((part, index) => <SkelPart key={index} part={part} index={index} />)}</span>
  </span>;
}

/** P3/P7: the corporate loading placeholder. After 2.5s without the page, it says so and offers Try again; if the page
 * then arrives it simply replaces this. The wording never claims a failure it can't know about. */
export function CorpSkeleton({ route, label }: { route?: string; label: string }) {
  const [slow, setSlow] = useState(false);
  const [offline, setOffline] = useState(false);
  const pathname = usePathname() ?? "";
  const remembered = useSyncExternalStore(noSubscribe, () => rememberedTitle(pathname), () => null);
  useEffect(() => {
    const timer = window.setTimeout(() => { setOffline(typeof navigator !== "undefined" && navigator.onLine === false); setSlow(true); }, 2500);
    return () => window.clearTimeout(timer);
  }, []);
  // When the page replaces this placeholder (React removes it in the same commit that adds the page), the page fades in
  // over 150ms (corp.css, html[data-c-arrived]). Layout-effect cleanup runs before that frame is painted.
  useLayoutEffect(() => () => {
    const root = document.documentElement;
    root.setAttribute("data-c-arrived", "");
    window.setTimeout(() => root.removeAttribute("data-c-arrived"), 200);
  }, []);
  void label;
  if (slow) return <div className="c-page c-embed c-skel c-skel--slow" data-corp="">
    <section className="c-card c-error-card" role="alert">
      {/* Round 2 copy (row 180): one sentence that reads right for every page name, singular or plural. */}
      <span className="c-error-card__title">{offline ? "You’re offline" : "This is taking longer than usual"}</span>
      <span className="c-error-card__body">{offline ? "Reconnect, then try again." : "Check your connection, then try again."}</span>
      <span className="c-error-card__action"><CorpRetryButton /></span>
    </section>
  </div>;
  const owner = (route && OWNER[route]) || null, employee = (route && EMPLOYEE[route]) || null;
  const titleOf = (shape: Shape) => remembered ?? shape.title ?? null;
  // A route both roles open with different pages draws both; the Employee shell (#employee-mobile) shows its own.
  return <div className="c-page c-embed c-skel" data-corp="" data-route={route} aria-hidden="true">
    {owner && employee ? <>
      <SkelShape shape={owner} title={titleOf(owner)} variant="owner" />
      <SkelShape shape={employee} title={titleOf(employee)} variant="employee" />
    </> : <SkelShape shape={owner ?? employee ?? FALLBACK} title={titleOf(owner ?? employee ?? FALLBACK)} />}
  </div>;
}

/** Round 2 (R12): a row leaves after a server-confirmed change. Call it once the save has succeeded and before the page's
 * data refreshes: the row fades and folds to nothing in 200ms on the kit curve, then the promise resolves (at once with
 * reduced motion). If the refreshed page still shows the row, it comes back after a moment instead of staying hidden.
 *   await action(); await leaveRow(rowElement); router.refresh();
 * A row that arrives can carry data-new="" for a 200ms fade-in (corp.css). */
export function leaveRow(row: Element | null | undefined): Promise<void> {
  if (!(row instanceof HTMLElement) || typeof window === "undefined") return Promise.resolve();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof row.animate !== "function") return Promise.resolve();
  const height = row.getBoundingClientRect().height;
  row.setAttribute("data-leaving", "");
  const motion = row.animate(
    [{ opacity: 1, height: `${height}px`, minHeight: "0px" }, { opacity: 0, height: "0px", minHeight: "0px", paddingTop: "0px", paddingBottom: "0px" }],
    { duration: 200, easing: "cubic-bezier(.32, .72, 0, 1)", fill: "forwards" });
  // Safety: a row the refresh kept (the change did not remove it) is shown again rather than left folded.
  window.setTimeout(() => { if (row.isConnected) { motion.cancel(); row.removeAttribute("data-leaving"); } }, 2400);
  return motion.finished.then(() => undefined, () => undefined);
}
