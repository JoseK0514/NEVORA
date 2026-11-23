"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { guardSingleSubmit } from "./single-submit";
import { unstable_rethrow } from "next/navigation";
import { revealFeedback } from "@/lib/reveal-feedback";
import { Notice } from "./parts";
import { ShiftReviewRecovery, shiftDraftText } from "../shift-review-recovery";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { WAVE_A_COPY } from "./wave-a-copy";

/** A form for a server action that redirects when it's done (Approve, Decline, Delete).
 * If the request fails (offline, blocked, server down) the page stays, and a notice under the buttons says the
 * action wasn't saved; it's scrolled into view and focused. Redirects and other Next signals pass through. */
export function ActionForm({ action, children, className, label, failure, reviewedShiftVersion, shiftDraftFormId }: {
  action: (data: FormData) => Promise<unknown>;
  children: ReactNode;
  className?: string;
  label?: string;
  failure: { title: string; body: string };
  reviewedShiftVersion?: string;
  shiftDraftFormId?: string;
}) {
  const t = WAVE_A_COPY[usePortalLang()];
  const [shiftVersion] = useState(reviewedShiftVersion);
  const [refusal, setRefusal] = useState<{ error: string; conflict: boolean; draft: string } | null>(null);
  const [failed, setFailed] = useState(0);
  const failures = useRef(0);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const unknownOutcome = useRef(false);
  const notice = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (form.current) guardSingleSubmit(form.current); }, []);
  useEffect(() => { if (failed && notice.current) revealFeedback(notice.current); }, [failed]);
  async function run(data: FormData) {
    if (unknownOutcome.current) return;
    setFailed(0);
    setRefusal(null);
    setBusy(true);
    if (shiftVersion !== undefined) data.set('expectedReviewVersion', shiftVersion);
    const draftForm = shiftDraftFormId ? document.getElementById(shiftDraftFormId) : null;
    const draft = draftForm && draftForm instanceof HTMLFormElement ? shiftDraftText(new FormData(draftForm)) : '';
    try {
      const result = await action(data);
      if (result && typeof result === 'object' && 'error' in result && typeof result.error === 'string') {
        setRefusal({ error: result.error, conflict: 'issueCode' in result && (result.issueCode === 'SHIFT_REVIEW_CONFLICT' || shiftVersion !== undefined && result.issueCode === 'ACCESS_DENIED'), draft });
        setFailed(++failures.current);
      }
      setBusy(false);
    } catch (error) {
      setBusy(false);
      unstable_rethrow(error);
      if (shiftVersion !== undefined) {
        // A lost successful delete and a failed delete are indistinguishable.
        // Retain the reviewed draft instead of replaying into a missing-row RSC
        // render that could discard it. Re-entry is an explicit review.
        unknownOutcome.current = true;
        setUncertain(true);
        setRefusal({ error: t.unconfirmed, conflict: true, draft });
      }
      setFailed(++failures.current);
    }
  }
  return <form ref={form} action={run} className={className} aria-label={label} aria-busy={busy}>
    {shiftVersion !== undefined ? <fieldset disabled={busy || uncertain} className="configuration-fields">{children}</fieldset> : children}
    {shiftVersion !== undefined ? <input type="hidden" name="expectedReviewVersion" value={shiftVersion} /> : null}
    {failed ? <div ref={notice} tabIndex={-1} className="wa-target"><Notice tone="urgent" title={uncertain ? t.deletionUnknown : failure.title}>{refusal?.error ?? failure.body}</Notice>{refusal?.conflict ? <ShiftReviewRecovery draft={refusal.draft} /> : null}</div> : null}
  </form>;
}
