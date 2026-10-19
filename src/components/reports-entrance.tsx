'use client';

import {useRef,type ReactNode} from 'react';
import {gsap} from 'gsap';
import {useGSAP} from '@gsap/react';

gsap.registerPlugin(useGSAP);

export function ReportsEntrance({children}:{children:ReactNode}) {
 const container=useRef<HTMLDivElement>(null);
 useGSAP(()=>{
  const media=gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)',()=>{
   gsap.from('[data-report-entrance]',{y:8,opacity:.75,duration:.35,stagger:.04,ease:'power2.out',clearProps:'transform,opacity'});
  },container);
  return()=>media.revert();
 },{scope:container});
 return <div ref={container} className="nv-page wb-page wb-reports" data-nv-page="">{children}</div>;
}
