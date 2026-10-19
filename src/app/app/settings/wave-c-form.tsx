"use client";

import { createContext, useContext, useEffect, useRef, useState,
  type FormEvent, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import type { ConfigurationResult } from "@/components/configuration-form";
import { Notice } from "./wave-c-kit";

/* Wave C form pattern (PARALLEL.md): labels above fields (48px, the shared WR-55 rule), help 8px under the field,
 * errors in urgent ink with an icon and words, one primary action. The browser still checks
 * required, pattern and length; we only replace its bubble with the field's own sentence. */

type Validity = "missing" | "pattern" | "range" | "length" | "type";
export type FieldMessages = Record<string, Partial<Record<Validity | "fallback", string>>>;
const ErrorsContext = createContext<Record<string, string>>({});

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
function message(control: Control, messages: FieldMessages) {
  const words = messages[control.name] ?? {}, validity = control.validity;
  return (validity.valueMissing && words.missing)
    || (validity.patternMismatch && words.pattern)
    || ((validity.rangeUnderflow || validity.rangeOverflow || validity.stepMismatch || validity.badInput) && words.range)
    || ((validity.tooLong || validity.tooShort) && words.length)
    || (validity.typeMismatch && words.type)
    || words.fallback || "Check this entry.";
}

/** Field errors for one form: spread `handlers` on the <form>, wrap fields in <FieldErrors>. */
export function useFieldErrors(messages: FieldMessages, onInvalid?: (control: Control) => void) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const first = useRef<Control | null>(null);
  const handlers = {
    onInvalidCapture(event: FormEvent<HTMLFormElement>) {
      const control = event.target as Control;
      if (!control.name) return;
      event.preventDefault();
      onInvalid?.(control);
      setErrors(current => ({ ...current, [control.name]: message(control, messages) }));
      if (!first.current) {
        first.current = control;
        requestAnimationFrame(() => { first.current?.focus(); first.current = null; });
      }
    },
    onInputCapture(event: FormEvent<HTMLFormElement>) {
      const control = event.target as Control;
      if (control.name && control.validity?.valid) setErrors(current => {
        if (!(control.name in current)) return current;
        const next = { ...current }; delete next[control.name]; return next;
      });
    },
  };
  return { errors, handlers, clear: () => setErrors({}) };
}

export function FieldErrors({ errors, children }: { errors: Record<string, string>; children: ReactNode }) {
  return <ErrorsContext.Provider value={errors}>{children}</ErrorsContext.Provider>;
}

type Common = { id: string; name?: string; className?: string; "aria-describedby"?: string };
type InputControl = Common & { kind?: "input" } & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "className">;
type SelectControl = Common & { kind: "select" } & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "name" | "className">;
type TextareaControl = Common & { kind: "textarea" } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "name" | "className">;
type FieldProps = {
  label: ReactNode; help?: ReactNode; helpId?: string; optional?: boolean; labelAside?: ReactNode;
  /** An error the form sets itself (a server answer); field checks come from <FieldErrors>. */
  error?: string;
  /** A fixed unit after the value ("min"). */
  unit?: string;
  fieldClassName?: string;
  inputRef?: Ref<HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement>;
} & (InputControl | SelectControl | TextareaControl);

