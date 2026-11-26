"use client";

import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import type { ConfigurationResult } from "@/components/configuration-form";
import { DiscardGuard, FormDiscardGuard } from "@/components/kit/discard-dialog";
import { CorpFormFooter } from "@/components/corp/corp";
import { Notice } from "./wave-c-kit";
import { BBusyLabel } from "@/components/owner-b/b-kit";
import { FieldErrors, defaultEntries, formEntries, useFieldError, useFieldErrors, type FieldMessages } from "./wave-c-form";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { SETTINGS_COPY } from "./settings-copy";

/* Settings in Direction B (Nov 23, 2026): the form pieces, drawn with the corporate kit's classes so the Direction B
 * layers dress them as every other Owner form (outlined 48px fields, labels above, the one error style, the solid teal
 * Save). The behaviour is the older Settings form's: the browser's checks with each field's own sentence, one request per
 * tap, entries kept on failure, Save after a change, and "Discard changes?" on leaving. */

type Common = { id: string; name?: string; className?: string; "aria-describedby"?: string };
type InputControl = Common & { kind?: "input" } & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "className">;
type SelectControl = Common & { kind: "select" } & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "name" | "className">;
type TextareaControl = Common & { kind: "textarea" } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "name" | "className">;
export type FieldBProps = {
  label: ReactNode; help?: ReactNode; helpId?: string; optional?: boolean;
  /** An error the form sets itself; the browser's checks come from <FieldErrors>. */
  error?: string;
  /** A fixed unit after the value ("min"). */
  unit?: string;
  inputRef?: Ref<HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement>;
} & (InputControl | SelectControl | TextareaControl);

