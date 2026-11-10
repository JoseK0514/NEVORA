"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { MagnifyingGlassIcon, XCircleIcon } from "@phosphor-icons/react/ssr";
import type { UserRole } from "@/lib/domain";
import { B_WIDE } from "@/lib/b-viewport";
import type { PayrollCapabilities } from "@/lib/payroll/contracts";
import { finderItems, finderOverflow, rankFinder, type FinderData } from "@/lib/finder";
import { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
import { FileIcon } from "@phosphor-icons/react/dist/ssr/File";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import type { NavContext } from "@/lib/navigation";

/** `offline` is client-only: the phone knew it had no connection, so no request was sent. */
type Remote = { state: "idle" | "loading" | "ready" | "unavailable" | "offline"; data: FinderData | null; at: number };
const FRESH_MS = 60_000;
const DESKTOP_PLACEHOLDER = "Search pages, people and places";
/** The phone chrome query (portal-gusto.css). A phone turned sideways has the tablet layout since review B8 (NV-274). */
const PHONE_QUERY = "(max-width: 760px)";

/** Other entries (More › Search) open the one finder dialog through this event. */
export const OPEN_FINDER_EVENT = "nevora:open-finder";
export type OpenFinderDetail = { returnFocusTo?: HTMLElement | null };

/** Status line, checked in this order: a query that couldn't be checked against
 * people never reads "No matches.". */
const groupKey = (group: string) => group.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export function finderStatus(state: Remote["state"], query: string, resultCount: number): string {
  if (state === "offline") return "People and places unavailable offline";
  if (state === "unavailable") return "People and places are unavailable right now.";
  if (state === "loading") return "Loading people and places…";
  if (state === "ready" && query.trim() && !resultCount) return "No matches.";
  return "";
}

/** Upscale S1: where the typed text appears in a result's label, as [start, end) ranges to set in 600. The finder ranks a
 * label that starts with the query, then a word that does, then the text anywhere (lib/finder), so the first word-start
 * match wins over an earlier mid-word one. Several typed words ("add sh") mark each word they start. */
export function finderMatches(label: string, rawQuery: string): Array<[number, number]> {
  const query = rawQuery.trim().toLocaleLowerCase();
  const lower = label.toLocaleLowerCase();
  // A lowercase form of a different length (rare letters) cannot be mapped back onto the label: no emphasis.
  if (!query || lower.length !== label.length) return [];
  const startsWord = (index: number) => index === 0 || !/[\p{L}\p{N}]/u.test(lower[index - 1]);
  const find = (part: string) => {
    let first = -1;
    for (let index = lower.indexOf(part); index >= 0; index = lower.indexOf(part, index + 1)) {
      if (startsWord(index)) return index;
      if (first < 0) first = index;
    }
    return first;
  };
  const whole = find(query);
  if (whole >= 0) return [[whole, whole + query.length]];
  const ranges: Array<[number, number]> = [];
  for (const part of query.split(/[^\p{L}\p{N}]+/u).filter(Boolean)) {
    for (let index = lower.indexOf(part); index >= 0; index = lower.indexOf(part, index + 1)) {
      if (startsWord(index) && !ranges.some(([start, end]) => index < end && index + part.length > start)) { ranges.push([index, index + part.length]); break; }
    }
  }
  return ranges.sort((a, b) => a[0] - b[0]);
}

function emphasise(label: string, query: string): ReactNode {
  const ranges = finderMatches(label, query);
  if (!ranges.length) return label;
  const parts: ReactNode[] = [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) parts.push(label.slice(at, start));
    parts.push(<b key={start} className="command-finder-match">{label.slice(start, end)}</b>);
    at = end;
  }
  if (at < label.length) parts.push(label.slice(at));
  return parts;
}

/** ⌘K / Ctrl+K finder for managers: pages, common actions, people and
 * locations. Opens instantly (no animation: it's a keyboard tool used often),
 * traps focus in a native modal dialog and returns focus on close. On phones
 * the same dialog fills the screen and opens from the header or More. */
/** "Maria Rivera" → "MR", for a person's row. */
const finderInitials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();

