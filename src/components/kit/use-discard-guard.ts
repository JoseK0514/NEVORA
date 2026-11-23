'use client';

import {useCallback, useContext, useEffect, useRef, useState} from 'react';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {onRouterTransition} from '@/lib/navigation-coordinator';

/* "Discard changes?" (Jose, Nov 21, 2026): leaving an Owner or Manager form with edits that are not saved asks first.
 * Client-side only: nothing here posts, reads or changes what a form sends.
 *
 * One hub per window holds every form that guards (a page may mount several). While none is dirty it listens to
 * nothing. While one is dirty it:
 *  - answers `beforeunload`, so closing the tab, a reload or a browser navigation gets the browser's own prompt;
 *  - catches a click on a same-origin link anywhere in the document (capture phase), before the router sees it;
 *  - catches the browser's Back and Forward: stopped before it happens through the Navigation API where the browser
 *    has it (the address never changes); otherwise on popstate (capture phase), where the address is put back. Either
 *    way the question is asked. In Chromium with Next 16 the router's own popstate listener runs before this one
 *    (seen Nov 21, 2026), so there the Navigation API is the path that works;
 *  - takes the leave buttons a form owns through `leave(run)`.
 * "Discard changes" continues to the remembered place with the guard released; "Keep editing" changes nothing.
 * It never asks for a navigation the app itself starts (router.push or replace after a save, a server redirect, the
 * sign-in redirect of an ended session): those are not link clicks or history moves, and `beforeunload` stands down
 * for the few seconds after the router starts one, in case it ends as a browser navigation. */

/** How long "Discard changes" keeps the guard down, in case the navigation it started never commits (offline). */
export const DISCARD_RELEASE_MS = 8000;
/** How long `beforeunload` stands down after the router starts a navigation to another page. */
export const ROUTER_PASS_MS = 5000;
/** How long the popstate of the guard's own "put the address back" is expected. */
const RESTORE_MS = 2000;

type Here = {origin: string; pathname: string; search: string; href: string};
type AnchorLike = {getAttribute(name: string): string | null; hasAttribute(name: string): boolean; closest(selector: string): unknown};
export type ClickLike = {button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented: boolean; target: unknown};

/** The in-app address a click would leave for, or null when the click is not the guard's business: another button or
 * a modified click (a new tab), a link that opens elsewhere or downloads, another origin (`beforeunload` asks there),
 * this same page (a #hash link), a link that acts as a button, a link marked as the form's own control
 * (`data-discard-skip` on it or around it: step controls, the question itself), and the way to sign in. */
export function guardedHref(event: ClickLike, here: Here): string | null {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const target = event.target as {closest?: (selector: string) => unknown} | null;
  const anchor = (typeof target?.closest === 'function' ? target.closest('a[href]') : null) as AnchorLike | null;
  if (!anchor) return null;
  if (anchor.closest('[data-discard-skip]')) return null;
  if (anchor.getAttribute('role') === 'button') return null;
  const opens = anchor.getAttribute('target');
  if (opens && opens !== '_self') return null;
  if (anchor.hasAttribute('download')) return null;
  let url: URL;
  try { url = new URL(anchor.getAttribute('href') ?? '', here.href); } catch { return null; }
  if (url.origin !== here.origin) return null;
  if (url.pathname === here.pathname && url.search === here.search) return null;
  if (url.pathname === '/login') return null;
  return url.pathname + url.search + url.hash;
}

/* ---- Dirty from the form's own fields (for a form that keeps no "dirty" of its own) ---- */

export type ControlLike = {
  name?: string; type?: string; value?: string; defaultValue?: string; checked?: boolean; defaultChecked?: boolean;
  options?: ArrayLike<{value: string; selected: boolean}>;
  hasAttribute?: (name: string) => boolean;
};
const NOT_TYPED = new Set(['hidden', 'file', 'submit', 'button', 'reset', 'image', 'fieldset', 'output']);
const counts = (control: ControlLike) => !!control.name && !NOT_TYPED.has(control.type ?? '') && !control.hasAttribute?.('data-discard-skip');
const boxed = (control: ControlLike) => control.type === 'checkbox' || control.type === 'radio';
const chosen = (control: ControlLike) => Array.from(control.options ?? []).filter(option => option.selected).map(option => option.value).join('\u0001');

