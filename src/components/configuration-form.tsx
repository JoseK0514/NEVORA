"use client";

import { useRef, useState, type ReactNode, type FormEvent } from "react";
import { ShiftReviewRecovery, shiftDraftText } from "./shift-review-recovery";
export type ConfigurationResult = { error?: string; success?: string; updatedAt?: string; issueCode?: string };
/** Keep entered values on validation/network failure; each form owns its feedback. */
export function ConfigurationForm({
  action,
  children,
  className = "employee-form",
  reviewedUpdatedAt,
  reviewedShiftVersion,
  id,
}: {
  action: (data: FormData) => Promise<ConfigurationResult>;
  children: ReactNode;
  className?: string;
  reviewedUpdatedAt?: string;
  reviewedShiftVersion?: string;
  /** Quiet (v4): lets a submit in the page's top bar (form="…") send this form. */
  id?: string;
}) {
  const [result, setResult] = useState<ConfigurationResult>({});
  const [pending, setPending] = useState(false);
  // Double tap (Wave A ST, Oct 19): a second submit can arrive before the disabled fieldset renders; only one save runs.
  const inFlight = useRef(false);
  // This version belongs to the mounted editable draft. An unrelated RSC refresh
  // can update server props without replacing dirty native/controlled inputs.
  const [draftUpdatedAt, setDraftUpdatedAt] = useState(reviewedUpdatedAt);
  const [shiftVersion] = useState(reviewedShiftVersion);
  const [submittedShift, setSubmittedShift] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    const data = new FormData(event.currentTarget);
    if (draftUpdatedAt !== undefined) data.set('expectedUpdatedAt', draftUpdatedAt);
    if (shiftVersion !== undefined) data.set('expectedReviewVersion', shiftVersion);
    if (shiftVersion !== undefined) setSubmittedShift(shiftDraftText(data));
    setPending(true);
    setResult({});
    try {
      const saved = await action(data);
      setResult(saved);
      if (saved.success && !saved.error && saved.updatedAt && draftUpdatedAt !== undefined) setDraftUpdatedAt(saved.updatedAt);
    } catch {
      setResult({
        error:
          "Changes could not be saved. Your entries are preserved; try again.",
      });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <form id={id} onSubmit={submit} className={className} aria-busy={pending}>
      <fieldset disabled={pending} className="configuration-fields">
        {draftUpdatedAt !== undefined ? <input type="hidden" name="expectedUpdatedAt" value={draftUpdatedAt} /> : null}
        {shiftVersion !== undefined ? <input type="hidden" name="expectedReviewVersion" value={shiftVersion} /> : null}
        {children}
      </fieldset>
      {pending ? <p role="status">Saving…</p> : null}
      {result.error ? (
        <p role="alert" className="form-error">
          {result.error}
        </p>
      ) : null}
      {result.issueCode === 'SHIFT_REVIEW_CONFLICT' ? <ShiftReviewRecovery draft={submittedShift} /> : null}
      {result.success ? (
        <p role="status" className="form-success">
          {result.success}
        </p>
      ) : null}
    </form>
  );
}
