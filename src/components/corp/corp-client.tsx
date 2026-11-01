"use client";

import "./corp.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

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

/** Placeholder shapes for a page that is loading: the real title at once, the shapes after 120ms (CSS). */
type SkelShape = { title?: string; parts: ("seg" | "card" | "rows" | "tall")[]; rows?: number };
const SHAPES: Record<string, SkelShape> = {
  home: { parts: ["card", "card", "rows"], rows: 3 },
  schedule: { title: "Schedule", parts: ["card", "tall"] },
  timecards: { title: "Timecards", parts: ["seg", "card", "rows"], rows: 4 },
  payroll: { title: "Payroll", parts: ["card", "rows"], rows: 3 },
  team: { title: "Team", parts: ["seg", "rows"], rows: 8 },
  inbox: { title: "Things to do", parts: ["rows", "rows"], rows: 3 },
  mytime: { title: "Time", parts: ["card", "rows"], rows: 4 },
  mypay: { parts: ["card", "rows"], rows: 3 },
  hub: { title: "Requests", parts: ["rows"], rows: 4 },
  settings: { title: "Settings", parts: ["rows", "rows"], rows: 4 },
  profile: { parts: ["card", "rows"], rows: 4 },
  notifications: { title: "Notifications", parts: ["seg", "rows"], rows: 4 },
  updates: { title: "Updates", parts: ["seg", "rows"], rows: 3 },
};

/** P3/P7: the corporate loading placeholder. After 2.5s without the page, it says so and offers Try again; if the page
 * then arrives it simply replaces this. The wording never claims a failure it can't know about. */
export function CorpSkeleton({ route, label }: { route?: string; label: string }) {
  const [slow, setSlow] = useState(false);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => { setOffline(typeof navigator !== "undefined" && navigator.onLine === false); setSlow(true); }, 2500);
    return () => window.clearTimeout(timer);
  }, []);
  const shape = (route && SHAPES[route]) || { parts: ["card", "rows"], rows: 4 } as SkelShape;
  if (slow) return <div className="c-page c-embed c-skel c-skel--slow" data-corp="">
    <section className="c-card c-error-card" role="alert">
      {/* Round 2 copy (row 180): one sentence that reads right for every page name, singular or plural. */}
      <span className="c-error-card__title">{offline ? "You’re offline" : "This is taking longer than usual"}</span>
      <span className="c-error-card__body">{offline ? "Reconnect, then try again." : "Check your connection, then try again."}</span>
      <span className="c-error-card__action"><CorpRetryButton /></span>
    </section>
  </div>;
  let key = 0;
  return <div className="c-page c-embed c-skel" data-corp="" aria-hidden="true">
    {shape.title ? <div className="c-title"><div className="c-title__row"><span className="c-skel__title">{shape.title}</span></div></div> : <span className="c-skel__bar c-skel__bar--title" />}
    <div className="c-skel__shapes">
      {shape.parts.map(part => part === "seg" ? <span key={key++} className="c-skel__seg" />
        : part === "rows" ? <span key={key++} className="c-skel__shape">{Array.from({ length: shape.rows ?? 4 }, (_, index) => <span key={index} className="c-skel__row"><i /><span><b /><b /></span></span>)}</span>
          : <span key={key++} className={part === "tall" ? "c-skel__shape c-skel__shape--tall" : "c-skel__shape c-skel__shape--card"} />)}
    </div>
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
