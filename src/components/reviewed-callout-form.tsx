"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SelectField } from "./select-field";
import { ShiftChangeForm } from "./shift-change-form";
import { calloutReasonNoteError } from "../lib/shift-changes/command-parser";

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
      className="employee-form shift-change-form"
    >
      <SelectField
        name="reasonCode"
        label="Reason"
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
      <label>
        Additional details{" "}
        <span id={detailsId}>
          Required when selecting Other: at least 3 characters of detail.
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
          placeholder="Add any details management should know..."
        />
      </label>
      {!fields ? (
        <p role="alert">
          The assignment changed. Your reason is preserved. Refresh and review
          before submitting.
        </p>
      ) : null}
      {!fields ? (
        <button
          className="button secondary"
          type="button"
          onClick={() => router.refresh()}
        >
          Refresh and review assignment
        </button>
      ) : null}
      <div className="form-footer">
        <Link className="button secondary" href="/app/exchange?tab=my">
          Cancel
        </Link>
        <button
          className="employee-action primary"
          type="submit"
          disabled={!fields}
        >
          Submit Call-out
        </button>
      </div>
    </ShiftChangeForm>
  );
}
