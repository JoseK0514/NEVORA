'use client';
import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function EmployeeScheduleMotion({ children, weekStart }: { children: ReactNode; weekStart: string }) {
  const scope=useRef<HTMLDivElement>(null);
  useGSAP(()=>{
    const media=gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)',()=>{
      gsap.fromTo('.my-schedule-enter',{y:6,opacity:.9},{y:0,opacity:1,duration:.32,stagger:.06,ease:'power2.out',clearProps:'transform,opacity'});
      gsap.fromTo('.my-agenda-heading',{opacity:.9},{opacity:1,duration:.3,clearProps:'opacity',scrollTrigger:{trigger:'.my-schedule-agenda',start:'top 95%',once:true}});
    });
    return ()=>media.revert();
  },{scope,dependencies:[weekStart],revertOnUpdate:true});
  return <div ref={scope} className="my-schedule-motion">{children}</div>;
}
