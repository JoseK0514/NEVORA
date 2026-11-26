"use client";

import { copy } from "./wave-b-forms-copy";
import { usePortalLang, type PortalLang } from "@/lib/i18n/portal-lang";
import { FormDiscardGuard } from "./kit/discard-dialog";
import { createContext, useContext, useEffect, useId, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { BDoneMark } from "@/components/owner-b/b-kit";
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

/* Phase 3.5 Wave B forms (Phase 2, Nov 23, 2026: drawn with the Corp kit's buttons and the c-rf classes in
 * src/app/app/schedule/schedule-tools.css, the two pages that use them). Presentation and submit handling only: each form calls the same server
 * action as before, with the same fields. What changes is what the screen does around the call:
 * one request per press, a pending label, an optional confirm step, and a failure shown in place
 * (a dropped connection no longer replaces the page with the error screen). */

/** TC-B-14: the scheduling server actions' messages, said the way these pages say things. Unknown text passes through. */
const plainMessages: Record<string, keyof typeof copy.en> = {
  "Staffing requirements must be whole numbers between 1 and 100. Choose whether a designated Lead is required for each unconfigured location.": "minimumStaffMustBeWholeNumber",
  "Targets and maximums must be between 0 and 168 hours.": "targetsMaximumsMustBeFromHours",
  "Enter a valid day, time range, and optional staffing override.": "enterDayStartEndTimeStaff",
  "Coverage window could not be saved. Check duplicate periods, active positions, and whole-number quantities from 1 to 100.": "couldnAddPeriodMayAlreadyExist",
  "Settings could not be saved. Your entries are preserved.": "couldnSaveChangesTheyStillHere",
  "Coverage window could not be saved. Your entries are preserved.": "couldnAddPeriodEntriesAreStill",
  "Choose active positions and whole-number quantities from 1 to 100. Clear inactive quotas or reactivate their positions.": "useWholeNumbersFromClearQuantities",
  "Review approval mode and whole-number deadlines. Blank is unknown; completion advance must not exceed submission advance.": "checkHowRequestsAreApprovedUse",
  "Only an active Owner can save this policy.": "onlyOwnerCanSavePolicy",
};
function plain(message: string, lang: PortalLang) {
  const key = plainMessages[message];
  return key ? copy[lang][key] : message;
}

/** A saved line carries the app's one done mark (BDoneMark at its 36px row size; the line's layout is in
 * premium-wave-a.css, "Saved lines"). Decorative; the words say what was saved. */
function SavedMark() {
  return <BDoneMark />;
}

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
  useEffect(() => { if (!asked.current) return; const target = (asking ? askRef : openRef).current; target?.focus(); if (asking) target?.closest(".c-rf-confirm")?.scrollIntoView({ block: "nearest" }); }, [asking]);
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
    {asking ? <div className="c-rf-confirm" role="group" aria-label={confirm!.prompt}>
      <p className="c-rf-text">{confirm!.prompt}</p>
      <div className="c-rf-actions">
        <button ref={askRef} type="submit" className={submit.kind === "danger" ? "c-btn c-btn--danger" : "c-btn"} aria-disabled={pending || undefined} aria-busy={pending || undefined}>{label}</button>
        <button type="button" className="c-btn c-btn--secondary" disabled={pending} onClick={() => { asked.current = true; setAsking(false); }}>{confirm!.keepLabel}</button>
      </div>
    </div> : <button ref={openRef} type="submit" className={submit.className} data-kind={submit.kind === "danger" ? undefined : submit.kind} aria-label={pending ? submit.pendingLabel : submit.ariaLabel} aria-disabled={pending || undefined} aria-busy={pending || undefined}>
      <span aria-live="polite">{label}</span>{submit.icon}
    </button>}
    {error ? <p ref={errorRef} className="c-rf-error" role="alert"><WarningCircleIcon size={18} weight="bold" aria-hidden="true" /><span>{error}</span></p> : null}
  </form>;
}

/** Scheduling rules' long staffing and hours form: its status lives in the save bar beside the button. */
export function RulesSaveForm({ action, children, bar, lang = "en" }: {
  action: (data: FormData) => Promise<ConfigurationResult>;
  children: ReactNode;
  bar: boolean;
  lang?: PortalLang;
}) {
  const t = copy[lang];
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<"saved" | string | null>(null);
  const busy = useRef(false), button = useRef<HTMLButtonElement>(null);
  const [savedCount, setSavedCount] = useState(0);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = new FormData(event.currentTarget);
    busy.current = true;
    const restoreFocus = preservePendingFields(event.currentTarget);
    setPending(true); setResult(null);
    try {
      const saved = await action(data);
      setResult(saved.error ? plain(saved.error, lang) : "saved");
      if (!saved.error) setSavedCount(count => count + 1);
    } catch {
      setResult(copy[lang].couldnSaveChangesTheyStillHere);
    } finally {
      busy.current = false; setPending(false); restoreFocus();
    }
  }
  return <form onSubmit={submit} className="c-rf" aria-busy={pending || undefined}>
    {/* Leaving Scheduling rules with entries that are not saved asks first (Nov 21, 2026); a save starts clean. */}
    <FormDiscardGuard resetKey={savedCount} lang={lang} />
    <fieldset aria-disabled={pending || undefined} className="configuration-fields">{children}</fieldset>
    {bar ? <div className="c-rf-savebar" role="group" aria-label={t.staffingWeeklyHours}>
      {result === "saved"
        ? <p className="c-rf-saved" role="status"><SavedMark /><span>{t.schedulingRulesSaved}</span></p>
        : result
          ? <p className="c-rf-error" role="alert"><WarningCircleIcon size={18} weight="bold" aria-hidden="true" /><span>{result}</span></p>
          : null}
      <button ref={button} className="c-btn" type="submit" aria-disabled={pending || undefined} aria-busy={pending || undefined}>{pending ? t.saving : t.saveStaffingHours}</button>
    </div> : null}
  </form>;
}

