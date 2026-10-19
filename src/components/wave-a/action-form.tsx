"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { guardSingleSubmit } from "./single-submit";
import { unstable_rethrow } from "next/navigation";
import { revealFeedback } from "@/lib/reveal-feedback";
import { Notice } from "./parts";

/** A form for a server action that redirects when it's done (Approve, Decline, Delete).
 * If the request fails (offline, blocked, server down) the page stays, and a notice under the buttons says the
 * action wasn't saved; it's scrolled into view and focused. Redirects and other Next signals pass through. */
export function ActionForm({ action, children, className, label, failure }: {
  action: (data: FormData) => Promise<unknown>;
  children: ReactNode;
  className?: string;
  label?: string;
  failure: { title: string; body: string };
}) {
  const [failed, setFailed] = useState(0);
  const failures = useRef(0);
  const [busy, setBusy] = useState(false);
  const notice = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (form.current) guardSingleSubmit(form.current); }, []);
  useEffect(() => { if (failed && notice.current) revealFeedback(notice.current); }, [failed]);
  async function run(data: FormData) {
    setFailed(0);
    setBusy(true);
    try {
      await action(data);
      setBusy(false);
    } catch (error) {
      setBusy(false);
      unstable_rethrow(error);
      setFailed(++failures.current);
    }
  }
  return <form ref={form} action={run} className={className} aria-label={label} aria-busy={busy}>
    {children}
    {failed ? <div ref={notice} tabIndex={-1} className="wa-target"><Notice tone="urgent" title={failure.title}>{failure.body}</Notice></div> : null}
  </form>;
}
