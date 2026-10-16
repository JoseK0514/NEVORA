'use client';

import {useRef} from 'react';
import gsap from 'gsap';
import {useGSAP} from '@gsap/react';
import styles from './timecards-heading.module.css';

gsap.registerPlugin(useGSAP);

export function TimecardsHeading({manager}:{manager:boolean}) {
  const heading=useRef<HTMLElement>(null);
  useGSAP(()=>{
    const media=gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)',()=>{
      const entrance=gsap.from(heading.current,{y:8,duration:.45,ease:'power2.out',clearProps:'transform'});
      const finish=()=>{if(document.hidden)entrance.progress(1);};
      document.addEventListener('visibilitychange',finish);
      return ()=>document.removeEventListener('visibilitychange',finish);
    });
    return ()=>media.revert();
  },{scope:heading});
  return <header ref={heading} className={styles.heading}>
    <h1>Timecards</h1>
    <p>{manager?'Review hours and close each pay period.':'Your hours, breaks and approvals.'}</p>
  </header>;
}
