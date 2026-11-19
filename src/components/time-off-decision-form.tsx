"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { isNextRouterError } from "next/dist/client/components/is-next-router-error";
import { reviewTimeOffAction } from "@/app/app/requests/actions";
import { BCallout } from "@/components/owner-b/b-kit";
import "./time-off-decision-form.css";

/** Audit NV-AUDIT-05 (Nov 19, 2026): a time-off decision whose answer never arrives. The server may already have saved it
 * (the connection dropped after it finished, or the server failed part way), so the Manager is told it isn't confirmed
 * yet, never "Nothing was changed" (the page's error screen, where this used to land). Decline and Approve step aside
 * until the Manager checks, so nothing is sent twice by a blind second tap; the check reads the request again: its own
 * page shows the decision if it was saved, and a request still waiting brings the buttons back.
 *
 * The action, its fields and its redirects are unchanged: a redirect or not-found from the server still reaches Next's
 * router. Used by the request page, the Waiting list and Things to do. */
export function TimeOffDecisionForm({ className, label, checkHref, children }: {
  className?: string; label?: string;
  /** The request's own page, opened by the check. Leave it out on that page: the check reads it again in place. */
  checkHref?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [unknown, setUnknown] = useState(false);
  const [asked, setAsked] = useState(false);
  const [checking, startCheck] = useTransition();
  const notice = useRef<HTMLDivElement>(null);
  async function decide(formData: FormData) {
    setUnknown(false); setAsked(false);
    try { await reviewTimeOffAction(formData); }
    catch (error) { if (isNextRouterError(error)) throw error; setUnknown(true); }
  }
  // The pressed button is gone, so the notice takes focus and a keyboard or screen reader starts from it.
  useEffect(() => { if (unknown) notice.current?.focus(); }, [unknown]);
  function check() {
    setAsked(true);
    startCheck(() => { if (checkHref) router.push(checkHref); else router.refresh(); });
  }
  // The check came back and this request is still here, so it is still waiting: decide again.
  const waiting = unknown && asked && !checking;
  return <form action={decide} className={className} aria-label={label}>
    {unknown && !waiting ? <div ref={notice} tabIndex={-1} className="tod-unknown">
      <BCallout tone="amber" icon="unknown" role="alert" title="Your decision isn’t confirmed yet"
        action={{ label: checking ? "Checking…" : "Check the request", onClick: check }}>
        The answer didn’t arrive, so it may already be saved. Check the request before you decide again.
      </BCallout>
    </div> : <>
      {waiting ? <p className="tod-waiting" role="status">This request is still waiting. Decide again.</p> : null}
      {children}
    </>}
  </form>;
}
