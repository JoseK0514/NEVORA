"use client";
import { useCallback, useEffect, useState } from "react";
import { PendingButton } from "./wave-a/pending-button";
import { PendingLabel } from "./employee-submit-button";
import { guardSingleSubmit } from "./wave-a/single-submit";
import { DecisionAsk } from "./owner-b/decision-parts";
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
    const sync = () => { const now = form.getAttribute("aria-busy") === "true"; setBusy(now); if (now) closeAsk(); else setDeclining(false); };
    form.addEventListener("submit", onSubmit, true);
    const observer = new MutationObserver(sync);
    observer.observe(form, { attributes: true, attributeFilter: ["aria-busy"] });
    return () => { form.removeEventListener("submit", onSubmit, true); observer.disconnect(); };
  }, [form, closeAsk]);
  if (open && !busy) return <DecisionAsk className="q-shift-ask" groupRef={host} titleRef={titleRef} groupLabel={ask.groupLabel} question={ask.question} consequence={ask.consequence}
    keep={ask.keep} keepLabel={ask.keepLabel} onKeep={keep} go={ask.go} goLabel={ask.goLabel} goName="kind" goValue={decline} />;
  const saying = busy && declining;
  return <div className="q-acts" ref={host}>
    <button ref={openerRef} type="button" className="q-bs b-rowact b-rowact--quiet" data-busy={saying ? "true" : undefined} disabled={busy && !saying} aria-disabled={saying || undefined} aria-busy={saying || undefined}
      aria-label={saying ? undefined : declineLabel} onClick={() => { if (!busy) openAsk(); }}>
      <PendingLabel className="wa-btn__words" pending={saying} pendingText={pending}>{declineWords}</PendingLabel>
    </button>
    {approve ? <PendingButton className="q-bs q-bs--go b-rowact b-rowact--go" name="kind" value={approve} pending="Approving…" label={approveLabel}>Approve</PendingButton> : null}
  </div>;
}
