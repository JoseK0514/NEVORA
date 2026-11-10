'use client';

import {useSyncExternalStore, type ReactNode} from 'react';
import {B_PHONE, B_WIDE} from '@/lib/b-viewport';

/* Direction B shows the phone screen below 768px and, for Employees and Leads, again from 768px (tablets, Nov 8; desktop (the desktop Direction B, Jose
 * approved Nov 8, 2026); the corporate layout shows from 768px to 1023px (CSS). Pieces that hold state (a shift's sheet,
 * the weekly confirmation form) must exist once, in the layout that shows, so they are mounted by viewport. The server and
 * the first client render use the corporate side, as before; the B side shows a static stand-in that looks the same until
 * the page hydrates. The queries are the CSS breakpoints, exactly; the desktop side needs the Employee Direction B shell
 * (data-nv-b with data-employee-mobile), so a Lead keeps the corporate layout there. */
const PHONE = B_PHONE;
// Desktop Direction B, tablets included since Nov 8, 2026 (Option B "small desktop"), and a phone held sideways since
// review B8 (NV-274): it gets the tablet layout.
const DESK = B_WIDE;
function bSide() {
  return window.matchMedia(PHONE).matches || (window.matchMedia(DESK).matches && !!document.querySelector('.app-shell[data-nv-b][data-employee-mobile]'));
}
function subscribe(changed: () => void) {
  const media = [window.matchMedia(PHONE), window.matchMedia(DESK)];
  media.forEach(query => query.addEventListener('change', changed));
  return () => media.forEach(query => query.removeEventListener('change', changed));
}
/** True where the Direction B screen shows: a phone, or an Employee's desktop. */
export function usePhone() { return useSyncExternalStore(subscribe, bSide, () => false); }

/** Where the B screen shows (a phone, an Employee's desktop): the live piece; elsewhere (and before hydration): the stand-in. */
export function PhoneOnly({children, fallback = null}: {children: ReactNode; fallback?: ReactNode}) {
  return usePhone() ? <>{children}</> : <>{fallback}</>;
}
/** Where the corporate layout shows (and before hydration): the live piece; where it is hidden: the stand-in. */
export function NotPhone({children, fallback = null}: {children: ReactNode; fallback?: ReactNode}) {
  return usePhone() ? <>{fallback}</> : <>{children}</>;
}