export function CommandFinder({ role, payroll, context }: { role: UserRole; payroll?: PayrollCapabilities; context?: NavContext }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  // On a phone the current result is tinted only once the arrow keys move it (upscale M10); a tap needs no highlight.
  const [keyboard, setKeyboard] = useState(false);
  const [placeholder, setPlaceholder] = useState(DESKTOP_PLACEHOLDER);
  const [remote, setRemote] = useState<Remote>({ state: "idle", data: null, at: 0 });
  const hint = useRef<HTMLElement>(null);

  // Review B2 (NV-216): an Employee's or Lead's empty finder lists every one of their pages (they fit), not the first six.
  const perGroup = role === "EMPLOYEE" || role === "LEAD" ? 16 : 6;
  const all = useMemo(() => finderItems(role, payroll, remote.data, context), [role, payroll, remote.data, context]);
  const results = useMemo(() => rankFinder(all, query, perGroup), [all, query, perGroup]);
  // Review B5 (NV-216): a typed query that matches more than a group shows says so ("6 of 11 people · keep typing").
  const overflow = useMemo(() => finderOverflow(all, query, perGroup), [all, query, perGroup]);

  // Employee desktop (Nov 8, 2026): an Employee's finder lists their own pages only, so it reads nothing and opens only
  // where its top-bar button shows (desktop and tablets, not a phone held sideways).
  const own = role === "EMPLOYEE" || role === "LEAD";
  function load() {
    if (own) { setRemote({ state: "ready", data: null, at: Date.now() }); return; }
    if (remote.state === "loading" || (remote.state === "ready" && Date.now() - remote.at < FRESH_MS)) return;
    setRemote(previous => ({ ...previous, state: "loading" }));
    fetch("/api/manager/finder", { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json", "X-Nevora-Finder": "1" } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error("unavailable")))
      .then((body: { state: string } & Partial<FinderData>) => setRemote(body.state === "ready" ? { state: "ready", data: { people: body.people ?? [], locations: body.locations ?? [] }, at: Date.now() } : { state: "unavailable", data: null, at: 0 }))
      .catch(() => setRemote({ state: "unavailable", data: null, at: 0 }));
  }
  function open(from?: HTMLElement | null) {
    const element = dialog.current;
    if (!element || element.open) return;
    if (own && !window.matchMedia(B_WIDE).matches) return;
    returnTo.current = from ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setQuery(""); setActive(0); setKeyboard(false);
    setPlaceholder(window.matchMedia(PHONE_QUERY).matches ? "Search" : own ? "Search your pages" : DESKTOP_PLACEHOLDER);
    if (navigator.onLine === false && !own) setRemote({ state: "offline", data: null, at: 0 });
    else load();
    element.showModal();
    // Focus inside the same tap, so iOS raises the keyboard.
    input.current?.focus();
  }
  function close() { dialog.current?.close(); }
  function closed() {
    setQuery("");
    const target = returnTo.current;
    returnTo.current = null;
    // The opener can be gone (a More item hides with its menu); its own entry then names a fallback.
    if (target?.isConnected && target.getClientRects().length && document.activeElement !== target) target.focus({ preventScroll: true });
  }
  function go(index: number) {
    const item = results[index];
    if (!item) return;
    close();
    router.push(item.href);
  }
  function clear() {
    setQuery(""); setActive(0);
    input.current?.focus();
  }

  useEffect(() => {
    // Review B2 (NV-323): the hint is filled once on mount for this device (it no longer swaps from ⌘K on Windows and Linux).
    if (hint.current) hint.current.textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K";
    const shortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); if (dialog.current?.open) close(); else open(); }
    };
    const fromElsewhere = (event: Event) => open((event as CustomEvent<OpenFinderDetail>).detail?.returnFocusTo);
    const offline = () => { if (dialog.current?.open && !own) setRemote({ state: "offline", data: null, at: 0 }); };
    const online = () => { if (dialog.current?.open) load(); };
    window.addEventListener("keydown", shortcut);
    window.addEventListener(OPEN_FINDER_EVENT, fromElsewhere);
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("keydown", shortcut);
      window.removeEventListener(OPEN_FINDER_EVENT, fromElsewhere);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  });

  function keys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setKeyboard(true); setActive(index => Math.min(results.length - 1, index + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setKeyboard(true); setActive(index => Math.max(0, index - 1)); }
    else if (event.key === "Enter") { event.preventDefault(); go(active); }
  }
  const current = Math.min(active, Math.max(0, results.length - 1));
  // Review B2 (NV-062): the arrow keys keep the current option in view inside the scrolling list.
  useEffect(() => { if (keyboard) document.getElementById(`command-finder-${current}`)?.scrollIntoView?.({ block: "nearest" }); }, [current, keyboard]);

  return <>
    <button type="button" className="command-finder-trigger" onClick={event => open(event.currentTarget)} aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K">
      <MagnifyingGlassIcon size={18} aria-hidden="true" /><span>Search</span><kbd ref={hint} aria-hidden="true" suppressHydrationWarning />
    </button>
    <dialog ref={dialog} className="command-finder" aria-label={own ? "Search your pages" : "Find a page, person or place"} onClose={closed}
      onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="command-finder-panel">
        <div className="command-finder-search">
          <div className="command-finder-field">
            <MagnifyingGlassIcon size={20} aria-hidden="true" />
            <input ref={input} type="text" role="combobox" aria-expanded="true" aria-controls="command-finder-results" aria-autocomplete="list"
              aria-activedescendant={results[current] ? `command-finder-${current}` : undefined} aria-label="Search pages, people and places"
              placeholder={placeholder} value={query} autoComplete="off" spellCheck={false} enterKeyHint="go" autoCapitalize="none" autoCorrect="off"
              onChange={event => { setQuery(event.target.value); setActive(0); setKeyboard(false); }} onKeyDown={keys} />
            {query ? <button type="button" className="command-finder-clear" aria-label="Clear search" onClick={clear}>
              <XCircleIcon size={20} weight="fill" aria-hidden="true" />
            </button> : null}
          </div>
          <button type="button" className="command-finder-close" aria-label="Close search" onClick={close}>Close</button>
        </div>
        <p className="command-finder-status" role="status">{finderStatus(remote.state, query, results.length)}</p>
        {/* Upscale S1: each group's heading is its own presentational row between the options, never inside the first
          option, so the selection tint covers one result only. The options keep their own names. */}
        <ul id="command-finder-results" role="listbox" aria-label="Results" className="command-finder-results" data-keyboard={keyboard || undefined}>
          {results.map((item, index) => <Fragment key={item.id}>
            {index === 0 || results[index - 1].group !== item.group ? <li role="presentation" aria-hidden="true" className="command-finder-group" id={`command-finder-group-${groupKey(item.group)}`}>{item.group}</li> : null}
            {/* Review B1 (NV-217): each option is described by its group ("Schedule, Actions" vs "Schedule, Pages"). */}
            <li id={`command-finder-${index}`} role="option" aria-selected={index === current} className="command-finder-option" aria-describedby={`command-finder-group-${groupKey(item.group)}`}
              data-group={item.group} onMouseMove={() => { setActive(index); setKeyboard(false); }} onClick={() => go(index)}>
              {/* Review B5 (NV-218): each row leads with its kind: a bolt for actions, a page, a person's initials, a pin. */}
              <span className="command-finder-ico" data-group={item.group} aria-hidden="true">{item.group === "Actions" ? <LightningIcon weight="bold" /> : item.group === "Pages" ? <FileIcon weight="bold" /> : item.group === "Locations" ? <MapPinIcon weight="bold" /> : finderInitials(item.label)}</span>
              <span className="command-finder-label"><span className="command-finder-text">{emphasise(item.label, query)}</span></span>{item.detail ? <span className="command-finder-detail">{item.detail}</span> : null}
            </li>
          </Fragment>)}
        </ul>
        {overflow.length ? <p className="command-finder-more">{overflow.map(entry => `${entry.shown} of ${entry.total} ${entry.group.toLowerCase()}`).join(" · ")} · keep typing to narrow</p> : null}
        <p className="command-finder-hint" aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close</p>
      </div>
    </dialog>
  </>;
}
