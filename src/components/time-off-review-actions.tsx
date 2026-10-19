"use client";

import { useFormStatus } from "react-dom";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";

/** Decline and Approve for one request in the Time-off list. While the decision is out, both are disabled
 * and the one pressed says what it's doing (form pattern). */
export function TimeOffReviewActions({ name }: { name?: string }) {
  const { pending, data } = useFormStatus();
  const decision = data?.get("decision");
  return <div className="wa-decision" aria-busy={pending}>
    <button className="nv-btn" data-kind="secondary" type="submit" name="decision" value="DENIED" disabled={pending} aria-label={name && !pending ? `Decline time off for ${name}` : undefined}>
      {pending && decision === "DENIED" ? null : <XIcon size={18} weight="bold" aria-hidden="true" />}{pending && decision === "DENIED" ? "Declining…" : "Decline"}
    </button>
    <button className="nv-btn" data-kind="primary" type="submit" name="decision" value="APPROVED" disabled={pending} aria-label={name && !pending ? `Approve time off for ${name}` : undefined}>
      {pending && decision === "APPROVED" ? null : <CheckIcon size={18} weight="bold" aria-hidden="true" />}{pending && decision === "APPROVED" ? "Approving…" : "Approve"}
    </button>
    <span className="nv-sr" role="status">{pending ? "Saving your decision…" : ""}</span>
  </div>;
}
