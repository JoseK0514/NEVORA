'use client';
import {useCallback,useLayoutEffect,useRef,useSyncExternalStore} from 'react';

/** One operative form/controller. Desktop SSR stays original; mobile selects after hydration.
 * A breakpoint change keeps field values only in memory, restores them to the same IDs,
 * and dispatches input so existing password rules remain accurate. Never writes a URL/store. */
export function useMobilePresentation(enabled:boolean,fieldIds:string) {
 const saved=useRef<{id:string;value:string}[]>([]);
 const subscribe=useCallback((changed:()=>void)=>{
  if(!enabled)return ()=>{};
  const media=window.matchMedia('(max-width:767px)');
  const handle=()=>{saved.current=fieldIds.split(' ').flatMap(id=>{const input=document.getElementById(id);return input instanceof HTMLInputElement?[{id,value:input.value}]:[];});changed();};
  media.addEventListener('change',handle);return()=>media.removeEventListener('change',handle);
 },[enabled,fieldIds]);
 const snapshot=useCallback(()=>enabled&&window.matchMedia('(max-width:767px)').matches,[enabled]);
 const mobile=useSyncExternalStore(subscribe,snapshot,()=>false);
 useLayoutEffect(()=>{const fields=saved.current;saved.current=[];for(const {id,value} of fields){const input=document.getElementById(id);if(input instanceof HTMLInputElement){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}}},[mobile]);
 return mobile;
}