/** A smaller settings form (add a coverage period, position quantities): pending label and status beside its button. */
export function InlineConfigForm({ action, children, submit, successText, className, lang = "en" }: {
  action: (data: FormData) => Promise<ConfigurationResult>;
  children: ReactNode;
  submit: { label: string; pendingLabel: string; kind: "primary" | "secondary" };
  successText: string;
  className?: string;
  lang?: PortalLang;
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<"saved" | string | null>(null);
  const busy = useRef(false);
  const [savedCount, setSavedCount] = useState(0);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = new FormData(event.currentTarget);
    busy.current = true;
    const restoreFocus = preservePendingFields(event.currentTarget);
    setPending(true); setResult(null);
    try { const saved = await action(data); setResult(saved.error ? plain(saved.error, lang) : "saved"); if (!saved.error) setSavedCount(count => count + 1); }
    catch { setResult(copy[lang].couldnSaveChangesTheyStillHere); }
    finally { busy.current = false; setPending(false); restoreFocus(); }
  }
  return <form onSubmit={send} className={className ? `c-rf ${className}` : "c-rf"} aria-busy={pending || undefined}>
    {/* Leaving Scheduling rules with entries that are not saved asks first (Nov 21, 2026); a save starts clean. */}
    <FormDiscardGuard resetKey={savedCount} lang={lang} />
    <fieldset aria-disabled={pending || undefined} className="configuration-fields">{children}</fieldset>
    <div className="c-rf-actions"><button className={submit.kind === "secondary" ? "c-btn c-btn--secondary" : "c-btn"} type="submit" aria-disabled={pending || undefined} aria-busy={pending || undefined}>{pending ? submit.pendingLabel : submit.label}</button></div>
    {result === "saved" ? <p className="c-rf-saved" role="status"><SavedMark /><span>{successText}</span></p>
      : result ? <p className="c-rf-error" role="alert"><WarningCircleIcon size={18} weight="bold" aria-hidden="true" /><span>{result}</span></p> : null}
  </form>;
}

const PolicyOrder = createContext<{ error: boolean; id: string }>({ error: false, id: "" });

/** IS-B28: the trade policy's order message, placed under the finishing-time field it describes. */
export function PolicyOrderError() {
  const { error, id } = useContext(PolicyOrder);
  const t = copy[usePortalLang()];
  return error ? <span className="c-rf-error" id={id} role="alert"><WarningCircleIcon size={18} weight="bold" aria-hidden="true" /><span>{t.finishingTimeCanBeMoreMinutes}</span></span> : null;
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
  const lang = usePortalLang();
  const t = copy[lang];
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
      if (next.status === "saved") { setRevision(next.revision); setMessage({ tone: "saved", text: t.policySaved }); router.refresh(); }
      else if (next.status === "invalid") setMessage({ tone: "error", text: next.fieldErrors.map(item => plain(item.message, lang)).join(" ") });
      else setMessage({ tone: "conflict", text: t.policyChangedReloadSeeCurrentValues });
    } catch {
      setMessage({ tone: "conflict", text: t.couldnSavePolicyReloadSeeCurrent });
    } finally { busy.current = false; setPending(false); restoreFocus(); }
  }
  return <form onSubmit={send} className="c-rf" aria-busy={pending || undefined} data-order-error={orderError || undefined}>
    <input type="hidden" name="expectedRevision" value={currentRevision} />
    <PolicyOrder.Provider value={{ error: orderError, id: orderId }}><fieldset className="configuration-fields c-rf__fields" aria-disabled={pending || undefined}>{children}</fieldset></PolicyOrder.Provider>
    <div className="c-rf-actions"><button type="submit" className="c-btn c-btn--secondary" aria-disabled={pending || undefined} aria-busy={pending || undefined}>{pending ? t.saving : saveLabel}</button></div>
    {message?.tone === "saved" ? <p className="c-rf-saved" role="status"><SavedMark /><span>{message.text}</span></p>
      : message ? <><p className="c-rf-error" role="alert"><WarningCircleIcon size={18} weight="bold" aria-hidden="true" /><span>{message.text}</span></p>{message.tone === "conflict" ? <div className="c-rf-actions"><button type="button" className="c-btn c-btn--secondary" onClick={() => window.location.reload()}>{t.reloadCurrentPolicy}</button></div> : null}</> : null}
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
