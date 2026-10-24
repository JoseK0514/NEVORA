"use client";

import { useFormStatus } from "react-dom";
import { useKeepHeight } from "./wave-a/keep-height";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";

/** Decline and Approve for one request in the Time-off list. While the decision is out, both are disabled
 * and the one pressed says what it's doing (form pattern). */
export function TimeOffReviewActions({ name, quiet = false }: { name?: string; quiet?: boolean }) {
  const { pending, data } = useFormStatus();
  const decision = data?.get("decision");
  const decline = useKeepHeight<HTMLButtonElement>(pending);
  const approve = useKeepHeight<HTMLButtonElement>(pending);
  // Quiet (v4): two equal pills under the row, words only.
  if (quiet) return <div className="q-acts" aria-busy={pending}>
    <button className="q-bs" type="submit" name="decision" value="DENIED" disabled={pending} aria-label={name && !pending ? `Decline time off for ${name}` : undefined}>{pending && decision === "DENIED" ? "Declining…" : "Decline"}</button>
    <button className="q-bs q-bs--go" type="submit" name="decision" value="APPROVED" disabled={pending} aria-label={name && !pending ? `Approve time off for ${name}` : undefined}>{pending && decision === "APPROVED" ? "Approving…" : "Approve"}</button>
    <span className="q-sr" role="status">{pending ? "Saving your decision…" : ""}</span>
  </div>;
  return <div className="wa-decision" aria-busy={pending}>
    <button ref={decline} className="nv-btn" data-kind="secondary" type="submit" name="decision" value="DENIED" disabled={pending} aria-label={name && !pending ? `Decline time off for ${name}` : undefined}>
      {pending && decision === "DENIED" ? null : <XIcon size={18} weight="bold" aria-hidden="true" />}{pending && decision === "DENIED" ? "Declining…" : "Decline"}
    </button>
    <button ref={approve} className="nv-btn" data-kind="primary" type="submit" name="decision" value="APPROVED" disabled={pending} aria-label={name && !pending ? `Approve time off for ${name}` : undefined}>
      {pending && decision === "APPROVED" ? null : <CheckIcon size={18} weight="bold" aria-hidden="true" />}{pending && decision === "APPROVED" ? "Approving…" : "Approve"}
    </button>
    <span className="nv-sr" role="status">{pending ? "Saving your decision…" : ""}</span>
  </div>;
}
