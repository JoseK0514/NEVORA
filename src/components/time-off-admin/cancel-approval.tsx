"use client";
import { useViewLang } from "@/components/owner-b/use-owner-lang";
import { useEffect, useId, useRef, useState } from "react";
import { TimeOffDecisionForm } from "@/components/time-off-decision-form";
import { ptoCopy, type PtoLang } from "./copy";

/* PTO screens (Nov 20, 2026): cancelling an approved time off request from Team time off › Approved. The existing
 * reviewTimeOffAction takes `decision: "CANCELLED"`; the server gives back the exact paid time the approval used and
 * tells the person. One tap opens the confirmation in place; the decision form handles a lost answer as for Approve and
 * Decline (the check reads the list again; a request still approved brings the button back). */
export function CancelApproval({ requestId, name, when, lang: langProp }: { requestId: string; name: string; when: string; lang?: PtoLang }) {
  const lang = useViewLang(langProp);
  const t = ptoCopy(lang), id = useId();
  const [open, setOpen] = useState(false);
  const title = useRef<HTMLParagraphElement>(null), opener = useRef<HTMLButtonElement>(null), wasOpen = useRef(false);
  useEffect(() => {
    if (open) title.current?.focus();
    else if (wasOpen.current) opener.current?.focus();
    wasOpen.current = open;
  }, [open]);
  if (!open) return <div className="pto-cancel"><button ref={opener} type="button" className="pto-cancel__open b-rowact b-rowact--quiet" aria-label={t.cancelApprovedLabel(name, when)} onClick={() => setOpen(true)}>{t.cancelApproved}</button></div>;
  return <div className="pto-cancel pto-cancel--open b-ask" role="group" aria-labelledby={`${id}-t`} lang={lang}>
    <p className="pto-cancel__t b-ask__t" id={`${id}-t`} ref={title} tabIndex={-1}>{t.cancelConfirmTitle}</p>
    <p className="pto-cancel__s b-ask__s">{t.cancelConfirmBody}</p>
    <TimeOffDecisionForm className="pto-cancel__acts b-ask__acts" label={t.cancelApprovedLabel(name, when)} waitingLine={t.stillApproved}>
      <input type="hidden" name="requestId" value={requestId} />
      <button type="button" className="b-btn b-btn--quiet b-rowact b-rowact--quiet b-ask__keep" onClick={() => setOpen(false)}>{t.cancelKeep}</button>
      <button type="submit" name="decision" value="CANCELLED" className="b-btn b-btn--quiet pto-cancel__go b-ask__go">{t.cancelConfirm}</button>
    </TimeOffDecisionForm>
  </div>;
}
