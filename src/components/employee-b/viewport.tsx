'use client';

import {useSyncExternalStore, type ReactNode} from 'react';

/* Direction B shows the phone screen below 768px and the corporate layout from 768px up (CSS). Pieces that hold state
 * (a shift's sheet, the weekly confirmation form) must exist once, in the layout that shows, so they are mounted by
 * viewport. The server and the first client render use the corporate side, as before; the phone side shows a static
 * stand-in that looks the same until the page hydrates. The query is the CSS breakpoint, exactly. */
const PHONE = '(max-width: 767px)';
function subscribe(changed: () => void) { const media = window.matchMedia(PHONE); media.addEventListener('change', changed); return () => media.removeEventListener('change', changed); }
export function usePhone() { return useSyncExternalStore(subscribe, () => window.matchMedia(PHONE).matches, () => false); }

/** On a phone: the live piece; elsewhere (and before hydration): the stand-in. */
export function PhoneOnly({children, fallback = null}: {children: ReactNode; fallback?: ReactNode}) {
  return usePhone() ? <>{children}</> : <>{fallback}</>;
}
/** From 768px (and before hydration): the live piece; on a phone, where this layout is hidden: the stand-in. */
export function NotPhone({children, fallback = null}: {children: ReactNode; fallback?: ReactNode}) {
  return usePhone() ? <>{fallback}</> : <>{children}</>;
}