/** One field: its label above, the outlined control, the error (glyph and words) and one grey help line. */
export function FieldB(props: FieldBProps) {
  const { label, help, helpId, optional, error, unit, inputRef, kind = "input", className, ...control } = props;
  const { id, name } = control;
  const held = useFieldError(name);
  const shown = error ?? held;
  const helpRef = help ? helpId ?? `${id}-help` : undefined;
  const errorId = shown ? `${id}-error` : undefined;
  const describedBy = [control["aria-describedby"], errorId, helpRef].filter(Boolean).join(" ") || undefined;
  const shared = { ...control, className: className ? `c-in ${className}` : "c-in", "aria-describedby": describedBy, "aria-invalid": shown ? true : undefined, ref: inputRef };
  const element = kind === "select" ? <select {...(shared as SelectHTMLAttributes<HTMLSelectElement>)} />
    : kind === "textarea" ? <textarea {...(shared as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      : unit ? <span className="c-in__wrap c-setb-unit"><input {...(shared as InputHTMLAttributes<HTMLInputElement>)} /><span className="c-in__suffix" aria-hidden="true">{unit}</span></span>
        : <input {...(shared as InputHTMLAttributes<HTMLInputElement>)} />;
  return <div className="c-field c-setb-field" data-invalid={shown ? "true" : undefined}>
    <label className="c-field__label" htmlFor={id}>{label}{optional ? <span className="c-setb-opt"> (optional)</span> : null}</label>
    {element}
    {shown ? <p className="c-error" id={errorId}><WarningCircleIcon weight="bold" aria-hidden="true" />{shown}</p> : null}
    {help ? <span className="c-field__help" id={helpRef}>{help}</span> : null}
  </div>;
}

/** A yes/no setting: the whole row is the target, the corporate kit's switch on its right. A locked row keeps its state
 * and says why on its second line. */
export function SwitchRowB({ id, name, label, description, checked, defaultChecked, onChange, disabled, locked, describedBy, value, status }: {
  id: string; name?: string; label: ReactNode; description?: ReactNode; checked?: boolean; defaultChecked?: boolean;
  onChange?: (checked: boolean) => void; disabled?: boolean; locked?: boolean; describedBy?: string; value?: string;
  /** Optional words for the state beside the switch ("On", "Off"), hidden from screen readers (the switch says it). */
  status?: ReactNode;
}) {
  const descriptionId = description ? `${id}-description` : undefined;
  return <label className={description ? "c-row c-setb-switch" : "c-row c-row--one c-setb-switch"} htmlFor={id} data-disabled={disabled ? "" : undefined} data-locked={locked ? "" : undefined}>
    <span className="c-row__main">
      <span className="c-row__title" id={`${id}-label`}>{label}</span>
      {description ? <span className="c-row__detail"><span id={descriptionId}>{description}</span></span> : null}
    </span>
    {status ?? null}
    <input id={id} name={name} value={value} type="checkbox" role="switch" className="c-switch" disabled={disabled}
      {...(checked === undefined ? { defaultChecked } : { checked })}
      onChange={event => onChange?.(event.target.checked)}
      aria-labelledby={`${id}-label`} aria-describedby={[descriptionId, describedBy].filter(Boolean).join(" ") || undefined} />
  </label>;
}

/** One choice of several: the row is the target, a radio circle on its right (filled teal when chosen). */
export function RadioRowB({ name, value, checked, onChange, disabled, title, detail }: {
  name: string; value: string; checked: boolean; onChange: () => void; disabled?: boolean; title: ReactNode; detail?: ReactNode;
}) {
  return <label className={detail ? "c-row c-setb-radio" : "c-row c-row--one c-setb-radio"} data-checked={checked ? "" : undefined}>
    <input className="c-setb-radio__in" type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={onChange} />
    <span className="c-row__main"><span className="c-row__title">{title}</span>{detail ? <span className="c-row__detail"><span>{detail}</span></span> : null}</span>
    <span className="c-setb-radio__dot" aria-hidden="true" />
  </label>;
}

/** The result of a save or an action, in the kit's notice card under the form, focused so it is read once. */
export function ResultB({ tone, title, children, action, innerRef }: { tone: "done" | "urgent" | "info"; title?: ReactNode; children?: ReactNode; action?: ReactNode; innerRef?: Ref<HTMLDivElement> }) {
  return <div ref={innerRef} tabIndex={-1} className="c-setb-result" role={tone === "urgent" ? "alert" : "status"}><Notice tone={tone} title={title} action={action}>{children}</Notice></div>;
}

/** The settings save form, as one white card. Phones save from the band (the page's `phoneRight`, `form={id}`); tablets
 * and desktop from the card's footer. With `saveOnChange` both appear only once an entry differs from what was loaded or
 * last saved. The outcome stands under the card and takes focus. */
export function SettingsFormB({ id, action, children, messages = {}, submitLabel: givenSubmit, pendingLabel: givenPending, successTitle: givenSuccess, showServerSuccess = true,
  errorTitle: givenError, onResult, saveOnChange = false, label, cancel, disabled = false, reviewedUpdatedAt }: {
  id: string;
  action: (data: FormData) => Promise<ConfigurationResult>;
  children: ReactNode;
  messages?: FieldMessages;
  submitLabel?: ReactNode;
  pendingLabel?: string;
  successTitle?: string;
  /** false when the server's sentence only repeats the title. */
  showServerSuccess?: boolean;
  errorTitle?: string;
  onResult?: (result: ConfigurationResult) => void;
  saveOnChange?: boolean;
  label?: string;
  /** Tablets and desktop: a Cancel beside Save in the footer. */
  cancel?: ReactNode;
  disabled?: boolean;
  reviewedUpdatedAt?: string;
}) {
  // Signed-in Spanish: the form's own defaults follow the person's language; a caller's words are its own.
  const t = SETTINGS_COPY[usePortalLang()];
  const submitLabel = givenSubmit ?? t.save, pendingLabel = givenPending ?? t.saving, successTitle = givenSuccess ?? t.saved, errorTitle = givenError ?? t.notSaved;
  const [result, setResult] = useState<ConfigurationResult>({});
  const [pending, setPending] = useState(false);
  const [stamp, setStamp] = useState(reviewedUpdatedAt);
  const sending = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const { errors, handlers, clear } = useFieldErrors(messages);
  useEffect(() => { if (result.error || result.success) feedback.current?.focus({ preventScroll: false }); }, [result]);
  const form = useRef<HTMLFormElement>(null);
  const baseline = useRef<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  useEffect(() => {
    if (!saveOnChange || !form.current) return;
    baseline.current = defaultEntries(Array.from(form.current.elements) as never);
    setDirty(formEntries(new FormData(form.current)) !== baseline.current);
  }, [saveOnChange]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || disabled) return;
    if (!event.currentTarget.checkValidity()) return;
    const data = new FormData(event.currentTarget);
    if (stamp !== undefined) data.set("expectedUpdatedAt", stamp);
    sending.current = true; setPending(true); setResult({}); clear();
    try {
      const saved = await action(data);
      const next = saved.error || saved.success ? saved : { error: t.mayNotHaveSaved };
      if (saveOnChange && saved.success && !saved.error) { baseline.current = formEntries(data); setDirty(false); }
      if (saved.success && !saved.error) setSavedCount(count => count + 1);
      setResult(next); onResult?.(next);
      if (saved.success && !saved.error && saved.updatedAt && stamp !== undefined) setStamp(saved.updatedAt);
    } catch {
      const failed = { error: t.entriesKept };
      setResult(failed); onResult?.(failed);
    } finally { sending.current = false; setPending(false); }
  }

  const showSave = !saveOnChange || dirty || pending;
  // The form is the card itself, so the page's card rhythm (the lift over the band, the gaps between cards) applies to it.
  return <>
    <form ref={form} noValidate id={id} onSubmit={submit} className="c-card c-setb-form" aria-busy={pending} aria-label={label} {...handlers}
      data-save-on-change={saveOnChange ? "" : undefined} data-dirty={saveOnChange && (dirty || pending) ? "" : undefined}
      onInput={event => { if (result.error || result.success) setResult({}); if (saveOnChange) setDirty(formEntries(new FormData(event.currentTarget)) !== baseline.current); }}>
      <fieldset disabled={pending || disabled} className="c-setb-fieldset">
        {stamp !== undefined ? <input type="hidden" name="expectedUpdatedAt" value={stamp} /> : null}
        <FieldErrors errors={errors}>{children}</FieldErrors>
      </fieldset>
      {showSave || cancel ? <CorpFormFooter>{cancel ?? null}{showSave ? <button type="submit" className="c-btn" disabled={pending || disabled} aria-busy={pending || undefined}><BBusyLabel busy={pending} busyLabel={pendingLabel}>{submitLabel}</BBusyLabel></button> : null}</CorpFormFooter> : null}
      {saveOnChange ? <DiscardGuard dirty={dirty} /> : <FormDiscardGuard resetKey={savedCount} />}
      <p className="c-sr" role="status" aria-live="polite">{pending ? pendingLabel : ""}</p>
    </form>
    {result.error || result.success ? <ResultB innerRef={feedback} tone={result.error ? "urgent" : "done"} title={result.error ? errorTitle : successTitle}>{result.error || (showServerSuccess ? result.success : null)}</ResultB> : null}
  </>;
}
