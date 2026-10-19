"use client";

import { useFormStatus } from "react-dom";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";

/** The focused review's decision, in the kit's sticky action bar. Server rules decide. */
export function TimeOffReviewDecision() {
  const { pending, data } = useFormStatus();
  const decision = data?.get("decision");
  return <div className="nv-actionbar premium-review-actions" role="group" aria-label="Decision" aria-busy={pending}>
    <button className="nv-btn" data-kind="secondary" type="submit" name="decision" value="DENIED" disabled={pending}>
      <XIcon size={18} weight="bold" aria-hidden="true" />{pending && decision === "DENIED" ? "Declining…" : "Decline"}
    </button>
    <button className="nv-btn" data-kind="primary" type="submit" name="decision" value="APPROVED" disabled={pending}>
      <CheckIcon size={18} weight="bold" aria-hidden="true" />{pending && decision === "APPROVED" ? "Approving…" : "Approve"}
    </button>
    <span className="sr-only" role="status">{pending ? "Saving your decision…" : ""}</span>
  </div>;
}
