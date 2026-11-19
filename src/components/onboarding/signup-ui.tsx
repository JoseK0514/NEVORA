"use client";
import type { ReactNode, RefObject } from "react";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { BCallout, type BMeaning, type BTone } from "@/components/owner-b/b-kit";
import { noteParts } from "@/components/auth-premium/note-parts";
import type { SignupCopy } from "@/lib/onboarding/signup-copy";
import "./signup.css";

/** One tinted note in the kit's callout (DESIGN.MD premium pass: amber check, red stop, teal info). */
export function SignupNote({ tone, icon, id, title, children, focusRef }: { tone: BTone; icon?: BMeaning; id?: string; title?: string; children: ReactNode; focusRef?: RefObject<HTMLDivElement | null> }) {
  return <div className="ar-note su-note" id={id} role={tone === "red" || tone === "amber" ? "alert" : "status"} tabIndex={focusRef ? -1 : undefined} ref={focusRef}>
    <BCallout tone={tone} icon={icon} title={title}>{children}</BCallout>
  </div>;
}

/** Title block. `done` draws the 56px finish circle with the 28px check above the title. */
export function SignupHeader({ title, sub, done = false, live = false }: { title: string; sub?: ReactNode; done?: boolean; live?: boolean }) {
  return <div className="q-hd">
    {done ? <span className="q-auth__mark q-auth__mark--done q-auth__mark--head" aria-hidden="true"><CheckIcon size={28} weight="bold" /></span> : null}
    <h1 tabIndex={-1} data-signup-title="">{title}</h1>
    {sub ? <p role={live ? "status" : undefined}>{sub}</p> : null}
  </div>;
}

/** The three steps of creating a business: where the person is and what comes next. */
export function SignupSteps({ current, c }: { current: 0 | 1 | 2 | 3; c: SignupCopy["progress"] }) {
  return <ol className="su-steps" aria-label={c.stepLabel}>
    {c.steps.map((label, index) => {
      const state = index < current ? "done" : index === current ? "current" : "next";
      return <li key={label} data-state={state} aria-current={state === "current" ? "step" : undefined}>
        <span className="su-steps__dot" aria-hidden="true">{state === "done" ? <CheckIcon size={12} weight="bold" /> : index + 1}</span>
        <span className="su-steps__label">{label}<span className="q-sr"> · {state === "done" ? c.done : state === "current" ? c.current : c.next}</span></span>
      </li>;
    })}
  </ol>;
}

/** An outcome the server has not confirmed: never shown as failed or done. The button replays the identical request. */
export function NotConfirmed({ copy, busy, onCheck, focusRef }: { copy: SignupCopy["unknown"]; busy: boolean; onCheck: () => void; focusRef?: RefObject<HTMLDivElement | null> }) {
  const note = noteParts(`${copy.title}. ${copy.body}`);
  return <div className="q-card q-auth__card su-card">
    <SignupNote tone="amber" icon="unknown" title={note.title ?? undefined} focusRef={focusRef}>{note.body}</SignupNote>
    <button type="button" className="q-btn" onClick={onCheck} disabled={busy} aria-busy={busy || undefined}>{busy ? copy.checking : copy.check}</button>
  </div>;
}

/** Inline field error under a Quiet field, announced with the field (aria-describedby points here). */
export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  return children ? <p className="q-help su-error" id={id}>{children}</p> : null;
}

/** Move focus to the page title after a phase change so keyboard and screen-reader users start at the new step. */
export function focusTitle() {
  requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-signup-title]")?.focus());
}
