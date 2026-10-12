"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";

gsap.registerPlugin(useGSAP);

export function ShiftWorkspace({ title, description, backHref, backLabel, context, compact = false, children }: {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  context?: string;
  compact?: boolean;
  children: ReactNode;
}) {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".shift-preview, .shift-review-summary", {
        y: 6, duration: 0.32, ease: "power2.out", clearProps: "transform",
      });
    }, root);
    return () => media.revert();
  }, { scope: root });

  return <main ref={root} className={`new-shift-page shift-workspace${compact ? " shift-workspace-compact" : ""}`}>
    <div className="shift-workspace-nav">
      <Link href={backHref} className="shift-back-link"><ArrowLeftIcon size={18} aria-hidden="true" />{backLabel}</Link>
      {context ? <span className="shift-workspace-context">{context}</span> : null}
    </div>
    <header className="shift-workspace-header"><h1>{title}</h1><p>{description}</p></header>
    {children}
  </main>;
}
