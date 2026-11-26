"use client";

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
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { REVIEWED_FORMS_COPY } from "./reviewed-forms-copy";

// Release 1 (board E-CantWorkSheet): the board's four reasons, as on the phone sheet. The server still accepts the
// earlier codes, so reports made with them stay readable.
const reasons = ["ILLNESS", "FAMILY_EMERGENCY", "TRANSPORTATION", "OTHER"] as const;

/** Keep the employee's unsent reason in this mounted form during RSC refresh.
 * New terms require another deliberate submit; refresh never sends a report.
 * v5 sheet (mockup E05): the reasons as choice rows; same field names, validation and actions. */
export function ReviewedCalloutForm({
  fields,
  shift,
  error,
}: {
  fields: Readonly<Record<string, string>> | null;
  shift?: ExchangeShift;
  error?: string;
}) {
  const t = REVIEWED_FORMS_COPY[usePortalLang()];
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
        <div className="q-nav"><SheetCancel href="/app/exchange?tab=my" /><h1 className="q-nav__t">{t.cantWorkTitle}</h1><PendingButton pending={t.sending} disabled={!fields} className="q-nav__r q-nav__r--b" label={t.sendReport}>{t.send}</PendingButton></div>
        {error ? <p className="q-help q-help--alert" role="alert">{t.notSent(error)}</p> : null}
        {shift ? <><div className="q-grp q-grp--m"><h2>{t.shift}</h2></div><QuietList><SwapShiftRow shift={shift} /></QuietList></> : null}
        <fieldset className="q-fieldset" aria-describedby={`${reasonId}-hint`}>
          <legend className="q-grp">{t.reason}</legend>
          <p className="nv-sr" id={`${reasonId}-hint`}>{t.reasonHint}</p>
          <ul className="q-list">
            {reasons.map(value => <li key={value}><label className="q-row q-row--one q-row--pick">
              <span className="q-rt"><b>{t.reasons[value]}</b></span>
              <input type="radio" className="q-pick" required name="reasonCode" value={value} checked={reason === value} onChange={() => {
                setReason(value);
                noteInput.current?.setCustomValidity(calloutReasonNoteError(value, note) ?? "");
              }} />
              <span className="q-radio" aria-hidden="true" />
            </label></li>)}
          </ul>
        </fieldset>
        <div className="q-fl">
          <div className="q-fl__row"><label className="q-fl__label" htmlFor={`${detailsId}-note`}>{t.note} <span className="q-fl__opt">· {reason === "OTHER" ? t.neededForOther : t.optional}</span></label><span className="q-fl__opt" aria-label={t.characters(note.length)}>{note.length}/300</span></div>
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
            placeholder={t.notePlaceholder}
          />
          <p className="q-fl__help" id={detailsId}>{reason === "OTHER" ? t.otherHelp : t.noteHelp}</p>
        </div>
        <p className="q-help">{t.stillYours} <Link href="/app/exchange?tab=requests">{t.seeRequests}</Link></p>
        {!fields ? (
          <div role="alert">
            <p className="q-help q-help--alert">{t.shiftChanged}</p>
            <button type="button" className="q-btn q-btn--sec" onClick={() => router.refresh()}>{t.refreshShift}</button>
          </div>
        ) : null}
      </div>
    </ShiftChangeForm>
  );
}
