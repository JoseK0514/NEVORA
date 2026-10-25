"use client";
import './quiet/u3.css';

import { useEffect, useId, useRef, useState } from "react";
import { useCalloutSent } from "./wave-a/callout-sent";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShiftChangeForm } from "./shift-change-form";
import { calloutReasonNoteError } from "../lib/shift-changes/command-parser";
import { PendingButton } from "./wave-a/pending-button";
import { SheetCancel } from "./quiet/quiet-sheet";
import { QuietList } from "./quiet/quiet";
import { SwapShiftRow } from "./reviewed-swap-form";
import type { ExchangeShift } from "../lib/data/exchanges";

const reasons = [
  ["ILLNESS", "Illness / sick"],
  ["FAMILY_EMERGENCY", "Family emergency"],
  ["TRANSPORTATION", "Transportation issue"],
  ["SCHOOL", "School conflict"],
  ["PERSONAL_EMERGENCY", "Personal emergency"],
  ["OTHER", "Other"],
] as const;

/** Keep the employee's unsent reason in this mounted form during RSC refresh.
 * New terms require another deliberate submit; refresh never sends a report.
 * v5 sheet (mockup E05): the six reasons as choice rows; same field names, validation and actions. */
export function ReviewedCalloutForm({
  fields,
  shift,
  error,
}: {
  fields: Readonly<Record<string, string>> | null;
  shift?: ExchangeShift;
  error?: string;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const router = useRouter();
  const noteInput = useRef<HTMLTextAreaElement>(null);
  const detailsId = useId();
  const reasonId = useId();
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
    <ShiftChangeForm fields={fields ?? {}} className="shift-change-form q-scform" resolvedHref="/app/exchange?tab=requests">
      <div ref={body}>
        <div className="q-nav"><SheetCancel href="/app/schedule" /><h1 className="q-nav__t">Unable to work</h1><PendingButton pending="Sending…" disabled={!fields} className="q-nav__r q-nav__r--b" label="Send report">Send</PendingButton></div>
        {error ? <p className="q-help q-help--alert" role="alert">Your report wasn’t sent. {error}</p> : null}
        {shift ? <><div className="q-grp q-grp--m"><h2>Shift</h2></div><QuietList><SwapShiftRow shift={shift} /></QuietList></> : null}
        <fieldset className="q-fieldset" aria-describedby={`${reasonId}-hint`}>
          <legend className="q-grp">Reason</legend>
          <p className="nv-sr" id={`${reasonId}-hint`}>Why can’t you work it? Choose the closest match.</p>
          <ul className="q-list">
            {reasons.map(([value, label]) => <li key={value}><label className="q-row q-row--one q-row--pick">
              <span className="q-rt"><b>{label}</b></span>
              <input type="radio" className="q-pick" required name="reasonCode" value={value} checked={reason === value} onChange={() => {
                setReason(value);
                noteInput.current?.setCustomValidity(calloutReasonNoteError(value, note) ?? "");
              }} />
              <span className="q-radio" aria-hidden="true" />
            </label></li>)}
          </ul>
        </fieldset>
        <div className="q-fl">
          <div className="q-fl__row"><label className="q-fl__label" htmlFor={`${detailsId}-note`}>Note <span className="q-fl__opt">· {reason === "OTHER" ? "needed for Other" : "optional"}</span></label><span className="q-fl__opt" aria-label={`${note.length} of 300 characters`}>{note.length}/300</span></div>
          <textarea
            id={`${detailsId}-note`}
            className="q-in"
            ref={noteInput}
            aria-describedby={detailsId}
            required={reason === "OTHER"}
            minLength={reason === "OTHER" ? 3 : undefined}
            name="reasonNote"
            maxLength={300}
            rows={3}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              event.target.setCustomValidity(calloutReasonNoteError(reason, event.target.value) ?? "");
            }}
            placeholder="Add a short note"
          />
          <p className="q-fl__help" id={detailsId}>{reason === "OTHER" ? "For Other, add at least 3 characters. Share only what your manager needs." : "Share only what your manager needs to review it."}</p>
        </div>
        <p className="q-help">It’s still your shift until a manager approves your report. If they do, the shift opens for someone else to pick up.</p>
        {/* P2-17: a real footer link, not a bare inline line. */}
        <Link className="q-link" href="/app/exchange?tab=requests">See my requests</Link>
        {!fields ? (
          <div role="alert">
            <p className="q-help q-help--alert">The shift changed. Your reason is kept. Refresh to see the shift as it is now, then send.</p>
            <button type="button" className="q-btn q-btn--sec" onClick={() => router.refresh()}>Refresh the shift</button>
          </div>
        ) : null}
      </div>
    </ShiftChangeForm>
  );
}
