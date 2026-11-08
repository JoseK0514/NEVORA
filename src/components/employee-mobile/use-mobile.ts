'use client';
import {useSyncExternalStore} from 'react';
export const EMPLOYEE_MOBILE_QUERY = '(max-width: 767px), (max-height: 500px) and (orientation: landscape) and (pointer: coarse)';
function subscribe(changed:()=>void){const media=window.matchMedia(EMPLOYEE_MOBILE_QUERY);media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed);}
export function useEmployeeMobile(){return useSyncExternalStore(subscribe,()=>window.matchMedia(EMPLOYEE_MOBILE_QUERY).matches,()=>false);}
/* Employee desktop, Direction B (Jose approved Nov 8, 2026): an Employee's desktop (1024px and wider) shows the same Direction B
 * screens as the phone, so the pages whose B screen lives in the phone presentation (Requests, Pick up and swap, Time off,
 * Availability, the request forms, Updates and Notifications) take that presentation there too, with its own private reads
 * and operations, unchanged. Since Nov 8, 2026 tablets (768–1023px) and Leads too; a phone held sideways keeps the corporate
 * presentation. */
// Tablets (768–1023px) too since Nov 8, 2026 (Option B "small desktop"), except a phone held sideways.
const EMPLOYEE_DESKTOP_B_QUERY = '(min-width: 1024px), (min-width: 768px) and (min-height: 501px), (min-width: 768px) and (pointer: fine)';
function employeeB(){return window.matchMedia(EMPLOYEE_MOBILE_QUERY).matches||(window.matchMedia(EMPLOYEE_DESKTOP_B_QUERY).matches&&!!document.querySelector('.app-shell[data-nv-b][data-employee-mobile]'));}
function subscribeB(changed:()=>void){const media=[window.matchMedia(EMPLOYEE_MOBILE_QUERY),window.matchMedia(EMPLOYEE_DESKTOP_B_QUERY)];media.forEach(query=>query.addEventListener('change',changed));return()=>media.forEach(query=>query.removeEventListener('change',changed));}
/** True where an Employee sees the Direction B presentation: a phone, or an Employee's desktop. */
export function useEmployeeBScreen(){return useSyncExternalStore(subscribeB,employeeB,()=>false);}
