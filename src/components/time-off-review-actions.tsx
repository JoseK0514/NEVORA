"use client";

import { useFormStatus } from "react-dom";
import { useKeepHeight } from "./wave-a/keep-height";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { useEffect } from "react";
import { DecisionAsk } from "@/components/owner-b/decision-parts";
import { useAskStep } from "@/components/owner-b/ask-step";
import { firstName } from "@/components/time-off-waiting-list";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { TIME_COPY } from "@/components/time-copy";

/** Decline and Approve for one request in the Time-off list. While the decision is out, both are disabled
 * and the one pressed says what it's doing (form pattern). */
export function TimeOffReviewActions({ name, quiet = false, corp = false }: { name?: string; quiet?: boolean; corp?: boolean }) {
  const { pending, data } = useFormStatus();
  const decision = data?.get("decision");
  const t = TIME_COPY[usePortalLang()];
  const ASK = t.ask;
  const decline = useKeepHeight<HTMLButtonElement>(pending);
  const approve = useKeepHeight<HTMLButtonElement>(pending);
  // Jose (Nov 21, 2026): Decline asks first here too, in the block the Waiting list and Things to do use. Decline opens
  // the question and sends nothing; the question's Decline is the same submit (decision=DENIED) as before. Approve
  // stays one tap. Once the decision is out the buttons are back with "Declining…", as they were.
  const { open, ask, keep, done: closeAsk, titleRef, openerRef, mark } = useAskStep();
  useEffect(() => { if (pending) closeAsk(); }, [pending, closeAsk]);
  const who = name ?? t.thisPerson;
  if (open && !pending) return <DecisionAsk className="tod-ask" titleRef={titleRef} groupLabel={t.declineForAsk(who)} question={ASK.question} consequence={name ? ASK.consequence(firstName(name)) : ASK.consequenceAnyone}
    keep={ASK.keep} keepLabel={name ? t.keepFor(name) : undefined} onKeep={keep} go={ASK.decline} goLabel={name ? t.declineFor(name) : undefined} goValue="DENIED" />;
  // Release 1 (board O-RequestDetail): Decline (outline) and Approve (teal) side by side, full width, 44px.
  if (corp) return <div className="c-btns" aria-busy={pending}>
    <button ref={openerRef} className="c-btn c-btn--secondary b-rowact b-rowact--quiet" type="button" onClick={ask} disabled={pending} aria-label={name && !pending ? t.declineFor(name) : undefined}>{pending && decision === "DENIED" ? t.declining : t.decline}</button>
    <button className="c-btn" type="submit" name="decision" value="APPROVED" disabled={pending} aria-label={name && !pending ? t.approveFor(name) : undefined}>{pending && decision === "APPROVED" ? t.approving : t.approve}</button>
    <span className="c-sr" role="status">{pending ? t.saving : ""}</span>
  </div>;
  // Quiet (v4): two equal pills under the row, words only.
  if (quiet) return <div className="q-acts" aria-busy={pending}>
    <button ref={openerRef} className="q-bs" type="button" onClick={ask} disabled={pending} aria-label={name && !pending ? t.declineFor(name) : undefined}>{pending && decision === "DENIED" ? t.declining : t.decline}</button>
    <button className="q-bs q-bs--go" type="submit" name="decision" value="APPROVED" disabled={pending} aria-label={name && !pending ? t.approveFor(name) : undefined}>{pending && decision === "APPROVED" ? t.approving : t.approve}</button>
    <span className="q-sr" role="status">{pending ? t.saving : ""}</span>
  </div>;
  return <div className="wa-decision" aria-busy={pending}>
    <button ref={decline} {...mark} className="nv-btn" data-kind="secondary" type="button" onClick={ask} disabled={pending} aria-label={name && !pending ? t.declineFor(name) : undefined}>
      {pending && decision === "DENIED" ? null : <XIcon size={18} weight="bold" aria-hidden="true" />}{pending && decision === "DENIED" ? t.declining : t.decline}
    </button>
    <button ref={approve} className="nv-btn" data-kind="primary" type="submit" name="decision" value="APPROVED" disabled={pending} aria-label={name && !pending ? t.approveFor(name) : undefined}>
      {pending && decision === "APPROVED" ? null : <CheckIcon size={18} weight="bold" aria-hidden="true" />}{pending && decision === "APPROVED" ? t.approving : t.approve}
    </button>
    <span className="nv-sr" role="status">{pending ? t.saving : ""}</span>
  </div>;
}
