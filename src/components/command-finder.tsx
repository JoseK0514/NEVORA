"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";
import type { UserRole } from "@/lib/domain";
import type { PayrollCapabilities } from "@/lib/payroll/contracts";
import { finderItems, rankFinder, type FinderData } from "@/lib/finder";
import type { NavContext } from "@/lib/navigation";

type Remote = { state: "idle" | "loading" | "ready" | "unavailable"; data: FinderData | null; at: number };
const FRESH_MS = 60_000;

/** ⌘K / Ctrl+K finder for managers: pages, common actions, people and
 * locations. Opens instantly (no animation: it's a keyboard tool used often),
 * traps focus in a native modal dialog and returns focus on close. */
export function CommandFinder({ role, payroll, context }: { role: UserRole; payroll?: PayrollCapabilities; context?: NavContext }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
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
  function open() {
    const element = dialog.current;
    if (!element || element.open) return;
    setQuery(""); setActive(0); load();
    element.showModal();
    input.current?.focus();
  }
  function close() { dialog.current?.close(); }
  function go(index: number) {
    const item = results[index];
    if (!item) return;
    close();
    router.push(item.href);
  }

  useEffect(() => {
    if (hint.current && !/Mac|iPhone|iPad/.test(navigator.platform)) hint.current.textContent = "Ctrl K";
    const shortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); if (dialog.current?.open) close(); else open(); }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  });

  function keys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(index => Math.min(results.length - 1, index + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(index => Math.max(0, index - 1)); }
    else if (event.key === "Enter") { event.preventDefault(); go(active); }
  }
  const current = Math.min(active, Math.max(0, results.length - 1));

  return <>
    <button type="button" className="command-finder-trigger" onClick={open} aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K">
      <MagnifyingGlassIcon size={18} aria-hidden="true" /><span>Search</span><kbd ref={hint} aria-hidden="true">⌘K</kbd>
    </button>
    <dialog ref={dialog} className="command-finder" aria-label="Find a page, person or place" onClose={() => setQuery("")}
      onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="command-finder-panel">
        <div className="command-finder-search">
          <MagnifyingGlassIcon size={20} aria-hidden="true" />
          <input ref={input} type="text" role="combobox" aria-expanded="true" aria-controls="command-finder-results" aria-autocomplete="list"
            aria-activedescendant={results[current] ? `command-finder-${current}` : undefined} aria-label="Search pages, people and places"
            placeholder="Search pages, people and places" value={query} autoComplete="off" spellCheck={false}
            onChange={event => { setQuery(event.target.value); setActive(0); }} onKeyDown={keys} />
        </div>
        <ul id="command-finder-results" role="listbox" aria-label="Results" className="command-finder-results">
          {results.map((item, index) => <li key={item.id} id={`command-finder-${index}`} role="option" aria-selected={index === current}
            data-group={item.group} onMouseMove={() => setActive(index)} onClick={() => go(index)}>
            {index === 0 || results[index - 1].group !== item.group ? <span className="command-finder-group" aria-hidden="true">{item.group}</span> : null}
            <span className="command-finder-label">{item.label}</span>{item.detail ? <span className="command-finder-detail">{item.detail}</span> : null}
          </li>)}
        </ul>
        <p className="command-finder-status" role="status">
          {query.trim() && !results.length ? "No matches." : remote.state === "loading" ? "Loading people and places…" : remote.state === "unavailable" ? "People and places are unavailable right now." : ""}
        </p>
        <p className="command-finder-hint" aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close</p>
      </div>
    </dialog>
  </>;
}
