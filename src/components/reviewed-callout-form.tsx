"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SelectField } from "./select-field";
import { ShiftChangeForm } from "./shift-change-form";
import { calloutReasonNoteError } from "../lib/shift-changes/command-parser";
import { NavIcon } from "./nav-icon";
import styles from "./callout-view.module.css";

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

  return (
    <ShiftChangeForm
      fields={fields ?? {}}
      className={`shift-change-form ${styles.form}`}
    >
      <SelectField
        name="reasonCode"
        label="Reason (required)"
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
          { value: "", label: "Select a reason", disabled: true },
          ...reasons.map(([value, label]) => ({ value, label })),
        ]}
      />
      <label className={styles.notes}>
        <span className={styles.notesTitle}>
          Additional details <small>{reason === "OTHER" ? "Required" : "Optional"}</small>
        </span>
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
          placeholder="What should management know?"
        />
        <span className={styles.notesHelp}>
          <span id={detailsId}>
            {reason === "OTHER"
              ? "For Other, add at least 3 characters of detail."
              : "Add context if it would help management review your report."}
          </span>
          <span aria-label={`${note.length} of 300 characters`}>{note.length}/300</span>
        </span>
      </label>
      <p className={styles.privacy}><NavIcon name="requests" size={16} />Share only the details management needs to review your report.</p>
      {!fields ? (
        <p className={styles.stale} role="alert">
          The assignment changed. Your reason is preserved. Refresh and review
          before submitting.
        </p>
      ) : null}
      {!fields ? (
        <button
          className={styles.refresh}
          type="button"
          onClick={() => router.refresh()}
        >
          Refresh and review assignment
        </button>
      ) : null}
      <div className={styles.actions}>
        <Link href="/app/exchange?tab=my">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={!fields}
        >
          Submit callout <NavIcon name="arrowRight" size={18} />
        </button>
      </div>
      <p className={styles.receipt}>Submitting sends your report for management review. If approved, the shift opens for coverage. <Link href="/app/exchange?tab=requests">View my requests <NavIcon name="arrowRight" size={16} /></Link></p>
    </ShiftChangeForm>
  );
}