/** One field: label, the control, its error and help. Renders its own control so it works from server pages. */
export function Field(props: FieldProps) {
  const { label, help, helpId, optional, labelAside, error, unit, fieldClassName, inputRef, kind = "input", className, ...control } = props;
  const errors = useContext(ErrorsContext);
  const { id, name } = control;
  const shown = error ?? (name ? errors[name] : undefined);
  const describedHelp = help ? helpId ?? `${id}-help` : undefined;
  const errorId = shown ? `${id}-error` : undefined;
  const describedBy = [control["aria-describedby"], describedHelp, errorId].filter(Boolean).join(" ") || undefined;
  const shared = { ...control, className: className ? `wc-control ${className}` : "wc-control", "aria-describedby": describedBy, "aria-invalid": shown ? true : undefined, ref: inputRef };
  const element = kind === "select"
    ? <span className="wc-select"><select {...(shared as SelectHTMLAttributes<HTMLSelectElement>)} /><CaretDownIcon className="wc-select__caret" size={18} weight="bold" aria-hidden="true" /></span>
    : kind === "textarea" ? <textarea {...(shared as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      : unit ? <span className="wc-unit"><input {...(shared as InputHTMLAttributes<HTMLInputElement>)} /><span aria-hidden="true">{unit}</span></span>
        : <input {...(shared as InputHTMLAttributes<HTMLInputElement>)} />;
  return (
    <div className={fieldClassName ? `wc-field ${fieldClassName}` : "wc-field"} data-invalid={shown ? "true" : undefined}>
      <div className="wc-field__label-row">
        <label className="wc-label" htmlFor={id}>{label}{optional ? <span className="wc-optional"> Optional</span> : null}</label>
        {labelAside}
      </div>
      {element}
      {shown ? <p className="wc-error" id={errorId}><WarningCircleIcon size={18} weight="fill" aria-hidden="true" />{shown}</p> : null}
      {help ? <div className="wc-help" id={describedHelp}>{help}</div> : null}
    </div>
  );
}

/** Locks page scroll behind a dialog (the root element, so it also holds in landscape where html clips). */
export function lockPageScroll() {
  const root = document.documentElement, body = document.body;
  const previous = [root.style.overflow, body.style.overflow];
  root.style.overflow = "hidden"; body.style.overflow = "hidden";
  return () => { root.style.overflow = previous[0]; body.style.overflow = previous[1]; };
}

/** A button label that swaps to its pending words without changing the button's width. */
export function ButtonLabel({ pending, idle, busy }: { pending: boolean; idle: ReactNode; busy: ReactNode }) {
  return <span className="wc-swap" data-state={pending ? "pending" : "idle"}><span>{idle}</span><span>{busy}</span></span>;
}

/** A yes/no setting as a switch: the whole row is the target. */
export function SwitchRow({ id, name, label, description, checked, defaultChecked, onChange, disabled, describedBy, value }: {
  id: string; name?: string; label: ReactNode; description?: ReactNode; checked?: boolean; defaultChecked?: boolean;
  onChange?: (checked: boolean) => void; disabled?: boolean; describedBy?: string; value?: string;
}) {
  const descriptionId = description ? `${id}-description` : undefined;
  return (
    <label className="wc-switch-row" htmlFor={id} data-disabled={disabled ? "true" : undefined}>
      <span className="wc-switch-row__text">
        <span className="wc-switch-row__label" id={`${id}-label`}>{label}</span>
        {description ? <span className="wc-switch-row__description" id={descriptionId}>{description}</span> : null}
      </span>
      <input id={id} name={name} value={value} type="checkbox" role="switch" className="wc-switch" disabled={disabled}
        {...(checked === undefined ? { defaultChecked } : { checked })}
        onChange={event => onChange?.(event.target.checked)}
        aria-labelledby={`${id}-label`} aria-describedby={[descriptionId, describedBy].filter(Boolean).join(" ") || undefined} />
    </label>
  );
}

/** Buttons at the end of a form: primary first (full width on phones), then the secondary action. */
export function FormActions({ children, sticky = false }: { children: ReactNode; sticky?: boolean }) {
  const bar = useRef<HTMLDivElement>(null);
  // ST-13, ST-15: on phones a save bar is fixed above the tab bar. Measure both, so the bar sits exactly on the
  // tab bar at any text size and the page keeps room for the bar under its last card.
  useEffect(() => {
    if (!sticky || !bar.current) return;
    const root = document.documentElement, element = bar.current;
    const measure = () => {
      const nav = document.querySelector<HTMLElement>(".mobile-nav");
      const navHeight = nav && getComputedStyle(nav).display !== "none" ? nav.getBoundingClientRect().height : 0;
      root.style.setProperty("--wc-tabbar", `${Math.round(navHeight)}px`);
      root.style.setProperty("--wc-bar", `${Math.round(element.getBoundingClientRect().height)}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    const nav = document.querySelector(".mobile-nav");
    if (nav) observer.observe(nav);
    window.addEventListener("resize", measure);
    measure();
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); root.style.removeProperty("--wc-tabbar"); root.style.removeProperty("--wc-bar"); };
  }, [sticky]);
  return <div ref={bar} className={sticky ? "wc-actions nv-actionbar" : "wc-actions"} role={sticky ? "group" : undefined} aria-label={sticky ? "Save" : undefined}>{children}</div>;
}

/** The settings save form: the browser posts once per tap, entries stay on failure,
 * and the outcome appears just above the buttons and takes focus. */
export function SettingsForm({ action, children, reviewedUpdatedAt, messages = {}, submitLabel, pendingLabel = "Saving…",
  secondary, successTitle = "Saved", showServerSuccess = true, errorTitle = "Not saved", onResult, className, sticky = false, disabled = false, label }: {
  action: (data: FormData) => Promise<ConfigurationResult>;
  children: ReactNode;
  reviewedUpdatedAt?: string;
  messages?: FieldMessages;
  submitLabel: ReactNode;
  pendingLabel?: string;
  secondary?: ReactNode;
  successTitle?: string;
  /** false when the server's sentence only repeats the title. */
  showServerSuccess?: boolean;
  errorTitle?: string;
  onResult?: (result: ConfigurationResult) => void;
  className?: string;
  sticky?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const [result, setResult] = useState<ConfigurationResult>({});
  const [pending, setPending] = useState(false);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState(reviewedUpdatedAt);
  const sending = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const { errors, handlers, clear } = useFieldErrors(messages);
  useEffect(() => { if (result.error || result.success) feedback.current?.focus({ preventScroll: false }); }, [result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || disabled) return;
    // noValidate keeps the shared validation layer off this form; Wave C checks the declared constraints itself.
    if (!event.currentTarget.checkValidity()) return;
    const data = new FormData(event.currentTarget);
    if (draftUpdatedAt !== undefined) data.set("expectedUpdatedAt", draftUpdatedAt);
    sending.current = true;
    setPending(true);
    setResult({});
    clear();
    try {
      const saved = await action(data);
      const next = saved.error || saved.success ? saved : { error: "It may not have saved. Your entries are kept; check the page before you try again." };
      setResult(next);
      onResult?.(next);
      if (saved.success && !saved.error && saved.updatedAt && draftUpdatedAt !== undefined) setDraftUpdatedAt(saved.updatedAt);
    } catch {
      const failed = { error: "Your entries are kept. Try again." };
      setResult(failed);
      onResult?.(failed);
    } finally {
      sending.current = false;
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className={className ? `wc-form ${className}` : "wc-form"} aria-busy={pending} aria-label={label} data-guard={disabled ? "" : undefined} {...handlers}
      onInput={() => { if (result.error || result.success) setResult({}); }}>
      <fieldset disabled={pending || disabled} className="wc-fieldset">
        {draftUpdatedAt !== undefined ? <input type="hidden" name="expectedUpdatedAt" value={draftUpdatedAt} /> : null}
        <FieldErrors errors={errors}>{children}</FieldErrors>
      </fieldset>
      <p className="nv-sr" role="status" aria-live="polite">{pending ? pendingLabel : ""}</p>
      {result.error || result.success ? (
        <div ref={feedback} tabIndex={-1} className="wc-feedback" role={result.error ? "alert" : "status"}>
          <Notice tone={result.error ? "urgent" : "done"} title={result.error ? errorTitle : successTitle}>{result.error || (showServerSuccess ? result.success : null)}</Notice>
        </div>
      ) : null}
      <FormActions sticky={sticky}>
        <button type="submit" className="nv-btn" data-kind="primary" disabled={pending || disabled}><ButtonLabel pending={pending} idle={submitLabel} busy={pendingLabel} /></button>
        {secondary}
      </FormActions>
    </form>
  );
}
