'use client';
import {useSyncExternalStore} from 'react';
export const EMPLOYEE_MOBILE_QUERY = '(max-width: 760px), (max-width: 900px) and (max-height: 430px) and (orientation: landscape) and (pointer: coarse)';
function subscribe(changed:()=>void){const media=window.matchMedia(EMPLOYEE_MOBILE_QUERY);media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed);}
export function useEmployeeMobile(){return useSyncExternalStore(subscribe,()=>window.matchMedia(EMPLOYEE_MOBILE_QUERY).matches,()=>false);}
