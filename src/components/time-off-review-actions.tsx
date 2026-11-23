"use client";

import { useFormStatus } from "react-dom";
import { useKeepHeight } from "./wave-a/keep-height";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { useEffect } from "react";
import { DecisionAsk } from "@/components/owner-b/decision-parts";
import { useAskStep } from "@/components/owner-b/ask-step";
import { ASK, firstName } from "@/components/time-off-waiting-list";

/** Decline and Approve for one request in the Time-off list. While the decision is out, both are disabled
 * and the one pressed says what it's doing (form pattern). */
export function TimeOffReviewActions({ name, quiet = false, corp = false }: { name?: string; quiet?: boolean; corp?: boolean }) {
  const { pending, data } = useFormStatus();
  const decision = data?.get("decision");
  const decline = useKeepHeight<HTMLButtonElement>(pending);
  const approve = useKeepHeight<HTMLButtonElement>(pending);
  // Jose (Nov 21, 2026): Decline asks first here too, in the block the Waiting list and Things to do use. Decline opens
  // the question and sends nothing; the question's Decline is the same submit (decision=DENIED) as before. Approve
  // stays one tap. Once the decision is out the buttons are back with "Declining…", as they were.
  const { open, ask, keep, done: closeAsk, titleRef, openerRef, mark } = useAskStep();
  useEffect(() => { if (pending) closeAsk(); }, [pending, closeAsk]);
  const who = name ?? "this person";
  if (open && !pending) return <DecisionAsk className="tod-ask" titleRef={titleRef} groupLabel={`Decline time off for ${who}?`} question={ASK.question} consequence={name ? ASK.consequence(firstName(name)) : ASK.consequenceAnyone}
    keep={ASK.keep} keepLabel={name ? `Keep time off request for ${name}` : undefined} onKeep={keep} go={ASK.decline} goLabel={name ? `Decline time off for ${name}` : undefined} goValue="DENIED" />;
  // Release 1 (board O-RequestDetail): Decline (outline) and Approve (teal) side by side, full width, 44px.
  if (corp) return <div className="c-btns" aria-busy={pending}>
    <button ref={openerRef} className="c-btn c-btn--secondary b-rowact b-rowact--quiet" type="button" onClick={ask} disabled={pending} aria-label={name && !pending ? `Decline time off for ${name}` : undefined}>{pending && decision === "DENIED" ? "Declining…" : "Decline"}</button>
    <button className="c-btn" type="submit" name="decision" value="APPROVED" disabled={pending} aria-label={name && !pending ? `Approve time off for ${name}` : undefined}>{pending && decision === "APPROVED" ? "Approving…" : "Approve"}</button>
    <span className="c-sr" role="status">{pending ? "Saving your decision…" : ""}</span>
  </div>;
  // Quiet (v4): two equal pills under the row, words only.
  if (quiet) return <div className="q-acts" aria-busy={pending}>
    <button ref={openerRef} className="q-bs" type="button" onClick={ask} disabled={pending} aria-label={name && !pending ? `Decline time off for ${name}` : undefined}>{pending && decision === "DENIED" ? "Declining…" : "Decline"}</button>
    <button className="q-bs q-bs--go" type="submit" name="decision" value="APPROVED" disabled={pending} aria-label={name && !pending ? `Approve time off for ${name}` : undefined}>{pending && decision === "APPROVED" ? "Approving…" : "Approve"}</button>
    <span className="q-sr" role="status">{pending ? "Saving your decision…" : ""}</span>
  </div>;
  return <div className="wa-decision" aria-busy={pending}>
    <button ref={decline} {...mark} className="nv-btn" data-kind="secondary" type="button" onClick={ask} disabled={pending} aria-label={name && !pending ? `Decline time off for ${name}` : undefined}>
      {pending && decision === "DENIED" ? null : <XIcon size={18} weight="bold" aria-hidden="true" />}{pending && decision === "DENIED" ? "Declining…" : "Decline"}
    </button>
    <button ref={approve} className="nv-btn" data-kind="primary" type="submit" name="decision" value="APPROVED" disabled={pending} aria-label={name && !pending ? `Approve time off for ${name}` : undefined}>
      {pending && decision === "APPROVED" ? null : <CheckIcon size={18} weight="bold" aria-hidden="true" />}{pending && decision === "APPROVED" ? "Approving…" : "Approve"}
    </button>
    <span className="nv-sr" role="status">{pending ? "Saving your decision…" : ""}</span>
  </div>;
}
