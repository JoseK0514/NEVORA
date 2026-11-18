'use client';

import {useEffect} from 'react';

/* Phase 7 (Nov 17, 2026): a press from the keyboard shows the same feedback as a tap. `:active` covers a pointer and
 * Space on a button; Enter on a link, a row or a tab gets nothing from the browser. For 150ms after the key goes down the pressed control carries `data-b-pressed`, and b-motion.css styles it exactly like `:active`. */
const PRESSABLE = 'a[href], button, summary, [role="button"], [role="tab"], [role="menuitem"], [role="option"]';
const HOLD_MS = 150;

export function PressFeedback() {
  useEffect(() => {
    let pressed: HTMLElement | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const release = () => {
      if (timer !== undefined) { clearTimeout(timer); timer = undefined; }
      pressed?.removeAttribute('data-b-pressed');
      pressed = null;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>(PRESSABLE) : null;
      if (!target || target !== event.target || target.matches(':disabled, [aria-disabled="true"]')) return;
      // Space activates a link nowhere; a text field inside a label is not a press.
      if (event.key === ' ' && target.matches('a[href]')) return;
      release();
      pressed = target;
      target.setAttribute('data-b-pressed', '');
      timer = setTimeout(release, HOLD_MS);
    };
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('blur', release);
    return () => {
      release();
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('blur', release);
    };
  }, []);
  return null;
}
