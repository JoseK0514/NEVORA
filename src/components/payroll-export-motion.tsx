'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { FileCsvIcon } from '@phosphor-icons/react/ssr';

gsap.registerPlugin(useGSAP);

export function PayrollExportMotion() {
  const scope = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(scope.current, { rotate: -8, scale: 0.9 },
        { rotate: 0, scale: 1, duration: 0.65, ease: 'power2.out' });
    });
    return () => media.revert();
  }, { scope });
  return <span ref={scope} aria-hidden="true"><FileCsvIcon size={28} weight="duotone" /></span>;
}