/** What each named field holds, keyed by its name and its place among the fields of that name. Hidden fields, file
 * inputs and buttons are left out. `starting` reads what the form was rendered with (a text field's default and a
 * box's default tick; a select has no dependable default under React, so it is read as it stands). */
export function fieldStates(controls: Iterable<ControlLike>, starting = false): Map<string, string> {
  const states = new Map<string, string>(), seen = new Map<string, number>();
  for (const control of controls) {
    if (!counts(control)) continue;
    const nth = seen.get(control.name!) ?? 0;
    seen.set(control.name!, nth + 1);
    const state = boxed(control) ? ((starting ? control.defaultChecked : control.checked) ? '1' : '0')
      : control.options ? chosen(control)
      : (starting ? control.defaultValue : control.value) ?? '';
    states.set(`${control.name}#${nth}`, state);
  }
  return states;
}

/** A field differs from where it started. A field that appeared later is compared with its own default; one that has
 * gone is not counted. A field put back to its starting value is clean again. */
export function fieldsDiffer(controls: Iterable<ControlLike>, baseline: ReadonlyMap<string, string>): boolean {
  const list = Array.from(controls), now = fieldStates(list);
  let own: Map<string, string> | null = null;
  for (const [key, state] of now) {
    const base = baseline.has(key) ? baseline.get(key) : (own ??= fieldStates(list, true)).get(key);
    if (base !== state) return true;
  }
  return false;
}

/* ---- The hub ---- */

type Listener = (event: never) => void;
type Target = {addEventListener(type: string, listener: Listener, capture?: boolean): void; removeEventListener(type: string, listener: Listener, capture?: boolean): void};
type Focusable = {focus(options?: {preventScroll?: boolean}): void; isConnected?: boolean};
export type DiscardEnv = {
  win: Target & {location: Here; history: {go(delta: number): void}; navigation?: Target & {currentEntry?: {index: number} | null}};
  doc: Target & {activeElement?: unknown};
  onRouterTransition(listener: (href: string) => void): () => void;
  now(): number;
};
export type GuardEntry = {dirty: boolean; navigate(href: string): void; ask(asking: boolean): void};
type Destination = {kind: 'href'; href: string} | {kind: 'back'; delta: number} | {kind: 'run'; run: () => void};

