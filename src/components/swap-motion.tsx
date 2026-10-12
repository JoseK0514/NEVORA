'use client';

import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';

gsap.registerPlugin(useGSAP);

export function SwapMotion({ children, selection = '' }: { children: ReactNode; selection?: string }) {
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo('.swap-review-content', { y: 5, opacity: .9 }, { y: 0, opacity: 1, duration: .24, ease: 'power2.out', clearProps: 'transform,opacity' });
    });
    return () => media.revert();
  }, { scope, dependencies: [selection], revertOnUpdate: true });
  return <div ref={scope} className="swap-motion">{children}</div>;
}
