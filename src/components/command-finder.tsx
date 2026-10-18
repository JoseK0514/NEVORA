"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { MagnifyingGlassIcon, XCircleIcon } from "@phosphor-icons/react/ssr";
import type { UserRole } from "@/lib/domain";
import type { PayrollCapabilities } from "@/lib/payroll/contracts";
import { finderItems, rankFinder, type FinderData } from "@/lib/finder";
import type { NavContext } from "@/lib/navigation";

/** `offline` is client-only: the phone knew it had no connection, so no request was sent. */
type Remote = { state: "idle" | "loading" | "ready" | "unavailable" | "offline"; data: FinderData | null; at: number };
const FRESH_MS = 60_000;
const DESKTOP_PLACEHOLDER = "Search pages, people and places";
/** The phone chrome query (portal-gusto.css): phones, and phones turned sideways. */
const PHONE_QUERY = "(max-width: 760px), (max-width: 900px) and (max-height: 430px) and (orientation: landscape) and (pointer: coarse)";

/** Other entries (More › Search) open the one finder dialog through this event. */
export const OPEN_FINDER_EVENT = "nevora:open-finder";
export type OpenFinderDetail = { returnFocusTo?: HTMLElement | null };

/** Status line, checked in this order: a query that couldn't be checked against
 * people never reads "No matches.". */
export function finderStatus(state: Remote["state"], query: string, resultCount: number): string {
  if (state === "offline") return "People and places unavailable offline";
  if (state === "unavailable") return "People and places are unavailable right now.";
  if (state === "loading") return "Loading people and places…";
  if (state === "ready" && query.trim() && !resultCount) return "No matches.";
  return "";
}

/** ⌘K / Ctrl+K finder for managers: pages, common actions, people and
 * locations. Opens instantly (no animation: it's a keyboard tool used often),
 * traps focus in a native modal dialog and returns focus on close. On phones
 * the same dialog fills the screen and opens from the header or More. */
export function CommandFinder({ role, payroll, context }: { role: UserRole; payroll?: PayrollCapabilities; context?: NavContext }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [placeholder, setPlaceholder] = useState(DESKTOP_PLACEHOLDER);
  const [remote, setRemote] = useState<Remote>({ state: "idle", data: null, at: 0 });
  const hint = useRef<HTMLElement>(null);

  const results = useMemo(() => rankFinder(finderItems(role, payroll, remote.data, context), query), [role, payroll, remote.data, query, context]);

  function load() {
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
    returnTo.current = from ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setQuery(""); setActive(0);
    setPlaceholder(window.matchMedia(PHONE_QUERY).matches ? "Search" : DESKTOP_PLACEHOLDER);
    if (navigator.onLine === false) setRemote({ state: "offline", data: null, at: 0 });
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
    if (hint.current && !/Mac|iPhone|iPad/.test(navigator.platform)) hint.current.textContent = "Ctrl K";
    const shortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); if (dialog.current?.open) close(); else open(); }
    };
    const fromElsewhere = (event: Event) => open((event as CustomEvent<OpenFinderDetail>).detail?.returnFocusTo);
    const offline = () => { if (dialog.current?.open) setRemote({ state: "offline", data: null, at: 0 }); };
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
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(index => Math.min(results.length - 1, index + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(index => Math.max(0, index - 1)); }
    else if (event.key === "Enter") { event.preventDefault(); go(active); }
  }
  const current = Math.min(active, Math.max(0, results.length - 1));

  return <>
    <button type="button" className="command-finder-trigger" onClick={event => open(event.currentTarget)} aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K">
      <MagnifyingGlassIcon size={18} aria-hidden="true" /><span>Search</span><kbd ref={hint} aria-hidden="true">⌘K</kbd>
    </button>
    <dialog ref={dialog} className="command-finder" aria-label="Find a page, person or place" onClose={closed}
      onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="command-finder-panel">
        <div className="command-finder-search">
          <div className="command-finder-field">
            <MagnifyingGlassIcon size={20} aria-hidden="true" />
            <input ref={input} type="text" role="combobox" aria-expanded="true" aria-controls="command-finder-results" aria-autocomplete="list"
              aria-activedescendant={results[current] ? `command-finder-${current}` : undefined} aria-label="Search pages, people and places"
              placeholder={placeholder} value={query} autoComplete="off" spellCheck={false} enterKeyHint="go" autoCapitalize="none" autoCorrect="off"
              onChange={event => { setQuery(event.target.value); setActive(0); }} onKeyDown={keys} />
            {query ? <button type="button" className="command-finder-clear" aria-label="Clear search" onClick={clear}>
              <XCircleIcon size={20} weight="fill" aria-hidden="true" />
            </button> : null}
          </div>
          <button type="button" className="command-finder-close" aria-label="Close search" onClick={close}>Close</button>
        </div>
        <p className="command-finder-status" role="status">{finderStatus(remote.state, query, results.length)}</p>
        <ul id="command-finder-results" role="listbox" aria-label="Results" className="command-finder-results">
          {results.map((item, index) => <li key={item.id} id={`command-finder-${index}`} role="option" aria-selected={index === current}
            data-group={item.group} onMouseMove={() => setActive(index)} onClick={() => go(index)}>
            {index === 0 || results[index - 1].group !== item.group ? <span className="command-finder-group" aria-hidden="true">{item.group}</span> : null}
            <span className="command-finder-label">{item.label}</span>{item.detail ? <span className="command-finder-detail">{item.detail}</span> : null}
          </li>)}
        </ul>
        <p className="command-finder-hint" aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close</p>
      </div>
    </dialog>
  </>;
}
