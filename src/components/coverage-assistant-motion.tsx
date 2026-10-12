"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function CoverageAssistantMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from("[data-coverage-enter]", {
        y: 10,
        duration: 0.45,
        stagger: 0.06,
        ease: "power2.out",
        clearProps: "transform",
      });
    });
    return () => media.revert();
  }, { scope: root });
  return <div ref={root} className="coverage-assistant">{children}</div>;
}
