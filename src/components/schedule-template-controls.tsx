"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useLinkStatus } from "next/link";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function TemplateSubmit({ label, pendingLabel, ariaLabel, className, kind, children }: {
  label: string; pendingLabel: string; ariaLabel?: string; className: string; kind?: "primary" | "secondary"; children?: ReactNode;
}) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} data-kind={kind} disabled={pending} aria-busy={pending} aria-label={pending ? pendingLabel : ariaLabel}>
    <span aria-live="polite">{pending ? pendingLabel : label}</span>
    {children}
  </button>;
}

export function TemplateFeedback({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  // IS-B15: a success shows as the toast and needs no focus; an error or warning takes it so it is read first.
  useEffect(() => { if (container.current?.querySelector(".form-error, .form-warning")) container.current.focus({ preventScroll: true }); }, []);
  return <div className="wb-feedback" tabIndex={-1} ref={container}>{children}</div>;
}

export function TemplateNameLink({ children }: { children: ReactNode }) {
  return <a href="#st-template-name" className="nv-btn" data-kind="secondary" onClick={event => {
    const input = document.getElementById("st-template-name");
    if (!(input instanceof HTMLInputElement)) return;
    event.preventDefault();
    input.focus({ preventScroll: true });
    input.scrollIntoView({ block: "center", behavior: "auto" });
  }}>{children}</a>;
}

/** IS-B20: the week stepper shows that the next week is loading and ignores repeat presses. */
export function WeekPending() {
  const { pending } = useLinkStatus();
  return <span className="wb-link-pending" data-pending={pending || undefined} aria-hidden="true" />;
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
