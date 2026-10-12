'use client';
import Image from 'next/image';
import {useRef,useState} from 'react';
import {useGSAP} from '@gsap/react';
import {gsap} from 'gsap';
import {PauseIcon} from '@phosphor-icons/react/dist/ssr/Pause';
import {PlayIcon} from '@phosphor-icons/react/dist/ssr/Play';
import {NUVORA_BRAND} from '@/lib/brand';
import {createLoginMotion} from '../login/login-motion';
gsap.registerPlugin(useGSAP);

export function ResetVisual(){
 const container=useRef<HTMLElement>(null);
 const motion=useRef<ReturnType<typeof createLoginMotion>|null>(null);
 const [available,setAvailable]=useState(false),[paused,setPaused]=useState(false);
 useGSAP(()=>{
  if(!container.current)return;
  const controller=createLoginMotion(container.current,setAvailable);motion.current=controller;
  return()=>{motion.current=null;controller.destroy();};
 },{scope:container});
 return <aside className="login-visual reset-visual" ref={container} aria-label="A brighter workday with NEVORA">
  <div className="login-visual-copy"><h2><span className="login-visual-line">{NUVORA_BRAND.slogan}</span></h2>
   <p>A fresh start for<br/>your next workday.</p></div>
  <div className="login-visual-art-stage"><Image className="login-visual-art" src="/assets/illustrations/reset-access-blue.png" alt="" width={1536} height={1024}
   sizes="(max-width: 799px) 160px, (max-width: 1100px) 45vw, 500px" preload/></div>
  {available?<button type="button" className="login-motion-toggle" aria-label={paused?'Play illustration animation':'Pause illustration animation'}
   onClick={()=>{motion.current?.setPaused(!paused);setPaused(!paused);}}>
   {paused?<PlayIcon size={18} weight="regular" aria-hidden="true" focusable="false"/>:<PauseIcon size={18} weight="regular" aria-hidden="true" focusable="false"/>}
  </button>:null}
 </aside>;
}
