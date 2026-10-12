"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function LocationsFrame({ children, contentKey }: { children: ReactNode; contentKey: string }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".locations-heading-copy", { y: 8, duration: 0.4, ease: "power2.out", clearProps: "transform" });
      gsap.from(".location-icon", { scale: 0.92, y: 5, duration: 0.45, stagger: { each: 0.035, amount: 0.2 }, ease: "power2.out", clearProps: "transform" });
    }, root);
    return () => media.revert();
  }, { scope: root, dependencies: [contentKey], revertOnUpdate: true });
  return <div ref={root} className="configuration-page locations-page">{children}</div>;
}
