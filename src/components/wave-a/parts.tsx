import type { ReactNode } from "react";
import { BCallout, type BTone } from "@/components/owner-b/b-kit";
import { OfflineNotice } from "./offline-notice";

/* Wave A building blocks on top of the kit (Phase 3.5). Presentation only: callers pass
 * already-authorized, already-formatted data. Styles live in src/app/app/premium-wave-a.css. */

/** Phase 9 (spec 2.2, 2.4): a Wave A notice sits on the page's white panel, so it is the kit's one note (BCallout,
 * owner-b.css): a tint with a hairline edge in its tone, the meaning's bold glyph (red WarningCircle stops, green Check
 * is done, teal Info informs, amber Warning asks for a check), a 600 ink title over an ink2 body. */
const noticeTone = { urgent: "red", done: "green", info: "teal", review: "amber" } as const satisfies Record<string, BTone>;

/** A sentence that reports something: an error (urgent), a result (done) or a fact to know (info, review).
 * Icon plus words, never colour alone. Errors are alerts; the rest are polite statuses unless `quiet`. */
export function Notice({ tone = "info", title, children, quiet = false, id }: {
  tone?: keyof typeof noticeTone;
  title?: ReactNode;
  children?: ReactNode;
  quiet?: boolean;
  id?: string;
}) {
  const role = quiet ? undefined : tone === "urgent" ? "alert" : "status";
  return <BCallout tone={noticeTone[tone]} title={title} id={id} role={role}>{children}</BCallout>;
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
  // The help sits outside the <label>, so it isn't part of the field's name (IS-WA-12) or of the inline error (IS-WA-3);
  // pass helpId and aria-describedby to have it read as the description.
  return (
    <div className={className ? `wa-field ${className}` : "wa-field"}>
      <label className="wa-field__control">
        <span className="wa-field__label">{label}{optional ? <span className="wa-field__optional" aria-hidden="true">Optional</span> : null}</span>
        {children}
      </label>
      {help ? <span className="wa-field__help" id={helpId}>{help}</span> : null}
    </div>
  );
}

/** Two fields side by side from 400px; stacked below. */
export function FieldPair({ children, short = false }: { children: ReactNode; short?: boolean }) {
  return <div className={short ? "wa-pair wa-pair--short" : "wa-pair"}>{children}</div>;
}

/** The form's own actions: the main action first on phones, full width; side by side from 600px. */
export function FormActions({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="wa-actions">
      <OfflineNotice />
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
