"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import type { ConfigurationResult } from "@/components/configuration-form";
import type { PolicyWriteResult } from "@/lib/shift-changes/types";

/* Phase 3.5 Wave B forms. Presentation and submit handling only: each form calls the same server
 * action as before, with the same fields. What changes is what the screen does around the call:
 * one request per press, a pending label, an optional confirm step, and a failure shown in place
 * (a dropped connection no longer replaces the page with the error screen). */

type Submit = { label: string; pendingLabel: string; ariaLabel?: string; className: string; kind?: "primary" | "secondary" | "danger"; icon?: ReactNode };

/** A server-action form that keeps its page on failure. With `confirm`, the first press asks first. */
export function ActionForm({ action, submit, failure, confirm, className, children }: {
  action: (data: FormData) => Promise<unknown> | unknown;
  submit: Submit;
  failure: string;
  confirm?: { prompt: string; keepLabel: string };
  className?: string;
  children?: ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [asking, setAsking] = useState(false);
  const busy = useRef(false), asked = useRef(false);
  const askRef = useRef<HTMLButtonElement>(null), openRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (asked.current) (asking ? askRef : openRef).current?.focus(); }, [asking]);
  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    if (confirm && !asking) { asked.current = true; setAsking(true); return; }
    const data = new FormData(event.currentTarget);
    busy.current = true; setError("");
    startTransition(async () => {
      try { await action(data); }
      catch (failureCause) { unstable_rethrow(failureCause); setError(failure); }
      finally { busy.current = false; }
    });
  }
  const label = pending ? submit.pendingLabel : submit.label;
  return <form className={className} onSubmit={send} data-confirming={asking || undefined} aria-busy={pending || undefined}>
    {children}
    {asking ? <div className="wb-confirm" role="group" aria-label={confirm!.prompt}>
      <p className="wb-text">{confirm!.prompt}</p>
      <div className="wb-actions">
        <button ref={askRef} type="submit" className="nv-btn" data-kind={submit.kind === "danger" ? "danger" : "primary"} aria-disabled={pending || undefined} aria-busy={pending || undefined}>{label}</button>
        <button type="button" className="nv-btn" data-kind="secondary" disabled={pending} onClick={() => { asked.current = true; setAsking(false); }}>{confirm!.keepLabel}</button>
      </div>
    </div> : <button ref={openRef} type="submit" className={submit.className} data-kind={submit.kind === "danger" ? undefined : submit.kind} aria-label={pending ? submit.pendingLabel : submit.ariaLabel} aria-disabled={pending || undefined} aria-busy={pending || undefined}>
      <span aria-live="polite">{label}</span>{submit.icon}
    </button>}
    {error ? <p className="wb-error" role="alert"><WarningCircleIcon size={18} aria-hidden="true" /><span>{error}</span></p> : null}
  </form>;
}

/** Scheduling rules' long staffing and hours form: its status lives in the save bar beside the button. */
export function RulesSaveForm({ action, children, bar }: {
  action: (data: FormData) => Promise<ConfigurationResult>;
  children: ReactNode;
  bar: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<"saved" | string | null>(null);
  const busy = useRef(false), button = useRef<HTMLButtonElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = new FormData(event.currentTarget);
    busy.current = true; setPending(true); setResult(null);
    try {
      const saved = await action(data);
      setResult(saved.error ? saved.error : "saved");
    } catch {
      setResult("Changes could not be saved. Your entries are preserved; try again.");
    } finally {
      busy.current = false; setPending(false);
    }
  }
  return <form onSubmit={submit} className="wb-form wb-auto wb-config" aria-busy={pending || undefined}>
    <fieldset disabled={pending} className="configuration-fields">{children}</fieldset>
    {bar ? <div className="nv-actionbar wb-savebar" role="group" aria-label="Staffing and weekly hours">
      {result === "saved"
        ? <p className="wb-saved" role="status"><CheckCircleIcon size={18} weight="fill" aria-hidden="true" /><span>Scheduling rules saved.</span></p>
        : result
          ? <p className="wb-error" role="alert"><WarningCircleIcon size={18} aria-hidden="true" /><span>{result}</span></p>
          : <p className="wb-note">Staffing &amp; weekly hours save together and apply right away.</p>}
      <button ref={button} className="nv-btn" data-kind="primary" type="submit" aria-disabled={pending || undefined} aria-busy={pending || undefined}>{pending ? "Saving…" : "Save staffing & hours"}</button>
    </div> : null}
  </form>;
}

