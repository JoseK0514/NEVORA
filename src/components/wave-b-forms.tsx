"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import type { ConfigurationResult } from "@/components/configuration-form";
import type { PolicyWriteResult } from "@/lib/shift-changes/types";

/** IS-B31: keep an Enter-submitting field focused and read-only while the captured command runs. */
function preservePendingFields(form: HTMLFormElement) {
  const before = document.activeElement as HTMLElement | null;
  const controls = [...form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>("fieldset.configuration-fields :is(input, select, textarea, button)")];
  const held = controls.find(control => control === before && (control instanceof HTMLTextAreaElement || control instanceof HTMLInputElement && !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(control.type)));
  const previous = controls.map(control => ({ control, disabled: control.disabled, readOnly: "readOnly" in control ? control.readOnly : undefined }));
  // Controls without a native read-only state hand focus to the still-focusable submit action.
  if (before && controls.some(control => control === before) && !held) form.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus({ preventScroll: true });
  for (const control of controls) {
    if (control === held && "readOnly" in control) control.readOnly = true;
    else control.disabled = true;
  }
  return () => {
    for (const { control, disabled, readOnly } of previous) {
      control.disabled = disabled;
      if (readOnly !== undefined && "readOnly" in control) control.readOnly = readOnly;
    }
    requestAnimationFrame(() => { if (!document.activeElement || document.activeElement === document.body) before?.focus({ preventScroll: true }); });
  };
}

/* Phase 3.5 Wave B forms. Presentation and submit handling only: each form calls the same server
 * action as before, with the same fields. What changes is what the screen does around the call:
 * one request per press, a pending label, an optional confirm step, and a failure shown in place
 * (a dropped connection no longer replaces the page with the error screen). */

/** TC-B-14: the scheduling server actions' messages, said the way these pages say things. Unknown text passes through. */
const plainMessages: Record<string, string> = {
  "Staffing requirements must be whole numbers between 1 and 100. Choose whether a designated Lead is required for each unconfigured location.": "Minimum staff must be a whole number from 1 to 100, and each new location needs a designated lead choice.",
  "Targets and maximums must be between 0 and 168 hours.": "Targets and maximums must be from 0 to 168 hours.",
  "Enter a valid day, time range, and optional staffing override.": "Enter a day, a start and end time, and staff numbers if you need them.",
  "Coverage window could not be saved. Check duplicate periods, active positions, and whole-number quantities from 1 to 100.": "Couldn’t add this period. It may already exist, or a quantity isn’t a whole number from 1 to 100.",
  "Settings could not be saved. Your entries are preserved.": "Couldn’t save your changes. They’re still here; try again.",
  "Coverage window could not be saved. Your entries are preserved.": "Couldn’t add this period. Your entries are still here; try again.",
  "Choose active positions and whole-number quantities from 1 to 100. Clear inactive quotas or reactivate their positions.": "Use whole numbers from 1 to 100, and clear quantities for inactive positions.",
  "Review approval mode and whole-number deadlines. Blank is unknown; completion advance must not exceed submission advance.": "Check how requests are approved, and use whole minutes. Finishing time can’t be more minutes ahead than the time to ask.",
  "Only an active Owner can save this policy.": "Only an owner can save this policy.",
};
const plain = (message: string) => plainMessages[message] ?? message;

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
  useEffect(() => { if (!asked.current) return; const target = (asking ? askRef : openRef).current; target?.focus(); if (asking) target?.closest(".wb-confirm")?.scrollIntoView({ block: "nearest" }); }, [asking]);
  const errorRef = useRef<HTMLParagraphElement>(null);
  // IS-B26: a failure comes into view above the tab bar.
  useEffect(() => { if (error) errorRef.current?.scrollIntoView({ block: "nearest" }); }, [error]);
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
    {error ? <p ref={errorRef} className="wb-error" role="alert"><WarningCircleIcon size={18} aria-hidden="true" /><span>{error}</span></p> : null}
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
    busy.current = true;
    const restoreFocus = preservePendingFields(event.currentTarget);
    setPending(true); setResult(null);
    try {
      const saved = await action(data);
      setResult(saved.error ? plain(saved.error) : "saved");
    } catch {
      setResult("Couldn’t save your changes. They’re still here; try again.");
    } finally {
      busy.current = false; setPending(false); restoreFocus();
    }
  }
  return <form onSubmit={submit} className="wb-form wb-auto wb-config" aria-busy={pending || undefined}>
    <fieldset aria-disabled={pending || undefined} className="configuration-fields">{children}</fieldset>
    {bar ? <div className="nv-actionbar wb-savebar" role="group" aria-label="Staffing and weekly hours">
      {result === "saved"
        ? <p className="wb-saved" role="status"><CheckCircleIcon size={18} weight="fill" aria-hidden="true" /><span>Scheduling rules saved.</span></p>
        : result
          ? <p className="wb-error" role="alert"><WarningCircleIcon size={18} aria-hidden="true" /><span>{result}</span></p>
          : <p className="wb-note">Staffing and weekly hours save together and apply right away.</p>}
      <button ref={button} className="nv-btn" data-kind="primary" type="submit" aria-disabled={pending || undefined} aria-busy={pending || undefined}>{pending ? "Saving…" : "Save staffing and hours"}</button>
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
    busy.current = true;
    const restoreFocus = preservePendingFields(event.currentTarget);
    setPending(true); setResult(null);
    try { const saved = await action(data); setResult(saved.error ? plain(saved.error) : "saved"); }
    catch { setResult("Couldn’t save your changes. They’re still here; try again."); }
    finally { busy.current = false; setPending(false); restoreFocus(); }
  }
  return <form onSubmit={send} className={className ? `wb-form wb-auto wb-config ${className}` : "wb-form wb-auto wb-config"} aria-busy={pending || undefined}>
    <fieldset aria-disabled={pending || undefined} className="configuration-fields">{children}</fieldset>
    <div className="wb-actions"><button className="nv-btn" data-kind={submit.kind} type="submit" aria-disabled={pending || undefined} aria-busy={pending || undefined}>{pending ? submit.pendingLabel : submit.label}</button></div>
    {result === "saved" ? <p className="wb-saved" role="status"><CheckCircleIcon size={18} weight="fill" aria-hidden="true" /><span>{successText}</span></p>
      : result ? <p className="wb-error" role="alert"><WarningCircleIcon size={18} aria-hidden="true" /><span>{result}</span></p> : null}
  </form>;
}

