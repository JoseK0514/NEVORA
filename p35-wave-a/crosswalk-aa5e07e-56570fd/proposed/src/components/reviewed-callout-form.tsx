"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useCalloutSent } from "./wave-a/callout-sent";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SelectField } from "./select-field";
import { ShiftChangeForm } from "./shift-change-form";
import { calloutReasonNoteError } from "../lib/shift-changes/command-parser";
import { FormActions, Notice } from "./wave-a/parts";
import { PendingButton } from "./wave-a/pending-button";

const reasons = [
  ["ILLNESS", "Illness / sick"],
  ["FAMILY_EMERGENCY", "Family emergency"],
  ["TRANSPORTATION", "Transportation issue"],
  ["SCHOOL", "School conflict"],
  ["PERSONAL_EMERGENCY", "Personal emergency"],
  ["OTHER", "Other"],
] as const;

/** Keep the employee's unsent reason in this mounted form during RSC refresh.
 * New terms require another deliberate submit; refresh never sends a report. */
export function ReviewedCalloutForm({
  fields,
}: {
  fields: Readonly<Record<string, string>> | null;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const router = useRouter();
  const noteInput = useRef<HTMLTextAreaElement>(null);
  const detailsId = useId();
  // Once the report is recorded, the boundary above this form shows the result (the page refreshes underneath).
  const markSent = useCalloutSent();
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const form = body.current?.closest("form");
    if (!form) return;
    let submitted = false;
    const onSubmit = () => { submitted = true; };
    const observer = new MutationObserver(() => { if (submitted && form.querySelector(":scope > .form-success")) markSent(); });
    form.addEventListener("submit", onSubmit, true);
    observer.observe(form, { childList: true });
    return () => { form.removeEventListener("submit", onSubmit, true); observer.disconnect(); };
  }, [markSent]);

  return (
    <ShiftChangeForm fields={fields ?? {}} className="wa-form shift-change-form" resolvedHref="/app/exchange?tab=requests">
      <div className="wa-fields" ref={body}>
        <SelectField
          className="wa-select"
          name="reasonCode"
          label="Reason"
          hint="Choose the closest match."
          value={reason}
          required
          onChange={(event) => {
            setReason(event.target.value);
            noteInput.current?.setCustomValidity(
              calloutReasonNoteError(event.target.value, note) ?? "",
            );
          }}
          options={[
            { value: "", label: "Choose a reason", disabled: true },
            ...reasons.map(([value, label]) => ({ value, label })),
          ]}
        />
        <div className="wa-field">
        <label className="wa-field__control">
          <span className="wa-field__label">More details{reason === "OTHER" ? null : <span className="wa-field__optional" aria-hidden="true">Optional</span>}</span>
          <textarea
            ref={noteInput}
            aria-describedby={detailsId}
            required={reason === "OTHER"}
            minLength={reason === "OTHER" ? 3 : undefined}
            name="reasonNote"
            maxLength={300}
            rows={4}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              event.target.setCustomValidity(
                calloutReasonNoteError(reason, event.target.value) ?? "",
              );
            }}
            placeholder="What should your manager know?"
          />
        </label>
          <span className="wa-field__help wa-field__help--split">
            <span id={detailsId}>
              {reason === "OTHER"
                ? "For Other, add at least 3 characters. Share only what your manager needs."
                : "Share only what your manager needs to review it."}
            </span>
            <span className="wa-field__count" aria-label={`${note.length} of 300 characters`}>{note.length}/300</span>
          </span>
        </div>
        {!fields ? (
          <Notice tone="urgent" title="The shift changed">Your reason is kept. Refresh to see the shift as it is now, then send.</Notice>
        ) : null}
        {!fields ? (
          <button className="nv-btn" data-kind="secondary" data-block="true" type="button" onClick={() => router.refresh()}>
            Refresh the shift
          </button>
        ) : null}
      </div>
      <div className="wa-card-body">
        <FormActions note="A manager reviews it. If they approve it, the shift opens for someone else to pick up.">
          <PendingButton pending="Sending…" disabled={!fields} block>Send report</PendingButton>
          <Link className="nv-btn" data-kind="secondary" data-block="true" href="/app/exchange?tab=my">Cancel</Link>
        </FormActions>
      </div>
    </ShiftChangeForm>
  );
}