/** A smaller settings form (add a coverage period, position quantities): pending label and status beside its button. */
export function InlineConfigForm({ action, children, submit, successText, className }: {
  action: (data: FormData) => Promise<ConfigurationResult>;
  children: ReactNode;
  submit: { label: string; pendingLabel: string; kind: "primary" | "secondary" };
  successText: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<"saved" | string | null>(null);
  const busy = useRef(false);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = new FormData(event.currentTarget);
    busy.current = true; setPending(true); setResult(null);
    try { const saved = await action(data); setResult(saved.error ? saved.error : "saved"); }
    catch { setResult("Changes could not be saved. Your entries are preserved; try again."); }
    finally { busy.current = false; setPending(false); }
  }
  return <form onSubmit={send} className={className ? `wb-form wb-auto wb-config ${className}` : "wb-form wb-auto wb-config"} aria-busy={pending || undefined}>
    <fieldset disabled={pending} className="configuration-fields">{children}</fieldset>
    <div className="wb-actions"><button className="nv-btn" data-kind={submit.kind} type="submit" aria-disabled={pending || undefined} aria-busy={pending || undefined}>{pending ? submit.pendingLabel : submit.label}</button></div>
    {result === "saved" ? <p className="wb-saved" role="status"><CheckCircleIcon size={18} weight="fill" aria-hidden="true" /><span>{successText}</span></p>
      : result ? <p className="wb-error" role="alert"><WarningCircleIcon size={18} aria-hidden="true" /><span>{result}</span></p> : null}
  </form>;
}

/** Trade or coverage policy for one workflow (Owner). Same request as the shared PolicySaveForm (expected
 * revision, then a refresh on save), plus a pending label and IS-B23's check that finishing can't be
 * asked earlier than asking. */
export function PolicyForm({ revision, action, saveLabel, children }: {
  revision: number;
  action: (data: FormData) => Promise<PolicyWriteResult>;
  saveLabel: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [currentRevision, setRevision] = useState(revision);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "saved" | "error" | "conflict"; text: string } | null>(null);
  const [orderError, setOrderError] = useState(false);
  const busy = useRef(false);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = new FormData(event.currentTarget);
    const ask = String(data.get("submissionAdvanceMinutes") ?? ""), finish = String(data.get("completionAdvanceMinutes") ?? "");
    const finishField = event.currentTarget.elements.namedItem("completionAdvanceMinutes") as HTMLInputElement | null;
    if (ask !== "" && finish !== "" && Number(finish) > Number(ask)) {
      setOrderError(true); setMessage(null);
      finishField?.setAttribute("aria-invalid", "true");
      finishField?.focus();
      return;
    }
    finishField?.removeAttribute("aria-invalid");
    setOrderError(false);
    data.set("expectedRevision", String(currentRevision));
    busy.current = true; setPending(true); setMessage(null);
    try {
      const next = await action(data);
      if (next.status === "saved") { setRevision(next.revision); setMessage({ tone: "saved", text: "Policy saved." }); router.refresh(); }
      else if (next.status === "invalid") setMessage({ tone: "error", text: next.fieldErrors.map(item => item.message).join(" ") });
      else setMessage({ tone: "conflict", text: "This policy changed. Reload and review the current values before saving again." });
    } catch {
      setMessage({ tone: "conflict", text: "We couldn’t confirm the save. Reload the current policy before saving again; your entries are kept." });
    } finally { busy.current = false; setPending(false); }
  }
  return <form onSubmit={send} className="wb-form" aria-busy={pending || undefined} data-order-error={orderError || undefined}>
    <input type="hidden" name="expectedRevision" value={currentRevision} />
    <fieldset className="configuration-fields wb-form" disabled={pending}>{children}</fieldset>
    {orderError ? <p className="wb-error" role="alert"><WarningCircleIcon size={18} aria-hidden="true" /><span>Finishing time can’t be more minutes ahead than the time to ask.</span></p> : null}
    <div className="wb-actions"><button type="submit" className="nv-btn" data-kind="primary" aria-disabled={pending || undefined} aria-busy={pending || undefined}>{pending ? "Saving…" : saveLabel}</button></div>
    {message?.tone === "saved" ? <p className="wb-saved" role="status"><CheckCircleIcon size={18} weight="fill" aria-hidden="true" /><span>{message.text}</span></p>
      : message ? <><p className="wb-error" role="alert"><WarningCircleIcon size={18} aria-hidden="true" /><span>{message.text}</span></p>{message.tone === "conflict" ? <div className="wb-actions"><button type="button" className="nv-btn" data-kind="secondary" onClick={() => window.location.reload()}>Reload current policy</button></div> : null}</> : null}
  </form>;
}
