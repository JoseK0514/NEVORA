'use client';

import {useEffect} from 'react';

/** Review B6 (NV-326): the Direction B cards' entrance plays on the first page of a session only. After it has played
 * (or on any later page load in the same tab session) the root carries `data-nv-entered`, and the B layers turn the
 * stagger off, so routine tab changes show the page at once. The hero never animates (employee-b-desktop.css). */
const KEY = 'nv-b-entered';
export function BEntrance() {
  useEffect(() => {
    const root = document.documentElement;
    let seen = false;
    try { seen = window.sessionStorage.getItem(KEY) === '1'; } catch { /* storage blocked: play once per page load */ }
    if (seen) { root.dataset.nvEntered = '1'; return; }
    try { window.sessionStorage.setItem(KEY, '1'); } catch { /* storage blocked */ }
    // Let this first entrance finish (300ms plus the 300ms last delay), then mark the session.
    const timer = window.setTimeout(() => { root.dataset.nvEntered = '1'; }, 700);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}
