'use client';
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import './retry-label.css';

/** Try again's words on the screens outside the app shell (Nov 26, 2026). Both labels share one grid cell, so the button
 * keeps the width of the longer one before, during and after; the hidden one is visibility:hidden, so it is out of the
 * accessible name. While busy the arrow turns (only when motion is allowed); aria-busy on the button carries the state. */
export function RetryLabel({ busy, idle, working }: { busy: boolean; idle: string; working: string }) {
  return <span className="nv-retry">
    <span className="nv-retry__face" data-off={busy ? '' : undefined}><ArrowClockwiseIcon size={18} weight="bold" aria-hidden="true" />{idle}</span>
    <span className="nv-retry__face" data-off={busy ? undefined : ''} aria-hidden={busy ? undefined : true}><ArrowClockwiseIcon className="nv-retry__spin" size={18} weight="bold" aria-hidden="true" />{working}</span>
  </span>;
}
