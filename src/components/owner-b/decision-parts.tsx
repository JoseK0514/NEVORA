import type { ReactNode, Ref } from "react";
import { BState } from "./b-kit";

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

/* DecisionAsk: the one question before a negative decision that already asks one (Decline time off, Cancel time off). A
 * 600 question, one consequence line, then the safe way out as quiet text on the left and the red-edged pill that
 * commits on the right, both 44px. The commit is a submit button of the caller's form. */
export function DecisionAsk({ groupLabel, question, consequence, keep, keepLabel, onKeep, go, goLabel, goValue, groupRef, className, lang }: {
  /** The group's accessible name ("Decline time off for Ana Colon?"). */
  groupLabel: string; question: ReactNode; consequence: ReactNode;
  keep: ReactNode; keepLabel?: string; onKeep: () => void;
  go: ReactNode; goLabel?: string; goValue: string;
  groupRef?: Ref<HTMLDivElement>; className?: string; lang?: string;
}) {
  return <div ref={groupRef} className={className ? `b-ask ${className}` : "b-ask"} role="group" aria-label={groupLabel} lang={lang}>
    <p className="b-ask__t">{question}</p>
    <p className="b-ask__s">{consequence}</p>
    <div className="b-ask__acts">
      <button type="button" className="b-btn b-btn--quiet b-rowact b-rowact--quiet b-ask__keep" onClick={onKeep} aria-label={keepLabel}>{keep}</button>
      <button type="submit" name="decision" value={goValue} className="b-btn b-btn--quiet b-ask__go" aria-label={goLabel}>{go}</button>
    </div>
  </div>;
}
