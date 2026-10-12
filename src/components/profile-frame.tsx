'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';

export function ProfileFrame({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!frame.current) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.profile-heading-copy', { y: 6, opacity: 0.75, duration: 0.4, ease: 'power2.out' });
      gsap.from('.profile-icon-tile', { scale: 0.92, opacity: 0.7, duration: 0.45, stagger: 0.05, ease: 'power2.out' });
    }, frame.current);
    return () => media.revert();
  }, []);
  return <div ref={frame} className="employee-view employee-account-view profile-view">{children}</div>;
}
