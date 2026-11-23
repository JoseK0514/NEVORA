"use client";
import { useCallback, useEffect, useState } from "react";
import { guardSingleSubmit } from "./wave-a/single-submit";
import { DecisionAsk } from "./owner-b/decision-parts";
import { BBusyLabel } from "./owner-b/b-kit";
import { useAskStep } from "./owner-b/ask-step";

/* Jose (Nov 21, 2026): Decline on a swap, a cover request or a call-out, and Close request on open cover, ask first.
 * These are the buttons of one waiting request inside its ShiftChangeForm (manager-shift-requests.tsx). The first tap
 * opens the question in place of the buttons and sends nothing; the question's commit is the form's own submit with the
 * same `kind` as before (or none, for Close, whose kind is a field of the form), so the form sends what it always sent,
 * once. Approve stays one tap. While the request is out the buttons are back and the pressed one says so. */
export type ShiftAsk = { question: string; consequence: string; keep: string; go: string;
  /** Accessible names: the group ("Decline the swap request from Ana Colon?"), the way out and the commit. */
  groupLabel: string; keepLabel: string; goLabel: string };

export function ShiftRequestDecide({ decline, declineWords = "Decline", pending = "Declining…", declineLabel, approve, approveLabel, ask }: {
  /** The `kind` the commit sends (MANAGER_DECLINE, DECLINE_CALLOUT); none when the form's own fields carry it (Close). */
  decline?: string; declineWords?: string; pending?: string; declineLabel: string;
  /** The `kind` Approve sends; left out when approving is not allowed right now. */
  approve?: string; approveLabel?: string; ask: ShiftAsk;
}) {
  const { open, ask: openAsk, keep, done: closeAsk, titleRef, openerRef } = useAskStep();
  // The form marks itself busy while its request is out (ShiftChangeForm); this watches it, as PendingButton does, so
  // the opener can say "Declining…" for the commit that came from the question.
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const [busy, setBusy] = useState(false), [declining, setDeclining] = useState(false);
  const host = useCallback((node: HTMLElement | null) => { const next = node?.closest("form"); if (next) setForm(next); }, []);
  useEffect(() => {
    if (!form) return;
    guardSingleSubmit(form);
    const onSubmit = (event: SubmitEvent) => setDeclining(!!(event.submitter as HTMLElement | null)?.closest(".b-ask"));
    let was = false;
    const sync = () => {
      const now = form.getAttribute("aria-busy") === "true"; setBusy(now);
      if (now) closeAsk(); else setDeclining(false);
      // IS-WA-2 (as PendingButton did): when the answer comes back as a line under the buttons, bring it into view and
      // move focus to it, so the outcome is seen and read. A decided request draws its result in place instead.
      if (was && !now) requestAnimationFrame(() => {
        const result = form.querySelector<HTMLElement>(":scope > [role=alert], :scope > .form-error, :scope > .form-success");
        if (!result) return;
        if (!result.hasAttribute("tabindex")) result.tabIndex = -1;
        result.scrollIntoView({ block: "center" });
        result.focus({ preventScroll: true });
      });
      was = now;
    };
    form.addEventListener("submit", onSubmit, true);
    const observer = new MutationObserver(sync);
    observer.observe(form, { attributes: true, attributeFilter: ["aria-busy"] });
    return () => { form.removeEventListener("submit", onSubmit, true); observer.disconnect(); };
  }, [form, closeAsk]);
  if (open && !busy) return <DecisionAsk className="c-shreq__ask" groupRef={host} titleRef={titleRef} groupLabel={ask.groupLabel} question={ask.question} consequence={ask.consequence}
    keep={ask.keep} keepLabel={ask.keepLabel} onKeep={keep} go={ask.go} goLabel={ask.goLabel} goName="kind" goValue={decline} />;
  const saying = busy && declining;
  const approving = busy && !declining && !!approve;
  return <div className="c-shreq__acts" ref={host}>
    <button ref={openerRef} type="button" className="c-btn c-btn--secondary b-rowact b-rowact--quiet" data-busy={saying ? "true" : undefined} disabled={busy && !saying} aria-disabled={saying || undefined} aria-busy={saying || undefined}
      aria-label={saying ? undefined : declineLabel} onClick={() => { if (!busy) openAsk(); }}>
      <BBusyLabel busy={saying} busyLabel={pending}>{declineWords}</BBusyLabel>
    </button>
    {/* Phase 2 (C12): Approve is the kit's busy label too (it was the older pending label); one tap, the form's own submit. */}
    {approve ? <button type="submit" className="c-btn b-rowact b-rowact--go" name="kind" value={approve} aria-label={approving ? undefined : approveLabel}
      aria-disabled={approving || undefined} aria-busy={approving || undefined} disabled={busy && !approving}
      onClick={event => { if (event.currentTarget.form?.getAttribute("aria-busy") === "true") event.preventDefault(); }}>
      <BBusyLabel busy={approving} busyLabel="Approving…">Approve</BBusyLabel></button> : null}
  </div>;
}
