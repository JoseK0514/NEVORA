'use client';

import {useEffect, useRef} from 'react';
import {toast} from './toaster';

/** UX-E-12: after "Offer it for cover" is sent from its full page, Schedule confirms it once ("Offered to your team").
 * The Toaster drops the one-time ?offered flag, so a reload doesn't repeat it. */
export function OfferedToast() {
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    // After the layout's Toaster is listening; once, even when an effect runs twice.
    const timer = window.setTimeout(() => { if (shown.current) return; shown.current = true; toast('Offered to your team'); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}