const PolicyOrder = createContext<{ error: boolean; id: string }>({ error: false, id: "" });

/** IS-B28: the trade policy's order message, placed under the finishing-time field it describes. */
export function PolicyOrderError() {
  const { error, id } = useContext(PolicyOrder);
  return error ? <span className="wb-error" id={id} role="alert"><WarningCircleIcon size={18} aria-hidden="true" /><span>Finishing time can’t be more minutes ahead than the time to ask.</span></span> : null;
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
  const orderId = useId();
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = new FormData(event.currentTarget);
    const ask = String(data.get("submissionAdvanceMinutes") ?? ""), finish = String(data.get("completionAdvanceMinutes") ?? "");
    const finishField = event.currentTarget.elements.namedItem("completionAdvanceMinutes") as HTMLInputElement | null;
    if (ask !== "" && finish !== "" && Number(finish) > Number(ask)) {
      setOrderError(true); setMessage(null);
      finishField?.setAttribute("aria-invalid", "true");
      finishField?.setAttribute("aria-describedby", orderId);
      finishField?.focus();
      return;
    }
    finishField?.removeAttribute("aria-invalid");
    finishField?.removeAttribute("aria-describedby");
    setOrderError(false);
    data.set("expectedRevision", String(currentRevision));
    busy.current = true;
    const restoreFocus = preservePendingFields(event.currentTarget);
    setPending(true); setMessage(null);
    try {
      const next = await action(data);
      if (next.status === "saved") { setRevision(next.revision); setMessage({ tone: "saved", text: "Policy saved." }); router.refresh(); }
      else if (next.status === "invalid") setMessage({ tone: "error", text: next.fieldErrors.map(item => plain(item.message)).join(" ") });
      else setMessage({ tone: "conflict", text: "This policy changed. Reload to see the current values, then enter your changes again." });
    } catch {
      setMessage({ tone: "conflict", text: "Couldn’t save the policy. Reload to see the current values, then enter your changes again if they’re missing." });
    } finally { busy.current = false; setPending(false); restoreFocus(); }
  }
  return <form onSubmit={send} className="wb-form" aria-busy={pending || undefined} data-order-error={orderError || undefined}>
    <input type="hidden" name="expectedRevision" value={currentRevision} />
    <PolicyOrder.Provider value={{ error: orderError, id: orderId }}><fieldset className="configuration-fields wb-form" aria-disabled={pending || undefined}>{children}</fieldset></PolicyOrder.Provider>
    <div className="wb-actions"><button type="submit" className="nv-btn" data-kind="primary" aria-disabled={pending || undefined} aria-busy={pending || undefined}>{pending ? "Saving…" : saveLabel}</button></div>
    {message?.tone === "saved" ? <p className="wb-saved" role="status"><CheckCircleIcon size={18} weight="fill" aria-hidden="true" /><span>{message.text}</span></p>
      : message ? <><p className="wb-error" role="alert"><WarningCircleIcon size={18} aria-hidden="true" /><span>{message.text}</span></p>{message.tone === "conflict" ? <div className="wb-actions"><button type="button" className="nv-btn" data-kind="secondary" onClick={() => window.location.reload()}>Reload current policy</button></div> : null}</> : null}
  </form>;
}

/** IS-B30: WebKit doesn't apply scroll-padding when Tab moves focus, so a focused field can land under the
 * tab bar or the save bar. This nudges the page by the same padding the stylesheet sets. Renders nothing. */
export function KeepFocusClear() {
  useEffect(() => {
    const onFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.getBoundingClientRect) return;
      const style = getComputedStyle(document.documentElement);
      const top = parseFloat(style.scrollPaddingTop) || 0, bottom = parseFloat(style.scrollPaddingBottom) || 0;
      const box = target.getBoundingClientRect();
      // Only keyboard focus, and only a target that fits: a click on page content focuses the tall <main>, which must not scroll.
      if (!target.matches(":focus-visible") || box.height > window.innerHeight - top - bottom) return;
      if (box.bottom > window.innerHeight - bottom) window.scrollBy({ top: box.bottom - (window.innerHeight - bottom) });
      else if (box.top < top) window.scrollBy({ top: box.top - top });
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, []);
  return null;
}
