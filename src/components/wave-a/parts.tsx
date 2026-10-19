import type { ReactNode } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";

/* Wave A building blocks on top of the kit (Phase 3.5). Presentation only: callers pass
 * already-authorized, already-formatted data. Styles live in src/app/app/premium-wave-a.css. */

const noticeGlyph = { urgent: WarningCircleIcon, done: CheckCircleIcon, info: InfoIcon, review: WarningCircleIcon } as const;

/** A sentence that reports something: an error (urgent), a result (done) or a fact to know (info, review).
 * Icon plus words, never colour alone. Errors are alerts; the rest are polite statuses unless `quiet`. */
export function Notice({ tone = "info", title, children, quiet = false, id }: {
  tone?: keyof typeof noticeGlyph;
  title?: ReactNode;
  children?: ReactNode;
  quiet?: boolean;
  id?: string;
}) {
  const Glyph = noticeGlyph[tone];
  const role = quiet ? undefined : tone === "urgent" ? "alert" : "status";
  return (
    <div className="wa-notice" data-tone={tone} role={role} id={id}>
      <Glyph className="wa-notice__icon" size={20} weight="fill" aria-hidden="true" />
      <div className="wa-notice__text">
        {title ? <p className="wa-notice__title">{title}</p> : null}
        {children ? <p className="wa-notice__body">{children}</p> : null}
      </div>
    </div>
  );
}

/** Label above the field, help under it (form pattern). `children` is the control itself. */
export function Field({ label, optional = false, help, helpId, children, className }: {
  label: ReactNode;
  optional?: boolean;
  help?: ReactNode;
  /** Give the control aria-describedby={helpId} so the help is read with it. */
  helpId?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className ? `wa-field ${className}` : "wa-field"}>
      <span className="wa-field__label">{label}{optional ? <span className="wa-field__optional">Optional</span> : null}</span>
      {children}
      {help ? <span className="wa-field__help" id={helpId}>{help}</span> : null}
    </label>
  );
}

/** Two fields side by side from 400px; stacked below. */
export function FieldPair({ children }: { children: ReactNode }) {
  return <div className="wa-pair">{children}</div>;
}

/** The form's own actions: the main action first on phones, full width; side by side from 600px. */
export function FormActions({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="wa-actions">
      {note ? <p className="wa-actions__note">{note}</p> : null}
      <div className="wa-actions__buttons">{children}</div>
    </div>
  );
}

/** A label and its value on one row; the value wraps under the label when space runs out. */
export function Facts({ label, children }: { label: string; children: ReactNode }) {
  return <dl className="wa-facts" aria-label={label}>{children}</dl>;
}

export function Fact({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="wa-fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
