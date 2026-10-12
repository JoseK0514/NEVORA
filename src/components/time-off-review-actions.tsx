"use client";

import { useFormStatus } from "react-dom";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";

export function TimeOffReviewActions() {
  const { pending, data } = useFormStatus();
  const decision = data?.get("decision");
  return <div className="nto-review-buttons" aria-busy={pending}>
    <button className="nto-button nto-secondary" type="submit" name="decision" value="DENIED" disabled={pending}><XIcon size={18} aria-hidden="true" />{pending && decision === "DENIED" ? "Declining…" : "Decline"}</button>
    <button className="nto-button nto-primary" type="submit" name="decision" value="APPROVED" disabled={pending}><CheckIcon size={18} aria-hidden="true" />{pending && decision === "APPROVED" ? "Approving…" : "Approve"}</button>
    <span className="sr-only" role="status">{pending ? "Saving your decision…" : ""}</span>
  </div>;
}
