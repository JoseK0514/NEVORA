"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useCalloutSent } from "./wave-a/callout-sent";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpenIcon } from "@phosphor-icons/react/dist/ssr/BookOpen";
import { BusIcon } from "@phosphor-icons/react/dist/ssr/Bus";
import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { HeartIcon } from "@phosphor-icons/react/dist/ssr/Heart";
import { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
import { ThermometerIcon } from "@phosphor-icons/react/dist/ssr/Thermometer";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { ShiftChangeForm } from "./shift-change-form";
import { calloutReasonNoteError } from "../lib/shift-changes/command-parser";
import { FormActions, Notice } from "./wave-a/parts";
import { PendingButton } from "./wave-a/pending-button";
import { SigHead } from "./signature/signature";
import sr from "./shift-requests-signature.module.css";

import { SigButton } from "./signature/sig-button";
const reasons = [
  ["ILLNESS", "Illness / sick", ThermometerIcon],
  ["FAMILY_EMERGENCY", "Family emergency", HeartIcon],
  ["TRANSPORTATION", "Transportation issue", BusIcon],
  ["SCHOOL", "School conflict", BookOpenIcon],
  ["PERSONAL_EMERGENCY", "Personal emergency", LightningIcon],
  ["OTHER", "Other", DotsThreeIcon],
] as const;

/** Keep the employee's unsent reason in this mounted form during RSC refresh.
 * New terms require another deliberate submit; refresh never sends a report.
 * Signature (phase 3): the six reasons are a grid of choices; same field names, validation and actions. */
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
    <ShiftChangeForm fields={fields ?? {}} className={`wa-form shift-change-form ${sr.srSwapForm}`} resolvedHref="/app/exchange?tab=requests">
      <div className={sr.srSwapBody} ref={body}>
        <fieldset className={sr.srReasons} aria-describedby={`${reasonId}-hint`}>
          <legend className="sg-h"><h2>Why can’t you work it?</h2></legend>
          <p className="nv-sr" id={`${reasonId}-hint`}>Choose the closest match.</p>
          <div className={sr.srReasonGrid}>
            {reasons.map(([value, label, Icon]) => <label key={value} className={sr.srReason} data-selected={reason === value || undefined}>
              <input type="radio" name="reasonCode" value={value} required checked={reason === value} onChange={() => {
                setReason(value);
                noteInput.current?.setCustomValidity(calloutReasonNoteError(value, note) ?? "");
              }} />
              <i aria-hidden="true"><Icon size={20} /></i>
              <b>{label}</b>
            </label>)}
          </div>
        </fieldset>
        <SigHead title={<label htmlFor={`${detailsId}-note`}>More details</label>} aside={reason === "OTHER" ? "Needed for Other" : "Optional"} />
        <div className={`sg-card ${sr.srNote}`}>
          <textarea
            id={`${detailsId}-note`}
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
            placeholder="What should your manager know?"
          />
          <p className="sg-card-foot"><span id={detailsId}>{reason === "OTHER" ? "For Other, add at least 3 characters. Share only what your manager needs." : "Share only what your manager needs to review it."}</span>
            <span className={sr.srCount} aria-label={`${note.length} of 300 characters`}>{note.length}/300</span></p>
        </div>
        <div className="sg-card" data-tone="amber">
          <div className="sg-card-head"><span className="sg-tile" data-tone="amber" aria-hidden="true"><WarningIcon size={22} /></span>
            <span className={sr.srHeadCopy}><b>It’s still your shift</b><small>You’re responsible for it until a manager approves your report.</small></span></div>
        </div>
        {!fields ? (
          <div className={sr.srNoticeTop}><Notice tone="urgent" title="The shift changed">Your reason is kept. Refresh to see the shift as it is now, then send.</Notice>
            <SigButton variant="secondary" className="sg-cta" data-kind="ghost" onClick={() => router.refresh()}>Refresh the shift</SigButton></div>
        ) : null}
      </div>
      <FormActions note={<>A manager reviews it. If they approve it, the shift opens for someone else to pick up. <Link href="/app/exchange?tab=requests">See my requests</Link></>}>
        <PendingButton pending="Sending…" disabled={!fields} block>Send report</PendingButton>
        <Link className="sg-link" href="/app/exchange?tab=my">Cancel</Link>
      </FormActions>
    </ShiftChangeForm>
  );
}
