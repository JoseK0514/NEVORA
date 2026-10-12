'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export function useClockerMotion(state: string) {
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      if (scope.current) gsap.from(scope.current, { y: 6, opacity: .55, duration: .24, ease: 'power2.out' });
    });
    return () => media.revert();
  }, { scope, dependencies: [state], revertOnUpdate: true });
  return scope;
}