export function createDiscardHub(env: DiscardEnv) {
  const entries = new Set<GuardEntry>();
  let installed = false, stopRouter: (() => void) | null = null;
  let pending: {owner: GuardEntry; to: Destination; focus: Focusable | null} | null = null;
  let releasedUntil = 0, passUntil = 0, restoreUntil = 0;
  // Where the window was before the history move being handled: its place in the history (when the browser says) and
  // its address.
  let from: {index: number | null; address: string} = {index: null, address: ''};

  const address = () => env.win.location.pathname + env.win.location.search;
  const index = () => { const entry = env.win.navigation?.currentEntry; return entry && typeof entry.index === 'number' ? entry.index : null; };
  const owner = () => { for (const entry of entries) if (entry.dirty) return entry; return null; };
  const guarding = () => owner() !== null && env.now() >= releasedUntil;

  function ask(to: Destination) {
    const entry = owner();
    if (!entry) return;
    if (pending) { pending.to = to; return; }
    const active = env.doc.activeElement as Focusable | null;
    pending = {owner: entry, to, focus: active && typeof active.focus === 'function' ? active : null};
    entry.ask(true);
  }
  function settle() { const was = pending; pending = null; was?.owner.ask(false); return was; }

  const unload = (event: {preventDefault(): void; returnValue?: unknown}) => {
    if (!guarding() || env.now() < passUntil) return;
    event.preventDefault();
    event.returnValue = '';
  };
  const click = (event: ClickLike & {preventDefault(): void; stopPropagation(): void}) => {
    if (!guarding()) return;
    const href = guardedHref(event, env.win.location);
    if (!href) return;
    event.preventDefault();
    event.stopPropagation();
    ask({kind: 'href', href});
  };
  const pop = (event: {stopImmediatePropagation(): void}) => {
    const before = from, at = index();
    from = {index: at, address: address()};
    if (env.now() < restoreUntil) { restoreUntil = 0; from = before.index === null ? before : from; event.stopImmediatePropagation(); return; }
    if (!guarding()) return;
    // Another entry of this same page (a #hash): nothing is left.
    if (address() === before.address) return;
    event.stopImmediatePropagation();
    const delta = at !== null && before.index !== null && at !== before.index ? at - before.index : -1;
    from = before;
    restoreUntil = env.now() + RESTORE_MS;
    env.win.history.go(-delta);
    ask({kind: 'back', delta});
  };
  // Where the browser has the Navigation API (Chromium, Safari 26.2, Firefox 147) a Back or Forward inside the app is
  // stopped before it happens: the address never changes and the router never hears of it. The browser allows that
  // once per press or tap on the page, so nobody can be held on a page; a move it will not let be stopped, and a
  // browser without the API, fall to `pop` below.
  const traverse = (event: {navigationType?: string; cancelable?: boolean; preventDefault(): void; destination?: {url?: string; index?: number; sameDocument?: boolean}}) => {
    if (event.navigationType !== 'traverse' || !event.cancelable || event.destination?.sameDocument === false || !guarding()) return;
    try { const to = new URL(event.destination?.url ?? ''); if (to.pathname + to.search === address()) return; } catch { return; }
    const at = index(), goal = event.destination?.index;
    event.preventDefault();
    ask({kind: 'back', delta: at !== null && typeof goal === 'number' && goal >= 0 && goal !== at ? goal - at : -1});
  };
  const moved = (event: {navigationType?: string; from?: {index?: number; url?: string | null}}) => {
    // The browser says where the window was before each history move: exact, also after the form's own pushes. Only a
    // move counts: the router rewrites the entry it lands on (a replace) before popstate fires, and that is not a move.
    if (event.navigationType !== 'traverse' || typeof event.from?.index !== 'number' || env.now() < restoreUntil) return;
    let was = from.address;
    try { if (event.from.url) { const url = new URL(event.from.url); was = url.pathname + url.search; } } catch { /* keep */ }
    from = {index: event.from.index, address: was};
  };
  const routed = (href: string) => {
    let url: URL;
    try { url = new URL(href, env.win.location.href); } catch { return; }
    if (url.origin !== env.win.location.origin) return;
    // The app is navigating by itself (a save's redirect, an ended session): the browser's prompt stands down.
    if (url.pathname !== env.win.location.pathname) passUntil = env.now() + ROUTER_PASS_MS;
    else if (!env.win.navigation) from = {index: null, address: url.pathname + url.search};
  };

  function sync() {
    const dirty = owner() !== null;
    if (dirty && !installed) {
      installed = true;
      from = {index: index(), address: address()};
      env.win.addEventListener('beforeunload', unload as Listener);
      env.doc.addEventListener('click', click as Listener, true);
      env.win.addEventListener('popstate', pop as Listener, true);
      env.win.navigation?.addEventListener('navigate', traverse as Listener);
      env.win.navigation?.addEventListener('currententrychange', moved as Listener);
      stopRouter = env.onRouterTransition(routed);
    } else if (!dirty && installed) {
      installed = false;
      env.win.removeEventListener('beforeunload', unload as Listener);
      env.doc.removeEventListener('click', click as Listener, true);
      env.win.removeEventListener('popstate', pop as Listener, true);
      env.win.navigation?.removeEventListener('navigate', traverse as Listener);
      env.win.navigation?.removeEventListener('currententrychange', moved as Listener);
      stopRouter?.(); stopRouter = null;
      releasedUntil = 0; passUntil = 0;
    }
    if (pending && !pending.owner.dirty) settle();
  }

  return {
    add(entry: GuardEntry) { entries.add(entry); sync(); return entry; },
    remove(entry: GuardEntry) { entry.dirty = false; entries.delete(entry); sync(); },
    setDirty(entry: GuardEntry, dirty: boolean) {
      if (entry.dirty === dirty) return;
      entry.dirty = dirty;
      // A form that is dirty again after a release (a save, a discard that went nowhere) guards again.
      if (dirty && !pending) releasedUntil = 0;
      sync();
    },
    /** "Keep editing": the form is as it was and focus returns to where it was. */
    keep() {
      const was = settle();
      if (was?.focus && was.focus.isConnected !== false) { try { was.focus.focus({preventScroll: true}); } catch { /* gone */ } }
    },
    /** "Discard changes": on to the remembered place, with the guard down. */
    discard() {
      const was = settle();
      if (!was) return;
      releasedUntil = env.now() + DISCARD_RELEASE_MS;
      if (was.to.kind === 'href') was.owner.navigate(was.to.href);
      else if (was.to.kind === 'back') env.win.history.go(was.to.delta);
      else was.to.run();
    },
    /** A leave the form (or the shell) starts itself: asked first while a form is dirty, run at once otherwise. */
    leave(run: () => void) { if (guarding()) ask({kind: 'run', run}); else run(); },
    /** The app is leaving by its own decision (the session ended, the page is reloading for a new identity). */
    release() { settle(); releasedUntil = env.now() + DISCARD_RELEASE_MS; },
    guarding,
    installed: () => installed,
    asking: () => pending !== null,
  };
}
export type DiscardHub = ReturnType<typeof createDiscardHub>;

