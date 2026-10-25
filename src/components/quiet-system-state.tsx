import Link from "next/link";
import type { ReactNode } from "react";
import { QuietNav } from "./quiet/quiet";
import "./quiet/quiet.css";
import "./quiet/u1.css";

/* T-21 (final pass, Oct 25): one Quiet state for every role, drawn like the approved M01 "unavailable" page: a large
 * title, one sentence, a grey main button and a quiet teal second action. No card, tile, band or grey canvas. */

export type SystemStateKind = "error" | "not-found" | "owners-only" | "role";

export const SYSTEM_STATE_COPY: Record<SystemStateKind, { title: string; sentence: string }> = {
  "error": { title: "This page didn’t load", sentence: "Check your connection and try again." },
  "not-found": { title: "Page not found", sentence: "The link may be old." },
  "owners-only": { title: "Owners only", sentence: "Ask an Owner if you need a change here." },
  "role": { title: "Not available for your role", sentence: "Ask an Owner or manager if you need this page." },
};

/** The state itself. `primary` and `secondary` are the actions (a `.q-btn--sec` and a `.q-btn--quiet`); without them a
 * signed-in state gets "Back to Home". `back` adds a pushed page's ‹ Parent bar. */
export function QuietSystemState({ kind, title, sentence, primary, secondary, back, alert = false, children }: {
  kind: SystemStateKind; title?: string; sentence?: ReactNode; primary?: ReactNode; secondary?: ReactNode;
  back?: { href: string; label: string };
  /** An error announces itself once (one live region; the buttons sit outside it). */
  alert?: boolean;
  children?: ReactNode;
}) {
  const copy = SYSTEM_STATE_COPY[kind];
  const heading = title ?? copy.title, line = sentence ?? copy.sentence;
  return <section className="q-page q-unavailable u1-state" data-nv-page="" data-system-state={kind} aria-labelledby={`system-state-${kind}`}>
    {back ? <QuietNav back={back} /> : <div className="q-bar" aria-hidden="true" />}
    <div className="q-hd"><h1 id={`system-state-${kind}`}>{heading}</h1></div>
    <div role={alert ? "alert" : undefined}><p className="q-body">{line}</p></div>
    {children}
    {primary ?? <Link className="q-btn q-btn--sec" href="/app">Back to Home</Link>}
    {secondary ?? null}
  </section>;
}

/** Payroll and Settings opened by someone who isn't an Owner. Nothing on the page is read or shown. */
export function OwnersOnlyState() {
  return <QuietSystemState kind="owners-only" />;
}

/** A page this role doesn't have (UX-E-47): one page instead of a silent move to Home or an error. */
export function RoleUnavailableState() {
  return <QuietSystemState kind="role" />;
}
