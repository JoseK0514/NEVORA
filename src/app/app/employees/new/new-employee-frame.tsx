"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

export function NewEmployeeFrame({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from("[data-employee-reveal]", {
        y: 8, opacity: 0.75, duration: 0.32, stagger: 0.04, ease: "power2.out", clearProps: "all",
      });
    });
    return () => media.revert();
  }, { scope: root });

  return <div className="new-employee-view" ref={root}>{children}</div>;
}
