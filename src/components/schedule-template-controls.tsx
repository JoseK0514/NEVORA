"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function TemplateSubmit({ label, pendingLabel, ariaLabel, className, children }: {
  label: string; pendingLabel: string; ariaLabel?: string; className: string; children?: ReactNode;
}) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending} aria-busy={pending} aria-label={pending ? pendingLabel : ariaLabel}>
    <span aria-live="polite">{pending ? pendingLabel : label}</span>
    {children}
  </button>;
}

export function TemplateFeedback({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => { container.current?.focus({ preventScroll: true }); }, []);
  return <div className="st-feedback" tabIndex={-1} ref={container}>{children}</div>;
}

export function TemplateNameLink({ children }: { children: ReactNode }) {
  return <a href="#st-template-name" className="button secondary" onClick={event => {
    const input = document.getElementById("st-template-name");
    if (!(input instanceof HTMLInputElement)) return;
    event.preventDefault();
    input.focus({ preventScroll: true });
    input.scrollIntoView({ block: "center", behavior: "auto" });
  }}>{children}</a>;
}

export function TemplateMotion({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from("[data-template-entrance]", {
        y: 8, duration: 0.32, stagger: 0.06, ease: "power2.out", clearProps: "transform",
      });
    });
    return () => media.revert();
  }, { scope: container });
  return <div ref={container}>{children}</div>;
}
