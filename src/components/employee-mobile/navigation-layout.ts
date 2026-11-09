'use client';
import {useEffect} from 'react';
export function useEmployeeNavigationLayout(employee:boolean){
 useEffect(()=>{
  if(!employee||typeof ResizeObserver==='undefined')return;
  const shell=document.querySelector<HTMLElement>('[data-employee-mobile="true"]'),nav=shell?.querySelector<HTMLElement>('.mobile-nav');
  if(!shell||!nav)return;
  const update=()=>shell.style.setProperty('--em-nav-height',`${getComputedStyle(nav).display==='none'?0:Math.ceil(nav.getBoundingClientRect().height)}px`);
  const observer=new ResizeObserver(update);observer.observe(nav);update();
  return()=>{observer.disconnect();shell.style.removeProperty('--em-nav-height');};
 },[employee]);
}
