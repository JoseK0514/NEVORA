'use client';
import {useSyncExternalStore} from 'react';
export const EMPLOYEE_MOBILE_QUERY = '(max-width: 767px), (max-height: 500px) and (orientation: landscape) and (pointer: coarse)';
function subscribe(changed:()=>void){const media=window.matchMedia(EMPLOYEE_MOBILE_QUERY);media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed);}
export function useEmployeeMobile(){return useSyncExternalStore(subscribe,()=>window.matchMedia(EMPLOYEE_MOBILE_QUERY).matches,()=>false);}
