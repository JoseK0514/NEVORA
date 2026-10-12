"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function SettingsHubMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(".settings-hub-heading", { y: 6, opacity: 0.9 }, {
        y: 0, opacity: 1, duration: 0.3, ease: "power2.out", clearProps: "transform,opacity",
      });
      gsap.utils.toArray<HTMLElement>(".settings-hub-group", scope.current).forEach((group) => {
        gsap.fromTo(group.querySelectorAll(".settings-hub-icon"), { scale: 0.96 }, {
          scale: 1, duration: 0.3, stagger: 0.04, ease: "power2.out", clearProps: "transform",
          scrollTrigger: { trigger: group, start: "top 95%", once: true },
        });
      });
    });
    return () => media.revert();
  }, { scope });

  return <div ref={scope} className="settings-hub">{children}</div>;
}
