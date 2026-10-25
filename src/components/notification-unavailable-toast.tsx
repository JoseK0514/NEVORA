'use client';
import { useEffect } from 'react';
import { toast } from './toaster';

/** F18: a notification that can no longer open lands on the list with ?unavailable=1. Say so once, then drop the flag so a
 * reload doesn't repeat it. A frame later, so the shell's toaster is listening. */
export function NotificationUnavailableToast() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('unavailable')) return;
    url.searchParams.delete('unavailable');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    // Not cancelled on cleanup: the flag is already gone, so a second (StrictMode) run can't repeat it.
    requestAnimationFrame(() => toast('That notification is no longer available.', 'info'));
  }, []);
  return null;
}
