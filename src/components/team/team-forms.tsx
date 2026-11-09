"use client";
import "./team-forms.css";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { phoneTyping } from "./phone";

/* Team forms on the corporate kit (boards O-AddEmployee, O-AddEmployeePay, O-EditEmployee). Presentation only: every
 * control keeps the field name and constraints its form's command reads. */

/** A sheet's header: Cancel (or ‹ Back) left, the title with an optional step under it, Save / Next / Add right. */
export function FormHead({ left, title, step, right, titleId }: { left: ReactNode; title: ReactNode; step?: ReactNode; right?: ReactNode; titleId?: string }) {
  return <div className="c-nav c-formhead">
    <span className="c-formhead__l">{left}</span>
    <span className="c-formhead__t"><h1 className="c-nav__title" id={titleId} tabIndex={-1}>{title}</h1>{step ? <span className="c-formhead__step">{step}</span> : null}</span>
    <span className="c-nav__right">{right ?? null}</span>
  </div>;
}

export function FormHeadLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="c-formhead__link" href={href}>{children}</Link>;
}

export function FormHeadBack({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button type="button" className="c-formhead__link c-formhead__back" onClick={onClick}><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true" />{children}</button>;
}

/** The mobile phone field: "(787) 555-0142" while typed; the form's command saves it as 787-555-0142. */
export function PhoneField({ id, name, defaultValue = "", required, autoComplete, enterKeyHint }: { id: string; name: string; defaultValue?: string; required?: boolean; autoComplete?: string; enterKeyHint?: "next" | "done" }) {
  const [value, setValue] = useState(() => phoneTyping(defaultValue));
  return <input id={id} className="c-in" name={name} type="tel" inputMode="tel" autoComplete={autoComplete} enterKeyHint={enterKeyHint} value={value} required={required}
    placeholder="(787) 555-0123" maxLength={14} pattern="\(\d{3}\) \d{3}-\d{4}" title="A ten-digit phone number"
    onChange={event => {
      const next = event.target.value;
      const digits = (text: string) => text.replace(/\D/g, "");
      // Deleting a bracket, space or dash removes the digit before it, so Backspace never sticks.
      const deleted = next.length < value.length && digits(next) === digits(value);
      setValue(phoneTyping(deleted ? digits(next).slice(0, -1) : next));
    }} />;
}

export type Choice = { value: string; label: string; help?: string; checked?: boolean; disabled?: boolean };

/** A field that opens a checklist ("Positions › Cashier, Barista"). The checkboxes stay in the form while it's closed. */
/** `listed`: the checklist is the page (its own sheet), so it shows without the picker button. */
export function ChoiceField({ label, name, choices, empty, none = "None", listed = false }: { label: string; name: string; choices: Choice[]; empty?: string; none?: string; listed?: boolean }) {
  const id = useId().replace(/:/g, "");
  const [open, setOpen] = useState(listed);
  const [chosen, setChosen] = useState(() => new Set(choices.filter(choice => choice.checked).map(choice => choice.value)));
  const names = choices.filter(choice => chosen.has(choice.value)).map(choice => choice.label);
  if (!choices.length) return <div className="c-field"><span className="c-field__label">{label}</span><span className="c-in c-in--static">{empty ?? none}</span></div>;
  return <div className="c-field">
    <span className="c-field__label" id={`${id}-label`}>{label}</span>
    {listed ? null : <button type="button" className="c-in c-pick" aria-expanded={open} aria-controls={`${id}-list`} aria-labelledby={`${id}-label ${id}-value`} onClick={() => setOpen(value => !value)}>
      <span id={`${id}-value`} className={names.length ? "c-pick__value" : "c-pick__value c-pick__value--none"}>{names.length ? names.join(", ") : none}</span>
      <CaretDownIcon className="c-ic c-ic--s c-pick__caret" weight="bold" aria-hidden="true" />
    </button>}
    <fieldset className="c-checks" id={`${id}-list`} hidden={!open} aria-labelledby={`${id}-label`}>
      {choices.map(choice => <label key={choice.value} className="c-check">
        <input type="checkbox" className="c-check__box" name={name} value={choice.value} defaultChecked={choice.checked} disabled={choice.disabled}
          onChange={event => setChosen(current => { const next = new Set(current); if (event.target.checked) next.add(choice.value); else next.delete(choice.value); return next; })} />
        <span className="c-check__text"><span>{choice.label}</span>{choice.help ? <small>{choice.help}</small> : null}</span>
      </label>)}
    </fieldset>
  </div>;
}

/** Marks the page as a sheet, so the shell covers the tab bar as the boards do. */
export function SheetMarker() {
  return <span className="q-page" data-q-sheet="" hidden />;
}
