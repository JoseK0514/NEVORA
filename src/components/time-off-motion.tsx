"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export function TimeOffMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from("[data-timeoff-intro]", { y: 8, duration: 0.45, ease: "power2.out", clearProps: "transform" });
    });
    return () => media.revert();
  }, { scope });
  return <div ref={scope} className="nto-motion">{children}</div>;
}
