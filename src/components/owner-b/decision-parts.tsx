import type { ReactNode, Ref } from "react";
import { BSpin, BState } from "./b-kit";

/* Final polish (Nov 20, 2026; confirmations review A): the two parts every Owner and Manager decision shares. They are
 * the kit's own pieces (`BState`, `b-btn`, `b-rowact`) in one arrangement; the layout is in owner-b-requests.css
 * (.b-dres, .b-ask). Presentation only: callers keep their forms, fields, actions and the number of taps.
 *
 * DecisionResult: what a decision left behind, drawn in the card it came from, where the row's buttons were. "done" is
 * the kit's done state with the 36px mark of a row. "closed" is a declined, cancelled or closed request: the Truth rule
 * keeps the green mark off it, so it is the kit's grey state with the request's own glyph. A title names what is now
 * true; the line is the one next fact. */
export function DecisionResult({ tone, title, line, icon, className, silent }: {
  tone: "done" | "closed"; title: ReactNode; line?: ReactNode;
  /** "closed" only: the request's own glyph (time off, swap, can't work, correction), bold. */
  icon?: ReactNode; className?: string;
  /** The caller already announces it (a live region around this block). */
  silent?: boolean;
}) {
  return <div className={className ? `b-dres ${className}` : "b-dres"} data-tone={tone}>
    {tone === "done" ? <BState kind="done" title={title} line={line} silent={silent} /> : <BState kind="empty" icon={icon} title={title} line={line} silent={silent} />}
  </div>;
}

/* DecisionAsk: the one question before a decision (Decline, Cancel time off, Close request, Finalize a timecard). A
 * 600 question, one consequence line, then the safe way out as quiet text on the left and the pill that commits on the
 * right, both 44px. The commit is red-edged (a negative decision) or, with `tone="commit"`, the filled teal of a step
 * that is not destructive (Finalize). It is a submit button of the caller's form (`goName`, `goValue`; with no value it carries no name, so it adds
 * nothing to what the form sends), or with `onGo`
 * a plain button that calls the caller's own handler. `titleRef` makes the question focusable, so focus can move to it
 * when it appears (ask-step.ts). */
export function DecisionAsk({ groupLabel, question, consequence, keep, keepLabel, onKeep, go, goLabel, goValue, goName = "decision", onGo, tone, groupRef, titleRef, className, lang, children, busyLabel }: {
  /** The group's accessible name ("Decline time off for Ana Colon?"). */
  groupLabel: string; question: ReactNode; consequence: ReactNode;
  children?: ReactNode; busyLabel?: string;
  keep: ReactNode; keepLabel?: string; onKeep: () => void;
  go: ReactNode; goLabel?: string; goValue?: string; goName?: string;
  /** The commit is the caller's own handler, not a form's submit. */
  onGo?: () => void;
  /** "commit": a step forward that is not destructive, so the filled teal button, not the red edge. */
  tone?: "commit";
  groupRef?: Ref<HTMLDivElement>; titleRef?: Ref<HTMLParagraphElement>; className?: string; lang?: string;
}) {
  return <div ref={groupRef} className={className ? `b-ask ${className}` : "b-ask"} role="group" aria-label={groupLabel} lang={lang} data-tone={tone} aria-busy={busyLabel ? true : undefined}>
    <p className="b-ask__t" ref={titleRef} tabIndex={titleRef ? -1 : undefined}>{question}</p>
    <p className="b-ask__s">{consequence}</p>
    {children}
    <div className="b-ask__acts">
      <button type="button" className="b-btn b-btn--quiet b-rowact b-rowact--quiet b-ask__keep" onClick={onKeep} disabled={!!busyLabel} aria-label={keepLabel}>{keep}</button>
      {onGo ? <button type="button" className="b-btn b-btn--quiet b-ask__go" onClick={onGo} aria-label={goLabel}>{go}</button>
        : <button type="submit" name={goValue === undefined ? undefined : goName} value={goValue} className="b-btn b-btn--quiet b-ask__go" disabled={!!busyLabel} aria-label={busyLabel ?? goLabel}>{busyLabel ? <><BSpin small />{busyLabel}</> : go}</button>}
    </div>
    {busyLabel && <span className="c-sr" role="status">{busyLabel}</span>}
  </div>;
}