let hub: DiscardHub | null = null;
function windowHub(): DiscardHub | null {
  if (typeof window === 'undefined') return null;
  hub ??= createDiscardHub({
    win: window as unknown as DiscardEnv['win'], doc: document as unknown as DiscardEnv['doc'],
    onRouterTransition, now: () => Date.now(),
  });
  return hub;
}

/** A leave started outside any form (the finder): asks first while a form on the page is dirty. */
export function leaveWithDiscardGuard(run: () => void) { const current = windowHub(); if (current) current.leave(run); else run(); }
/** The app itself is leaving the page (an ended session, an identity reload): no question, no browser prompt. */
export function releaseDiscardGuards() { hub?.release(); }

/** Guard a form's unsaved edits. `asking` opens the question (`DiscardDialog`); `leave` wraps a leave the form owns. */
export function useDiscardGuard(dirty: boolean) {
  // The router when there is one (`useRouter` throws where a form is rendered without the app router, as in unit tests).
  const router = useContext(AppRouterContext);
  const [asking, setAsking] = useState(false);
  const entry = useRef<GuardEntry | null>(null);
  useEffect(() => {
    const current = windowHub();
    if (!current) return;
    const mine = current.add({dirty: false, navigate: href => { if (router) router.push(href); else window.location.assign(href); }, ask: setAsking});
    entry.current = mine;
    return () => { current.remove(mine); entry.current = null; setAsking(false); };
  }, [router]);
  useEffect(() => { if (entry.current) windowHub()?.setDirty(entry.current, dirty); }, [dirty, router]);
  const keep = useCallback(() => { windowHub()?.keep(); }, []);
  const discard = useCallback(() => { windowHub()?.discard(); }, []);
  const leave = useCallback((run: () => void) => leaveWithDiscardGuard(run), []);
  return {asking, keep, discard, leave};
}

/** Dirty for a form that keeps none: its named fields against where they started, checked on input and change.
 * `resetKey` changes when the form is saved (the fields as they stand become the start); `off` holds it clean. */
export function useFormDirty(form: () => HTMLFormElement | null, {off = false, resetKey}: {off?: boolean; resetKey?: unknown} = {}) {
  const [dirty, setDirty] = useState(false);
  const find = useRef(form);
  useEffect(() => { find.current = form; });
  const baseline = useRef<Map<string, string> | null>(null);
  const controls = () => Array.from(find.current()?.elements ?? []) as unknown as ControlLike[];
  // The start: what the form was rendered with on mount; what the fields hold after a save.
  useEffect(() => { baseline.current = fieldStates(controls(), baseline.current === null); }, [resetKey]);
  useEffect(() => {
    const node = find.current();
    if (!node || off) { setDirty(false); return; }
    const check = () => setDirty(baseline.current !== null && fieldsDiffer(controls(), baseline.current));
    const later = () => { window.setTimeout(check, 0); };
    check();
    node.addEventListener('input', check);
    node.addEventListener('change', check);
    node.addEventListener('reset', later);
    node.addEventListener('click', later);
    return () => { node.removeEventListener('input', check); node.removeEventListener('change', check); node.removeEventListener('reset', later); node.removeEventListener('click', later); };
  }, [off, resetKey]);
  return dirty && !off;
}
