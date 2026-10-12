"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import "./exchange-review.css";

gsap.registerPlugin(useGSAP);

export function ExchangeReviewShell({ children, className, view }: { children: ReactNode; className: string; view: string }) {
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".exchange-page-heading h1, .exchange-section-heading", {
        y: 8, duration: 0.36, stagger: 0.06, ease: "power2.out", clearProps: "transform",
      });
    });
    return () => media.revert();
  }, { scope, dependencies: [view], revertOnUpdate: true });
  return <div ref={scope} className={`${className} exchange-review`}>{children}</div>;
}
