"use client";
import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

gsap.registerPlugin(useGSAP);

export function EmployeeDirectoryMotion({ children, className }: { children: ReactNode; className: string }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from("[data-directory-enter]", {
        y: 6, opacity: 0.92, duration: 0.32, stagger: 0.035,
        ease: "power2.out", clearProps: "transform,opacity",
      });
    }, root);
    return () => media.revert();
  }, { scope: root });
  return <div className={className} ref={root}>{children}</div>;
}
